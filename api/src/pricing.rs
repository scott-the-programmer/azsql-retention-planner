use serde::{Deserialize, Serialize};
use reqwest;
use anyhow::{Result, anyhow};
use url::Url;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AzurePriceItem {
    #[serde(rename = "currencyCode")]
    pub currency_code: String,
    #[serde(rename = "tierMinimumUnits")]
    pub tier_minimum_units: f64,
    #[serde(rename = "retailPrice")]
    pub retail_price: f64,
    #[serde(rename = "unitPrice")]
    pub unit_price: f64,
    #[serde(rename = "armRegionName")]
    pub arm_region_name: String,
    pub location: String,
    #[serde(rename = "effectiveStartDate")]
    pub effective_start_date: String,
    #[serde(rename = "meterId")]
    pub meter_id: String,
    #[serde(rename = "meterName")]
    pub meter_name: String,
    #[serde(rename = "productId")]
    pub product_id: String,
    #[serde(rename = "skuId")]
    pub sku_id: String,
    #[serde(rename = "productName")]
    pub product_name: String,
    #[serde(rename = "skuName")]
    pub sku_name: String,
    #[serde(rename = "serviceName")]
    pub service_name: String,
    #[serde(rename = "serviceId")]
    pub service_id: String,
    #[serde(rename = "serviceFamily")]
    pub service_family: String,
    #[serde(rename = "unitOfMeasure")]
    pub unit_of_measure: String,
    #[serde(rename = "type")]
    pub price_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AzurePricingResponse {
    #[serde(rename = "BillingCurrency")]
    pub billing_currency: String,
    #[serde(rename = "CustomerEntityId")]
    pub customer_entity_id: String,
    #[serde(rename = "CustomerEntityType")]
    pub customer_entity_type: String,
    #[serde(rename = "Items")]
    pub items: Vec<AzurePriceItem>,
    #[serde(rename = "NextPageLink")]
    pub next_page_link: Option<String>,
    #[serde(rename = "Count")]
    pub count: i32,
}

pub struct AzurePricingService {
    base_url: String,
    client: reqwest::Client,
}

impl AzurePricingService {
    pub fn new() -> Self {
        Self {
            base_url: "https://prices.azure.com/api/retail/prices".to_string(),
            client: reqwest::Client::new(),
        }
    }

    pub async fn get_sql_backup_storage_pricing(&self, region: &str) -> Result<Vec<AzurePriceItem>> {
        let normalized_region = region.to_lowercase().replace(" ", "");

        let filters = vec![
            "serviceName eq 'SQL Database'".to_string(),
            format!("armRegionName eq '{}'", normalized_region),
            "contains(meterName, 'Backup Storage')".to_string(),
        ];

        let filter_str = filters.join(" and ");

        match self.fetch_pricing(&filter_str).await {
            Ok(items) => Ok(items),
            Err(_) => {
                // Return fallback pricing
                Ok(vec![self.create_fallback_pricing(&normalized_region, region)])
            }
        }
    }

    pub async fn get_ltr_backup_storage_pricing(&self, region: &str) -> Result<Vec<AzurePriceItem>> {
        let normalized_region = region.to_lowercase().replace(" ", "");

        let filters = vec![
            "serviceName eq 'SQL Database'".to_string(),
            format!("armRegionName eq '{}'", normalized_region),
            "contains(meterName, 'LTR') or contains(meterName, 'Long Term Retention')".to_string(),
        ];

        let filter_str = filters.join(" and ");

        match self.fetch_pricing(&filter_str).await {
            Ok(items) if !items.is_empty() => Ok(items),
            _ => {
                // Fallback to regular backup storage pricing
                self.get_sql_backup_storage_pricing(region).await
            }
        }
    }

    pub async fn get_best_ltr_pricing(&self, region: &str) -> Result<f64> {
        let ltr_prices = self.get_ltr_backup_storage_pricing(region).await?;

        if ltr_prices.is_empty() {
            return Ok(0.05);
        }

        // Look for LRS pricing first
        if let Some(lrs_price) = ltr_prices.iter().find(|price| {
            price.meter_name.to_lowercase().contains("lrs") ||
            price.sku_name.to_lowercase().contains("lrs")
        }) {
            return Ok(lrs_price.retail_price);
        }

        // Return first available price
        Ok(ltr_prices[0].retail_price)
    }

    pub async fn get_azure_backup_prices(
        &self,
        service: &str,
        meter_suffix: &str,
        region: Option<&str>,
    ) -> Result<Vec<AzurePriceItem>> {
        let mut filters = vec![
            format!("serviceName eq '{}'", service),
            format!("endswith(meterName,'{}')", meter_suffix),
            "productName eq 'Backup'".to_string(),
            "type eq 'Consumption'".to_string(),
            "skuName eq 'Standard'".to_string(),
        ];

        if let Some(region) = region {
            let normalized_region = region.to_lowercase().replace(" ", "");
            filters.push(format!("armRegionName eq '{}'", normalized_region));
        }

        let filter_str = filters.join(" and ");
        self.fetch_pricing(&filter_str).await
    }

    pub async fn get_available_regions(&self) -> Result<Vec<String>> {
        let filter_str = "serviceName eq 'SQL Database'";

        match self.fetch_pricing(filter_str).await {
            Ok(items) => {
                let mut regions: Vec<String> = items
                    .into_iter()
                    .map(|item| item.arm_region_name)
                    .filter(|region| !region.trim().is_empty())
                    .collect();

                regions.sort();
                regions.dedup();
                Ok(regions)
            }
            Err(_) => {
                // Return fallback regions
                Ok(vec![
                    "eastus".to_string(),
                    "westus".to_string(),
                    "westus2".to_string(),
                    "eastus2".to_string(),
                    "centralus".to_string(),
                    "northeurope".to_string(),
                    "westeurope".to_string(),
                    "eastasia".to_string(),
                    "southeastasia".to_string(),
                ])
            }
        }
    }

    async fn fetch_pricing(&self, filter: &str) -> Result<Vec<AzurePriceItem>> {
        let mut url = Url::parse(&self.base_url)?;
        url.query_pairs_mut().append_pair("$filter", filter);

        log::info!("Fetching pricing from: {}", url);

        let response = self.client.get(url).send().await?;

        if !response.status().is_success() {
            return Err(anyhow!("HTTP error! status: {}", response.status()));
        }

        let data: AzurePricingResponse = response.json().await?;
        Ok(data.items)
    }

    fn create_fallback_pricing(&self, normalized_region: &str, region: &str) -> AzurePriceItem {
        AzurePriceItem {
            currency_code: "USD".to_string(),
            tier_minimum_units: 0.0,
            retail_price: 0.05,
            unit_price: 0.05,
            arm_region_name: normalized_region.to_string(),
            location: region.to_string(),
            effective_start_date: chrono::Utc::now().to_rfc3339(),
            meter_id: "fallback".to_string(),
            meter_name: "Backup Storage LRS".to_string(),
            product_id: "fallback".to_string(),
            sku_id: "fallback".to_string(),
            product_name: "SQL Database".to_string(),
            sku_name: "General Purpose".to_string(),
            service_name: "SQL Database".to_string(),
            service_id: "fallback".to_string(),
            service_family: "Databases".to_string(),
            unit_of_measure: "GB/Month".to_string(),
            price_type: "Consumption".to_string(),
        }
    }
}
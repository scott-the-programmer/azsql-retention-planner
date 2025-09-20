use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use crate::pricing::{AzurePricingService, AzurePriceItem};

#[derive(Serialize)]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    error: Option<String>,
}

#[derive(Deserialize)]
pub struct BackupPricingQuery {
    service: String,
    meter_suffix: String,
    region: Option<String>,
}

#[derive(Serialize)]
struct PriceResponse {
    price: f64,
    currency: String,
    region: String,
}

#[derive(Serialize)]
struct RegionsResponse {
    regions: Vec<String>,
}

impl<T> ApiResponse<T> {
    fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    fn error(message: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message),
        }
    }
}

pub async fn health_check() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(ApiResponse::success("Azure Pricing API is healthy")))
}

pub async fn get_sql_backup_pricing(path: web::Path<String>) -> Result<HttpResponse> {
    let region = path.into_inner();
    let service = AzurePricingService::new();

    match service.get_sql_backup_storage_pricing(&region).await {
        Ok(items) => {
            Ok(HttpResponse::Ok().json(ApiResponse::success(items)))
        }
        Err(e) => {
            log::error!("Error fetching SQL backup pricing: {}", e);
            Ok(HttpResponse::InternalServerError().json(
                ApiResponse::<Vec<AzurePriceItem>>::error(format!("Failed to fetch pricing: {}", e))
            ))
        }
    }
}

pub async fn get_ltr_backup_pricing(path: web::Path<String>) -> Result<HttpResponse> {
    let region = path.into_inner();
    let service = AzurePricingService::new();

    match service.get_ltr_backup_storage_pricing(&region).await {
        Ok(items) => {
            Ok(HttpResponse::Ok().json(ApiResponse::success(items)))
        }
        Err(e) => {
            log::error!("Error fetching LTR backup pricing: {}", e);
            Ok(HttpResponse::InternalServerError().json(
                ApiResponse::<Vec<AzurePriceItem>>::error(format!("Failed to fetch LTR pricing: {}", e))
            ))
        }
    }
}

pub async fn get_best_ltr_pricing(path: web::Path<String>) -> Result<HttpResponse> {
    let region = path.into_inner();
    let service = AzurePricingService::new();

    match service.get_best_ltr_pricing(&region).await {
        Ok(price) => {
            let response = PriceResponse {
                price,
                currency: "USD".to_string(),
                region: region.clone(),
            };
            Ok(HttpResponse::Ok().json(ApiResponse::success(response)))
        }
        Err(e) => {
            log::error!("Error fetching best LTR pricing: {}", e);
            Ok(HttpResponse::InternalServerError().json(
                ApiResponse::<PriceResponse>::error(format!("Failed to fetch best LTR pricing: {}", e))
            ))
        }
    }
}

pub async fn get_azure_backup_pricing(query: web::Query<BackupPricingQuery>) -> Result<HttpResponse> {
    let service = AzurePricingService::new();

    match service.get_azure_backup_prices(
        &query.service,
        &query.meter_suffix,
        query.region.as_deref(),
    ).await {
        Ok(items) => {
            Ok(HttpResponse::Ok().json(ApiResponse::success(items)))
        }
        Err(e) => {
            log::error!("Error fetching Azure backup pricing: {}", e);
            Ok(HttpResponse::InternalServerError().json(
                ApiResponse::<Vec<AzurePriceItem>>::error(format!("Failed to fetch backup pricing: {}", e))
            ))
        }
    }
}

pub async fn get_available_regions() -> Result<HttpResponse> {
    let service = AzurePricingService::new();

    match service.get_available_regions().await {
        Ok(regions) => {
            let response = RegionsResponse { regions };
            Ok(HttpResponse::Ok().json(ApiResponse::success(response)))
        }
        Err(e) => {
            log::error!("Error fetching available regions: {}", e);
            Ok(HttpResponse::InternalServerError().json(
                ApiResponse::<RegionsResponse>::error(format!("Failed to fetch regions: {}", e))
            ))
        }
    }
}

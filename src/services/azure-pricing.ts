export interface AzurePriceItem {
  currencyCode: string
  tierMinimumUnits: number
  retailPrice: number
  unitPrice: number
  armRegionName: string
  location: string
  effectiveStartDate: string
  meterId: string
  meterName: string
  productId: string
  skuId: string
  productName: string
  skuName: string
  serviceName: string
  serviceId: string
  serviceFamily: string
  unitOfMeasure: string
  type: string
}

export interface AzurePricingResponse {
  BillingCurrency: string
  CustomerEntityId: string
  CustomerEntityType: string
  Items: AzurePriceItem[]
  NextPageLink?: string
  Count: number
}

class AzurePricingService {
  private baseUrl = 'https://prices.azure.com/api/retail/prices'

  async getSQLBackupStoragePricing(region: string = 'US East'): Promise<AzurePriceItem[]> {
    try {
      const filters = [
        `serviceName eq 'SQL Database'`,
        `armRegionName eq '${region.toLowerCase().replace(/\s+/g, '')}'`,
        `contains(meterName, 'Backup Storage')`
      ].join(' and ')

      const url = `${this.baseUrl}?$filter=${encodeURIComponent(filters)}`

      console.log('Fetching pricing from:', url)

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: AzurePricingResponse = await response.json()

      return data.Items || []
    } catch (error) {
      console.error('Error fetching Azure pricing:', error)

      return [{
        currencyCode: 'USD',
        tierMinimumUnits: 0,
        retailPrice: 0.05,
        unitPrice: 0.05,
        armRegionName: region.toLowerCase().replace(/\s+/g, ''),
        location: region,
        effectiveStartDate: new Date().toISOString(),
        meterId: 'fallback',
        meterName: 'Backup Storage LRS',
        productId: 'fallback',
        skuId: 'fallback',
        productName: 'SQL Database',
        skuName: 'General Purpose',
        serviceName: 'SQL Database',
        serviceId: 'fallback',
        serviceFamily: 'Databases',
        unitOfMeasure: 'GB/Month',
        type: 'Consumption'
      }]
    }
  }

  async getLTRBackupStoragePricing(region: string = 'US East'): Promise<AzurePriceItem[]> {
    try {
      const filters = [
        `serviceName eq 'SQL Database'`,
        `armRegionName eq '${region.toLowerCase().replace(/\s+/g, '')}'`,
        `contains(meterName, 'LTR') or contains(meterName, 'Long Term Retention')`
      ].join(' and ')

      const url = `${this.baseUrl}?$filter=${encodeURIComponent(filters)}`

      console.log('Fetching LTR pricing from:', url)

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: AzurePricingResponse = await response.json()

      if (!data.Items || data.Items.length === 0) {
        return await this.getSQLBackupStoragePricing(region)
      }

      return data.Items
    } catch (error) {
      console.error('Error fetching LTR pricing:', error)
      return await this.getSQLBackupStoragePricing(region)
    }
  }

  /**
   * Get the most appropriate pricing for SQL Database LTR backup storage
   */
  async getBestLTRPricing(region: string = 'US East'): Promise<number> {
    const ltrPrices = await this.getLTRBackupStoragePricing(region)

    if (ltrPrices.length === 0) {
      return 0.05
    }

    const lrsPrice = ltrPrices.find(price =>
      price.meterName.toLowerCase().includes('lrs') ||
      price.skuName.toLowerCase().includes('lrs')
    )

    if (lrsPrice) {
      return lrsPrice.retailPrice
    }

    return ltrPrices[0].retailPrice
  }

  /**
   * Get Azure backup prices for a specific service and meter suffix
   */
  async getAzureBackupPrices(service: string, meterSuffix: string, region?: string): Promise<AzurePriceItem[]> {
    try {
      const filters = [
        `serviceName eq '${service}'`,
        `endswith(meterName,'${meterSuffix}')`,
        `productName eq 'Backup'`,
        `type eq 'Consumption'`,
        `skuName eq 'Standard'`
      ]

      if (region) {
        filters.push(`armRegionName eq '${region.toLowerCase().replace(/\s+/g, '')}'`)
      }

      const url = `${this.baseUrl}?$filter=${encodeURIComponent(filters.join(' and '))}`

      console.log('Fetching backup pricing from:', url)

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: AzurePricingResponse = await response.json()

      return data.Items || []
    } catch (error) {
      console.error('Error fetching Azure backup pricing:', error)
      return []
    }
  }

  /**
   * Get available Azure regions for pricing
   */
  async getAvailableRegions(): Promise<string[]> {
    try {
      const filters = `serviceName eq 'SQL Database'`
      const url = `${this.baseUrl}?$filter=${encodeURIComponent(filters)}&$select=armRegionName`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: AzurePricingResponse = await response.json()

      const regions = [...new Set(data.Items.map(item => item.armRegionName))]
        .filter(region => region && region.trim() !== '')
        .sort()

      return regions
    } catch (error) {
      console.error('Error fetching regions:', error)

      return [
        'eastus',
        'westus',
        'westus2',
        'eastus2',
        'centralus',
        'northeurope',
        'westeurope',
        'eastasia',
        'southeastasia'
      ]
    }
  }
}

export const azurePricingService = new AzurePricingService()
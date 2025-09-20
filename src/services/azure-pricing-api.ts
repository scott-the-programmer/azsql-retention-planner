interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface AzurePriceItem {
  currencyCode: string;
  tierMinimumUnits: number;
  retailPrice: number;
  unitPrice: number;
  armRegionName: string;
  location: string;
  effectiveStartDate: string;
  meterId: string;
  meterName: string;
  productId: string;
  skuId: string;
  productName: string;
  skuName: string;
  serviceName: string;
  serviceId: string;
  serviceFamily: string;
  unitOfMeasure: string;
  type: string;
}

interface PriceResponse {
  price: number;
  currency: string;
  region: string;
}

interface RegionsResponse {
  regions: string[];
}

class AzurePricingApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  }

  private async request<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const apiResponse: ApiResponse<T> = await response.json();

    if (!apiResponse.success) {
      throw new Error(apiResponse.error || 'API request failed');
    }

    if (apiResponse.data === null) {
      throw new Error('No data received from API');
    }

    return apiResponse.data;
  }

  async getSQLBackupStoragePricing(region: string = 'eastus'): Promise<AzurePriceItem[]> {
    return this.request<AzurePriceItem[]>(`/api/pricing/sql-backup/${encodeURIComponent(region)}`);
  }

  async getLTRBackupStoragePricing(region: string = 'eastus'): Promise<AzurePriceItem[]> {
    return this.request<AzurePriceItem[]>(`/api/pricing/ltr-backup/${encodeURIComponent(region)}`);
  }

  async getBestLTRPricing(region: string = 'eastus'): Promise<number> {
    const response = await this.request<PriceResponse>(`/api/pricing/best-ltr/${encodeURIComponent(region)}`);
    return response.price;
  }

  async getAzureBackupPrices(
    service: string,
    meterSuffix: string,
    region?: string
  ): Promise<AzurePriceItem[]> {
    const params = new URLSearchParams({
      service,
      meter_suffix: meterSuffix,
    });

    if (region) {
      params.append('region', region);
    }

    return this.request<AzurePriceItem[]>(`/api/pricing/azure-backup?${params.toString()}`);
  }

  async getAvailableRegions(): Promise<string[]> {
    const response = await this.request<RegionsResponse>('/api/regions');
    return response.regions;
  }

  async healthCheck(): Promise<string> {
    return this.request<string>('/health');
  }
}

export const azurePricingApiClient = new AzurePricingApiClient();
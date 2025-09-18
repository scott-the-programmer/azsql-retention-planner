import { type RetentionSettings } from "./lib/cost-calculator";

export type StorageRedundancy = "LRS" | "ZRS" | "RA-GRS" | "RA-GZRS";

export interface DatabaseConfig {
  id: string;
  name: string;
  dbSize: number;
  growthRate: number;
  retention: RetentionSettings;
  region: string;
  redundancy?: StorageRedundancy;
}

export interface FormData {
  databases: DatabaseConfig[];
  selectedDatabaseId: string;
  singleDatabaseTimeline: {
    timelineYears: number;
    xAxisInterval: "weekly" | "monthly" | "quarterly" | "yearly";
  };
  allDatabasesTimeline: {
    timelineYears: number;
    xAxisInterval: "weekly" | "monthly" | "quarterly" | "yearly";
  };
}
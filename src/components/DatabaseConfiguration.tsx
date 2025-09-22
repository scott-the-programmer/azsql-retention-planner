import { type RetentionSettings } from "../lib/cost-calculator";
import type { DatabaseConfig, StorageRedundancy } from "../types";

interface DatabaseConfigurationProps {
  database: DatabaseConfig;
  availableRegions: string[];
  storagePrice: number;
  onInputChange: (field: string, value: number | string) => void;
  onRetentionChange: (type: keyof RetentionSettings, value: number) => void;
}

export function DatabaseConfiguration({
  database,
  availableRegions,
  storagePrice,
  onInputChange,
  onRetentionChange,
}: DatabaseConfigurationProps) {
  return (
    <>
      <h3>Configuration for {database.name}</h3>

      <div class="form-row">
        <div class="form-group">
          <label>Database Name</label>
          <input
            type="text"
            value={database.name}
            onChange={(e) => onInputChange("name", e.currentTarget.value)}
          />
        </div>

        <div class="form-group">
          <label>Database Size (GB)</label>
          <input
            type="number"
            value={database.dbSize}
            onChange={(e) =>
              onInputChange("dbSize", Number(e.currentTarget.value))
            }
            min="1"
          />
        </div>

        <div class="form-group">
          <label>Annual Growth (%)</label>
          <input
            type="number"
            value={database.growthRate}
            onChange={(e) =>
              onInputChange("growthRate", Number(e.currentTarget.value))
            }
            min="0"
            max="100"
          />
        </div>

        <div class="form-group">
          <label>Azure Region</label>
          <select
            value={database.region}
            onChange={(e) => onInputChange("region", e.currentTarget.value)}
          >
            {availableRegions.map((region) => (
              <option key={region} value={region}>
                {region.charAt(0).toUpperCase() +
                  region.slice(1).replace(/([a-z])([A-Z])/g, "$1 $2")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Storage Redundancy</label>
          <select
            value={database.redundancy || "LRS"}
            onChange={(e) => onInputChange("redundancy", e.currentTarget.value as StorageRedundancy)}
          >
            <option value="LRS">LRS</option>
            <option value="ZRS">ZRS</option>
            <option value="RA-GRS">RA-GRS</option>
            <option value="RA-GZRS">RA-GZRS</option>
          </select>
        </div>
      </div>

      <div class="pricing-info">
        <p>
          Current storage price:{" "}
          <strong>${storagePrice.toFixed(4)}/GB/month</strong>
        </p>
      </div>

      <h3>Retention Policy</h3>

      <div class="retention-group">
        <div class="form-group">
          <label>Weekly Backups: {database.retention.weekly} weeks</label>
          <input
            type="range"
            value={database.retention.weekly}
            onChange={(e) =>
              onRetentionChange("weekly", Number(e.currentTarget.value))
            }
            min="0"
            max="520"
            step="1"
            class="retention-slider"
          />
        </div>

        <div class="form-group">
          <label>Monthly Backups: {database.retention.monthly} months</label>
          <input
            type="range"
            value={database.retention.monthly}
            onChange={(e) =>
              onRetentionChange("monthly", Number(e.currentTarget.value))
            }
            min="0"
            max="120"
            step="1"
            class="retention-slider"
          />
        </div>

        <div class="form-group">
          <label>Yearly Backups: {database.retention.yearly} years</label>
          <input
            type="range"
            value={database.retention.yearly}
            onChange={(e) =>
              onRetentionChange("yearly", Number(e.currentTarget.value))
            }
            min="0"
            max="10"
            step="1"
            class="retention-slider"
          />
        </div>
      </div>
    </>
  );
}

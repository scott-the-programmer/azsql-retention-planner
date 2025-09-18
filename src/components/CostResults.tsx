import { BackupVisualizations } from "./backup-visualizations";
import { CostGraph } from "./cost-graph";
import { AllDatabasesCostGraph } from "./AllDatabasesCostGraph";
import { type CostBreakdown } from "../lib/cost-calculator";
import type { DatabaseConfig, FormData } from "../types";

interface CostResultsProps {
  selectedDatabase: DatabaseConfig;
  selectedCostBreakdown: CostBreakdown | null;
  formData: FormData;
  costBreakdowns: Map<string, CostBreakdown>;
  storagePrice: number;
  onInputChange: (field: string, value: number | string) => void;
}

export function CostResults({
  selectedDatabase,
  selectedCostBreakdown,
  formData,
  costBreakdowns,
  storagePrice,
  onInputChange,
}: CostResultsProps) {
  return (
    <>
      {/* Per-Database Breakdown Section */}
      <div class="results-section">
        <h2>Cost Analysis for {selectedDatabase.name}</h2>

        <div class="form-row">
          <div class="form-group">
            <label>Timeline Duration (years)</label>
            <select
              value={formData.singleDatabaseTimeline.timelineYears}
              onChange={(e) =>
                onInputChange("singleDatabaseTimeline.timelineYears", Number(e.currentTarget.value))
              }
            >
              <option value={1}>1 Year</option>
              <option value={2}>2 Years</option>
              <option value={3}>3 Years</option>
              <option value={5}>5 Years</option>
              <option value={7}>7 Years</option>
              <option value={10}>10 Years</option>
            </select>
          </div>

          <div class="form-group">
            <label>X-Axis Interval</label>
            <select
              value={formData.singleDatabaseTimeline.xAxisInterval}
              onChange={(e) =>
                onInputChange("singleDatabaseTimeline.xAxisInterval", e.currentTarget.value)
              }
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div class="cost-graph-container">
          <CostGraph
            dbSize={selectedDatabase.dbSize}
            growthRate={selectedDatabase.growthRate}
            retention={selectedDatabase.retention}
            storagePrice={storagePrice}
            timelineYears={formData.singleDatabaseTimeline.timelineYears}
            xAxisInterval={formData.singleDatabaseTimeline.xAxisInterval}
          />
        </div>

        <BackupVisualizations retention={selectedDatabase.retention} />

        <h3 style={{ marginTop: "2rem", marginBottom: "2rem" }}>
          Cost Breakdown by Backup Type
        </h3>

        {selectedCostBreakdown ? (
          <>
            <div class="cost-grid">
              <div class="cost-item">
                <h4>Weekly Backups</h4>
                <p class="cost">
                  ${selectedCostBreakdown.weeklyBackupCost.toFixed(2)}/month
                </p>
              </div>

              <div class="cost-item">
                <h4>Monthly Backups</h4>
                <p class="cost">
                  ${selectedCostBreakdown.monthlyBackupCost.toFixed(2)}/month
                </p>
              </div>

              <div class="cost-item">
                <h4>Yearly Backups</h4>
                <p class="cost">
                  ${selectedCostBreakdown.yearlyBackupCost.toFixed(2)}/month
                </p>
              </div>
            </div>

            <div class="totals">
              <div class="total-item">
                <h4>Total Monthly Cost</h4>
                <p class="total-cost">
                  ${selectedCostBreakdown.totalMonthlyCost.toFixed(2)}
                </p>
              </div>

              <div class="total-item">
                <h4>Total Yearly Cost</h4>
                <p class="total-cost">
                  ${selectedCostBreakdown.totalYearlyCost.toFixed(2)}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
            <p>Configure retention policy to see cost breakdown</p>
          </div>
        )}
      </div>

      {/* All Databases Summary Section */}
      <div class="results-section">
        <h2>All Databases Summary</h2>

        <div class="form-row">
          <div class="form-group">
            <label>Timeline Duration (years)</label>
            <select
              value={formData.allDatabasesTimeline.timelineYears}
              onChange={(e) =>
                onInputChange("allDatabasesTimeline.timelineYears", Number(e.currentTarget.value))
              }
            >
              <option value={1}>1 Year</option>
              <option value={2}>2 Years</option>
              <option value={3}>3 Years</option>
              <option value={5}>5 Years</option>
              <option value={7}>7 Years</option>
              <option value={10}>10 Years</option>
            </select>
          </div>

          <div class="form-group">
            <label>X-Axis Interval</label>
            <select
              value={formData.allDatabasesTimeline.xAxisInterval}
              onChange={(e) =>
                onInputChange("allDatabasesTimeline.xAxisInterval", e.currentTarget.value)
              }
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div class="cost-graph-container">
          <AllDatabasesCostGraph
            formData={formData}
            storagePrice={storagePrice}
          />
        </div>

        <div class="all-databases-summary">
          <div class="database-costs">
            {formData.databases.map((db) => {
              const dbCost = costBreakdowns.get(db.id);
              return dbCost ? (
                <div key={db.id} class="database-cost-item">
                  <span class="db-name">{db.name}:</span>
                  <span class="db-cost">
                    ${dbCost.totalMonthlyCost.toFixed(2)}/month
                  </span>
                  <span class="db-cost-yearly">
                    (${dbCost.totalYearlyCost.toFixed(2)}/year)
                  </span>
                </div>
              ) : null;
            })}
          </div>

          <div class="total-all-databases">
            <h3>Grand Total</h3>
            <p class="total-cost">
              $
              {Array.from(costBreakdowns.values())
                .reduce((sum, cost) => sum + cost.totalMonthlyCost, 0)
                .toFixed(2)}
              /month
            </p>
            <p class="total-cost-yearly">
              ($
              {Array.from(costBreakdowns.values())
                .reduce((sum, cost) => sum + cost.totalYearlyCost, 0)
                .toFixed(2)}
              /year)
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

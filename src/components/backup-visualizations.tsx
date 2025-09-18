import { type RetentionSettings } from "../lib/cost-calculator";

interface BackupVisualizationsProps {
  retention: RetentionSettings;
}

interface BackupMetrics {
  type: "weekly" | "monthly" | "yearly";
  frequency: string;
  retentionPeriod: string;
  totalBackups: number;
  color: string;
}

export function BackupVisualizations({ retention }: BackupVisualizationsProps) {
  const generateMetrics = (): BackupMetrics[] => {
    const metrics: BackupMetrics[] = [];

    if (retention.weekly > 0) {
      metrics.push({
        type: "weekly",
        frequency: "Every Sunday",
        retentionPeriod: `${retention.weekly} weeks`,
        totalBackups: retention.weekly,
        color: "#28a745",
      });
    }

    if (retention.monthly > 0) {
      metrics.push({
        type: "monthly",
        frequency: "First Sunday of month",
        retentionPeriod: `${retention.monthly} months`,
        totalBackups: retention.monthly,
        color: "#ffc107",
      });
    }

    if (retention.yearly > 0) {
      metrics.push({
        type: "yearly",
        frequency: "First Sunday of January",
        retentionPeriod: `${retention.yearly} years`,
        totalBackups: retention.yearly,
        color: "#dc3545",
      });
    }

    return metrics;
  };

  const metrics = generateMetrics();

  const RetentionSummary = () => {
    return (
      <div class="retention-summary">
        {metrics.length === 0 ? (
          <div class="no-backups-message">
            <h3>No backup retention configured</h3>
            <p>
              Configure weekly, monthly, or yearly backup retention above to see
              the summary.
            </p>
          </div>
        ) : (
          <div class="summary-section">
            <h4>Retention Summary</h4>
            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-label">Backup Types:</span>
                <span class="summary-value">{metrics.length}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Total Active Backups:</span>
                <span class="summary-value highlight">
                  {metrics.reduce((sum, m) => sum + m.totalBackups, 0)}
                </span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Longest Retention:</span>
                <span class="summary-value">
                  {Math.max(
                    retention.weekly * 7,
                    retention.monthly * 30,
                    retention.yearly * 365
                  )}{" "}
                  days
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div class="backup-visualizations">
      <div class="visualization-content">
        <RetentionSummary />
      </div>
    </div>
  );
}

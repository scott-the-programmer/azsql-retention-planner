export interface RetentionSettings {
  weekly: number;
  monthly: number;
  yearly: number;
}

export interface CostBreakdown {
  weeklyBackupCost: number;
  monthlyBackupCost: number;
  yearlyBackupCost: number;
  totalMonthlyCost: number;
  totalYearlyCost: number;
}

export interface TimelineCosts {
  weekly: number;
  monthly: number;
  yearly: number;
  total: number;
}

export interface CostParameters {
  dbSize: number;
  growthRate: number;
  retention: RetentionSettings;
  storagePrice: number;
}

export class CostCalculator {

  /**
   * Calculate current cost breakdown for the given parameters
   */
  calculateCurrentCostBreakdown(params: CostParameters): CostBreakdown {
    const { dbSize, growthRate, retention, storagePrice } = params;
    const monthlyGrowthRate = growthRate / 100 / 12;

    const averageWeeklySize = dbSize + (dbSize * monthlyGrowthRate * (retention.weekly / 4.33) / 2);
    const averageMonthlySize = dbSize + (dbSize * monthlyGrowthRate * retention.monthly / 2);
    const averageYearlySize = dbSize + (dbSize * monthlyGrowthRate * (retention.yearly * 12) / 2);

    const costs: CostBreakdown = {
      weeklyBackupCost: (averageWeeklySize * retention.weekly) * storagePrice,
      monthlyBackupCost: (averageMonthlySize * retention.monthly) * storagePrice,
      yearlyBackupCost: (averageYearlySize * retention.yearly) * storagePrice,
      totalMonthlyCost: 0,
      totalYearlyCost: 0
    };

    costs.totalMonthlyCost = costs.weeklyBackupCost + costs.monthlyBackupCost + costs.yearlyBackupCost;
    costs.totalYearlyCost = costs.totalMonthlyCost * 12;

    return costs;
  }

  /**
   * Calculate costs at a specific month in the timeline
   */
  calculateCostAtMonth(
    currentMonth: number,
    currentDbSize: number,
    retention: RetentionSettings,
    storagePrice: number,
    monthlyGrowthRate: number
  ): TimelineCosts {
    let weeklyCost = 0;
    let monthlyCost = 0;
    let yearlyCost = 0;

    if (retention.weekly > 0) {
      const weeksToCalculate = Math.min(currentMonth * 4.33, retention.weekly);
      for (let week = 0; week < weeksToCalculate; week++) {
        const weekMonth = Math.floor(week / 4.33);
        const backupSize = currentDbSize * Math.pow(1 + monthlyGrowthRate, -weekMonth);
        weeklyCost += backupSize * storagePrice;
      }
    }

    if (retention.monthly > 0) {
      for (let retentionMonth = 0; retentionMonth < retention.monthly; retentionMonth++) {
        const backupTakenAt = currentMonth - retentionMonth;
        if (backupTakenAt >= 0) {
          const backupSize = currentDbSize * Math.pow(1 + monthlyGrowthRate, -retentionMonth);
          monthlyCost += backupSize * storagePrice;
        }
      }
    }

    if (retention.yearly > 0) {
      for (let retentionYear = 0; retentionYear < retention.yearly; retentionYear++) {
        const backupTakenAt = currentMonth - (retentionYear * 12);
        if (backupTakenAt >= 0) {
          const backupSize = currentDbSize * Math.pow(1 + monthlyGrowthRate, -(retentionYear * 12));
          yearlyCost += backupSize * storagePrice;
        }
      }
    }

    return {
      weekly: weeklyCost,
      monthly: monthlyCost,
      yearly: yearlyCost,
      total: weeklyCost + monthlyCost + yearlyCost,
    };
  }

  /**
   * Generate timeline data for cost graphing
   */
  generateTimelineData(
    initialDbSize: number,
    annualGrowthRate: number,
    retention: RetentionSettings,
    storagePrice: number,
    timelineYears: number,
    xAxisInterval: "weekly" | "monthly" | "quarterly" | "yearly"
  ) {
    const months = timelineYears * 12;
    const monthlyGrowthRate = annualGrowthRate / 100 / 12;

    let stepSize = 1;
    if (xAxisInterval === "weekly") {
      stepSize = 0.25;
    } else if (xAxisInterval === "quarterly") {
      stepSize = 3;
    } else if (xAxisInterval === "yearly") {
      stepSize = 12;
    }

    const labels: string[] = [];
    const totalCostData: number[] = [];
    const weeklyCostData: number[] = [];
    const monthlyCostData: number[] = [];
    const yearlyCostData: number[] = [];

    for (let month = 0; month <= months; month = Number((month + stepSize).toFixed(2))) {
      const currentSize = initialDbSize * Math.pow(1 + monthlyGrowthRate, month);

      const costs = this.calculateCostAtMonth(
        month,
        currentSize,
        retention,
        storagePrice,
        monthlyGrowthRate
      );

      let label: string;
      if (xAxisInterval === "weekly") {
        const week = Math.floor(month * 4.33);
        label = `Week ${week}`;
      } else if (xAxisInterval === "yearly") {
        const year = Math.floor(month / 12);
        label = `Year ${year}`;
      } else if (xAxisInterval === "quarterly") {
        const quarter = Math.floor(month / 3);
        label = `Q${quarter}`;
      } else {
        label = `Month ${month}`;
      }

      labels.push(label);
      totalCostData.push(costs.total);
      weeklyCostData.push(costs.weekly);
      monthlyCostData.push(costs.monthly);
      yearlyCostData.push(costs.yearly);
    }

    const datasets = [];

    const hasAnyBackups = retention.weekly > 0 || retention.monthly > 0 || retention.yearly > 0;

    if (hasAnyBackups) {
      datasets.push({
        label: "Total Cost",
        data: totalCostData,
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.1)",
        borderWidth: 3,
        tension: 0.1,
      });
    }

    if (retention.weekly > 0) {
      datasets.push({
        label: "Weekly Backups",
        data: weeklyCostData,
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.1)",
        borderWidth: 2,
        tension: 0.1,
      });
    }

    if (retention.monthly > 0) {
      datasets.push({
        label: "Monthly Backups",
        data: monthlyCostData,
        borderColor: "rgb(255, 205, 86)",
        backgroundColor: "rgba(255, 205, 86, 0.1)",
        borderWidth: 2,
        tension: 0.1,
      });
    }

    if (retention.yearly > 0) {
      datasets.push({
        label: "Yearly Backups",
        data: yearlyCostData,
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.1)",
        borderWidth: 2,
        tension: 0.1,
      });
    }

    return {
      labels,
      datasets,
    };
  }
}

export const costCalculator = new CostCalculator();
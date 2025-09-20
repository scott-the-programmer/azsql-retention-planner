import { describe, it, expect } from 'vitest';
import { CostCalculator, costCalculator, type RetentionSettings } from './cost-calculator';

const defaultRetention: RetentionSettings = { weekly: 4, monthly: 3, yearly: 1 };

describe('CostCalculator.calculateCurrentCostBreakdown', () => {
    it('computes zero costs when retention all zero', () => {
        const calc = new CostCalculator();
        const result = calc.calculateCurrentCostBreakdown({
            dbSize: 100,
            growthRate: 10,
            retention: { weekly: 0, monthly: 0, yearly: 0 },
            storagePrice: 0.10
        });
        expect(result.weeklyBackupCost).toBe(0);
        expect(result.monthlyBackupCost).toBe(0);
        expect(result.yearlyBackupCost).toBe(0);
        expect(result.totalMonthlyCost).toBe(0);
        expect(result.totalYearlyCost).toBe(0);
    });

    it('has internally consistent totals', () => {
        const calc = new CostCalculator();
        const params = {
            dbSize: 50,
            growthRate: 12, // 1% per month
            retention: defaultRetention,
            storagePrice: 0.2
        };
        const r = calc.calculateCurrentCostBreakdown(params);
        expect(r.totalMonthlyCost).toBeCloseTo(r.weeklyBackupCost + r.monthlyBackupCost + r.yearlyBackupCost, 6);
        expect(r.totalYearlyCost).toBeCloseTo(r.totalMonthlyCost * 12, 6);
    });

    it('increases cost with larger db size & storage price', () => {
        const calc = new CostCalculator();
        const base = calc.calculateCurrentCostBreakdown({ dbSize: 10, growthRate: 0, retention: defaultRetention, storagePrice: 0.1 });
        const bigger = calc.calculateCurrentCostBreakdown({ dbSize: 20, growthRate: 0, retention: defaultRetention, storagePrice: 0.1 });
        const higherPrice = calc.calculateCurrentCostBreakdown({ dbSize: 10, growthRate: 0, retention: defaultRetention, storagePrice: 0.2 });
        expect(bigger.totalMonthlyCost).toBeGreaterThan(base.totalMonthlyCost);
        expect(higherPrice.totalMonthlyCost).toBeGreaterThan(base.totalMonthlyCost);
    });
});

describe('CostCalculator.calculateCostAtMonth', () => {
    it('returns zeros when retention is zero', () => {
        const calc = new CostCalculator();
        const r = calc.calculateCostAtMonth(0, 100, { weekly: 0, monthly: 0, yearly: 0 }, 0.1, 0.01);
        expect(r).toEqual({ weekly: 0, monthly: 0, yearly: 0, total: 0 });
    });

    it('weekly cost adds up for given weeks within retention', () => {
        const calc = new CostCalculator();
        // month 1 (month index 1). weekly retention 4 => up to 4 weeks.
        const r = calc.calculateCostAtMonth(1, 100, { weekly: 4, monthly: 0, yearly: 0 }, 0.1, 0); // no growth
        // With no growth & storagePrice .1 each weekly backup costs 100 * .1 = 10, 4 of them => 40
        expect(r.weekly).toBeCloseTo(40, 5);
        expect(r.total).toBeCloseTo(40, 5);
    });

    it('monthly cost respects retention length', () => {
        const calc = new CostCalculator();
        // At month 5 with retention=3 monthly should have backups from months 5,4,3 (3 months)
        const r = calc.calculateCostAtMonth(5, 200, { weekly: 0, monthly: 3, yearly: 0 }, 0.05, 0); // no growth
        // each monthly backup size 200, cost= 200 * 0.05 = 10 each *3 =30
        expect(r.monthly).toBeCloseTo(30, 5);
    });

    it('yearly cost includes only existing yearly backups', () => {
        const calc = new CostCalculator();
        // At month 10, only first year backup (month 0) exists when yearly retention >=1 and backup taken at month 0
        const r = calc.calculateCostAtMonth(10, 500, { weekly: 0, monthly: 0, yearly: 2 }, 0.02, 0); // no growth
        // Only one yearly backup counted so far
        expect(r.yearly).toBeCloseTo(500 * 0.02, 5);
    });

    it('applies growth rate backwards when computing older backups', () => {
        const calc = new CostCalculator();
        const monthlyGrowthRate = 0.02; // 2% per month
        const currentMonth = 6;
        const currentSize = 100 * Math.pow(1 + monthlyGrowthRate, currentMonth); // size grown from initial 100
        const retention = { weekly: 0, monthly: 3, yearly: 0 };
        const price = 0.1;
        const result = calc.calculateCostAtMonth(currentMonth, currentSize, retention, price, monthlyGrowthRate);
        // expected: sum over retentionMonth 0..2 of currentSize * (1+g)^(-retentionMonth) * price
        let expected = 0;
        for (let m = 0; m < 3; m++) {
            expected += currentSize * Math.pow(1 + monthlyGrowthRate, -m) * price;
        }
        expect(result.monthly).toBeCloseTo(expected, 6);
    });
});

describe('CostCalculator.generateTimelineData', () => {
    it('produces empty dataset when no retention configured', () => {
        const data = costCalculator.generateTimelineData(100, 0, { weekly: 0, monthly: 0, yearly: 0 }, 0.1, 1, 'monthly');
        expect(data.datasets.length).toBe(0); // hasAnyBackups false
        expect(data.labels.length).toBeGreaterThan(0);
    });

    it('includes datasets based on retention types', () => {
        const data = costCalculator.generateTimelineData(100, 0, { weekly: 1, monthly: 1, yearly: 1 }, 0.1, 1, 'monthly');
        // total + 3 types => 4 datasets
        expect(data.datasets.map(d => d.label).sort()).toEqual(['Monthly Backups', 'Total Cost', 'Weekly Backups', 'Yearly Backups'].sort());
    });

    it('respects xAxisInterval weekly granularity', () => {
        const weeklyData = costCalculator.generateTimelineData(100, 0, defaultRetention, 0.05, 0.5, 'weekly'); // 6 months timeline
        // step size 0.25 (week), months=6 => (6 / 0.25) +1 points
        const expectedPoints = Math.floor(6 / 0.25) + 1; // 25 +1 =26
        expect(weeklyData.labels.length).toBe(expectedPoints);
        expect(weeklyData.datasets[0].data.length).toBe(expectedPoints);
    });

    it('respects xAxisInterval yearly granularity', () => {
        const yearlyData = costCalculator.generateTimelineData(100, 0, defaultRetention, 0.05, 3, 'yearly');
        // months=36, step=12 => 3 steps + initial => 4 points
        expect(yearlyData.labels.length).toBe(4);
        expect(yearlyData.labels[0]).toBe('Year 0');
    });

    it('costs increase over time with growth', () => {
        const data = costCalculator.generateTimelineData(100, 24, defaultRetention, 0.1, 1, 'monthly'); // 24% annual ~2% monthly
        const totalCosts = data.datasets.find(d => d.label === 'Total Cost')!.data;
        expect(totalCosts[totalCosts.length - 1]).toBeGreaterThan(totalCosts[0]);
    });
});

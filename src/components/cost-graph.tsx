import { useEffect, useRef } from "preact/hooks";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  type ChartOptions,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { costCalculator, type RetentionSettings } from "../lib/cost-calculator";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface CostGraphProps {
  dbSize: number;
  growthRate: number;
  retention: RetentionSettings;
  storagePrice: number;
  timelineYears: number;
  xAxisInterval: "weekly" | "monthly" | "quarterly" | "yearly";
}

export function CostGraph({
  dbSize,
  growthRate,
  retention,
  storagePrice,
  timelineYears,
  xAxisInterval,
}: CostGraphProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    const timelineData = costCalculator.generateTimelineData(
      dbSize,
      growthRate,
      retention,
      storagePrice,
      timelineYears,
      xAxisInterval
    );

    // Get computed theme colors
    const computedStyle = getComputedStyle(document.documentElement);
    const textPrimary = computedStyle.getPropertyValue('--text-primary').trim();
    const textSecondary = computedStyle.getPropertyValue('--text-secondary').trim();

    const chartOptions: ChartOptions<"line"> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: textPrimary,
            font: {
              size: 14,
              weight: 600,
            },
          },
        },
        title: {
          display: true,
          text: "Long Term Retention Cost Timeline",
          color: textPrimary,
          font: {
            size: 16,
            weight: 700,
          },
        },
        tooltip: {
          mode: "index",
          intersect: false,
          backgroundColor: computedStyle.getPropertyValue('--glass-bg').trim(),
          titleColor: textPrimary,
          bodyColor: textPrimary,
          borderColor: computedStyle.getPropertyValue('--glass-border').trim(),
          borderWidth: 1,
          callbacks: {
            label: function (context: any) {
              const label = context.dataset.label || "";
              const value =
                typeof context.parsed.y === "number" ? context.parsed.y : 0;
              return `${label}: $${value.toFixed(2)}/month`;
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: "Timeline",
            color: textPrimary,
            font: {
              size: 14,
              weight: 600,
            },
          },
          ticks: {
            color: textSecondary,
            font: {
              size: 12,
              weight: 500,
            },
          },
          grid: {
            color: computedStyle.getPropertyValue('--glass-border').trim(),
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: "Monthly Cost ($)",
            color: textPrimary,
            font: {
              size: 14,
              weight: 600,
            },
          },
          ticks: {
            color: textSecondary,
            font: {
              size: 12,
              weight: 500,
            },
          },
          grid: {
            color: computedStyle.getPropertyValue('--glass-border').trim(),
          },
          beginAtZero: true,
        },
      },
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
    };

    chartInstanceRef.current = new ChartJS(ctx, {
      type: "line",
      data: timelineData,
      options: chartOptions,
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [
    dbSize,
    growthRate,
    retention,
    storagePrice,
    timelineYears,
    xAxisInterval,
  ]);

  return (
    <div style={{ height: "400px", width: "100%" }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
}


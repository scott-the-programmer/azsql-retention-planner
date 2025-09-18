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
import { costCalculator } from "../lib/cost-calculator";
import type { FormData } from "../types";

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

interface AllDatabasesCostGraphProps {
  formData: FormData;
  storagePrice: number;
}

// Color palette for different databases
const colors = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#8B5CF6", // Purple
  "#F97316", // Orange
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#EC4899", // Pink
  "#6B7280", // Gray
];

export function AllDatabasesCostGraph({
  formData,
  storagePrice,
}: AllDatabasesCostGraphProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!chartRef.current || storagePrice <= 0 || formData.databases.length === 0) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    // Generate timeline data for each database
    const datasets = formData.databases.map((db, index) => {
      try {
        const timelineData = costCalculator.generateTimelineData(
          db.dbSize,
          db.growthRate,
          db.retention,
          storagePrice,
          formData.allDatabasesTimeline.timelineYears,
          formData.allDatabasesTimeline.xAxisInterval
        );

        const color = colors[index % colors.length];

        return {
          label: db.name,
          data: timelineData.datasets[0]?.data || [], // Get the total cost data with fallback
          borderColor: color,
          backgroundColor: color + "20", // Add transparency
          borderWidth: 2,
          fill: false,
          tension: 0.1,
        };
      } catch (error) {
        console.error("Error generating timeline data for database", db.name, error);
        return {
          label: db.name,
          data: [],
          borderColor: colors[index % colors.length],
          backgroundColor: colors[index % colors.length] + "20",
          borderWidth: 2,
          fill: false,
          tension: 0.1,
        };
      }
    });

    // Get labels from the first database (they'll all be the same)
    let firstDbData;
    try {
      firstDbData = costCalculator.generateTimelineData(
        formData.databases[0].dbSize,
        formData.databases[0].growthRate,
        formData.databases[0].retention,
        storagePrice,
        formData.allDatabasesTimeline.timelineYears,
        formData.allDatabasesTimeline.xAxisInterval
      );
    } catch (error) {
      console.error("Error generating labels data:", error);
      return;
    }

    // Calculate total for all databases
    const maxLength = Math.max(...datasets.map(d => d.data.length));
    const totalData = Array.from({ length: maxLength }, (_, pointIndex) => {
      return datasets.reduce((sum, dataset) => {
        const value = dataset.data[pointIndex];
        return sum + (typeof value === 'number' ? value : 0);
      }, 0);
    });

    // Add total line
    datasets.push({
      label: "Total All Databases",
      data: totalData,
      borderColor: "#1F2937", // Dark gray
      backgroundColor: "#1F293720",
      borderWidth: 3,
      fill: false,
      tension: 0.1,
    });

    const chartData = {
      labels: firstDbData.labels,
      datasets: datasets,
    };

    const chartOptions: ChartOptions<"line"> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            usePointStyle: true,
            padding: 20,
          },
        },
        title: {
          display: true,
          text: "All Databases Cost Comparison",
          font: {
            size: 16,
          },
        },
        tooltip: {
          mode: "index",
          intersect: false,
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
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: "Monthly Cost ($)",
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
      data: chartData,
      options: chartOptions,
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [formData, storagePrice]);

  return (
    <div style={{ height: "400px", width: "100%" }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
}
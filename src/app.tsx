import { useState, useEffect } from "preact/hooks";
import { azurePricingApiClient } from "./services/azure-pricing-api";
import {
  costCalculator,
  type RetentionSettings,
  type CostBreakdown,
} from "./lib/cost-calculator";
import { DatabaseConfiguration } from "./components/DatabaseConfiguration";
import { DatabaseManagement } from "./components/DatabaseManagement";
import { CostResults } from "./components/CostResults";
import { ThemeToggle } from "./components/ThemeToggle";
import {
  type DatabaseConfig,
  type FormData,
  type StorageRedundancy,
} from "./types";
import "./styles/app.css";
import "./styles/backup-visualizations.css";

const getRedundancyPrice = (redundancy: StorageRedundancy): number => {
  const prices: Record<StorageRedundancy, number> = {
    LRS: 0.025,
    ZRS: 0.025,
    "RA-GRS": 0.05,
    "RA-GZRS": 0.05,
  };
  return prices[redundancy];
};

export function App() {
  const [formData, setFormData] = useState<FormData>({
    databases: [
      {
        id: "1",
        name: "Database 1",
        dbSize: 100,
        growthRate: 10,
        retention: {
          weekly: 0,
          monthly: 0,
          yearly: 0,
        },
        region: "eastus",
        redundancy: "LRS",
      },
    ],
    selectedDatabaseId: "1",
    singleDatabaseTimeline: {
      timelineYears: 2,
      xAxisInterval: "monthly",
    },
    allDatabasesTimeline: {
      timelineYears: 2,
      xAxisInterval: "monthly",
    },
  });

  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [storagePrice, setStoragePrice] = useState<number>(0.05);
  const [costBreakdowns, setCostBreakdowns] = useState<
    Map<string, CostBreakdown>
  >(new Map());

  const selectedDatabase = formData.databases.find(
    (db) => db.id === formData.selectedDatabaseId
  );
  const selectedCostBreakdown = selectedDatabase
    ? costBreakdowns.get(selectedDatabase.id) ?? null
    : null;

  useEffect(() => {
    const loadRegions = async () => {
      try {
        const regions = await azurePricingApiClient.getAvailableRegions();
        setAvailableRegions(regions);
      } catch (error) {
        console.error("Failed to load regions:", error);
      }
    };

    const loadInitialPricing = async () => {
      try {
        const price = await azurePricingApiClient.getBestLTRPricing(
          selectedDatabase?.region || "eastus"
        );
        setStoragePrice(price);
      } catch (error) {
        console.error("Failed to load initial pricing:", error);
      }
    };

    loadRegions();
    loadInitialPricing();
  }, []);

  useEffect(() => {
    const updatePricing = async () => {
      try {
        const price = await azurePricingApiClient.getBestLTRPricing(
          selectedDatabase?.region || "eastus"
        );
        setStoragePrice(price);
      } catch (error) {
        console.error("Failed to update pricing:", error);
      }
    };

    if (selectedDatabase?.region) {
      updatePricing();
    }
  }, [selectedDatabase?.region]);

  const handleInputChange = (field: string, value: number | string) => {
    if (
      field.startsWith("singleDatabaseTimeline.") ||
      field.startsWith("allDatabasesTimeline.")
    ) {
      const [section, property] = field.split(".");
      setFormData((prev) => ({
        ...prev,
        [section]: {
          ...((prev[section as keyof FormData] ?? {}) as object),
          [property]: value,
        },
      }));
    } else if (selectedDatabase) {
      setFormData((prev) => ({
        ...prev,
        databases: prev.databases.map((db) =>
          db.id === selectedDatabase.id ? { ...db, [field]: value } : db
        ),
      }));
    }
  };

  const handleRetentionChange = (
    type: keyof RetentionSettings,
    value: number
  ) => {
    if (selectedDatabase) {
      setFormData((prev) => ({
        ...prev,
        databases: prev.databases.map((db) =>
          db.id === selectedDatabase.id
            ? {
                ...db,
                retention: { ...db.retention, [type]: value },
              }
            : db
        ),
      }));
    }
  };

  const addDatabase = () => {
    const newId = Date.now().toString();
    const newDatabase: DatabaseConfig = {
      id: newId,
      name: `Database ${formData.databases.length + 1}`,
      dbSize: 100,
      growthRate: 10,
      retention: {
        weekly: 0,
        monthly: 0,
        yearly: 0,
      },
      region: "eastus",
      redundancy: "LRS",
    };

    setFormData((prev) => ({
      ...prev,
      databases: [...prev.databases, newDatabase],
      selectedDatabaseId: newId,
    }));
  };

  const removeDatabase = (id: string) => {
    if (formData.databases.length === 1) return;

    const filteredDatabases = formData.databases.filter((db) => db.id !== id);
    const newSelectedId = filteredDatabases[0]?.id || "";

    setFormData((prev) => ({
      ...prev,
      databases: filteredDatabases,
      selectedDatabaseId: newSelectedId,
    }));

    setCostBreakdowns((prev) => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  const selectDatabase = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedDatabaseId: id,
    }));
  };

  useEffect(() => {
    if (storagePrice > 0) {
      const newCostBreakdowns = new Map<string, CostBreakdown>();

      formData.databases.forEach((db) => {
        const redundancyPrice = db.redundancy
          ? getRedundancyPrice(db.redundancy)
          : 0.025;
        const costs = costCalculator.calculateCurrentCostBreakdown({
          dbSize: db.dbSize,
          growthRate: db.growthRate,
          retention: db.retention,
          storagePrice: redundancyPrice,
        });
        newCostBreakdowns.set(db.id, costs);
      });

      setCostBreakdowns(newCostBreakdowns);
    }
  }, [formData.databases, storagePrice]);

  return (
    <main class="container">
      <header>
        <div class="header-content">
          <h1>Azure SQL Server Retention Planner</h1>
          <ThemeToggle />
        </div>
        <p class="pricing-disclaimer">
          <em>Prices are estimates only. Verify actual pricing via <a href="https://azure.microsoft.com/en-us/pricing/details/azure-sql-database" target="_blank" rel="noopener noreferrer">azure.microsoft.com/en-us/pricing/details/azure-sql-database</a></em>
        </p>
      </header>

      <div class="form-section">
        <h2>Database Management</h2>

        {selectedDatabase && (
          <DatabaseConfiguration
            database={selectedDatabase}
            availableRegions={availableRegions}
            storagePrice={
              selectedDatabase.redundancy
                ? getRedundancyPrice(selectedDatabase.redundancy)
                : 0.025
            }
            onInputChange={handleInputChange}
            onRetentionChange={handleRetentionChange}
          />
        )}

        <DatabaseManagement
          databases={formData.databases}
          selectedDatabaseId={formData.selectedDatabaseId}
          onSelectDatabase={selectDatabase}
          onAddDatabase={addDatabase}
          onRemoveDatabase={removeDatabase}
        />
      </div>

      {selectedDatabase && (
        <CostResults
          selectedDatabase={selectedDatabase}
          selectedCostBreakdown={selectedCostBreakdown}
          formData={formData}
          costBreakdowns={costBreakdowns}
          storagePrice={storagePrice}
          onInputChange={handleInputChange}
        />
      )}

      <footer class="app-footer">
        <div class="footer-content">
          <span class="footer-text">Built with ❤️ by <a href="https://scott.murray.kiwi" target="_blank" rel="noopener noreferrer">Scott</a></span>
          <a
            href="https://github.com/scott-the-programmer/azsql-retention-planner"
            target="_blank"
            rel="noopener noreferrer"
            class="github-link"
            title="View source on GitHub"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>
      </footer>
    </main>
  );
}

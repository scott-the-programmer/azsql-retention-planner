import { useState, useEffect } from "preact/hooks";
import { azurePricingService } from "./services/azure-pricing";
import {
  costCalculator,
  type RetentionSettings,
  type CostBreakdown,
} from "./lib/cost-calculator";
import { DatabaseConfiguration } from "./components/DatabaseConfiguration";
import { DatabaseManagement } from "./components/DatabaseManagement";
import { CostResults } from "./components/CostResults";
import { type DatabaseConfig, type FormData, type StorageRedundancy } from "./types";
import "./styles/app.css";
import "./styles/backup-visualizations.css";

const getRedundancyPrice = (redundancy: StorageRedundancy): number => {
  const prices: Record<StorageRedundancy, number> = {
    "LRS": 0.025,
    "ZRS": 0.025,
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
      timelineYears: 5,
      xAxisInterval: "weekly",
    },
    allDatabasesTimeline: {
      timelineYears: 5,
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
        const regions = await azurePricingService.getAvailableRegions();
        setAvailableRegions(regions);
      } catch (error) {
        console.error("Failed to load regions:", error);
      }
    };

    const loadInitialPricing = async () => {
      try {
        const price = await azurePricingService.getBestLTRPricing(
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
        const price = await azurePricingService.getBestLTRPricing(
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
        const redundancyPrice = db.redundancy ? getRedundancyPrice(db.redundancy) : 0.025;
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
        <h1>Azure SQL Server Retention Planner</h1>
      </header>

      <div class="form-section">
        <h2>Database Management</h2>

        {selectedDatabase && (
          <DatabaseConfiguration
            database={selectedDatabase}
            availableRegions={availableRegions}
            storagePrice={selectedDatabase.redundancy ? getRedundancyPrice(selectedDatabase.redundancy) : 0.025}
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
    </main>
  );
}

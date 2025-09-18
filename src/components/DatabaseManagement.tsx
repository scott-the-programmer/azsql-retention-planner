import type { DatabaseConfig } from "../types";

interface DatabaseManagementProps {
  databases: DatabaseConfig[];
  selectedDatabaseId: string;
  onSelectDatabase: (id: string) => void;
  onAddDatabase: () => void;
  onRemoveDatabase: (id: string) => void;
}

export function DatabaseManagement({
  databases,
  selectedDatabaseId,
  onSelectDatabase,
  onAddDatabase,
  onRemoveDatabase,
}: DatabaseManagementProps) {
  return (
    <div class="database-management">
      <div class="database-list">
        {databases.map((db) => (
          <div
            key={db.id}
            class={`database-item ${
              db.id === selectedDatabaseId ? "selected" : ""
            }`}
            onClick={() => onSelectDatabase(db.id)}
          >
            <span class="database-name">{db.name}</span>
            {databases.length > 1 && (
              <button
                class="remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveDatabase(db.id);
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button class="add-database-btn-inline" onClick={onAddDatabase} title="Add Database">
          +
        </button>
      </div>
    </div>
  );
}

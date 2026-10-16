'use client';

import { useMemo, useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import type { ColumnType, Entity, TableColumn } from "@/types/workbench";

/**
 * SQL/NoSQL schema + partition-key analyzer.
 * Flags missing partition keys, hot-partition risks, and unbounded growth,
 * then compiles the model to Postgres DDL or Cassandra CQL on demand.
 */

const ENGINES = ["postgres", "mysql", "cassandra", "dynamodb", "mongo", "redis", "bigtable"] as const;
const COLUMN_TYPES: ColumnType[] = ["uuid", "text", "integer", "bigint", "float", "boolean", "timestamp", "jsonb", "bytes", "vector"];

function analyzeEntity(entity: Entity): string[] {
  const warnings: string[] = [];
  const partitionKeys = entity.columns.filter((c) => c.isPartitionKey);
  if (partitionKeys.length === 0) {
    warnings.push("No partition key — every query risks a full scatter-gather scan.");
  }
  if (partitionKeys.length > 2) {
    warnings.push("Composite partition key with 3+ columns usually signals a modeling smell; re-check access patterns.");
  }
  if (entity.writeQps > 5000 && entity.engine !== "cassandra" && entity.engine !== "bigtable" && entity.engine !== "dynamodb") {
    warnings.push(`Write rate ${entity.writeQps.toLocaleString()} QPS overwhelms single-leader ${entity.engine}; prefer a log-structured store.`);
  }
  if (entity.estimatedRows > 100_000_000 && entity.columns.every((c) => !c.isSortKey)) {
    warnings.push("100M+ rows with no clustering/sort key — range scans and pagination will be expensive.");
  }
  const lowCardinality = partitionKeys.filter((c) => c.type === "boolean");
  if (lowCardinality.length > 0) {
    warnings.push(`Boolean partition key (${lowCardinality.map((c) => c.name).join(", ")}) creates exactly 2 hot partitions.`);
  }
  return warnings;
}

function compileDdl(entity: Entity): string {
  const cols = entity.columns.map((c) => `  ${c.name} ${c.type.toUpperCase()}${c.nullable ? "" : " NOT NULL"}`).join(",\n");
  const pk = entity.columns.filter((c) => c.isPartitionKey).map((c) => c.name);
  const clustering = entity.columns.filter((c) => c.isSortKey).map((c) => c.name);
  if (entity.engine === "cassandra") {
    const key = [...pk, ...clustering].join(", ");
    return `CREATE TABLE ${entity.table} (\n${cols}${key ? `,\n  PRIMARY KEY (${key})` : ""}\n) WITH comment = 'read ${entity.readQps}/s · write ${entity.writeQps}/s';`;
  }
  if (entity.engine === "dynamodb") {
    return `// DynamoDB ${entity.table}\n// PartitionKey: ${pk.join(", ") || "(unset)"} · SortKey: ${clustering.join(", ") || "(unset)"}\n// Provisioned: read ${entity.readQps} RCU/s · write ${entity.writeQps} WCU/s (on-demand recommended)`;
  }
  return `CREATE TABLE ${entity.table} (\n${cols}${pk.length > 0 ? `,\n  PRIMARY KEY (${pk.join(", ")})` : ""}\n); -- ~${entity.estimatedRows.toLocaleString()} rows`;
}

export function DataModelDesigner() {
  const entities = useWorkbenchStore((s) => s.entities);
  const addEntity = useWorkbenchStore((s) => s.addEntity);
  const updateEntity = useWorkbenchStore((s) => s.updateEntity);
  const removeEntity = useWorkbenchStore((s) => s.removeEntity);
  const [table, setTable] = useState("events");
  const [engine, setEngine] = useState<Entity["engine"]>("cassandra");

  const compiled = useMemo(() => entities.map((e) => ({ id: e.id, ddl: compileDdl(e) })), [entities]);

  const addColumn = (entityId: string) => {
    const entity = entities.find((e) => e.id === entityId);
    if (!entity) return;
    const next: TableColumn = {
      name: `field_${entity.columns.length + 1}`,
      type: "text",
      nullable: true,
      isPartitionKey: entity.columns.length === 0,
      isSortKey: false,
    };
    updateEntity(entityId, { columns: [...entity.columns, next] });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={table}
          onChange={(e) => setTable(e.target.value)}
          placeholder="table name"
          className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 font-mono text-xs text-zinc-100"
        />
        <select
          value={engine}
          onChange={(e) => setEngine(e.target.value as Entity["engine"])}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
        >
          {ENGINES.map((eng) => (
            <option key={eng} value={eng}>{eng}</option>
          ))}
        </select>
        <button
          onClick={() => {
            if (!table.trim()) return;
            addEntity({ table: table.trim(), engine, columns: [], estimatedRows: 1_000_000, readQps: 100, writeQps: 10, notes: "" });
            setTable("");
          }}
          className="flex items-center gap-1 rounded-md bg-sky-500 px-2.5 text-xs font-semibold text-zinc-950 hover:bg-sky-400"
        >
          <Plus size={13} /> Table
        </button>
      </div>

      {entities.map((entity) => {
        const warnings = analyzeEntity(entity);
        const ddl = compiled.find((c) => c.id === entity.id)?.ddl ?? "";
        return (
          <div key={entity.id} className="rounded-md border border-zinc-800 bg-zinc-900/60 p-2.5">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-zinc-100">{entity.table}</span>
              <select
                value={entity.engine}
                onChange={(e) => updateEntity(entity.id, { engine: e.target.value as Entity["engine"] })}
                className="rounded bg-zinc-950 px-1.5 py-1 text-[11px] text-zinc-300"
              >
                {ENGINES.map((eng) => (
                  <option key={eng} value={eng}>{eng}</option>
                ))}
              </select>
              <label className="ml-auto flex items-center gap-1 text-[11px] text-zinc-400">
                R <input type="number" min={0} value={entity.readQps} onChange={(e) => updateEntity(entity.id, { readQps: Math.max(0, Number(e.target.value)) })} className="w-20 rounded bg-zinc-950 px-1 py-0.5 tabular-nums" />
              </label>
              <label className="flex items-center gap-1 text-[11px] text-zinc-400">
                W <input type="number" min={0} value={entity.writeQps} onChange={(e) => updateEntity(entity.id, { writeQps: Math.max(0, Number(e.target.value)) })} className="w-20 rounded bg-zinc-950 px-1 py-0.5 tabular-nums" />
              </label>
              <button onClick={() => removeEntity(entity.id)} className="text-zinc-500 hover:text-red-300" aria-label={`Delete table ${entity.table}`}>
                <Trash2 size={14} />
              </button>
            </div>

            {warnings.length > 0 && (
              <div className="mb-2 space-y-1">
                {warnings.map((w, i) => (
                  <p key={i} className="flex items-start gap-1.5 rounded bg-amber-500/10 px-2 py-1 text-[11px] leading-relaxed text-amber-200">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {w}
                  </p>
                ))}
              </div>
            )}

            <div className="space-y-1">
              {entity.columns.map((col, ci) => (
                <div key={ci} className="flex items-center gap-1.5">
                  <input
                    value={col.name}
                    onChange={(e) => updateEntity(entity.id, { columns: entity.columns.map((c, j) => (j === ci ? { ...c, name: e.target.value } : c)) })}
                    className="w-28 rounded bg-zinc-950 px-1.5 py-1 font-mono text-[11px] text-zinc-100"
                  />
                  <select
                    value={col.type}
                    onChange={(e) => updateEntity(entity.id, { columns: entity.columns.map((c, j) => (j === ci ? { ...c, type: e.target.value as ColumnType } : c)) })}
                    className="rounded bg-zinc-950 px-1 py-1 text-[11px] text-zinc-300"
                  >
                    {COLUMN_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-0.5 text-[10px] text-zinc-400" title="Partition key">
                    <input type="checkbox" checked={col.isPartitionKey} onChange={(e) => updateEntity(entity.id, { columns: entity.columns.map((c, j) => (j === ci ? { ...c, isPartitionKey: e.target.checked } : c)) })} />
                    PK
                  </label>
                  <label className="flex items-center gap-0.5 text-[10px] text-zinc-400" title="Clustering / sort key">
                    <input type="checkbox" checked={col.isSortKey} onChange={(e) => updateEntity(entity.id, { columns: entity.columns.map((c, j) => (j === ci ? { ...c, isSortKey: e.target.checked } : c)) })} />
                    SK
                  </label>
                  <button
                    onClick={() => updateEntity(entity.id, { columns: entity.columns.filter((_, j) => j !== ci) })}
                    className="text-zinc-600 hover:text-red-300"
                    aria-label={`Remove column ${col.name}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <button onClick={() => addColumn(entity.id)} className="text-[11px] text-sky-300 hover:text-sky-200">
                + Add column
              </button>
            </div>

            <details className="mt-2">
              <summary className="cursor-pointer font-mono text-[11px] text-zinc-400">Compiled DDL</summary>
              <pre className="mt-1 max-h-40 overflow-auto rounded bg-black p-2 font-mono text-[11px] leading-relaxed text-emerald-200">{ddl}</pre>
            </details>
          </div>
        );
      })}
      {entities.length === 0 && <p className="text-xs text-zinc-500">No tables yet — create the first one above.</p>}
    </div>
  );
}

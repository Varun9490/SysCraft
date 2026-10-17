import type { ResourceCategory, StorageEngine } from "@/types/resource";
import { listCustomResources } from "./db";

/**
 * In-memory registry for user-authored primitives (Milestone 7).
 * The canvas, simulator, and IaC compilers consult this registry whenever a
 * resourceId is absent from the seed catalog, so custom nodes simulate with
 * their authored physics instead of generic fallbacks. Hydrated from
 * IndexedDB once per session by SystemCanvas.
 */

export interface CustomResourceSpec {
  id: string;
  name: string;
  category: ResourceCategory;
  baseThroughputRps: number;
  baseP50Ms: number;
  baseP95Ms: number;
  baseP99Ms: number;
  maxConcurrency: number;
  replicationFactor: number;
  costPerHourUsd: number;
  storageEngine: StorageEngine;
  writeRatio: number;
  cacheHitRate: number;
  rateLimitRps: number;
  region: string;
  multiAz: boolean;
  strokeColor: string;
}

const registry = new Map<string, CustomResourceSpec>();

export const CATEGORY_COLORS: Record<ResourceCategory, string> = {
  edge: "#CDA86A",
  compute: "#a78bfa",
  api: "#22d3ee",
  storage: "#f59e0b",
  cache: "#34d399",
  messaging: "#f472b6",
  streaming: "#fb923c",
  database: "#facc15",
  search: "#a3e635",
  security: "#f87171",
  observability: "#2dd4bf",
  network: "#60a5fa",
  ai_llm: "#c084fc",
  vector_db: "#e879f9",
  serverless: "#fbbf24",
};

export function registerCustomResource(spec: CustomResourceSpec): void {
  registry.set(spec.id, spec);
}

export function getCustomResource(id: string): CustomResourceSpec | undefined {
  return registry.get(id);
}

export function listRegisteredCustomResources(): CustomResourceSpec[] {
  return [...registry.values()];
}

export function makeCustomSpec(partial: {
  id: string;
  name: string;
  category: ResourceCategory;
  baseThroughputRps: number;
  baseP50Ms: number;
}): CustomResourceSpec {
  return {
    id: partial.id,
    name: partial.name,
    category: partial.category,
    baseThroughputRps: Math.max(1, partial.baseThroughputRps),
    baseP50Ms: Math.max(0, partial.baseP50Ms),
    baseP95Ms: Math.max(0, partial.baseP50Ms * 2.5),
    baseP99Ms: Math.max(0, partial.baseP50Ms * 5),
    maxConcurrency: 500,
    replicationFactor: 2,
    costPerHourUsd: 0.12,
    storageEngine: "none",
    writeRatio: 0.2,
    cacheHitRate: partial.category === "cache" ? 0.9 : 0,
    rateLimitRps: 10000,
    region: "us-east-1",
    multiAz: false,
    strokeColor: CATEGORY_COLORS[partial.category] ?? "#CDA86A",
  };
}

export async function hydrateCustomResourcesFromDb(): Promise<number> {
  try {
    const rows = await listCustomResources();
    let count = 0;
    for (const row of rows) {
      try {
        const schema = JSON.parse(row.schema) as Partial<CustomResourceSpec>;
        registerCustomResource(
          makeCustomSpec({
            id: row.id,
            name: row.name,
            category: (schema.category as ResourceCategory | undefined) ?? (row.category as ResourceCategory),
            baseThroughputRps: typeof schema.baseThroughputRps === "number" ? schema.baseThroughputRps : 5000,
            baseP50Ms: typeof schema.baseP50Ms === "number" ? schema.baseP50Ms : 8,
          }),
        );
        count += 1;
      } catch {
        /* skip corrupt rows */
      }
    }
    return count;
  } catch {
    return 0;
  }
}

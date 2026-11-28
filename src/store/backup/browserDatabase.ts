import Dexie, { type Table } from "dexie";
import {
  LEGACY_DB_NAME,
  SYSCRAFT_DB_NAME,
  type BlueprintRecord,
  type CustomResourceRecord,
  type FsrsCardRecord,
  type LabProgressRecord,
  type SimRecordingRecord,
} from "./schema";

/**
 * Browser-only Dexie module. `db.ts` reaches this file through a dynamic
 * import so static prerender and Node tests never evaluate Dexie.
 */
class SysCraftDatabase extends Dexie {
  blueprints!: Table<BlueprintRecord, string>;
  customResources!: Table<CustomResourceRecord, string>;
  fsrsCards!: Table<FsrsCardRecord, string>;
  labProgress!: Table<LabProgressRecord, string>;
  simRecordings!: Table<SimRecordingRecord, string>;

  constructor() {
    super(SYSCRAFT_DB_NAME);
    // Keep the v1 schema intact: existing databases must open without an upgrade.
    this.version(1).stores({
      blueprints: "id, updatedAt",
      customResources: "id, category, updatedAt",
      fsrsCards: "cardId, moduleId, due",
      labProgress: "labId, updatedAt",
      simRecordings: "id, startedAt",
    });
  }
}

let databaseInstance: SysCraftDatabase | null = null;

export function getSysCraftDatabase(): SysCraftDatabase {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is only available in a browser.");
  }
  databaseInstance ??= new SysCraftDatabase();
  return databaseInstance;
}

interface LegacyTablePair {
  name: "blueprints" | "customResources" | "fsrsCards" | "labProgress" | "simRecordings";
  key: string;
}

const LEGACY_TABLES: LegacyTablePair[] = [
  { name: "blueprints", key: "id" },
  { name: "customResources", key: "id" },
  { name: "fsrsCards", key: "cardId" },
  { name: "labProgress", key: "labId" },
  { name: "simRecordings", key: "id" },
];

let legacyMigrationPromise: Promise<number> | null = null;

async function copyLegacyDatabase(): Promise<number> {
  if (!(await Dexie.exists(LEGACY_DB_NAME))) return 0;

  const legacy = new Dexie(LEGACY_DB_NAME);
  legacy.version(1).stores({
    blueprints: "id, updatedAt",
    customResources: "id, category, updatedAt",
    fsrsCards: "cardId, moduleId, due",
    labProgress: "labId, updatedAt",
    simRecordings: "id, startedAt",
  });

  let copied = 0;
  try {
    for (const table of LEGACY_TABLES) {
      try {
        const rows = await legacy.table(table.name).toArray();
        if (rows.length === 0) continue;
        await getSysCraftDatabase().table(table.name).bulkPut(rows);
        copied += rows.length;
      } catch {
        /* A table absent from an older beta schema is safe to skip. */
      }
    }
    return copied;
  } finally {
    legacy.close();
  }
}

/** One-shot, best-effort migration from the pre-rebrand `syscanvas` database. */
export function migrateLegacyDatabases(): Promise<number> {
  if (typeof indexedDB === "undefined") return Promise.resolve(0);
  legacyMigrationPromise ??= copyLegacyDatabase().catch(() => 0);
  return legacyMigrationPromise;
}

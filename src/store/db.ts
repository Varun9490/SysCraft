import Dexie, { type Table } from "dexie";
import type { FsrsCardMemory } from "@/engine/fsrsScheduler";
import type { LabProgress } from "@/types/challenges";

/**
 * IndexedDB persistence via Dexie (SysCraft local-first contract).
 *
 * Tables mirror ARCHITECTURE.md §3 exactly: blueprints, customResources,
 * fsrsCards, labProgress — plus simRecordings for DVR capture export.
 * Every helper no-ops gracefully outside the browser (Vitest / SSR) instead
 * of throwing, so stores can call them unconditionally.
 *
 * Database name is `syscraft_db_v1`. On first boot, `migrateLegacyDatabases()`
 * copies any tables from the pre-rebrand `syscanvas` database so learners who
 * built designs on the beta never lose data.
 */

export const SYSCRAFT_DB_NAME = "syscraft_db_v1";
const LEGACY_DB_NAME = "syscanvas";

export interface BlueprintRecord {
  id: string;
  name: string;
  updatedAt: string;
  payload: string;
}

export interface CustomResourceRecord {
  id: string;
  name: string;
  category: string;
  schema: string;
  updatedAt: string;
}

export interface FsrsCardRecord extends FsrsCardMemory {
  moduleId: string;
}

export interface LabProgressRecord extends LabProgress {
  updatedAt: string;
}

export interface SimRecordingRecord {
  id: string;
  name: string;
  startedAt: string;
  tickCount: number;
  payload: string;
}

class SysCraftDatabase extends Dexie {
  blueprints!: Table<BlueprintRecord, string>;
  customResources!: Table<CustomResourceRecord, string>;
  fsrsCards!: Table<FsrsCardRecord, string>;
  labProgress!: Table<LabProgressRecord, string>;
  simRecordings!: Table<SimRecordingRecord, string>;

  constructor() {
    super(SYSCRAFT_DB_NAME);
    this.version(1).stores({
      blueprints: "id, updatedAt",
      customResources: "id, category, updatedAt",
      fsrsCards: "cardId, moduleId, due",
      labProgress: "labId, updatedAt",
      simRecordings: "id, startedAt",
    });
  }
}

export const db = new SysCraftDatabase();

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

let legacyMigrationRan = false;

/**
 * One-shot migration from the pre-rebrand `syscanvas` database. Copies rows
 * table-by-table into `syscraft_db_v1`, never deleting the legacy data (the
 * browser may still be serving an older cached bundle) and swallowing errors
 * so a blocked upgrade can never prevent the app from booting.
 */
export async function migrateLegacyDatabases(): Promise<number> {
  if (!isIndexedDbAvailable() || legacyMigrationRan) return 0;
  legacyMigrationRan = true;
  try {
    const exists = await Dexie.exists(LEGACY_DB_NAME);
    if (!exists) return 0;
    const legacy = new Dexie(LEGACY_DB_NAME);
    legacy.version(1).stores({
      blueprints: "id, updatedAt",
      customResources: "id, category, updatedAt",
      fsrsCards: "cardId, moduleId, due",
      labProgress: "labId, updatedAt",
      simRecordings: "id, startedAt",
    });
    let copied = 0;
    for (const table of LEGACY_TABLES) {
      try {
        const rows = await legacy.table(table.name).toArray();
        if (rows.length === 0) continue;
        const target = db.table(table.name);
        await target.bulkPut(rows);
        copied += rows.length;
      } catch {
        /* table missing in the legacy schema — skip */
      }
    }
    legacy.close();
    if (copied > 0) {
      await runLocalStorageMigrations();
    }
    return copied;
  } catch {
    return 0;
  }
}

const LEGACY_PREFIXES = ["syscanvas.", "systemcanvas.", "syscanvas_", "systemcanvas_"];

/**
 * Copies legacy localStorage keys (`syscanvas.*`, `systemcanvas*`) onto the
 * `syscraft.*` namespace used by the rebranded app. Called from app boot.
 */
export async function runLocalStorageMigrations(): Promise<number> {
  if (typeof window === "undefined") return 0;
  let migrated = 0;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key) keys.push(key);
    }
    for (const key of keys) {
      const prefix = LEGACY_PREFIXES.find((p) => key.startsWith(p));
      if (!prefix) continue;
      const suffix = key.slice(prefix.length);
      const nextKey = `syscraft.${suffix}`;
      const value = window.localStorage.getItem(key);
      if (value !== null && window.localStorage.getItem(nextKey) === null) {
        window.localStorage.setItem(nextKey, value);
        migrated += 1;
      }
    }
  } catch {
    /* private mode or storage disabled — nothing to migrate */
  }
  return migrated;
}

/** Boot hook: run both migrations once, before stores hydrate. */
export async function runStartupMigrations(): Promise<void> {
  await runLocalStorageMigrations();
  await migrateLegacyDatabases();
}

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function safeId(prefix: string): string {
  const rand = Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, "0");
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export async function saveBlueprint(name: string, payload: string): Promise<BlueprintRecord | null> {
  if (!isIndexedDbAvailable()) return null;
  try {
    const record: BlueprintRecord = {
      id: safeId("bp"),
      name,
      updatedAt: new Date().toISOString(),
      payload,
    };
    await db.blueprints.put(record);
    return record;
  } catch {
    return null;
  }
}

export async function listBlueprints(): Promise<BlueprintRecord[]> {
  if (!isIndexedDbAvailable()) return [];
  try {
    return await db.blueprints.orderBy("updatedAt").reverse().toArray();
  } catch {
    return [];
  }
}

export async function loadBlueprint(id: string): Promise<BlueprintRecord | null> {
  if (!isIndexedDbAvailable()) return null;
  try {
    return (await db.blueprints.get(id)) ?? null;
  } catch {
    return null;
  }
}

export async function deleteBlueprint(id: string): Promise<boolean> {
  if (!isIndexedDbAvailable()) return false;
  try {
    await db.blueprints.delete(id);
    return true;
  } catch {
    return false;
  }
}

export async function saveCustomResource(
  record: Omit<CustomResourceRecord, "updatedAt">,
): Promise<boolean> {
  if (!isIndexedDbAvailable()) return false;
  try {
    await db.customResources.put({ ...record, updatedAt: new Date().toISOString() });
    return true;
  } catch {
    return false;
  }
}

export async function listCustomResources(): Promise<CustomResourceRecord[]> {
  if (!isIndexedDbAvailable()) return [];
  try {
    return await db.customResources.orderBy("updatedAt").reverse().toArray();
  } catch {
    return [];
  }
}

export async function putFsrsCards(cards: FsrsCardRecord[]): Promise<boolean> {
  if (!isIndexedDbAvailable() || cards.length === 0) return false;
  try {
    await db.fsrsCards.bulkPut(cards);
    return true;
  } catch {
    return false;
  }
}

export async function loadFsrsCards(): Promise<FsrsCardRecord[]> {
  if (!isIndexedDbAvailable()) return [];
  try {
    return await db.fsrsCards.toArray();
  } catch {
    return [];
  }
}

export async function putLabProgress(progress: LabProgressRecord): Promise<boolean> {
  if (!isIndexedDbAvailable()) return false;
  try {
    await db.labProgress.put(progress);
    return true;
  } catch {
    return false;
  }
}

export async function loadLabProgress(): Promise<LabProgressRecord[]> {
  if (!isIndexedDbAvailable()) return [];
  try {
    return await db.labProgress.toArray();
  } catch {
    return [];
  }
}

export async function saveSimRecording(name: string, payload: string, tickCount: number): Promise<boolean> {
  if (!isIndexedDbAvailable()) return false;
  try {
    await db.simRecordings.put({
      id: safeId("rec"),
      name,
      startedAt: new Date().toISOString(),
      tickCount,
      payload,
    });
    return true;
  } catch {
    return false;
  }
}

/* ------------------------- backup export / import ------------------------- */

export const BACKUP_FORMAT = "syscraft.backup/1";
const SYSCRAFT_LS_PREFIX = "syscraft.";

export interface SysCraftBackup {
  format: string;
  exportedAt: string;
  indexedDb: {
    blueprints: BlueprintRecord[];
    customResources: CustomResourceRecord[];
    fsrsCards: FsrsCardRecord[];
    labProgress: LabProgressRecord[];
    simRecordings: SimRecordingRecord[];
  };
  localStorage: Record<string, string>;
}

/**
 * Snapshot every SysCraft-owned byte: all five IndexedDB tables plus the
 * `syscraft.*` localStorage keys (practice history, play scores, BYOK config,
 * canvas autosave). Never touches unrelated origin data.
 */
export async function exportBackup(): Promise<SysCraftBackup> {
  const empty: SysCraftBackup = {
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    indexedDb: { blueprints: [], customResources: [], fsrsCards: [], labProgress: [], simRecordings: [] },
    localStorage: {},
  };
  try {
    if (isIndexedDbAvailable()) {
      const [blueprints, customResources, fsrsCards, labProgress, simRecordings] = await Promise.all([
        db.blueprints.toArray(),
        db.customResources.toArray(),
        db.fsrsCards.toArray(),
        db.labProgress.toArray(),
        db.simRecordings.toArray(),
      ]);
      empty.indexedDb = { blueprints, customResources, fsrsCards, labProgress, simRecordings };
    }
    if (typeof window !== "undefined") {
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (!key || !key.startsWith(SYSCRAFT_LS_PREFIX)) continue;
        const value = window.localStorage.getItem(key);
        if (value !== null) empty.localStorage[key] = value;
      }
    }
    return empty;
  } catch {
    return empty;
  }
}

export interface ImportResult {
  ok: boolean;
  error?: string;
  rows: number;
  keys: number;
}

/**
 * Restore a backup produced by `exportBackup()`. Merges (bulkPut) instead of
 * replacing, so importing into a used browser never destroys newer local
 * data. Validates the format marker before writing anything.
 */
export async function importBackup(json: string): Promise<ImportResult> {
  try {
    const parsed = JSON.parse(json) as Partial<SysCraftBackup>;
    if (parsed.format !== BACKUP_FORMAT || typeof parsed.indexedDb !== "object" || parsed.indexedDb === null) {
      return { ok: false, error: "Not a SysCraft backup file (missing format marker).", rows: 0, keys: 0 };
    }
    let rows = 0;
    let keys = 0;
    if (isIndexedDbAvailable()) {
      const tables: Array<keyof SysCraftBackup["indexedDb"]> = [
        "blueprints",
        "customResources",
        "fsrsCards",
        "labProgress",
        "simRecordings",
      ];
      for (const name of tables) {
        const list = parsed.indexedDb[name];
        if (!Array.isArray(list) || list.length === 0) continue;
        await db.table(name).bulkPut(list);
        rows += list.length;
      }
    }
    const ls = parsed.localStorage;
    if (typeof window !== "undefined" && ls && typeof ls === "object") {
      for (const [key, value] of Object.entries(ls)) {
        if (!key.startsWith(SYSCRAFT_LS_PREFIX) || typeof value !== "string") continue;
        window.localStorage.setItem(key, value);
        keys += 1;
      }
    }
    return { ok: true, rows, keys };
  } catch {
    return { ok: false, error: "Could not parse the backup file — is it valid JSON?", rows: 0, keys: 0 };
  }
}

/** Delete every SysCraft-owned byte (IndexedDB tables + `syscraft.*` keys). */
export async function wipeLocalData(): Promise<boolean> {
  try {
    if (isIndexedDbAvailable()) {
      await Promise.all([
        db.blueprints.clear(),
        db.customResources.clear(),
        db.fsrsCards.clear(),
        db.labProgress.clear(),
        db.simRecordings.clear(),
      ]);
    }
    if (typeof window !== "undefined") {
      const doomed: string[] = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(SYSCRAFT_LS_PREFIX)) doomed.push(key);
      }
      for (const key of doomed) window.localStorage.removeItem(key);
    }
    return true;
  } catch {
    return false;
  }
}

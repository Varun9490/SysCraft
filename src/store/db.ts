import {
  discardPendingCanvasWrite,
  flushPendingCanvasWrite,
} from "./canvasPersistence";
import {
  BACKUP_FORMAT,
  emptyIndexedDbTables,
  isSysCraftBackupStorageKey,
  isSysCraftOwnedStorageKey,
  SYSCRAFT_TABLE_NAMES,
  type BlueprintRecord,
  type CustomResourceRecord,
  type FsrsCardRecord,
  type LabProgressRecord,
  type SysCraftBackup,
} from "./backup/schema";
import { validateBackupJson } from "./backup/validation";

export { BACKUP_FORMAT, SYSCRAFT_DB_NAME } from "./backup/schema";
export type {
  BlueprintRecord,
  CustomResourceRecord,
  FsrsCardRecord,
  LabProgressRecord,
  SimRecordingRecord,
  SysCraftBackup,
} from "./backup/schema";

/**
 * IndexedDB persistence via a lazy browser-only Dexie module (SysCraft
 * local-first contract). Importing this facade is safe in Node and during
 * static prerender; no database is constructed until a browser helper runs.
 *
 * Database name is `syscraft_db_v1`. On first boot, `migrateLegacyDatabases()`
 * copies any tables from the pre-rebrand `syscanvas` database so learners who
 * built designs on the beta never lose data.
 */

type BrowserDatabase = NonNullable<Awaited<ReturnType<typeof loadBrowserDatabase>>>;

async function loadBrowserDatabase() {
  if (!isIndexedDbAvailable()) return null;
  const { getSysCraftDatabase } = await import("./backup/browserDatabase");
  return getSysCraftDatabase();
}

const LEGACY_PREFIXES = ["syscanvas.", "systemcanvas.", "syscanvas_", "systemcanvas_"];

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
    const { migrateLegacyDatabases: migrateBrowserDatabase } = await import("./backup/browserDatabase");
    const copied = await migrateBrowserDatabase();
    if (copied > 0) await runLocalStorageMigrations();
    return copied;
  } catch {
    return 0;
  }
}

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
      const prefix = LEGACY_PREFIXES.find((candidate) => key.startsWith(candidate));
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
  try {
    const database = await loadBrowserDatabase();
    if (!database) return null;
    const record: BlueprintRecord = {
      id: safeId("bp"),
      name,
      updatedAt: new Date().toISOString(),
      payload,
    };
    await database.blueprints.put(record);
    return record;
  } catch {
    return null;
  }
}

export async function listBlueprints(): Promise<BlueprintRecord[]> {
  try {
    const database = await loadBrowserDatabase();
    if (!database) return [];
    return await database.blueprints.orderBy("updatedAt").reverse().toArray();
  } catch {
    return [];
  }
}

export async function loadBlueprint(id: string): Promise<BlueprintRecord | null> {
  try {
    const database = await loadBrowserDatabase();
    if (!database) return null;
    return (await database.blueprints.get(id)) ?? null;
  } catch {
    return null;
  }
}

export async function deleteBlueprint(id: string): Promise<boolean> {
  try {
    const database = await loadBrowserDatabase();
    if (!database) return false;
    await database.blueprints.delete(id);
    return true;
  } catch {
    return false;
  }
}

export async function saveCustomResource(
  record: Omit<CustomResourceRecord, "updatedAt">,
): Promise<boolean> {
  try {
    const database = await loadBrowserDatabase();
    if (!database) return false;
    await database.customResources.put({ ...record, updatedAt: new Date().toISOString() });
    return true;
  } catch {
    return false;
  }
}

export async function listCustomResources(): Promise<CustomResourceRecord[]> {
  try {
    const database = await loadBrowserDatabase();
    if (!database) return [];
    return await database.customResources.orderBy("updatedAt").reverse().toArray();
  } catch {
    return [];
  }
}

export async function putFsrsCards(cards: FsrsCardRecord[]): Promise<boolean> {
  try {
    const database = await loadBrowserDatabase();
    if (!database || cards.length === 0) return false;
    await database.fsrsCards.bulkPut(cards);
    return true;
  } catch {
    return false;
  }
}

export async function loadFsrsCards(): Promise<FsrsCardRecord[]> {
  try {
    const database = await loadBrowserDatabase();
    if (!database) return [];
    return await database.fsrsCards.toArray();
  } catch {
    return [];
  }
}

export async function putLabProgress(progress: LabProgressRecord): Promise<boolean> {
  try {
    const database = await loadBrowserDatabase();
    if (!database) return false;
    await database.labProgress.put(progress);
    return true;
  } catch {
    return false;
  }
}

export async function loadLabProgress(): Promise<LabProgressRecord[]> {
  try {
    const database = await loadBrowserDatabase();
    if (!database) return [];
    return await database.labProgress.toArray();
  } catch {
    return [];
  }
}

export async function saveSimRecording(name: string, payload: string, tickCount: number): Promise<boolean> {
  try {
    const database = await loadBrowserDatabase();
    if (!database) return false;
    await database.simRecordings.put({
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

export interface ImportResult {
  ok: boolean;
  error?: string;
  rows: number;
  keys: number;
}

function emptyBackup(): SysCraftBackup {
  return {
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    indexedDb: emptyIndexedDbTables(),
    localStorage: {},
  };
}

/**
 * Snapshot every SysCraft-owned byte: all five IndexedDB tables plus
 * session-independent `syscraft.*` and canvas autosave keys. BYOK credentials
 * are deliberately excluded from normal backups.
 */
export async function exportBackup(): Promise<SysCraftBackup> {
  // Include trailing canvas edits rather than exporting the previous debounce.
  flushPendingCanvasWrite();
  const backup = emptyBackup();
  const database = await loadBrowserDatabase();
  if (database) {
    backup.indexedDb = await database.transaction("r", [...SYSCRAFT_TABLE_NAMES], async () => {
      const [blueprints, customResources, fsrsCards, labProgress, simRecordings] = await Promise.all([
        database.blueprints.toArray(),
        database.customResources.toArray(),
        database.fsrsCards.toArray(),
        database.labProgress.toArray(),
        database.simRecordings.toArray(),
      ]);
      return { blueprints, customResources, fsrsCards, labProgress, simRecordings };
    });
  }

  if (typeof window !== "undefined") {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !isSysCraftBackupStorageKey(key)) continue;
      const value = window.localStorage.getItem(key);
      if (value !== null) backup.localStorage[key] = value;
    }
  }
  return backup;
}

function snapshotLocalStorage(storage: Storage, keys: Iterable<string>): Map<string, string | null> {
  const previous = new Map<string, string | null>();
  for (const key of keys) previous.set(key, storage.getItem(key));
  return previous;
}

function restoreLocalStorage(storage: Storage, previous: Map<string, string | null>): boolean {
  let restored = true;
  // Remove new values first so quota pressure does not block restoring old ones.
  for (const key of previous.keys()) {
    try {
      storage.removeItem(key);
    } catch {
      restored = false;
    }
  }
  for (const [key, value] of previous) {
    if (value === null) continue;
    try {
      storage.setItem(key, value);
    } catch {
      restored = false;
    }
  }
  return restored;
}

function writeLocalStorage(storage: Storage, entries: Record<string, string>): void {
  for (const [key, value] of Object.entries(entries)) storage.setItem(key, value);
}

function failedImport(error: string): ImportResult {
  return { ok: false, error, rows: 0, keys: 0 };
}

/**
 * Validate and stage the entire v1 backup before mutation. IndexedDB tables
 * commit in one transaction; localStorage is snapshotted and rolled back if
 * either store fails, so a rejected import leaves the prior state intact.
 */
export async function importBackup(json: string): Promise<ImportResult> {
  const validated = validateBackupJson(json);
  if (!validated.ok) return failedImport(validated.error);

  let database: BrowserDatabase | null;
  try {
    database = (await loadBrowserDatabase()) ?? null;
  } catch {
    return failedImport("IndexedDB is unavailable; no backup data was changed.");
  }

  let storage: Storage | null = null;
  try {
    storage = typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return failedImport("Local storage is unavailable; no backup data was changed.");
  }

  const entries = Object.entries(validated.backup.localStorage);
  let previous: Map<string, string | null> | null = null;
  let storageTouched = false;
  try {
    if (storage) previous = snapshotLocalStorage(storage, entries.map(([key]) => key));
    // A queued canvas autosave must not overwrite the restored canvas later.
    discardPendingCanvasWrite();

    if (database) {
      await database.transaction("rw", [...SYSCRAFT_TABLE_NAMES], async () => {
        if (storage) {
          storageTouched = true;
          writeLocalStorage(storage, validated.backup.localStorage);
        }
        for (const tableName of SYSCRAFT_TABLE_NAMES) {
          await database.table(tableName).bulkPut(validated.backup.indexedDb[tableName]);
        }
      });
    } else if (storage) {
      storageTouched = true;
      writeLocalStorage(storage, validated.backup.localStorage);
    }

    return {
      ok: true,
      rows: database ? validated.rows : 0,
      keys: storage ? validated.keys : 0,
    };
  } catch {
    const restored = !storageTouched || !storage || !previous || restoreLocalStorage(storage, previous);
    return failedImport(
      restored
        ? "Could not commit the backup atomically; prior data was restored."
        : "Could not commit the backup; IndexedDB rolled back, but localStorage rollback was incomplete.",
    );
  }
}

/** Delete every SysCraft-owned byte, including BYOK, but no unrelated origin data. */
export async function wipeLocalData(): Promise<boolean> {
  let database: BrowserDatabase | null;
  try {
    database = (await loadBrowserDatabase()) ?? null;
  } catch {
    return false;
  }

  let storage: Storage | null = null;
  try {
    storage = typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return false;
  }

  let previous: Map<string, string | null> | null = null;
  let storageTouched = false;
  try {
    const doomed: string[] = [];
    if (storage) {
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key && isSysCraftOwnedStorageKey(key)) doomed.push(key);
      }
      previous = snapshotLocalStorage(storage, doomed);
    }

    // Cancel queued autosaves only after storage access and snapshots succeed.
    discardPendingCanvasWrite();

    if (database) {
      await database.transaction("rw", [...SYSCRAFT_TABLE_NAMES], async () => {
        if (storage) {
          storageTouched = true;
          for (const key of doomed) storage.removeItem(key);
        }
        for (const tableName of SYSCRAFT_TABLE_NAMES) {
          await database.table(tableName).clear();
        }
      });
    } else if (storage) {
      storageTouched = true;
      for (const key of doomed) storage.removeItem(key);
    }
    return true;
  } catch {
    if (storageTouched && storage && previous) restoreLocalStorage(storage, previous);
    return false;
  }
}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyLearnerState, LEARNER_STORAGE_KEY } from "@/learning/platform/types";
import {
  CANVAS_STORAGE_KEY,
  canvasStorageKeyForScope,
  createDebouncedCanvasStorage,
  discardPendingCanvasWrite,
} from "../canvasPersistence";
import { exportBackup, importBackup, wipeLocalData } from "../db";
import { getSysCraftDatabase } from "./browserDatabase";
import {
  BACKUP_FORMAT,
  BYOK_STORAGE_KEY,
  SYSCRAFT_CANVAS_STORAGE_KEY,
  MAX_BACKUP_BYTES,
  MAX_BACKUP_ROW_BYTES,
  MAX_BACKUP_STORAGE_VALUE_BYTES,
  MAX_BACKUP_TABLE_ROWS,
  SYSCRAFT_TABLE_NAMES,
  type SysCraftBackup,
  type SysCraftTableName,
} from "./schema";

vi.mock("./browserDatabase", () => ({
  getSysCraftDatabase: vi.fn(),
}));

class MemoryStorage implements Storage {
  readonly values = new Map<string, string>();
  failOnKey: string | null = null;

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(name: string): string | null {
    return this.values.get(name) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(name: string): void {
    this.values.delete(name);
  }

  setItem(name: string, value: string): void {
    if (name === this.failOnKey) throw new Error("Quota exceeded");
    this.values.set(name, value);
  }
}

function fakeRowKey(row: object): string {
  const record = row as Record<string, unknown>;
  return String(record.id ?? record.cardId ?? record.labId);
}

function createFakeTable(initial: readonly object[] = []) {
  const rows = new Map(initial.map((row) => [fakeRowKey(row), row]));
  return {
    rows,
    toArray: vi.fn(async () => Array.from(rows.values())),
    bulkPut: vi.fn(async (incoming: readonly object[]) => {
      for (const row of incoming) rows.set(fakeRowKey(row), row);
    }),
    clear: vi.fn(async () => {
      rows.clear();
    }),
  };
}

function createFakeDatabase() {
  const tableEntries = SYSCRAFT_TABLE_NAMES.map((name) => [name, createFakeTable()] as const);
  const tables = Object.fromEntries(tableEntries) as Record<
    SysCraftTableName,
    ReturnType<typeof createFakeTable>
  >;
  const database = {
    ...tables,
    table: vi.fn((name: SysCraftTableName) => tables[name]),
    transaction: vi.fn(
      async (_mode: string, _names: readonly string[], operation: () => Promise<unknown>) => {
        const snapshots = new Map(
          SYSCRAFT_TABLE_NAMES.map((name) => [name, new Map(tables[name].rows)] as const),
        );
        try {
          return await operation();
        } catch (error) {
          for (const name of SYSCRAFT_TABLE_NAMES) {
            tables[name].rows.clear();
            for (const [key, row] of snapshots.get(name) ?? []) tables[name].rows.set(key, row);
          }
          throw error;
        }
      },
    ),
  };
  return { database, tables };
}

function validIndexedDbRows(): SysCraftBackup["indexedDb"] {
  const timestamp = "2026-01-01T00:00:00.000Z";
  return {
    blueprints: [{ id: "bp_1", name: "Checkout", updatedAt: timestamp, payload: "{}" }],
    customResources: [
      { id: "custom_cache", name: "Cache", category: "cache", schema: "{}", updatedAt: timestamp },
    ],
    fsrsCards: [
      {
        cardId: "card_1",
        moduleId: "foundations",
        due: timestamp,
        stability: 1,
        difficulty: 5,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        state: "new",
        lastReview: null,
      },
    ],
    labProgress: [
      {
        labId: "bitly-url-shortener",
        currentStage: 0,
        completedStages: [],
        bestScore: 0,
        bestCostUsd: null,
        updatedAt: timestamp,
      },
    ],
    simRecordings: [{ id: "rec_1", name: "Run", startedAt: timestamp, tickCount: 1, payload: "{}" }],
  };
}

function validBackup(localStorage: Record<string, string> = {}): SysCraftBackup {
  return {
    format: BACKUP_FORMAT,
    exportedAt: "2026-01-01T00:00:00.000Z",
    indexedDb: validIndexedDbRows(),
    localStorage,
  };
}

function canvasState(sceneName: string): string {
  return JSON.stringify({
    state: {
      nodes: [],
      edges: [],
      sceneName,
      edgeStyle: "smoothstep",
      semanticZoomLevel: 2,
    },
    version: 1,
  });
}

describe("full local backup, import, and wipe", () => {
  let storage: MemoryStorage;
  let fake: ReturnType<typeof createFakeDatabase>;
  let getDatabase: ReturnType<typeof vi.mocked<typeof getSysCraftDatabase>>;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal("window", {
      localStorage: storage,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("indexedDB", undefined);
    fake = createFakeDatabase();
    getDatabase = vi.mocked(getSysCraftDatabase);
    getDatabase.mockReset();
    getDatabase.mockReturnValue(fake.database as never);
  });

  afterEach(() => {
    discardPendingCanvasWrite();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function useDatabase(): void {
    vi.stubGlobal("indexedDB", {});
  }

  it("exports main and lab canvases, all tables, and non-secret SysCraft keys", async () => {
    useDatabase();
    expect(SYSCRAFT_CANVAS_STORAGE_KEY).toBe(CANVAS_STORAGE_KEY);
    const rows = validIndexedDbRows();
    for (const tableName of SYSCRAFT_TABLE_NAMES) {
      for (const row of rows[tableName]) fake.tables[tableName].rows.set(fakeRowKey(row), row);
    }
    storage.setItem(CANVAS_STORAGE_KEY, "main-canvas");
    storage.setItem(canvasStorageKeyForScope("lab:bitly-url-shortener"), "lab-canvas");
    storage.setItem("syscraft-canvas-v2:lab:future", "future-canvas");
    storage.setItem("syscraft.canvas.prefs", "prefs");
    storage.setItem(BYOK_STORAGE_KEY, "secret");
    storage.setItem("other.app", "unrelated");

    const backup = await exportBackup();

    expect(backup.indexedDb).toEqual(rows);
    expect(backup.localStorage).toEqual({
      [CANVAS_STORAGE_KEY]: "main-canvas",
      [canvasStorageKeyForScope("lab:bitly-url-shortener")]: "lab-canvas",
      "syscraft-canvas-v2:lab:future": "future-canvas",
      "syscraft.canvas.prefs": "prefs",
    });
    expect(backup.localStorage).not.toHaveProperty(BYOK_STORAGE_KEY);
    expect(backup.localStorage).not.toHaveProperty("other.app");
    expect(fake.database.transaction).toHaveBeenCalledWith("r", [...SYSCRAFT_TABLE_NAMES], expect.any(Function));
  });

  it("flushes a pending canvas write before exporting it", async () => {
    vi.useFakeTimers();
    const adapter = createDebouncedCanvasStorage(() => storage);
    adapter.setItem(CANVAS_STORAGE_KEY, canvasState("Checkout prod"));
    expect(storage.getItem(CANVAS_STORAGE_KEY)).toBeNull();

    const backup = await exportBackup();

    expect(backup.localStorage[CANVAS_STORAGE_KEY]).toContain('"sceneName":"Checkout prod"');
  });

  it("imports a v1 backup with only syscraft.* keys and merges existing rows", async () => {
    useDatabase();
    const oldRow = { id: "bp_old", name: "Old", updatedAt: "2025-01-01T00:00:00.000Z", payload: "{}" };
    fake.tables.blueprints.rows.set(oldRow.id, oldRow);
    const backup = validBackup({ "syscraft.practice.settings": "{}" });

    const result = await importBackup(JSON.stringify(backup));

    expect(result).toEqual({ ok: true, rows: 5, keys: 1 });
    expect(await fake.tables.blueprints.toArray()).toEqual([oldRow, backup.indexedDb.blueprints[0]]);
    expect(storage.getItem("syscraft.practice.settings")).toBe("{}");
    expect(fake.database.transaction).toHaveBeenCalledTimes(1);
    expect(fake.database.transaction).toHaveBeenCalledWith(
      "rw",
      [...SYSCRAFT_TABLE_NAMES],
      expect.any(Function),
    );
  });

  it("restores main and lab canvas scopes from a full backup", async () => {
    const mainKey = CANVAS_STORAGE_KEY;
    const labKey = canvasStorageKeyForScope("lab:bitly-url-shortener");
    const backup = validBackup({ [mainKey]: "main-canvas", [labKey]: "lab-canvas" });

    const result = await importBackup(JSON.stringify(backup));

    expect(result).toEqual({ ok: true, rows: 0, keys: 2 });
    expect(storage.getItem(mainKey)).toBe("main-canvas");
    expect(storage.getItem(labKey)).toBe("lab-canvas");
  });

  it("ignores BYOK credentials in older v1 backups without overwriting the secret", async () => {
    useDatabase();
    storage.setItem(BYOK_STORAGE_KEY, "existing-secret");
    const backup = validBackup({ [BYOK_STORAGE_KEY]: "imported-secret" });

    const result = await importBackup(JSON.stringify(backup));

    expect(result).toEqual({ ok: true, rows: 5, keys: 0 });
    expect(storage.getItem(BYOK_STORAGE_KEY)).toBe("existing-secret");
    expect(fake.tables.blueprints.rows.size).toBe(1);
  });

  it("rejects malformed learner JSON before touching either store", async () => {
    useDatabase();
    const oldRow = { id: "bp_old", name: "Old", updatedAt: "2025-01-01T00:00:00.000Z", payload: "{}" };
    fake.tables.blueprints.rows.set(oldRow.id, oldRow);
    storage.setItem(LEARNER_STORAGE_KEY, JSON.stringify(emptyLearnerState()));
    storage.setItem(CANVAS_STORAGE_KEY, "old-canvas");
    const backup = validBackup({
      [LEARNER_STORAGE_KEY]: "{broken",
      [CANVAS_STORAGE_KEY]: "new-canvas",
    });

    const result = await importBackup(JSON.stringify(backup));

    expect(result.ok).toBe(false);
    expect(result.error).toContain("learner JSON");
    expect(await fake.tables.blueprints.toArray()).toEqual([oldRow]);
    expect(storage.getItem(LEARNER_STORAGE_KEY)).toBe(JSON.stringify(emptyLearnerState()));
    expect(storage.getItem(CANVAS_STORAGE_KEY)).toBe("old-canvas");
    expect(getDatabase).not.toHaveBeenCalled();
    expect(fake.database.transaction).not.toHaveBeenCalled();
  });

  it("rejects syntactically valid but invalid learner state", async () => {
    const backup = validBackup({ [LEARNER_STORAGE_KEY]: JSON.stringify({ version: 1 }) });

    const result = await importBackup(JSON.stringify(backup));

    expect(result.ok).toBe(false);
    expect(result.error).toContain("valid learner state");
    expect(storage.length).toBe(0);
  });

  it("rejects malformed JSON and unsupported backup formats before mutation", async () => {
    expect((await importBackup("{broken")).ok).toBe(false);

    const future = validBackup() as unknown as Record<string, unknown>;
    future.format = "syscraft.backup/2";
    const futureResult = await importBackup(JSON.stringify(future));
    expect(futureResult.ok).toBe(false);
    expect(futureResult.error).toContain("format marker");

    const missingTable = validBackup() as unknown as { indexedDb: Record<string, unknown> };
    delete missingTable.indexedDb.simRecordings;
    expect((await importBackup(JSON.stringify(missingTable))).ok).toBe(false);
    expect(getDatabase).not.toHaveBeenCalled();
  });

  it("rejects an invalid later table row atomically", async () => {
    useDatabase();
    const oldRow = { id: "bp_old", name: "Old", updatedAt: "2025-01-01T00:00:00.000Z", payload: "{}" };
    fake.tables.blueprints.rows.set(oldRow.id, oldRow);
    storage.setItem(CANVAS_STORAGE_KEY, "old-canvas");
    const backup = validBackup({ [CANVAS_STORAGE_KEY]: "new-canvas" });
    (backup.indexedDb.simRecordings[0] as unknown as Record<string, unknown>).tickCount = "many";

    const result = await importBackup(JSON.stringify(backup));

    expect(result.ok).toBe(false);
    expect(result.error).toContain("simRecordings");
    expect(await fake.tables.blueprints.toArray()).toEqual([oldRow]);
    expect(storage.getItem(CANVAS_STORAGE_KEY)).toBe("old-canvas");
    expect(fake.database.transaction).not.toHaveBeenCalled();
  });

  it("rejects an oversized backup before parsing or mutation", async () => {
    const result = await importBackup("x".repeat(MAX_BACKUP_BYTES + 1));

    expect(result.ok).toBe(false);
    expect(result.error).toContain("oversized");
    expect(fake.database.transaction).not.toHaveBeenCalled();
  });

  it("rejects an oversized IndexedDB row", async () => {
    const backup = validBackup();
    backup.indexedDb.blueprints[0].payload = "x".repeat(MAX_BACKUP_ROW_BYTES + 1);

    const result = await importBackup(JSON.stringify(backup));

    expect(result.ok).toBe(false);
    expect(result.error).toContain("oversized row");
    expect(fake.database.transaction).not.toHaveBeenCalled();
  });

  it("rejects an oversized localStorage value", async () => {
    const backup = validBackup({ "syscraft.canvas.presets": "x".repeat(MAX_BACKUP_STORAGE_VALUE_BYTES + 1) });

    const result = await importBackup(JSON.stringify(backup));

    expect(result.ok).toBe(false);
    expect(result.error).toContain("oversized");
    expect(fake.database.transaction).not.toHaveBeenCalled();
  });

  it("rejects tables above the row cap", async () => {
    const backup = validBackup();
    backup.indexedDb.blueprints = Array.from({ length: MAX_BACKUP_TABLE_ROWS + 1 }, (_, index) => ({
      id: `bp_${index}`,
      name: "Blueprint",
      updatedAt: "2026-01-01T00:00:00.000Z",
      payload: "{}",
    }));

    const result = await importBackup(JSON.stringify(backup));

    expect(result.ok).toBe(false);
    expect(result.error).toContain("too many rows");
    expect(fake.database.transaction).not.toHaveBeenCalled();
  });

  it("rejects unknown tables, non-string values, and unowned keys", async () => {
    const unknownTable = validBackup() as unknown as Record<string, unknown>;
    (unknownTable.indexedDb as Record<string, unknown>).extra = [];
    expect((await importBackup(JSON.stringify(unknownTable))).ok).toBe(false);

    const nonString = validBackup({ "syscraft.canvas.prefs": 42 } as unknown as Record<string, string>);
    expect((await importBackup(JSON.stringify(nonString))).ok).toBe(false);

    const unowned = validBackup({ "other.app": "value" });
    const result = await importBackup(JSON.stringify(unowned));
    expect(result.ok).toBe(false);
    expect(result.error).toContain("not owned");
    expect(fake.database.transaction).not.toHaveBeenCalled();
  });

  it("rolls back all tables and localStorage when a later Dexie write fails", async () => {
    useDatabase();
    const oldRow = { id: "bp_old", name: "Old", updatedAt: "2025-01-01T00:00:00.000Z", payload: "{}" };
    fake.tables.blueprints.rows.set(oldRow.id, oldRow);
    storage.setItem("syscraft.a", "old-a");
    storage.setItem("syscraft.b", "old-b");
    fake.tables.simRecordings.bulkPut.mockRejectedValueOnce(new Error("Database failure"));
    const backup = validBackup({ "syscraft.a": "new-a", "syscraft.b": "new-b" });

    const result = await importBackup(JSON.stringify(backup));

    expect(result.ok).toBe(false);
    expect(result.error).toContain("prior data was restored");
    expect(await fake.tables.blueprints.toArray()).toEqual([oldRow]);
    expect(fake.tables.simRecordings.rows.size).toBe(0);
    expect(storage.getItem("syscraft.a")).toBe("old-a");
    expect(storage.getItem("syscraft.b")).toBe("old-b");
    expect(fake.database.transaction).toHaveBeenCalledTimes(1);
  });

  it("rolls back IndexedDB and earlier localStorage writes when quota fails", async () => {
    useDatabase();
    const oldRow = { id: "bp_old", name: "Old", updatedAt: "2025-01-01T00:00:00.000Z", payload: "{}" };
    fake.tables.blueprints.rows.set(oldRow.id, oldRow);
    storage.setItem("syscraft.a", "old-a");
    storage.failOnKey = "syscraft.b";
    const backup = validBackup({ "syscraft.a": "new-a", "syscraft.b": "new-b" });

    const result = await importBackup(JSON.stringify(backup));

    expect(result.ok).toBe(false);
    expect(await fake.tables.blueprints.toArray()).toEqual([oldRow]);
    expect(storage.getItem("syscraft.a")).toBe("old-a");
    expect(storage.getItem("syscraft.b")).toBeNull();
  });

  it("discards a pending canvas autosave so it cannot overwrite an import", async () => {
    vi.useFakeTimers();
    const adapter = createDebouncedCanvasStorage(() => storage);
    adapter.setItem(CANVAS_STORAGE_KEY, canvasState("Pending"));
    const backup = validBackup({ [CANVAS_STORAGE_KEY]: canvasState("Restored") });

    const result = await importBackup(JSON.stringify(backup));
    vi.advanceTimersByTime(1_000);

    expect(result.ok).toBe(true);
    expect(storage.getItem(CANVAS_STORAGE_KEY)).toContain('"sceneName":"Restored"');
  });

  it("wipes every table plus main/lab canvases and secrets, preserving unrelated data", async () => {
    useDatabase();
    const rows = validIndexedDbRows();
    for (const tableName of SYSCRAFT_TABLE_NAMES) {
      for (const row of rows[tableName]) fake.tables[tableName].rows.set(fakeRowKey(row), row);
    }
    storage.setItem(CANVAS_STORAGE_KEY, "main-canvas");
    storage.setItem(canvasStorageKeyForScope("lab:bitly-url-shortener"), "lab-canvas");
    storage.setItem("syscraft-canvas-v2:lab:future", "future-canvas");
    storage.setItem("syscraft.canvas.prefs", "prefs");
    storage.setItem(BYOK_STORAGE_KEY, "secret");
    storage.setItem("other.app", "unrelated");

    const result = await wipeLocalData();

    expect(result).toBe(true);
    for (const tableName of SYSCRAFT_TABLE_NAMES) expect(fake.tables[tableName].rows.size).toBe(0);
    expect(Array.from(storage.values.entries())).toEqual([["other.app", "unrelated"]]);
    expect(fake.database.transaction).toHaveBeenCalledWith(
      "rw",
      [...SYSCRAFT_TABLE_NAMES],
      expect.any(Function),
    );
  });

  it("rolls back tables and localStorage when a wipe transaction fails", async () => {
    useDatabase();
    const rows = validIndexedDbRows();
    for (const tableName of SYSCRAFT_TABLE_NAMES) {
      for (const row of rows[tableName]) fake.tables[tableName].rows.set(fakeRowKey(row), row);
    }
    storage.setItem(CANVAS_STORAGE_KEY, "main-canvas");
    storage.setItem("syscraft.canvas.prefs", "prefs");
    fake.tables.simRecordings.clear.mockRejectedValueOnce(new Error("Database failure"));

    expect(await wipeLocalData()).toBe(false);

    for (const tableName of SYSCRAFT_TABLE_NAMES) {
      expect(Array.from(fake.tables[tableName].rows.values())).toEqual(rows[tableName]);
    }
    expect(storage.getItem(CANVAS_STORAGE_KEY)).toBe("main-canvas");
    expect(storage.getItem("syscraft.canvas.prefs")).toBe("prefs");
  });

  it("cancels a pending canvas write during wipe so it cannot repopulate storage", async () => {
    vi.useFakeTimers();
    const adapter = createDebouncedCanvasStorage(() => storage);
    adapter.setItem(CANVAS_STORAGE_KEY, canvasState("Pending"));

    expect(await wipeLocalData()).toBe(true);
    vi.advanceTimersByTime(1_000);

    expect(storage.getItem(CANVAS_STORAGE_KEY)).toBeNull();
  });
});

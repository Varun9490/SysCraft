import { afterEach, describe, expect, it, vi } from "vitest";

function mockDexie() {
  const moduleLoad = vi.fn();
  const construct = vi.fn();
  const storeSchema = vi.fn();

  class FakeDexie {
    static exists = vi.fn(async () => false);

    constructor(name: string) {
      construct(name);
    }

    version(): this {
      return this;
    }

    stores(schema: Record<string, string>): this {
      storeSchema(schema);
      return this;
    }
  }

  moduleLoad.mockReturnValue({ default: FakeDexie });
  vi.doMock("dexie", moduleLoad);
  return { moduleLoad, construct, exists: FakeDexie.exists, storeSchema };
}

afterEach(() => {
  vi.doUnmock("dexie");
  vi.doUnmock("@/store/db");
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("SSR-safe database boundary", () => {
  it("imports db.ts in Node without loading or constructing Dexie", async () => {
    const dexie = mockDexie();
    vi.resetModules();

    await import("../db");

    expect(dexie.moduleLoad).not.toHaveBeenCalled();
    expect(dexie.construct).not.toHaveBeenCalled();
  });

  it("imports BootRunner in Node without loading the database facade", async () => {
    const dexie = mockDexie();
    const databaseFacadeLoad = vi.fn(() => ({ runStartupMigrations: vi.fn() }));
    vi.doMock("@/store/db", databaseFacadeLoad);
    vi.resetModules();

    await import("../../components/shell/BootRunner");

    expect(databaseFacadeLoad).not.toHaveBeenCalled();
    expect(dexie.moduleLoad).not.toHaveBeenCalled();
    expect(dexie.construct).not.toHaveBeenCalled();
  });

  it("loads the browser migration module only when startup runs", async () => {
    const dexie = mockDexie();
    vi.stubGlobal("indexedDB", {});
    vi.resetModules();
    const database = await import("../db");
    expect(dexie.moduleLoad).not.toHaveBeenCalled();

    await expect(database.runStartupMigrations()).resolves.toBeUndefined();

    expect(dexie.moduleLoad).toHaveBeenCalledTimes(1);
    expect(dexie.exists).toHaveBeenCalledWith("syscanvas");
  });

  it("constructs the v1 Dexie database only on the first browser operation", async () => {
    const dexie = mockDexie();
    vi.stubGlobal("indexedDB", {});
    vi.resetModules();
    const database = await import("../db");
    expect(dexie.construct).not.toHaveBeenCalled();

    await expect(database.listBlueprints()).resolves.toEqual([]);

    expect(dexie.moduleLoad).toHaveBeenCalledTimes(1);
    expect(dexie.construct).toHaveBeenCalledTimes(1);
    expect(dexie.construct).toHaveBeenCalledWith("syscraft_db_v1");
    expect(dexie.storeSchema).toHaveBeenCalledWith({
      blueprints: "id, updatedAt",
      customResources: "id, category, updatedAt",
      fsrsCards: "cardId, moduleId, due",
      labProgress: "labId, updatedAt",
      simRecordings: "id, startedAt",
    });
  });
});

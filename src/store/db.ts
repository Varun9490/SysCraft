import Dexie, { type Table } from "dexie";
import type { FsrsCardMemory } from "@/engine/fsrsScheduler";
import type { LabProgress } from "@/types/challenges";

/**
 * IndexedDB persistence via Dexie (SysCanvas local-first contract).
 *
 * Tables mirror ARCHITECTURE.md §3 exactly: blueprints, customResources,
 * fsrsCards, labProgress — plus simRecordings for DVR capture export.
 * Every helper no-ops gracefully outside the browser (Vitest / SSR) instead
 * of throwing, so stores can call them unconditionally.
 */

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

class SysCanvasDatabase extends Dexie {
  blueprints!: Table<BlueprintRecord, string>;
  customResources!: Table<CustomResourceRecord, string>;
  fsrsCards!: Table<FsrsCardRecord, string>;
  labProgress!: Table<LabProgressRecord, string>;
  simRecordings!: Table<SimRecordingRecord, string>;

  constructor() {
    super("syscanvas");
    this.version(1).stores({
      blueprints: "id, updatedAt",
      customResources: "id, category, updatedAt",
      fsrsCards: "cardId, moduleId, due",
      labProgress: "labId, updatedAt",
      simRecordings: "id, startedAt",
    });
  }
}

export const db = new SysCanvasDatabase();

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

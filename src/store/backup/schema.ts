import type { FsrsCardMemory } from "@/engine/fsrsScheduler";
import type { LabProgress } from "@/types/challenges";

/** Stable IndexedDB schema shared by the lazy browser database and backups. */
export const SYSCRAFT_DB_NAME = "syscraft_db_v1";
export const LEGACY_DB_NAME = "syscanvas";

export const SYSCRAFT_TABLE_NAMES = [
  "blueprints",
  "customResources",
  "fsrsCards",
  "labProgress",
  "simRecordings",
] as const;

export type SysCraftTableName = (typeof SYSCRAFT_TABLE_NAMES)[number];

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

export const BACKUP_FORMAT = "syscraft.backup/1";

export interface SysCraftBackup {
  format: typeof BACKUP_FORMAT;
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

export const SYSCRAFT_LS_PREFIX = "syscraft.";
export const SYSCRAFT_CANVAS_STORAGE_PREFIX = "syscraft-canvas-";
export const SYSCRAFT_CANVAS_STORAGE_KEY = "syscraft-canvas-v1";
export const SYSCRAFT_LAB_CANVAS_STORAGE_PREFIX = `${SYSCRAFT_CANVAS_STORAGE_KEY}:lab:`;
export const BYOK_STORAGE_KEY = "syscraft.byok";

/** Session-independent keys owned by SysCraft, including the reset secret. */
export function isSysCraftOwnedStorageKey(key: string): boolean {
  return key.startsWith(SYSCRAFT_LS_PREFIX) || key.startsWith(SYSCRAFT_CANVAS_STORAGE_PREFIX);
}

/** Normal backups never carry provider credentials unless the format changes. */
export function isSysCraftBackupStorageKey(key: string): boolean {
  return isSysCraftOwnedStorageKey(key) && key !== BYOK_STORAGE_KEY;
}

export const MAX_BACKUP_BYTES = 32 * 1024 * 1024;
export const MAX_BACKUP_ROW_BYTES = 8 * 1024 * 1024;
export const MAX_BACKUP_STORAGE_VALUE_BYTES = 5 * 1024 * 1024;
export const MAX_BACKUP_TABLE_ROWS = 5_000;
export const MAX_BACKUP_TOTAL_ROWS = 20_000;
export const MAX_BACKUP_STORAGE_KEYS = 512;
export const MAX_BACKUP_STORAGE_KEY_CHARS = 256;

export function emptyIndexedDbTables(): SysCraftBackup["indexedDb"] {
  return {
    blueprints: [],
    customResources: [],
    fsrsCards: [],
    labProgress: [],
    simRecordings: [],
  };
}

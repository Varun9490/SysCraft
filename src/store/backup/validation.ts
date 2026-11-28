import { isLearnerState, LEARNER_STORAGE_KEY } from "@/learning/platform/types";
import {
  BACKUP_FORMAT,
  BYOK_STORAGE_KEY,
  isSysCraftOwnedStorageKey,
  MAX_BACKUP_BYTES,
  MAX_BACKUP_ROW_BYTES,
  MAX_BACKUP_STORAGE_KEY_CHARS,
  MAX_BACKUP_STORAGE_KEYS,
  MAX_BACKUP_STORAGE_VALUE_BYTES,
  MAX_BACKUP_TABLE_ROWS,
  MAX_BACKUP_TOTAL_ROWS,
  SYSCRAFT_TABLE_NAMES,
  type BlueprintRecord,
  type CustomResourceRecord,
  type FsrsCardRecord,
  type LabProgressRecord,
  type SimRecordingRecord,
  type SysCraftBackup,
  type SysCraftTableName,
} from "./schema";

export interface ValidatedBackup {
  ok: true;
  backup: SysCraftBackup;
  rows: number;
  keys: number;
}

export interface InvalidBackup {
  ok: false;
  error: string;
}

export type BackupValidationResult = ValidatedBackup | InvalidBackup;

class BackupValidationError extends Error {}

function fail(message: string): never {
  throw new BackupValidationError(message);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function isBoundedString(value: unknown, maxChars: number, allowEmpty = true): value is string {
  return typeof value === "string" && value.length <= maxChars && (allowEmpty || value.length > 0);
}

function isTimestamp(value: unknown): value is string {
  return isBoundedString(value, 64, false) && Number.isFinite(Date.parse(value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

function isStringArray(value: unknown, maxItems = 2_000, maxItemChars = 256): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((entry) => isBoundedString(entry, maxItemChars))
  );
}

function isBlueprintRecord(value: unknown): value is BlueprintRecord {
  return (
    isRecord(value) &&
    isBoundedString(value.id, 256, false) &&
    isBoundedString(value.name, 512) &&
    isTimestamp(value.updatedAt) &&
    typeof value.payload === "string"
  );
}

function isCustomResourceRecord(value: unknown): value is CustomResourceRecord {
  return (
    isRecord(value) &&
    isBoundedString(value.id, 256, false) &&
    isBoundedString(value.name, 512) &&
    isBoundedString(value.category, 128, false) &&
    typeof value.schema === "string" &&
    isTimestamp(value.updatedAt)
  );
}

function isFsrsCardRecord(value: unknown): value is FsrsCardRecord {
  if (!isRecord(value)) return false;
  return (
    isBoundedString(value.cardId, 256, false) &&
    isBoundedString(value.moduleId, 256, false) &&
    isTimestamp(value.due) &&
    isFiniteNumber(value.stability) &&
    value.stability > 0 &&
    isFiniteNumber(value.difficulty) &&
    value.difficulty >= 1 &&
    value.difficulty <= 10 &&
    isFiniteNumber(value.elapsedDays) &&
    value.elapsedDays >= 0 &&
    isFiniteNumber(value.scheduledDays) &&
    value.scheduledDays >= 0 &&
    isNonNegativeInteger(value.reps) &&
    isNonNegativeInteger(value.lapses) &&
    (value.state === "new" || value.state === "learning" || value.state === "review" || value.state === "relearning") &&
    (value.lastReview === null || isTimestamp(value.lastReview))
  );
}

function isLabProgressRecord(value: unknown): value is LabProgressRecord {
  return (
    isRecord(value) &&
    isBoundedString(value.labId, 256, false) &&
    isNonNegativeInteger(value.currentStage) &&
    isStringArray(value.completedStages) &&
    isFiniteNumber(value.bestScore) &&
    value.bestScore >= 0 &&
    value.bestScore <= 100 &&
    (value.bestCostUsd === null || (isFiniteNumber(value.bestCostUsd) && value.bestCostUsd >= 0)) &&
    isTimestamp(value.updatedAt)
  );
}

function isSimRecordingRecord(value: unknown): value is SimRecordingRecord {
  return (
    isRecord(value) &&
    isBoundedString(value.id, 256, false) &&
    isBoundedString(value.name, 512) &&
    isTimestamp(value.startedAt) &&
    isNonNegativeInteger(value.tickCount) &&
    typeof value.payload === "string"
  );
}

type RowGuard<T> = (value: unknown) => value is T;

function validateRows<T>(
  tableName: SysCraftTableName,
  value: unknown,
  guard: RowGuard<T>,
  primaryKey: (row: T) => string,
): T[] {
  assert(Array.isArray(value), `Backup table "${tableName}" must be an array.`);
  assert(value.length <= MAX_BACKUP_TABLE_ROWS, `Backup table "${tableName}" has too many rows.`);

  const seenKeys = new Set<string>();
  return value.map((row, index) => {
    assert(isRecord(row), `Backup table "${tableName}" has an invalid row at index ${index}.`);
    assert(
      utf8ByteLength(JSON.stringify(row)) <= MAX_BACKUP_ROW_BYTES,
      `Backup table "${tableName}" has an oversized row at index ${index}.`,
    );
    assert(guard(row), `Backup table "${tableName}" has invalid values at row index ${index}.`);
    const key = primaryKey(row);
    assert(!seenKeys.has(key), `Backup table "${tableName}" contains duplicate row key "${key}".`);
    seenKeys.add(key);
    return row;
  });
}

function validateIndexedDb(value: unknown): SysCraftBackup["indexedDb"] {
  assert(isRecord(value), "Backup IndexedDB payload must be an object.");
  assert(
    hasExactKeys(value, SYSCRAFT_TABLE_NAMES),
    "Backup IndexedDB tables do not match the SysCraft v1 schema.",
  );

  return {
    blueprints: validateRows("blueprints", value.blueprints, isBlueprintRecord, (row) => row.id),
    customResources: validateRows(
      "customResources",
      value.customResources,
      isCustomResourceRecord,
      (row) => row.id,
    ),
    fsrsCards: validateRows("fsrsCards", value.fsrsCards, isFsrsCardRecord, (row) => row.cardId),
    labProgress: validateRows("labProgress", value.labProgress, isLabProgressRecord, (row) => row.labId),
    simRecordings: validateRows("simRecordings", value.simRecordings, isSimRecordingRecord, (row) => row.id),
  };
}

function validateLocalStorage(value: unknown): Record<string, string> {
  assert(isRecord(value), "Backup localStorage payload must be an object.");
  const entries = Object.entries(value);
  assert(entries.length <= MAX_BACKUP_STORAGE_KEYS, "Backup contains too many localStorage keys.");

  const localStorage: Record<string, string> = {};
  for (const [key, entry] of entries) {
    assert(key.length <= MAX_BACKUP_STORAGE_KEY_CHARS, "Backup contains an oversized localStorage key.");
    assert(
      isSysCraftOwnedStorageKey(key),
      `Backup contains a localStorage key not owned by SysCraft: ${key}`,
    );
    assert(typeof entry === "string", `Backup localStorage value for "${key}" must be a string.`);
    assert(
      utf8ByteLength(entry) <= MAX_BACKUP_STORAGE_VALUE_BYTES,
      `Backup localStorage value for "${key}" is oversized.`,
    );

    // Older v1 backups contained BYOK. Validate the value for compatibility,
    // but never restore a credential from a normal progress backup.
    if (key === BYOK_STORAGE_KEY) continue;

    if (key === LEARNER_STORAGE_KEY) {
      let learner: unknown;
      try {
        learner = JSON.parse(entry);
      } catch {
        fail(`Backup localStorage value for "${key}" is not valid learner JSON.`);
      }
      assert(isLearnerState(learner), `Backup localStorage value for "${key}" is not a valid learner state.`);
    }
    localStorage[key] = entry;
  }
  return localStorage;
}

function validateParsedBackup(value: unknown): ValidatedBackup {
  assert(isRecord(value), "Backup root must be an object.");
  assert(value.format === BACKUP_FORMAT, "Not a SysCraft backup file (missing or unsupported format marker).");
  assert(
    hasExactKeys(value, ["format", "exportedAt", "indexedDb", "localStorage"]),
    "Backup root does not match the SysCraft v1 format.",
  );
  assert(isTimestamp(value.exportedAt), "Backup exportedAt timestamp is invalid.");

  const indexedDb = validateIndexedDb(value.indexedDb);
  const localStorage = validateLocalStorage(value.localStorage);
  const rows = SYSCRAFT_TABLE_NAMES.reduce((total, tableName) => total + indexedDb[tableName].length, 0);
  assert(rows <= MAX_BACKUP_TOTAL_ROWS, "Backup contains too many IndexedDB rows.");

  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      exportedAt: value.exportedAt,
      indexedDb,
      localStorage,
    },
    rows,
    keys: Object.keys(localStorage).length,
  };
}

/** Parse and validate the complete file before the caller touches either store. */
export function validateBackupJson(json: string): BackupValidationResult {
  try {
    if (typeof json !== "string") fail("Backup file must be JSON text.");
    if (utf8ByteLength(json) > MAX_BACKUP_BYTES) fail("Backup file is oversized.");
    return validateParsedBackup(JSON.parse(json) as unknown);
  } catch (error) {
    if (error instanceof BackupValidationError) return { ok: false, error: error.message };
    return { ok: false, error: "Could not parse the backup file — is it valid JSON?" };
  }
}

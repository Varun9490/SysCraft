import { getLessonById } from "@/content/platform/registry";
import { LESSON_ROUTES } from "@/lib/lessonRoutes";
import {
  DEFAULT_PREFS,
  emptyLearnerState,
  isLearnerState,
  LEARNER_STORAGE_KEY,
  type BreakMinutes,
  type LearningMode,
  type LearnerPrefs,
  type LearnerStateV1,
  type MasteryRecord,
  type QuizHistoryEntry,
  type ResumePointer,
  type ThemePref,
} from "./types";

export const LEARNER_META_STORAGE_KEY = "syscraft.learner.meta.v1";
export const LEGACY_COMPLETED_LESSONS_KEY = "syscraft.completedLessons.v1";
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

const MAX_STORED_STATE_BYTES = 4 * 1024 * 1024;
const MAX_ID_LENGTH = 256;
const LEGACY_PREFIXES = ["syscanvas.", "systemcanvas.", "syscanvas_", "systemcanvas_"] as const;

/** Bounds applied consistently to hydration, migration, imports, and commits. */
export const LEARNER_STATE_LIMITS = {
  completedLessons: 2_000,
  readBlogs: 1_000,
  visitedTopics: 2_000,
  masteryTopics: 2_000,
  quizHistory: 500,
  notes: 500,
  noteCharacters: 20_000,
  totalNoteCharacters: 250_000,
  bookmarks: 1_000,
} as const;

export type LearnerPersistenceStatus = "idle" | "pending" | "saved" | "error";

export interface LearnerPersistenceResult {
  state: LearnerStateV1;
  status: Exclude<LearnerPersistenceStatus, "pending">;
  message: string | null;
}

export type LearnerStateUpdater = (state: LearnerStateV1) => LearnerStateV1;

export interface LearnerCommitOptions {
  /** Used only when storage cannot be read, so the in-memory action still works. */
  fallback?: LearnerStateV1;
}

interface LearnerMeta {
  version: 1;
  revision: number;
  updatedAt: string;
}

interface StoredLearnerState {
  raw: string | null;
  state: LearnerStateV1;
  needsWrite: boolean;
}

const ERROR_MESSAGE = "Progress is available for this session, but browser storage could not save it.";
const QUOTA_MESSAGE = "Browser storage is full. Recent progress may not survive a reload.";
let persistenceStatus: Exclude<LearnerPersistenceStatus, "pending"> = "idle";
let persistenceMessage: string | null = null;
let unmatchedLegacyIds: string[] = [];
const persistenceListeners = new Set<() => void>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeRecordKey(value: string): boolean {
  return value.length > 0 && value.length <= MAX_ID_LENGTH && value !== "__proto__" && value !== "constructor" && value !== "prototype";
}

function isWithinByteLimit(value: string, limit: number): boolean {
  if (value.length > limit) return false;
  if (typeof TextEncoder === "undefined") return true;
  return new TextEncoder().encode(value).byteLength <= limit;
}

function setPersistenceStatus(
  status: Exclude<LearnerPersistenceStatus, "pending">,
  message: string | null = null,
): void {
  persistenceStatus = status;
  persistenceMessage = message;
  for (const listener of persistenceListeners) {
    try {
      listener();
    } catch {
      // A status observer must never interfere with persistence.
    }
  }
}

function reportPersistenceError(error: unknown): void {
  const name = isRecord(error) ? error.name : undefined;
  setPersistenceStatus("error", name === "QuotaExceededError" ? QUOTA_MESSAGE : ERROR_MESSAGE);
}

export function getLearnerPersistenceStatus(): {
  status: Exclude<LearnerPersistenceStatus, "pending">;
  message: string | null;
} {
  return { status: persistenceStatus, message: persistenceMessage };
}

export function subscribeToLearnerPersistence(listener: () => void): () => void {
  persistenceListeners.add(listener);
  return () => persistenceListeners.delete(listener);
}

function sanitizeStringArray(value: unknown, cap: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || !isSafeRecordKey(entry) || seen.has(entry)) continue;
    seen.add(entry);
    result.push(entry);
    if (result.length === cap) break;
  }
  return result;
}

function sanitizeNotes(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const notes: Record<string, string> = {};
  let totalCharacters = 0;
  for (const [topicId, rawNote] of Object.entries(value)) {
    if (!isSafeRecordKey(topicId) || typeof rawNote !== "string" || rawNote.length === 0) continue;
    const note = rawNote.slice(0, LEARNER_STATE_LIMITS.noteCharacters);
    notes[topicId] = note;
    totalCharacters += note.length;
    while (
      Object.keys(notes).length > LEARNER_STATE_LIMITS.notes ||
      totalCharacters > LEARNER_STATE_LIMITS.totalNoteCharacters
    ) {
      const oldestTopicId = Object.keys(notes)[0];
      if (oldestTopicId === undefined) break;
      totalCharacters -= notes[oldestTopicId].length;
      delete notes[oldestTopicId];
    }
  }
  return notes;
}

function isMasteryRecord(value: unknown): value is MasteryRecord {
  return isLearnerState({ ...emptyLearnerState(), mastery: { topic: value } });
}

function isQuizHistoryEntry(value: unknown): value is QuizHistoryEntry {
  return isLearnerState({ ...emptyLearnerState(), quizHistory: [value] });
}

function isResumePointer(value: unknown): value is ResumePointer {
  return value !== null && isLearnerState({ ...emptyLearnerState(), resume: value });
}

function sanitizeMastery(value: unknown): Record<string, MasteryRecord> {
  if (!isRecord(value)) return {};
  const mastery: Record<string, MasteryRecord> = {};
  const validEntries = Object.entries(value).filter(
    (entry): entry is [string, MasteryRecord] => isSafeRecordKey(entry[0]) && isMasteryRecord(entry[1]),
  );
  for (const [topicId, record] of validEntries.slice(-LEARNER_STATE_LIMITS.masteryTopics)) {
    mastery[topicId] = { ...record };
  }
  return mastery;
}

function sanitizeQuizHistory(value: unknown): QuizHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isQuizHistoryEntry)
    .slice(-LEARNER_STATE_LIMITS.quizHistory)
    .map((entry) => ({ ...entry }));
}

function sanitizePrefs(value: unknown): LearnerPrefs {
  const prefs: LearnerPrefs = { ...DEFAULT_PREFS };
  if (!isRecord(value)) return prefs;
  if (value.mode === "story" || value.mode === "engineer" || value.mode === "both") {
    prefs.mode = value.mode as LearningMode;
  }
  if (value.theme === "dark" || value.theme === "light" || value.theme === "system") {
    prefs.theme = value.theme as ThemePref;
  }
  if (typeof value.ambient === "boolean") prefs.ambient = value.ambient;
  if (typeof value.cursor === "boolean") prefs.cursor = value.cursor;
  if (value.breakMinutes === 0 || value.breakMinutes === 15 || value.breakMinutes === 25 || value.breakMinutes === 45) {
    prefs.breakMinutes = value.breakMinutes as BreakMinutes;
  }
  return prefs;
}

/**
 * Produces a bounded v1 snapshot while preserving every independently valid
 * field. A corrupt note or mastery entry does not discard unrelated progress.
 */
export function normalizeLearnerState(value: unknown): LearnerStateV1 {
  const defaults = emptyLearnerState();
  if (!isRecord(value) || value.version !== 1) return defaults;
  return {
    version: 1,
    completedLessons: sanitizeStringArray(value.completedLessons, LEARNER_STATE_LIMITS.completedLessons),
    readBlogs: sanitizeStringArray(value.readBlogs, LEARNER_STATE_LIMITS.readBlogs),
    visitedTopics: sanitizeStringArray(value.visitedTopics, LEARNER_STATE_LIMITS.visitedTopics),
    mastery: sanitizeMastery(value.mastery),
    quizHistory: sanitizeQuizHistory(value.quizHistory),
    notes: sanitizeNotes(value.notes),
    bookmarks: sanitizeStringArray(value.bookmarks, LEARNER_STATE_LIMITS.bookmarks),
    resume: isResumePointer(value.resume) ? { ...value.resume } : null,
    prefs: sanitizePrefs(value.prefs),
  };
}

function parseJson(raw: string): { ok: boolean; value: unknown } {
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false, value: undefined };
  }
}

function readStoredLearnerState(storage: Storage): StoredLearnerState {
  const raw = storage.getItem(LEARNER_STORAGE_KEY);
  if (raw === null) return { raw, state: emptyLearnerState(), needsWrite: true };
  if (!isWithinByteLimit(raw, MAX_STORED_STATE_BYTES)) {
    return { raw, state: emptyLearnerState(), needsWrite: true };
  }
  const parsed = parseJson(raw);
  if (!parsed.ok) return { raw, state: emptyLearnerState(), needsWrite: true };
  const state = normalizeLearnerState(parsed.value);
  return {
    raw,
    state,
    needsWrite: !isLearnerState(parsed.value) || JSON.stringify(parsed.value) !== JSON.stringify(state),
  };
}

function readMeta(storage: Storage): LearnerMeta | null {
  const raw = storage.getItem(LEARNER_META_STORAGE_KEY);
  if (raw === null || !isWithinByteLimit(raw, 4_096)) return null;
  const parsed = parseJson(raw);
  if (!parsed.ok || !isRecord(parsed.value)) return null;
  const revision = parsed.value.revision;
  if (
    parsed.value.version !== 1 ||
    typeof revision !== "number" ||
    !Number.isSafeInteger(revision) ||
    revision < 0 ||
    typeof parsed.value.updatedAt !== "string" ||
    !Number.isFinite(new Date(parsed.value.updatedAt).getTime())
  ) {
    return null;
  }
  return { version: 1, revision, updatedAt: parsed.value.updatedAt };
}

function persistLearnerState(storage: Storage, state: LearnerStateV1, revision: number): void {
  const serialized = JSON.stringify(state);
  if (!isWithinByteLimit(serialized, MAX_STORED_STATE_BYTES)) {
    throw new Error("Learner state exceeds the storage safety limit");
  }
  storage.setItem(LEARNER_STORAGE_KEY, serialized);
  const meta: LearnerMeta = {
    version: 1,
    revision: Math.min(revision + 1, Number.MAX_SAFE_INTEGER),
    updatedAt: new Date().toISOString(),
  };
  storage.setItem(LEARNER_META_STORAGE_KEY, JSON.stringify(meta));
  // Legacy readers still use this key. Keep it as a compatibility mirror.
  storage.setItem(LEGACY_COMPLETED_LESSONS_KEY, JSON.stringify(state.completedLessons));
  setPersistenceStatus("saved");
}

/** Copy pre-rebrand keys first, without deleting the originals. */
function migrateRebrandedKeys(storage: Storage): void {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key) keys.push(key);
  }
  for (const key of keys) {
    const prefix = LEGACY_PREFIXES.find((candidate) => key.startsWith(candidate));
    if (!prefix) continue;
    const nextKey = `syscraft.${key.slice(prefix.length)}`;
    const value = storage.getItem(key);
    if (value !== null && storage.getItem(nextKey) === null) storage.setItem(nextKey, value);
  }
}

const LEGACY_PATH_LESSON_IDS = new Set(
  LESSON_ROUTES.map((route) => `${route.moduleId}::${route.lessonIndex}`),
);
const LEGACY_LESSON_HREFS = new Map(LESSON_ROUTES.map((route) => [route.href, `${route.moduleId}::${route.lessonIndex}`]));

function resolveLegacyLessonId(value: string): string | null {
  const fromRoute = LEGACY_LESSON_HREFS.get(value);
  if (fromRoute) return fromRoute;
  if (LEGACY_PATH_LESSON_IDS.has(value)) return value;
  return getLessonById(value)?.id ?? null;
}

function readLegacyCompletions(storage: Storage): string[] {
  unmatchedLegacyIds = [];
  const raw = storage.getItem(LEGACY_COMPLETED_LESSONS_KEY);
  if (raw === null || !isWithinByteLimit(raw, MAX_STORED_STATE_BYTES)) return [];
  const parsed = parseJson(raw);
  if (!parsed.ok || !Array.isArray(parsed.value)) return [];
  const unmatched: string[] = [];
  const completed: string[] = [];
  for (const entry of parsed.value) {
    if (typeof entry !== "string" || entry.length > MAX_ID_LENGTH) continue;
    const resolved = resolveLegacyLessonId(entry);
    if (!resolved) {
      if (!unmatched.includes(entry) && unmatched.length < 100) unmatched.push(entry);
      continue;
    }
    if (!completed.includes(resolved)) completed.push(resolved);
  }
  unmatchedLegacyIds = unmatched;
  return completed;
}

function migrateLegacyCanvasAnimations(storage: Storage, state: LearnerStateV1): void {
  const raw = storage.getItem("syscraft.canvas.prefs");
  if (raw === null || !isWithinByteLimit(raw, 64 * 1024)) return;
  const parsed = parseJson(raw);
  if (!parsed.ok || !isRecord(parsed.value) || typeof parsed.value.animations !== "boolean") return;
  state.prefs.ambient = parsed.value.animations;
}

/**
 * Idempotent client-boot migration. Rebrand copies happen before legacy
 * completion and compatible preference fields are merged into the v1 store.
 */
export function migrateLegacyLearnerState(): LearnerStateV1 {
  if (typeof window === "undefined") return emptyLearnerState();
  let migrated = emptyLearnerState();
  try {
    const storage = window.localStorage;
    migrateRebrandedKeys(storage);
    const stored = readStoredLearnerState(storage);
    const state = normalizeLearnerState(stored.state);
    migrated = state;
    const legacyCompletions = readLegacyCompletions(storage);
    let addedCompletions = false;
    for (const lessonId of legacyCompletions) {
      if (state.completedLessons.includes(lessonId)) continue;
      state.completedLessons = sanitizeStringArray(
        [...state.completedLessons, lessonId],
        LEARNER_STATE_LIMITS.completedLessons,
      );
      addedCompletions = true;
    }
    if (stored.raw === null) migrateLegacyCanvasAnimations(storage, state);
    const meta = readMeta(storage);
    if (stored.needsWrite || addedCompletions || meta === null) {
      persistLearnerState(storage, state, meta?.revision ?? 0);
    }
    return state;
  } catch (error) {
    reportPersistenceError(error);
    return migrated;
  }
}

export function getLegacyMigrationDiagnostics(): readonly string[] {
  return [...unmatchedLegacyIds];
}

/** Loads migrated, bounded progress without touching browser APIs during SSR. */
export function loadLearnerState(): LearnerStateV1 {
  if (typeof window === "undefined") return emptyLearnerState();
  return migrateLegacyLearnerState();
}

function applyLearnerUpdater(state: LearnerStateV1, updater: LearnerStateUpdater): LearnerStateV1 {
  const updated = updater(state);
  if (!isLearnerState(updated)) throw new Error("Invalid learner state update");
  return normalizeLearnerState(updated);
}

/**
 * Applies an operation to the latest persisted state, checks the revision again
 * immediately before writing, and retries if another tab committed meanwhile.
 * The v1 public schema remains unchanged; revision metadata lives separately.
 */
export function commitLearnerState(
  updater: LearnerStateUpdater,
  options: LearnerCommitOptions = {},
): LearnerPersistenceResult {
  const fallback = normalizeLearnerState(options.fallback ?? emptyLearnerState());
  if (typeof window === "undefined") {
    let state = fallback;
    try {
      state = applyLearnerUpdater(fallback, updater);
    } catch {
      setPersistenceStatus("error", ERROR_MESSAGE);
      return { state, status: "error", message: ERROR_MESSAGE };
    }
    return { state, status: "idle", message: null };
  }

  let candidate = fallback;
  try {
    const storage = window.localStorage;
    migrateLegacyLearnerState();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const stored = readStoredLearnerState(storage);
      const beforeMeta = readMeta(storage);
      candidate = applyLearnerUpdater(stored.state, updater);
      const afterRaw = storage.getItem(LEARNER_STORAGE_KEY);
      const afterMeta = readMeta(storage);
      if (
        afterRaw === stored.raw &&
        (afterMeta?.revision ?? 0) === (beforeMeta?.revision ?? 0)
      ) {
        if (afterRaw !== JSON.stringify(candidate)) {
          persistLearnerState(storage, candidate, beforeMeta?.revision ?? 0);
        } else {
          setPersistenceStatus("saved");
        }
        return { state: candidate, status: "saved", message: null };
      }
    }

    const latest = readStoredLearnerState(storage);
    candidate = applyLearnerUpdater(latest.state, updater);
    persistLearnerState(storage, candidate, readMeta(storage)?.revision ?? 0);
    return { state: candidate, status: "saved", message: null };
  } catch (error) {
    if (candidate === fallback) {
      try {
        candidate = applyLearnerUpdater(fallback, updater);
      } catch {
        candidate = fallback;
      }
    }
    reportPersistenceError(error);
    return { state: candidate, status: "error", message: persistenceMessage };
  }
}

/** Backward-compatible whole-state save; new callers should use a field updater. */
export function saveLearnerState(state: LearnerStateV1): LearnerPersistenceResult {
  if (!isLearnerState(state)) {
    setPersistenceStatus("error", ERROR_MESSAGE);
    return { state: emptyLearnerState(), status: "error", message: ERROR_MESSAGE };
  }
  return commitLearnerState(() => state, { fallback: state });
}

/** Re-read learner state (and run migration) when another tab or legacy writer changes it. */
export function subscribeToLearnerStorage(listener: (event: StorageEvent) => void): () => void {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") return () => {};
  const onStorage = (event: StorageEvent): void => {
    if (
      event.key === null ||
      event.key === LEARNER_STORAGE_KEY ||
      event.key === LEARNER_META_STORAGE_KEY ||
      event.key === LEGACY_COMPLETED_LESSONS_KEY
    ) {
      if (event.newValue === null) {
        try {
          if (window.localStorage.getItem(LEARNER_STORAGE_KEY) === null) setPersistenceStatus("idle");
        } catch {
          // The store callback will surface any storage access failure.
        }
      }
      listener(event);
    }
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

export function exportLearnerJson(state: LearnerStateV1): string {
  return JSON.stringify(normalizeLearnerState(state), null, 2);
}

/** Parsing, byte limits, and validation happen before the caller replaces state. */
export function importLearnerJson(raw: string): LearnerStateV1 {
  if (!isWithinByteLimit(raw, MAX_IMPORT_BYTES)) throw new Error("Invalid progress file");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid progress file");
  }
  if (!isLearnerState(parsed)) throw new Error("Invalid progress file");
  return normalizeLearnerState(parsed);
}

/**
 * Local practice statistics for the FSRS review queue and the Weekly Rhythm
 * tracker on /progress. All data stays on the device in localStorage under
 * the `syscraft.*` namespace; helpers no-op outside the browser so Vitest and
 * SSR imports are safe.
 */

export interface PracticeSessionRecord {
  /** ISO timestamp when the session ended. */
  at: string;
  /** YYYY-MM-DD (local) used for the weekly rhythm bucket. */
  day: string;
  reviewed: number;
  correct: number;
  /** Seconds spent in the session. */
  seconds: number;
}

export interface PracticeSettings {
  dailyCap: number;
  catchUpMode: boolean;
}

export const PRACTICE_HISTORY_KEY = "syscraft.practice.history";
export const PRACTICE_SETTINGS_KEY = "syscraft.practice.settings";
export const PLAY_SCORES_KEY = "syscraft.play.scores";

const HISTORY_CAP = 400;

export const DEFAULT_PRACTICE_SETTINGS: PracticeSettings = {
  dailyCap: 20,
  catchUpMode: false,
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or disabled — stats are best-effort */
  }
}

export function loadPracticeSettings(): PracticeSettings {
  const stored = readJson<Partial<PracticeSettings>>(PRACTICE_SETTINGS_KEY, {});
  return {
    dailyCap: clampCap(stored.dailyCap),
    catchUpMode: Boolean(stored.catchUpMode),
  };
}

export function savePracticeSettings(settings: PracticeSettings): void {
  writeJson(PRACTICE_SETTINGS_KEY, {
    dailyCap: clampCap(settings.dailyCap),
    catchUpMode: Boolean(settings.catchUpMode),
  });
}

function clampCap(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : DEFAULT_PRACTICE_SETTINGS.dailyCap;
  return Math.max(5, Math.min(200, n));
}

export function loadPracticeHistory(): PracticeSessionRecord[] {
  const rows = readJson<PracticeSessionRecord[]>(PRACTICE_HISTORY_KEY, []);
  return Array.isArray(rows) ? rows.filter(isRecord) : [];
}

function isRecord(row: unknown): row is PracticeSessionRecord {
  if (!row || typeof row !== "object") return false;
  const r = row as Partial<PracticeSessionRecord>;
  return typeof r.at === "string" && typeof r.day === "string" && typeof r.reviewed === "number";
}

export function recordPracticeSession(
  reviewed: number,
  correct: number,
  seconds: number,
  now: Date = new Date(),
): PracticeSessionRecord[] {
  const day = localDay(now);
  const entry: PracticeSessionRecord = {
    at: now.toISOString(),
    day,
    reviewed: Math.max(0, Math.round(reviewed)),
    correct: Math.max(0, Math.round(correct)),
    seconds: Math.max(0, Math.round(seconds)),
  };
  const rows = [entry, ...loadPracticeHistory()].slice(0, HISTORY_CAP);
  writeJson(PRACTICE_HISTORY_KEY, rows);
  return rows;
}

export function localDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Reviews already completed today (used to enforce the daily cap). */
export function reviewsToday(history: PracticeSessionRecord[], now: Date = new Date()): number {
  const today = localDay(now);
  return history.filter((row) => row.day === today).reduce((sum, row) => sum + row.reviewed, 0);
}

/**
 * Weekly rhythm: which of the last 7 days (including today) had at least one
 * review. Returns oldest-first booleans so the tracker renders left to right.
 */
export function weeklyRhythm(history: PracticeSessionRecord[], now: Date = new Date()): Array<{ day: string; active: boolean }> {
  const active = new Set(history.map((row) => row.day));
  const out: Array<{ day: string; active: boolean }> = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(now.getTime() - offset * 86_400_000);
    const key = localDay(date);
    out.push({ day: key, active: active.has(key) });
  }
  return out;
}

/** Consecutive-day practice streak measured in "days per week", not forever. */
export function rhythmThisWeek(history: PracticeSessionRecord[], now: Date = new Date()): number {
  return weeklyRhythm(history, now).filter((d) => d.active).length;
}

export interface PlayScoreRecord {
  modeId: string;
  bestScore: number;
  bestAt: string;
  plays: number;
}

export function loadPlayScores(): Record<string, PlayScoreRecord> {
  const rows = readJson<Record<string, PlayScoreRecord>>(PLAY_SCORES_KEY, {});
  return rows && typeof rows === "object" ? rows : {};
}

export function recordPlayScore(modeId: string, score: number, now: Date = new Date()): Record<string, PlayScoreRecord> {
  const rows = loadPlayScores();
  const prev = rows[modeId];
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  rows[modeId] = {
    modeId,
    bestScore: Math.max(prev?.bestScore ?? 0, clamped),
    bestAt: prev && prev.bestScore >= clamped ? prev.bestAt : now.toISOString(),
    plays: (prev?.plays ?? 0) + 1,
  };
  writeJson(PLAY_SCORES_KEY, rows);
  return rows;
}

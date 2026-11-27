import {
  emptyLearnerState,
  isLearnerState,
  LEARNER_STORAGE_KEY,
  type LearnerStateV1,
} from "./types";

/** Loads progress without touching browser APIs during SSR or module evaluation. */
export function loadLearnerState(): LearnerStateV1 {
  if (typeof window === "undefined") return emptyLearnerState();
  try {
    const raw = window.localStorage.getItem(LEARNER_STORAGE_KEY);
    if (!raw) return emptyLearnerState();
    const parsed: unknown = JSON.parse(raw);
    return isLearnerState(parsed) ? parsed : emptyLearnerState();
  } catch {
    return emptyLearnerState();
  }
}

/** Storage denial, quota exhaustion, and private mode must never break learning. */
export function saveLearnerState(state: LearnerStateV1): void {
  if (typeof window === "undefined") return;
  if (!isLearnerState(state)) return;
  try {
    window.localStorage.setItem(LEARNER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The in-memory store remains authoritative when persistence is unavailable.
  }
}

export function exportLearnerJson(state: LearnerStateV1): string {
  return JSON.stringify(state, null, 2);
}

/** Parsing and validation happen before the caller decides whether to replace state. */
export function importLearnerJson(raw: string): LearnerStateV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid progress file");
  }
  if (!isLearnerState(parsed)) throw new Error("Invalid progress file");
  return parsed;
}

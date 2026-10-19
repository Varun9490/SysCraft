import { create } from "zustand";

/**
 * Local-first prediction record: every committed prediction (topic sandbox
 * scenarios and later lab drills) is stored on-device so /progress can show
 * estimation accuracy over time. Predicting before running is the core
 * pedagogy loop — the record exists to make that loop visible.
 *
 * SSR-safe: all hydration happens through hydrate() from a client effect.
 */

export interface PredictionRecord {
  /** Unique key: `${surfaceId}:${questionId}` where surfaceId scopes the surface. */
  key: string;
  /** Which surface made the prediction, e.g. "topic:caching-strategies". */
  surfaceId: string;
  questionId: string;
  /** Choice id the user committed. */
  chosen: string;
  /** Correct choice id, resolved by the deterministic kernel at reveal time. */
  correct: string;
  committedAt: number;
}

export interface PredictionStats {
  total: number;
  correct: number;
  accuracy: number;
  streak: number;
  bestStreak: number;
}

const STORAGE_KEY = "syscraft.predictions";

interface PredictionState {
  records: Record<string, PredictionRecord>;
  hydrated: boolean;
  hydrate: () => void;
  /** Persist-on-write commit; replays same key overwrites the attempt. */
  commit: (record: Omit<PredictionRecord, "committedAt">) => void;
  /** Last N newest-first across all surfaces, for the progress page. */
  recent: (count: number) => PredictionRecord[];
  stats: (surfaceId?: string) => PredictionStats;
  reset: () => void;
}

function sortedByNewest(records: PredictionRecord[]): PredictionRecord[] {
  return [...records].sort((a, b) => b.committedAt - a.committedAt);
}

export const usePredictionStore = create<PredictionState>((set, get) => ({
  records: {},
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const records = raw ? (JSON.parse(raw) as Record<string, PredictionRecord>) : {};
      set({ hydrated: true, records: records ?? {} });
    } catch {
      set({ hydrated: true, records: {} });
    }
  },

  commit: (record) => {
    const entry: PredictionRecord = { ...record, committedAt: Date.now() };
    const records = { ...get().records, [entry.key]: entry };
    set({ records });
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      } catch {
        /* storage full or blocked: in-memory record still holds the session */
      }
    }
  },

  recent: (count) => sortedByNewest(Object.values(get().records)).slice(0, count),

  stats: (surfaceId) => {
    const all = Object.values(get().records).filter(
      (record) => !surfaceId || record.surfaceId === surfaceId,
    );
    let correct = 0;
    let streak = 0;
    let bestStreak = 0;
    for (const record of sortedByNewest(all)) {
      if (record.chosen === record.correct) {
        correct += 1;
        streak += 1;
        bestStreak = Math.max(bestStreak, streak);
      } else {
        streak = 0;
      }
    }
    const total = all.length;
    return { total, correct, accuracy: total > 0 ? correct / total : 0, streak, bestStreak };
  },

  reset: () => {
    set({ records: {} });
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  },
}));

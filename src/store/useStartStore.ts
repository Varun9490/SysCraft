import { create } from "zustand";

/**
 * Guided-start progress. Tracks which onboarding steps a learner has ticked
 * off, persisted to localStorage under `syscraft.start.steps`.
 *
 * SSR-safe: the module never reads localStorage at import time; hydration is an
 * explicit `hydrate()` call from a client useEffect. Also exposed here is the
 * shared "hide the start banner" preference so the landing page can nudge a
 * first-time visitor without nagging a returning one.
 */

export const START_PROGRESS_KEY = "syscraft.start.steps";
export const START_BANNER_KEY = "syscraft.start.banner";

function readCompleted(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(START_PROGRESS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

function persistCompleted(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(START_PROGRESS_KEY, JSON.stringify(ids));
  } catch {
    /* private mode — progress simply will not survive a reload */
  }
}

function readBannerHidden(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(START_BANNER_KEY) === "hidden";
  } catch {
    return false;
  }
}

interface StartState {
  completed: string[];
  bannerHidden: boolean;
  hydrated: boolean;
  toggle: (id: string) => void;
  markDone: (id: string) => void;
  reset: () => void;
  hideBanner: () => void;
  hydrate: () => void;
}

export const useStartStore = create<StartState>()((set, get) => ({
  completed: [],
  bannerHidden: false,
  hydrated: false,

  toggle: (id) => {
    const { completed } = get();
    const next = completed.includes(id) ? completed.filter((x) => x !== id) : [...completed, id];
    set({ completed: next });
    persistCompleted(next);
  },

  markDone: (id) => {
    const { completed } = get();
    if (completed.includes(id)) return;
    const next = [...completed, id];
    set({ completed: next });
    persistCompleted(next);
  },

  reset: () => {
    set({ completed: [] });
    persistCompleted([]);
  },

  hideBanner: () => {
    set({ bannerHidden: true });
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(START_BANNER_KEY, "hidden");
    } catch {
      /* ignore */
    }
  },

  hydrate: () => {
    if (get().hydrated) return;
    set({ completed: readCompleted(), bannerHidden: readBannerHidden(), hydrated: true });
  },
}));

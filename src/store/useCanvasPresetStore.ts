import { create } from "zustand";
import { getCanvasPrefs, useCanvasPrefsStore, type CanvasPrefs } from "./useCanvasPrefsStore";

/**
 * Named canvas presets — a learner can snapshot the current render preferences
 * (particles, grid, snapping, routing, animations, accent theme) under a name
 * and re-apply them later. Persisted to localStorage `syscraft.canvas.presets`.
 *
 * SSR-safe: nothing touches localStorage until an explicit `hydrate()`.
 */

export const CANVAS_PRESETS_KEY = "syscraft.canvas.presets";
const PRESET_CAP = 24;

export interface CanvasPreset {
  id: string;
  name: string;
  prefs: CanvasPrefs;
}

function readPresets(): CanvasPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CANVAS_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is CanvasPreset =>
        !!entry && typeof entry === "object" && typeof (entry as CanvasPreset).id === "string" && typeof (entry as CanvasPreset).name === "string",
      )
      .slice(0, PRESET_CAP);
  } catch {
    return [];
  }
}

function persistPresets(list: CanvasPreset[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CANVAS_PRESETS_KEY, JSON.stringify(list));
  } catch {
    /* private mode — presets simply will not survive a reload */
  }
}

interface PresetState {
  presets: CanvasPreset[];
  hydrated: boolean;
  hydrate: () => void;
  save: (name: string) => void;
  apply: (id: string) => void;
  remove: (id: string) => void;
}

export const useCanvasPresetStore = create<PresetState>()((set, get) => ({
  presets: [],
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    set({ presets: readPresets(), hydrated: true });
  },

  save: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const preset: CanvasPreset = {
      id: `preset_${Date.now().toString(36)}`,
      name: trimmed.slice(0, 40),
      prefs: getCanvasPrefs(),
    };
    const next = [preset, ...get().presets.filter((p) => p.name !== trimmed)].slice(0, PRESET_CAP);
    set({ presets: next });
    persistPresets(next);
  },

  apply: (id) => {
    const preset = get().presets.find((p) => p.id === id);
    if (!preset) return;
    useCanvasPrefsStore.getState().applyPrefs(preset.prefs);
  },

  remove: (id) => {
    const next = get().presets.filter((p) => p.id !== id);
    set({ presets: next });
    persistPresets(next);
  },
}));

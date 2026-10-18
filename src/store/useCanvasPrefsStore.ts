import { create } from "zustand";

/**
 * Canvas preferences — render-level knobs a learner can tune without touching
 * the simulation. Persisted to localStorage under `syscraft.canvas.prefs`.
 *
 * SSR-safe: the module never reads localStorage at import time; hydration is
 * an explicit `hydratePrefs()` call from a client useEffect.
 */

export type GridStyle = "dots" | "lines" | "cross";
export type EdgeRouting = "smoothstep" | "bezier" | "straight";
export type AccentThemeId = "brass" | "copper" | "sage" | "slate" | "plum" | "teal";

/**
 * Curated accent themes. Every entry is deliberately desaturated so it stays
 * inside the warm-charcoal design language — no saturated neon, no hue that
 * fights the status colours. `hex` is only used for the picker swatch.
 */
export const ACCENT_THEMES: Record<
  AccentThemeId,
  { label: string; accent: string; accentBright: string; accentDeep: string; hex: string }
> = {
  brass: { label: "Brass", accent: "205 168 106", accentBright: "219 187 134", accentDeep: "154 118 66", hex: "#CDA86A" },
  copper: { label: "Copper", accent: "198 132 96", accentBright: "216 158 122", accentDeep: "150 92 60", hex: "#C68460" },
  sage: { label: "Sage", accent: "148 170 122", accentBright: "174 192 152", accentDeep: "104 126 84", hex: "#94AA7A" },
  slate: { label: "Slate", accent: "132 160 178", accentBright: "158 184 200", accentDeep: "92 118 136", hex: "#84A0B2" },
  plum: { label: "Plum", accent: "172 140 168", accentBright: "196 168 192", accentDeep: "128 100 126", hex: "#AC8CA8" },
  teal: { label: "Teal", accent: "116 168 160", accentBright: "146 192 184", accentDeep: "80 128 122", hex: "#74A8A0" },
};

export const ACCENT_THEME_IDS: AccentThemeId[] = ["brass", "copper", "sage", "slate", "plum", "teal"];

/** Applies a theme's accent triple to the document root CSS variables. */
export function applyAccentTheme(id: AccentThemeId): void {
  if (typeof document === "undefined") return;
  const theme = ACCENT_THEMES[id] ?? ACCENT_THEMES.brass;
  const root = document.documentElement;
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-bright", theme.accentBright);
  root.style.setProperty("--accent-deep", theme.accentDeep);
}

export interface CanvasPrefs {
  /** Master switch for the 60fps packet overlay. */
  showParticles: boolean;
  /** Particle count multiplier (0.25x – 2x). */
  particleDensity: number;
  showMinimap: boolean;
  showGrid: boolean;
  gridStyle: GridStyle;
  snapToGrid: boolean;
  /** Grid spacing in px used for snapping + grid size. */
  snapGridSize: number;
  /** Routing style applied to every edge (existing + future). */
  edgeStyle: EdgeRouting;
  /** When off, CSS animations (dash flow, node enter, pulses) are disabled. */
  animations: boolean;
  /** Accent theme applied to the whole app. */
  theme: AccentThemeId;
}

export const DEFAULT_CANVAS_PREFS: CanvasPrefs = {
  showParticles: true,
  particleDensity: 1,
  showMinimap: true,
  showGrid: true,
  gridStyle: "dots",
  snapToGrid: false,
  snapGridSize: 16,
  edgeStyle: "smoothstep",
  animations: true,
  theme: "brass",
};

export const CANVAS_PREFS_KEY = "syscraft.canvas.prefs";

const GRID_STYLES: readonly GridStyle[] = ["dots", "lines", "cross"];
const EDGE_ROUTINGS: readonly EdgeRouting[] = ["smoothstep", "bezier", "straight"];
const SNAP_SIZES: readonly number[] = [8, 16, 24, 32];

/** Defensive parse: only accept values we know, fall back per-field. */
export function sanitizePrefs(raw: unknown): CanvasPrefs {
  const prefs: CanvasPrefs = { ...DEFAULT_CANVAS_PREFS };
  if (!raw || typeof raw !== "object") return prefs;
  const input = raw as Record<string, unknown>;

  if (typeof input.showParticles === "boolean") prefs.showParticles = input.showParticles;
  if (typeof input.showMinimap === "boolean") prefs.showMinimap = input.showMinimap;
  if (typeof input.showGrid === "boolean") prefs.showGrid = input.showGrid;
  if (typeof input.snapToGrid === "boolean") prefs.snapToGrid = input.snapToGrid;
  if (typeof input.animations === "boolean") prefs.animations = input.animations;
  if (typeof input.particleDensity === "number" && Number.isFinite(input.particleDensity)) {
    prefs.particleDensity = Math.min(2, Math.max(0.25, input.particleDensity));
  }
  if (typeof input.snapGridSize === "number" && SNAP_SIZES.includes(input.snapGridSize)) {
    prefs.snapGridSize = input.snapGridSize;
  }
  if (typeof input.gridStyle === "string" && (GRID_STYLES as readonly string[]).includes(input.gridStyle)) {
    prefs.gridStyle = input.gridStyle as GridStyle;
  }
  if (typeof input.edgeStyle === "string" && (EDGE_ROUTINGS as readonly string[]).includes(input.edgeStyle)) {
    prefs.edgeStyle = input.edgeStyle as EdgeRouting;
  }
  if (typeof input.theme === "string" && (ACCENT_THEME_IDS as readonly string[]).includes(input.theme)) {
    prefs.theme = input.theme as AccentThemeId;
  }
  return prefs;
}

function readStoredPrefs(): CanvasPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CANVAS_PREFS_KEY);
    if (!raw) return null;
    return sanitizePrefs(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function persistPrefs(prefs: CanvasPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CANVAS_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* storage full / private mode — preferences just won't survive reload */
  }
}

interface CanvasPrefsState extends CanvasPrefs {
  hydrated: boolean;
  setPref: <K extends keyof CanvasPrefs>(key: K, value: CanvasPrefs[K]) => void;
  applyPrefs: (prefs: Partial<CanvasPrefs>) => void;
  resetPrefs: () => void;
  hydratePrefs: () => void;
}

function snapshotPrefs(state: CanvasPrefsState): CanvasPrefs {
  return {
    showParticles: state.showParticles,
    particleDensity: state.particleDensity,
    showMinimap: state.showMinimap,
    showGrid: state.showGrid,
    gridStyle: state.gridStyle,
    snapToGrid: state.snapToGrid,
    snapGridSize: state.snapGridSize,
    edgeStyle: state.edgeStyle,
    animations: state.animations,
    theme: state.theme,
  };
}

export const useCanvasPrefsStore = create<CanvasPrefsState>()((set, get) => ({
  ...DEFAULT_CANVAS_PREFS,
  hydrated: false,

  setPref: (key, value) => {
    set({ [key]: value } as unknown as Partial<CanvasPrefsState>);
    persistPrefs(snapshotPrefs(get()));
  },

  applyPrefs: (partial) => {
    set(sanitizePrefs({ ...snapshotPrefs(get()), ...partial }) as Partial<CanvasPrefsState>);
    persistPrefs(snapshotPrefs(get()));
  },

  resetPrefs: () => {
    set({ ...DEFAULT_CANVAS_PREFS });
    persistPrefs(DEFAULT_CANVAS_PREFS);
  },

  hydratePrefs: () => {
    if (get().hydrated) return;
    const stored = readStoredPrefs();
    set({ ...(stored ?? DEFAULT_CANVAS_PREFS), hydrated: true });
  },
}));

/** Non-reactive read for hot loops (60fps particle layer). */
export function getCanvasPrefs(): CanvasPrefs {
  return snapshotPrefs(useCanvasPrefsStore.getState());
}

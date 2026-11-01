import { create } from "zustand";
import {
  BUILTIN_PLUGINS,
  normalizePluginManifest,
  parsePluginManifestJson,
  runDeclarativePluginRules,
  type SysCraftPlugin,
} from "@/data/pluginsCatalog";
import type { DoctorEdgeInput, DoctorFinding, DoctorNodeInput } from "@/engine/designDoctor";

/**
 * Plugin hub state: which packs are enabled for the current canvas plus any
 * user-authored packs. Persisted to localStorage under `syscraft.plugins.v1`.
 *
 * SSR-safe by construction: the module never touches `window` at import time.
 * A client component calls `hydratePlugins()` from a `useEffect`, after which
 * every mutation writes the enabled set + custom manifests back.
 */

export const PLUGIN_STORAGE_KEY = "syscraft.plugins.v1";

/** Packs that ship switched on — the four core audit packs. */
export const DEFAULT_ENABLED_PLUGIN_IDS: string[] = BUILTIN_PLUGINS.filter(
  (plugin) => plugin.installedByDefault,
).map((plugin) => plugin.id);

export interface PersistedPluginState {
  enabledPluginIds: string[];
  customPlugins: SysCraftPlugin[];
}

interface PluginState extends PersistedPluginState {
  /** True once the persisted selection has been restored. */
  hydrated: boolean;
  hydratePlugins: () => void;
  togglePlugin: (id: string) => void;
  addCustomPlugin: (plugin: SysCraftPlugin) => void;
  removeCustomPlugin: (id: string) => void;
  importPluginJson: (jsonText: string) => { ok: boolean; error?: string };
  getActivePlugins: () => SysCraftPlugin[];
  evaluateActivePlugins: (nodes: DoctorNodeInput[], edges: DoctorEdgeInput[]) => DoctorFinding[];
}

function sanitizeCustomPlugins(raw: unknown): SysCraftPlugin[] {
  if (!Array.isArray(raw)) return [];
  const builtinIds = new Set(BUILTIN_PLUGINS.map((plugin) => plugin.id));
  const out: SysCraftPlugin[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const result = normalizePluginManifest(entry);
    if (!result.ok) continue;
    const plugin = result.plugin;
    if (builtinIds.has(plugin.id) || seen.has(plugin.id)) continue;
    seen.add(plugin.id);
    out.push(plugin);
  }
  return out;
}

function sanitizeEnabledIds(raw: unknown, customPlugins: SysCraftPlugin[]): string[] {
  const known = new Set<string>([
    ...BUILTIN_PLUGINS.map((plugin) => plugin.id),
    ...customPlugins.map((plugin) => plugin.id),
  ]);
  if (!Array.isArray(raw)) return [...DEFAULT_ENABLED_PLUGIN_IDS];
  const enabled = raw.filter(
    (entry): entry is string => typeof entry === "string" && known.has(entry),
  );
  return [...new Set(enabled)];
}

function readStoredPlugins(): PersistedPluginState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PLUGIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== "object") return null;
    const customPlugins = sanitizeCustomPlugins(parsed.customPlugins);
    return {
      customPlugins,
      enabledPluginIds: sanitizeEnabledIds(parsed.enabledPluginIds, customPlugins),
    };
  } catch {
    return null;
  }
}

function persistPlugins(state: PersistedPluginState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PLUGIN_STORAGE_KEY,
      JSON.stringify({
        enabledPluginIds: state.enabledPluginIds,
        customPlugins: state.customPlugins,
      }),
    );
  } catch {
    /* storage full / private mode — selection just won't survive reload */
  }
}

function snapshot(state: PluginState): PersistedPluginState {
  return { enabledPluginIds: state.enabledPluginIds, customPlugins: state.customPlugins };
}

export const usePluginStore = create<PluginState>()((set, get) => ({
  enabledPluginIds: [...DEFAULT_ENABLED_PLUGIN_IDS],
  customPlugins: [],
  hydrated: false,

  hydratePlugins: () => {
    if (get().hydrated) return;
    const stored = readStoredPlugins();
    if (stored) set({ ...stored, hydrated: true });
    else set({ hydrated: true });
  },

  togglePlugin: (id) => {
    const known = new Set<string>([
      ...BUILTIN_PLUGINS.map((plugin) => plugin.id),
      ...get().customPlugins.map((plugin) => plugin.id),
    ]);
    if (!known.has(id)) return;
    const enabled = get().enabledPluginIds;
    const next = enabled.includes(id)
      ? enabled.filter((entry) => entry !== id)
      : [...enabled, id];
    set({ enabledPluginIds: next });
    persistPlugins(snapshot(get()));
  },

  addCustomPlugin: (plugin) => {
    const current = get().customPlugins;
    const exists = current.some((entry) => entry.id === plugin.id);
    const customPlugins = exists
      ? current.map((entry) => (entry.id === plugin.id ? plugin : entry))
      : [...current, plugin];
    const enabledPluginIds = get().enabledPluginIds.includes(plugin.id)
      ? get().enabledPluginIds
      : [...get().enabledPluginIds, plugin.id];
    set({ customPlugins, enabledPluginIds });
    persistPlugins(snapshot(get()));
  },

  removeCustomPlugin: (id) => {
    const customPlugins = get().customPlugins.filter((plugin) => plugin.id !== id);
    const enabledPluginIds = get().enabledPluginIds.filter((entry) => entry !== id);
    set({ customPlugins, enabledPluginIds });
    persistPlugins(snapshot(get()));
  },

  importPluginJson: (jsonText) => {
    const result = parsePluginManifestJson(jsonText);
    if (!result.ok) return { ok: false, error: result.error };
    if (BUILTIN_PLUGINS.some((plugin) => plugin.id === result.plugin.id)) {
      return { ok: false, error: `A built-in plugin already uses the id "${result.plugin.id}".` };
    }
    get().addCustomPlugin(result.plugin);
    return { ok: true };
  },

  getActivePlugins: () => {
    const enabled = new Set(get().enabledPluginIds);
    return [...BUILTIN_PLUGINS, ...get().customPlugins].filter((plugin) => enabled.has(plugin.id));
  },

  evaluateActivePlugins: (nodes, edges) =>
    runDeclarativePluginRules(get().getActivePlugins(), nodes, edges),
}));

import type { Edge, Node } from "@xyflow/react";
import type { ResourceNodeData, ResourceOverrides } from "@/types/resource";
import type { StateStorage } from "zustand/middleware";
import type {
  CanvasEdgeData,
  CanvasEdgeRouting,
  EdgeCondition,
  EdgeLineStyle,
  EdgeMarker,
} from "./useCanvasStore";

/**
 * Auto-save seam for the canvas topology (zustand persist middleware).
 *
 * Shape validation lives in pure functions here so module evaluation never
 * touches browser APIs: sanitizers accept `unknown` and return the narrow
 * persisted shape, the store wires them into `persist(...)` with
 * `skipHydration: true`, and the workspace shell calls `rehydrate()` after
 * mount. Fresh schemas bump `CANVAS_PERSIST_VERSION`; a `migrate` that reads
 * a higher version bails so stale writes can never poison new state.
 */

export const CANVAS_STORAGE_KEY = "syscraft-canvas-v1";
export const CANVAS_PERSIST_VERSION = 1;
export const MAX_PERSISTED_NODES = 200;
export const MAX_PERSISTED_EDGES = 400;

export type PersistedCanvasNode = Node<ResourceNodeData>;
export type PersistedCanvasEdge = Edge<CanvasEdgeData>;

export interface PersistedCanvasState {
  nodes: PersistedCanvasNode[];
  edges: PersistedCanvasEdge[];
  sceneName: string;
  edgeStyle: CanvasEdgeRouting;
  semanticZoomLevel: 1 | 2 | 3;
}

const EDGE_CONDITIONS = new Set<EdgeCondition>([
  "none",
  "cache_hit",
  "cache_miss",
  "read",
  "write",
  "rate_limited",
  "error",
  "async",
]);

const LINE_STYLES = new Set<EdgeLineStyle>(["solid", "dashed", "dotted"]);

const EDGE_MARKERS = new Set<EdgeMarker>(["none", "arrow", "arrowClosed"]);

const EDGE_ROUTINGS = new Set<CanvasEdgeRouting>(["smoothstep", "bezier", "straight"]);

function finiteNumber(value: unknown, min: number, max: number): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : undefined;
}

function boundedString(value: unknown, max: number, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : fallback.slice(0, max);
}

/** Narrow a raw node object into the persisted shape; null = drop it. */
export function sanitizePersistedNode(raw: unknown): PersistedCanvasNode | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;

  const id = typeof rec.id === "string" && rec.id.length > 0 ? rec.id.slice(0, 64) : null;
  if (!id) return null;

  const position = rec.position as Record<string, unknown> | undefined;
  const x = finiteNumber(position?.x, -200_000, 200_000);
  const y = finiteNumber(position?.y, -200_000, 200_000);
  if (x === undefined || y === undefined) return null;

  const dataRaw = (rec.data ?? {}) as Record<string, unknown>;
  const resourceId =
    typeof dataRaw.resourceId === "string" && dataRaw.resourceId.length > 0
      ? dataRaw.resourceId.slice(0, 128)
      : null;
  if (!resourceId) return null;

  const overridesRaw = (dataRaw.overrides ?? {}) as Record<string, unknown>;
  const overrides: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(overridesRaw)) {
    if (typeof key !== "string" || key.length === 0 || key.length > 40) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === "boolean") overrides[key] = value;
    else if (typeof value === "number" && Number.isFinite(value)) overrides[key] = value;
    else if (typeof value === "string" && value.length <= 200) overrides[key] = value;
  }

  const zoomRaw = dataRaw.semanticZoomLevel;
  const semanticZoomLevel: 1 | 2 | 3 = zoomRaw === 1 || zoomRaw === 3 ? zoomRaw : 2;

  const data: ResourceNodeData = {
    resourceId,
    label: boundedString(dataRaw.label, 80, "Node"),
    overrides: overrides as ResourceOverrides,
    semanticZoomLevel,
  };

  const width = finiteNumber(rec.width, 140, 520);
  const height = finiteNumber(rec.height, 56, 320);
  if (width !== undefined && height !== undefined) {
    data.width = width;
    data.height = height;
    data.manualSize = true;
  }

  const accent = dataRaw.accentColor;
  if (typeof accent === "string" && /^#[0-9a-fA-F]{6}$/.test(accent)) data.accentColor = accent;

  const comment = dataRaw.comment;
  if (typeof comment === "string" && comment.trim().length > 0) data.comment = comment.trim().slice(0, 2000);

  return { id, position: { x, y }, data, selected: false };
}

/** Narrow a raw edge object; returns null for self-loops, or malformed pairs. */
export function sanitizePersistedEdge(raw: unknown, nodeIds: Set<string>): PersistedCanvasEdge | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;

  const id = typeof rec.id === "string" && rec.id.length > 0 ? rec.id.slice(0, 96) : null;
  const source = typeof rec.source === "string" && rec.source.length > 0 ? rec.source.slice(0, 64) : null;
  const target = typeof rec.target === "string" && rec.target.length > 0 ? rec.target.slice(0, 64) : null;
  if (!id || !source || !target || source === target) return null;
  if (!nodeIds.has(source) || !nodeIds.has(target)) return null;

  const dataRaw = (rec.data ?? {}) as Record<string, unknown>;
  const data: CanvasEdgeData = {};

  const label = dataRaw.label;
  if (typeof label === "string" && label.trim().length > 0) data.label = label.trim().slice(0, 120);

  const condition = dataRaw.condition;
  if (typeof condition === "string" && EDGE_CONDITIONS.has(condition as EdgeCondition)) {
    const safe = condition as EdgeCondition;
    if (safe !== "none") data.condition = safe;
  }

  const color = dataRaw.color;
  if (typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)) data.color = color;

  const lineStyle = dataRaw.lineStyle;
  if (typeof lineStyle === "string" && LINE_STYLES.has(lineStyle as EdgeLineStyle)) {
    data.lineStyle = lineStyle as EdgeLineStyle;
  }

  const width = finiteNumber(dataRaw.width, 0.75, 5);
  if (width !== undefined && width !== 1.6) data.width = width;

  const marker = dataRaw.marker;
  if (typeof marker === "string" && EDGE_MARKERS.has(marker as EdgeMarker)) {
    const safe = marker as EdgeMarker;
    if (safe !== "none") data.marker = safe;
  }

  return { id, source, target, data, selected: false };
}

/** Sanitize a whole persisted draft; undefined = unusable, fall back to empty. */
export function sanitizePersistedCanvas(raw: unknown): PersistedCanvasState | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const rec = raw as Record<string, unknown>;
  if (!Array.isArray(rec.nodes) || !Array.isArray(rec.edges)) return undefined;

  const nodes = rec.nodes
    .slice(0, MAX_PERSISTED_NODES)
    .map(sanitizePersistedNode)
    .filter((node): node is PersistedCanvasNode => node !== null);
  if (nodes.length === 0 && rec.nodes.length > 0) return undefined;

  const nodeIds = new Set(nodes.map((node) => node.id));
  const seenEdgeIds = new Set<string>();
  const edges = rec.edges
    .slice(0, MAX_PERSISTED_EDGES)
    .map((edge) => sanitizePersistedEdge(edge, nodeIds))
    .filter((edge): edge is PersistedCanvasEdge => {
      if (edge === null) return false;
      // Drop ties from patched payloads: first writer wins, dupes disappear.
      const dupes = seenEdgeIds.has(`${edge.source}>${edge.target}`) || seenEdgeIds.has(edge.id);
      seenEdgeIds.add(edge.id);
      seenEdgeIds.add(`${edge.source}>${edge.target}`);
      return !dupes;
    });

  return {
    nodes,
    edges,
    sceneName: rec.sceneName === undefined ? "Untitled system" : boundedString(rec.sceneName, 80, "Untitled system"),
    edgeStyle:
      typeof rec.edgeStyle === "string" && EDGE_ROUTINGS.has(rec.edgeStyle as CanvasEdgeRouting)
        ? (rec.edgeStyle as CanvasEdgeRouting)
        : "smoothstep",
    semanticZoomLevel: rec.semanticZoomLevel === 1 || rec.semanticZoomLevel === 3 ? rec.semanticZoomLevel : 2,
  };
}

/** Versioned migration for the persist middleware. Version > current → fresh. */
export function migratePersistedCanvas(persisted: unknown, version: number): PersistedCanvasState | undefined {
  if (version > CANVAS_PERSIST_VERSION) return undefined;
  try {
    return sanitizePersistedCanvas(persisted);
  } catch {
    return undefined;
  }
}

/** Sync-compatible adapter constrained to zustand's StateStorage<void>. */
type CanvasStateStorage = StateStorage<void>;

let storageRef: CanvasStateStorage | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let pendingWrite: { name: string; value: string } | null = null;
const WRITE_DEBOUNCE_MS = 500;

/**
 * localStorage adapter with trailing-debounced writes: topology changes fire
 * at 60fps during drags and the sim runs at 10–20Hz, so full JSON serializes
 * once per idle window instead of every tick. `flushPendingCanvasWrite` must
 * run on pagehide/beforeunload so a closed tab never loses trailing edits.
 */
export function createDebouncedCanvasStorage(getBase: () => CanvasStateStorage | undefined): CanvasStateStorage {
  const resolve = () => {
    try {
      const base = getBase();
      if (base) storageRef = base;
      return base;
    } catch {
      return undefined;
    }
  };
  return {
    getItem(name) {
      const base = resolve();
      try {
        return base?.getItem(name) ?? null;
      } catch {
        return null;
      }
    },
    setItem(name, value) {
      // Bind the underlying storage now so the trailing-flush (which runs
      // outside the getter's own call stack) has a target to write to.
      resolve();
      pendingWrite = { name, value };
      if (flushTimer !== null) clearTimeout(flushTimer);
      flushTimer = setTimeout(() => {
        flushTimer = null;
        flushPendingCanvasWrite();
      }, WRITE_DEBOUNCE_MS);
    },
    removeItem(name) {
      pendingWrite = null;
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      try {
        resolve()?.removeItem(name);
      } catch {
        /* storage unavailable — nothing to clear */
      }
    },
  };
}

/** Write the pending snapshot now (pagehide / beforeunload / test seam). */
export function flushPendingCanvasWrite(): void {
  const write = pendingWrite;
  pendingWrite = null;
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!write || !storageRef) return;
  try {
    storageRef.setItem(write.name, write.value);
  } catch {
    /* quota or private mode: dropping the write is safer than crashing */
  }
}

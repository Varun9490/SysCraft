import type { Edge, Node } from "@xyflow/react";
import { decompressFromEncodedURIComponent } from "lz-string";
import type { ResourceNodeData, ResourceOverrides } from "@/types/resource";
import type { StateStorage } from "zustand/middleware";
import { SYSCRAFT_CANVAS_STORAGE_KEY } from "./backup/schema";
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

export const CANVAS_STORAGE_KEY = SYSCRAFT_CANVAS_STORAGE_KEY;
export const CANVAS_PERSIST_VERSION = 1;
export const MAX_PERSISTED_NODES = 200;
export const MAX_PERSISTED_EDGES = 400;
export const MAX_SCENE_ENCODED_CHARS = 256_000;
export const MAX_SCENE_DECODED_CHARS = 1_000_000;

const MAX_NODE_ID_CHARS = 64;
const MAX_EDGE_ID_CHARS = 96;
const MAX_RESOURCE_ID_CHARS = 128;
const MAX_OVERRIDE_ENTRIES = 32;
const MAX_OVERRIDE_KEY_CHARS = 40;
const MAX_OVERRIDE_STRING_CHARS = 200;

/**
 * Canvas scopes keep independent autosaves. The freeform workspace uses
 * "main"; each lab uses "lab:<id>". Without this, opening a lab replaced the
 * learner's saved architecture with the lab's empty starter canvas.
 */
let activeCanvasScope = "main";

export function canvasStorageKeyForScope(scope: string): string {
  return scope === "main" ? CANVAS_STORAGE_KEY : `${CANVAS_STORAGE_KEY}:${scope}`;
}

export function getCanvasScope(): string {
  return activeCanvasScope;
}

/** Switch autosave targets, flushing trailing edits to the old scope first. */
export function setCanvasScope(scope: string): void {
  if (scope === activeCanvasScope) return;
  flushPendingCanvasWrite();
  activeCanvasScope = scope;
}

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

const UNSAFE_OVERRIDE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, min: number, max: number): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : undefined;
}

function boundedString(value: unknown, max: number, fallback: string): string {
  if (typeof value !== "string" || value.trim().length === 0) return fallback.slice(0, max);
  return value.slice(0, max);
}

function boundedIdentifier(value: unknown, max: number): string | null {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > max) return null;
  return value;
}

/** Narrow a raw node object into the persisted shape; null = drop it. */
export function sanitizePersistedNode(raw: unknown): PersistedCanvasNode | null {
  if (!isRecord(raw)) return null;
  const rec = raw;

  const id = boundedIdentifier(rec.id, MAX_NODE_ID_CHARS);
  if (!id) return null;

  const position = isRecord(rec.position) ? rec.position : undefined;
  const x = finiteNumber(position?.x, -200_000, 200_000);
  const y = finiteNumber(position?.y, -200_000, 200_000);
  if (x === undefined || y === undefined) return null;

  // Shared scenes use flat node fields; persisted React Flow nodes and direct
  // topology replacements use `data`. Both enter the store through this seam.
  const dataRaw = isRecord(rec.data) ? rec.data : rec;
  const resourceId = boundedIdentifier(dataRaw.resourceId, MAX_RESOURCE_ID_CHARS);
  if (!resourceId) return null;

  const overridesRaw = isRecord(dataRaw.overrides) ? dataRaw.overrides : {};
  const overrides: Record<string, string | number | boolean> = {};
  let examinedOverrides = 0;
  for (const key in overridesRaw) {
    if (examinedOverrides >= MAX_OVERRIDE_ENTRIES) break;
    if (!Object.prototype.hasOwnProperty.call(overridesRaw, key)) continue;
    examinedOverrides += 1;
    if (key.length === 0 || key.length > MAX_OVERRIDE_KEY_CHARS || UNSAFE_OVERRIDE_KEYS.has(key)) continue;
    const value = overridesRaw[key];
    if (typeof value === "boolean") {
      overrides[key] = value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      overrides[key] = value;
    } else if (typeof value === "string") {
      const safe = value.slice(0, MAX_OVERRIDE_STRING_CHARS);
      if (safe.length > 0) overrides[key] = safe;
    } else {
      continue;
    }
  }

  const zoomRaw = dataRaw.semanticZoomLevel;
  const semanticZoomLevel: 1 | 2 | 3 = zoomRaw === 1 || zoomRaw === 3 ? zoomRaw : 2;

  const data: ResourceNodeData = {
    resourceId,
    label: boundedString(dataRaw.label, 80, "Node"),
    overrides: overrides as ResourceOverrides,
    semanticZoomLevel,
  };

  const width = finiteNumber(dataRaw.width ?? rec.width, 140, 520);
  const height = finiteNumber(dataRaw.height ?? rec.height, 56, 320);
  if (width !== undefined && height !== undefined) {
    data.width = width;
    data.height = height;
    data.manualSize = true;
  }

  const accent = dataRaw.accentColor;
  if (typeof accent === "string" && /^#[0-9a-fA-F]{6}$/.test(accent)) data.accentColor = accent;

  const comment = boundedString(dataRaw.comment, 2000, "");
  if (comment.length > 0) data.comment = comment;

  // Persist the React Flow node type: without it the restored node falls back
  // to the library's default renderer and loses the resource card UI.
  return { id, type: "resource", position: { x, y }, data, selected: false };
}

/** Narrow a raw edge object; returns null for self-loops, or malformed pairs. */
export function sanitizePersistedEdge(raw: unknown, nodeIds: Set<string>): PersistedCanvasEdge | null {
  if (!isRecord(raw)) return null;
  const rec = raw;

  const id = boundedIdentifier(rec.id, MAX_EDGE_ID_CHARS);
  const source = boundedIdentifier(rec.source, MAX_NODE_ID_CHARS);
  const target = boundedIdentifier(rec.target, MAX_NODE_ID_CHARS);
  if (!id || !source || !target || source === target) return null;
  if (!nodeIds.has(source) || !nodeIds.has(target)) return null;

  const dataRaw = isRecord(rec.data) ? rec.data : rec;
  const data: CanvasEdgeData = {};

  const label = boundedString(dataRaw.label, 120, "");
  if (label.length > 0) data.label = label;

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
  if (width !== undefined) data.width = width;

  const marker = dataRaw.marker;
  if (typeof marker === "string" && EDGE_MARKERS.has(marker as EdgeMarker)) {
    data.marker = marker as EdgeMarker;
  }

  return { id, source, target, data, selected: false };
}

/** Sanitize a whole persisted draft; undefined = unusable, fall back to empty. */
export function sanitizePersistedCanvas(raw: unknown): PersistedCanvasState | undefined {
  try {
    if (!isRecord(raw) || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) return undefined;

    const nodes: PersistedCanvasNode[] = [];
    const nodeIds = new Set<string>();
    for (const rawNode of raw.nodes.slice(0, MAX_PERSISTED_NODES)) {
      const node = sanitizePersistedNode(rawNode);
      if (!node || nodeIds.has(node.id)) continue;
      nodeIds.add(node.id);
      nodes.push(node);
    }
    if (nodes.length === 0 && raw.nodes.length > 0) return undefined;

    const edges: PersistedCanvasEdge[] = [];
    const seenEdgeIds = new Set<string>();
    const seenEdgePairs = new Set<string>();
    for (const rawEdge of raw.edges.slice(0, MAX_PERSISTED_EDGES)) {
      const edge = sanitizePersistedEdge(rawEdge, nodeIds);
      if (!edge) continue;
      const pair = JSON.stringify([edge.source, edge.target]);
      // First writer wins for both duplicate ids and duplicate directed pairs.
      if (seenEdgeIds.has(edge.id) || seenEdgePairs.has(pair)) continue;
      seenEdgeIds.add(edge.id);
      seenEdgePairs.add(pair);
      edges.push(edge);
    }

    return {
      nodes,
      edges,
      sceneName: raw.sceneName === undefined ? "Untitled system" : boundedString(raw.sceneName, 80, "Untitled system"),
      edgeStyle:
        typeof raw.edgeStyle === "string" && EDGE_ROUTINGS.has(raw.edgeStyle as CanvasEdgeRouting)
          ? (raw.edgeStyle as CanvasEdgeRouting)
          : "smoothstep",
      semanticZoomLevel: raw.semanticZoomLevel === 1 || raw.semanticZoomLevel === 3 ? raw.semanticZoomLevel : 2,
    };
  } catch {
    return undefined;
  }
}

/**
 * Decode raw/compressed JSON and run every external scene through the same
 * bounded topology sanitizer used by persistence and direct replacements.
 */
export function decodeAndSanitizeScene(
  serialized: unknown,
  expectedVersion: number,
): PersistedCanvasState | undefined {
  try {
    if (typeof serialized !== "string" || serialized.length === 0 || serialized.length > MAX_SCENE_ENCODED_CHARS) {
      return undefined;
    }
    const trimmed = serialized.trim();
    if (trimmed.length === 0) return undefined;

    let json: string | null = null;
    if (trimmed.startsWith("{")) {
      json = trimmed;
    } else {
      json = decompressFromEncodedURIComponent(trimmed);
    }
    if (!json || json.length > MAX_SCENE_DECODED_CHARS) return undefined;

    const parsed: unknown = JSON.parse(json);
    if (!isRecord(parsed)) return undefined;
    const candidate = parsed.format === "syscraft.design/1" && "scene" in parsed ? parsed.scene : parsed;
    if (!isRecord(candidate) || candidate.version !== expectedVersion) return undefined;
    if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) return undefined;
    return sanitizePersistedCanvas(candidate);
  } catch {
    return undefined;
  }
}

/** Versioned migration for the persist middleware. Version > current → fresh. */
export function migratePersistedCanvas(persisted: unknown, version: number): PersistedCanvasState | undefined {
  if (version > CANVAS_PERSIST_VERSION) return undefined;
  return sanitizePersistedCanvas(persisted);
}

/** Read a saved canvas for a scope without going through the store. */
export function readPersistedCanvas(scope: string): PersistedCanvasState | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(canvasStorageKeyForScope(scope));
    if (!raw) return undefined;
    if (raw.length > MAX_SCENE_DECODED_CHARS) return undefined;
    const parsed = JSON.parse(raw) as { state?: unknown; version?: unknown };
    const version = typeof parsed?.version === "number" ? parsed.version : CANVAS_PERSIST_VERSION;
    return migratePersistedCanvas(parsed?.state ?? parsed, version);
  } catch {
    return undefined;
  }
}

/** Sync-compatible adapter constrained to zustand's StateStorage<void>. */
type CanvasStateStorage = StateStorage<void>;

let storageRef: CanvasStateStorage | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let pendingWrite: { name: string; value: string } | null = null;
let lifecycleFlushInstalled = false;
const WRITE_DEBOUNCE_MS = 500;

/**
 * Install the autosave flush once for every canvas host, including labs that
 * do not mount the freeform workspace shell. Browser access stays inside this
 * boot-time call so importing the store remains SSR-safe.
 */
export function installCanvasPersistenceLifecycleFlush(): () => void {
  if (typeof window === "undefined" || lifecycleFlushInstalled) return () => {};
  const flush = () => flushPendingCanvasWrite();
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
  lifecycleFlushInstalled = true;
  return () => {
    window.removeEventListener("pagehide", flush);
    window.removeEventListener("beforeunload", flush);
    lifecycleFlushInstalled = false;
  };
}

/**
 * localStorage adapter with trailing-debounced writes: topology changes fire
 * at 60fps during drags and the sim runs at 10–20Hz, so full JSON serializes
 * once per idle window instead of every tick. `flushPendingCanvasWrite` must
 * run on pagehide/beforeunload so a closed tab never loses trailing edits.
 */
export function createDebouncedCanvasStorage(getBase: () => CanvasStateStorage | undefined): CanvasStateStorage {
  installCanvasPersistenceLifecycleFlush();
  const resolve = () => {
    try {
      const base = getBase();
      if (base) storageRef = base;
      return base;
    } catch {
      return undefined;
    }
  };
  const scopedName = (name: string) =>
    name === CANVAS_STORAGE_KEY ? canvasStorageKeyForScope(activeCanvasScope) : name;
  return {
    getItem(name) {
      const base = resolve();
      try {
        return base?.getItem(scopedName(name)) ?? null;
      } catch {
        return null;
      }
    },
    setItem(name, value) {
      // Bind the underlying storage now so the trailing-flush (which runs
      // outside the getter's own call stack) has a target to write to.
      resolve();
      pendingWrite = { name: scopedName(name), value };
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
        resolve()?.removeItem(scopedName(name));
      } catch {
        /* storage unavailable — nothing to clear */
      }
    },
  };
}

/** Cancel a queued autosave without writing it (used by backup import/wipe). */
export function discardPendingCanvasWrite(): void {
  pendingWrite = null;
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
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

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { temporal } from "zundo";
import type { CSSProperties } from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
  type Edge,
  type EdgeMarkerType,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { SEED_RESOURCES } from "@/data/seedResources";
import type { Blueprint } from "@/data/blueprints";
import { resolveInstanceSizing } from "@/engine/instanceSizing";
import {
  NODE_DEFAULT_WIDTH,
  NODE_MAX_HEIGHT,
  NODE_MAX_WIDTH,
  NODE_MIN_HEIGHT,
  NODE_MIN_WIDTH,
  NODE_TIER_HEIGHTS,
  type ResourceNodeData,
  type ResourceOverrides,
} from "@/types/resource";
import type { GraphNode, GraphTopology } from "@/types/simulation";
import { getCustomResource } from "./customResourceRegistry";
import { loadBlueprint as loadBlueprintRecord } from "./db";
import {
  CANVAS_STORAGE_KEY,
  CANVAS_PERSIST_VERSION,
  createDebouncedCanvasStorage,
  migratePersistedCanvas,
  type PersistedCanvasState,
} from "./canvasPersistence";

/**
 * Structural canvas topology store (Milestone 3).
 *
 * Holds ONLY graph structure — node positions, resource bindings, and
 * config overrides. Live RPS/CPU/P99 telemetry lives in `useSimStore` and is
 * subscribed per-node, so the 50ms simulation tick never churns this array
 * and drag stays at 60fps. Undo/redo via zundo tracks nodes+edges (limit 100).
 */

export const SCENE_VERSION = 1;
export const STARTER_ENTRY_RPS = 500;

export type CanvasEdgeRouting = "smoothstep" | "bezier" | "straight";

/**
 * Logical condition an edge carries for flowchart-style routing. The traffic
 * particle layer reads this to split/pin/drop packets per branch:
 * - cache_hit / cache_miss scale by the source node's hit ratio,
 * - rate_limited / error color and count follow the drop/error rate,
 * - read/write pin the edge to that half of the source's traffic mix,
 * - async renders dashed (queued hops outside the critical path).
 */
export type EdgeCondition =
  | "none"
  | "cache_hit"
  | "cache_miss"
  | "read"
  | "write"
  | "rate_limited"
  | "error"
  | "async";

export const EDGE_CONDITION_LABELS: Record<EdgeCondition, string> = {
  none: "Default flow",
  cache_hit: "Cache hit",
  cache_miss: "Cache miss → origin",
  read: "Reads only",
  write: "Writes only",
  rate_limited: "Rate-limited / dropped",
  error: "Errors / fallback",
  async: "Async / queued",
};

/** Data payload carried by every canvas edge (labels + routing conditions). */
export interface CanvasEdgeData extends Record<string, unknown> {
  /** Free-text label for the link, e.g. "gRPC fanout" or "orders topic". */
  label?: string;
  condition?: EdgeCondition;
  /** Appearance overrides chosen in the connection inspector. */
  color?: string;
  lineStyle?: EdgeLineStyle;
  width?: number;
  marker?: EdgeMarker;
}

export type EdgeLineStyle = "solid" | "dashed" | "dotted";
export type EdgeMarker = "none" | "arrow" | "arrowClosed";

export type CanvasFlowNode = Node<ResourceNodeData, "resource" | "region">;
export type CanvasFlowEdge = Edge<CanvasEdgeData>;

interface SceneNodePayload {
  id: string;
  position: { x: number; y: number };
  resourceId: string;
  label: string;
  overrides: ResourceOverrides;
  width?: number;
  height?: number;
  accentColor?: string;
  comment?: string;
}

interface SceneEdgePayload {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: EdgeCondition;
  color?: string;
  lineStyle?: EdgeLineStyle;
  width?: number;
  marker?: EdgeMarker;
}

interface ScenePayload {
  version: number;
  nodes: SceneNodePayload[];
  edges: SceneEdgePayload[];
}

interface CanvasState {
  nodes: CanvasFlowNode[];
  edges: CanvasFlowEdge[];
  semanticZoomLevel: 1 | 2 | 3;
  /** Routing style used by every edge on this canvas. */
  edgeStyle: CanvasEdgeRouting;
  selectedNodeId: string | null;
  sceneName: string;
  abDiffEnabled: boolean;
  abBaseline: ScenePayload | null;
  /** Bumped whenever a whole scene is swapped in, so the canvas can re-fit. */
  fitViewNonce: number;
  /** Accessible Outline Mode: canvas rendered as a keyboard-editable table. */
  outlineMode: boolean;
  /** Design Doctor static-linter drawer visibility. */
  doctorOpen: boolean;
  /** One-shot request to center the viewport on a node (Doctor / Outline). */
  focusRequest: { nodeId: string; nonce: number } | null;

  onNodesChange: OnNodesChange<CanvasFlowNode>;
  onEdgesChange: OnEdgesChange<CanvasFlowEdge>;
  addNode: (resourceId: string, position: { x: number; y: number }, label?: string) => string;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  updateNodeOverrides: (nodeId: string, partial: Partial<ResourceOverrides>) => void;
  /** User drag-resize: persist width/height on node data (marks manual size). */
  updateNodeSize: (nodeId: string, size: { width: number; height: number }) => void;
  /** Restore the block to tier-driven auto sizing. */
  resetNodeSize: (nodeId: string) => void;
  /** Accent colour override for block chrome (hex), null restores the primitive's colour. */
  setNodeAccent: (nodeId: string, color: string | null) => void;
  renameNode: (nodeId: string, label: string) => void;
  /** Pin a creator comment/annotation onto a block; null removes it. */
  setNodeComment: (nodeId: string, comment: string | null) => void;
  duplicateNode: (nodeId: string) => string | null;
  removeNode: (nodeId: string) => void;
  /** Removes the currently selected node(s)/edge(s). Returns how many items were removed. */
  deleteSelection: () => number;
  addEdge: (source: string, target: string) => string | null;
  removeEdge: (edgeId: string) => void;
  /** Edit an edge's label / condition / appearance (Connection inspector). */
  updateEdgeData: (
    edgeId: string,
    partial: {
      label?: string | null;
      condition?: EdgeCondition;
      color?: string | null;
      lineStyle?: EdgeLineStyle | null;
      width?: number | null;
      marker?: EdgeMarker | null;
    },
  ) => void;
  /** Re-route every edge (existing + future) with the chosen style. */
  setEdgeStyle: (style: CanvasEdgeRouting) => void;
  setSemanticZoomLevel: (level: 1 | 2 | 3) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setSceneName: (name: string) => void;
  setOutlineMode: (enabled: boolean) => void;
  setDoctorOpen: (enabled: boolean) => void;
  focusNode: (nodeId: string) => void;
  expandToKubernetes: (nodeId: string) => boolean;
  clearCanvas: () => void;
  loadStarterTemplate: () => void;
  loadBlueprintTemplate: (blueprint: Blueprint) => void;
  replaceTopology: (nodes: CanvasFlowNode[], edges: CanvasFlowEdge[]) => void;
  setAbDiffEnabled: (enabled: boolean) => void;
  captureAbBaseline: () => void;
  toGraphTopology: () => GraphTopology;
  serializeScene: () => string;
  /** Human-readable `.syscraft.json` export (uncompressed, schema-tagged). */
  exportDesignJson: () => string;
  deserializeScene: (hash: string) => boolean;
  loadBlueprintById: (id: string) => Promise<boolean>;
}

const seedDefaultsById = new Map(SEED_RESOURCES.map((r) => [r.id, r.defaults]));
const seedNameById = new Map(SEED_RESOURCES.map((r) => [r.id, r.name]));

function makeNodeId(): string {
  const rand = Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, "0");
  return `n_${Date.now().toString(36)}_${rand}`;
}

function makeEdgeId(source: string, target: string): string {
  return `e_${source}_${target}`;
}

/** Stamp the canvas-wide routing style onto an edge. */
const CONDITION_COLORS: Record<EdgeCondition, string> = {
  none: "#67e8f9",
  cache_hit: "#34d399",
  cache_miss: "#fbbf24",
  read: "#7dd3fc",
  write: "#f472b6",
  rate_limited: "#f87171",
  error: "#fb7185",
  async: "#a78bfa",
};

export function conditionColor(condition: EdgeCondition | undefined): string {
  return CONDITION_COLORS[condition ?? "none"];
}

const DEFAULT_EDGE_WIDTH = 1.6;

const LINE_DASH_SEGMENTS: Record<EdgeLineStyle, string | undefined> = {
  solid: undefined,
  // Segment sums of 11 divide the 22px marching loop, so custom dashes stay
  // seamless while `.sim-running` shifts stroke-dashoffset.
  dashed: "6 5",
  dotted: "2 9",
};

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function clampEdgeWidth(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(5, Math.max(0.75, value)) : DEFAULT_EDGE_WIDTH;
}

/**
 * Native React Flow label chip + per-edge appearance. Exports the pure seam
 * used by unit tests to lock color/weight/dash/marker mapping.
 */
export function decorateEdge(edge: CanvasFlowEdge, style: CanvasEdgeRouting): CanvasFlowEdge {
  const data = (edge.data ?? {}) as CanvasEdgeData;
  const condition = data.condition ?? "none";
  const labelText = (data.label ?? "").trim();
  const conditionText = EDGE_CONDITION_LABELS[condition];
  const rendered =
    labelText && condition !== "none"
      ? `${labelText} · ${conditionText}`
      : labelText || (condition !== "none" ? conditionText : undefined);
  const color = isHexColor(data.color) ? data.color : conditionColor(condition);
  const width = clampEdgeWidth(data.width);
  const dash = data.lineStyle ? LINE_DASH_SEGMENTS[data.lineStyle] : undefined;
  const markerEnd = renderEdgeMarker(data.marker, color);
  const nextLabelStyle = rendered ? { fill: color, fontSize: 10, fontWeight: 600 as const } : undefined;
  const nextLabelBgStyle =
    rendered
      ? {
          fill: "#09090b",
          fillOpacity: 0.92,
          strokeColor: condition === "none" ? "#3f3f46" : color,
          strokeOpacity: 0.9,
          strokeWidth: 1,
        }
      : undefined;
  const nextLabelBgPadding: [number, number] | undefined = rendered ? [6, 3] : undefined;
  const nextLabelBgBorderRadius = rendered ? 6 : undefined;
  return {
    ...edge,
    type: style,
    label: rendered,
    labelStyle: nextLabelStyle,
    labelBgStyle: nextLabelBgStyle,
    labelBgPadding: nextLabelBgPadding,
    labelBgBorderRadius: nextLabelBgBorderRadius,
    style: {
      stroke: color,
      strokeWidth: width,
      ...(dash ? { strokeDasharray: dash } : {}),
      "--edge-width": `${width}px`,
    } as CSSProperties,
    markerEnd,
  };
}

function renderEdgeMarker(kind: EdgeMarker | undefined, color: string): EdgeMarkerType | undefined {
  if (kind === "arrow") {
    return { type: MarkerType.Arrow, color, width: 18, height: 18 };
  }
  if (kind === "arrowClosed") {
    return { type: MarkerType.ArrowClosed, color, width: 16, height: 16 };
  }
  return undefined;
}

function buildFlowNode(resourceId: string, position: { x: number; y: number }, label: string): CanvasFlowNode {
  return {
    id: makeNodeId(),
    type: "resource",
    position,
    data: {
      resourceId,
      label,
      overrides: {},
      semanticZoomLevel: 2,
      width: NODE_DEFAULT_WIDTH,
      height: NODE_TIER_HEIGHTS[2],
      manualSize: false,
    },
  };
}

function payloadFromState(nodes: CanvasFlowNode[], edges: CanvasFlowEdge[]): ScenePayload {
  return {
    version: SCENE_VERSION,
    nodes: nodes.map((node) => ({
      id: node.id,
      position: { x: node.position.x, y: node.position.y },
      resourceId: String(node.data.resourceId ?? "rest_service"),
      label: String(node.data.label ?? "Node"),
      overrides: { ...(node.data.overrides ?? {}) },
      ...(typeof node.data.width === "number" && typeof node.data.height === "number"
        ? { width: node.data.width, height: node.data.height }
        : {}),
      ...(typeof node.data.accentColor === "string" ? { accentColor: node.data.accentColor } : {}),
      ...(typeof node.data.comment === "string" && node.data.comment.length > 0
        ? { comment: node.data.comment }
        : {}),
    })),
    edges: edges.map((edge) => {
      const data = (edge.data ?? {}) as CanvasEdgeData;
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        ...(typeof data.label === "string" && data.label.length > 0 ? { label: data.label } : {}),
        ...(data.condition && data.condition !== "none" ? { condition: data.condition } : {}),
        ...(isHexColor(data.color) ? { color: data.color } : {}),
        ...(data.lineStyle ? { lineStyle: data.lineStyle } : {}),
        ...(data.width ? { width: data.width } : {}),
        ...(data.marker ? { marker: data.marker } : {}),
      };
    }),
  };
}

function topologyFromPayload(payload: ScenePayload): { nodes: CanvasFlowNode[]; edges: CanvasFlowEdge[] } {
  const nodes: CanvasFlowNode[] = payload.nodes.map((n) => ({
    id: n.id,
    type: "resource",
    position: { x: n.position.x, y: n.position.y },
    data: {
      resourceId: n.resourceId,
      label: n.label,
      overrides: n.overrides ?? {},
      semanticZoomLevel: 2,
      ...(Number.isFinite(n.width) && Number.isFinite(n.height)
        ? { width: n.width, height: n.height, manualSize: true }
        : {}),
      ...(typeof n.accentColor === "string" ? { accentColor: n.accentColor } : {}),
      ...(typeof n.comment === "string" ? { comment: n.comment } : {}),
    },
  }));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: CanvasFlowEdge[] = payload.edges
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target) && e.source !== e.target)
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      data: {
        ...(typeof e.label === "string" ? { label: e.label } : {}),
        ...(e.condition ? { condition: e.condition } : {}),
        ...(isHexColor(e.color) ? { color: e.color } : {}),
        ...(e.lineStyle ? { lineStyle: e.lineStyle } : {}),
        ...(e.width ? { width: e.width } : {}),
        ...(e.marker ? { marker: e.marker } : {}),
      },
    }));
  const seen = new Set<string>();
  return {
    nodes,
    edges: edges.filter((e) => {
      const key = `${e.source}->${e.target}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  };
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    temporal(
    (set, get) => ({
      nodes: [],
      edges: [],
      semanticZoomLevel: 2,
      edgeStyle: "smoothstep",
      selectedNodeId: null,
      sceneName: "Untitled system",
      abDiffEnabled: false,
      abBaseline: null,
      fitViewNonce: 0,
      outlineMode: false,
      doctorOpen: false,
      focusRequest: null,

      onNodesChange: (changes) => {
        set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) }));
      },
      onEdgesChange: (changes) => {
        set((state) => ({ edges: applyEdgeChanges(changes, state.edges) }));
      },

      addNode: (resourceId, position, label) => {
        const fallbackLabel = seedNameById.get(resourceId) ?? resourceId;
        const node = buildFlowNode(resourceId, position, label ?? fallbackLabel);
        set((state) => ({ nodes: [...state.nodes, node], selectedNodeId: node.id }));
        return node.id;
      },

      updateNodePosition: (nodeId, position) => {
        set((state) => ({
          nodes: state.nodes.map((node) => (node.id === nodeId ? { ...node, position } : node)),
        }));
      },

      updateNodeOverrides: (nodeId, partial) => {
        set((state) => ({
          nodes: state.nodes.map((node) => {
            if (node.id !== nodeId) return node;
            const merged: Record<string, unknown> = { ...node.data.overrides, ...partial };
            for (const key of Object.keys(merged)) {
              const value = merged[key];
              if (value === undefined || value === null || (typeof value === "number" && Number.isNaN(value))) {
                delete merged[key];
              }
            }
            return {
              ...node,
              data: { ...node.data, overrides: merged as typeof node.data.overrides },
            };
          }),
        }));
      },

      updateNodeSize: (nodeId, size) => {
        const width = Math.min(NODE_MAX_WIDTH, Math.max(NODE_MIN_WIDTH, Math.round(size.width)));
        const height = Math.min(NODE_MAX_HEIGHT, Math.max(NODE_MIN_HEIGHT, Math.round(size.height)));
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId ? { ...node, data: { ...node.data, width, height, manualSize: true } } : node,
          ),
        }));
      },

      resetNodeSize: (nodeId) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    width: NODE_DEFAULT_WIDTH,
                    height: NODE_TIER_HEIGHTS[node.data.semanticZoomLevel ?? 2],
                    manualSize: false,
                  },
                }
              : node,
          ),
        }));
      },

      setNodeAccent: (nodeId, color) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId ? { ...node, data: { ...node.data, accentColor: color ?? undefined } } : node,
          ),
        }));
      },

      renameNode: (nodeId, label) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId ? { ...node, data: { ...node.data, label } } : node,
          ),
        }));
      },

      setNodeComment: (nodeId, comment) => {
        set((state) => ({
          nodes: state.nodes.map((node) => {
            if (node.id !== nodeId) return node;
            const data = { ...(node.data as ResourceNodeData) };
            const text = typeof comment === "string" ? comment.trim() : "";
            if (text.length > 0) data.comment = text;
            else delete data.comment;
            return { ...node, data };
          }),
        }));
      },

      duplicateNode: (nodeId) => {
        const source = get().nodes.find((node) => node.id === nodeId);
        if (!source) return null;
        const copy: CanvasFlowNode = {
          ...source,
          id: makeNodeId(),
          position: { x: source.position.x + 48, y: source.position.y + 48 },
          data: {
            ...source.data,
            overrides: { ...(source.data.overrides ?? {}) },
            label: `${String(source.data.label ?? "Node")} copy`,
          },
          selected: false,
        };
        set((state) => ({ nodes: [...state.nodes, copy], selectedNodeId: copy.id }));
        return copy.id;
      },

      removeNode: (nodeId) => {
        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== nodeId),
          edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
          selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        }));
      },

      deleteSelection: () => {
        const { nodes, edges, selectedNodeId } = get();
        const selectedNodeIds = new Set(nodes.filter((node) => node.selected).map((node) => node.id));
        if (selectedNodeId) selectedNodeIds.add(selectedNodeId);
        const selectedEdgeIds = new Set(edges.filter((edge) => edge.selected).map((edge) => edge.id));
        if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) return 0;
        const removed = selectedNodeIds.size + selectedEdgeIds.size;
        set((state) => ({
          nodes: state.nodes.filter((node) => !selectedNodeIds.has(node.id)),
          edges: state.edges.filter(
            (edge) =>
              !selectedNodeIds.has(edge.source) && !selectedNodeIds.has(edge.target) && !selectedEdgeIds.has(edge.id),
          ),
          selectedNodeId: null,
        }));
        return removed;
      },

      addEdge: (source, target) => {
        if (source === target) return null;
        const { nodes, edges } = get();
        const ids = new Set(nodes.map((n) => n.id));
        if (!ids.has(source) || !ids.has(target)) return null;
        if (edges.some((e) => e.source === source && e.target === target)) return null;
        const id = makeEdgeId(source, target);
        const raw: CanvasFlowEdge = { id, source, target, data: {} };
        set((state) => ({ edges: [...state.edges, decorateEdge(raw, state.edgeStyle)] }));
        return id;
      },

      removeEdge: (edgeId) => {
        set((state) => ({ edges: state.edges.filter((edge) => edge.id !== edgeId) }));
      },

      updateEdgeData: (edgeId, partial) => {
        set((state) => {
          const target = state.edges.find((edge) => edge.id === edgeId);
          if (!target) return state;
          const data = { ...((target.data ?? {}) as CanvasEdgeData) };
          if (partial.label !== undefined) {
            const label = (partial.label ?? "").trim();
            if (label.length > 0) data.label = label;
            else delete data.label;
          }
          if (partial.condition !== undefined) {
            if (partial.condition === "none") delete data.condition;
            else data.condition = partial.condition;
          }
          if (partial.color !== undefined) {
            if (isHexColor(partial.color)) data.color = partial.color;
            else delete data.color;
          }
          if (partial.lineStyle !== undefined) {
            if (partial.lineStyle) data.lineStyle = partial.lineStyle;
            else delete data.lineStyle;
          }
          if (partial.width !== undefined) {
            if (typeof partial.width === "number" && Number.isFinite(partial.width) && partial.width > 0) {
              data.width = partial.width;
            } else delete data.width;
          }
          if (partial.marker !== undefined) {
            if (partial.marker) data.marker = partial.marker;
            else delete data.marker;
          }
          const updated = { ...target, data };
          const rest = state.edges.filter((edge) => edge.id !== edgeId);
          const index = state.edges.indexOf(target);
          return {
            edges: [...rest.slice(0, index), decorateEdge(updated, state.edgeStyle), ...rest.slice(index)],
          };
        });
      },

      setEdgeStyle: (style) => {
        set((state) => ({ edgeStyle: style, edges: state.edges.map((edge) => decorateEdge(edge, style)) }));
      },

      setSemanticZoomLevel: (level) => {
        set((state) => ({
          semanticZoomLevel: level,
          nodes: state.nodes.map((node) => ({
            ...node,
            data: {
              ...node.data,
              semanticZoomLevel: level,
              height: node.data.manualSize ? node.data.height : NODE_TIER_HEIGHTS[level],
            },
          })),
        }));
      },

      setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),
      setSceneName: (name) => set({ sceneName: name }),
      setOutlineMode: (enabled) => set({ outlineMode: enabled }),
      setDoctorOpen: (enabled) => set({ doctorOpen: enabled }),

      focusNode: (nodeId) => {
        set((state) => ({
          selectedNodeId: nodeId,
          focusRequest: { nodeId, nonce: (state.focusRequest?.nonce ?? 0) + 1 },
        }));
      },

      /**
       * K8s View: expand a stateless compute node into a production-shaped
       * Kubernetes slice — Ingress controller -> Service-fronted Deployment
       * (3 pods) -> existing downstream, plus a control-plane node anchored
       * below. Returns false when the node is missing or already expanded.
       */
      expandToKubernetes: (nodeId) => {
        const { nodes, edges } = get();
        const source = nodes.find((node) => node.id === nodeId);
        if (!source) return false;
        const resourceId = String(source.data.resourceId ?? "");
        if (resourceId === "k8s_deployment" || resourceId === "ingress_controller") return false;

        const base = { x: source.position.x, y: source.position.y };
        const ingress = buildFlowNode("ingress_controller", { x: base.x - 300, y: base.y }, "Ingress (ai-svc.example.com)");
        const deployment = buildFlowNode("k8s_deployment", { x: base.x, y: base.y }, `${String(source.data.label ?? "service")}-deploy`);
        const cluster = buildFlowNode("k8s_cluster", { x: base.x - 150, y: base.y + 220 }, "Control plane (prod)");
        deployment.data = {
          ...deployment.data,
          overrides: { ...source.data.overrides, replicationFactor: 3, multiAz: true },
        };
        cluster.data = {
          ...cluster.data,
          overrides: { region: (source.data.overrides.region as string | undefined) ?? "us-east-1" },
        };

        const inbound = edges.filter((edge) => edge.target === nodeId);
        const outbound = edges.filter((edge) => edge.source === nodeId);
        const nextEdges: CanvasFlowEdge[] = edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);

        nextEdges.push({ id: makeEdgeId(ingress.id, deployment.id), source: ingress.id, target: deployment.id });
        for (const edge of inbound) {
          nextEdges.push({ id: makeEdgeId(edge.source, ingress.id), source: edge.source, target: ingress.id });
        }
        for (const edge of outbound) {
          nextEdges.push({ id: makeEdgeId(deployment.id, edge.target), source: deployment.id, target: edge.target });
        }

        const nextNodes = [...nodes.filter((node) => node.id !== nodeId), ingress, deployment, cluster];
        set((state) => ({
          nodes: nextNodes,
          edges: nextEdges.map((edge) => decorateEdge(edge, state.edgeStyle)),
          selectedNodeId: deployment.id,
          fitViewNonce: state.fitViewNonce + 1,
        }));
        return true;
      },

      clearCanvas: () => {
        set((state) => ({
          nodes: [],
          edges: [],
          selectedNodeId: null,
          abBaseline: null,
          sceneName: "Untitled system",
          fitViewNonce: state.fitViewNonce + 1,
        }));
      },

      loadStarterTemplate: () => {
        const api = buildFlowNode("api_gateway", { x: 80, y: 200 }, "Edge gateway");
        const service = buildFlowNode("rest_service", { x: 360, y: 200 }, "Checkout API");
        const cache = buildFlowNode("redis_cache", { x: 640, y: 80 }, "Session cache");
        const dbNode = buildFlowNode("postgres_db", { x: 640, y: 320 }, "Orders DB");
        service.data.overrides = { clientRps: STARTER_ENTRY_RPS };
        const nodes = [api, service, cache, dbNode];
        const edges: CanvasFlowEdge[] = [
          { id: makeEdgeId(api.id, service.id), source: api.id, target: service.id },
          { id: makeEdgeId(service.id, cache.id), source: service.id, target: cache.id },
          { id: makeEdgeId(service.id, dbNode.id), source: service.id, target: dbNode.id },
        ];
        set((state) => ({
          nodes,
          edges: edges.map((edge) => decorateEdge(edge, state.edgeStyle)),
          selectedNodeId: null,
          sceneName: "Checkout starter",
          fitViewNonce: state.fitViewNonce + 1,
        }));
      },

      loadBlueprintTemplate: (blueprint) => {
        const nodes = blueprint.nodes.map((node) =>
          buildFlowNode(node.resourceId, { x: node.x, y: node.y }, node.label),
        );
        nodes.forEach((flowNode, index) => {
          const overrides = blueprint.nodes[index]?.overrides;
          if (overrides && Object.keys(overrides).length > 0) {
            flowNode.data = { ...flowNode.data, overrides: { ...overrides } };
          }
        });
        const seen = new Set<string>();
        const edges: CanvasFlowEdge[] = [];
        for (const [sourceIndex, targetIndex] of blueprint.edges) {
          const source = nodes[sourceIndex];
          const target = nodes[targetIndex];
          if (!source || !target) continue;
          const key = `${source.id}->${target.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          edges.push({ id: makeEdgeId(source.id, target.id), source: source.id, target: target.id });
        }
        set((state) => ({
          nodes,
          edges: edges.map((edge) => decorateEdge(edge, state.edgeStyle)),
          selectedNodeId: null,
          abBaseline: null,
          sceneName: blueprint.name,
          fitViewNonce: state.fitViewNonce + 1,
        }));
      },

      replaceTopology: (nodes, edges) => {
        set((state) => ({
          nodes,
          edges: edges.map((edge) => decorateEdge(edge, state.edgeStyle)),
          selectedNodeId: null,
          fitViewNonce: state.fitViewNonce + 1,
        }));
      },

      setAbDiffEnabled: (enabled) => set({ abDiffEnabled: enabled }),

      captureAbBaseline: () => {
        const { nodes, edges } = get();
        set({ abBaseline: payloadFromState(nodes, edges), abDiffEnabled: true });
      },

      toGraphTopology: () => {
        const { nodes, edges } = get();
        const indegree = new Map<string, number>();
        for (const node of nodes) indegree.set(node.id, 0);
        for (const edge of edges) {
          if (indegree.has(edge.target)) indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
        }
        const graphNodes: GraphNode[] = nodes.map((node) => {
          const resourceId = String(node.data.resourceId ?? "rest_service");
          const base = seedDefaultsById.get(resourceId);
          const custom = base ? undefined : getCustomResource(resourceId);
          const overrides = node.data.overrides ?? {};
          // Per-node compute: vCPU scales throughput, memory scales buffering.
          const sizing = resolveInstanceSizing({
            overrideVcpu: overrides.vcpu,
            overrideMemoryGb: overrides.memoryGb,
            seedVcpu: base?.vcpu ?? custom?.vcpu,
            seedMemoryGb: base?.memoryGb ?? custom?.memoryGb,
            seedThroughputRps: base?.baseThroughputRps ?? custom?.baseThroughputRps ?? 1000,
            seedMaxConcurrency: base?.maxConcurrency ?? custom?.maxConcurrency ?? 500,
            explicitThroughputRps: overrides.baseThroughputRps,
            explicitMaxConcurrency: overrides.maxConcurrency,
          });
          return {
            id: node.id,
            resourceId,
            position: { x: node.position.x, y: node.position.y },
            clientRps:
              overrides.clientRps ?? ((indegree.get(node.id) ?? 0) === 0 ? STARTER_ENTRY_RPS : 0),
            replicationFactor: overrides.replicationFactor ?? base?.replicationFactor ?? custom?.replicationFactor ?? 1,
            baseThroughputRps: sizing.baseThroughputRps,
            maxConcurrency: sizing.maxConcurrency,
            cacheHitRate: overrides.cacheHitRate ?? base?.cacheHitRate ?? custom?.cacheHitRate ?? 0,
            rateLimitRps: overrides.rateLimitRps ?? base?.rateLimitRps ?? custom?.rateLimitRps ?? 10000,
            writeRatio: overrides.writeRatio ?? base?.writeRatio ?? custom?.writeRatio ?? 0.2,
            vramGbPerReplica: overrides.vramGbPerReplica ?? base?.vramGbPerReplica ?? 0,
            avgPromptTokens: overrides.avgPromptTokens ?? base?.avgPromptTokens ?? 1024,
            avgOutputTokens: overrides.avgOutputTokens ?? base?.avgOutputTokens ?? 256,
            baseP50Ms: base?.baseP50Ms ?? custom?.baseP50Ms ?? 5,
            baseP95Ms: base?.baseP95Ms ?? custom?.baseP95Ms ?? 15,
            baseP99Ms: base?.baseP99Ms ?? custom?.baseP99Ms ?? 40,
            region: overrides.region ?? base?.region ?? custom?.region ?? "us-east-1",
            loadBalancer: "round_robin",
            ...(typeof overrides.costPerHourUsd === "number" && overrides.costPerHourUsd >= 0
              ? { costPerHourUsdOverride: overrides.costPerHourUsd }
              : {}),
          };
        });
        return {
          nodes: graphNodes,
          edges: edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            weight: 1,
            circuit: "closed" as const,
            consecutiveErrorTicks: 0,
          })),
        };
      },

      serializeScene: () => {
        const { nodes, edges } = get();
        const payload = payloadFromState(nodes, edges);
        return compressToEncodedURIComponent(JSON.stringify(payload));
      },

      exportDesignJson: () => {
        const { nodes, edges, sceneName } = get();
        return JSON.stringify(
          {
            format: "syscraft.design/1",
            name: sceneName,
            exportedAt: new Date().toISOString(),
            scene: payloadFromState(nodes, edges),
          },
          null,
          2,
        );
      },

      deserializeScene: (hash) => {
        try {
          // Accept raw JSON, or a compressed payload from lz-string's
          // URI-safe alphabet (which can contain "+", "-", "_" and "$").
          const trimmed = hash.trim();
          let raw: string | null = null;
          if (trimmed.startsWith("{")) {
            raw = trimmed;
          } else {
            raw = decompressFromEncodedURIComponent(trimmed);
          }
          if (!raw) return false;
          const parsed = JSON.parse(raw) as ScenePayload;
          if (parsed.version !== SCENE_VERSION || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
            return false;
          }
          const { nodes, edges } = topologyFromPayload(parsed);
          set((state) => ({
            nodes,
            edges: edges.map((edge) => decorateEdge(edge, state.edgeStyle)),
            selectedNodeId: null,
            fitViewNonce: state.fitViewNonce + 1,
          }));
          return true;
        } catch {
          return false;
        }
      },

      loadBlueprintById: async (id) => {
        const record = await loadBlueprintRecord(id);
        if (!record) return false;
        return get().deserializeScene(record.payload);
      },
    }),
    {
      partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
      limit: 100,
    },
    ),
    {
      // Auto-save: the full topology + user settings persist to localStorage
      // (debounced writes) after every mutation, restored by the workspace
      // shell before first paint. Everything else is transient session state.
      name: CANVAS_STORAGE_KEY,
      version: CANVAS_PERSIST_VERSION,
      storage: createJSONStorage(() => createDebouncedCanvasStorage(() => window.localStorage)),
      skipHydration: true,
      partialize: (state): PersistedCanvasState => ({
        nodes: state.nodes,
        edges: state.edges,
        sceneName: state.sceneName,
        edgeStyle: state.edgeStyle,
        semanticZoomLevel: state.semanticZoomLevel,
      }),
      migrate: migratePersistedCanvas,
    },
  ),
);

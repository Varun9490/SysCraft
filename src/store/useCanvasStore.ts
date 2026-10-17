import { create } from "zustand";
import { temporal } from "zundo";
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { SEED_RESOURCES } from "@/data/seedResources";
import type { Blueprint } from "@/data/blueprints";
import type { ResourceNodeData, ResourceOverrides } from "@/types/resource";
import type { GraphNode, GraphTopology } from "@/types/simulation";
import { getCustomResource } from "./customResourceRegistry";
import { loadBlueprint as loadBlueprintRecord } from "./db";

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

export type CanvasFlowNode = Node<ResourceNodeData, "resource" | "region">;
export type CanvasFlowEdge = Edge;

interface SceneNodePayload {
  id: string;
  position: { x: number; y: number };
  resourceId: string;
  label: string;
  overrides: ResourceOverrides;
}

interface ScenePayload {
  version: number;
  nodes: SceneNodePayload[];
  edges: Array<{ id: string; source: string; target: string }>;
}

interface CanvasState {
  nodes: CanvasFlowNode[];
  edges: CanvasFlowEdge[];
  roughEnabled: boolean;
  semanticZoomLevel: 1 | 2 | 3;
  selectedNodeId: string | null;
  sceneName: string;
  abDiffEnabled: boolean;
  abBaseline: ScenePayload | null;
  /** Bumped whenever a whole scene is swapped in, so the canvas can re-fit. */
  fitViewNonce: number;

  onNodesChange: OnNodesChange<CanvasFlowNode>;
  onEdgesChange: OnEdgesChange<CanvasFlowEdge>;
  addNode: (resourceId: string, position: { x: number; y: number }, label?: string) => string;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  updateNodeOverrides: (nodeId: string, partial: Partial<ResourceOverrides>) => void;
  renameNode: (nodeId: string, label: string) => void;
  duplicateNode: (nodeId: string) => string | null;
  removeNode: (nodeId: string) => void;
  addEdge: (source: string, target: string) => string | null;
  removeEdge: (edgeId: string) => void;
  setRoughEnabled: (enabled: boolean) => void;
  setSemanticZoomLevel: (level: 1 | 2 | 3) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setSceneName: (name: string) => void;
  clearCanvas: () => void;
  loadStarterTemplate: () => void;
  loadBlueprintTemplate: (blueprint: Blueprint) => void;
  replaceTopology: (nodes: CanvasFlowNode[], edges: CanvasFlowEdge[]) => void;
  setAbDiffEnabled: (enabled: boolean) => void;
  captureAbBaseline: () => void;
  toGraphTopology: () => GraphTopology;
  serializeScene: () => string;
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

function buildFlowNode(resourceId: string, position: { x: number; y: number }, label: string): CanvasFlowNode {
  return {
    id: makeNodeId(),
    type: "resource",
    position,
    data: {
      resourceId,
      label,
      overrides: {},
      roughEnabled: true,
      semanticZoomLevel: 2,
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
    })),
    edges: edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
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
      roughEnabled: true,
      semanticZoomLevel: 2,
    },
  }));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: CanvasFlowEdge[] = payload.edges
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target) && e.source !== e.target)
    .map((e) => ({ id: e.id, source: e.source, target: e.target }));
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
  temporal(
    (set, get) => ({
      nodes: [],
      edges: [],
      roughEnabled: true,
      semanticZoomLevel: 2,
      selectedNodeId: null,
      sceneName: "Untitled system",
      abDiffEnabled: false,
      abBaseline: null,
      fitViewNonce: 0,

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
          nodes: state.nodes.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, overrides: { ...node.data.overrides, ...partial } } }
              : node,
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

      addEdge: (source, target) => {
        if (source === target) return null;
        const { nodes, edges } = get();
        const ids = new Set(nodes.map((n) => n.id));
        if (!ids.has(source) || !ids.has(target)) return null;
        if (edges.some((e) => e.source === source && e.target === target)) return null;
        const id = makeEdgeId(source, target);
        set((state) => ({ edges: [...state.edges, { id, source, target }] }));
        return id;
      },

      removeEdge: (edgeId) => {
        set((state) => ({ edges: state.edges.filter((edge) => edge.id !== edgeId) }));
      },

      setRoughEnabled: (enabled) => {
        set((state) => ({
          roughEnabled: enabled,
          nodes: state.nodes.map((node) => ({
            ...node,
            data: { ...node.data, roughEnabled: enabled },
          })),
        }));
      },

      setSemanticZoomLevel: (level) => {
        set((state) => ({
          semanticZoomLevel: level,
          nodes: state.nodes.map((node) => ({
            ...node,
            data: { ...node.data, semanticZoomLevel: level },
          })),
        }));
      },

      setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),
      setSceneName: (name) => set({ sceneName: name }),

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
          edges,
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
          edges,
          selectedNodeId: null,
          abBaseline: null,
          sceneName: blueprint.name,
          fitViewNonce: state.fitViewNonce + 1,
        }));
      },

      replaceTopology: (nodes, edges) => {
        set((state) => ({ nodes, edges, selectedNodeId: null, fitViewNonce: state.fitViewNonce + 1 }));
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
          return {
            id: node.id,
            resourceId,
            position: { x: node.position.x, y: node.position.y },
            clientRps:
              overrides.clientRps ?? ((indegree.get(node.id) ?? 0) === 0 ? STARTER_ENTRY_RPS : 0),
            replicationFactor: overrides.replicationFactor ?? base?.replicationFactor ?? custom?.replicationFactor ?? 1,
            baseThroughputRps: overrides.baseThroughputRps ?? base?.baseThroughputRps ?? custom?.baseThroughputRps ?? 1000,
            maxConcurrency: overrides.maxConcurrency ?? base?.maxConcurrency ?? custom?.maxConcurrency ?? 500,
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

      deserializeScene: (hash) => {
        try {
          const raw = hash.includes("%") || /^[A-Za-z0-9+\-/_=]+$/.test(hash)
            ? decompressFromEncodedURIComponent(hash)
            : hash;
          if (!raw) return false;
          const parsed = JSON.parse(raw) as ScenePayload;
          if (parsed.version !== SCENE_VERSION || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
            return false;
          }
          const { nodes, edges } = topologyFromPayload(parsed);
          set((state) => ({ nodes, edges, selectedNodeId: null, fitViewNonce: state.fitViewNonce + 1 }));
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
);

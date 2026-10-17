'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import dagre from "dagre";
import { AnimatePresence, motion } from "framer-motion";
import {
  Box,
  ChevronDown,
  Flame,
  HelpCircle,
  LayoutGrid,
  ListChecks,
  PenTool,
  Plus,
  Redo2,
  RotateCcw,
  Share,
  Trash2,
  Undo2,
} from "@/components/ui/icons";
import { SEED_RESOURCES } from "@/data/seedResources";
import { CLOUD_REGIONS } from "@/data/regionLatency";
import type { ChaosKind } from "@/types/simulation";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useSimStore } from "@/store/useSimStore";

/**
 * Excalidraw-style floating island + chaos bar.
 * Single-key bindings: [r]ough toggle · [l] auto-layout · [1/2/3] semantic
 * zoom · [z]/[y] undo/redo · [space] run/stop. Keys are ignored while typing.
 */

const CHAOS_KINDS: ChaosKind[] = [
  "zone_outage",
  "latency_spike",
  "packet_loss",
  "cpu_hog",
  "traffic_surge",
  "dependency_down",
  "dns_failure",
];

const K8S_EXPANDABLE = new Set(["rest_service", "serverless_function", "background_worker", "service_mesh", "llm_inference"]);

const CHAOS_DEFAULTS: Record<ChaosKind, { capacityPenalty: number; latencyPenaltyMs: number }> = {
  none: { capacityPenalty: 0, latencyPenaltyMs: 0 },
  zone_outage: { capacityPenalty: 0.34, latencyPenaltyMs: 0 },
  latency_spike: { capacityPenalty: 0, latencyPenaltyMs: 250 },
  packet_loss: { capacityPenalty: 0, latencyPenaltyMs: 40 },
  cpu_hog: { capacityPenalty: 0.5, latencyPenaltyMs: 0 },
  traffic_surge: { capacityPenalty: 0, latencyPenaltyMs: 0 },
  dependency_down: { capacityPenalty: 0.9, latencyPenaltyMs: 0 },
  dns_failure: { capacityPenalty: 0.6, latencyPenaltyMs: 0 },
};

function undoCanvas(): void {
  const store = useCanvasStore as unknown as {
    temporal: { getState: () => { undo: () => void; redo: () => void } };
  };
  try {
    store.temporal.getState().undo();
  } catch {
    /* history unavailable */
  }
}

function redoCanvas(): void {
  const store = useCanvasStore as unknown as {
    temporal: { getState: () => { undo: () => void; redo: () => void } };
  };
  try {
    store.temporal.getState().redo();
  } catch {
    /* history unavailable */
  }
}

export function FloatingToolbar() {
  const { screenToFlowPosition } = useReactFlow();
  const [resourceId, setResourceId] = useState(SEED_RESOURCES[0]?.id ?? "rest_service");
  const [chaosKind, setChaosKind] = useState<ChaosKind>("zone_outage");
  const [chaosRegion, setChaosRegion] = useState("all");
  const [chaosOpen, setChaosOpen] = useState(false);

  const roughEnabled = useCanvasStore((s) => s.roughEnabled);
  const semanticZoomLevel = useCanvasStore((s) => s.semanticZoomLevel);
  const nodeCount = useCanvasStore((s) => s.nodes.length);
  const outlineMode = useCanvasStore((s) => s.outlineMode);
  const doctorOpen = useCanvasStore((s) => s.doctorOpen);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const chaosActive = useSimStore((s) => s.chaos.active);
  const [k8sNotice, setK8sNotice] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const shareCanvas = useCallback(() => {
    const payload = useCanvasStore.getState().serializeScene();
    if (!payload || payload.length === 0) return;
    const url = `${window.location.origin}/s#${payload}`;
    const kb = (url.length / 1024).toFixed(1);
    const announce = (message: string) => {
      setShareNotice(message);
      window.setTimeout(() => setShareNotice(null), 4200);
    };
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => announce(`Share link copied (${kb} KB) — opens read-only on the /s share viewer.`),
        () => announce(`Share link is ${kb} KB — clipboard was blocked, try again from a focused tab.`),
      );
    } else {
      announce(`Share link is ${kb} KB — clipboard unavailable in this browser.`);
    }
  }, []);

  const expandSelectedToK8s = useCallback(() => {
    const state = useCanvasStore.getState();
    const selected = selectedNodeId ? state.nodes.find((n) => n.id === selectedNodeId) : undefined;
    const candidate =
      selected && K8S_EXPANDABLE.has(String(selected.data.resourceId))
        ? selected
        : state.nodes.find((n) => K8S_EXPANDABLE.has(String(n.data.resourceId)));
    if (!candidate) {
      setK8sNotice("Select a stateless compute node (or add one) to expand into Kubernetes pods.");
    } else {
      const ok = state.expandToKubernetes(candidate.id);
      setK8sNotice(
        ok
          ? `Expanded “${String(candidate.data.label ?? "service")}” into Ingress → Service → 3 Pods + control plane.`
          : "That node is already part of a Kubernetes slice.",
      );
    }
    window.setTimeout(() => setK8sNotice(null), 3200);
  }, [selectedNodeId]);

  const resourceOptions = useMemo(
    () =>
      [...SEED_RESOURCES]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((r) => ({ id: r.id, name: r.name, category: r.category })),
    [],
  );

  const addSelectedResource = useCallback(() => {
    const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const jitter = (nodeCount % 8) * 36;
    useCanvasStore.getState().addNode(resourceId, { x: center.x - 116 + jitter, y: center.y - 64 + jitter });
  }, [nodeCount, resourceId, screenToFlowPosition]);

  const runAutoLayout = useCallback(() => {
    const { nodes, edges, replaceTopology } = useCanvasStore.getState();
    if (nodes.length === 0) return;
    const graph = new dagre.graphlib.Graph();
    graph.setGraph({ rankdir: "LR", nodesep: 70, ranksep: 140, marginx: 40, marginy: 40 });
    graph.setDefaultEdgeLabel(() => ({}));
    for (const node of nodes) {
      graph.setNode(node.id, { width: 232, height: 140 });
    }
    for (const edge of edges) {
      graph.setEdge(edge.source, edge.target);
    }
    dagre.layout(graph);
    replaceTopology(
      nodes.map((node) => {
        const placed = graph.node(node.id);
        return {
          ...node,
          position: {
            x: (placed?.x ?? 0) - 116,
            y: (placed?.y ?? 0) - 70,
          },
        };
      }),
      edges,
    );
  }, []);

  const toggleRunning = useCallback(() => {
    const sim = useSimStore.getState();
    if (sim.running) {
      sim.stopSimulation();
    } else {
      sim.startSimulation(() => useCanvasStore.getState().toGraphTopology());
    }
  }, []);

  const fireChaos = useCallback(() => {
    const defaults = CHAOS_DEFAULTS[chaosKind];
    useSimStore.getState().setChaos({
      active: true,
      kind: chaosKind,
      capacityPenalty: defaults.capacityPenalty,
      latencyPenaltyMs: defaults.latencyPenaltyMs,
      targetNodeIds: [],
      targetRegion: chaosRegion === "all" ? null : chaosRegion,
      startedAtTick: useSimStore.getState().tick,
    });
  }, [chaosKind, chaosRegion]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const canvas = useCanvasStore.getState();
      switch (event.key) {
        case "r":
        case "R":
          canvas.setRoughEnabled(!canvas.roughEnabled);
          break;
        case "l":
        case "L":
          runAutoLayout();
          break;
        case "o":
        case "O":
          canvas.setOutlineMode(!canvas.outlineMode);
          break;
        case "d":
        case "D":
          canvas.setDoctorOpen(!canvas.doctorOpen);
          break;
        case "1":
          canvas.setSemanticZoomLevel(1);
          break;
        case "2":
          canvas.setSemanticZoomLevel(2);
          break;
        case "3":
          canvas.setSemanticZoomLevel(3);
          break;
        case "z":
        case "Z":
          undoCanvas();
          break;
        case "y":
        case "Y":
          redoCanvas();
          break;
        case " ":
          event.preventDefault();
          toggleRunning();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runAutoLayout, toggleRunning]);

  useEffect(() => {
    const onAutoLayout = () => runAutoLayout();
    window.addEventListener("syscraft:auto-layout", onAutoLayout);
    return () => window.removeEventListener("syscraft:auto-layout", onAutoLayout);
  }, [runAutoLayout]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex flex-col items-center gap-2 px-3">
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/90 p-1.5 shadow-2xl backdrop-blur">
        <select
          value={resourceId}
          onChange={(e) => setResourceId(e.target.value)}
          className="h-8 max-w-44 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-200"
          title="Resource palette"
        >
          {resourceOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button
          onClick={addSelectedResource}
          className="flex h-8 items-center gap-1 rounded-md bg-sky-500 px-2.5 text-xs font-semibold text-zinc-950 hover:bg-sky-400"
          title="Add resource (drop at viewport center)"
        >
          <Plus size={14} /> Add
        </button>
        <span className="h-6 w-px bg-zinc-800" />
        <button
          onClick={runAutoLayout}
          className="flex h-8 items-center gap-1 rounded-md border border-zinc-800 px-2 text-xs text-zinc-300 hover:bg-zinc-800"
          title="Auto-layout with dagre [l]"
        >
          <LayoutGrid size={14} /> Layout
        </button>
        <button
          onClick={() => useCanvasStore.getState().setRoughEnabled(!roughEnabled)}
          className={`flex h-8 items-center gap-1 rounded-md border px-2 text-xs hover:bg-zinc-800 ${
            roughEnabled ? "border-amber-400/60 text-amber-300" : "border-zinc-800 text-zinc-400"
          }`}
          title="Toggle Excalidraw sketchy mode [r]"
        >
          <PenTool size={14} /> {roughEnabled ? "Sketch" : "Crisp"}
        </button>
        <div className="flex overflow-hidden rounded-md border border-zinc-800" title="Semantic zoom [1/2/3]">
          {[1, 2, 3].map((level) => (
            <button
              key={level}
              onClick={() => useCanvasStore.getState().setSemanticZoomLevel(level as 1 | 2 | 3)}
              className={`h-8 w-8 text-xs font-semibold ${
                semanticZoomLevel === level ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
        <button
          onClick={undoCanvas}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
          title="Undo [z]"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={redoCanvas}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
          title="Redo [y]"
        >
          <Redo2 size={14} />
        </button>
        <button
          onClick={() => useCanvasStore.getState().loadStarterTemplate()}
          className="flex h-8 items-center gap-1 rounded-md border border-zinc-800 px-2 text-xs text-zinc-300 hover:bg-zinc-800"
          title="Reload checkout starter template"
        >
          <RotateCcw size={14} /> Starter
        </button>
        <button
          onClick={() => useCanvasStore.getState().clearCanvas()}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 text-zinc-400 hover:bg-red-950 hover:text-red-300"
          title="Clear canvas"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1.5 rounded-xl border border-violet-900/50 bg-zinc-950/90 p-1.5 shadow-2xl backdrop-blur">
        <button
          onClick={expandSelectedToK8s}
          className="flex h-8 items-center gap-1 rounded-md border border-zinc-800 px-2 text-xs text-zinc-300 hover:border-sky-600/60 hover:text-sky-300"
          title="Expand the selected (or first) stateless compute node into Ingress → Service → Pods + control plane"
        >
          <Box size={14} /> K8s View
        </button>
        <button
          onClick={() => useCanvasStore.getState().setOutlineMode(!outlineMode)}
          className={`flex h-8 items-center gap-1 rounded-md border px-2 text-xs hover:bg-zinc-800 ${
            outlineMode ? "border-violet-400/60 text-violet-300" : "border-zinc-800 text-zinc-300"
          }`}
          title="Accessible Outline Mode — keyboard & screen-reader editor [o]"
        >
          <ListChecks size={14} /> Outline
        </button>
        <button
          onClick={() => useCanvasStore.getState().setDoctorOpen(!doctorOpen)}
          className={`flex h-8 items-center gap-1 rounded-md border px-2 text-xs hover:bg-zinc-800 ${
            doctorOpen ? "border-amber-400/60 text-amber-300" : "border-zinc-800 text-zinc-300"
          }`}
          title="Design Doctor — 14 static architecture rules [d]"
        >
          <HelpCircle size={14} /> Doctor
        </button>
        <button
          onClick={shareCanvas}
          className="flex h-8 items-center gap-1 rounded-md border border-zinc-800 px-2 text-xs text-zinc-300 hover:border-sky-600/60 hover:text-sky-300"
          title="Copy a read-only share link — the whole topology compresses into the URL fragment"
        >
          <Share size={14} /> Share
        </button>
      </div>

      {(shareNotice ?? k8sNotice) && (
        <p
          role="status"
          className="pointer-events-auto max-w-xl rounded-lg border border-zinc-700 bg-zinc-900/95 px-3 py-1.5 text-center text-[11.5px] text-zinc-200 shadow-xl"
        >
          {shareNotice ?? k8sNotice}
        </p>
      )}

      <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1.5 rounded-xl border border-red-900/50 bg-zinc-950/90 p-1.5 shadow-2xl backdrop-blur">
        <button
          onClick={() => setChaosOpen((o) => !o)}
          className={`flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold transition-colors ${
            chaosActive ? "animate-pulse text-red-300" : "text-zinc-300 hover:bg-zinc-800"
          }`}
          title="Chaos engineering controls"
        >
          <Flame size={14} className="text-red-400" />
          Chaos
          {chaosActive && <span className="h-1.5 w-1.5 rounded-full bg-red-400" />}
          <motion.span animate={{ rotate: chaosOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={13} className="text-zinc-500" />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {chaosOpen && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-1.5 overflow-hidden"
            >
              <span className="h-6 w-px bg-zinc-800" />
              <select
                value={chaosKind}
                onChange={(e) => setChaosKind(e.target.value as ChaosKind)}
                className="h-8 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-200"
              >
                {CHAOS_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <select
                value={chaosRegion}
                onChange={(e) => setChaosRegion(e.target.value)}
                className="h-8 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-200"
                title="Blast radius"
              >
                <option value="all">all regions</option>
                {CLOUD_REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id}
                  </option>
                ))}
              </select>
              <button
                onClick={fireChaos}
                className="h-8 rounded-md bg-red-500 px-2.5 text-xs font-semibold text-white hover:bg-red-400"
              >
                Inject
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {chaosActive && (
          <button
            onClick={() => useSimStore.getState().clearChaos()}
            className="h-8 rounded-md border border-red-500 px-2.5 text-xs font-semibold text-red-300 hover:bg-red-950"
          >
            Clear chaos
          </button>
        )}
      </div>
    </div>
  );
}

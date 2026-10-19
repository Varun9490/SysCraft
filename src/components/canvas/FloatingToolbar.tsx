'use client';

import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useReactFlow } from "@xyflow/react";
import dagre from "dagre";
import { AnimatePresence, motion } from "framer-motion";
import {
  Box,
  Check,
  Eraser,
  FileText,
  Flame,
  FlaskConical,
  HelpCircle,
  LayoutGrid,
  LineChart,
  ListChecks,
  Plus,
  Redo2,
  RotateCcw,
  Share,
  SlidersHorizontal,
  Trash2,
  Undo2,
  Wrench,
  X,
  Zap,
} from "@/components/ui/icons";
import { SEED_RESOURCES } from "@/data/seedResources";
import { CLOUD_REGIONS } from "@/data/regionLatency";
import type { ChaosKind } from "@/types/simulation";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useSimStore } from "@/store/useSimStore";
import { CanvasPreferences } from "./CanvasPreferences";

/**
 * Canvas command dock — one slim pill instead of three stacked rows.
 * Every control is grouped by intent (Build · Arrange · Canvas · Tools · Chaos)
 * and low-frequency actions live inside spring-animated flyouts, so the canvas
 * stays visible: [l] auto-layout · [o] outline · [d] doctor · [1/2/3] semantic
 * zoom · [z]/[y] undo/redo · [space] run/stop · [Delete] delete selection.
 */

const CHAOS_KINDS: ChaosKind[] = [
  "zone_outage",
  "latency_spike",
  "packet_loss",
  "cpu_hog",
  "traffic_surge",
  "dependency_down",
  "dns_failure",
  "cache_flush",
];

const K8S_EXPANDABLE = new Set(["rest_service", "serverless_function", "background_worker", "service_mesh", "llm_inference"]);

const SEED_REGION_BY_ID = new Map(SEED_RESOURCES.map((r) => [r.id, r.defaults.region]));

function effectiveRegionOf(resourceId: string, overrideRegion: unknown): string {
  if (typeof overrideRegion === "string" && overrideRegion.length > 0) return overrideRegion;
  return SEED_REGION_BY_ID.get(resourceId) ?? "us-east-1";
}

const CHAOS_DEFAULTS: Record<ChaosKind, { capacityPenalty: number; latencyPenaltyMs: number }> = {
  none: { capacityPenalty: 0, latencyPenaltyMs: 0 },
  zone_outage: { capacityPenalty: 0.34, latencyPenaltyMs: 0 },
  latency_spike: { capacityPenalty: 0, latencyPenaltyMs: 250 },
  packet_loss: { capacityPenalty: 0, latencyPenaltyMs: 40 },
  cpu_hog: { capacityPenalty: 0.5, latencyPenaltyMs: 0 },
  traffic_surge: { capacityPenalty: 0, latencyPenaltyMs: 0 },
  dependency_down: { capacityPenalty: 0.9, latencyPenaltyMs: 0 },
  dns_failure: { capacityPenalty: 0.6, latencyPenaltyMs: 0 },
  cache_flush: { capacityPenalty: 0, latencyPenaltyMs: 0 },
};

/**
 * Archetypal failures of the build-run-break loop, as one-click presets so a
 * learner can break a design without configuring chaos by hand.
 */
const QUICK_BREAKS: Array<{
  id: string;
  label: string;
  kind: ChaosKind;
  scope: "selected" | "all";
  capacityPenalty: number;
  latencyPenaltyMs: number;
  hint: string;
}> = [
  {
    id: "kill-node",
    label: "Fail a node",
    kind: "dependency_down",
    scope: "selected",
    capacityPenalty: 0.9,
    latencyPenaltyMs: 0,
    hint: "Take the selected node (or every node) down to ~10% capacity.",
  },
  {
    id: "spike",
    label: "Traffic spike",
    kind: "traffic_surge",
    scope: "all",
    capacityPenalty: 0,
    latencyPenaltyMs: 0,
    hint: "A flash crowd hits every node at once.",
  },
  {
    id: "region",
    label: "Region outage",
    kind: "zone_outage",
    scope: "all",
    capacityPenalty: 0.34,
    latencyPenaltyMs: 0,
    hint: "Loses a third of compute/cache replicas.",
  },
  {
    id: "flush",
    label: "Purge caches",
    kind: "cache_flush",
    scope: "all",
    capacityPenalty: 0,
    latencyPenaltyMs: 0,
    hint: "Empties every cache tier; hit rates re-warm over ~25s while the durable tier eats cold misses.",
  },
];

/** Bridge to the workspace shell so canvas controls can open its panels. */
function openWorkspacePanel(panel: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("syscraft:open-panel", { detail: { panel } }));
}

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

const spring = { type: "spring" as const, stiffness: 420, damping: 32 };

function DockIcon({
  onClick,
  title,
  label,
  children,
  tone = "ghost",
  active = false,
  disabled = false,
  ariaLabel,
}: {
  onClick: () => void;
  title: string;
  label?: string;
  children: ReactNode;
  tone?: "ghost" | "accent";
  active?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const toneClass =
    tone === "accent"
      ? "bg-sky-500 text-zinc-950 hover:bg-sky-400"
      : active
        ? "border border-sky-400/60 bg-sky-500/10 text-sky-300"
        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel ?? title}
      whileHover={disabled ? undefined : { scale: 1.07 }}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      transition={spring}
      className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors ${disabled ? "cursor-not-allowed opacity-35" : ""} ${toneClass}`}
    >
      {children}
      {label && <span className="hidden md:inline">{label}</span>}
    </motion.button>
  );
}

function clearToneDanger(armed: boolean): string {
  return armed
    ? "border border-red-500/70 bg-red-500/15 text-red-300"
    : "text-zinc-400 hover:bg-red-950/70 hover:text-red-300";
}

function DockDivider() {
  return <span className="mx-0.5 h-5 w-px bg-zinc-800" aria-hidden />;
}

export function FloatingToolbar() {
  const { screenToFlowPosition } = useReactFlow();
  const [resourceId, setResourceId] = useState(SEED_RESOURCES[0]?.id ?? "rest_service");
  const [chaosKind, setChaosKind] = useState<ChaosKind>("zone_outage");
  const [chaosScope, setChaosScope] = useState("all");
  const [chaosOpen, setChaosOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [clearArmed, setClearArmed] = useState(false);

  const semanticZoomLevel = useCanvasStore((s) => s.semanticZoomLevel);
  const nodeCount = useCanvasStore((s) => s.nodes.length);
  const outlineMode = useCanvasStore((s) => s.outlineMode);
  const doctorOpen = useCanvasStore((s) => s.doctorOpen);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const selectedCount = useCanvasStore(
    (s) =>
      s.nodes.reduce((count, node) => count + (node.selected || node.id === s.selectedNodeId ? 1 : 0), 0) +
      s.edges.reduce((count, edge) => count + (edge.selected ? 1 : 0), 0),
  );
  const chaosActive = useSimStore((s) => s.chaos.active);
  const activeChaos = useSimStore((s) => s.chaos);
  const [k8sNotice, setK8sNotice] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [chaosNotice, setChaosNotice] = useState<string | null>(null);
  const [chaosPrompt, setChaosPrompt] = useState(false);

  useEffect(() => {
    if (!clearArmed) return;
    const timer = window.setTimeout(() => setClearArmed(false), 3200);
    return () => window.clearTimeout(timer);
  }, [clearArmed]);

  useEffect(() => {
    if (!toolsOpen && !chaosOpen) return;
    const dismiss = () => {
      setToolsOpen(false);
      setChaosOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toolsOpen, chaosOpen]);

  const handleClear = useCallback(() => {
    if (!clearArmed) {
      setClearArmed(true);
      return;
    }
    setClearArmed(false);
    useCanvasStore.getState().clearCanvas();
  }, [clearArmed]);

  const deleteSelected = useCallback(() => {
    useCanvasStore.getState().deleteSelection();
  }, []);

  const shareCanvas = useCallback(() => {
    const payload = useCanvasStore.getState().serializeScene();
    if (!payload || payload.length === 0) return;
    const url = `${window.location.origin}/s#${payload}`;
    const kb = (url.length / 1024).toFixed(1);
    const announce = (message: string) => {
      setShareNotice(message);
      setToolsOpen(false);
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
    setToolsOpen(false);
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

  const injectChaos = useCallback(
    (
      kind: ChaosKind,
      scope: string,
      penalties?: { capacityPenalty: number; latencyPenaltyMs: number },
    ) => {
      const defaults = penalties ?? CHAOS_DEFAULTS[kind];
      const canvas = useCanvasStore.getState();
      const sim = useSimStore.getState();

      let targetNodeIds: string[] = [];
      let targetRegion: string | null = null;
      let scopeLabel = "every node";
      if (scope === "selected") {
        const fallback = canvas.nodes[0]?.id;
        const chosen = selectedNodeId ?? fallback;
        if (chosen) {
          targetNodeIds = [chosen];
          const label = canvas.nodes.find((node) => node.id === chosen)?.data.label;
          scopeLabel = `“${String(label ?? "selected node")}”`;
        } else {
          scopeLabel = "every node (canvas empty)";
        }
      } else if (scope !== "all") {
        targetRegion = scope;
        const regionCount = canvas.nodes.filter(
          (node) => effectiveRegionOf(String(node.data.resourceId), node.data.overrides?.region) === scope,
        ).length;
        scopeLabel = `every node in ${scope} (${regionCount} hit)`;
      }

      sim.setChaos({
        active: true,
        kind,
        capacityPenalty: defaults.capacityPenalty,
        latencyPenaltyMs: defaults.latencyPenaltyMs,
        targetNodeIds,
        targetRegion,
        startedAtTick: sim.tick,
      });

      // Chaos is only visible in telemetry while the clock ticks — auto-start
      // the simulation so the burn is immediately observable.
      const restarted = !sim.running;
      if (restarted) {
        useSimStore.getState().startSimulation(() => useCanvasStore.getState().toGraphTopology());
      }
      setChaosOpen(false);
      setChaosNotice(
        `Injected ${kind.replace(/_/g, " ")} on ${scopeLabel}${restarted ? " — simulation started so you can watch it burn" : ""}.`,
      );
      window.setTimeout(() => setChaosNotice(null), 4600);
    },
    [selectedNodeId],
  );

  const quickBreak = useCallback(
    (preset: (typeof QUICK_BREAKS)[number]) => {
      injectChaos(preset.kind, preset.scope, {
        capacityPenalty: preset.capacityPenalty,
        latencyPenaltyMs: preset.latencyPenaltyMs,
      });
    },
    [injectChaos],
  );

  const endChaos = useCallback(() => {
    useSimStore.getState().clearChaos();
    setChaosOpen(false);
    setChaosPrompt(true);
    window.setTimeout(() => setChaosPrompt(false), 9000);
  }, []);

  const toggleDoctor = useCallback(() => {
    useCanvasStore.getState().setDoctorOpen(!doctorOpen);
    setToolsOpen(false);
  }, [doctorOpen]);

  const toggleOutline = useCallback(() => {
    useCanvasStore.getState().setOutlineMode(!outlineMode);
    setToolsOpen(false);
  }, [outlineMode]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const canvas = useCanvasStore.getState();
      switch (event.key) {
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

  const doctorBadgeActive = doctorOpen;
  const outlineBadgeActive = outlineMode;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex flex-col items-center gap-2 px-3">
      {/* ── Command dock ─────────────────────────────────────────────────── */}
      <div className="pointer-events-auto flex max-w-full items-center gap-1 rounded-2xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl">
        {/* Build */}
        <select
          value={resourceId}
          onChange={(e) => setResourceId(e.target.value)}
          className="h-9 max-w-36 rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-200 outline-none transition-colors focus:border-zinc-600"
          title="Pick a primitive, then Add (or Ctrl-K → Add resource)"
          aria-label="Resource palette"
        >
          {resourceOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <DockIcon onClick={addSelectedResource} title={`Drop the chosen primitive at the viewport center (jitters so stacked adds fan out)`} tone="accent" label="Add">
          <Plus size={15} weight="bold" />
        </DockIcon>
        <DockDivider />

        {/* Arrange */}
        <DockIcon onClick={runAutoLayout} title="Auto-layout everything with dagre [l]" label="Layout">
          <LayoutGrid size={15} />
        </DockIcon>
        <DockIcon onClick={deleteSelected} disabled={selectedCount === 0} title="Delete the selected node(s)/edges [Delete · Backspace]" label="Delete" >
          <Trash2 size={15} />
        </DockIcon>
        <div className="mx-0.5 flex h-9 items-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60" title="Semantic zoom — how much detail nodes show [1·2·3]">
          {[1, 2, 3].map((level) => (
            <motion.button
              key={level}
              type="button"
              whileTap={{ scale: 0.88 }}
              transition={spring}
              onClick={() => useCanvasStore.getState().setSemanticZoomLevel(level as 1 | 2 | 3)}
              title={`Semantic zoom ${level}`}
              className={`h-9 w-7 text-xs font-semibold transition-colors ${
                semanticZoomLevel === level ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              {level}
            </motion.button>
          ))}
        </div>
        <DockIcon onClick={undoCanvas} title="Undo last canvas change [z]">
          <Undo2 size={15} />
        </DockIcon>
        <DockIcon onClick={redoCanvas} title="Redo [y]">
          <Redo2 size={15} />
        </DockIcon>
        <DockDivider />

        {/* Canvas scenes */}
        <DockIcon onClick={() => useCanvasStore.getState().loadStarterTemplate()} title="Reload the checkout starter template">
          <RotateCcw size={15} />
        </DockIcon>
        <motion.button
          type="button"
          onClick={handleClear}
          whileHover={clearArmed ? undefined : { scale: 1.06 }}
          whileTap={clearArmed ? undefined : { scale: 0.92 }}
          transition={spring}
          title="Clear the whole canvas — click twice to confirm"
          aria-label="Clear canvas (click again to confirm)"
          className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors ${clearToneDanger(clearArmed)}`}
        >
          {clearArmed ? <Check size={15} /> : <Eraser size={15} />}
          <span className="hidden md:inline">{clearArmed ? "Sure?" : "Clear"}</span>
        </motion.button>

        {/* Tools flyout */}
        <div className="relative">
          <motion.button
            type="button"
            onClick={() => {
              setToolsOpen((o) => !o);
              setChaosOpen(false);
            }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            transition={spring}
            title="Tools — preferences, K8s view, outline, doctor, share"
            aria-expanded={toolsOpen}
            aria-label="Canvas tools menu"
            className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
              toolsOpen ? "bg-zinc-100 text-zinc-950" : "text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            <Wrench size={15} />
            <span className="hidden md:inline">Tools</span>
          </motion.button>
          <AnimatePresence initial={false}>
            {toolsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={spring}
                className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl"
              >
                <ToolFlyoutRow
                  Icon={SlidersHorizontal}
                  label="Canvas preferences"
                  hint="Grid, edges, minimap, effects"
                >
                  <CanvasPreferences />
                </ToolFlyoutRow>
                <ToolFlyoutRow Icon={Box} label="K8s view" hint="Expand service → pods" onClick={expandSelectedToK8s} />
                <ToolFlyoutRow
                  Icon={LineChart}
                  label="Cost analysis"
                  hint="You decide the price · live bill"
                  onClick={() => {
                    setToolsOpen(false);
                    openWorkspacePanel("costs");
                  }}
                />
                <ToolFlyoutRow Icon={ListChecks} label="Outline mode" hint="Screen-reader editor [o]" onClick={toggleOutline} active={outlineBadgeActive} />
                <ToolFlyoutRow Icon={HelpCircle} label="Design Doctor" hint="14 architecture rules [d]" onClick={toggleDoctor} active={doctorBadgeActive} />
                <ToolFlyoutRow Icon={Share} label="Share" hint="Read-only /s link" onClick={shareCanvas} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chaos */}
        <DockDivider />
        <div className="relative">
          <motion.button
            type="button"
            onClick={() => {
              setChaosOpen((o) => !o);
              setToolsOpen(false);
            }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            transition={spring}
            title="Chaos engineering — inject failures, spike traffic, kill nodes"
            aria-expanded={chaosOpen}
            aria-label="Chaos engineering menu"
            className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
              chaosActive
                ? "border border-red-500/70 bg-red-500/15 text-red-300"
                : chaosOpen
                  ? "bg-red-950 text-red-200"
                  : "text-red-300/90 hover:bg-red-950/60"
            }`}
          >
            <motion.span animate={chaosActive ? { scale: [1, 1.25, 1] } : { scale: 1 }} transition={chaosActive ? { repeat: Infinity, duration: 1.1 } : { duration: 0.2 }}>
              <Flame size={15} />
            </motion.span>
            <span className="hidden md:inline">{chaosActive ? "Incident" : "Chaos"}</span>
            {chaosActive && <span className="h-1.5 w-1.5 rounded-full bg-red-400" />}
          </motion.button>
          <AnimatePresence initial={false}>
            {chaosOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={spring}
                className="absolute right-0 top-full mt-2 w-[292px] overflow-hidden rounded-xl border border-red-900/50 bg-zinc-950 p-2.5 shadow-2xl"
              >
                <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-red-300">Break something on purpose</p>
                <div className="flex gap-1.5">
                  <select
                    value={chaosKind}
                    onChange={(e) => setChaosKind(e.target.value as ChaosKind)}
                    className="h-8 min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-1.5 text-[11px] text-zinc-200"
                    title="Chaos scenario"
                    aria-label="Chaos scenario"
                  >
                    {CHAOS_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <select
                    value={chaosScope}
                    onChange={(e) => setChaosScope(e.target.value)}
                    className="h-8 min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-1.5 text-[11px] text-zinc-200"
                    title="Blast radius"
                    aria-label="Blast radius"
                  >
                    <option value="all">everywhere</option>
                    <option value="selected">selected node</option>
                    {CLOUD_REGIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => injectChaos(chaosKind, chaosScope)}
                  className="mt-1.5 h-8 w-full rounded-md bg-red-500 text-xs font-semibold text-white transition-colors hover:bg-red-400"
                >
                  Inject
                </button>
                <p className="mb-1.5 mt-3 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  <Zap size={11} className="text-red-300" /> One-click breaks
                </p>
                <div className="grid gap-1.5">
                  {QUICK_BREAKS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => quickBreak(preset)}
                      title={preset.hint}
                      className="flex items-center justify-between rounded-md border border-zinc-800 px-2.5 py-1.5 text-[11.5px] text-zinc-300 transition-colors hover:border-red-600/60 hover:text-red-200"
                    >
                      {preset.label}
                      <Flame size={11} className="text-zinc-600" />
                    </button>
                  ))}
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 border-t border-zinc-800 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setChaosOpen(false);
                      openWorkspacePanel("postmortem");
                    }}
                    className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-zinc-800 text-[11.5px] text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
                    title="Open the auto-generated blameless post-mortem"
                  >
                    <FileText size={13} /> Post-mortem
                  </button>
                  {chaosActive ? (
                    <button
                      onClick={endChaos}
                      className="h-8 rounded-md border border-red-500 px-2.5 text-[11.5px] font-semibold text-red-300 hover:bg-red-950"
                    >
                      Clear chaos
                    </button>
                  ) : (
                    <FlaskConical size={16} className="text-zinc-700" />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Notices ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {(shareNotice ?? k8sNotice ?? chaosNotice) && (
          <motion.p
            key={shareNotice ?? k8sNotice ?? chaosNotice}
            role="status"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
            className="pointer-events-auto max-w-xl rounded-lg border border-zinc-700 bg-zinc-900/95 px-3 py-1.5 text-center text-[11.5px] text-zinc-200 shadow-xl"
          >
            {shareNotice ?? k8sNotice ?? chaosNotice}
          </motion.p>
        )}
      </AnimatePresence>

      {chaosActive && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-lg border border-red-900/60 bg-zinc-950 px-3 py-1 text-[11px] text-red-200 shadow-xl"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
          <span className="font-semibold uppercase tracking-[0.12em] text-red-300">Incident live</span>
          <span className="text-red-200/90">{activeChaos.kind.replace(/_/g, " ")}</span>
          <span className="text-zinc-500">·</span>
          <span className="text-zinc-300">
            {activeChaos.targetRegion
              ? `region ${activeChaos.targetRegion}`
              : activeChaos.targetNodeIds.length > 0
                ? `${activeChaos.targetNodeIds.length} node${activeChaos.targetNodeIds.length > 1 ? "s" : ""}`
                : "everywhere"}
          </span>
          <button
            type="button"
            onClick={() => openWorkspacePanel("postmortem")}
            className="ml-1 flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-0.5 font-semibold text-zinc-200 hover:bg-zinc-800"
          >
            <FileText size={12} /> Post-mortem
          </button>
        </motion.div>
      )}

      {chaosPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/95 px-3 py-1 text-[11.5px] text-zinc-200 shadow-xl"
        >
          <span>Chaos cleared — review what actually happened.</span>
          <button
            type="button"
            onClick={() => {
              setChaosPrompt(false);
              openWorkspacePanel("postmortem");
            }}
            className="flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-950 hover:bg-white"
          >
            <FileText size={12} /> Open post-mortem
          </button>
          <button
            type="button"
            onClick={() => setChaosPrompt(false)}
            className="text-zinc-500 hover:text-zinc-300"
            aria-label="Dismiss"
          >
            <X size={12} />
          </button>
        </motion.div>
      )}
    </div>
  );
}

function ToolFlyoutRow({
  Icon,
  label,
  hint,
  onClick,
  active = false,
  children,
}: {
  Icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  hint: string;
  onClick?: () => void;
  active?: boolean;
  children?: ReactNode;
}) {
  // A div (not a button) so nested interactive controls — like the
  // CanvasPreferences trigger — remain valid HTML.
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
        active ? "bg-zinc-800/80" : "hover:bg-zinc-800/60"
      }`}
    >
      <Icon size={15} className={active ? "text-sky-300" : "text-zinc-400"} />
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-medium text-zinc-100">{label}</span>
        <span className="block truncate text-[10.5px] text-zinc-500">{hint}</span>
      </span>
      {children}
    </div>
  );
}

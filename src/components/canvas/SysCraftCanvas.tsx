'use client';

import { useCallback, useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
} from "@xyflow/react";
import { ResourceNode } from "./ResourceNode";
import { RegionGroupNode } from "./RegionGroupNode";
import { TrafficParticleLayer } from "./TrafficParticleLayer";
import { FloatingToolbar } from "./FloatingToolbar";
import { OnboardingOverlay } from "./OnboardingOverlay";
import { OutlineMode } from "./OutlineMode";
import { DesignDoctorPanel } from "./DesignDoctorPanel";
import { useCanvasStore, type CanvasFlowNode } from "@/store/useCanvasStore";
import { CANVAS_ADD_PARAM, parseCanvasAddParam } from "@/store/canvasDeepLink";
import { useSimStore } from "@/store/useSimStore";
import { hydrateCustomResourcesFromDb } from "@/store/customResourceRegistry";
import { useCanvasPrefsStore } from "@/store/useCanvasPrefsStore";
import { NODE_DEFAULT_WIDTH, NODE_TIER_HEIGHTS } from "@/types/resource";

/**
 * Main infinite canvas: semantic zoom, region zones, 60fps particle overlay.
 * `nodeTypes` lives at module scope so custom nodes never remount on render.
 * Simulation lifecycle is owned here — worker (or main-thread fallback)
 * starts on mount inside a useEffect, never during SSR prerender.
 */

const nodeTypes = { resource: ResourceNode, region: RegionGroupNode };

const SYNC_DEBOUNCE_MS = 120;

function CanvasInner({ className }: { className: string }) {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const fitViewNonce = useCanvasStore((s) => s.fitViewNonce);
  const focusRequest = useCanvasStore((s) => s.focusRequest);
  const outlineMode = useCanvasStore((s) => s.outlineMode);
  const doctorOpen = useCanvasStore((s) => s.doctorOpen);
  const hydrated = useCanvasStore((s) => s.hydrated);
  const running = useSimStore((s) => s.running);
  // Whole-store subscription is fine: prefs change on explicit user action only.
  const prefs = useCanvasPrefsStore();
  const { fitView, setCenter, screenToFlowPosition } = useReactFlow();

  const gridVariant =
    prefs.gridStyle === "lines"
      ? BackgroundVariant.Lines
      : prefs.gridStyle === "cross"
        ? BackgroundVariant.Cross
        : BackgroundVariant.Dots;

  const defaultEdgeOptions = useMemo(
    () => ({ type: prefs.edgeStyle, animated: false, style: { strokeWidth: 1.6 } }),
    [prefs.edgeStyle],
  );

  useEffect(() => {
    useCanvasPrefsStore.getState().hydratePrefs();
    void hydrateCustomResourcesFromDb();
    return () => {
      useSimStore.getState().stopSimulation();
    };
  }, []);

  // A restored design boots the clock live; a first-run empty canvas must not
  // show "Pause" for a simulation with nothing in it. Waiting for `hydrated`
  // avoids racing the persisted-topology restore.
  useEffect(() => {
    if (!hydrated) return;
    if (useCanvasStore.getState().nodes.length === 0) return;
    if (useSimStore.getState().running) return;
    useSimStore.getState().startSimulation(() => useCanvasStore.getState().toGraphTopology());
  }, [hydrated]);

  // Hosts that don't run the workspace rehydrate (e.g. LabWorkspace) never flip
  // `hydrated`; still boot the clock when they mount with a populated canvas.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (useCanvasStore.getState().hydrated) return;
      if (useCanvasStore.getState().nodes.length === 0) return;
      if (useSimStore.getState().running) return;
      useSimStore.getState().startSimulation(() => useCanvasStore.getState().toGraphTopology());
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    useCanvasStore.getState().setEdgeStyle(prefs.edgeStyle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply on hydrate + changes only
  }, [prefs.edgeStyle, prefs.hydrated]);

  useEffect(() => {
    if (fitViewNonce === 0) return;
    const timer = setTimeout(() => {
      void fitView({ padding: 0.2, duration: 400 });
    }, 60);
    return () => clearTimeout(timer);
  }, [fitViewNonce, fitView]);

  useEffect(() => {
    if (!focusRequest) return;
    const target = useCanvasStore.getState().nodes.find((node) => node.id === focusRequest.nodeId);
    if (!target) return;
    const width = target.data.width ?? NODE_DEFAULT_WIDTH;
    const height = target.data.height ?? NODE_TIER_HEIGHTS[target.data.semanticZoomLevel ?? 2];
    void setCenter(target.position.x + width / 2, target.position.y + height / 2, {
      zoom: 1.1,
      duration: 420,
    });
  }, [focusRequest, setCenter]);

  // Wiki → canvas handoff: /canvas?add=postgres_db,redis_cache drops the
  // requested primitives on arrival. The drop waits for the persisted
  // topology to be restored first, otherwise the restore would overwrite it.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const requested = parseCanvasAddParam(window.location.search);
    if (requested.length === 0) return;

    // Consume the param so a refresh (or Back) doesn't re-add the blocks.
    const params = new URLSearchParams(window.location.search);
    params.delete(CANVAS_ADD_PARAM);
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );

    const store = useCanvasStore.getState();
    const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    requested.forEach((resourceId, index) => {
      const jitter = (useCanvasStore.getState().nodes.length % 8) * 36;
      store.addNode(resourceId, {
        x: center.x - 116 + jitter + index * 48,
        y: center.y - 64 + jitter + index * 34,
      });
    });
    useCanvasStore.setState((state) => ({ fitViewNonce: state.fitViewNonce + 1 }));
    // A wiki handoff should land on a live canvas: start the clock so the
    // dropped primitives immediately show telemetry (an untouched empty
    // first-run canvas still stays paused).
    if (!useSimStore.getState().running) {
      useSimStore.getState().startSimulation(() => useCanvasStore.getState().toGraphTopology());
    }
  }, [hydrated, screenToFlowPosition]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (useSimStore.getState().running) {
        useSimStore.getState().syncTopology();
      }
    }, SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [nodes, edges]);

  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      useCanvasStore.getState().addEdge(connection.source, connection.target);
    }
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        useCanvasStore.getState().selectAllNodes();
        return;
      }
      if (event.key === "Escape") {
        useCanvasStore.getState().clearSelection();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onNodesDelete = (deleted: CanvasFlowNode[]) => {
    const store = useCanvasStore.getState();
    if (store.selectedNodeId && deleted.some((node) => node.id === store.selectedNodeId)) {
      store.setSelectedNodeId(null);
    }
  };

  return (
    <div
      className={`relative overflow-hidden bg-zinc-950 ${running ? "sim-running" : ""} ${
        prefs.animations ? "" : "canvas-no-anim"
      } ${className}`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodesDelete={onNodesDelete}
        onNodeClick={(event, node) => {
          // Modifier clicks multi-select: keep React Flow's selection state and
          // mirror the last-clicked node into the single-selection inspector.
          useCanvasStore.getState().setSelectedNodeId(node.id);
          void event;
        }}
        onPaneClick={() => useCanvasStore.getState().setSelectedNodeId(null)}
        multiSelectionKeyCode={["Shift", "Control", "Meta"]}
        selectionKeyCode="Shift"
        nodeTypes={nodeTypes}
        deleteKeyCode={["Delete", "Backspace"]}
        colorMode="dark"
        fitView
        minZoom={0.2}
        maxZoom={2.5}
        zoomOnScroll={false}
        panOnScroll
        panOnScrollSpeed={0.6}
        zoomOnPinch
        zoomOnDoubleClick={false}
        selectionOnDrag
        panOnDrag={[1, 2]}
        snapToGrid={prefs.snapToGrid}
        snapGrid={[prefs.snapGridSize, prefs.snapGridSize]}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineStyle={{ stroke: "#7dd3fc", strokeWidth: 1.6 }}
        connectionRadius={30}
      >
        {prefs.showGrid && (
          <Background variant={gridVariant} gap={prefs.snapToGrid ? prefs.snapGridSize : 24} size={1.5} />
        )}
        <Controls position="bottom-right" />
        {prefs.showMinimap && <MiniMap position="bottom-left" pannable zoomable />}
      </ReactFlow>
      <TrafficParticleLayer />
      <FloatingToolbar />
      {!outlineMode && nodes.length === 0 && <OnboardingOverlay />}
      {!outlineMode && (
        <DesignDoctorPanel open={doctorOpen} onClose={() => useCanvasStore.getState().setDoctorOpen(false)} />
      )}
      {outlineMode && <OutlineMode />}
    </div>
  );
}

export function SysCraftCanvas({
  className = "h-[100dvh] w-screen",
}: {
  className?: string;
} = {}) {
  return (
    <ReactFlowProvider>
      <CanvasInner className={className} />
    </ReactFlowProvider>
  );
}

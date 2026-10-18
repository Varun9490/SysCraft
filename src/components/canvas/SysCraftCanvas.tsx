'use client';

import { useEffect, useMemo } from "react";
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

const SYNC_DEBOUNCE_MS = 250;

function CanvasInner({ className }: { className: string }) {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const fitViewNonce = useCanvasStore((s) => s.fitViewNonce);
  const focusRequest = useCanvasStore((s) => s.focusRequest);
  const outlineMode = useCanvasStore((s) => s.outlineMode);
  const doctorOpen = useCanvasStore((s) => s.doctorOpen);
  const running = useSimStore((s) => s.running);
  // Whole-store subscription is fine: prefs change on explicit user action only.
  const prefs = useCanvasPrefsStore();
  const { fitView, setCenter } = useReactFlow();

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
    useSimStore.getState().startSimulation(() => useCanvasStore.getState().toGraphTopology());
    return () => {
      useSimStore.getState().stopSimulation();
    };
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (useSimStore.getState().running) {
        useSimStore.getState().syncTopology();
      }
    }, SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [nodes, edges]);

  const onConnect = (connection: Connection) => {
    if (connection.source && connection.target) {
      useCanvasStore.getState().addEdge(connection.source, connection.target);
    }
  };

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
        onNodeClick={(_, node) => useCanvasStore.getState().setSelectedNodeId(node.id)}
        onPaneClick={() => useCanvasStore.getState().setSelectedNodeId(null)}
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

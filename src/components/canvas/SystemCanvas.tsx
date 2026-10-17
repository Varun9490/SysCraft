'use client';

import { useEffect } from "react";
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
import { useCanvasStore } from "@/store/useCanvasStore";
import { useSimStore } from "@/store/useSimStore";
import { hydrateCustomResourcesFromDb } from "@/store/customResourceRegistry";

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
  const { fitView } = useReactFlow();

  useEffect(() => {
    void hydrateCustomResourcesFromDb();
    useSimStore.getState().startSimulation(() => useCanvasStore.getState().toGraphTopology());
    return () => {
      useSimStore.getState().stopSimulation();
    };
  }, []);

  useEffect(() => {
    if (fitViewNonce === 0) return;
    const timer = setTimeout(() => {
      void fitView({ padding: 0.2, duration: 400 });
    }, 60);
    return () => clearTimeout(timer);
  }, [fitViewNonce, fitView]);

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

  return (
    <div className={`relative overflow-hidden bg-zinc-950 ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => useCanvasStore.getState().setSelectedNodeId(node.id)}
        onPaneClick={() => useCanvasStore.getState().setSelectedNodeId(null)}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        minZoom={0.2}
        maxZoom={2.5}
        defaultEdgeOptions={{ type: "smoothstep", animated: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} />
        <Controls position="bottom-right" />
        <MiniMap position="bottom-left" pannable zoomable />
      </ReactFlow>
      <TrafficParticleLayer />
      <FloatingToolbar />
    </div>
  );
}

export function SystemCanvas({
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

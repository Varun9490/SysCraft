'use client';

import { useCanvasStore } from "@/store/useCanvasStore";

/** Node display label resolved by id — used by edge label chips + inspectors. */
export function getNodeLabel(nodeId: string): string {
  const node = useCanvasStore.getState().nodes.find((n) => n.id === nodeId);
  return String(node?.data.label ?? nodeId);
}

import { describe, expect, it } from "vitest";
import type { Edge } from "@xyflow/react";
import { useCanvasStore, type CanvasEdgeData, type CanvasEdgeRouting, decorateEdge } from "@/store/useCanvasStore";

/**
 * Regression locks for the canvas link customization + block comment seams
 * (see scripts/canvas-smoke.mjs for the browser-level probes).
 */

const ROUTING: CanvasEdgeRouting = "smoothstep";

function edge(data: CanvasEdgeData = {}): Edge<CanvasEdgeData> {
  return { id: "e_test", source: "a", target: "b", data, selected: false };
}

describe("decorateEdge appearance mapping", () => {
  it("defaults: condition colour, 1.6 weight, no marker, no dash", () => {
    const styled = decorateEdge(edge(), ROUTING);
    expect(styled.style?.stroke).toBe("#67e8f9");
    expect(styled.style?.strokeWidth).toBe(1.6);
    expect(styled.style?.strokeDasharray).toBeUndefined();
    expect(styled.markerEnd).toBeUndefined();
    expect(styled.type).toBe(ROUTING);
  });

  it("custom colour overrides the condition colour", () => {
    const styled = decorateEdge(edge({ condition: "cache_hit", color: "#ff00aa" }), ROUTING);
    expect(styled.style?.stroke).toBe("#ff00aa");
    // label chip should use the custom colour as well
    expect(styled.labelStyle?.fill).toBe("#ff00aa");
  });

  it("invalid hex falls back to the condition colour", () => {
    const styled = decorateEdge(edge({ condition: "error", color: "javascript:alert(1)" as unknown as string }), ROUTING);
    expect(styled.style?.stroke).toBe("#fb7185");
  });

  it("dashed / dotted map to seamless marching segments", () => {
    expect(decorateEdge(edge({ lineStyle: "dashed" }), ROUTING).style?.strokeDasharray).toBe("6 5");
    expect(decorateEdge(edge({ lineStyle: "dotted" }), ROUTING).style?.strokeDasharray).toBe("2 9");
    expect(decorateEdge(edge({ lineStyle: "solid" }), ROUTING).style?.strokeDasharray).toBeUndefined();
  });

  it("weight clamps into 0.75..5 and publishes the --edge-width CSS var", () => {
    const fat = decorateEdge(edge({ width: 50 }), ROUTING);
    expect(fat.style?.strokeWidth).toBe(5);
    expect((fat.style as Record<string, unknown>)["--edge-width"]).toBe("5px");
    const thin = decorateEdge(edge({ width: 0.01 }), ROUTING);
    expect(thin.style?.strokeWidth).toBe(0.75);
  });

  it("arrow markers carry the resolved stroke colour; none omits them", () => {
    const markerOf = (e: Edge<CanvasEdgeData>) => e.markerEnd as { type?: string; color?: string } | undefined;
    const arrow = decorateEdge(edge({ color: "#fbbf24", marker: "arrow" }), ROUTING);
    expect(markerOf(arrow)?.type).toBe("arrow");
    expect(markerOf(arrow)?.color).toBe("#fbbf24");
    const closed = decorateEdge(edge({ marker: "arrowClosed" }), ROUTING);
    expect(markerOf(closed)?.type).toBe("arrowclosed");
    expect(decorateEdge(edge(), ROUTING).markerEnd).toBeUndefined();
  });
});

describe("setNodeComment store action", () => {
  it("adds, updates, and clears a comment on a node", () => {
    const store = useCanvasStore.getState();
    const id = store.addNode("rest_service", { x: 10, y: 10 });
    try {
      store.setNodeComment(id, "Handles 2k peak writes; revisit code length after hash rotation.");
      expect(useCanvasStore.getState().nodes.find((node) => node.id === id)?.data.comment).toBe(
        "Handles 2k peak writes; revisit code length after hash rotation.",
      );

      store.setNodeComment(id, "  trimmed  ");
      expect(useCanvasStore.getState().nodes.find((node) => node.id === id)?.data.comment).toBe("trimmed");

      store.setNodeComment(id, "   ");
      expect(useCanvasStore.getState().nodes.find((node) => node.id === id)?.data.comment).toBeUndefined();
    } finally {
      useCanvasStore.getState().removeNode(id);
    }
  });
});

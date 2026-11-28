import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { compressToEncodedURIComponent } from "lz-string";
import {
  MAX_SCENE_DECODED_CHARS,
  MAX_SCENE_ENCODED_CHARS,
  flushPendingCanvasWrite,
} from "../canvasPersistence";
import { SCENE_VERSION, useCanvasStore, type CanvasFlowEdge, type CanvasFlowNode } from "../useCanvasStore";

function sceneNode(id: string, label = id) {
  return {
    id,
    position: { x: 10, y: 20 },
    resourceId: "rest_service",
    label,
    overrides: { clientRps: 500 },
  };
}

describe("external canvas scene sanitization", () => {
  beforeEach(() => {
    useCanvasStore.getState().clearCanvas();
  });

  afterEach(() => {
    flushPendingCanvasWrite();
    useCanvasStore.getState().clearCanvas();
    flushPendingCanvasWrite();
  });

  it("keeps the first node when a shared scene repeats an id", () => {
    const payload = {
      version: SCENE_VERSION,
      nodes: [sceneNode("n_duplicate", "first"), sceneNode("n_duplicate", "second")],
      edges: [],
    };

    expect(useCanvasStore.getState().deserializeScene(JSON.stringify(payload))).toBe(true);
    expect(useCanvasStore.getState().nodes).toHaveLength(1);
    expect(useCanvasStore.getState().nodes[0]?.data.label).toBe("first");
  });

  it("round-trips a valid compressed scene without losing user data", () => {
    const store = useCanvasStore.getState();
    const gatewayId = store.addNode("api_gateway", { x: 40, y: 80 }, "Public gateway");
    const serviceId = store.addNode("rest_service", { x: 320, y: 80 }, "Checkout API");
    store.updateNodeOverrides(gatewayId, { clientRps: 750, multiAz: true, region: "eu-west-1" });
    store.updateNodeSize(serviceId, { width: 280, height: 148 });
    store.setNodeAccent(serviceId, "#34d399");
    store.setNodeComment(serviceId, "Retries are bounded at the client.");
    const edgeId = store.addEdge(gatewayId, serviceId);
    expect(edgeId).not.toBeNull();
    store.updateEdgeData(edgeId!, {
      label: "HTTPS",
      condition: "read",
      color: "#67e8f9",
      lineStyle: "dashed",
      width: 2.4,
      marker: "arrowClosed",
    });

    const serialized = useCanvasStore.getState().serializeScene();
    expect(useCanvasStore.getState().deserializeScene(serialized)).toBe(true);
    expect(useCanvasStore.getState().serializeScene()).toBe(serialized);
  });

  it("rejects oversized encoded input without replacing the current scene", () => {
    const before = useCanvasStore.getState().serializeScene();

    expect(useCanvasStore.getState().deserializeScene("x".repeat(MAX_SCENE_ENCODED_CHARS + 1))).toBe(false);
    expect(useCanvasStore.getState().serializeScene()).toBe(before);
  });

  it("rejects a small compressed payload that expands beyond the decoded cap", () => {
    const compressed = compressToEncodedURIComponent(
      JSON.stringify({
        version: SCENE_VERSION,
        nodes: [],
        edges: [],
        padding: "x".repeat(MAX_SCENE_DECODED_CHARS),
      }),
    );
    expect(compressed.length).toBeLessThan(MAX_SCENE_ENCODED_CHARS);

    expect(useCanvasStore.getState().deserializeScene(compressed)).toBe(false);
  });

  it("drops dangling, self-referencing, and duplicate edges from a shared payload", () => {
    const payload = {
      version: SCENE_VERSION,
      nodes: [sceneNode("n_1"), sceneNode("n_2")],
      edges: [
        { id: "e_first", source: "n_1", target: "n_2", label: "first" },
        { id: "e_pair_dupe", source: "n_1", target: "n_2", label: "second" },
        { id: "e_first", source: "n_2", target: "n_1" },
        { id: "e_dangling", source: "n_1", target: "missing" },
        { id: "e_self", source: "n_1", target: "n_1" },
      ],
    };

    expect(useCanvasStore.getState().deserializeScene(JSON.stringify(payload))).toBe(true);
    expect(useCanvasStore.getState().edges).toHaveLength(1);
    expect(useCanvasStore.getState().edges[0]?.id).toBe("e_first");
    expect(useCanvasStore.getState().edges[0]?.data?.label).toBe("first");
  });

  it("sanitizes direct topology replacements before store insertion", () => {
    const node = (id: string, x: number): CanvasFlowNode => ({
      id,
      type: "resource",
      position: { x, y: 0 },
      data: { resourceId: "rest_service", label: id, overrides: {}, semanticZoomLevel: 2 },
    });
    const nodes = [node("n_1", 0), node("n_1", 10), node("n_2", Number.NaN)];
    const edges: CanvasFlowEdge[] = [
      { id: "e_1", source: "n_1", target: "n_2", data: {} },
      { id: "e_2", source: "n_1", target: "missing", data: {} },
    ];

    useCanvasStore.getState().replaceTopology(nodes, edges);

    expect(useCanvasStore.getState().nodes.map((entry) => entry.id)).toEqual(["n_1"]);
    expect(useCanvasStore.getState().edges).toHaveLength(0);
  });
});

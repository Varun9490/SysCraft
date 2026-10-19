import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CANVAS_PERSIST_VERSION,
  MAX_PERSISTED_NODES,
  flushPendingCanvasWrite,
  createDebouncedCanvasStorage,
  migratePersistedCanvas,
  sanitizePersistedCanvas,
  type PersistedCanvasState,
} from "../canvasPersistence";

/** Round-trip helper: anything a component can serialize must survive. */
function persistable(state: unknown): string {
  return JSON.stringify(state);
}

const VALID_NODE = {
  id: "n_1",
  position: { x: 10, y: 20 },
  data: {
    resourceId: "api_gateway",
    label: "Edge gateway",
    semanticZoomLevel: 2,
    overrides: { replicationFactor: 3, region: "eu-west-1", rateLimitRps: 5000, cacheHitRate: 0.8 },
    comment: "Terminates TLS at the edge",
  },
  selected: false,
};

function validState() {
  return {
    nodes: [VALID_NODE, { ...VALID_NODE, id: "n_2", data: { ...VALID_NODE.data, resourceId: "postgres_db" } }],
    edges: [{ id: "e_1", source: "n_1", target: "n_2", data: { condition: "write", color: "#34d399" } }],
    sceneName: "Checkout prod",
    edgeStyle: "bezier",
    semanticZoomLevel: 3,
  };
}

describe("sanitizePersistedCanvas", () => {
  it("keeps a valid topology with all user data intact", () => {
    const out = sanitizePersistedCanvas(validState());
    expect(out).toBeDefined();
    const node0 = out?.nodes[0];
    const edge0 = out?.edges[0];
    expect(out?.nodes).toHaveLength(2);
    expect(node0?.data.label).toBe("Edge gateway");
    expect(node0?.data.overrides.replicationFactor).toBe(3);
    expect(node0?.data.comment).toBe("Terminates TLS at the edge");
    expect(edge0?.data?.condition).toBe("write");
    expect(edge0?.data?.color).toBe("#34d399");
    expect(out?.sceneName).toBe("Checkout prod");
    expect(out?.edgeStyle).toBe("bezier");
    expect(out?.semanticZoomLevel).toBe(3);
  });

  it("drops malformed nodes and dangling edges instead of crashing", () => {
    const out = sanitizePersistedCanvas({
      nodes: [VALID_NODE, { id: "bad" }, null, { id: "n_x", position: { x: "nan", y: 0 }, data: {} }, "nope"],
      edges: [
        { id: "e_1", source: "n_1", target: "n_2", data: {} },
        { id: "e_2", source: "n_1", target: "n_missing", data: {} },
        { id: "e_3", source: "n_1", target: "n_1", data: {} },
        42,
      ],
      sceneName: "x",
    });
    expect(out?.nodes).toHaveLength(1);
    expect(out?.edges).toHaveLength(0);
  });

  it("strips invalid edge data values, keeps the edge wired", () => {
    const out = sanitizePersistedCanvas({
      nodes: validState().nodes,
      edges: [
        {
          id: "e_bad",
          source: "n_1",
          target: "n_2",
          data: {
            condition: "DROP TABLE",
            color: "url(javascript:alert(1))",
            lineStyle: 7,
            width: "lots",
            marker: "explode",
          },
        },
      ],
    });
    expect(out?.edges).toHaveLength(1);
    expect(out?.edges[0].data).toEqual({});
  });

  it("drops duplicate edge ids (first writer wins)", () => {
    const out = sanitizePersistedCanvas({
      nodes: [{ ...VALID_NODE, id: "n_1" }, { ...VALID_NODE, id: "n_2" }],
      edges: [
        { id: "e_dup", source: "n_1", target: "n_2", data: {} },
        { id: "e_dup", source: "n_2", target: "n_1", data: {} },
      ],
    });
    expect(out?.edges).toHaveLength(1);
  });

  it("caps pathological payloads at the node limit", () => {
    const flood = Array.from({ length: MAX_PERSISTED_NODES + 50 }, (_, i) => ({
      ...VALID_NODE,
      id: `n_${i}`,
    }));
    const out = sanitizePersistedCanvas({ nodes: flood, edges: [] });
    expect(out?.nodes.length).toBe(MAX_PERSISTED_NODES);
  });

  it("rejects non-objects and missing arrays outright", () => {
    expect(sanitizePersistedCanvas(null)).toBeUndefined();
    expect(sanitizePersistedCanvas("json string")).toBeUndefined();
    expect(sanitizePersistedCanvas({ nodes: [] })).toBeUndefined();
  });
});

describe("migratePersistedCanvas", () => {
  it("accepts the current version and older payloads", () => {
    expect(migratePersistedCanvas(validState(), CANVAS_PERSIST_VERSION)).toBeDefined();
    expect(migratePersistedCanvas(validState(), 0)).toBeDefined();
  });

  it("refuses future versions for a clean fresh start", () => {
    expect(migratePersistedCanvas(validState(), CANVAS_PERSIST_VERSION + 1)).toBeUndefined();
  });

  it("never throws on garbage — returns undefined", () => {
    expect(migratePersistedCanvas(undefined, 1)).toBeUndefined();
    expect(migratePersistedCanvas("{corrupted", 1)).toBeUndefined();
  });
});

describe("debounced canvas storage", () => {
  const base = new Map<string, string>();
  let writes = 0;

  beforeEach(() => {
    writes = 0;
    base.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces a rapid burst of writes into the last value", () => {
    const storage = createDebouncedCanvasStorage(() => ({
      getItem: (name) => base.get(name) ?? null,
      setItem(name, value) {
        writes += 1;
        base.set(name, value);
      },
      removeItem: (name) => void base.delete(name),
    }));

    for (let i = 0; i < 50; i += 1) storage.setItem("k", persistable(validState()).slice(0, 3000) + `#${i}`);
    expect(writes).toBe(0); // burst coalesced, nothing written yet
    vi.advanceTimersByTime(700); // trailing window elapses → exactly one write
    flushPendingCanvasWrite(); // extra flush is a no-op once the timer ran
    expect(writes).toBe(1);
    expect(base.get("k")).toContain("#49");
  });

  it("flushes the pending write immediately on pagehide", () => {
    const storage = createDebouncedCanvasStorage(() => ({
      getItem: () => null,
      setItem(name, value) {
        writes += 1;
        base.set(name, value);
      },
      removeItem: () => {},
    }));

    storage.setItem("k", persistable(validState()));
    expect(writes).toBe(0);
    flushPendingCanvasWrite();
    expect(writes).toBe(1);
    expect(base.get("k")).toContain('"sceneName":"Checkout prod"');
  });
});

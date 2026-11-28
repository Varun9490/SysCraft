import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CANVAS_PERSIST_VERSION,
  CANVAS_STORAGE_KEY,
  MAX_PERSISTED_EDGES,
  MAX_PERSISTED_NODES,
  canvasStorageKeyForScope,
  createDebouncedCanvasStorage,
  discardPendingCanvasWrite,
  flushPendingCanvasWrite,
  migratePersistedCanvas,
  sanitizePersistedCanvas,
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

  it("drops duplicate node ids before resolving edge references", () => {
    const out = sanitizePersistedCanvas({
      nodes: [
        { ...VALID_NODE, id: "n_1", data: { ...VALID_NODE.data, label: "first" } },
        { ...VALID_NODE, id: "n_1", data: { ...VALID_NODE.data, label: "second" } },
        { ...VALID_NODE, id: "n_2" },
      ],
      edges: [{ id: "e_1", source: "n_1", target: "n_2", data: {} }],
    });
    expect(out?.nodes.map((node) => node.data.label)).toEqual(["first", "Edge gateway"]);
    expect(out?.edges).toHaveLength(1);
  });

  it("rejects non-finite positions and sizes and strips non-finite overrides", () => {
    const out = sanitizePersistedCanvas({
      nodes: [
        VALID_NODE,
        { ...VALID_NODE, id: "n_nan", position: { x: Number.NaN, y: 0 } },
        { ...VALID_NODE, id: "n_inf", position: { x: 0, y: Number.POSITIVE_INFINITY } },
        {
          ...VALID_NODE,
          id: "n_2",
          width: Number.NaN,
          height: Number.POSITIVE_INFINITY,
          data: {
            ...VALID_NODE.data,
            overrides: { clientRps: Number.NaN, region: "us-east-1", rateLimitRps: Number.POSITIVE_INFINITY },
          },
        },
      ],
      edges: [],
    });
    expect(out?.nodes.map((node) => node.id)).toEqual(["n_1", "n_2"]);
    expect(out?.nodes[1]?.data.width).toBeUndefined();
    expect(out?.nodes[1]?.data.overrides).toEqual({ region: "us-east-1" });
  });

  it("caps pathological payloads at the node limit", () => {
    const flood = Array.from({ length: MAX_PERSISTED_NODES + 50 }, (_, i) => ({
      ...VALID_NODE,
      id: `n_${i}`,
    }));
    const out = sanitizePersistedCanvas({ nodes: flood, edges: [] });
    expect(out?.nodes.length).toBe(MAX_PERSISTED_NODES);
  });

  it("caps edges and keeps only unique directed pairs", () => {
    const nodes = Array.from({ length: MAX_PERSISTED_NODES }, (_, i) => ({ ...VALID_NODE, id: `n_${i}` }));
    const edges: Array<{ id: string; source: string; target: string; data: Record<string, never> }> = [];
    for (let source = 0; source < nodes.length; source += 1) {
      for (let target = 0; target < nodes.length; target += 1) {
        if (source === target) continue;
        edges.push({ id: `e_${source}_${target}`, source: `n_${source}`, target: `n_${target}`, data: {} });
      }
    }

    const out = sanitizePersistedCanvas({ nodes, edges });
    expect(out?.edges).toHaveLength(MAX_PERSISTED_EDGES);
    expect(new Set(out?.edges.map((edge) => `${edge.source}>${edge.target}`)).size).toBe(MAX_PERSISTED_EDGES);
  });

  it("rejects non-objects and missing arrays outright", () => {
    expect(sanitizePersistedCanvas(null)).toBeUndefined();
    expect(sanitizePersistedCanvas("json string")).toBeUndefined();
    expect(sanitizePersistedCanvas({ nodes: [] })).toBeUndefined();
  });

  it("bounds identifiers and user strings before they reach the store", () => {
    const longKey = `k${"x".repeat(50)}`;
    const out = sanitizePersistedCanvas({
      nodes: [
        VALID_NODE,
        { ...VALID_NODE, id: "n".repeat(65) },
        { ...VALID_NODE, id: "n_resource", data: { ...VALID_NODE.data, resourceId: "r".repeat(129) } },
        {
          ...VALID_NODE,
          id: "n_2",
          data: {
            ...VALID_NODE.data,
            label: "L".repeat(100),
            comment: "C".repeat(2_100),
            overrides: { region: "R".repeat(250), [longKey]: true },
          },
        },
      ],
      edges: [
        { id: "e".repeat(97), source: "n_2", target: "n_1", data: {} },
        { id: "e_1", source: "n_2", target: "n_1", data: { label: "E".repeat(200) } },
      ],
      sceneName: "S".repeat(100),
    });

    expect(out?.nodes).toHaveLength(2);
    expect(out?.nodes[0]?.id).toBe("n_1");
    expect(out?.nodes[1]?.id).toBe("n_2");
    expect(out?.nodes[1]?.data.label).toHaveLength(80);
    expect(out?.nodes[1]?.data.comment).toHaveLength(2_000);
    expect(out?.nodes[1]?.data.overrides).toEqual({ region: "R".repeat(200) });
    expect(out?.edges).toHaveLength(1);
    expect(out?.edges[0]?.data?.label).toHaveLength(120);
    expect(out?.sceneName).toHaveLength(80);
  });

  it("restores the resource renderer type, not React Flow's default node", () => {
    const out = sanitizePersistedCanvas(validState());
    expect(out?.nodes[0]?.type).toBe("resource");
  });

  it("keeps deterministic fuzz payloads bounded, finite, and reference-safe", () => {
    let seed = 0x5eed1234;
    const random = () => {
      seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
      return seed / 0x1_0000_0000;
    };
    const int = (max: number) => Math.floor(random() * max);
    const pick = <T,>(values: readonly T[]): T => values[int(values.length)]!;
    const scalar = [undefined, null, true, false, 0, -1, Number.NaN, Number.POSITIVE_INFINITY, "", "x".repeat(300)];

    for (let run = 0; run < 40; run += 1) {
      const nodes: unknown[] = [
        { ...VALID_NODE, id: "n_1" },
        { ...VALID_NODE, id: "n_2" },
      ];
      for (let i = 0; i < MAX_PERSISTED_NODES + 20; i += 1) {
        nodes.push({
          id: pick([`n_${i}`, "n_1", "n".repeat(80), ...scalar]),
          position: { x: pick([int(1_000), Number.NaN, Number.POSITIVE_INFINITY, ...scalar]), y: int(1_000) },
          data: {
            resourceId: pick(["rest_service", "postgres_db", "r".repeat(140), ...scalar]),
            label: pick(["Node", "L".repeat(100), ...scalar]),
            overrides: { clientRps: pick([500, Number.NaN, Number.NEGATIVE_INFINITY, ...scalar]), region: pick(["us-east-1", "r".repeat(250), ...scalar]) },
            width: pick([216, Number.NaN, Number.POSITIVE_INFINITY]),
            height: pick([104, Number.NaN, Number.NEGATIVE_INFINITY]),
          },
        });
      }
      const edges: unknown[] = Array.from({ length: MAX_PERSISTED_EDGES + 20 }, (_, i) => ({
        id: pick([`e_${i}`, "e_0", "e".repeat(110), ...scalar]),
        source: pick(["n_1", "n_2", "missing", "n".repeat(80), ...scalar]),
        target: pick(["n_1", "n_2", "missing", "n".repeat(80), ...scalar]),
        data: { label: pick(["flow", "E".repeat(140), ...scalar]), width: pick([1.6, Number.NaN, Number.POSITIVE_INFINITY]) },
      }));

      let out: ReturnType<typeof sanitizePersistedCanvas> = undefined;
      expect(() => {
        out = sanitizePersistedCanvas({ nodes, edges, sceneName: pick(["Fuzz", "S".repeat(100), ...scalar]) });
      }).not.toThrow();
      expect(out).toBeDefined();
      expect(out!.nodes.length).toBeLessThanOrEqual(MAX_PERSISTED_NODES);
      expect(out!.edges.length).toBeLessThanOrEqual(MAX_PERSISTED_EDGES);
      const nodeIds = new Set(out!.nodes.map((node) => node.id));
      expect(nodeIds.size).toBe(out!.nodes.length);
      const edgeIds = new Set<string>();
      const edgePairs = new Set<string>();
      for (const node of out!.nodes) {
        expect(node.id.length).toBeLessThanOrEqual(64);
        expect(Number.isFinite(node.position.x)).toBe(true);
        expect(Number.isFinite(node.position.y)).toBe(true);
        expect(node.data.label.length).toBeLessThanOrEqual(80);
        for (const value of Object.values(node.data.overrides)) {
          if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
        }
      }
      for (const edge of out!.edges) {
        expect(nodeIds.has(edge.source)).toBe(true);
        expect(nodeIds.has(edge.target)).toBe(true);
        expect(edgeIds.has(edge.id)).toBe(false);
        expect(edgePairs.has(`${edge.source}>${edge.target}`)).toBe(false);
        edgeIds.add(edge.id);
        edgePairs.add(`${edge.source}>${edge.target}`);
      }
    }
  });
});

describe("canvas storage scopes", () => {
  it("keeps the freeform workspace and each lab in separate keys", () => {
    expect(canvasStorageKeyForScope("main")).toBe(CANVAS_STORAGE_KEY);
    expect(canvasStorageKeyForScope("lab:bitly-url-shortener")).toBe(
      `${CANVAS_STORAGE_KEY}:lab:bitly-url-shortener`,
    );
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

  it("discards a pending write without touching storage", () => {
    const storage = createDebouncedCanvasStorage(() => ({
      getItem: () => null,
      setItem(name, value) {
        writes += 1;
        base.set(name, value);
      },
      removeItem: () => {},
    }));

    storage.setItem("k", persistable(validState()));
    discardPendingCanvasWrite();
    vi.advanceTimersByTime(700);

    expect(writes).toBe(0);
    expect(base.has("k")).toBe(false);
  });
});

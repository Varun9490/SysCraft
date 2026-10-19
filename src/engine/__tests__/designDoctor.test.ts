import { describe, expect, it } from "vitest";
import { computeRunPreflight, nodesOnCycles, runDesignDoctor, type DoctorEdgeInput, type DoctorNodeInput } from "../designDoctor";

function node(id: string, resourceId: string, overrides: DoctorNodeInput["overrides"] = {}): DoctorNodeInput {
  return { id, resourceId, label: id, overrides };
}

function edge(source: string, target: string): DoctorEdgeInput {
  return { id: `${source}->${target}`, source, target };
}

describe("designDoctor", () => {
  it("flags a single-replica service on the critical path", () => {
    const report = runDesignDoctor(
      [node("gw", "api_gateway"), node("api", "rest_service", { replicationFactor: 1 })],
      [edge("gw", "api")],
    );
    const finding = report.findings.find((f) => f.ruleId === "spof-single-replica" && f.nodeIds.includes("api"));
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("critical");
  });

  it("does not flag a replicated multi-AZ service", () => {
    const report = runDesignDoctor(
      [node("gw", "api_gateway"), node("api", "rest_service", { replicationFactor: 3, multiAz: true })],
      [edge("gw", "api")],
    );
    expect(report.findings.some((f) => f.ruleId === "spof-single-replica" && f.nodeIds.includes("api"))).toBe(false);
    expect(report.findings.some((f) => f.ruleId === "spof-single-az" && f.nodeIds.includes("api"))).toBe(false);
  });

  it("flags multi-replica single-AZ services", () => {
    const report = runDesignDoctor(
      [node("gw", "api_gateway"), node("api", "rest_service", { replicationFactor: 3, multiAz: false })],
      [edge("gw", "api")],
    );
    expect(report.findings.some((f) => f.ruleId === "spof-single-az" && f.nodeIds.includes("api"))).toBe(true);
  });

  it("flags client-to-database direct edges", () => {
    const report = runDesignDoctor(
      [node("edge", "cdn_edge"), node("db", "postgres_db")],
      [edge("edge", "db")],
    );
    expect(report.findings.some((f) => f.ruleId === "direct-datastore-from-client")).toBe(true);
  });

  it("flags a queue with no consumer", () => {
    const report = runDesignDoctor(
      [node("api", "rest_service"), node("q", "message_queue")],
      [edge("api", "q")],
    );
    expect(report.findings.some((f) => f.ruleId === "queue-without-consumer" && f.nodeIds.includes("q"))).toBe(true);
  });

  it("flags an entry tier pushing straight into an internal queue", () => {
    const report = runDesignDoctor(
      [node("edge", "cdn_edge"), node("q", "message_queue"), node("w", "async_worker")],
      [edge("edge", "q"), edge("q", "w")],
    );
    const finding = report.findings.find((f) => f.ruleId === "client-to-queue-direct");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("warning");
    expect(finding?.nodeIds).toContain("edge");

    // The same wiring through an app tier is fine.
    const fixed = runDesignDoctor(
      [node("edge", "cdn_edge"), node("api", "rest_service"), node("q", "message_queue")],
      [edge("edge", "api"), edge("api", "q")],
    );
    expect(fixed.findings.some((f) => f.ruleId === "client-to-queue-direct")).toBe(false);
  });

  describe("computeRunPreflight", () => {
    it("stays silent for a fully wired three-tier design", () => {
      const warnings = computeRunPreflight(
        [node("e", "cdn_edge"), node("api", "rest_service"), node("db", "postgres_db")],
        [edge("e", "api"), edge("api", "db")],
      );
      expect(warnings).toEqual([]);
    });

    it("flags an isolated block as wired to nothing", () => {
      const warnings = computeRunPreflight(
        [node("e", "cdn_edge"), node("api", "rest_service"), node("stray", "redis_cache")],
        [edge("e", "api")],
      );
      const orphan = warnings.find((w) => w.kind === "orphaned-node");
      expect(orphan).toBeDefined();
      expect(orphan?.nodeIds).toEqual(["stray"]);
    });

    it("flags a synchronous cycle", () => {
      const warnings = computeRunPreflight(
        [node("a", "rest_service"), node("b", "rest_service")],
        [edge("a", "b"), edge("b", "a")],
      );
      const cycle = warnings.find((w) => w.kind === "request-cycle");
      expect(cycle).toBeDefined();
      expect(cycle?.nodeIds.sort()).toEqual(["a", "b"]);
    });

    it("flags a datastore nobody feeds (not a seed for reachable traffic)", () => {
      const warnings = computeRunPreflight(
        [node("e", "cdn_edge"), node("api", "rest_service"), node("db", "postgres_db")],
        [edge("e", "api")],
      );
      const unreachable = warnings.find((w) => w.kind === "no-datastore-path");
      expect(unreachable).toBeDefined();
      expect(unreachable?.nodeIds).toContain("db");
    });

    it("says nothing when no data tier exists at all", () => {
      const warnings = computeRunPreflight(
        [node("e", "cdn_edge"), node("api", "rest_service")],
        [edge("e", "api")],
      );
      expect(warnings.find((w) => w.kind === "no-datastore-path")).toBeUndefined();
    });

    it("ignores singleton canvases", () => {
      expect(computeRunPreflight([node("only", "rest_service")], [])).toEqual([]);
    });
  });

  it("detects cycles", () => {
    const nodes = [node("a", "rest_service"), node("b", "rest_service"), node("c", "rest_service")];
    const edges = [edge("a", "b"), edge("b", "c"), edge("c", "a")];
    expect(nodesOnCycles(nodes, edges).sort()).toEqual(["a", "b", "c"]);
    const report = runDesignDoctor(nodes, edges);
    expect(report.findings.filter((f) => f.ruleId === "request-cycle")).toHaveLength(3);
  });

  it("does not treat a straight line as a cycle", () => {
    const nodes = [node("a", "rest_service"), node("b", "rest_service"), node("c", "rest_service")];
    expect(nodesOnCycles(nodes, [edge("a", "b"), edge("b", "c")])).toEqual([]);
  });

  it("flags fan-out writers into one datastore", () => {
    const nodes = [
      node("w1", "background_worker", { writeRatio: 0.9 }),
      node("w2", "background_worker", { writeRatio: 0.9 }),
      node("w3", "background_worker", { writeRatio: 0.9 }),
      node("db", "postgres_db"),
    ];
    const edges = [edge("w1", "db"), edge("w2", "db"), edge("w3", "db")];
    const report = runDesignDoctor(nodes, edges);
    expect(report.findings.some((f) => f.ruleId === "datastore-write-contention")).toBe(true);
  });

  it("flags a scaled websocket-style tier with no shared backplane", () => {
    const report = runDesignDoctor(
      [
        { id: "gw", resourceId: "api_gateway", label: "WS / gateway", overrides: {} },
        node("api", "rest_service"),
      ],
      [edge("gw", "api")],
    );
    expect(report.findings.some((f) => f.ruleId === "stateful-tier-no-backplane" && f.nodeIds.includes("gw"))).toBe(true);
  });

  it("does not flag a connection tier backed by Redis presence", () => {
    const gw = { id: "gw", resourceId: "api_gateway", label: "WS / gateway", overrides: {} };
    const report = runDesignDoctor(
      [gw, node("api", "rest_service"), node("presence", "redis_cache")],
      [edge("gw", "api"), edge("api", "presence")],
    );
    expect(report.findings.some((f) => f.ruleId === "stateful-tier-no-backplane")).toBe(false);
  });

  it("flags uploads proxying through a write-heavy compute tier into object storage", () => {
    const report = runDesignDoctor(
      [
        node("edge", "cdn_edge"),
        { id: "api", resourceId: "rest_service", label: "Upload API", overrides: { writeRatio: 0.9 } },
        node("store", "blob_storage"),
      ],
      [edge("edge", "api"), edge("api", "store")],
    );
    const finding = report.findings.find((f) => f.ruleId === "blob-through-compute");
    expect(finding).toBeDefined();
    expect(finding?.nodeIds).toContain("api");
    expect(finding?.nodeIds).toContain("store");
  });

  it("does not flag a metadata-only service with low write ratio", () => {
    const report = runDesignDoctor(
      [
        node("edge", "cdn_edge"),
        { id: "api", resourceId: "rest_service", label: "Catalog API", overrides: { writeRatio: 0.1 } },
        node("store", "blob_storage"),
      ],
      [edge("edge", "api"), edge("api", "store")],
    );
    expect(report.findings.some((f) => f.ruleId === "blob-through-compute")).toBe(false);
  });

  it("flags missing edge protection for high-traffic designs", () => {
    const report = runDesignDoctor(
      [
        node("client", "cdn_edge", { clientRps: 50_000 }),
        node("api", "rest_service", { replicationFactor: 4, multiAz: true }),
        node("db", "postgres_db", { replicationFactor: 3, multiAz: true }),
      ],
      [edge("client", "api"), edge("api", "db")],
    );
    expect(report.findings.some((f) => f.ruleId === "missing-edge-protection")).toBe(true);
  });

  it("flags missing observability on larger designs", () => {
    const nodes = Array.from({ length: 9 }, (_, i) => node(`n${i}`, "rest_service", { replicationFactor: 2, multiAz: true }));
    const edges = nodes.slice(1).map((n, i) => edge(`n${i}`, n.id));
    const report = runDesignDoctor(nodes, edges);
    expect(report.findings.some((f) => f.ruleId === "missing-observability")).toBe(true);
  });

  it("produces a 0-100 hygiene score that drops with severities", () => {
    const clean = runDesignDoctor(
      [
        node("client", "cdn_edge", { clientRps: 5_000 }),
        node("gw", "api_gateway", { replicationFactor: 2, multiAz: true }),
        node("api", "rest_service", { replicationFactor: 3, multiAz: true }),
        node("db", "postgres_db", { replicationFactor: 3, multiAz: true }),
        node("obs", "observability_stack"),
      ],
      [edge("client", "gw"), edge("gw", "api"), edge("api", "db")],
    );
    const broken = runDesignDoctor(
      [node("edge", "cdn_edge"), node("db", "postgres_db")],
      [edge("edge", "db")],
    );
    expect(clean.score).toBeGreaterThanOrEqual(90);
    expect(broken.score).toBeLessThan(clean.score);
  });

  it("keeps findings sorted with critical first", () => {
    const report = runDesignDoctor(
      [node("edge", "cdn_edge"), node("db", "postgres_db"), node("lonely", "rest_service")],
      [edge("edge", "db")],
    );
    const rank: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    for (let i = 1; i < report.findings.length; i += 1) {
      expect(rank[report.findings[i].severity]).toBeGreaterThanOrEqual(rank[report.findings[i - 1].severity]);
    }
  });
});

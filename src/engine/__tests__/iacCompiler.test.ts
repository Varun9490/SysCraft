import { describe, it, expect } from "vitest";
import { compileAll, estimateMonthlyCost } from "../iacCompiler";
import type { GraphTopology } from "@/types/simulation";

const topo: GraphTopology = {
  nodes: [
    { id: "n1", resourceId: "postgres_db", position: { x: 0, y: 0 }, clientRps: 0, replicationFactor: 2, baseThroughputRps: 5000, maxConcurrency: 200, cacheHitRate: 0, rateLimitRps: 10000, writeRatio: 0.3, vramGbPerReplica: 0, avgPromptTokens: 1024, avgOutputTokens: 256, baseP50Ms: 5, baseP95Ms: 15, baseP99Ms: 40, region: "us-east-1", loadBalancer: "round_robin" },
    { id: "n2", resourceId: "redis_cache", position: { x: 100, y: 0 }, clientRps: 0, replicationFactor: 1, baseThroughputRps: 20000, maxConcurrency: 1000, cacheHitRate: 0.9, rateLimitRps: 10000, writeRatio: 0.1, vramGbPerReplica: 0, avgPromptTokens: 1024, avgOutputTokens: 256, baseP50Ms: 1, baseP95Ms: 3, baseP99Ms: 8, region: "us-east-1", loadBalancer: "round_robin" },
  ],
  edges: [{ id: "e1", source: "n2", target: "n1", weight: 1, circuit: "closed", consecutiveErrorTicks: 0 }],
};

describe("iacCompiler", () => {
  it("compiles all formats without throwing", () => {
    const out = compileAll(topo);
    expect(Object.keys(out)).toEqual(["terraform", "docker", "kubernetes", "mermaid", "rfc", "excalidraw"]);
    for (const k of Object.keys(out)) expect(out[k as keyof typeof out].length).toBeGreaterThan(0);
  });
  it("estimateMonthlyCost is positive", () => {
    expect(estimateMonthlyCost(topo)).toBeGreaterThan(0);
  });
  it("respects costPerHourUsdOverride", () => {
    const t2: GraphTopology = { ...topo, nodes: topo.nodes.map((n) => ({ ...n, costPerHourUsdOverride: 99 })) };
    expect(estimateMonthlyCost(t2)).toBeGreaterThan(estimateMonthlyCost(topo));
  });
  it("rfc uses provided date", () => {
    const out = compileAll(topo, { date: "2025-01-01" });
    expect(out.rfc).toContain("Date: 2025-01-01");
  });
});
import { describe, expect, it } from "vitest";
import { analyzeThreats, toThreatTopology } from "@/engine/threatModel";

/**
 * Regression guard: the canvas stores the primitive under node.data, and an
 * earlier `as any` bridge made every threat-model run look clean because the
 * engine compared `undefined` resource ids.
 */
describe("toThreatTopology", () => {
  it("lifts data.resourceId onto the engine's flat node shape", () => {
    const topology = toThreatTopology(
      [
        { id: "n1", position: { x: 0, y: 0 }, data: { resourceId: "database" } },
        { id: "n2", position: { x: 10, y: 0 }, data: {} },
      ],
      [],
    );
    expect(topology.nodes.map((node) => node.resourceId)).toEqual(["database", ""]);
  });

  it("forwards known edge signals and ignores unknown keys", () => {
    const topology = toThreatTopology(
      [],
      [
        {
          id: "e1",
          source: "n1",
          target: "n2",
          data: { auth: "mtls", pii: true, label: "orders" },
        },
      ],
    );
    expect(topology.edges[0].data).toEqual({
      protocol: undefined,
      auth: "mtls",
      pii: true,
      async: undefined,
    });
  });
});

describe("analyzeThreats on a canvas-shaped graph", () => {
  it("produces findings for an unguarded database path", () => {
    const report = analyzeThreats(
      toThreatTopology(
        [
          { id: "gw", position: { x: 0, y: 0 }, data: { resourceId: "api-gateway" } },
          { id: "db", position: { x: 200, y: 0 }, data: { resourceId: "database" } },
        ],
        [{ id: "e1", source: "gw", target: "db", data: {} }],
      ),
    );

    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.findings.some((finding) => finding.title.includes("No WAF"))).toBe(true);
    expect(report.findings.some((finding) => finding.title.toLowerCase().includes("without auth"))).toBe(true);
    expect(report.score).toBeLessThan(100);
  });

  it("clears the WAF and auth findings once the graph carries them", () => {
    const report = analyzeThreats(
      toThreatTopology(
        [
          { id: "waf", position: { x: 0, y: 0 }, data: { resourceId: "waf" } },
          { id: "gw", position: { x: 100, y: 0 }, data: { resourceId: "api-gateway" } },
          { id: "db", position: { x: 200, y: 0 }, data: { resourceId: "database" } },
        ],
        [{ id: "e1", source: "gw", target: "db", data: { auth: "mtls" } }],
      ),
    );

    expect(report.findings.some((finding) => finding.title.includes("No WAF"))).toBe(false);
    expect(report.findings.some((finding) => finding.title.toLowerCase().includes("without auth"))).toBe(false);
  });
});

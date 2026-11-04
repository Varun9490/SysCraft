import { describe, expect, it } from "vitest";
import { CURATED_CVE_FEED, CVE_ECOSYSTEMS } from "@/data/cveIntelligence";
import { mapRawCveToArchitecture, auditCanvasSecurityArchitecture } from "@/engine/cveScanner";
import { SEED_RESOURCE_MAP } from "@/data/seedResources";
import { BUILTIN_PLUGINS, runDeclarativePluginRules } from "@/data/pluginsCatalog";
import { ENTERPRISE_ROLE_TRACKS } from "@/data/enterpriseTracks";
import { PATH_PARTS } from "@/data/pathData";
import { GUIDED_LABS } from "@/data/guidedLabs";
import type { DoctorEdgeInput, DoctorNodeInput } from "@/engine/designDoctor";

function node(id: string, resourceId: string, overrides: DoctorNodeInput["overrides"] = {}): DoctorNodeInput {
  return { id, resourceId, label: id, overrides };
}

function edge(source: string, target: string): DoctorEdgeInput {
  return { id: `${source}->${target}`, source, target };
}

describe("cveAndPlugins", () => {
  it("curated CVE feed has seventeen items with valid primitives", () => {
    expect(CURATED_CVE_FEED).toHaveLength(17);
    for (const cve of CURATED_CVE_FEED) {
      for (const primitive of cve.affectedPrimitives) {
        expect(SEED_RESOURCE_MAP[primitive], `${cve.id} affected ${primitive}`).toBeTruthy();
      }
      for (const primitive of cve.recommendedDefensePrimitives) {
        expect(SEED_RESOURCE_MAP[primitive], `${cve.id} defense ${primitive}`).toBeTruthy();
      }
    }
  });

  it("CVE-2025-55182 is a React Server Components deserialization RCE in the web framework ecosystem", () => {
    const cve = CURATED_CVE_FEED.find((entry) => entry.id === "CVE-2025-55182");
    expect(cve).toBeDefined();
    expect(cve!.cvss).toBe(10);
    expect(cve!.severity).toBe("CRITICAL");
    expect(cve!.cwe).toBe("CWE-502");
    expect(cve!.stride).toBe("Elevation of Privilege");
    expect(cve!.ecosystem).toBe("Web Frameworks & Runtime");
    expect(cve!.exploitedInWild).toBe(true);
    expect(CVE_ECOSYSTEMS).toContain(cve!.ecosystem);
    for (const primitive of cve!.affectedPrimitives) {
      expect(SEED_RESOURCE_MAP[primitive], `${cve!.id} affected ${primitive}`).toBeTruthy();
    }
    for (const primitive of cve!.recommendedDefensePrimitives) {
      expect(SEED_RESOURCE_MAP[primitive], `${cve!.id} defense ${primitive}`).toBeTruthy();
    }
  });

  it("CVE-2026-109618 is the php2shell memory-corruption RCE exploited in the wild", () => {
    const cve = CURATED_CVE_FEED.find((entry) => entry.id === "CVE-2026-109618");
    expect(cve).toBeDefined();
    expect(cve!.cvss).toBe(9.2);
    expect(cve!.severity).toBe("CRITICAL");
    expect(cve!.stride).toBe("Elevation of Privilege");
    expect(cve!.ecosystem).toBe("Web Frameworks & Runtime");
    expect(cve!.exploitedInWild).toBe(true);
    expect(cve!.published).toBe("2026-10-21");
    expect(CVE_ECOSYSTEMS).toContain(cve!.ecosystem);
    for (const primitive of cve!.affectedPrimitives) {
      expect(SEED_RESOURCE_MAP[primitive], `${cve!.id} affected ${primitive}`).toBeTruthy();
    }
    for (const primitive of cve!.recommendedDefensePrimitives) {
      expect(SEED_RESOURCE_MAP[primitive], `${cve!.id} defense ${primitive}`).toBeTruthy();
    }
  });

  it("CVE-2026-109619 is the php2shell stale request-state RCE chained with CVE-2026-109618", () => {
    const cve = CURATED_CVE_FEED.find((entry) => entry.id === "CVE-2026-109619");
    expect(cve).toBeDefined();
    expect(cve!.cvss).toBe(9.2);
    expect(cve!.severity).toBe("CRITICAL");
    expect(cve!.stride).toBe("Elevation of Privilege");
    expect(cve!.ecosystem).toBe("Web Frameworks & Runtime");
    expect(cve!.exploitedInWild).toBe(true);
    expect(cve!.published).toBe("2026-10-21");
    expect(CVE_ECOSYSTEMS).toContain(cve!.ecosystem);
    for (const primitive of cve!.affectedPrimitives) {
      expect(SEED_RESOURCE_MAP[primitive], `${cve!.id} affected ${primitive}`).toBeTruthy();
    }
    for (const primitive of cve!.recommendedDefensePrimitives) {
      expect(SEED_RESOURCE_MAP[primitive], `${cve!.id} defense ${primitive}`).toBeTruthy();
    }
  });

  it("mapRawCveToArchitecture classifies Kubernetes Ingress deterministically", () => {
    const raw = {
      id: "CVE-TEST-INGRESS",
      description: "Kubernetes Ingress controller admission webhook remote code execution",
      cvss: 9.8,
    };
    const first = mapRawCveToArchitecture(raw);
    const second = mapRawCveToArchitecture(raw);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.affectedPrimitives).toContain("ingress_controller");
    expect(first.stride).toBe("Elevation of Privilege");
    for (const primitive of first.affectedPrimitives) {
      expect(SEED_RESOURCE_MAP[primitive]).toBeTruthy();
    }
    for (const primitive of first.recommendedDefensePrimitives) {
      expect(SEED_RESOURCE_MAP[primitive]).toBeTruthy();
    }
  });

  it("CVE-2026-53495 is a containerd CRI goroutine-leak DoS in the Kubernetes ecosystem", () => {
    const cve = CURATED_CVE_FEED.find((entry) => entry.id === "CVE-2026-53495");
    expect(cve).toBeDefined();
    expect(cve!.severity).toBe("MEDIUM");
    expect(cve!.cvss).toBe(6.8);
    expect(cve!.cwe).toBe("CWE-400");
    expect(cve!.stride).toBe("Denial of Service");
    expect(cve!.ecosystem).toBe("Kubernetes");
    for (const primitive of cve!.affectedPrimitives) {
      expect(SEED_RESOURCE_MAP[primitive], `${cve!.id} affected ${primitive}`).toBeTruthy();
    }
    for (const primitive of cve!.recommendedDefensePrimitives) {
      expect(SEED_RESOURCE_MAP[primitive], `${cve!.id} defense ${primitive}`).toBeTruthy();
    }
  });

  it("mapRawCveToArchitecture classifies Redis Lua and Cloudflare HTTP/2 DDoS", () => {
    const redis = mapRawCveToArchitecture({
      id: "CVE-TEST-REDIS",
      description: "Redis Lua bit library stack buffer overflow RCE",
      cvss: 8.8,
    });
    expect(redis.affectedPrimitives).toContain("redis_cache");
    expect(redis.stride).toBe("Elevation of Privilege");

    const http2 = mapRawCveToArchitecture({
      id: "CVE-TEST-HTTP2",
      description: "HTTP/2 rapid reset DDoS denial of service on CDN edge",
      cvss: 7.5,
    });
    expect(http2.affectedPrimitives).toContain("cdn_edge");
    expect(http2.stride).toBe("Denial of Service");
  });

  it("auditCanvasSecurityArchitecture scores hardened above unhardened", () => {
    const hardenedNodes = [
      { id: "waf", resourceId: "cloudflare_waf", label: "waf" },
      { id: "rl", resourceId: "rate_limiter", label: "rl" },
      { id: "idp", resourceId: "identity_provider", label: "idp" },
      { id: "mesh", resourceId: "envoy_mesh", label: "mesh" },
      { id: "sec", resourceId: "secrets_manager", label: "sec" },
      { id: "tun", resourceId: "cloudflare_tunnel", label: "tun" },
      { id: "db", resourceId: "postgres_db", label: "db", overrides: { multiAz: true } },
    ];
    const unhardenedNodes = [{ id: "db", resourceId: "postgres_db", label: "db" }];

    const hardened = auditCanvasSecurityArchitecture(hardenedNodes, [], CURATED_CVE_FEED);
    const unhardened = auditCanvasSecurityArchitecture(unhardenedNodes, [], CURATED_CVE_FEED);

    expect(hardened.securityPostureScore).toBeGreaterThan(unhardened.securityPostureScore);
  });

  it("detects a CVE mitigated by a defense primitive on the canvas", () => {
    const mitigated = auditCanvasSecurityArchitecture(
      [
        { id: "db", resourceId: "postgres_db", label: "db" },
        { id: "sec", resourceId: "secrets_manager", label: "sec" },
      ],
      [],
      CURATED_CVE_FEED,
    );
    const exposed = mitigated.exposedNodes.find((entry) => entry.nodeId === "db");
    expect(exposed).toBeDefined();
    expect(exposed?.mitigatedByTopology).toBe(true);

    const unmitigated = auditCanvasSecurityArchitecture(
      [{ id: "db", resourceId: "postgres_db", label: "db" }],
      [],
      CURATED_CVE_FEED,
    );
    const exposed2 = unmitigated.exposedNodes.find((entry) => entry.nodeId === "db");
    expect(exposed2?.mitigatedByTopology).toBe(false);
  });

  it("runDeclarativePluginRules is deterministic and finds violations", () => {
    const plugin = BUILTIN_PLUGINS.find((entry) => entry.id === "aws-well-architected-pack");
    expect(plugin).toBeDefined();

    const violatedNodes = [node("db", "postgres_db")];
    const first = runDeclarativePluginRules([plugin!], violatedNodes, []);
    const second = runDeclarativePluginRules([plugin!], violatedNodes, []);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.length).toBeGreaterThan(0);

    const satisfiedNodes = [
      node("gw", "api_gateway", { multiAz: true, replicationFactor: 2 }),
      node("api", "rest_service", { multiAz: true, replicationFactor: 3 }),
      node("cache", "redis_cache", { multiAz: true }),
      node("db", "postgres_db", { multiAz: true, replicationFactor: 3 }),
    ];
    const satisfiedEdges = [edge("gw", "api"), edge("api", "db"), edge("api", "cache")];
    const satisfied = runDeclarativePluginRules([plugin!], satisfiedNodes, satisfiedEdges);
    expect(satisfied).toHaveLength(0);

    expect(runDeclarativePluginRules([], violatedNodes, [])).toHaveLength(0);
  });

  it("enterprise role tracks reference valid modules and labs", () => {
    const moduleIds = new Set(PATH_PARTS.flatMap((part) => part.modules.map((module) => module.id)));
    const labIds = new Set(GUIDED_LABS.map((lab) => lab.id));

    for (const track of ENTERPRISE_ROLE_TRACKS) {
      for (const moduleId of track.moduleIds) {
        expect(moduleIds.has(moduleId), `${track.id} module ${moduleId}`).toBe(true);
      }
      for (const labId of track.requiredLabIds) {
        expect(labIds.has(labId), `${track.id} lab ${labId}`).toBe(true);
      }
    }
  });
});
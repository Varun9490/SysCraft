import { describe, expect, it } from "vitest";
import { BLUEPRINTS, BLUEPRINT_CATEGORIES, BLUEPRINT_MAP, getBlueprint } from "@/data/blueprints";
import { SEED_RESOURCE_MAP } from "@/data/seedResources";

/**
 * Integrity guarantees for the prebuilt blueprint gallery: unique ids, every
 * node references a real primitive, every edge index is in range, every
 * blueprint is wired (no orphan nodes), and each ships traffic.
 */

describe("blueprints", () => {
  it("has unique ids matching the lookup map", () => {
    const ids = BLUEPRINTS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(BLUEPRINT_MAP[id]?.id).toBe(id);
  });

  it("only uses known categories", () => {
    const allowed = new Set<string>(BLUEPRINT_CATEGORIES);
    for (const blueprint of BLUEPRINTS) expect(allowed.has(blueprint.category)).toBe(true);
  });

  it("references only real primitive ids", () => {
    for (const blueprint of BLUEPRINTS) {
      for (const node of blueprint.nodes) {
        expect(SEED_RESOURCE_MAP[node.resourceId], `${blueprint.id} -> ${node.resourceId}`).toBeTruthy();
      }
    }
  });

  it("keeps every edge index in range", () => {
    for (const blueprint of BLUEPRINTS) {
      for (const [from, to] of blueprint.edges) {
        expect(from, `${blueprint.id} edge source`).toBeGreaterThanOrEqual(0);
        expect(to, `${blueprint.id} edge target`).toBeGreaterThanOrEqual(0);
        expect(from).toBeLessThan(blueprint.nodes.length);
        expect(to).toBeLessThan(blueprint.nodes.length);
      }
    }
  });

  it("wires every node into the graph (no orphans)", () => {
    for (const blueprint of BLUEPRINTS) {
      const touched = new Set<number>();
      for (const [from, to] of blueprint.edges) {
        touched.add(from);
        touched.add(to);
      }
      blueprint.nodes.forEach((_, index) => {
        expect(touched.has(index), `${blueprint.id} node ${index} is orphaned`).toBe(true);
      });
    }
  });

  it("ships at least one entry point carrying traffic", () => {
    for (const blueprint of BLUEPRINTS) {
      const hasEntry = blueprint.nodes.some((node) => (node.overrides?.clientRps ?? 0) > 0);
      expect(hasEntry, `${blueprint.id} has no entry traffic`).toBe(true);
    }
  });

  it("exposes getBlueprint for every id", () => {
    for (const blueprint of BLUEPRINTS) expect(getBlueprint(blueprint.id)).toBe(blueprint);
  });
});

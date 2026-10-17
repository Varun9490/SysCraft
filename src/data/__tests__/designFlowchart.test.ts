import { describe, expect, it } from "vitest";
import {
  FLOWCHART_LEAVES,
  FLOWCHART_START_ID,
  FLOWCHART_STEPS,
  getFlowchartStep,
} from "@/data/designFlowchart";
import { SEED_RESOURCES } from "@/data/seedResources";
import { ENCYCLOPEDIA_MAP } from "@/data/encyclopediaData";

/**
 * Structural guarantees for the design flowchart: every branch resolves,
 * every preset is buildable from the seed catalog, every wiki link is real,
 * every leaf is reachable, and every preset fits the ~30 KB share budget.
 */

const seedIds = new Set(SEED_RESOURCES.map((r) => r.id));

function reachableLeaves(): Set<string> {
  const seen = new Set<string>();
  const queue: string[] = [FLOWCHART_START_ID];
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const step = getFlowchartStep(id);
    if (step?.kind === "question") {
      for (const option of step.options) queue.push(option.next);
    }
  }
  return seen;
}

describe("design flowchart", () => {
  it("resolves every option target to a known step", () => {
    const questions = Object.values(FLOWCHART_STEPS).filter((s) => s.kind === "question");
    expect(questions.length).toBeGreaterThanOrEqual(8);
    for (const question of questions) {
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      for (const option of question.options) {
        expect(FLOWCHART_STEPS[option.next], `option ${option.id} -> ${option.next}`).toBeDefined();
      }
    }
  });

  it("reaches all sixteen leaves from the start", () => {
    expect(FLOWCHART_LEAVES).toHaveLength(16);
    const reachable = reachableLeaves();
    for (const leaf of FLOWCHART_LEAVES) {
      expect(reachable.has(leaf.id), `leaf ${leaf.id} unreachable`).toBe(true);
    }
  });

  it("builds every preset exclusively from seed resources", () => {
    for (const leaf of FLOWCHART_LEAVES) {
      expect(leaf.presetNodes.length).toBeGreaterThanOrEqual(3);
      const nodeIds = new Set<string>();
      for (const node of leaf.presetNodes) {
        expect(seedIds.has(node.resourceId), `${leaf.id}: unknown resource ${node.resourceId}`).toBe(true);
        expect(nodeIds.has(node.id), `${leaf.id}: duplicate node id ${node.id}`).toBe(false);
        nodeIds.add(node.id);
      }
      for (const edge of leaf.presetEdges) {
        expect(nodeIds.has(edge.source), `${leaf.id}: edge from missing ${edge.source}`).toBe(true);
        expect(nodeIds.has(edge.target), `${leaf.id}: edge to missing ${edge.target}`).toBe(true);
        expect(edge.source).not.toBe(edge.target);
      }
    }
  });

  it("links only to real encyclopedia concepts", () => {
    for (const leaf of FLOWCHART_LEAVES) {
      expect(leaf.wikiConceptIds.length).toBeGreaterThanOrEqual(2);
      for (const id of leaf.wikiConceptIds) {
        expect(ENCYCLOPEDIA_MAP[id], `${leaf.id}: unknown concept ${id}`).toBeDefined();
      }
    }
  });

  it("keeps every serialized preset under the 30 KB share budget", () => {
    for (const leaf of FLOWCHART_LEAVES) {
      const payload = JSON.stringify({
        version: 1,
        nodes: leaf.presetNodes.map((n) => ({
          id: n.id,
          position: { x: n.x, y: n.y },
          resourceId: n.resourceId,
          label: n.label,
          overrides: n.overrides ?? {},
        })),
        edges: leaf.presetEdges.map((e) => ({ id: `e_${e.source}_${e.target}`, source: e.source, target: e.target })),
      });
      expect(payload.length, `${leaf.id} payload too large`).toBeLessThan(30_000);
    }
  });
});

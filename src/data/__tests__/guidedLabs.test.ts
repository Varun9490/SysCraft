import { describe, expect, it } from "vitest";

import { GUIDED_LABS } from "@/data/guidedLabs";
import { SEED_RESOURCE_IDS } from "@/data/seedResources";

/**
 * Structural guards for the guided labs. The grader matches canvas nodes by
 * resource id, so a typo in `requiredResourceIds` silently makes a stage
 * unpassable — the failure mode is a learner stuck on a correct design.
 */
describe("guided labs", () => {
  it("has unique lab and stage ids", () => {
    const labIds = GUIDED_LABS.map((lab) => lab.id);
    expect(new Set(labIds).size).toBe(labIds.length);

    for (const lab of GUIDED_LABS) {
      const stageIds = lab.stages.map((stage) => stage.id);
      expect(new Set(stageIds).size, `${lab.id} stage ids`).toBe(stageIds.length);
    }
  });

  it("only grades resources that exist on the canvas", () => {
    const known = new Set(SEED_RESOURCE_IDS);
    for (const lab of GUIDED_LABS) {
      for (const stage of lab.stages) {
        for (const rule of stage.gradingRules) {
          for (const resourceId of rule.requiredResourceIds) {
            expect(known.has(resourceId), `${lab.id}/${stage.id}: ${resourceId}`).toBe(true);
          }
        }
      }
    }
  });

  it("opens on a brief and closes on a written review", () => {
    for (const lab of GUIDED_LABS) {
      expect(lab.stages[0].kind, `${lab.id} first stage`).toBe("brief");
      expect(lab.stages.at(-1)?.kind, `${lab.id} last stage`).toBe("review");
    }
  });

  it("gives every lab at least one automated check and a reference solution", () => {
    for (const lab of GUIDED_LABS) {
      const rules = lab.stages.flatMap((stage) => stage.gradingRules);
      expect(rules.length, `${lab.id} grading rules`).toBeGreaterThan(0);
      expect(lab.briefMarkdown.length, `${lab.id} brief`).toBeGreaterThan(60);
      expect(lab.solutionMarkdown.length, `${lab.id} solution`).toBeGreaterThan(100);
    }
  });

  it("keeps the on-sale ticketing lab anchored to its correctness target", () => {
    const lab = GUIDED_LABS.find((entry) => entry.id === "bookmyshow-ticketing");
    expect(lab).toBeDefined();
    expect(lab?.stages.some((stage) => stage.kind === "chaos")).toBe(true);
    expect(lab?.targetRps).toBe(50000);
    expect(lab?.solutionMarkdown).toContain("does not oversell");
  });

  it("gives every chaos drill a passable check", () => {
    for (const lab of GUIDED_LABS) {
      for (const stage of lab.stages) {
        if (stage.kind !== "chaos") continue;
        expect(stage.gradingRules.length, `${lab.id}/${stage.id} chaos rules`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps typeahead anchored to an immutable index and a derived size", () => {
    const lab = GUIDED_LABS.find((entry) => entry.id === "search-autocomplete");
    expect(lab).toBeDefined();
    expect(lab?.stages).toHaveLength(6);
    expect(lab?.sloP99Ms).toBe(50);
    expect(lab?.solutionMarkdown).toContain("immutable");
    // The stage-2 arithmetic must not regress to a bare "trie RAM" hand-wave.
    const boe = lab?.stages.find((stage) => stage.kind === "boe");
    expect(boe?.instructionsMarkdown).toContain("60M");
    expect(boe?.instructionsMarkdown).toContain("5.8 GB");
    expect(lab?.stages.some((stage) => stage.kind === "chaos")).toBe(true);
    for (const stage of lab?.stages ?? []) {
      expect(stage.instructionsMarkdown.length, `${lab?.id}/${stage.id}`).toBeGreaterThan(400);
    }
  });

  it("keeps the payment lab anchored to acceptance latency and an append-only ledger", () => {
    const lab = GUIDED_LABS.find((entry) => entry.id === "razorpay-payments");
    expect(lab).toBeDefined();
    expect(lab?.stages).toHaveLength(6);
    expect(lab?.sloP99Ms).toBe(400);
    // 400ms must cover acceptance, not a card-network round trip.
    expect(lab?.briefMarkdown).toContain("acceptance, not card-network authorization");
    expect(lab?.solutionMarkdown).toContain("append-only");
    expect(lab?.solutionMarkdown).toContain("202");
    // An unknown PSP outcome is the graded failure mode, not a reason to retry with a new key.
    const chaos = lab?.stages.find((stage) => stage.kind === "chaos");
    expect(chaos).toBeDefined();
    expect(chaos?.instructionsMarkdown).toContain("unknown-state queue");
    const boe = lab?.stages.find((stage) => stage.kind === "boe");
    expect(boe?.instructionsMarkdown).toContain("2.07B");
    expect(boe?.instructionsMarkdown).toContain("248 GB");
    for (const stage of lab?.stages ?? []) {
      expect(stage.instructionsMarkdown.length, `${lab?.id}/${stage.id}`).toBeGreaterThan(400);
    }
  });

  it("keeps the rate limiter anchored to one atomic hop and a bounded over-admit", () => {
    const lab = GUIDED_LABS.find((entry) => entry.id === "distributed-rate-limiter");
    expect(lab).toBeDefined();
    expect(lab?.stages).toHaveLength(6);
    expect(lab?.sloP99Ms).toBe(10);
    expect(lab?.solutionMarkdown).toContain("EVALSHA");
    expect(lab?.solutionMarkdown).toContain("r × T");
    // The stage-2 arithmetic must not regress to a two-round-trip read-then-write.
    const boe = lab?.stages.find((stage) => stage.kind === "boe");
    expect(boe?.instructionsMarkdown).toContain("one atomic hop");
    for (const stage of lab?.stages ?? []) {
      expect(stage.instructionsMarkdown.length, `${lab?.id}/${stage.id}`).toBeGreaterThan(400);
    }
  });
});

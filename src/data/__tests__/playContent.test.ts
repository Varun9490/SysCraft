import { describe, expect, it } from "vitest";
import { PLAY_BY_KIND, PLAY_MODES, PLAY_QUESTIONS, dailyPuzzle, dailyPuzzleIndex, scoreEstimate } from "@/data/playContent";
import { ENCYCLOPEDIA_MAP } from "@/data/encyclopediaData";
import { GUIDED_LAB_IDS } from "@/data/guidedLabs";

/**
 * Cross-reference guarantees for the play layer: nine modes, every wiki
 * conceptId resolves, every deep-link points at a real lab/canvas route,
 * the daily puzzle is deterministic per UTC day, and estimation scoring
 * follows the documented 3× / 10× tolerance ladder.
 */

const staticTopLevel = new Set(["/labs", "/canvas", "/wiki", "/flowchart", "/practice", "/room"]);

describe("play content", () => {
  it("defines exactly nine modes with unique ids", () => {
    expect(PLAY_MODES).toHaveLength(9);
    const ids = new Set(PLAY_MODES.map((m) => m.id));
    expect(ids.size).toBe(9);
  });

  it("in-browser modes have questions; link modes have valid deep-links", () => {
    for (const mode of PLAY_MODES) {
      if (mode.kind === "link") {
        expect(mode.href, mode.id).toBeTruthy();
        const href = mode.href as string;
        if (href.startsWith("/labs/")) {
          expect(GUIDED_LAB_IDS, `${mode.id} -> ${href}`).toContain(href.slice("/labs/".length));
        } else {
          expect(staticTopLevel.has(href), `${mode.id} -> ${href}`).toBe(true);
        }
      } else {
        expect(PLAY_BY_KIND[mode.kind].length, mode.id).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it("links only to real encyclopedia concepts", () => {
    for (const question of PLAY_QUESTIONS) {
      if (question.conceptId) {
        expect(ENCYCLOPEDIA_MAP[question.conceptId], `${question.id}: ${question.conceptId}`).toBeDefined();
      }
    }
  });

  it("every question is complete", () => {
    for (const question of PLAY_QUESTIONS) {
      expect(question.prompt.length, question.id).toBeGreaterThan(10);
      expect(question.explanation.length, question.id).toBeGreaterThan(10);
      if (question.kind === "estimate") {
        expect(question.numeric, question.id).toBeDefined();
        expect((question.numeric as { answer: number }).answer).toBeGreaterThan(0);
      } else {
        expect(question.options?.length, question.id).toBeGreaterThanOrEqual(3);
        expect(question.options?.filter((o) => o.correct).length, question.id).toBe(1);
      }
    }
  });

  it("daily puzzle is deterministic per UTC day and rotation covers the bank", () => {
    const a = dailyPuzzle(new Date("2026-10-17T00:00:00Z"));
    const b = dailyPuzzle(new Date("2026-10-17T23:59:59Z"));
    expect(a.id).toBe(b.id);
    expect(dailyPuzzleIndex(new Date("2026-10-17T12:00:00Z"))).toBe(
      dailyPuzzleIndex(new Date("2026-10-17T18:00:00Z")),
    );
    // Different days advance through the bank deterministically.
    const dayMs = 86_400_000;
    const base = new Date("2026-10-17T12:00:00Z").getTime();
    const seen = new Set<string>();
    for (let d = 0; d < Math.min(10, PLAY_QUESTIONS.length); d += 1) {
      seen.add(dailyPuzzle(new Date(base + d * dayMs)).id);
    }
    expect(seen.size).toBe(Math.min(10, PLAY_QUESTIONS.length));
  });

  it("scores estimation answers on the 3x/10x tolerance ladder", () => {
    expect(scoreEstimate(100, 100)).toBe(100);
    expect(scoreEstimate(290, 100)).toBe(100); // within 3×
    expect(scoreEstimate(900, 100)).toBe(50); // within 10×
    expect(scoreEstimate(1100, 100)).toBe(0); // beyond 10×
    expect(scoreEstimate(0, 100)).toBe(0);
  });
});

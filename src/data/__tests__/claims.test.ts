import { describe, expect, it } from "vitest";
import {
  COMMON_MISTAKES,
  DECISION_THRESHOLDS,
  LATENCY_LADDER,
  MACHINE_LIMITS,
  REFERENCE_CLAIMS,
  type ClaimCategory,
} from "@/data/claims";

/**
 * The claims register is load-bearing for /reference/numbers: every entry must
 * be complete (falsifiable statement, basis, real source, as-of date). Empty
 * provenance defeats the whole point — so the gate is structural.
 */

const VALID_CATEGORIES: ClaimCategory[] = ["latency", "limits", "consistency", "traffic", "storage"];

describe("claims register", () => {
  it("has unique ids", () => {
    const ids = REFERENCE_CLAIMS.map((claim) => claim.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every claim is complete: statement, basis, at least one source, a valid asOf date", () => {
    for (const claim of REFERENCE_CLAIMS) {
      expect(claim.statement.length, claim.id).toBeGreaterThan(30);
      expect(claim.basis.length, claim.id).toBeGreaterThan(20);
      expect(claim.sources.length, claim.id).toBeGreaterThanOrEqual(1);
      for (const source of claim.sources) {
        expect(source.label.length, claim.id).toBeGreaterThan(5);
        if (source.url) expect(source.url.startsWith("http"), `${claim.id} source url`).toBe(true);
      }
      expect(Number.isNaN(Date.parse(claim.asOf)), `${claim.id} asOf (${claim.asOf})`).toBe(false);
      expect(VALID_CATEGORIES.includes(claim.category), claim.id).toBe(true);
    }
  });

  it("covers the categories the numbers page groups by", () => {
    for (const category of VALID_CATEGORIES) {
      expect(REFERENCE_CLAIMS.some((claim) => claim.category === category), category).toBe(true);
    }
  });

  it("mistake references point to real claim ids", () => {
    const ids = new Set(REFERENCE_CLAIMS.map((claim) => claim.id));
    for (const mistake of COMMON_MISTAKES) {
      if (mistake.claim) expect(ids.has(mistake.claim), mistake.mistake).toBe(true);
    }
  });

  it("the reference tables are populated (no stub rows)", () => {
    expect(LATENCY_LADDER.length).toBeGreaterThanOrEqual(8);
    expect(MACHINE_LIMITS.length).toBeGreaterThanOrEqual(6);
    expect(DECISION_THRESHOLDS.length).toBeGreaterThanOrEqual(6);
    expect(REFERENCE_CLAIMS.length).toBeGreaterThanOrEqual(12);
    for (const row of LATENCY_LADDER) {
      expect(row.time.length).toBeGreaterThan(0);
      expect(row.note.length).toBeGreaterThan(10);
    }
  });
});

import type { GuidedLab } from "@/types/challenges";

/**
 * What each difficulty tag actually means, shown on every lab brief and
 * report so the tag carries information instead of decoration.
 */

export type LabLevelKey = GuidedLab["difficulty"];

export interface LabLevelDef {
  key: LabLevelKey;
  badge: string;
  /** What you are expected to produce, in one sentence. */
  expectation: string;
  /** Concrete tells a reviewer (or grader) looks for at this level. */
  signals: string[];
}

export const LAB_LEVELS: Record<LabLevelKey, LabLevelDef> = {
  starter: {
    key: "starter",
    badge: "Starter",
    expectation:
      "A working design with the core flow and one deep dive. Hints allowed; the prompts drive the timeline.",
    signals: [
      "Every functional requirement has an endpoint path through the topology",
      "One cache or one replica wins the p99 that matters",
      "You can say why the store you picked is the right store",
    ],
  },
  standard: {
    key: "standard",
    badge: "Standard",
    expectation:
      "Working design plus proactive caching and scaling, two deep dives. You choose the store and defend it, and handle one failure.",
    signals: [
      "Read and write paths diverge on purpose",
      "At least one failure (node loss or spike) is absorbed without breaching the SLO",
      "Numbers, not vibes: RPS and budgets from your own estimates",
    ],
  },
  advanced: {
    key: "advanced",
    badge: "Advanced",
    expectation:
      "You lead the deep dives unprompted, trade off against quantified NFRs, and the design survives the chaos script.",
    signals: [
      "Every trade-off names its cost (latency, money, or complexity)",
      "Backpressure or load shedding appears before saturation, not after",
      "The chaos stage passes inside budget without violating SLOs",
    ],
  },
  staff_plus: {
    key: "staff_plus",
    badge: "Staff+",
    expectation:
      "Production concerns on top of a correct design: failover behavior, blast-radius isolation, unit economics, operability, and evolution.",
    signals: [
      "Multi-region or cell-isolation reasoning is explicit",
      "Operability: what breaks silently, what pages, what self-heals",
      "Cost is a first-class constraint with a number per hour",
    ],
  },
};

export function labLevel(level: GuidedLab["difficulty"]): LabLevelDef {
  return LAB_LEVELS[level] ?? LAB_LEVELS.standard;
}

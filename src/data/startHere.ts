/**
 * The guided "Start here" flow.
 *
 * An ordered, opinionated ramp for a first-time visitor: predict a number, poke
 * a simulation, load a real architecture, run it, break it, then lock it in
 * with a lab and review. The predict-first loop is the product: every step
 * either asks you to estimate something or hands you a surface where your
 * estimate gets graded. Every step points at a real, existing destination so
 * the whole path is walkable in a single sitting.
 */

import { TOTAL_MODULES } from "@/data/pathData";

export type StartPhase = "Learn" | "Build" | "Break" | "Reinforce";

export interface StartStep {
  id: string;
  phase: StartPhase;
  title: string;
  body: string;
  href: string;
  cta: string;
  minutes: number;
}

export const START_PHASES: StartPhase[] = ["Learn", "Build", "Break", "Reinforce"];

export const START_STEPS: StartStep[] = [
  {
    id: "orient",
    phase: "Learn",
    title: "See the whole journey in one sitting",
    body: `The learning path runs from a single server to a global platform. Skim the ${TOTAL_MODULES} modules now so every later step has somewhere to land.`,
    href: "/learn",
    cta: "Open the path",
    minutes: 10,
  },
  {
    id: "numbers",
    phase: "Learn",
    title: "Memorise the latency ladder",
    body: "L1 ~1 ns, main memory ~100 ns, NVMe ~100 µs, cross-region ~80 ms. Those ratios explain almost every architectural decision — and the /reference/numbers page shows its sources.",
    href: "/topics/latency-numbers",
    cta: "Read the numbers",
    minutes: 6,
  },
  {
    id: "predict",
    phase: "Build",
    title: "Predict before you look",
    body: "The caching sandbox makes you commit a prediction first: at this skew and this cache size, which hit-rate bucket lands? Commit, then watch the kernel grade you against the real curve.",
    href: "/topics/caching-strategies",
    cta: "Run the predict gate",
    minutes: 7,
  },
  {
    id: "load",
    phase: "Build",
    title: "Load a real architecture",
    body: "Open the canvas, switch to the Blueprints tab, and load the URL shortener. You get a defensible, ready-to-run system in one click.",
    href: "/canvas",
    cta: "Open the canvas",
    minutes: 5,
  },
  {
    id: "run",
    phase: "Build",
    title: "Run the simulation",
    body: "Hit run and watch traffic flow from the entry service through the cache to storage. Every node shows live throughput, latency, and saturation.",
    href: "/canvas",
    cta: "Open the canvas",
    minutes: 5,
  },
  {
    id: "break",
    phase: "Break",
    title: "Break it and read the post-mortem",
    body: "Fail a node, spike the traffic, or drop a region. Watch the blast radius, then read the post-mortem to see what held and what cascaded.",
    href: "/canvas",
    cta: "Open the canvas",
    minutes: 8,
  },
  {
    id: "lab",
    phase: "Reinforce",
    title: "Complete the gold-standard lab",
    body: "Build the Bitly URL shortener stage by stage: estimate the traffic, place the cache, survive a cache-loss chaos drill. The grader scores topology, p99, errors, and budget.",
    href: "/labs/bitly-url-shortener",
    cta: "Start the lab",
    minutes: 20,
  },
  {
    id: "review",
    phase: "Reinforce",
    title: "Lock it in with spaced repetition",
    body: "The flashcards come back exactly when you are about to forget. A few minutes a day is enough to keep the whole system in your head — and your prediction accuracy accrues on the progress page.",
    href: "/practice",
    cta: "Review now",
    minutes: 10,
  },
];

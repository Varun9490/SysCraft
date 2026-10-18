/**
 * The guided "Start here" flow.
 *
 * An ordered, opinionated ramp for a first-time visitor: read one idea, poke a
 * simulation, load a real architecture, run it, break it, then lock it in with
 * a lab and review. Every step points at a real, existing destination so the
 * whole path is walkable in a single sitting.
 */

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
    body: "The learning path runs from a single server to a global platform. Skim the 19 modules now so every later step has somewhere to land.",
    href: "/path",
    cta: "Open the path",
    minutes: 10,
  },
  {
    id: "numbers",
    phase: "Learn",
    title: "Memorise the latency numbers",
    body: "Memory is ~100 ns, an SSD read ~100 µs, a cross-continent round trip ~150 ms. Those ratios explain almost every architectural decision.",
    href: "/topics/latency-numbers",
    cta: "Read the numbers",
    minutes: 6,
  },
  {
    id: "dial",
    phase: "Build",
    title: "Turn the dials on caching",
    body: "Drag cache size and access skew and watch the LRU hit-rate curve bend as the working set outgrows the cache. Concepts stick when you can move them.",
    href: "/topics/caching-strategies",
    cta: "Open the sandbox",
    minutes: 7,
  },
  {
    id: "load",
    phase: "Build",
    title: "Load a real architecture",
    body: "Open the canvas, switch to the Blueprints tab, and load the URL shortener. You get a defensible, ready-to-run system in one click.",
    href: "/workspace",
    cta: "Open the canvas",
    minutes: 5,
  },
  {
    id: "run",
    phase: "Build",
    title: "Run the simulation",
    body: "Hit run and watch traffic flow from the entry service through the cache to storage. Every node shows live throughput, latency, and saturation.",
    href: "/workspace",
    cta: "Open the canvas",
    minutes: 5,
  },
  {
    id: "break",
    phase: "Break",
    title: "Break it and read the post-mortem",
    body: "Fail a node, spike the traffic, or drop a region. Watch the blast radius, then read the post-mortem to see what held and what cascaded.",
    href: "/workspace",
    cta: "Open the canvas",
    minutes: 8,
  },
  {
    id: "lab",
    phase: "Reinforce",
    title: "Complete a guided lab",
    body: "Build the Bitly URL shortener stage by stage. The grader checks your topology against a reference design and tells you what to fix.",
    href: "/labs/bitly-url-shortener",
    cta: "Start the lab",
    minutes: 20,
  },
  {
    id: "review",
    phase: "Reinforce",
    title: "Lock it in with spaced repetition",
    body: "The flashcards come back exactly when you are about to forget. A few minutes a day is enough to keep the whole system in your head.",
    href: "/practice",
    cta: "Review now",
    minutes: 10,
  },
];

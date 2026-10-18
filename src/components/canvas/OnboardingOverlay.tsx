'use client';

import Link from "next/link";
import { ArrowRight, Box, Play, Sparkles } from "@/components/ui/icons";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useSimStore } from "@/store/useSimStore";

/**
 * Empty-canvas onboarding. Rendered only when the topology has no nodes, so a
 * first-time visitor always has an obvious next action instead of a blank grid.
 * Non-blocking: the wrapper ignores pointer events, the card does not.
 */

const PRO_TIPS = [
  { keys: "drag", text: "Drop any primitive from the palette onto the canvas" },
  { keys: "connect", text: "Drag from a node's handle to wire it to another" },
  { keys: "space", text: "Run / pause the live simulation" },
  { keys: "break", text: "Use the Chaos bar to fail a node, spike traffic, or drop a region" },
];

export function OnboardingOverlay() {
  const loadStarter = () => useCanvasStore.getState().loadStarterTemplate();

  const addFirstNode = () => {
    useCanvasStore.getState().addNode("api_gateway", { x: 240, y: 220 });
  };

  const runNow = () => {
    const sim = useSimStore.getState();
    if (!sim.running) sim.startSimulation(() => useCanvasStore.getState().toGraphTopology());
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/90 p-6 shadow-2xl backdrop-blur">
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">
          <Sparkles size={13} weight="bold" /> Empty canvas
        </span>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-zinc-50">
          Start a system in seconds
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
          Load a working architecture, drop a single primitive, or take the guided tour that walks you from zero to a
          system you can break on purpose.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={loadStarter}
            className="group inline-flex items-center justify-between gap-2 rounded-lg bg-brass px-4 py-2.5 text-[13px] font-semibold text-zinc-950 transition-transform hover:scale-[1.02]"
          >
            <span className="inline-flex items-center gap-2">
              <Play size={14} weight="bold" /> Load the starter architecture
            </span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            type="button"
            onClick={addFirstNode}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-[13px] font-medium text-zinc-200 transition-colors hover:border-zinc-700"
          >
            <Box size={14} /> Add an API gateway
          </button>
          <Link
            href="/start"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-[13px] font-medium text-zinc-200 transition-colors hover:border-brass/50 hover:text-brass"
          >
            <Sparkles size={14} /> Take the guided tour
          </Link>
        </div>

        <div className="mt-5 border-t border-zinc-800 pt-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Pro tips</p>
          <ul className="mt-2 space-y-1.5">
            {PRO_TIPS.map((tip) => (
              <li key={tip.keys} className="flex items-center gap-2 text-[12px] text-zinc-400">
                <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                  {tip.keys}
                </kbd>
                {tip.text}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={runNow}
            className="mt-3 text-[11.5px] font-medium text-content-secondary underline decoration-dotted underline-offset-2 hover:text-brass"
          >
            Just run the empty canvas
          </button>
        </div>
      </div>
    </div>
  );
}

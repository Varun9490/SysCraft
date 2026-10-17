'use client';

import { useMemo, useState } from "react";
import { History, Radio } from "@/components/ui/icons";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useSimStore } from "@/store/useSimStore";

/**
 * DVR time-travel scrubber: drag through the 60s telemetry ring to replay
 * traffic spikes frame by frame. Scrubbing freezes the readout on a past
 * tick; "Back to live" resumes the 10Hz tail.
 */

export function TimeTravelScrubber() {
  const history = useSimStore((s) => s.history);
  const nodes = useCanvasStore((s) => s.nodes);
  const [index, setIndex] = useState<number | null>(null);

  const live = index === null;
  const snapshot = useMemo(() => {
    if (history.length === 0) return null;
    if (index === null) return history[history.length - 1] ?? null;
    return history[Math.max(0, Math.min(index, history.length - 1))] ?? null;
  }, [history, index]);

  const rows = useMemo(() => {
    if (!snapshot) return [];
    return Object.values(snapshot.nodes)
      .sort((a, b) => b.arrivalRps - a.arrivalRps)
      .slice(0, 5)
      .map((t) => ({
        label: String(nodes.find((n) => n.id === t.nodeId)?.data.label ?? t.nodeId),
        rps: t.arrivalRps,
        p99: t.p99Ms,
        err: t.errorRate,
      }));
  }, [snapshot, nodes]);

  if (history.length < 2) return null;

  return (
    <div className="pointer-events-auto absolute bottom-3 left-1/2 z-30 w-full max-w-xl -translate-x-1/2 rounded-xl border border-zinc-800 bg-zinc-950/90 px-3 py-2 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-2">
        <History size={14} className="shrink-0 text-zinc-400" />
        <input
          type="range"
          min={0}
          max={history.length - 1}
          value={index ?? history.length - 1}
          onChange={(e) => setIndex(Number(e.target.value))}
          className="flex-1"
          aria-label="Scrub simulation history"
        />
        <button
          onClick={() => setIndex(null)}
          className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${
            live ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
          }`}
        >
          <Radio size={11} /> {live ? "Live" : "Back to live"}
        </button>
      </div>
      {snapshot && (
        <div className="mt-1 flex items-center gap-3 text-[11px] tabular-nums text-zinc-400">
          <span className={live ? "" : "text-amber-300"}>
            {live ? "live" : `replay`} · t{snapshot.tick}
          </span>
          <span>{snapshot.globalRps >= 1000 ? `${(snapshot.globalRps / 1000).toFixed(1)}k` : snapshot.globalRps.toFixed(0)} rps</span>
          <span>p99 {snapshot.globalP99Ms >= 1000 ? `${(snapshot.globalP99Ms / 1000).toFixed(2)}s` : `${snapshot.globalP99Ms.toFixed(0)}ms`}</span>
          <span>err {(snapshot.globalErrorRate * 100).toFixed(2)}%</span>
          <span className="hidden truncate md:inline">
            top: {rows.map((r) => r.label).join(" · ").slice(0, 60)}
          </span>
        </div>
      )}
    </div>
  );
}

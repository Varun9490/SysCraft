'use client';

import { RefreshCw, X } from "@/components/ui/icons";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useSimStore } from "@/store/useSimStore";

/**
 * Jaeger-style OpenTelemetry waterfall: hop-by-hop spans sampled from the
 * live snapshot, rendered as a proportional flamegraph with status colors,
 * durations, and per-span queue/utilization attributes.
 */

interface TraceWaterfallModalProps {
  open: boolean;
  onClose: () => void;
}

export function TraceWaterfallModal({ open, onClose }: TraceWaterfallModalProps) {
  const latestTrace = useSimStore((s) => s.latestTrace);
  const generateTrace = useSimStore((s) => s.generateTrace);

  if (!open) return null;

  const total = latestTrace?.totalDurationMs ?? 0;

  const resample = () => {
    generateTrace(useCanvasStore.getState().toGraphTopology());
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/75 p-3" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Trace waterfall"
      >
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-base font-bold text-zinc-50">Trace waterfall</h3>
          {latestTrace && (
            <span className="font-mono text-[11px] text-zinc-500">
              {latestTrace.traceId.slice(0, 16)}… · tick {latestTrace.sampledAtTick} · {total.toFixed(1)}ms
            </span>
          )}
          <button onClick={resample} className="ml-auto flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
            <RefreshCw size={13} /> Sample now
          </button>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 hover:bg-zinc-800" aria-label="Close traces">
            <X size={16} />
          </button>
        </div>

        {!latestTrace || latestTrace.spans.length === 0 ? (
          <p className="rounded-md border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-400">
            No spans sampled yet. Run the simulation with at least one traffic-generating node, then sample again.
          </p>
        ) : (
          <div className="space-y-1.5">
            {latestTrace.spans.map((span) => {
              const leftPct = total > 0 ? (span.startTimeMs / total) * 100 : 0;
              const widthPct = total > 0 ? Math.max(1.5, (span.durationMs / total) * 100) : 0;
              const failed = span.status === "error";
              return (
                <div key={span.spanId} className="rounded bg-zinc-900/60 px-2 py-1.5">
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-zinc-200">
                      {span.serviceName} <span className="text-zinc-500">{span.operationName}</span>
                    </span>
                    <span className={`tabular-nums ${failed ? "text-red-300" : "text-zinc-300"}`}>
                      {span.durationMs.toFixed(1)}ms · {span.httpStatus}
                    </span>
                  </div>
                  <div className="relative h-3 overflow-hidden rounded bg-zinc-950">
                    <div
                      className={`absolute top-0 h-full rounded ${failed ? "bg-red-400" : "bg-sky-400"}`}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      title={`${span.serviceName}: ${span.durationMs.toFixed(1)}ms`}
                    />
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
                    p99 {span.attributes["syscanvas.p99_ms"]}ms · ρ {span.attributes["syscanvas.utilization"]} · q {span.attributes["syscanvas.queue_depth"]}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

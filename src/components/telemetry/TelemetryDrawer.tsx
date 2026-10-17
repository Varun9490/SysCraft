'use client';

import { useMemo } from "react";
import { Activity, X } from "@/components/ui/icons";
import type { SimTickSnapshot } from "@/types/simulation";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useSimStore } from "@/store/useSimStore";

/**
 * Grafana-style observability drawer: P50/P95/P99, RPS, error burn, and
 * FinOps cost time-series rendered as lightweight SVG sparklines over the
 * 60s DVR ring, plus a per-selected-node inspector fed by the 10Hz store.
 */

interface TelemetryDrawerProps {
  open: boolean;
  onClose: () => void;
}

function Sparkline({ values, color, label, format }: { values: number[]; color: string; label: string; format: (v: number) => string }) {
  const { path, last } = useMemo(() => {
    const width = 220;
    const height = 44;
    if (values.length < 2) return { path: "", last: values[0] ?? 0 };
    const max = Math.max(...values, 1e-9);
    const min = Math.min(...values, 0);
    const span = max - min || 1;
    const step = width / (values.length - 1);
    const d = values
      .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - 3 - ((v - min) / span) * (height - 8)).toFixed(1)}`)
      .join(" ");
    return { path: d, last: values[values.length - 1] ?? 0 };
  }, [values]);
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 p-2">
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-zinc-400">{label}</span>
        <span className="font-semibold tabular-nums text-zinc-100">{format(last)}</span>
      </div>
      <svg viewBox="0 0 220 44" className="h-11 w-full">
        {path ? <path d={path} fill="none" stroke={color} strokeWidth={1.8} /> : <text x={8} y={24} fontSize={10} fill="#71717a">awaiting samples…</text>}
      </svg>
    </div>
  );
}

const fmtRps = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0));
const fmtMs = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${v.toFixed(0)}ms`);
const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;
const fmtUsd = (v: number) => `$${v.toFixed(2)}/h`;

export function TelemetryDrawer({ open, onClose }: TelemetryDrawerProps) {
  const history = useSimStore((s) => s.history);
  const nodeTelemetry = useSimStore((s) => s.nodeTelemetry);
  const tick = useSimStore((s) => s.tick);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const nodes = useCanvasStore((s) => s.nodes);

  const series = useMemo(() => {
    const take = (pick: (snap: SimTickSnapshot) => number) => history.map(pick);
    return {
      rps: take((s) => s.globalRps),
      p99: take((s) => s.globalP99Ms),
      err: take((s) => s.globalErrorRate),
      cost: take((s) => s.totalCostPerHourUsd),
    };
  }, [history]);

  const selected = selectedNodeId ? nodeTelemetry[selectedNodeId] : undefined;
  const selectedLabel = nodes.find((n) => n.id === selectedNodeId)?.data.label;

  const hottest = useMemo(
    () =>
      Object.values(nodeTelemetry)
        .sort((a, b) => b.p99Ms - a.p99Ms)
        .slice(0, 5),
    [nodeTelemetry],
  );

  if (!open) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 max-h-[46vh] overflow-y-auto border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="flex items-center gap-2 px-4 py-2">
        <Activity size={15} className="text-emerald-300" />
        <h3 className="text-sm font-bold text-zinc-50">Telemetry</h3>
        <span className="text-[11px] tabular-nums text-zinc-500">tick {tick} · {history.length} samples (60s DVR)</span>
        <button onClick={onClose} className="ml-auto flex h-7 w-7 items-center justify-center rounded border border-zinc-700 text-zinc-400 hover:bg-zinc-800" aria-label="Close telemetry">
          <X size={14} />
        </button>
      </div>
      <div className="grid gap-2 px-4 pb-3 md:grid-cols-4">
        <Sparkline values={series.rps} color="#CDA86A" label="Global RPS" format={fmtRps} />
        <Sparkline values={series.p99} color="#a78bfa" label="Global p99" format={fmtMs} />
        <Sparkline values={series.err} color="#f87171" label="Error burn" format={fmtPct} />
        <Sparkline values={series.cost} color="#34d399" label="Burn rate" format={fmtUsd} />
      </div>
      <div className="grid gap-2 px-4 pb-4 md:grid-cols-2">
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-2.5">
          <p className="mb-1.5 text-xs font-bold text-zinc-100">
            {selected ? `Selected — ${String(selectedLabel ?? selected.nodeId)}` : "Hottest nodes by p99"}
          </p>
          {selected ? (
            <div className="grid grid-cols-3 gap-1.5 text-[11px] tabular-nums">
              {[
                ["Arrival", `${fmtRps(selected.arrivalRps)} rps`],
                ["Output", `${fmtRps(selected.outputRps)} rps`],
                ["Util ρ", selected.utilization.toFixed(2)],
                ["p50", fmtMs(selected.p50Ms)],
                ["p95", fmtMs(selected.p95Ms)],
                ["p99", fmtMs(selected.p99Ms)],
                ["Queue", selected.queueDepth.toFixed(0)],
                ["CPU", `${selected.cpuPct.toFixed(0)}%`],
                ["Errors", fmtPct(selected.errorRate)],
              ].map(([k, v]) => (
                <div key={k} className="rounded bg-zinc-900 px-1.5 py-1">
                  <p className="text-zinc-500">{k}</p>
                  <p className="font-semibold text-zinc-100">{v}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {hottest.map((t) => (
                <button
                  key={t.nodeId}
                  onClick={() => useCanvasStore.getState().setSelectedNodeId(t.nodeId)}
                  className="flex w-full items-center justify-between rounded bg-zinc-900 px-2 py-1 text-[11px] tabular-nums hover:bg-zinc-800"
                >
                  <span className="truncate text-zinc-300">{String(nodes.find((n) => n.id === t.nodeId)?.data.label ?? t.nodeId)}</span>
                  <span className="text-zinc-100">{fmtRps(t.arrivalRps)} rps · p99 {fmtMs(t.p99Ms)}</span>
                </button>
              ))}
              {hottest.length === 0 && <p className="text-[11px] text-zinc-500">Run the simulation to populate node telemetry.</p>}
            </div>
          )}
        </div>
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-2.5">
          <p className="mb-1.5 text-xs font-bold text-zinc-100">FinOps snapshot</p>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            Current burn <span className="font-semibold text-emerald-300">{fmtUsd(useSimStore.getState().totalCostPerHourUsd)}</span> across{" "}
            {nodes.length} placed resources. Scale-in candidates: nodes under ρ 0.25 sustained. Every replica-hour is
            priced from the seed catalog, so topology edits move this number live.
          </p>
        </div>
      </div>
    </div>
  );
}

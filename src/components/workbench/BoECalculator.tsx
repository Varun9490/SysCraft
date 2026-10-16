'use client';

import { ArrowRightLeft } from "lucide-react";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import { useCanvasStore } from "@/store/useCanvasStore";

/**
 * Back-of-the-envelope capacity calculator synced to the canvas.
 * Every keystroke recomputes QPS, storage, bandwidth, node count, and cost;
 * one click pushes the peak RPS budget onto the selected canvas node as its
 * traffic-generator rate.
 */

const FIELDS: Array<{ key: "dailyActiveUsers" | "readsPerUserPerDay" | "writesPerUserPerDay" | "avgReadSizeKb" | "avgWriteSizeKb" | "retentionDays" | "replicationCopies" | "peakFactor"; label: string; step: number }> = [
  { key: "dailyActiveUsers", label: "Daily active users", step: 100000 },
  { key: "readsPerUserPerDay", label: "Reads / user / day", step: 1 },
  { key: "writesPerUserPerDay", label: "Writes / user / day", step: 1 },
  { key: "avgReadSizeKb", label: "Avg read size (KB)", step: 1 },
  { key: "avgWriteSizeKb", label: "Avg write size (KB)", step: 1 },
  { key: "retentionDays", label: "Retention (days)", step: 30 },
  { key: "replicationCopies", label: "Replication copies", step: 1 },
  { key: "peakFactor", label: "Peak multiplier", step: 0.5 },
];

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 100) return n.toFixed(0);
  if (n >= 1) return n.toFixed(1);
  return n.toFixed(2);
}

export function BoECalculator() {
  const boeParams = useWorkbenchStore((s) => s.boeParams);
  const boeResult = useWorkbenchStore((s) => s.boeResult);
  const setBoeParams = useWorkbenchStore((s) => s.setBoeParams);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);

  const pushToCanvas = () => {
    if (!selectedNodeId || !boeResult) return;
    const peakRps = Math.max(1, Math.round(boeResult.readQpsPeak + boeResult.writeQpsPeak));
    useCanvasStore.getState().updateNodeOverrides(selectedNodeId, { clientRps: peakRps });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="block rounded-md border border-zinc-800 bg-zinc-900/60 p-2">
            <span className="mb-1 block text-[11px] text-zinc-400">{f.label}</span>
            <input
              type="number"
              min={0}
              step={f.step}
              value={boeParams[f.key]}
              onChange={(e) => setBoeParams({ [f.key]: Math.max(0, Number(e.target.value)) } as Partial<typeof boeParams>)}
              className="w-full rounded bg-zinc-950 px-1.5 py-1 text-sm tabular-nums text-zinc-100"
            />
          </label>
        ))}
      </div>

      {boeResult && (
        <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-2.5">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs tabular-nums md:grid-cols-3">
            <div><p className="text-zinc-500">Read QPS avg/peak</p><p className="font-semibold text-zinc-100">{fmt(boeResult.readQpsAvg)} / {fmt(boeResult.readQpsPeak)}</p></div>
            <div><p className="text-zinc-500">Write QPS avg/peak</p><p className="font-semibold text-zinc-100">{fmt(boeResult.writeQpsAvg)} / {fmt(boeResult.writeQpsPeak)}</p></div>
            <div><p className="text-zinc-500">Egress peak</p><p className="font-semibold text-zinc-100">{fmt(boeResult.egressMbpsPeak)} Mbps</p></div>
            <div><p className="text-zinc-500">Storage total</p><p className="font-semibold text-zinc-100">{fmt(boeResult.storageGbTotal)} GB</p></div>
            <div><p className="text-zinc-500">Est. nodes</p><p className="font-semibold text-zinc-100">{boeResult.estimatedNodes}</p></div>
            <div><p className="text-zinc-500">Monthly cost</p><p className="font-semibold text-emerald-300">${fmt(boeResult.monthlyCostUsd)}</p></div>
          </div>
          <button
            onClick={pushToCanvas}
            disabled={!selectedNodeId}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md bg-sky-500 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
            title={selectedNodeId ? "Set selected node clientRps to peak QPS" : "Select a canvas node first"}
          >
            <ArrowRightLeft size={13} />
            {selectedNodeId ? `Push ${fmt(boeResult.readQpsPeak + boeResult.writeQpsPeak)} peak RPS to selected node` : "Select a canvas node to push RPS"}
          </button>
        </div>
      )}
    </div>
  );
}

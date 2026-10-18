'use client';

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trash2, X } from "@/components/ui/icons";
import { useCanvasStore, EDGE_CONDITION_LABELS, type CanvasEdgeData, type EdgeCondition } from "@/store/useCanvasStore";
import { getNodeLabel } from "@/components/canvas/edgeHelpers";

/**
 * Connection inspector: edits the selected edge's flowchart text label and
 * routing condition. Edge selection already flows through the store (React
 * Flow writes `selected` flags), so this reads a single derived value.
 */

const CONDITION_ROWS: EdgeCondition[] = [
  "none",
  "cache_hit",
  "cache_miss",
  "read",
  "write",
  "rate_limited",
  "error",
  "async",
];

const CONDITION_HINT: Record<EdgeCondition, string> = {
  none: "Plain connection; particles ride the full flow.",
  cache_hit: "Particles scale by the source's live cache-hit ratio.",
  cache_miss: "Traffic that bypasses the cache and hits origin.",
  read: "Only the read half of the source's traffic mix.",
  write: "Only the write half of the source's traffic mix.",
  rate_limited: "Dropped/429 packets render red at the source's drop rate.",
  error: "Failed calls; particle color follows the target's error rate.",
  async: "Queued hop — rendered dashed, outside the critical path.",
};

export function ConnectionInspector() {
  const selectedEdge = useCanvasStore((s) => s.edges.find((edge) => edge.selected));
  const updateEdgeData = useCanvasStore((s) => s.updateEdgeData);
  const removeEdge = useCanvasStore((s) => s.removeEdge);
  const [dismissed, setDismissed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const data = useMemo<CanvasEdgeData>(() => (selectedEdge?.data ?? {}) as CanvasEdgeData, [selectedEdge]);
  void useCanvasStore((s) => s.nodes.length);

  // Reset the dismissal whenever selection actually clears.
  useEffect(() => {
    if (!selectedEdge) setDismissed(false);
    if (!selectedEdge) setConfirmDelete(false);
  }, [selectedEdge]);

  if (!selectedEdge || dismissed) return null;

  const condition: EdgeCondition = data.condition ?? "none";
  const label = data.label ?? "";
  const sourceLabel = getNodeLabel(selectedEdge.source);
  const targetLabel = getNodeLabel(selectedEdge.target);

  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto absolute right-3 top-16 z-30 w-[300px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
      aria-label="Connection inspector"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-zinc-100">Connection</p>
          <p className="truncate text-[10.5px] text-zinc-500">
            {sourceLabel} → {targetLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          title="Close"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-4 px-3.5 py-3.5">
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">Label</span>
          <input
            value={label}
            placeholder="e.g. gRPC fanout / orders topic"
            onChange={(event) => updateEdgeData(selectedEdge.id, { label: event.target.value })}
            className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900/70 px-2.5 py-1.5 text-[13px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-brass/60"
          />
          <span className="mt-1 block text-[10.5px] text-zinc-600">
            Text printed on the link: protocol, topic, or what this connection means.
          </span>
        </label>

        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">Routing condition</span>
          <select
            value={condition}
            onChange={(event) => updateEdgeData(selectedEdge.id, { condition: event.target.value as EdgeCondition })}
            className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900/70 px-2.5 py-1.5 text-[13px] text-zinc-100 outline-none transition-colors focus:border-brass/60"
          >
            {CONDITION_ROWS.map((row) => (
              <option key={row} value={row}>
                {EDGE_CONDITION_LABELS[row]}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[10.5px] text-zinc-600">{CONDITION_HINT[condition]}</span>
        </label>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-2.5 text-[11.5px] leading-relaxed text-zinc-400">
          Model flowcharts with conditions: give a cache both a <span className="text-emerald-300">Cache hit</span> and a{" "}
          <span className="text-amber-300">Cache miss → origin</span> edge, and live traffic splits across them by the real
          hit ratio.
        </div>

        <button
          type="button"
          onClick={() => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              window.setTimeout(() => setConfirmDelete(false), 2600);
              return;
            }
            removeEdge(selectedEdge.id);
          }}
          className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-medium transition-colors ${
            confirmDelete
              ? "border-red-500/70 bg-red-500/15 text-red-300"
              : "border-red-500/25 bg-red-500/5 text-red-300/80 hover:bg-red-500/15"
          }`}
        >
          <Trash2 size={13} /> {confirmDelete ? "Click again to delete link" : "Delete connection"}
        </button>
      </div>
    </motion.aside>
  );
}

'use client';

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trash2, X } from "@/components/ui/icons";
import { useCanvasStore, conditionColor, EDGE_CONDITION_LABELS, type CanvasEdgeData, type EdgeCondition } from "@/store/useCanvasStore";
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

/** Curated accent palette for per-link colours in the appearance picker. */
const EDGE_PALETTE: string[] = [
  "#67e8f9",
  "#7dd3fc",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#f472b6",
  "#a78bfa",
  "#a1a1aa",
];

const LINE_PREVIEW_DASH: Record<string, string | undefined> = {
  solid: undefined,
  dashed: "6 5",
  dotted: "2 9",
};

export function ConnectionInspector() {
  const selectedEdge = useCanvasStore((s) => s.edges.find((edge) => edge.selected));
  const updateEdgeData = useCanvasStore((s) => s.updateEdgeData);
  const removeEdge = useCanvasStore((s) => s.removeEdge);
  const [dismissed, setDismissed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hexDraft, setHexDraft] = useState("");

  const data = useMemo<CanvasEdgeData>(() => (selectedEdge?.data ?? {}) as CanvasEdgeData, [selectedEdge]);
  void useCanvasStore((s) => s.nodes.length);

  // Reset the dismissal whenever selection actually clears.
  useEffect(() => {
    if (!selectedEdge) setDismissed(false);
    if (!selectedEdge) setConfirmDelete(false);
  }, [selectedEdge]);

  // Re-seed the hex draft whenever the inspected edge changes.
  useEffect(() => {
    setHexDraft(((selectedEdge?.data as CanvasEdgeData | undefined)?.color ?? "").replace("#", ""));
  }, [selectedEdge?.id, selectedEdge?.data]);

  if (!selectedEdge || dismissed) return null;

  const condition: EdgeCondition = data.condition ?? "none";
  const label = data.label ?? "";
  const sourceLabel = getNodeLabel(selectedEdge.source);
  const targetLabel = getNodeLabel(selectedEdge.target);

  const strokeColor = /^#[0-9a-fA-F]{6}$/.test(String(data.color)) ? String(data.color) : conditionColor(condition);
  const width =
    typeof data.width === "number" && Number.isFinite(data.width) ? Math.min(5, Math.max(0.75, data.width)) : 1.6;
  const dash = data.lineStyle ? LINE_PREVIEW_DASH[data.lineStyle] : undefined;
  const marker = data.marker ?? "none";
  const isCustomColor = typeof data.color === "string" && data.color.length > 0;

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

        <div className="space-y-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">Look of the link</span>

          {/* Live preview of the current appearance. */}
          <svg viewBox="0 0 132 16" className="h-4 w-full" aria-hidden="true">
            <line
              x1="3"
              y1="8"
              x2={marker === "none" ? 129 : 116}
              y2="8"
              stroke={strokeColor}
              strokeWidth={width}
              strokeDasharray={dash}
              strokeLinecap="round"
            />
            {marker === "arrow" && (
              <path d={`M${116} 8 L${108} ${Math.max(2, 8 - (width + 3))} L${110} 8 L${108} ${Math.min(14, 8 + (width + 3))} Z`} fill="none" stroke={strokeColor} strokeWidth={Math.max(1.2, width / 2)} strokeLinejoin="round" />
            )}
            {marker === "arrowClosed" && (
              <path d={`M${129} 8 L${113} ${Math.max(1, 8 - (width + 4))} L${113} ${Math.min(15, 8 + (width + 4))} Z`} fill={strokeColor} />
            )}
          </svg>

          {/* Colour: condition palette + custom hex override. */}
          <div className="flex flex-wrap items-center gap-1.5">
            {!isCustomColor && (
              <button
                type="button"
                onClick={() => updateEdgeData(selectedEdge.id, { color: null })}
                title="Reset to the condition's default colour"
                className="h-5 w-5 rounded-full border-2 border-brass"
                style={{ background: conditionColor(condition) }}
                aria-label="Default condition colour"
              />
            )}
            {EDGE_PALETTE.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => updateEdgeData(selectedEdge.id, { color: swatch })}
                title={swatch}
                className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${
                  data.color === swatch ? "border-2 border-white/80" : "border border-black/40"
                }`}
                style={{ background: swatch }}
                aria-label={`Link colour ${swatch}`}
              />
            ))}
            <span className="relative ml-0.5 flex items-center">
              <span className="pointer-events-none absolute left-2 text-[11px] text-zinc-500">#</span>
              <input
                value={hexDraft}
                onChange={(event) => {
                  setHexDraft(event.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6));
                  if (/^[0-9a-fA-F]{6}$/.test(event.target.value)) {
                    updateEdgeData(selectedEdge.id, { color: `#${event.target.value}` });
                  }
                }}
                onBlur={() => setHexDraft((data.color ?? "").replace("#", ""))}
                placeholder="custom"
                aria-label="Custom hex colour"
                className="w-[86px] rounded-lg border border-zinc-800 bg-zinc-900/70 py-1 pr-1.5 text-[11px] font-mono uppercase text-zinc-100 outline-none transition-colors placeholder:font-sans placeholder:normal-case placeholder:text-zinc-600 focus:border-brass/60"
                style={{ paddingLeft: "18px" }}
              />
            </span>
          </div>

          {/* Weight + line style + arrow marker. */}
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0.75}
              max={5}
              step={0.25}
              value={width}
              onChange={(event) => {
                const next = Number(event.target.value);
                updateEdgeData(selectedEdge.id, { width: next === 1.6 ? null : next });
              }}
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-800 accent-[#CDA86A]"
              aria-label="Line weight"
            />
            <span className="w-9 shrink-0 text-right tabular-nums text-[10.5px] text-zinc-400">{width.toFixed(2).replace(/\.?0+$/, "")}w</span>
          </div>

          <div className="grid grid-cols-[2fr_1fr] gap-1.5">
            <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
              {(["solid", "dashed", "dotted"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => updateEdgeData(selectedEdge.id, { lineStyle: option === "solid" ? null : option })}
                  className={`flex-1 rounded-md px-1 py-1 text-[10.5px] font-medium capitalize transition-colors ${
                    (data.lineStyle ?? "solid") === option
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
              {(["none", "arrow", "arrowClosed"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => updateEdgeData(selectedEdge.id, { marker: option === "none" ? null : option })}
                  title={option === "none" ? "No arrow" : option === "arrow" ? "Open arrowhead" : "Solid arrowhead"}
                  className={`flex-1 rounded-md px-1 py-1 text-[11px] transition-colors ${
                    (data.marker ?? "none") === option ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {option === "none" ? "–" : option === "arrow" ? "→" : "⇢"}
                </button>
              ))}
            </div>
          </div>
        </div>

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

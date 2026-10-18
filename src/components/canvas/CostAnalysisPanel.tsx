'use client';

import { useMemo } from "react";
import { motion } from "framer-motion";
import { X } from "@/components/ui/icons";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useSimStore } from "@/store/useSimStore";
import { getSeedResource } from "@/data/seedResources";
import { getCustomResource } from "@/store/customResourceRegistry";
import { CLOUD_REGIONS } from "@/data/regionLatency";

/**
 * Cost analysis — every block's bill, side by side, driven by what the user
 * decided each replica costs (stock, overridden per node, or custom spec).
 * Live utilization from the sim turns "how much capacity are we buying that
 * never serves traffic" into an idle-spend estimate.
 */

type LineItem = {
  id: string;
  label: string;
  color: string;
  replicas: number;
  unitCostUsd: number;
  region: string;
  utilization: number;
  isCustom: boolean;
  isOverridden: boolean;
};

export function CostAnalysisPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nodes = useCanvasStore((s) => s.nodes);
  const totalCostPerHourUsd = useSimStore((s) => s.totalCostPerHourUsd);
  const globalRps = useSimStore((s) => s.globalRps);

  const lineItems = useMemo<LineItem[]>(() => {
    return nodes.map((node) => {
      const overrides = node.data.overrides ?? {};
      const seed = getSeedResource(node.data.resourceId);
      const custom = seed ? undefined : getCustomResource(node.data.resourceId);
      const replicas = Math.min(
        64,
        Math.max(1, overrides.replicationFactor ?? seed?.defaults.replicationFactor ?? custom?.replicationFactor ?? 1),
      );
      const stock = seed?.defaults.costPerHourUsd ?? custom?.costPerHourUsd ?? 0.12;
      const unitCostUsd = overrides.costPerHourUsd ?? stock;
      const color = String(node.data.strokeColor ?? "#71717a");
      return {
        id: node.id,
        label: String(node.data.label ?? node.id),
        color,
        replicas,
        unitCostUsd,
        region: overrides.region ?? node.data.overrides?.region ?? "us-east-1",
        utilization: -1,
        isCustom: Boolean(custom),
        isOverridden: typeof overrides.costPerHourUsd === "number",
      };
    });
  }, [nodes]);

  const liveUtil = useSimStore((s) => s.nodeTelemetry);

  const items = useMemo<LineItem[]>(() => {
    return lineItems.map((item) => {
      const telem = liveUtil[item.id];
      if (!telem) return item;
      return { ...item, utilization: telem.utilization };
    });
  }, [lineItems, liveUtil]);

  const totalHourly = items.reduce((sum, item) => sum + item.unitCostUsd * item.replicas, 0);
  const idleHourly = items.reduce(
    (sum, item) => sum + (item.utilization >= 0 ? item.unitCostUsd * item.replicas * Math.max(0, 1 - item.utilization) : 0),
    0,
  );
  const activeHourly = totalHourly - idleHourly;
  const maxLine = Math.max(0.0001, ...items.map((i) => i.unitCostUsd * i.replicas));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Cost analysis">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.985 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <p className="text-[14.5px] font-semibold text-zinc-100">Cost analysis</p>
            <p className="text-[11.5px] text-zinc-500">
              You decide every replica-hour. This is the bill for what is on the canvas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Close cost analysis"
          >
            <X size={15} />
          </button>
        </div>

        {items.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-zinc-500">
            Drop some blocks on the canvas and the bill shows up here.
          </p>
        ) : (
          <div className="max-h-[62vh] overflow-y-auto px-5 py-4">
            <div className="mb-4 grid grid-cols-3 gap-2.5">
              {[
                { k: "Per hour", v: `$${totalHourly.toFixed(2)}`, tone: "text-zinc-100" },
                { k: "Per month", v: `$${Math.round(totalHourly * 730).toLocaleString()}`, tone: "text-brass" },
                {
                  k: "Live global RPS",
                  v: globalRps > 0 ? Math.round(globalRps).toLocaleString() : simIdle(totalCostPerHourUsd, totalHourly),
                  tone: "text-sky-300",
                },
              ].map((card) => (
                <div key={card.k} className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3.5 py-3">
                  <p className="text-[10.5px] uppercase tracking-[0.14em] text-zinc-500">{card.k}</p>
                  <p className={`mt-1 text-[19px] font-semibold tabular-nums ${card.tone}`}>{card.v}</p>
                </div>
              ))}
            </div>

            <ul className="space-y-1.5">
              {[...items]
                .sort((a, b) => b.unitCostUsd * b.replicas - a.unitCostUsd * a.replicas)
                .map((item) => {
                  const lineHourly = item.unitCostUsd * item.replicas;
                  const idleShare =
                    item.utilization >= 0 ? Math.max(0, 1 - item.utilization) * lineHourly : 0;
                  return (
                    <li key={item.id} className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="min-w-0 flex-1 truncate text-[12.5px] text-zinc-200">{item.label}</span>
                        {item.isOverridden && (
                          <span className="rounded bg-brass/15 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-brass">
                            your price
                          </span>
                        )}
                        {item.isCustom && (
                          <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-sky-300">
                            custom
                          </span>
                        )}
                        <span className="w-28 shrink-0 text-right text-[11px] text-zinc-500 tabular-nums">
                          {item.replicas}× ${item.unitCostUsd.toFixed(2)}/h
                        </span>
                        <span className="w-20 shrink-0 text-right text-[12.5px] font-semibold text-zinc-100 tabular-nums">
                          ${lineHourly.toFixed(2)}/h
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-800">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(lineHourly / maxLine) * 100}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                        </div>
                        <span className="w-44 shrink-0 text-right text-[10px] uppercase tracking-wide text-zinc-600">
                          {CLOUD_REGIONS.some((r) => r.id === item.region) ? item.region : item.region}                          {item.utilization >= 0
                            ? ` · util ${(item.utilization * 100).toFixed(0)}%${idleShare > 0.5 ? ` · ${idleShare.toFixed(2)}/h idle` : ""}`
                            : ""}
                        </span>
                      </div>
                    </li>
                  );
                })}
            </ul>

            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
              <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Where the money goes
              </p>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-zinc-800">
                {(() => {
                  if (totalHourly <= 0) return null;
                  return items
                    .slice()
                    .sort((a, b) => b.unitCostUsd * b.replicas - a.unitCostUsd * a.replicas)
                    .map((item) => (
                      <div
                        key={item.id}
                        style={{ flex: item.unitCostUsd * item.replicas, backgroundColor: item.color }}
                        title={`${item.label} $${(item.unitCostUsd * item.replicas).toFixed(2)}/h`}
                      />
                    ));
                })()}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                Press play to see idle spend — capacity bought but never serving traffic — split out live. Right now{" "}
                {idleHourly > 0.01 ? (
                  <span className="text-amber-300">${idleHourly.toFixed(2)}/h idle</span>
                ) : (
                  <span className="text-zinc-300">run the sim to measure idle spend</span>
                )}
                {" · serving "}
                <span className="text-emerald-300">${activeHourly.toFixed(2)}/h</span>.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function simIdle(simCost: number, staticCost: number): string {
  return simCost > 0 ? `$${simCost.toFixed(2)}/h live` : `$${staticCost.toFixed(2)}/h`;
}

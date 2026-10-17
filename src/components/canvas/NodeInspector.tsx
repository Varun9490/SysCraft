'use client';

import { useMemo, useState } from "react";
import {
  ClipboardCopy,
  Globe,
  Layers,
  Server,
  Trash2,
  X,
} from "@/components/ui/icons";
import { CLOUD_REGIONS, getRegionLatencyMs } from "@/data/regionLatency";
import { getSeedResource, SEED_RESOURCES } from "@/data/seedResources";
import { useCanvasStore } from "@/store/useCanvasStore";
import { getCustomResource } from "@/store/customResourceRegistry";
import type { ResourceCategory } from "@/types/resource";

/**
 * Right-hand configuration inspector for the currently selected canvas node.
 *
 * Edits flow straight into `useCanvasStore` node overrides (structural state),
 * never into `useSimStore` telemetry — so editing config never touches the
 * simulation's hot path or any node besides the one being edited.
 */

const WRITE_RATIO_CATEGORIES: ResourceCategory[] = ["database", "storage", "cache", "streaming"];
const RATE_LIMIT_CATEGORIES: ResourceCategory[] = ["api", "edge", "security", "network"];
const CACHE_CATEGORIES: ResourceCategory[] = ["cache", "edge"];

interface RefDefault {
  baseThroughputRps: number;
  replicationFactor: number;
  maxConcurrency: number;
  baseP50Ms: number;
  baseP99Ms: number;
  costPerHourUsd: number;
  securityScore?: number;
  availability?: number;
  consistency?: string;
  writeRatio: number;
  cacheHitRate: number;
  rateLimitRps: number;
  region: string;
  multiAz: boolean;
  avgPromptTokens?: number;
  avgOutputTokens?: number;
  vramGbPerReplica?: number;
}

function categoryIcon(category: ResourceCategory): typeof Server {
  switch (category) {
    case "edge":
    case "network":
      return Globe;
    case "storage":
    case "database":
    case "vector_db":
      return Layers;
    default:
      return Server;
  }
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">{label}</span>
        {hint ? <span className="text-[10.5px] text-zinc-600">{hint}</span> : null}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

const INPUT_CLASS =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900/70 px-2.5 py-1.5 text-[13px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-brass/60";

function NumberInput({
  value,
  placeholder,
  min,
  max,
  step = 1,
  onCommit,
}: {
  value: number | undefined;
  placeholder: string;
  min?: number;
  max?: number;
  step?: number;
  onCommit: (value: number | undefined) => void;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      onChange={(event) => {
        const raw = event.target.value;
        if (raw === "") {
          onCommit(undefined);
          return;
        }
        let parsed = Number(raw);
        if (!Number.isFinite(parsed)) return;
        if (min !== undefined) parsed = Math.max(min, parsed);
        if (max !== undefined) parsed = Math.min(max, parsed);
        onCommit(parsed);
      }}
      className={INPUT_CLASS}
    />
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex w-full items-center justify-between gap-3 rounded-lg border px-2.5 py-2 text-[12.5px] transition-colors ${
        checked ? "border-brass/50 bg-brass/10 text-zinc-100" : "border-zinc-800 bg-zinc-900/70 text-zinc-400"
      }`}
    >
      <span>{label}</span>
      <span className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${checked ? "bg-brass" : "bg-zinc-700"}`}>
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-zinc-950 transition-transform ${
            checked ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export function NodeInspector({ onClose }: { onClose: () => void }) {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const node = useCanvasStore((s) => s.nodes.find((n) => n.id === selectedNodeId));
  const updateNodeOverrides = useCanvasStore((s) => s.updateNodeOverrides);
  const renameNode = useCanvasStore((s) => s.renameNode);
  const duplicateNode = useCanvasStore((s) => s.duplicateNode);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const nodeCount = useCanvasStore((s) => s.nodes.length);
  const edgeCount = useCanvasStore((s) => s.edges.length);
  const [refRegion, setRefRegion] = useState("us-east-1");

  const resourceId = node ? String(node.data.resourceId ?? "") : "";
  const seed = useMemo(() => getSeedResource(resourceId), [resourceId]);
  const custom = useMemo(() => (seed ? undefined : getCustomResource(resourceId)), [seed, resourceId]);

  const ref = useMemo<RefDefault | undefined>(() => {
    if (seed) {
      const d = seed.defaults;
      return {
        baseThroughputRps: d.baseThroughputRps,
        replicationFactor: d.replicationFactor,
        maxConcurrency: d.maxConcurrency,
        baseP50Ms: d.baseP50Ms,
        baseP99Ms: d.baseP99Ms,
        costPerHourUsd: d.costPerHourUsd,
        securityScore: d.securityScore,
        availability: d.availability,
        consistency: d.consistency,
        writeRatio: d.writeRatio,
        cacheHitRate: d.cacheHitRate,
        rateLimitRps: d.rateLimitRps,
        region: d.region,
        multiAz: d.multiAz,
        avgPromptTokens: d.avgPromptTokens,
        avgOutputTokens: d.avgOutputTokens,
        vramGbPerReplica: d.vramGbPerReplica,
      };
    }
    if (custom) {
      return {
        baseThroughputRps: custom.baseThroughputRps,
        replicationFactor: custom.replicationFactor,
        maxConcurrency: custom.maxConcurrency,
        baseP50Ms: custom.baseP50Ms,
        baseP99Ms: custom.baseP99Ms,
        costPerHourUsd: custom.costPerHourUsd,
        writeRatio: custom.writeRatio,
        cacheHitRate: custom.cacheHitRate,
        rateLimitRps: custom.rateLimitRps,
        region: custom.region,
        multiAz: custom.multiAz,
      };
    }
    return undefined;
  }, [seed, custom]);

  if (!node) return null;

  const overrides = node.data.overrides ?? {};
  const label = String(node.data.label ?? "Node");
  const category: ResourceCategory = seed?.category ?? custom?.category ?? "compute";
  const Icon = categoryIcon(category);
  const strokeColor = seed?.strokeColor ?? custom?.strokeColor ?? "#CDA86A";

  const region = overrides.region ?? ref?.region ?? "us-east-1";
  const replicationFactor = overrides.replicationFactor ?? ref?.replicationFactor ?? 1;
  const baseThroughputRps = overrides.baseThroughputRps ?? ref?.baseThroughputRps ?? 1000;
  const multiAz = overrides.multiAz ?? ref?.multiAz ?? false;

  const clusterCapacity = Math.round(baseThroughputRps * replicationFactor);
  const rtt = getRegionLatencyMs(refRegion, region);
  const isCrossRegion = region !== refRegion;
  const regionName = CLOUD_REGIONS.find((r) => r.id === region)?.label ?? region;

  const set = (partial: Parameters<typeof updateNodeOverrides>[1]) => updateNodeOverrides(node.id, partial);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-3 border-b border-zinc-800/80 px-4 py-3.5">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${strokeColor}22`, color: strokeColor }}
        >
          <Icon size={16} weight="bold" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-zinc-100">{label}</p>
          <p className="truncate text-[10.5px] uppercase tracking-wider text-zinc-500">
            {seed?.name ?? custom?.name ?? resourceId} · {category.replace("_", " ")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close inspector"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          <X size={14} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <Field label="Name">
          <input value={label} onChange={(event) => renameNode(node.id, event.target.value)} className={INPUT_CLASS} />
        </Field>

        <Field label="Region" hint={regionName}>
          <select value={region} onChange={(event) => set({ region: event.target.value })} className={INPUT_CLASS}>
            {CLOUD_REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="rounded-xl border border-line/70 bg-app-raised/40 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-zinc-500">
              RTT to {CLOUD_REGIONS.find((r) => r.id === refRegion)?.label ?? refRegion}
            </span>
            <span
              className={`text-[15px] font-semibold tabular-nums ${
                rtt > 120 ? "text-red-400" : rtt > 60 ? "text-amber-300" : "text-emerald-300"
              }`}
            >
              {isCrossRegion ? `${rtt}ms` : "local"}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
            {isCrossRegion
              ? `Every call from the reference region pays ~${rtt}ms round trip. Keep chatty dependencies co-located.`
              : "Same region — sub-2ms backbone latency."}
          </p>
          <select
            value={refRegion}
            onChange={(event) => setRefRegion(event.target.value)}
            className={`${INPUT_CLASS} mt-2.5`}
          >
            {CLOUD_REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                Reference: {r.label}
              </option>
            ))}
          </select>
        </div>

        <Toggle checked={multiAz} onChange={(value) => set({ multiAz: value })} label="Multi-AZ deployment" />

        <div className="space-y-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Capacity</p>

          <Field label="Replicas" hint={ref ? `default ${ref.replicationFactor}` : undefined}>
            <NumberInput
              value={overrides.replicationFactor}
              placeholder={String(ref?.replicationFactor ?? 1)}
              min={1}
              onCommit={(value) => set({ replicationFactor: value })}
            />
          </Field>

          <Field label="Per-replica rps" hint={ref ? `default ${ref.baseThroughputRps}` : undefined}>
            <NumberInput
              value={overrides.baseThroughputRps}
              placeholder={String(ref?.baseThroughputRps ?? 1000)}
              min={1}
              onCommit={(value) => set({ baseThroughputRps: value })}
            />
          </Field>

          <Field label="Max concurrency" hint={ref ? `default ${ref.maxConcurrency}` : undefined}>
            <NumberInput
              value={overrides.maxConcurrency}
              placeholder={String(ref?.maxConcurrency ?? 500)}
              min={1}
              onCommit={(value) => set({ maxConcurrency: value })}
            />
          </Field>

          <Field label="Entry traffic (rps)" hint="blank = auto">
            <NumberInput
              value={overrides.clientRps}
              placeholder="auto (entry nodes get 500)"
              min={0}
              onCommit={(value) => set({ clientRps: value })}
            />
          </Field>

          <div className="rounded-lg border border-line/60 bg-app-raised/30 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">Cluster ceiling</p>
            <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-brass">
              {(clusterCapacity / 1000).toFixed(clusterCapacity >= 10000 ? 0 : 1)}k rps
            </p>
            <p className="text-[10.5px] text-zinc-600">
              {replicationFactor} × {baseThroughputRps.toLocaleString()} rps/replica
            </p>
          </div>
        </div>

        {(WRITE_RATIO_CATEGORIES.includes(category) ||
          RATE_LIMIT_CATEGORIES.includes(category) ||
          CACHE_CATEGORIES.includes(category) ||
          category === "ai_llm") && (
          <div className="space-y-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Behaviour</p>

            {WRITE_RATIO_CATEGORIES.includes(category) && (
              <Field label="Write ratio" hint={ref ? `default ${ref.writeRatio}` : undefined}>
                <NumberInput
                  value={overrides.writeRatio}
                  placeholder={String(ref?.writeRatio ?? 0.2)}
                  min={0}
                  max={1}
                  step={0.05}
                  onCommit={(value) => set({ writeRatio: value })}
                />
              </Field>
            )}

            {CACHE_CATEGORIES.includes(category) && (
              <Field label="Cache hit rate" hint={ref ? `default ${ref.cacheHitRate}` : undefined}>
                <NumberInput
                  value={overrides.cacheHitRate}
                  placeholder={String(ref?.cacheHitRate ?? 0)}
                  min={0}
                  max={1}
                  step={0.05}
                  onCommit={(value) => set({ cacheHitRate: value })}
                />
              </Field>
            )}

            {RATE_LIMIT_CATEGORIES.includes(category) && (
              <Field label="Rate limit (rps)" hint={ref ? `default ${ref.rateLimitRps}` : undefined}>
                <NumberInput
                  value={overrides.rateLimitRps}
                  placeholder={String(ref?.rateLimitRps ?? 10000)}
                  min={1}
                  onCommit={(value) => set({ rateLimitRps: value })}
                />
              </Field>
            )}

            {category === "ai_llm" && (
              <>
                <Field label="Prompt tokens" hint="avg input">
                  <NumberInput
                    value={overrides.avgPromptTokens}
                    placeholder={String(ref?.avgPromptTokens ?? 1024)}
                    min={1}
                    onCommit={(value) => set({ avgPromptTokens: value })}
                  />
                </Field>
                <Field label="Output tokens" hint="avg decode">
                  <NumberInput
                    value={overrides.avgOutputTokens}
                    placeholder={String(ref?.avgOutputTokens ?? 256)}
                    min={1}
                    onCommit={(value) => set({ avgOutputTokens: value })}
                  />
                </Field>
                <Field label="VRAM / replica (GiB)">
                  <NumberInput
                    value={overrides.vramGbPerReplica}
                    placeholder={String(ref?.vramGbPerReplica ?? 0)}
                    min={0}
                    onCommit={(value) => set({ vramGbPerReplica: value })}
                  />
                </Field>
              </>
            )}
          </div>
        )}

        {ref && (
          <div className="space-y-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Reference</p>
            <dl className="grid grid-cols-2 gap-2 text-[11.5px]">
              {[
                { k: "p50", v: `${ref.baseP50Ms}ms` },
                { k: "p99", v: `${ref.baseP99Ms}ms` },
                { k: "cost", v: `$${ref.costPerHourUsd}/h` },
                ...(typeof ref.securityScore === "number" ? [{ k: "security", v: `${ref.securityScore}/100` }] : []),
                ...(typeof ref.availability === "number"
                  ? [{ k: "availability", v: `${(ref.availability * 100).toFixed(2)}%` }]
                  : []),
                ...(ref.consistency ? [{ k: "consistency", v: ref.consistency.replace(/_/g, " ") }] : []),
              ].map((row) => (
                <div
                  key={row.k}
                  className="flex items-center justify-between rounded-md border border-line/50 bg-app-raised/30 px-2 py-1.5"
                >
                  <dt className="text-zinc-600">{row.k}</dt>
                  <dd className="tabular-nums text-zinc-300">{row.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-zinc-800/80 px-4 py-3">
        <button
          type="button"
          onClick={() => duplicateNode(node.id)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-[12.5px] text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
        >
          <ClipboardCopy size={13} />
          Duplicate
        </button>
        <button
          type="button"
          onClick={() => removeNode(node.id)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300 transition-colors hover:bg-red-500/20"
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>
      <p className="border-t border-zinc-800/60 px-4 py-2 text-[10.5px] text-zinc-600">
        {nodeCount} nodes · {edgeCount} links · {SEED_RESOURCES.length} primitives in the catalog
      </p>
    </div>
  );
}

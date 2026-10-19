'use client';

import { useMemo, useState } from "react";
import {
  ClipboardCopy,
  Cpu,
  Trash2,
  X,
} from "@/components/ui/icons";
import { CLOUD_REGIONS, getRegionLatencyMs } from "@/data/regionLatency";
import { getSeedResource, SEED_RESOURCES } from "@/data/seedResources";
import { DEFAULT_SEED_MEMORY_GB, DEFAULT_SEED_VCPU, INSTANCE_PRESETS, formatScale, resolveInstanceSizing } from "@/engine/instanceSizing";
import { useCanvasStore } from "@/store/useCanvasStore";
import { getCustomResource } from "@/store/customResourceRegistry";
import { useSimStore } from "@/store/useSimStore";
import { NODE_DEFAULT_WIDTH, NODE_TIER_HEIGHTS, type ResourceCategory } from "@/types/resource";
import { resourceIconFor } from "./ResourceNode";

/**
 * Right-hand configuration inspector for the currently selected canvas node.
 *
 * Edits flow straight into `useCanvasStore` node overrides (structural state),
 * never into `useSimStore` telemetry — so editing config never touches the
 * simulation's hot path or any node besides the one being edited.
 * (The one deliberate exception: the live "buffer" readout subscribes to this
 * node's telemetry row only.)
 */

const WRITE_RATIO_CATEGORIES: ResourceCategory[] = ["database", "storage", "cache", "streaming"];
const RATE_LIMIT_CATEGORIES: ResourceCategory[] = ["api", "edge", "security", "network"];
const CACHE_CATEGORIES: ResourceCategory[] = ["cache", "edge"];

const SIZE_PRESETS: ReadonlyArray<{ id: string; label: string; width: number; height: number }> = [
  { id: "s", label: "S", width: 172, height: 84 },
  { id: "m", label: "M", width: NODE_DEFAULT_WIDTH, height: NODE_TIER_HEIGHTS[2] },
  { id: "l", label: "L", width: 296, height: 148 },
];

const ACCENT_SWATCHES: readonly string[] = [
  "#CDA86A",
  "#7dd3fc",
  "#a78bfa",
  "#34d399",
  "#f59e0b",
  "#f87171",
  "#f472b6",
  "#e879f9",
];

interface RefDefault {
  baseThroughputRps: number;
  replicationFactor: number;
  maxConcurrency: number;
  vcpu: number;
  memoryGb: number;
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
  const updateNodeSize = useCanvasStore((s) => s.updateNodeSize);
  const resetNodeSize = useCanvasStore((s) => s.resetNodeSize);
  const setNodeAccent = useCanvasStore((s) => s.setNodeAccent);
  const renameNode = useCanvasStore((s) => s.renameNode);
  const setNodeComment = useCanvasStore((s) => s.setNodeComment);
  const duplicateNode = useCanvasStore((s) => s.duplicateNode);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const nodeCount = useCanvasStore((s) => s.nodes.length);
  const edgeCount = useCanvasStore((s) => s.edges.length);
  const [refRegion, setRefRegion] = useState("us-east-1");
  // Deliberate exception to the telemetry separation rule: the inspector is a
  // singleton editor panel and only reads THIS node's telemetry row.
  const telemetry = useSimStore((s) => (selectedNodeId ? s.nodeTelemetry[selectedNodeId] : undefined));

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
        vcpu: d.vcpu,
        memoryGb: d.memoryGb,
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
        vcpu: custom.vcpu ?? DEFAULT_SEED_VCPU,
        memoryGb: custom.memoryGb ?? DEFAULT_SEED_MEMORY_GB,
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
  const comment = typeof node.data.comment === "string" ? node.data.comment : "";
  const label = String(node.data.label ?? "Node");
  const category: ResourceCategory = seed?.category ?? custom?.category ?? "compute";
  const Icon = resourceIconFor(resourceId, category);
  const strokeColor = node.data.accentColor ?? seed?.strokeColor ?? custom?.strokeColor ?? "#CDA86A";

  const region = overrides.region ?? ref?.region ?? "us-east-1";
  const replicationFactor = overrides.replicationFactor ?? ref?.replicationFactor ?? 1;
  const multiAz = overrides.multiAz ?? ref?.multiAz ?? false;

  // Per-node compute: vCPU scales throughput, memory scales the in-flight buffer.
  const sizing = resolveInstanceSizing({
    overrideVcpu: overrides.vcpu,
    overrideMemoryGb: overrides.memoryGb,
    seedVcpu: ref?.vcpu ?? DEFAULT_SEED_VCPU,
    seedMemoryGb: ref?.memoryGb ?? DEFAULT_SEED_MEMORY_GB,
    seedThroughputRps: ref?.baseThroughputRps ?? 1000,
    seedMaxConcurrency: ref?.maxConcurrency ?? 500,
    explicitThroughputRps: overrides.baseThroughputRps,
    explicitMaxConcurrency: overrides.maxConcurrency,
  });
  const baseThroughputRps = sizing.baseThroughputRps;

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

        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
            <Cpu size={12} /> Compute instance
          </p>

          <div className="flex gap-1.5">
            {INSTANCE_PRESETS.map((preset) => {
              const active = sizing.vcpu === preset.vcpu && sizing.memoryGb === preset.memoryGb;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => set({ vcpu: preset.vcpu, memoryGb: preset.memoryGb })}
                  title={`${preset.vcpu} vCPU · ${preset.memoryGb} GiB per replica`}
                  className={`flex-1 rounded-lg border px-1 py-1.5 text-center transition-colors ${
                    active
                      ? "border-brass/60 bg-brass/15 text-zinc-100"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <span className="block text-[11px] font-medium">{preset.label}</span>
                  <span className="block text-[9px] text-zinc-500">
                    {preset.vcpu}c · {preset.memoryGb}G
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="vCPU" hint={ref ? `stock ${ref.vcpu}` : undefined}>
              <NumberInput
                value={overrides.vcpu}
                placeholder={String(ref?.vcpu ?? DEFAULT_SEED_VCPU)}
                min={0.25}
                step={0.5}
                onCommit={(value) => set({ vcpu: value })}
              />
            </Field>
            <Field label="Memory GiB" hint={ref ? `stock ${ref.memoryGb}` : undefined}>
              <NumberInput
                value={overrides.memoryGb}
                placeholder={String(ref?.memoryGb ?? DEFAULT_SEED_MEMORY_GB)}
                min={0.25}
                step={1}
                onCommit={(value) => set({ memoryGb: value })}
              />
            </Field>
          </div>

          <div className="rounded-lg border border-line/60 bg-app-raised/30 px-3 py-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Throughput vs stock</span>
              <span className="tabular-nums text-zinc-200">
                {formatScale(sizing.throughputScale)} → {Math.round(sizing.baseThroughputRps).toLocaleString()} rps/replica
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Buffer vs stock</span>
              <span className="tabular-nums text-zinc-200">
                {formatScale(sizing.concurrencyScale)} → {sizing.maxConcurrency.toLocaleString()} in-flight
              </span>
            </div>
            {sizing.customized && (
              <button
                type="button"
                onClick={() => set({ vcpu: undefined, memoryGb: undefined })}
                className="mt-1.5 text-[10.5px] text-sky-300 transition-colors hover:text-sky-200"
              >
                Reset to stock shape
              </button>
            )}

            {telemetry && (
              <div className="mt-2 border-t border-line/50 pt-2">
                <div className="flex items-center justify-between text-[10.5px] text-zinc-500">
                  <span>Live buffer</span>
                  <span className="tabular-nums text-zinc-300">
                    {Math.round(telemetry.queueDepth).toLocaleString()} / {sizing.maxConcurrency.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10.5px] text-zinc-500">
                  <span>Concurrency in flight</span>
                  <span className="tabular-nums text-zinc-300">
                    {Math.round(telemetry.concurrentInFlight).toLocaleString()} /{" "}
                    {(sizing.maxConcurrency * Math.max(1, replicationFactor)).toLocaleString()} slots
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${
                      telemetry.queueDepth >= sizing.maxConcurrency
                        ? "bg-red-400"
                        : telemetry.queueDepth > sizing.maxConcurrency * 0.7
                          ? "bg-amber-300"
                          : "bg-emerald-400"
                    }`}
                    style={{
                      width: `${Math.min(100, (telemetry.queueDepth / Math.max(1, sizing.maxConcurrency)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

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

          <Field label="Per-replica rps" hint={ref ? `stock ${ref.baseThroughputRps}` : undefined}>
            <NumberInput
              value={overrides.baseThroughputRps}
              placeholder={String(Math.round(sizing.baseThroughputRps))}
              min={1}
              onCommit={(value) => set({ baseThroughputRps: value })}
            />
          </Field>

          <Field label="Max concurrency" hint={ref ? `stock ${ref.maxConcurrency}` : undefined}>
            <NumberInput
              value={overrides.maxConcurrency}
              placeholder={String(sizing.maxConcurrency)}
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
              {replicationFactor} × {Math.round(baseThroughputRps).toLocaleString()} rps/replica
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Appearance</p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Width">
              <div className="flex gap-1.5">
                {SIZE_PRESETS.map((preset) => {
                  const activeWidth = node.data.width ?? NODE_DEFAULT_WIDTH;
                  const active = activeWidth === preset.width;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        updateNodeSize(node.id, {
                          width: preset.width,
                          height: node.data.height ?? preset.height,
                        })
                      }
                      title={`${preset.width}px wide`}
                      className={`flex-1 rounded-lg border px-1 py-1.5 text-[11px] font-medium transition-colors ${
                        active
                          ? "border-brass/60 bg-brass/15 text-zinc-100"
                          : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Height">
              <div className="flex gap-1.5">
                {(
                  [
                    { id: "compact", label: "Short", h: NODE_TIER_HEIGHTS[1] },
                    { id: "standard", label: "Mid", h: NODE_TIER_HEIGHTS[2] },
                    { id: "tall", label: "Tall", h: NODE_TIER_HEIGHTS[3] },
                  ] as const
                ).map((preset) => {
                  const activeHeight = node.data.height ?? NODE_TIER_HEIGHTS[node.data.semanticZoomLevel ?? 2];
                  const active = activeHeight === preset.h;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        updateNodeSize(node.id, {
                          width: node.data.width ?? NODE_DEFAULT_WIDTH,
                          height: preset.h,
                        })
                      }
                      title={`${preset.h}px tall`}
                      className={`flex-1 rounded-lg border px-1 py-1.5 text-[11px] font-medium transition-colors ${
                        active
                          ? "border-brass/60 bg-brass/15 text-zinc-100"
                          : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">Accent</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              {ACCENT_SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNodeAccent(node.id, color)}
                  title={color}
                  className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 ${
                    node.data.accentColor === color ? "border-zinc-100" : "border-zinc-700"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              {node.data.accentColor && (
                <button
                  type="button"
                  onClick={() => setNodeAccent(node.id, null)}
                  className="ml-1 text-[10.5px] text-sky-300 transition-colors hover:text-sky-200"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {node.data.manualSize && (
            <button
              type="button"
              onClick={() => resetNodeSize(node.id)}
              className="text-[10.5px] text-sky-300 transition-colors hover:text-sky-200"
            >
              Reset to auto size
            </button>
          )}
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

        <Field
          label="Cost per replica-hour (USD)"
          hint={
            typeof overrides.costPerHourUsd === "number"
              ? `stock $${(ref?.costPerHourUsd ?? 0).toFixed(2).replace(/\.00$/, "")}`
              : `you decide — stock $${(ref?.costPerHourUsd ?? 0).toFixed(2).replace(/\.00$/, "")}`
          }
        >
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-2.5 text-[12px] text-zinc-500">$</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={typeof overrides.costPerHourUsd === "number" ? overrides.costPerHourUsd : ""}
              placeholder={String((ref?.costPerHourUsd ?? 0).toFixed(2).replace(/\.00$/, ""))}
              onChange={(event) => {
                const raw = event.target.value;
                if (raw === "") {
                  set({ costPerHourUsd: undefined });
                  return;
                }
                const parsed = Math.max(0, Number(raw));
                set({ costPerHourUsd: Number.isFinite(parsed) ? parsed : undefined });
              }}
              className={`${INPUT_CLASS} pl-6 tabular-nums`}
            />
          </div>
        </Field>

        <div className="space-y-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
            Service ports · port mappings
          </p>
          {(seed?.servicePorts?.length ?? 0) > 0 ? (
            <ul className="space-y-1.5">
              {seed?.servicePorts?.map((port, index) => (
                <li
                  key={`${port.label}-${index}`}
                  className="flex items-center gap-2 rounded-md border border-line/50 bg-app-raised/30 px-2.5 py-1.5 text-[11.5px]"
                >
                  <span className="min-w-0 flex-1 truncate text-zinc-300">{port.label}</span>
                  <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[10.5px] tabular-nums text-zinc-300">
                    {port.port}/{port.protocol}
                  </span>
                  {typeof port.containerPort === "number" && port.containerPort !== port.port && (
                    <span className="font-mono text-[10.5px] tabular-nums text-zinc-500">cn {port.containerPort}</span>
                  )}
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                      port.expose === "internet" || port.expose === "loadbalancer"
                        ? "bg-amber-500/15 text-amber-300"
                        : port.expose === "node"
                          ? "bg-sky-500/15 text-sky-300"
                          : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {port.expose === "internet" ? "public" : port.expose}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed border-line/60 px-2.5 py-2 text-[11px] leading-relaxed text-zinc-600">
              No declared port map — this primitive is modeled inside its platform (virtual routes, not sockets), or it is
              a custom primitive. Declare <span className="text-zinc-400">servicePorts</span> when a block fronts a real
              listener.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Block comment</p>
          <textarea
            value={comment}
            onChange={(event) => setNodeComment(node.id, event.target.value)}
            placeholder="Why this tier? Trade-offs, assumptions, follow-up questions for the interviewer…"
            rows={3}
            maxLength={2000}
            aria-label="Block comment"
            className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900/70 px-2.5 py-2 text-[12.5px] leading-relaxed text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-brass/60"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] text-zinc-600">Pins a note chip on the block — hover it to read.</span>
            <span className="tabular-nums text-[10.5px] text-zinc-600">{comment.length}/2000</span>
          </div>
          {comment.length > 0 && (
            <button
              type="button"
              onClick={() => setNodeComment(node.id, null)}
              className="text-[10.5px] text-sky-300 underline underline-offset-2 transition-colors hover:text-sky-200"
            >
              Remove comment
            </button>
          )}
        </div>

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

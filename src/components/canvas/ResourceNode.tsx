'use client';

import { memo, useMemo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import rough from "roughjs";
import {
  Activity,
  Box,
  Cpu,
  Database,
  Globe,
  Lock,
  MemoryStick,
  Network,
  Radio,
  Search,
  Server,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { SEED_RESOURCES } from "@/data/seedResources";
import type { ResourceCategory, ResourceNodeData } from "@/types/resource";
import { useSimStore } from "@/store/useSimStore";

/**
 * Custom @xyflow/react node with live telemetry badges + toggleable
 * Excalidraw hand-drawn (Rough.js) chrome.
 *
 * Perf contract:
 * - Subscribes ONLY to this node's telemetry row (never the whole dict).
 * - Rough.js SVG paths are memoized on [width, height, strokeColor,
 *   fillStyle, roughEnabled] — RPS/CPU/P99 updates never rebuild the sketch.
 * - Semantic zoom levels: 1 = icon+label, 2 = +RPS/CPU/P99 badges,
 *   3 = +queue/errors/cost strip.
 */

const NODE_WIDTH = 232;
const NODE_HEIGHT_COMPACT = 76;
const NODE_HEIGHT_STANDARD = 128;
const NODE_HEIGHT_EXPANDED = 168;

const CATEGORY_ICON: Record<ResourceCategory, LucideIcon> = {
  edge: Globe,
  compute: Server,
  api: Network,
  storage: Database,
  cache: MemoryStick,
  messaging: Radio,
  streaming: Activity,
  database: Database,
  search: Search,
  security: Lock,
  observability: Activity,
  network: Network,
  ai_llm: Sparkles,
  vector_db: Box,
  serverless: Zap,
};

const seedById = new Map(SEED_RESOURCES.map((r) => [r.id, r]));

function formatRps(rps: number): string {
  if (!Number.isFinite(rps) || rps < 0) return "0";
  if (rps >= 1_000_000) return `${(rps / 1_000_000).toFixed(1)}M`;
  if (rps >= 1000) return `${(rps / 1000).toFixed(1)}k`;
  if (rps >= 100) return rps.toFixed(0);
  return rps.toFixed(1);
}

function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0ms";
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms >= 100) return `${ms.toFixed(0)}ms`;
  return `${ms.toFixed(1)}ms`;
}

function errorTone(errorRate: number): string {
  if (errorRate >= 0.2) return "text-red-400";
  if (errorRate >= 0.05) return "text-amber-300";
  return "text-emerald-300";
}

function cpuTone(cpuPct: number): string {
  if (cpuPct >= 85) return "text-red-400";
  if (cpuPct >= 65) return "text-amber-300";
  return "text-sky-300";
}

function ResourceNodeInner({ id, data, selected }: NodeProps<Node<ResourceNodeData>>) {
  const telemetry = useSimStore((s) => s.nodeTelemetry[id]);

  const seed = seedById.get(String(data.resourceId));
  const category: ResourceCategory = seed?.category ?? "compute";
  const strokeColor = seed?.strokeColor ?? "#38bdf8";
  const fillStyle = data.roughEnabled === false ? "solid" : (seed?.fillStyle ?? "hachure");
  const Icon = CATEGORY_ICON[category] ?? Cpu;
  const label = String(data.label ?? seed?.name ?? data.resourceId ?? "Node");
  const zoom = data.semanticZoomLevel ?? 2;
  const roughEnabled = data.roughEnabled !== false;

  const height = zoom === 1 ? NODE_HEIGHT_COMPACT : zoom === 3 ? NODE_HEIGHT_EXPANDED : NODE_HEIGHT_STANDARD;

  const sketchPaths = useMemo(() => {
    if (!roughEnabled) return null;
    const generator = rough.generator();
    const drawable = generator.rectangle(1, 1, NODE_WIDTH - 2, height - 2, {
      roughness: 1.6,
      bowing: 1.2,
      seed: 7,
      stroke: strokeColor,
      strokeWidth: 1.4,
      fill: `${strokeColor}22`,
      fillStyle: fillStyle === "solid" ? "solid" : "hachure",
      fillWeight: 1,
      hachureGap: 5,
    });
    return generator
      .toPaths(drawable)
      .map((op) => op.d)
      .join(" ");
  }, [height, strokeColor, fillStyle, roughEnabled]);

  const arrivalRps = telemetry?.arrivalRps ?? 0;
  const cpuPct = telemetry?.cpuPct ?? 0;
  const p99Ms = telemetry?.p99Ms ?? 0;
  const errorRate = telemetry?.errorRate ?? 0;
  const queueDepth = telemetry?.queueDepth ?? 0;

  return (
    <div
      className={`relative rounded-md ${roughEnabled ? "bg-zinc-950/90" : "border bg-zinc-950/95 shadow-xl"}`}
      style={
        roughEnabled
          ? { width: NODE_WIDTH, height }
          : { width: NODE_WIDTH, height, borderColor: strokeColor }
      }
    >
      {roughEnabled && sketchPaths && (
        <svg
          className="pointer-events-none absolute inset-0"
          width={NODE_WIDTH}
          height={height}
          viewBox={`0 0 ${NODE_WIDTH} ${height}`}
        >
          <path d={sketchPaths} fill={`${strokeColor}14`} stroke={strokeColor} strokeWidth={1.4} />
        </svg>
      )}

      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-zinc-950" style={{ background: strokeColor }} />
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-zinc-950" style={{ background: strokeColor }} />

      <div className="relative flex h-full flex-col justify-center gap-1 px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
            style={{ backgroundColor: `${strokeColor}26`, color: strokeColor }}
          >
            <Icon size={16} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight text-zinc-100">{label}</p>
            <p className="truncate text-[10px] uppercase tracking-wider text-zinc-500">{category.replace("_", " ")}</p>
          </div>
          {selected && (
            <span className="ml-auto h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: strokeColor }} />
          )}
        </div>

        {zoom >= 2 && (
          <div className="flex items-center gap-2 text-[11px] font-medium tabular-nums">
            <span className="text-zinc-200">{formatRps(arrivalRps)} rps</span>
            <span className={cpuTone(cpuPct)}>{cpuPct.toFixed(0)}% cpu</span>
            <span className="text-zinc-300">p99 {formatMs(p99Ms)}</span>
          </div>
        )}

        {zoom >= 3 && (
          <div className="flex items-center gap-2 border-t border-zinc-800 pt-1 text-[10px] tabular-nums">
            <span className={errorTone(errorRate)}>err {(errorRate * 100).toFixed(1)}%</span>
            <span className="text-zinc-400">q {queueDepth.toFixed(0)}</span>
            <span className="text-zinc-400">
              out {formatRps(telemetry?.outputRps ?? 0)} rps
            </span>
            {telemetry && telemetry.ttftMs > 0 && (
              <span className="text-violet-300">ttft {formatMs(telemetry.ttftMs)}</span>
            )}
          </div>
        )}
      </div>

      {telemetry && telemetry.utilization >= 1 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
          !
        </span>
      )}
    </div>
  );
}

export const ResourceNode = memo(ResourceNodeInner);

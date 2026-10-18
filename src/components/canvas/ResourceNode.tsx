'use client';

import { memo } from "react";
import { Handle, NodeResizer, Position, type Node, type NodeProps } from "@xyflow/react";
import {
  Activity,
  Bot,
  Box,
  Boxes,
  Brain,
  Cog,
  Cpu,
  Database,
  DoorOpen,
  FileJson,
  FolderOpen,
  Gauge,
  Globe,
  HardDrive,
  Inbox,
  KeyRound,
  Layers,
  LineChart,
  Lock,
  MemoryStick,
  Network,
  Radio,
  Search,
  Server,
  Shield,
  Sparkles,
  Table,
  Waves,
  Zap,
  type LucideIcon,
} from "@/components/ui/icons";
import { SEED_RESOURCES } from "@/data/seedResources";
import {
  NODE_DEFAULT_WIDTH,
  NODE_MAX_HEIGHT,
  NODE_MAX_WIDTH,
  NODE_MIN_HEIGHT,
  NODE_MIN_WIDTH,
  NODE_TIER_HEIGHTS,
  type ResourceCategory,
  type ResourceNodeData,
} from "@/types/resource";
import { getCustomResource } from "@/store/customResourceRegistry";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useSimStore } from "@/store/useSimStore";

/**
 * Crisp SysCraft canvas block.
 *
 * Perf contract:
 * - Subscribes ONLY to this node's telemetry row (never the whole dict) and
 *   the stable store actions it needs.
 * - No per-tick geometry work: sizing comes from structural node data
 *   (`width`/`height`), drag-resize is persisted through the canvas store.
 * - Semantic zoom levels: 1 = icon+label, 2 = +RPS/CPU/P99 badges,
 *   3 = +queue/errors/cost strip.
 */

export const CATEGORY_ICON: Record<ResourceCategory, LucideIcon> = {
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

/** Lucide-style icon names used by seed primitives, resolved to components. */
const ICON_BY_NAME: Record<string, LucideIcon> = {
  Activity,
  Bot,
  Box,
  Boxes,
  Brain,
  Cog,
  Cpu,
  Database,
  DoorOpen,
  FileJson,
  FolderOpen,
  Gauge,
  Globe,
  HardDrive,
  Inbox,
  KeyRound,
  Layers,
  LineChart,
  Lock,
  MemoryStick,
  Network,
  Radio,
  Search,
  Server,
  Shield,
  Sparkles,
  Table,
  Waves,
  Zap,
};

const seedById = new Map(SEED_RESOURCES.map((r) => [r.id, r]));

/** Resolve the best icon: the primitive's own icon, else its category icon. */
export function resourceIconFor(resourceId: string, category: ResourceCategory): LucideIcon {
  const seed = seedById.get(resourceId);
  if (seed) return ICON_BY_NAME[seed.icon] ?? CATEGORY_ICON[category] ?? Cpu;
  return CATEGORY_ICON[category] ?? Cpu;
}

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
  const updateNodeSize = useCanvasStore((s) => s.updateNodeSize);

  const resourceId = String(data.resourceId);
  const seed = seedById.get(resourceId);
  const custom = seed ? undefined : getCustomResource(resourceId);
  const category: ResourceCategory = seed?.category ?? custom?.category ?? "compute";
  const accent = data.accentColor ?? seed?.strokeColor ?? custom?.strokeColor ?? "#CDA86A";
  const Icon = resourceIconFor(resourceId, category);
  const label = String(data.label ?? custom?.name ?? seed?.name ?? data.resourceId ?? "Node");
  const zoom = data.semanticZoomLevel ?? 2;

  const width = data.width ?? NODE_DEFAULT_WIDTH;
  const height = data.height ?? NODE_TIER_HEIGHTS[zoom];

  const arrivalRps = telemetry?.arrivalRps ?? 0;
  const cpuPct = telemetry?.cpuPct ?? 0;
  const p99Ms = telemetry?.p99Ms ?? 0;
  const errorRate = telemetry?.errorRate ?? 0;
  const queueDepth = telemetry?.queueDepth ?? 0;
  const saturated = Boolean(telemetry && telemetry.utilization >= 1);
  const degraded = Boolean(telemetry && telemetry.errorRate >= 0.05);

  const tooltip = `${seed?.name ?? custom?.name ?? resourceId} — ${seed?.description ?? ""}`.trim();

  return (
    <>
      {selected && (
        <NodeResizer
          minWidth={NODE_MIN_WIDTH}
          minHeight={NODE_MIN_HEIGHT}
          maxWidth={NODE_MAX_WIDTH}
          maxHeight={NODE_MAX_HEIGHT}
          onResize={(_, params) => updateNodeSize(id, { width: params.width, height: params.height })}
          lineClassName="!border-sky-400/60"
          handleClassName="!h-2.5 !w-2.5 !rounded-[3px] !border !border-zinc-950 !bg-sky-400"
        />
      )}

      <div
        className="syscraft-node-enter group relative select-none transition-transform duration-200 ease-out will-change-transform hover:scale-[1.015]"
        style={{ width, height }}
        title={tooltip}
      >
        <div
          className={`relative flex h-full w-full flex-col overflow-hidden rounded-xl border bg-zinc-950 transition-[border-color,box-shadow,transform] duration-200 ${
            selected ? "shadow-[0_0_0_3px_rgba(125,211,252,0.18),0_16px_40px_-16px_rgba(0,0,0,0.9)]" : "group-hover:shadow-[0_14px_36px_-18px_rgba(0,0,0,0.85)]"
          }`}
          style={{ borderColor: selected ? "#7dd3fc" : `${accent}55` }}
        >
          <span aria-hidden="true" className="h-[3px] w-full shrink-0" style={{ backgroundColor: accent }} />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ background: `radial-gradient(140px circle at 85% -10%, ${accent}26, transparent 70%)` }}
          />

          <Handle
            type="target"
            position={Position.Left}
            className="syscraft-handle"
            style={{ background: accent }}
          />
          <Handle
            type="source"
            position={Position.Right}
            className="syscraft-handle"
            style={{ background: accent }}
          />

          <div className="relative flex min-h-0 flex-1 flex-col justify-center gap-1 px-3 py-2">
            <div className="flex items-center gap-2">
              <span
                className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${accent}1f`, color: accent }}
              >
                <Icon size={15} weight="bold" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold leading-tight text-zinc-100">{label}</p>
                <p className="truncate text-[9.5px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                  {category.replace("_", " ")}
                </p>
              </div>
              {(saturated || degraded) && (
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-zinc-950 ${
                    saturated ? "animate-pulse bg-red-400" : "bg-amber-300"
                  }`}
                  title={saturated ? "Saturated — arrivals exceed capacity" : "Degraded — error budget burning"}
                >
                  !
                </span>
              )}
            </div>

            {zoom >= 2 && (
              <div className="flex items-center gap-2 text-[11px] font-medium tabular-nums">
                <span className="text-zinc-200">{formatRps(arrivalRps)} rps</span>
                <span className="text-zinc-600">·</span>
                <span className={cpuTone(cpuPct)}>{cpuPct.toFixed(0)}% cpu</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-300">p99 {formatMs(p99Ms)}</span>
              </div>
            )}

            {zoom >= 3 && (
              <div className="flex items-center gap-2 border-t border-zinc-800/80 pt-1 text-[10px] tabular-nums">
                <span className={errorTone(errorRate)}>err {(errorRate * 100).toFixed(1)}%</span>
                <span className="text-zinc-500">q {queueDepth.toFixed(0)}</span>
                <span className="text-zinc-500">out {formatRps(telemetry?.outputRps ?? 0)} rps</span>
                {telemetry && telemetry.ttftMs > 0 && (
                  <span className="text-violet-300">ttft {formatMs(telemetry.ttftMs)}</span>
                )}
              </div>
            )}
          </div>

          {zoom >= 2 && (data.overrides?.region || data.overrides?.multiAz) && (
            <span className="pointer-events-none absolute -top-[7px] left-2 flex items-center gap-1 rounded-full border border-zinc-700/80 bg-zinc-900 px-1.5 py-[1px] text-[8.5px] font-medium uppercase tracking-wide text-zinc-300 shadow-sm">
              {data.overrides?.region && <span>{String(data.overrides.region)}</span>}
              {data.overrides?.multiAz && <span className="text-brass">· multi-AZ</span>}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

export const ResourceNode = memo(ResourceNodeInner);

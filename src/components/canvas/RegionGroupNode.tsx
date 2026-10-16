'use client';

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Globe2 } from "lucide-react";
import { CLOUD_REGIONS, getRegionLatencyMs } from "@/data/regionLatency";

/**
 * Cloud region boundary zone (us-east-1, ap-south-1, eu-central-1, ...).
 * Renders a dashed labeled perimeter that groups canvas nodes by deployment
 * region; the badge surfaces live RTT back to us-east-1 so cross-region
 * chatter costs stay visible while placing replicas.
 */

export interface RegionGroupNodeData extends Record<string, unknown> {
  label: string;
  regionId: string;
}

const regionLabelById = new Map(CLOUD_REGIONS.map((r) => [r.id, r.label]));

function RegionGroupNodeInner({ data, selected }: NodeProps<Node<RegionGroupNodeData>>) {
  const regionId = String(data.regionId ?? "us-east-1");
  const label = String(data.label ?? regionLabelById.get(regionId) ?? regionId);
  const rttHome = getRegionLatencyMs(regionId, "us-east-1");

  return (
    <div
      className={`relative h-full w-full rounded-lg border-2 border-dashed bg-sky-500/[0.04] ${
        selected ? "border-sky-300" : "border-sky-500/40"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-sky-400" />
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !bg-sky-400" />
      <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded bg-zinc-950/85 px-2 py-1">
        <Globe2 size={13} className="text-sky-300" />
        <span className="text-[11px] font-semibold tracking-wide text-sky-200">{label}</span>
        <span className="rounded bg-sky-500/20 px-1 text-[10px] tabular-nums text-sky-300">
          {regionId === "us-east-1" ? "home" : `${rttHome}ms ⇄ home`}
        </span>
      </div>
    </div>
  );
}

export const RegionGroupNode = memo(RegionGroupNodeInner);

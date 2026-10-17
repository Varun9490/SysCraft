'use client';

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, HelpCircle, X } from "@/components/ui/icons";
import { runDesignDoctor, type DoctorFinding, type DoctorSeverity } from "@/engine/designDoctor";
import { useCanvasStore } from "@/store/useCanvasStore";

/**
 * Design Doctor panel — renders the deterministic static linter report from
 * `engine/designDoctor.ts`. Every finding can focus the offending node on the
 * canvas and links to the encyclopedia concept that explains the fix.
 */

interface DesignDoctorPanelProps {
  open: boolean;
  onClose: () => void;
}

const SEVERITY_STYLE: Record<DoctorSeverity, { badge: string; label: string }> = {
  critical: { badge: "border-red-500/50 bg-red-500/10 text-red-300", label: "Critical" },
  warning: { badge: "border-amber-500/50 bg-amber-500/10 text-amber-300", label: "Warning" },
  info: { badge: "border-sky-500/50 bg-sky-500/10 text-sky-300", label: "Info" },
};

export function DesignDoctorPanel({ open, onClose }: DesignDoctorPanelProps) {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);

  const report = useMemo(
    () =>
      runDesignDoctor(
        nodes.map((node) => ({
          id: node.id,
          resourceId: String(node.data.resourceId ?? "rest_service"),
          label: String(node.data.label ?? node.id),
          overrides: node.data.overrides ?? {},
        })),
        edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
      ),
    [nodes, edges],
  );

  if (!open) return null;

  const scoreTone =
    report.score >= 85
      ? "text-emerald-300"
      : report.score >= 60
        ? "text-amber-300"
        : "text-red-300";

  const grouped = report.findings.reduce<Record<string, DoctorFinding[]>>((acc, finding) => {
    (acc[finding.severity] ??= []).push(finding);
    return acc;
  }, {});

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 max-h-[56vh] overflow-y-auto border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2">
        <HelpCircle size={15} className="text-amber-300" />
        <h3 className="text-sm font-bold text-zinc-50">Design Doctor</h3>
        <span className="text-[11px] tabular-nums text-zinc-500">
          {report.checkedNodeCount} nodes · {report.checkedEdgeCount} links · 14 static rules
        </span>
        <span className={`rounded-full border border-zinc-700 px-2.5 py-0.5 text-[11px] font-semibold ${scoreTone}`}>
          hygiene {report.score}/100
        </span>
        <button
          onClick={onClose}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
          aria-label="Close Design Doctor"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid gap-2 px-4 pb-4 lg:grid-cols-2">
        {(["critical", "warning", "info"] as DoctorSeverity[]).map((severity) => (
          <section key={severity} className="rounded-md border border-zinc-800 bg-zinc-950 p-2.5">
            <p className="mb-2 flex items-center gap-2 text-[12px] font-bold text-zinc-200">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${SEVERITY_STYLE[severity].badge}`}>
                {SEVERITY_STYLE[severity].label}
              </span>
              {grouped[severity]?.length ?? 0} finding{(grouped[severity]?.length ?? 0) === 1 ? "" : "s"}
            </p>
            <div className="flex flex-col gap-2">
              {(grouped[severity] ?? []).map((finding) => (
                <article
                  key={`${finding.ruleId}-${finding.nodeIds.join(",")}-${finding.title}`}
                  className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5"
                >
                  <p className="text-[12.5px] font-semibold text-zinc-100">{finding.title}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-400">{finding.detail}</p>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-emerald-300/90">
                    Fix: {finding.suggestion}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {finding.nodeIds.slice(0, 4).map((nodeId) => {
                      const node = nodes.find((n) => n.id === nodeId);
                      return (
                        <button
                          key={nodeId}
                          type="button"
                          onClick={() => useCanvasStore.getState().focusNode(nodeId)}
                          className="rounded border border-zinc-700 px-2 py-0.5 text-[10.5px] text-zinc-300 hover:border-sky-500/60 hover:text-sky-300"
                        >
                          focus {String(node?.data.label ?? nodeId)}
                        </button>
                      );
                    })}
                    {finding.conceptId && (
                      <Link
                        href={`/wiki/${finding.conceptId}`}
                        className="rounded border border-zinc-700 px-2 py-0.5 text-[10.5px] text-violet-300 hover:border-violet-500/60"
                      >
                        read: {finding.conceptId}
                      </Link>
                    )}
                  </div>
                </article>
              ))}
              {(grouped[severity]?.length ?? 0) === 0 && (
                <p className="flex items-center gap-1.5 text-[11.5px] text-zinc-500">
                  <CheckCircle2 size={13} className="text-emerald-400" /> No {severity} findings.
                </p>
              )}
            </div>
          </section>
        ))}
      </div>

      {report.findings.length === 0 && (
        <p className="flex items-center gap-2 px-4 pb-4 text-[12px] text-emerald-300">
          <CheckCircle2 size={14} /> Clean bill of health — none of the 14 rules fired on this topology.
        </p>
      )}
      {nodes.length === 0 && (
        <p className="flex items-center gap-2 px-4 pb-4 text-[12px] text-zinc-500">
          <AlertTriangle size={14} /> Canvas is empty. Load a blueprint or drop components to audit a design.
        </p>
      )}
    </div>
  );
}

'use client';

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ChevronDown, CheckCircle2, HelpCircle, X } from "@/components/ui/icons";
import { runDesignDoctor, type DoctorFinding, type DoctorSeverity } from "@/engine/designDoctor";
import { useCanvasStore } from "@/store/useCanvasStore";

/**
 * Design Doctor — a floating card docked top-right so it NEVER squeezes the
 * canvas (the old full-width bottom sheet ate 56vh of flow area). Collapses to
 * its header, filters findings by severity, and slides out with spring motion.
 */

interface DesignDoctorPanelProps {
  open: boolean;
  onClose: () => void;
}

const SEVERITY_STYLE: Record<DoctorSeverity, { badge: string; label: string; dot: string }> = {
  critical: { badge: "border-red-500/50 bg-red-500/10 text-red-300", label: "Critical", dot: "bg-red-400" },
  warning: { badge: "border-amber-500/50 bg-amber-500/10 text-amber-300", label: "Warning", dot: "bg-amber-400" },
  info: { badge: "border-sky-500/50 bg-sky-500/10 text-sky-300", label: "Info", dot: "bg-sky-400" },
};

export function DesignDoctorPanel({ open, onClose }: DesignDoctorPanelProps) {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const [collapsed, setCollapsed] = useState(false);
  const [filter, setFilter] = useState<DoctorSeverity | "all">("all");

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

  const scoreTone =
    report.score >= 85
      ? "text-emerald-300"
      : report.score >= 60
        ? "text-amber-300"
        : "text-red-300";

  const grouped = useMemo(() => {
    const acc: Record<string, DoctorFinding[]> = {};
    for (const finding of report.findings) {
      (acc[finding.severity] ??= []).push(finding);
    }
    return acc;
  }, [report.findings]);

  const visibleFindings =
    filter === "all" ? report.findings : (grouped[filter] ?? []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, x: 28 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        role="complementary"
        aria-label="Design Doctor report"
        className="pointer-events-auto absolute right-3 top-16 z-30 flex max-h-[calc(100%-6.5rem)] w-[400px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/95 shadow-2xl backdrop-blur"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-zinc-800/80 px-3.5 py-2.5">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10">
            <HelpCircle size={16} className="text-amber-300" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-zinc-50">Design Doctor</p>
            <p className="truncate text-[10.5px] text-zinc-500">
              {report.checkedNodeCount} nodes · {report.checkedEdgeCount} links · 14 static rules
            </p>
          </div>
          <span className={`shrink-0 rounded-full border border-zinc-700 px-2.5 py-0.5 text-[11px] font-semibold ${scoreTone}`}>
            {report.score}/100
          </span>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand findings" : "Collapse findings"}
            aria-expanded={!collapsed}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={13} />
            </motion.span>
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close Design Doctor"
            aria-label="Close Design Doctor"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X size={14} />
          </button>
        </header>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="doctor-body"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="flex min-h-0 flex-col"
            >
              <div className="flex shrink-0 gap-1.5 px-3.5 pt-2.5">
                {(
                  [
                    ["all", "All", report.findings.length],
                    ["critical", "Critical", (grouped.critical ?? []).length],
                    ["warning", "Warning", (grouped.warning ?? []).length],
                    ["info", "Info", (grouped.info ?? []).length],
                  ] as Array<[DoctorSeverity | "all", string, number]>
                ).map(([id, label, count]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-medium transition-colors ${
                      filter === id
                        ? id === "all"
                          ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                          : SEVERITY_STYLE[id].badge
                        : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                    }`}
                  >
                    {label} {count}
                  </button>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-3.5 pt-2">
                <div className="flex flex-col gap-2">
                  {visibleFindings.map((finding) => (
                    <motion.article
                      key={`${finding.ruleId}-${finding.nodeIds.join(",")}-${finding.title}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22 }}
                      className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5"
                    >
                      <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-zinc-100">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_STYLE[finding.severity].dot}`} />
                        {finding.title}
                      </p>
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
                    </motion.article>
                  ))}
                  {visibleFindings.length === 0 && (
                    <p className="flex items-center gap-1.5 py-4 text-[11.5px] text-zinc-500">
                      <CheckCircle2 size={13} className="text-emerald-400" /> No {filter === "all" ? "" : filter}{" "}
                      findings{filter === "all" ? " on this topology." : "."}
                    </p>
                  )}
                </div>

                {nodes.length === 0 && (
                  <p className="mt-2 flex items-center gap-2 text-[12px] text-zinc-500">
                    <AlertTriangle size={14} /> Canvas is empty. Load a blueprint or drop components to audit a design.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>
    </AnimatePresence>
  );
}

'use client';

import { useState } from "react";
import { Shield, X } from "@/components/ui/icons";
import { analyzeThreats, type ThreatFinding, type ThreatModelReport } from "@/engine/threatModel";
import { useCanvasStore } from "@/store/useCanvasStore";

export function ThreatModelPanel() {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<ThreatModelReport | null>(null);

  const run = () => {
    const state = useCanvasStore.getState();
    const topo = { nodes: state.nodes, edges: state.edges };
    setReport(analyzeThreats(topo as any));
    setOpen(true);
  };

  const sevColor = (s: ThreatFinding["severity"]) =>
    s === "critical" ? "text-red-400" : s === "high" ? "text-orange-400" : s === "medium" ? "text-amber-400" : s === "low" ? "text-sky-400" : "text-zinc-400";

  return (
    <>
      <button
        onClick={run}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
        title="Run STRIDE threat model"
      >
        <Shield size={13} /> Threat model
      </button>
      {open && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-100">Threat model (STRIDE)</h2>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-200"><X size={18} /></button>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div className="text-3xl font-semibold text-zinc-100">{report.score}<span className="text-sm text-zinc-400">/100</span></div>
              <div className="text-sm text-zinc-400">{report.findings.length} findings</div>
            </div>
            <ul className="mt-4 space-y-3">
              {report.findings.map((f) => (
                <li key={f.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase ${sevColor(f.severity)}`}>{f.severity}</span>
                    <span className="text-xs text-zinc-500">{f.category}</span>
                    <span className="text-sm font-medium text-zinc-100">{f.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">{f.detail}</p>
                  <p className="mt-1 text-xs text-emerald-400">Fix: {f.remediation}</p>
                </li>
              ))}
              {report.findings.length === 0 && (
                <li className="text-sm text-emerald-400">No findings. Design looks clean.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

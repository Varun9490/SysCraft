'use client';

import { useMemo, useState } from "react";
import { ClipboardCopy, Download, FileCode2, X } from "@/components/ui/icons";
import { compileAll, estimateMonthlyCost, type IacFormat } from "@/engine/iacCompiler";
import { parseDsl, serializeDsl, type DslEdge, type DslNode } from "@/engine/dslParser";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

/**
 * Live IaC export: the canvas graph compiles to Terraform, Docker Compose,
 * Kubernetes manifests, Mermaid, RFC Markdown, and the SysCanvas text DSL —
 * all in sync, with copy/download and a bidirectional DSL editor.
 */

const FORMATS: Array<{ id: IacFormat | "dsl"; label: string }> = [
  { id: "terraform", label: "Terraform" },
  { id: "docker", label: "Docker Compose" },
  { id: "kubernetes", label: "Kubernetes" },
  { id: "mermaid", label: "Mermaid" },
  { id: "rfc", label: "RFC Markdown" },
  { id: "dsl", label: "Text DSL" },
];

interface IaCExportModalProps {
  open: boolean;
  onClose: () => void;
}

export function IaCExportModal({ open, onClose }: IaCExportModalProps) {
  const [format, setFormat] = useState<IacFormat | "dsl">("terraform");
  const [dslDraft, setDslDraft] = useState<string | null>(null);
  const [dslErrors, setDslErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const boeResult = useWorkbenchStore((s) => s.boeResult);

  const topology = useMemo(() => {
    if (!open) return null;
    return useCanvasStore.getState().toGraphTopology();
  }, [open ]);

  const compiled = useMemo(() => {
    if (!topology) return null;
    return compileAll(topology, {
      title: useWorkbenchStore.getState().highLevelNotes.split("\n")[0]?.replace(/^#+\s*/, "") || "Untitled system",
      targetRps: boeResult ? Math.round(boeResult.readQpsPeak + boeResult.writeQpsPeak) : undefined,
    });
  }, [topology, boeResult, open ]);

  const dslText = useMemo(() => {
    if (!topology) return "";
    if (dslDraft !== null) return dslDraft;
    const nodes: DslNode[] = topology.nodes.map((n) => ({
      id: n.id,
      resourceId: n.resourceId,
      label: n.id,
      position: n.position,
      replicationFactor: n.replicationFactor,
      region: n.region,
    }));
    const edges: DslEdge[] = topology.edges.map((e) => ({ source: e.source, target: e.target }));
    return serializeDsl(nodes, edges);
  }, [topology, dslDraft]);

  if (!open || !topology || !compiled) return null;

  const currentText = format === "dsl" ? dslText : compiled[format];
  const monthly = estimateMonthlyCost(topology);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(currentText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const download = () => {
    try {
      const ext = format === "terraform" ? "tf" : format === "docker" ? "yml" : format === "kubernetes" ? "yaml" : format === "mermaid" ? "mmd" : "md";
      const blob = new Blob([currentText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `syscanvas.${ext}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      /* download unavailable */
    }
  };

  const applyDsl = () => {
    const result = parseDsl(dslDraft ?? dslText);
    setDslErrors(result.errors);
    if (result.nodes.length === 0) return;
    const store = useCanvasStore.getState();
    store.replaceTopology(
      result.nodes.map((n) => ({
        id: n.id,
        type: "resource" as const,
        position: n.position,
        data: {
          resourceId: n.resourceId,
          label: n.label,
          overrides: { replicationFactor: n.replicationFactor, region: n.region },
          roughEnabled: store.roughEnabled,
          semanticZoomLevel: store.semanticZoomLevel,
        },
      })),
      result.edges.map((e) => ({ id: `e_${e.source}_${e.target}`, source: e.source, target: e.target })),
    );
    setDslDraft(null);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/75 p-3" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Infrastructure export"
      >
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
          <FileCode2 size={16} className="text-emerald-300" />
          <h3 className="text-base font-bold text-zinc-50">Export infrastructure</h3>
          <span className="text-[11px] text-zinc-500">
            {topology.nodes.length} resources · ~${monthly.toFixed(2)}/mo
          </span>
          <button onClick={copy} className="ml-auto flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
            <ClipboardCopy size={13} /> {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={download} className="flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
            <Download size={13} /> File
          </button>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 hover:bg-zinc-800" aria-label="Close export">
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-zinc-800 p-2">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold ${format === f.id ? "bg-emerald-400 text-zinc-950" : "text-zinc-400 hover:bg-zinc-800"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {format === "dsl" ? (
            <div>
              <textarea
                value={dslText}
                onChange={(e) => setDslDraft(e.target.value)}
                rows={18}
                spellCheck={false}
                className="w-full rounded-md border border-zinc-800 bg-ink p-2.5 font-mono text-[12px] leading-relaxed text-zinc-100"
              />
              {dslErrors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {dslErrors.map((err, i) => (
                    <p key={i} className="text-[11px] text-amber-300">{err}</p>
                  ))}
                </div>
              )}
              <button onClick={applyDsl} className="mt-2 w-full rounded-md bg-emerald-400 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-300">
                Apply DSL to canvas
              </button>
            </div>
          ) : (
            <pre className="overflow-auto rounded-md border border-zinc-800 bg-ink p-3 font-mono text-[11px] leading-relaxed text-emerald-200">
              {currentText}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

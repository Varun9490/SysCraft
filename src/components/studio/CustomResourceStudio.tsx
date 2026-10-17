'use client';

import { useEffect, useState } from "react";
import { Plus, Sparkles, X } from "@/components/ui/icons";
import { listCustomResources, saveCustomResource } from "@/store/db";
import type { CustomResourceRecord } from "@/store/db";
import { makeCustomSpec, registerCustomResource } from "@/store/customResourceRegistry";
import { synthesizeResourceOffline } from "@/engine/aiClient";
import { useCanvasStore } from "@/store/useCanvasStore";
import type { ResourceCategory } from "@/types/resource";

/**
 * Custom resource studio: hand-author new primitives or compile them from a
 * plain-English description with the offline keyword-to-schema synthesizer,
 * persist to IndexedDB, and drop them straight onto the canvas.
 */

const CATEGORIES: ResourceCategory[] = [
  "edge", "compute", "api", "storage", "cache", "messaging", "streaming",
  "database", "search", "security", "observability", "network", "ai_llm",
  "vector_db", "serverless",
];

interface CustomResourceStudioProps {
  open: boolean;
  onClose: () => void;
}

export function CustomResourceStudio({ open, onClose }: CustomResourceStudioProps) {
  const [description, setDescription] = useState("edge cache for viral video thumbnails with 90% hit ratio");
  const [name, setName] = useState("Viral thumbnail cache");
  const [category, setCategory] = useState<ResourceCategory>("cache");
  const [throughput, setThroughput] = useState(20000);
  const [p50, setP50] = useState(2);
  const [saved, setSaved] = useState<CustomResourceRecord[]>([]);

  useEffect(() => {
    if (open) {
      void listCustomResources().then(setSaved);
    }
  }, [open]);

  if (!open) return null;

  const compileFromText = () => {
    const synth = synthesizeResourceOffline(description);
    setName(synth.name);
    setCategory(synth.category as ResourceCategory);
    setThroughput(synth.baseThroughputRps);
    setP50(synth.baseP50Ms);
  };

  const save = async () => {
    const id = `custom_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 28) || "resource"}`;
    const ok = await saveCustomResource({
      id,
      name: name.trim() || "Custom resource",
      category,
      schema: JSON.stringify({
        baseThroughputRps: throughput,
        baseP50Ms: p50,
        category,
        description: description.trim(),
      }),
    });
    if (ok) {
      registerCustomResource(
        makeCustomSpec({ id, name: name.trim() || "Custom resource", category, baseThroughputRps: throughput, baseP50Ms: p50 }),
      );
      setSaved(await listCustomResources());
    }
  };

  const placeOnCanvas = (resourceId: string, label: string) => {
    const count = useCanvasStore.getState().nodes.length;
    useCanvasStore
      .getState()
      .addNode(resourceId, { x: 120 + (count % 8) * 48, y: 120 + (count % 8) * 36 }, label);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/75 p-3" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Custom resource studio"
      >
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-amber-300" />
          <h3 className="text-base font-bold text-zinc-50">Custom resource studio</h3>
          <button onClick={onClose} className="ml-auto flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 hover:bg-zinc-800" aria-label="Close studio">
            <X size={16} />
          </button>
        </div>

        <label className="mb-1 block text-xs text-zinc-400">Describe the infrastructure in plain English</label>
        <div className="flex gap-1.5">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100"
          />
          <button onClick={compileFromText} className="flex items-center gap-1 rounded-md bg-amber-300 px-2.5 text-xs font-semibold text-zinc-950 hover:bg-amber-200">
            <Sparkles size={13} /> Compile
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block text-[11px] text-zinc-400">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-0.5 w-full rounded bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100" />
          </label>
          <label className="block text-[11px] text-zinc-400">
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value as ResourceCategory)} className="mt-0.5 w-full rounded bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block text-[11px] text-zinc-400">
            Base throughput (RPS)
            <input type="number" min={1} value={throughput} onChange={(e) => setThroughput(Math.max(1, Number(e.target.value)))} className="mt-0.5 w-full rounded bg-zinc-900 px-2 py-1.5 text-xs tabular-nums text-zinc-100" />
          </label>
          <label className="block text-[11px] text-zinc-400">
            Base p50 (ms)
            <input type="number" min={0} value={p50} onChange={(e) => setP50(Math.max(0, Number(e.target.value)))} className="mt-0.5 w-full rounded bg-zinc-900 px-2 py-1.5 text-xs tabular-nums text-zinc-100" />
          </label>
        </div>

        <button onClick={() => void save()} className="mt-3 flex w-full items-center justify-center gap-1 rounded-md bg-sky-500 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-sky-400">
          <Plus size={13} /> Save to library
        </button>

        <h4 className="mb-1.5 mt-4 text-xs font-bold text-zinc-100">Library ({saved.length})</h4>
        <div className="space-y-1.5">
          {saved.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-zinc-100">{r.name}</p>
                <p className="truncate font-mono text-[10px] text-zinc-500">{r.id} · {r.category}</p>
              </div>
              <button onClick={() => placeOnCanvas(r.id, r.name)} className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800">
                Place on canvas
              </button>
            </div>
          ))}
          {saved.length === 0 && <p className="text-xs text-zinc-500">Nothing saved yet — compile your first resource above.</p>}
        </div>
      </div>
    </div>
  );
}

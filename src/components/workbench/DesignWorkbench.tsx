'use client';

import { useState } from "react";
import { CheckSquare, Plus, Square, Trash2, X } from "lucide-react";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import type { WorkbenchStep } from "@/types/workbench";
import { BoECalculator } from "./BoECalculator";
import { ApiContractBuilder } from "./ApiContractBuilder";
import { DataModelDesigner } from "./DataModelDesigner";
import { SocraticInterviewer } from "./SocraticInterviewer";

/**
 * 6-step interview & engineering workbench drawer.
 * Steps: requirements → back-of-envelope → API contracts → data model →
 * high-level design → deep dives + adversarial review. State persists in
 * `useWorkbenchStore` so switching steps never loses draft work.
 */

const STEPS: Array<{ id: WorkbenchStep; label: string }> = [
  { id: "requirements", label: "1 · Requirements" },
  { id: "boe", label: "2 · Back-of-envelope" },
  { id: "api", label: "3 · API contracts" },
  { id: "data_model", label: "4 · Data model" },
  { id: "high_level", label: "5 · High-level design" },
  { id: "deep_dive", label: "6 · Deep dives" },
];

interface DesignWorkbenchProps {
  open: boolean;
  onClose: () => void;
}

export function DesignWorkbench({ open, onClose }: DesignWorkbenchProps) {
  const activeStep = useWorkbenchStore((s) => s.activeStep);
  const setStep = useWorkbenchStore((s) => s.setStep);
  const functional = useWorkbenchStore((s) => s.functional);
  const addFunctional = useWorkbenchStore((s) => s.addFunctional);
  const toggleFunctional = useWorkbenchStore((s) => s.toggleFunctional);
  const removeFunctional = useWorkbenchStore((s) => s.removeFunctional);
  const nonFunctional = useWorkbenchStore((s) => s.nonFunctional);
  const setNonFunctional = useWorkbenchStore((s) => s.setNonFunctional);
  const highLevelNotes = useWorkbenchStore((s) => s.highLevelNotes);
  const setHighLevelNotes = useWorkbenchStore((s) => s.setHighLevelNotes);
  const deepDiveNotes = useWorkbenchStore((s) => s.deepDiveNotes);
  const setDeepDiveNotes = useWorkbenchStore((s) => s.setDeepDiveNotes);
  const [draftReq, setDraftReq] = useState("");

  if (!open) return null;

  const add = () => {
    addFunctional(draftReq);
    setDraftReq("");
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
        <h3 className="text-base font-bold text-zinc-50">Design workbench</h3>
        <button
          onClick={onClose}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
          aria-label="Close workbench"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-zinc-800 p-2">
        {STEPS.map((step) => (
          <button
            key={step.id}
            onClick={() => setStep(step.id)}
            className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${
              activeStep === step.id ? "bg-sky-500 text-zinc-950" : "text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {step.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {activeStep === "requirements" && (
          <div className="space-y-2">
            <div className="flex gap-1.5">
              <input
                value={draftReq}
                onChange={(e) => setDraftReq(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") add();
                }}
                placeholder="Add a functional requirement…"
                className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100"
              />
              <button onClick={add} className="flex items-center gap-1 rounded-md bg-sky-500 px-2.5 text-xs font-semibold text-zinc-950 hover:bg-sky-400">
                <Plus size={13} /> Add
              </button>
            </div>
            {functional.map((req) => (
              <div key={req.id} className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5">
                <button onClick={() => toggleFunctional(req.id)} className="text-zinc-400 hover:text-emerald-300" aria-label={req.done ? "Reopen requirement" : "Complete requirement"}>
                  {req.done ? <CheckSquare size={15} /> : <Square size={15} />}
                </button>
                <span className={`flex-1 text-xs ${req.done ? "text-zinc-500 line-through" : "text-zinc-100"}`}>{req.text}</span>
                <button onClick={() => removeFunctional(req.id)} className="text-zinc-600 hover:text-red-300" aria-label="Delete requirement">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-2.5">
              <p className="mb-1.5 text-xs font-bold text-zinc-100">Non-functional targets</p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <label className="block text-zinc-400">
                  Availability
                  <input type="number" min={0} max={1} step={0.001} value={nonFunctional.availabilityTarget} onChange={(e) => setNonFunctional({ availabilityTarget: Math.max(0, Math.min(1, Number(e.target.value))) })} className="mt-0.5 w-full rounded bg-zinc-950 px-1.5 py-1 tabular-nums text-zinc-100" />
                </label>
                <label className="block text-zinc-400">
                  p99 latency (ms)
                  <input type="number" min={1} value={nonFunctional.p99LatencyMs} onChange={(e) => setNonFunctional({ p99LatencyMs: Math.max(1, Number(e.target.value)) })} className="mt-0.5 w-full rounded bg-zinc-950 px-1.5 py-1 tabular-nums text-zinc-100" />
                </label>
              </div>
            </div>
          </div>
        )}

        {activeStep === "boe" && <BoECalculator />}
        {activeStep === "api" && <ApiContractBuilder />}
        {activeStep === "data_model" && <DataModelDesigner />}

        {activeStep === "high_level" && (
          <div>
            <p className="mb-1.5 text-xs text-zinc-400">Narrate the request path, trust boundaries, and failure domains. Markdown supported.</p>
            <textarea
              value={highLevelNotes}
              onChange={(e) => setHighLevelNotes(e.target.value)}
              rows={16}
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-2.5 font-mono text-xs leading-relaxed text-zinc-100"
            />
          </div>
        )}

        {activeStep === "deep_dive" && (
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs text-zinc-400">Deep-dive working notes — trade-offs, numbers, and follow-ups.</p>
              <textarea
                value={deepDiveNotes}
                onChange={(e) => setDeepDiveNotes(e.target.value)}
                rows={6}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-2.5 font-mono text-xs leading-relaxed text-zinc-100"
              />
            </div>
            <SocraticInterviewer />
          </div>
        )}
      </div>
    </div>
  );
}

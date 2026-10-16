'use client';

import { useMemo, useState } from "react";
import { Award, ChevronRight, FlaskConical, X } from "lucide-react";
import { GUIDED_LABS } from "@/data/guidedLabs";
import { SEED_RESOURCES } from "@/data/seedResources";
import type { GradingRule } from "@/types/challenges";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useLearningStore } from "@/store/useLearningStore";
import { simSnapshotRef } from "@/store/useSimStore";
import { Markdown } from "../Markdown";

/**
 * Step-by-step interactive lab engine over all 16 real-world systems.
 * Topology stages are graded live against the canvas (required primitives,
 * node count, multi-AZ, simulated p99 / error / cost SLOs); brief, BoE, API,
 * data-model, and chaos stages complete via guided self-check. Scores persist
 * to the learning store per lab.
 */

interface GuidedLabRunnerProps {
  open: boolean;
  onClose: () => void;
}

interface RuleVerdict {
  rule: GradingRule;
  passed: boolean;
  detail: string;
}

const seedById = new Map(SEED_RESOURCES.map((r) => [r.id, r]));

function gradeRules(ruleSet: GradingRule[]): { verdicts: RuleVerdict[]; score: number } {
  const { nodes } = useCanvasStore.getState();
  const snapshot = simSnapshotRef.current;
  const resourceIds = new Set(nodes.map((n) => String(n.data.resourceId)));
  const verdicts: RuleVerdict[] = ruleSet.map((rule) => {
    const failures: string[] = [];
    for (const required of rule.requiredResourceIds) {
      if (!resourceIds.has(required)) failures.push(`missing ${required}`);
    }
    if (nodes.length < rule.minNodeCount) {
      failures.push(`needs ${rule.minNodeCount} nodes (has ${nodes.length})`);
    }
    if (rule.requiresMultiAz) {
      const singleAz = nodes.filter((n) => {
        const seed = seedById.get(String(n.data.resourceId));
        return !((n.data.overrides?.multiAz) ?? seed?.defaults.multiAz ?? false);
      });
      if (singleAz.length > 0) failures.push(`${singleAz.length} node(s) not multi-AZ`);
    }
    if (rule.maxP99Ms !== null && rule.maxP99Ms !== undefined) {
      if (!snapshot) failures.push("run the simulation to measure p99");
      else if (snapshot.globalP99Ms > rule.maxP99Ms) {
        failures.push(`p99 ${snapshot.globalP99Ms.toFixed(0)}ms > budget ${rule.maxP99Ms}ms`);
      }
    }
    if (rule.maxErrorRate !== null && rule.maxErrorRate !== undefined) {
      if (!snapshot) failures.push("run the simulation to measure errors");
      else if (snapshot.globalErrorRate > rule.maxErrorRate) {
        failures.push(`error ${(snapshot.globalErrorRate * 100).toFixed(2)}% > ${(rule.maxErrorRate * 100).toFixed(2)}%`);
      }
    }
    if (rule.maxCostPerHourUsd !== null && rule.maxCostPerHourUsd !== undefined) {
      if (!snapshot) failures.push("run the simulation to price the topology");
      else if (snapshot.totalCostPerHourUsd > rule.maxCostPerHourUsd) {
        failures.push(`$${snapshot.totalCostPerHourUsd.toFixed(2)}/h > $${rule.maxCostPerHourUsd}/h`);
      }
    }
    return {
      rule,
      passed: failures.length === 0,
      detail: failures.length === 0 ? `+${rule.points} pts — ${rule.description}` : failures.join("; "),
    };
  });
  const total = ruleSet.reduce((s, r) => s + r.points, 0);
  const earned = verdicts.filter((v) => v.passed).reduce((s, v) => s + v.rule.points, 0);
  return { verdicts, score: total > 0 ? Math.round((earned / total) * 100) : 100 };
}

export function GuidedLabRunner({ open, onClose }: GuidedLabRunnerProps) {
  const [labId, setLabId] = useState(GUIDED_LABS[0]?.id ?? "");
  const lab = useMemo(() => GUIDED_LABS.find((l) => l.id === labId) ?? GUIDED_LABS[0], [labId]);
  const labProgress = useLearningStore((s) => (lab ? s.labProgress[lab.id] : undefined));
  const completeLabStage = useLearningStore((s) => s.completeLabStage);

  const [nonce, setNonce] = useState(0);
  const stageIndex = Math.min(labProgress?.currentStage ?? 0, (lab?.stages.length ?? 1) - 1);
  const stage = lab?.stages[stageIndex];
  const grading = useMemo(() => gradeRules(stage?.gradingRules ?? []), [stage, labId, stageIndex, nonce]);

  if (!open || !lab || !stage) return null;

  const done = (labProgress?.completedStages ?? []).includes(stage.id);
  const allPassed = grading.verdicts.every((v) => v.passed);

  const complete = () => {
    const snapshot = simSnapshotRef.current;
    completeLabStage(lab.id, stage.id, grading.score, snapshot?.totalCostPerHourUsd);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-3" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Guided lab"
      >
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
          <FlaskConical size={16} className="text-sky-300" />
          <select value={lab.id} onChange={(e) => setLabId(e.target.value)} className="max-w-64 truncate rounded bg-zinc-900 px-2 py-1 text-sm font-bold text-zinc-50">
            {GUIDED_LABS.map((l) => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
          <span className="hidden text-[11px] text-zinc-500 md:inline">
            target {lab.targetRps.toLocaleString()} RPS · p99 ≤ {lab.sloP99Ms}ms · ${lab.budgetUsdPerHour}/h
          </span>
          {labProgress && labProgress.bestScore > 0 && (
            <span className="flex items-center gap-1 rounded bg-amber-300/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-200">
              <Award size={12} /> best {labProgress.bestScore}
            </span>
          )}
          <button onClick={onClose} className="ml-auto flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 hover:bg-zinc-800" aria-label="Close labs">
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-zinc-800 p-2">
          {lab.stages.map((s, i) => {
            const isDone = (labProgress?.completedStages ?? []).includes(s.id);
            return (
              <div
                key={s.id}
                className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${
                  i === stageIndex ? "bg-sky-500 text-zinc-950" : isDone ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-900 text-zinc-500"
                }`}
                title={s.title}
              >
                {i + 1}. {s.kind}
              </div>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <div>
            <h4 className="text-base font-bold text-zinc-50">{stage.title}</h4>
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">Stage {stageIndex + 1} of {lab.stages.length} · {stage.kind.replace(/_/g, " ")}</p>
          </div>

          <Markdown source={stage.instructionsMarkdown} />

          {stage.hints.length > 0 && (
            <details className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-zinc-300">Hints ({stage.hints.length})</summary>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-zinc-400">
                {stage.hints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </details>
          )}

          {stage.gradingRules.length > 0 && (
            <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-2.5">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-bold text-zinc-100">Automated grading — score {grading.score}</p>
                <button onClick={() => setNonce((n) => n + 1)} className="rounded border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300 hover:bg-zinc-800">
                  Re-run checks
                </button>
              </div>
              <div className="space-y-1">
                {grading.verdicts.map((v) => (
                  <p key={v.rule.id} className={`rounded px-2 py-1 text-xs ${v.passed ? "bg-emerald-500/10 text-emerald-200" : "bg-red-500/10 text-red-200"}`}>
                    {v.passed ? "✓" : "✗"} {v.detail}
                  </p>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={complete}
            disabled={done || !allPassed}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-sky-500 py-2 text-xs font-semibold text-zinc-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {done ? "Stage complete ✓" : allPassed ? <>Complete stage <ChevronRight size={14} /></> : "Pass all checks to continue"}
          </button>

          <details className="rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-zinc-300">Reference solution (peek after attempting)</summary>
            <div className="mt-2"><Markdown source={lab.solutionMarkdown} /></div>
          </details>
        </div>
      </div>
    </div>
  );
}

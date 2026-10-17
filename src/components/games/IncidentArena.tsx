'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, Trophy, X } from "@/components/ui/icons";
import { CHAOS_SCENARIOS } from "@/data/chaosScenarios";
import type { ChaosKind } from "@/types/simulation";
import type { IncidentScore } from "@/types/challenges";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useSimStore } from "@/store/useSimStore";
import { Markdown } from "../Markdown";

/**
 * Timed outage-response game: pick one of 20 incident scenarios, keep the
 * live topology inside its p99/error SLOs before the clock and fix budget
 * run out. Peak impact, MTTR, and spend are scored; best runs persist to
 * localStorage per scenario.
 */

interface IncidentArenaProps {
  open: boolean;
  onClose: () => void;
}

const KIND_DEFAULTS: Record<Exclude<ChaosKind, "none">, { capacityPenalty: number; latencyPenaltyMs: number }> = {
  zone_outage: { capacityPenalty: 0.34, latencyPenaltyMs: 0 },
  latency_spike: { capacityPenalty: 0, latencyPenaltyMs: 250 },
  packet_loss: { capacityPenalty: 0, latencyPenaltyMs: 40 },
  cpu_hog: { capacityPenalty: 0.5, latencyPenaltyMs: 0 },
  traffic_surge: { capacityPenalty: 0, latencyPenaltyMs: 0 },
  dependency_down: { capacityPenalty: 0.9, latencyPenaltyMs: 0 },
  dns_failure: { capacityPenalty: 0.6, latencyPenaltyMs: 0 },
};

const SCORE_KEY = "syscanvas.incidentScores";

function loadScores(): IncidentScore[] {
  try {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") return [];
    const raw = window.localStorage.getItem(SCORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as IncidentScore[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistScore(score: IncidentScore): IncidentScore[] {
  const all = [...loadScores().filter((s) => s.scenarioId !== score.scenarioId), score];
  try {
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      window.localStorage.setItem(SCORE_KEY, JSON.stringify(all));
    }
  } catch {
    /* private mode — session-only leaderboard */
  }
  return all;
}

export function IncidentArena({ open, onClose }: IncidentArenaProps) {
  const [scenarioId, setScenarioId] = useState(CHAOS_SCENARIOS[0]?.id ?? "");
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState<IncidentScore | null>(null);
  const [scores, setScores] = useState<IncidentScore[]>(() => loadScores());
  const peaks = useRef({ err: 0, p99: 0, cost: 0 });

  const scenario = useMemo(
    () => CHAOS_SCENARIOS.find((s) => s.id === scenarioId) ?? CHAOS_SCENARIOS[0],
    [scenarioId],
  );
  const globalP99Ms = useSimStore((s) => s.globalP99Ms);
  const globalErrorRate = useSimStore((s) => s.globalErrorRate);
  const totalCostPerHourUsd = useSimStore((s) => s.totalCostPerHourUsd);

  useEffect(() => {
    if (!running) return;
    peaks.current.err = Math.max(peaks.current.err, globalErrorRate);
    peaks.current.p99 = Math.max(peaks.current.p99, globalP99Ms);
    peaks.current.cost += (totalCostPerHourUsd / 3600) * 0.5;
  }, [running, globalErrorRate, globalP99Ms, totalCostPerHourUsd]);

  useEffect(() => {
    if (!running || !scenario) return;
    if (secondsLeft <= 0) {
      finish(true);
      return;
    }
    const timer = setTimeout(() => {
      setSecondsLeft((s) => s - 1);
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, secondsLeft, scenario]);

  if (!open || !scenario) return null;

  const start = () => {
    const defaults = KIND_DEFAULTS[scenario.chaosKind];
    peaks.current = { err: 0, p99: 0, cost: 0 };
    setElapsed(0);
    setFinished(null);
    setSecondsLeft(scenario.durationSeconds);
    setRunning(true);
    const sim = useSimStore.getState();
    if (!sim.running) {
      sim.startSimulation(() => useCanvasStore.getState().toGraphTopology());
    } else {
      sim.syncTopology();
    }
    sim.setChaos({
      active: true,
      kind: scenario.chaosKind,
      capacityPenalty: defaults.capacityPenalty,
      latencyPenaltyMs: defaults.latencyPenaltyMs,
      targetNodeIds: [],
      targetRegion: null,
      startedAtTick: sim.tick,
    });
  };

  const finish = (timeUp: boolean) => {
    void timeUp;
    const sim = useSimStore.getState();
    sim.clearChaos();
    setRunning(false);
    const won =
      peaks.current.p99 <= scenario.sloP99Ms &&
      peaks.current.err <= scenario.maxErrorRate &&
      peaks.current.cost <= scenario.budgetUsd;
    const errScore = Math.max(0, 1 - peaks.current.err / Math.max(0.001, scenario.maxErrorRate * 3));
    const p99Score = Math.max(0, 1 - peaks.current.p99 / Math.max(1, scenario.sloP99Ms * 3));
    const score: IncidentScore = {
      scenarioId: scenario.id,
      score: Math.round(100 * (0.5 * errScore + 0.3 * p99Score + 0.2 * (won ? 1 : 0.4))),
      mttrSeconds: elapsed,
      peakErrorRate: peaks.current.err,
      peakP99Ms: peaks.current.p99,
      budgetSpentUsd: peaks.current.cost,
      won,
    };
    setFinished(score);
    setScores(persistScore(score));
  };

  const best = scores.find((s) => s.scenarioId === scenario.id);
  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/75 p-3" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Incident arena"
      >
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
          <Flame size={16} className="text-red-400" />
          <select value={scenario.id} onChange={(e) => { setScenarioId(e.target.value); setRunning(false); setFinished(null); }} disabled={running} className="max-w-64 truncate rounded bg-zinc-900 px-2 py-1 text-sm font-bold text-zinc-50 disabled:opacity-60">
            {CHAOS_SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          {best && (
            <span className="flex items-center gap-1 rounded bg-amber-300/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-200">
              <Trophy size={12} /> best {best.score}{best.won ? " · cleared" : ""}
            </span>
          )}
          <button onClick={onClose} className="ml-auto flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 hover:bg-zinc-800" aria-label="Close arena">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <Markdown source={scenario.narrativeMarkdown} />
          <div className="grid grid-cols-2 gap-2 text-center text-xs md:grid-cols-4">
            {[
              ["Clock", running ? mmss : `${Math.floor(scenario.durationSeconds / 60)}m drill`],
              [`p99 (SLO ${scenario.sloP99Ms}ms)`, `${globalP99Ms.toFixed(0)}ms`],
              [`err (≤ ${(scenario.maxErrorRate * 100).toFixed(0)}%)`, `${(globalErrorRate * 100).toFixed(2)}%`],
              [`spend ($${scenario.budgetUsd})`, `$${peaks.current.cost.toFixed(2)}`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border border-zinc-800 bg-zinc-900/60 p-2">
                <p className="text-zinc-500">{k}</p>
                <p className="font-bold tabular-nums text-zinc-100">{v}</p>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-2.5">
            <p className="mb-1 text-xs font-bold text-zinc-100">Success criteria</p>
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-zinc-400">
              {scenario.successCriteria.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
              <li>Hint: {scenario.targetHint}</li>
            </ul>
          </div>

          {!running && !finished && (
            <button onClick={start} className="w-full rounded-md bg-red-500 py-2 text-xs font-semibold text-white hover:bg-red-400">
              Start {Math.floor(scenario.durationSeconds / 60)}-minute drill — chaos injects immediately
            </button>
          )}
          {running && (
            <button onClick={() => finish(false)} className="w-full rounded-md bg-emerald-400 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-300">
              Mitigated — stop the clock & score
            </button>
          )}

          {finished && (
            <div className={`rounded-md border p-3 text-center ${finished.won ? "border-emerald-400/60 bg-emerald-500/10" : "border-amber-400/60 bg-amber-500/10"}`}>
              <p className={`text-lg font-bold ${finished.won ? "text-emerald-300" : "text-amber-300"}`}>
                {finished.won ? "Incident cleared — SLOs held" : "SLOs breached — review the post-mortem"} · {finished.score}/100
              </p>
              <p className="mt-1 text-xs tabular-nums text-zinc-400">
                MTTR {finished.mttrSeconds}s · peak err {(finished.peakErrorRate * 100).toFixed(2)}% · peak p99 {finished.peakP99Ms.toFixed(0)}ms · spent ${finished.budgetSpentUsd.toFixed(2)}
              </p>
              <button onClick={start} className="mt-2 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800">
                Run it back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

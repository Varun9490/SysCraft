'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  ChevronRight,
  FlaskConical,
  Lightbulb,
  ListChecks,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "@/components/ui/icons";
import { Markdown } from "@/components/Markdown";
import { SystemCanvas } from "@/components/canvas/SystemCanvas";
import { gradeRules } from "@/components/games/GuidedLabRunner";
import { ResourcesPanel } from "@/components/shell/ResourcesPanel";
import { SoundBridge } from "@/components/shell/SoundBridge";
import { DifficultyBadge } from "@/components/ui/Badge";
import { getCompanyBrand } from "@/data/companyBrands";
import { GUIDED_LABS } from "@/data/guidedLabs";
import { formatRps, labCleanTitle } from "@/data/labMeta";
import { isSoundEnabled, playToggle, setSoundEnabled } from "@/engine/soundEngine";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useLearningStore } from "@/store/useLearningStore";
import { simSnapshotRef, useSimStore } from "@/store/useSimStore";

type TabId = "brief" | "stages" | "resources";

const TABS: Array<{ id: TabId; label: string; Icon: typeof BookOpen }> = [
  { id: "brief", label: "Brief", Icon: BookOpen },
  { id: "stages", label: "Stages", Icon: ListChecks },
  { id: "resources", label: "Resources", Icon: FlaskConical },
];

function SimMetrics() {
  const running = useSimStore((s) => s.running);
  const rps = useSimStore((s) => s.globalRps);
  const p99 = useSimStore((s) => s.globalP99Ms);
  const errorRate = useSimStore((s) => s.globalErrorRate);
  const cost = useSimStore((s) => s.totalCostPerHourUsd);

  const errorTone = errorRate >= 0.05 ? "text-red-400" : errorRate >= 0.01 ? "text-amber-300" : "text-emerald-300";

  return (
    <div className="hidden items-center gap-4 text-[12px] tabular-nums text-zinc-400 md:flex">
      <span className="inline-flex items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 rounded-full ${running ? "animate-pulse bg-emerald-400" : "bg-zinc-600"}`}
        />
        {running ? "live" : "paused"}
      </span>
      <span>
        <span className="text-zinc-500">rps </span>
        {rps >= 1000 ? `${(rps / 1000).toFixed(1)}k` : rps.toFixed(0)}
      </span>
      <span>
        <span className="text-zinc-500">p99 </span>
        {p99.toFixed(0)}ms
      </span>
      <span className={errorTone}>
        <span className="text-zinc-500">err </span>
        {(errorRate * 100).toFixed(2)}%
      </span>
      <span>
        <span className="text-zinc-500">cost </span>
        ${cost.toFixed(2)}/h
      </span>
    </div>
  );
}

function RunControl() {
  const running = useSimStore((s) => s.running);
  const toggle = () => {
    const sim = useSimStore.getState();
    if (sim.running) {
      sim.stopSimulation();
      playToggle(false);
    } else {
      sim.startSimulation(() => useCanvasStore.getState().toGraphTopology());
      playToggle(true);
    }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
        running
          ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
          : "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
      }`}
      title="Run/stop simulation [space]"
    >
      {running ? <Pause size={14} /> : <Play size={14} />}
      {running ? "Pause" : "Run"}
    </button>
  );
}

function SoundControl({ soundOn, onToggle }: { soundOn: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
      title="Toggle procedural audio"
    >
      {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
    </button>
  );
}

export function LabWorkspace({ labId }: { labId: string }) {
  const lab = useMemo(() => GUIDED_LABS.find((entry) => entry.id === labId) ?? null, [labId]);
  const brand = getCompanyBrand(labId);

  const [tab, setTab] = useState<TabId>("brief");
  const [nonce, setNonce] = useState(0);
  const [soundOn, setSoundOn] = useState(true);

  const labProgress = useLearningStore((s) => (lab ? s.labProgress[lab.id] : undefined));
  const completeLabStage = useLearningStore((s) => s.completeLabStage);

  const stageIndex = Math.min(labProgress?.currentStage ?? 0, (lab?.stages.length ?? 1) - 1);
  const stage = lab?.stages[stageIndex];

  const grading = useMemo(
    () => gradeRules(stage?.gradingRules ?? []),
    [stage, labId, stageIndex, nonce],
  );

  useEffect(() => {
    void useLearningStore.getState().hydrateFromDb();
    setSoundOn(isSoundEnabled());
  }, []);

  if (!lab || !stage) {
    return (
      <main className="flex h-[100dvh] w-screen flex-col items-center justify-center gap-4 bg-zinc-950 text-zinc-300">
        <FlaskConical size={28} className="text-zinc-600" />
        <p className="text-sm">This lab couldn’t be found.</p>
        <Link
          href="/labs"
          className="rounded-full border border-zinc-700 px-5 py-2 text-sm text-zinc-200 transition-colors hover:bg-zinc-800"
        >
          Back to labs
        </Link>
      </main>
    );
  }

  const completedStages = labProgress?.completedStages ?? [];
  const done = completedStages.includes(stage.id);
  const allPassed = grading.verdicts.every((v) => v.passed);
  const completedCount = completedStages.length;
  const progressPct = Math.round((completedCount / lab.stages.length) * 100);

  const complete = () => {
    const snapshot = simSnapshotRef.current;
    completeLabStage(lab.id, stage.id, grading.score, snapshot?.totalCostPerHourUsd);
    setNonce((n) => n + 1);
  };

  return (
    <main className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <SoundBridge />

      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-800/80 bg-zinc-950/90 px-3 backdrop-blur">
        <Link
          href="/labs"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          title="Back to all labs"
        >
          <ArrowLeft size={16} />
        </Link>

        <div className="flex min-w-0 items-center gap-2.5">
          <span className="text-[13px] font-semibold" style={{ color: brand.color }}>
            {brand.company}
          </span>
          <span className="truncate text-[13px] text-zinc-300">{labCleanTitle(lab)}</span>
          <DifficultyBadge difficulty={lab.difficulty} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brass to-success"
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <span className="text-[11px] tabular-nums text-zinc-500">
              {completedCount}/{lab.stages.length}
            </span>
            {labProgress && labProgress.bestScore > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-amber-200">
                <Award size={11} />
                {labProgress.bestScore}
              </span>
            )}
          </div>
          <SimMetrics />
          <RunControl />
          <SoundControl
            soundOn={soundOn}
            onToggle={() => {
              const next = !soundOn;
              setSoundOn(next);
              setSoundEnabled(next);
            }}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[350px] shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950">
          <div className="flex gap-1 border-b border-zinc-800/80 p-2">
            {TABS.map(({ id, label, Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium transition-colors ${
                    active ? "text-zinc-950" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="lab-tab-pill"
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-brass to-brass-bright"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative inline-flex items-center gap-1.5">
                    <Icon size={13} />
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="h-full"
              >
                {tab === "resources" && <ResourcesPanel />}

                {tab === "brief" && (
                  <div className="h-full space-y-4 overflow-y-auto p-4">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Target load", value: formatRps(lab.targetRps) },
                        { label: "p99 SLO", value: `${lab.sloP99Ms}ms` },
                        { label: "Budget", value: `$${lab.budgetUsdPerHour}/hr` },
                        { label: "Duration", value: `${lab.estimatedMinutes} min` },
                      ].map((spec) => (
                        <div key={spec.label} className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{spec.label}</p>
                          <p className="mt-1 text-[13px] font-semibold tabular-nums text-zinc-100">{spec.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                      <Markdown source={lab.briefMarkdown} />
                    </div>

                    <button
                      type="button"
                      onClick={() => setTab("stages")}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brass py-2.5 text-[13px] font-semibold text-zinc-950 transition-transform hover:scale-[1.01]"
                    >
                      {completedCount > 0 ? "Continue where you left off" : "Start stage 1"}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}

                {tab === "stages" && (
                  <div className="flex h-full flex-col">
                    <div className="flex gap-1 overflow-x-auto border-b border-zinc-800/70 px-2 py-2">
                      {lab.stages.map((s, i) => {
                        const isDone = completedStages.includes(s.id);
                        const isCurrent = i === stageIndex;
                        return (
                          <span
                            key={s.id}
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ${
                              isCurrent
                                ? "bg-sky-500 text-zinc-950"
                                : isDone
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-zinc-900 text-zinc-500"
                            }`}
                            title={s.title}
                          >
                            {isDone && !isCurrent ? <Check size={12} /> : i + 1}
                          </span>
                        );
                      })}
                    </div>

                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                          Stage {stageIndex + 1} of {lab.stages.length} · {stage.kind.replace(/_/g, " ")}
                        </p>
                        <h3 className="mt-1 text-[15px] font-semibold text-zinc-50">{stage.title}</h3>
                      </div>

                      <Markdown source={stage.instructionsMarkdown} />

                      {stage.hints.length > 0 && (
                        <details className="rounded-xl border border-zinc-800/80 bg-zinc-900/45 px-3 py-2.5">
                          <summary className="flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-zinc-300">
                            <Lightbulb size={13} className="text-amber-300" />
                            Hints ({stage.hints.length})
                          </summary>
                          <ul className="mt-2 space-y-1.5 pl-1 text-[12.5px] text-zinc-400">
                            {stage.hints.map((hint, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-zinc-600">–</span>
                                {hint}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}

                      {stage.gradingRules.length > 0 && (
                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/45 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-[12px] font-semibold text-zinc-100">
                              Automated checks · score {grading.score}
                            </p>
                            <button
                              type="button"
                              onClick={() => setNonce((n) => n + 1)}
                              className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300 transition-colors hover:bg-zinc-800"
                            >
                              <RotateCcw size={11} />
                              Re-run
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {grading.verdicts.map((v) => (
                              <p
                                key={v.rule.id}
                                className={`rounded-lg px-2.5 py-1.5 text-[12px] leading-snug ${
                                  v.passed ? "bg-emerald-500/10 text-emerald-200" : "bg-red-500/10 text-red-200"
                                }`}
                              >
                                {v.passed ? "✓" : "✗"} {v.detail}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={complete}
                        disabled={done || !allPassed}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-500 py-2.5 text-[13px] font-semibold text-zinc-950 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {done ? (
                          <>
                            <Check size={14} /> Stage complete
                          </>
                        ) : allPassed ? (
                          <>
                            Complete stage <ChevronRight size={14} />
                          </>
                        ) : (
                          "Pass all checks to continue"
                        )}
                      </button>

                      <details className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-3 py-2.5">
                        <summary className="cursor-pointer text-[12px] font-medium text-zinc-400">
                          Reference solution (peek after attempting)
                        </summary>
                        <div className="mt-2">
                          <Markdown source={lab.solutionMarkdown} />
                        </div>
                      </details>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </aside>

        <div className="relative min-w-0 flex-1">
          <SystemCanvas className="h-full w-full" />
        </div>
      </div>
    </main>
  );
}

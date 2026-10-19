'use client';

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FlaskConical,
  Gauge,
  PlayCircle,
  ShieldCheck,
} from "@/components/ui/icons";
import { Markdown } from "@/components/Markdown";
import { LabWorkspaceLoader } from "@/components/labs/LabWorkspaceLoader";
import { labConceptRefs, labCleanTitle, formatRps } from "@/data/labMeta";
import { labLevel } from "@/data/labLevels";
import { useLearningStore } from "@/store/useLearningStore";
import type { GuidedLab } from "@/types/challenges";

/**
 * Server-renderable lab landing page (phase 0 of the lab).
 *
 * The scenario, numbers, concepts, stage ladder, rubric preview, and level
 * expectations are real static HTML — crawlers and no-JS visitors get the full
 * brief. Only the interactive canvas itself lazy-loads behind "Start",
 * which is why the shell never renders an empty "Loading your design canvas…"
 * page for anyone important.
 */

const STAGE_KIND_LABEL: Record<GuidedLab["stages"][number]["kind"], string> = {
  brief: "Brief",
  boe: "Estimate",
  topology: "Design",
  api: "API",
  data_model: "Data model",
  chaos: "Chaos",
  review: "Review",
};

export function LabBrief({ lab }: { lab: GuidedLab }) {
  const [started, setStarted] = useState(false);
  const progress = useLearningStore((s) => s.labProgress[lab.id]);
  const completed = Boolean(progress && progress.bestScore > 0);
  const level = labLevel(lab.difficulty);
  const concepts = labConceptRefs(lab.id);
  const gradedStages = lab.stages.filter((s) => s.gradingRules.length > 0);
  const totalPoints = lab.stages.reduce(
    (sum, stage) => sum + stage.gradingRules.reduce((s, r) => s + r.points, 0),
    0,
  );

  if (started) {
    return <LabWorkspaceLoader labId={lab.id} />;
  }

  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[380px] overflow-hidden">
        <div className="line-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_0%,black,transparent)]" />
      </div>

      <div className="section-container relative pb-16 pt-12 md:pt-16">
        <nav className="mb-6 text-[12.5px] text-zinc-500" aria-label="Breadcrumb">
          <Link href="/labs" className="hover:text-zinc-300">
            Labs
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">{labCleanTitle(lab)}</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brass/30 bg-brass/10 px-3 py-1 text-[11px] font-semibold text-brass">
                <ShieldCheck size={12} />
                {level.badge}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[12px] text-content-tertiary">
                <Clock size={12} /> {lab.estimatedMinutes} min · {lab.stages.length} stages · {totalPoints} points
              </span>
              {completed && progress && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-400">
                  <CheckCircle2 size={12} /> Best score {progress.bestScore}/100
                </span>
              )}
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">{lab.title}</h1>
          </div>

          <button
            type="button"
            onClick={() => setStarted(true)}
            className="group inline-flex items-center gap-2 rounded-full bg-brass px-6 py-3 text-sm font-semibold text-zinc-950 shadow-card transition-transform hover:scale-[1.03]"
          >
            {completed ? "Re-open the lab canvas" : "Start the lab"}
            <PlayCircle size={16} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          <div className="min-w-0 space-y-6">
            <section className="rounded-2xl border border-line bg-app/50 p-5 shadow-card sm:p-6" aria-label="Scenario">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">The scenario</p>
              <div className="mt-3">
                <Markdown source={lab.briefMarkdown} />
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-app/50 p-5 shadow-card sm:p-6" aria-label="Rubric preview">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">How you are graded</p>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
                The grader runs deterministic checks against the live simulation: required components present, p99 and
                error rate inside the SLO, and the hourly budget respected. {gradedStages.length} of {lab.stages.length}{" "}
                stages carry graded rules worth {totalPoints} points.
              </p>
              <ul className="mt-4 space-y-2">
                {gradedStages.map((stage) =>
                  stage.gradingRules.map((rule) => (
                    <li key={rule.id} className="flex items-start justify-between gap-3 text-[13px] text-zinc-300">
                      <span>
                        <span className="mr-2 inline-flex rounded-md border border-line bg-app-raised/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-content-tertiary">
                          {STAGE_KIND_LABEL[stage.kind]}
                        </span>
                        {rule.description}
                      </span>
                      <span className="shrink-0 tabular-nums text-[12px] font-semibold text-brass">{rule.points} pts</span>
                    </li>
                  )),
                )}
              </ul>
            </section>

            <section className="rounded-2xl border border-line bg-app/50 p-5 shadow-card sm:p-6" aria-label="Stage plan">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Stage plan</p>
              <ol className="mt-4 space-y-3">
                {lab.stages.map((stage, index) => (
                  <li key={stage.id} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-brass/30 bg-brass/10 text-[11px] font-semibold tabular-nums text-brass">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium text-zinc-100">
                        {stage.title}
                        <span className="ml-2 rounded-md border border-line bg-app-raised/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-content-tertiary">
                          {STAGE_KIND_LABEL[stage.kind]}
                        </span>
                      </p>
                      <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-zinc-500">
                        {stage.instructionsMarkdown}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <div className="flex flex-col gap-6">
            <section className="rounded-2xl border border-line bg-app/50 p-5 shadow-card sm:p-6" aria-label="Targets">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">The numbers</p>
              <dl className="mt-4 space-y-3 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-zinc-400">
                    <Gauge size={14} /> Traffic target
                  </dt>
                  <dd className="font-semibold tabular-nums text-zinc-100">{formatRps(lab.targetRps)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-400">p99 latency SLO</dt>
                  <dd className="font-semibold tabular-nums text-zinc-100">{lab.sloP99Ms} ms</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-400">Hourly budget</dt>
                  <dd className="font-semibold tabular-nums text-zinc-100">${lab.budgetUsdPerHour}/hr</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-line bg-app-raised/40 p-5 sm:p-6" aria-label="What this level means">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">What {level.badge} means</p>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{level.expectation}</p>
              <ul className="mt-3 space-y-1.5">
                {level.signals.map((signal) => (
                  <li key={signal} className="flex items-start gap-2 text-[12.5px] text-zinc-400">
                    <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-brass" />
                    {signal}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-line bg-app/50 p-5 shadow-card sm:p-6" aria-label="Concepts">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Concepts you will use</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {concepts.length === 0 && <span className="text-[12.5px] text-zinc-500">Canvas fundamentals</span>}
                {concepts.map((ref) => (
                  <Link
                    key={ref.href}
                    href={ref.href}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors hover:text-content ${
                      ref.kind === "wiki"
                        ? "border-line bg-app-raised/60 text-content-secondary hover:border-brass/40"
                        : "border-line bg-app-raised/60 text-content-secondary"
                    }`}
                  >
                    {ref.kind === "wiki" ? <BookOpen size={12} className="text-brass" /> : <FlaskConical size={12} className="text-brass" />}
                    {ref.title}
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-brass/25 bg-brass/[0.06] p-5 sm:p-6" aria-label="What you leave with">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">What you leave with</p>
              <ul className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-zinc-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-brass" />
                  A defensible architecture you ran to destruction yourself
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-brass" />
                  A graded report: SLOs, budget, and every grader violation explained
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-brass" />
                  A reference solution to compare against once your attempt is committed
                </li>
              </ul>
              <button
                type="button"
                onClick={() => setStarted(true)}
                className="group mt-4 inline-flex items-center gap-2 rounded-full border border-brass/40 px-4 py-2 text-[13px] font-semibold text-brass transition-colors hover:bg-brass/10"
              >
                {completed ? "Jump back in" : "Open the canvas"}
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </section>
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-10 text-[12px] text-content-tertiary"
        >
          Company names reference publicly documented architectures for teaching only — unaffiliated, no logos, no
          endorsement implied.
        </motion.p>
      </div>
    </div>
  );
}

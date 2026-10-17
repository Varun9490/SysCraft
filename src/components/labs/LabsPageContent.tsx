'use client';

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Gauge, Layers, Wallet } from "@/components/ui/icons";
import { AnimatedSection, StaggerContainer, StaggerItem } from "@/components/ui/AnimatedSection";
import { DifficultyBadge, type LabDifficulty } from "@/components/ui/Badge";
import { GlowCard } from "@/components/ui/GlowCard";
import { GUIDED_LABS } from "@/data/guidedLabs";
import { getCompanyBrand } from "@/data/companyBrands";
import { formatRps, labCleanTitle, labExcerpt } from "@/data/labMeta";
import { useLearningStore } from "@/store/useLearningStore";

type Filter = "all" | LabDifficulty;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All labs" },
  { id: "starter", label: "Starter" },
  { id: "standard", label: "Standard" },
  { id: "advanced", label: "Advanced" },
  { id: "staff_plus", label: "Staff+" },
];

export function LabsPageContent() {
  const [filter, setFilter] = useState<Filter>("all");
  const labProgress = useLearningStore((s) => s.labProgress);

  const labs = useMemo(
    () => (filter === "all" ? GUIDED_LABS : GUIDED_LABS.filter((lab) => lab.difficulty === filter)),
    [filter],
  );

  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
        <div className="line-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_0%,black,transparent)]" />
      </div>

      <section className="section-container relative pb-10 pt-16 md:pt-24">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
        <AnimatedSection className="lg:col-span-7">
          <span className="eyebrow">Hands-on labs</span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tighter text-content md:text-5xl">
            Design real systems,
            <br />
            from a blank canvas
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-content-secondary">
            Sixteen labs modeled on the architectures behind products you use every day. Each one is graded
            automatically against latency SLOs, error budgets, cost ceilings, and topology rules.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.12} className="flex flex-wrap items-center gap-2 lg:col-span-5 lg:justify-end">
          {FILTERS.map((option) => {
            const active = filter === option.id;
            const count =
              option.id === "all" ? GUIDED_LABS.length : GUIDED_LABS.filter((lab) => lab.difficulty === option.id).length;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={`relative rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                  active ? "text-ink" : "text-content-secondary hover:text-content"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="labs-filter-pill"
                    className="absolute inset-0 rounded-full bg-brass"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                <span className="relative">
                  {option.label}
                  <span className={`ml-1.5 text-[11px] tabular-nums ${active ? "text-ink/70" : "text-content-tertiary"}`}>
                    {count}
                  </span>
                </span>
              </button>
            );
          })}
        </AnimatedSection>
        </div>
      </section>

      <section className="section-container pb-20 pt-6">
        <StaggerContainer key={filter} className="grid gap-5 md:grid-cols-2">
          {labs.map((lab) => {
            const brand = getCompanyBrand(lab.id);
            const progress = labProgress[lab.id];
            const completed = Boolean(progress && progress.bestScore > 0);
            const stageCount = lab.stages.length;

            return (
              <StaggerItem key={lab.id} className="h-full">
                <GlowCard className="h-full" glowColor={brand.soft}>
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: brand.color }} />
                  <Link href={`/labs/${lab.id}`} className="flex h-full flex-col p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[14px] font-semibold tracking-tight" style={{ color: brand.color }}>
                        {brand.company}
                      </span>
                      <div className="flex items-center gap-2">
                        {completed && (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-emerald-300">
                            Best {progress.bestScore}/100
                          </span>
                        )}
                        <DifficultyBadge difficulty={lab.difficulty} />
                      </div>
                    </div>

                    <h2 className="mt-3 text-lg font-semibold tracking-tight text-zinc-100">{labCleanTitle(lab)}</h2>
                    <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-zinc-400">{labExcerpt(lab)}</p>

                    <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] tabular-nums text-zinc-400">
                        <Clock size={12} className="text-zinc-500" />
                        {lab.estimatedMinutes} min
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] tabular-nums text-zinc-400">
                        <Gauge size={12} className="text-zinc-500" />
                        {formatRps(lab.targetRps)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] tabular-nums text-zinc-400">
                        <Layers size={12} className="text-zinc-500" />
                        p99 {lab.sloP99Ms}ms
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] tabular-nums text-zinc-400">
                        <Wallet size={12} className="text-zinc-500" />
                        ${lab.budgetUsdPerHour}/hr
                      </span>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-5">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{stageCount} stages</span>
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-200 transition-colors group-hover:text-sky-300">
                        Start designing
                        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                </GlowCard>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        <AnimatedSection
          delay={0.1}
          className="mt-12 grid gap-y-6 rounded-2xl border border-line/70 bg-app/40 p-6 sm:grid-cols-4 sm:divide-x sm:divide-line/60"
        >
          {[
            { label: "Total labs", value: `${GUIDED_LABS.length}` },
            { label: "Avg. duration", value: `${Math.round(GUIDED_LABS.reduce((s, l) => s + l.estimatedMinutes, 0) / GUIDED_LABS.length)} min` },
            { label: "Starter labs", value: `${GUIDED_LABS.filter((l) => l.difficulty === "starter").length}` },
            { label: "Staff+ challenges", value: `${GUIDED_LABS.filter((l) => l.difficulty === "staff_plus").length}` },
          ].map((stat) => (
            <div key={stat.label} className="sm:px-6 sm:first:pl-0 sm:last:pr-0">
              <p className="text-xl font-semibold tabular-nums tracking-tight text-content">{stat.value}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-content-tertiary">{stat.label}</p>
            </div>
          ))}
        </AnimatedSection>
      </section>
    </div>
  );
}

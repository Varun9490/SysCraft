'use client';

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Clock, FlaskConical, GraduationCap, HelpCircle, Search, Sparkles } from "@/components/ui/icons";
import { SkillConstellation } from "@/components/encyclopedia/SkillConstellation";
import { VisualAlmanac } from "@/components/encyclopedia/VisualAlmanac";
import { AnimatedSection, StaggerContainer, StaggerItem } from "@/components/ui/AnimatedSection";
import { GlowCard } from "@/components/ui/GlowCard";
import { ENCYCLOPEDIA_MAP, ENCYCLOPEDIA_MODULES } from "@/data/encyclopediaData";
import type { AlmanacDifficulty } from "@/types/encyclopedia";

type Filter = "all" | AlmanacDifficulty;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All modules" },
  { id: "foundations", label: "Foundations" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

const DIFFICULTY_TONE: Record<AlmanacDifficulty, string> = {
  foundations: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  intermediate: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  advanced: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

const VISUAL_LABELS: Record<string, string> = {
  btree_vs_lsm: "B-Tree vs LSM",
  consistent_hash_ring: "Consistent hash ring",
  raft_election: "Raft election",
  token_bucket: "Token bucket",
  gossip: "Gossip protocol",
  merkle_tree: "Merkle tree",
  bloom_filter: "Bloom filter",
  vector_hnsw: "HNSW vector index",
};

export function EncyclopediaPageContent() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const moduleId = params.get("module");
    if (moduleId && ENCYCLOPEDIA_MAP[moduleId]) {
      setActiveModuleId(moduleId);
    }
  }, []);

  const modules = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ENCYCLOPEDIA_MODULES.filter((module) => {
      if (filter !== "all" && module.difficulty !== filter) return false;
      if (!q) return true;
      return (
        module.title.toLowerCase().includes(q) ||
        module.summary.toLowerCase().includes(q) ||
        module.id.includes(q)
      );
    });
  }, [filter, query]);

  const totals = useMemo(() => {
    let flashcards = 0;
    let questions = 0;
    let interactives = 0;
    for (const module of ENCYCLOPEDIA_MODULES) {
      flashcards += module.flashcards.length;
      questions += module.quiz.length;
      if (module.interactiveVisual !== "none") interactives += 1;
    }
    return { flashcards, questions, interactives };
  }, []);

  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
        <div className="line-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_0%,black,transparent)]" />
      </div>

      <section className="section-container relative pb-10 pt-16 md:pt-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <AnimatedSection className="lg:col-span-7">
            <span className="eyebrow">Visual almanac</span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tighter text-content md:text-5xl">
              The system design
              <br />
              encyclopedia
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-content-secondary">
              {ENCYCLOPEDIA_MODULES.length} concept modules with trade-off matrices, spaced-repetition flashcards,
              contextual quizzes, and {totals.interactives} interactive algorithm visualizations.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.1} className="lg:col-span-5">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line/70 bg-line/60">
              {[
                { label: "Concept modules", value: `${ENCYCLOPEDIA_MODULES.length}` },
                { label: "Flashcards", value: `${totals.flashcards}` },
                { label: "Quiz questions", value: `${totals.questions}` },
                { label: "Interactive visuals", value: `${totals.interactives}` },
              ].map((stat) => (
                <div key={stat.label} className="bg-app/70 px-5 py-4">
                  <p className="text-2xl font-semibold tabular-nums tracking-tight text-content">{stat.value}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-content-tertiary">{stat.label}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="section-container pb-10">
        <AnimatedSection delay={0.15}>
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6">
            <div className="mb-4 flex items-center gap-2">
              <GraduationCap size={16} className="text-violet-300" />
              <h2 className="text-[14px] font-semibold text-zinc-100">Your skill map</h2>
              <span className="text-[12px] text-zinc-500">
                — skills unlock as you review flashcards. Click one to start reading.
              </span>
            </div>
            <SkillConstellation onSelectModule={(moduleId) => setActiveModuleId(moduleId)} />
          </div>
        </AnimatedSection>
      </section>

      <section className="section-container pb-20">
        <AnimatedSection delay={0.05}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search concepts, e.g. “consistent hashing”…"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/70 py-2.5 pl-10 pr-4 text-[13.5px] text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((option) => {
                const active = filter === option.id;
                const count =
                  option.id === "all"
                    ? ENCYCLOPEDIA_MODULES.length
                    : ENCYCLOPEDIA_MODULES.filter((m) => m.difficulty === option.id).length;
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
                        layoutId="encyclopedia-filter-pill"
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
            </div>
          </div>
        </AnimatedSection>

        <StaggerContainer className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <StaggerItem key={module.id} className="h-full">
              <GlowCard className="h-full" glowColor="rgba(139, 92, 246, 0.14)">
                <button
                  type="button"
                  onClick={() => setActiveModuleId(module.id)}
                  className="flex h-full w-full flex-col p-5 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-700/70 bg-zinc-800/60 text-violet-300">
                      <BookOpen size={16} />
                    </span>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10.5px] font-medium capitalize ${
                        DIFFICULTY_TONE[module.difficulty]
                      }`}
                    >
                      {module.difficulty}
                    </span>
                  </div>

                  <h3 className="mt-4 text-[15px] font-semibold leading-snug text-zinc-100">{module.title}</h3>
                  <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-zinc-400">{module.summary}</p>

                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-4 text-[11px] tabular-nums text-zinc-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} />
                      {module.estimatedMinutes} min
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <HelpCircle size={11} />
                      {module.quiz.length} quiz
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FlaskConical size={11} />
                      {module.flashcards.length} cards
                    </span>
                    {module.interactiveVisual !== "none" && (
                      <span className="inline-flex items-center gap-1 text-sky-400">
                        <Sparkles size={11} />
                        {VISUAL_LABELS[module.interactiveVisual] ?? "Interactive"}
                      </span>
                    )}
                  </div>
                </button>
              </GlowCard>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {modules.length === 0 && (
          <p className="mt-12 text-center text-[13px] text-zinc-500">
            No modules match your search. Try “caching”, “raft”, or “partitioning”.
          </p>
        )}
      </section>

      <VisualAlmanac
        open={activeModuleId !== null}
        initialModuleId={activeModuleId ?? undefined}
        onClose={() => setActiveModuleId(null)}
      />
    </div>
  );
}

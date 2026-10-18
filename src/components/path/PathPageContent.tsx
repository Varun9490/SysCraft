'use client';

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  FlaskConical,
  Layers,
  PlayCircle,
} from "@/components/ui/icons";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { Markdown } from "@/components/Markdown";
import { ENCYCLOPEDIA_MAP } from "@/data/encyclopediaData";
import { GUIDED_LABS } from "@/data/guidedLabs";
import { labCleanTitle } from "@/data/labMeta";
import { PATH_PARTS, TOTAL_LESSONS, TOTAL_MODULES } from "@/data/pathData";
import { useLearningStore } from "@/store/useLearningStore";

function useLabIndex() {
  const byId = new Map(GUIDED_LABS.map((lab) => [lab.id, lab]));
  return byId;
}

export function PathPageContent() {
  const [openModule, setOpenModule] = useState<string | null>("what-is-system-design");
  const labProgress = useLearningStore((s) => s.labProgress);
  const labsById = useLabIndex();

  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
        <div className="line-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_0%,black,transparent)]" />
      </div>

      <section className="section-container relative pb-12 pt-16 md:pt-24">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <AnimatedSection className="lg:col-span-7">
            <span className="eyebrow">Structured curriculum</span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tighter text-content md:text-5xl">
              The learning path
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-content-secondary">
              {TOTAL_MODULES} modules and {TOTAL_LESSONS} lessons, from a single server to distributed systems — in the
              order a growing application actually needs them. Read an idea, then build it on the canvas.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.12} className="flex flex-wrap items-center gap-2 lg:col-span-5 lg:justify-end">
            {PATH_PARTS.map((part) => (
              <a
                key={part.id}
                href={`#${part.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-app/60 px-4 py-2 text-[13px] font-medium text-content-secondary transition-colors hover:border-brass/40 hover:text-content"
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: part.accentHex }} />
                {part.title}
                <span className="text-content-tertiary">{part.modules.length}</span>
              </a>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {PATH_PARTS.map((part, partIndex) => (
        <section key={part.id} id={part.id} className="section-container scroll-mt-24 pb-16 pt-10">
          <AnimatedSection className="flex flex-col gap-4 border-b border-zinc-800/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: part.accentHex }}>
                Part {partIndex + 1}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">{part.title}</h2>
              <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-zinc-400">{part.subtitle}</p>
            </div>
            <p className="shrink-0 text-[12px] uppercase tracking-[0.14em] text-zinc-500">
              {part.modules.length} modules ·{" "}
              {part.modules.reduce((sum, m) => sum + m.lessonTitles.length, 0)} lessons
            </p>
          </AnimatedSection>

          <div className="mt-6 flex flex-col gap-3">
            {part.modules.map((module, moduleIndex) => {
              const expanded = openModule === module.id;
              const practiceLabs = (module.practiceLabIds ?? [])
                .map((id) => labsById.get(id))
                .filter((lab): lab is (typeof GUIDED_LABS)[number] => Boolean(lab));
              const article = module.encyclopediaId ? ENCYCLOPEDIA_MAP[module.encyclopediaId] : undefined;

              return (
                <AnimatedSection key={module.id} delay={Math.min(moduleIndex * 0.04, 0.2)}>
                  <div
                    className={`overflow-hidden rounded-2xl border transition-colors ${
                      expanded ? "border-zinc-700 bg-zinc-900/50" : "border-zinc-800/80 bg-zinc-900/25 hover:border-zinc-700"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenModule(expanded ? null : module.id)}
                      className="flex w-full items-center gap-4 px-5 py-4 text-left"
                      aria-expanded={expanded}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[13px] font-semibold tabular-nums"
                        style={{
                          borderColor: `${part.accentHex}44`,
                          backgroundColor: `${part.accentHex}12`,
                          color: part.accentHex,
                        }}
                      >
                        {module.number}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-[15px] font-medium text-zinc-100">{module.title}</span>
                          <span className="inline-flex items-center gap-1 text-[11px] tabular-nums text-zinc-500">
                            <Layers size={11} />
                            {module.lessonTitles.length} lessons
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-[13px] text-zinc-500">{module.description}</span>
                      </span>
                      <motion.span
                        animate={{ rotate: expanded ? 180 : 0 }}
                        transition={{ duration: 0.22 }}
                        className="shrink-0 text-zinc-500"
                      >
                        <ChevronDown size={17} />
                      </motion.span>
                    </button>

                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-zinc-800/70 px-5 py-5">
                            <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                    {article ? `Deep dive · ${article.estimatedMinutes} min read` : "Lessons"}
                                  </p>
                                  {article && (
                                    <Link
                                      href={`/wiki/${article.id}`}
                                      className="inline-flex items-center gap-1.5 text-[12px] font-medium text-brass transition-colors hover:text-brass-bright"
                                    >
                                      <BookOpen size={13} />
                                      Full module &amp; visualizer
                                      <ArrowRight size={12} />
                                    </Link>
                                  )}
                                </div>

                                {article ? (
                                  <div className="mt-3 rounded-xl border border-zinc-800/70 bg-zinc-950/60 px-4 py-3">
                                    <Markdown source={article.bodyMarkdown} />
                                  </div>
                                ) : (
                                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {module.lessonTitles.map((lesson, lessonIndex) => (
                                      <li key={lesson} className="flex items-start gap-2.5 text-[13px] text-zinc-300">
                                        <span
                                          className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] tabular-nums"
                                          style={{ borderColor: `${part.accentHex}55`, color: part.accentHex }}
                                        >
                                          {lessonIndex + 1}
                                        </span>
                                        {lesson}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              <div className="flex flex-col gap-4">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                    Lesson plan
                                  </p>
                                  <ul className="mt-3 flex flex-col gap-1.5">
                                    {module.lessonTitles.map((lesson, lessonIndex) => (
                                      <li key={lesson} className="flex items-start gap-2.5 text-[12.5px] text-zinc-400">
                                        <span
                                          className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] tabular-nums"
                                          style={{ borderColor: `${part.accentHex}55`, color: part.accentHex }}
                                        >
                                          {lessonIndex + 1}
                                        </span>
                                        {lesson}
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {practiceLabs.length > 0 && (
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                      Practice on canvas
                                    </p>
                                    <div className="mt-3 flex flex-col gap-2">
                                      {practiceLabs.map((lab) => {
                                        const progress = labProgress[lab.id];
                                        const completed = Boolean(progress && progress.bestScore > 0);
                                        return (
                                          <Link
                                            key={lab.id}
                                            href={`/labs/${lab.id}`}
                                            className="group inline-flex items-center gap-2.5 rounded-xl border border-zinc-700/80 bg-zinc-900/70 px-4 py-2.5 text-[13px] text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800/70"
                                          >
                                            {completed ? (
                                              <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                                            ) : (
                                              <FlaskConical size={14} className="shrink-0 text-amber-300" />
                                            )}
                                            <span className="min-w-0 flex-1 truncate">{labCleanTitle(lab)}</span>
                                            {completed && (
                                              <span className="text-[11px] tabular-nums text-emerald-400">
                                                {progress.bestScore}/100
                                              </span>
                                            )}
                                            <ArrowRight
                                              size={13}
                                              className="shrink-0 text-zinc-500 transition-transform group-hover:translate-x-0.5"
                                            />
                                          </Link>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </section>
      ))}

      <section className="section-container pb-24 pt-6">
        <AnimatedSection className="relative overflow-hidden rounded-3xl border border-line/70 bg-app-raised/40 px-6 py-14 md:px-14">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="line-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_70%_90%_at_20%_0%,black,transparent)]" />
          </div>
          <div className="relative grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <span className="eyebrow">Keep going</span>
              <h2 className="mt-5 text-3xl font-semibold leading-[1.1] tracking-tighter text-content md:text-4xl">
                Reading is step one.
                <br />
                Building is step two.
              </h2>
              <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-content-secondary">
                Every module connects to a canvas exercise or a graded lab. Start at module one, or jump straight into a
                system you use every day.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:col-span-5 lg:flex-col lg:items-stretch">
              <Link
                href="/labs"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-brass px-6 py-3 text-sm font-semibold text-ink transition-transform hover:scale-[1.02] active:translate-y-px"
              >
                <PlayCircle size={15} weight="bold" />
                Browse the labs
              </Link>
              <Link
                href="/canvas"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-app/70 px-6 py-3 text-sm font-medium text-content transition-colors hover:border-brass/40 hover:bg-app"
              >
                Open a blank canvas
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </AnimatedSection>
      </section>
    </div>
  );
}

'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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
import { Collapsible } from "@/components/ui/Collapsible";
import { Markdown } from "@/components/Markdown";
import { ENCYCLOPEDIA_MAP } from "@/data/encyclopediaData";
import { GUIDED_LABS } from "@/data/guidedLabs";
import { labCleanTitle } from "@/data/labMeta";
import { PATH_PARTS, TOTAL_LESSONS, TOTAL_MODULES } from "@/data/pathData";
import { getLessonBlog } from "@/data/lessonBlogs";
import { getLessonRoute, LESSON_ROUTES } from "@/lib/lessonRoutes";
import { LessonBlogViewer } from "@/components/path/LessonBlogViewer";
import { useLearningStore } from "@/store/useLearningStore";

function useLabIndex() {
  const byId = new Map(GUIDED_LABS.map((lab) => [lab.id, lab]));
  return byId;
}

export function PathPageContent() {
  const [openModule, setOpenModule] = useState<string | null>("what-is-system-design");
  const [selectedLessonByModule, setSelectedLessonByModule] = useState<Record<string, number>>({});
  const [viewModeByModule, setViewModeByModule] = useState<Record<string, "blog" | "summary">>({});
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const labProgress = useLearningStore((s) => s.labProgress);
  const labsById = useLabIndex();

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return LESSON_ROUTES.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.moduleTitle.toLowerCase().includes(q) ||
        r.partTitle.toLowerCase().includes(q),
    ).slice(0, 40);
  }, [query]);

  // Hydrate completed lessons from localStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("syscraft.completedLessons.v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCompletedLessons(new Set(parsed.filter((x): x is string => typeof x === "string")));
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persistCompleted = (next: Set<string>) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("syscraft.completedLessons.v1", JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  };

  const toggleComplete = (id: string) => {
    const next = new Set(completedLessons);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persistCompleted(next);
    setCompletedLessons(next);
  };

  const markComplete = (id: string) => {
    if (completedLessons.has(id)) return;
    const next = new Set(completedLessons);
    next.add(id);
    persistCompleted(next);
    setCompletedLessons(next);
  };

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
              A beginner-friendly curriculum: open any module below, click any lesson, and read its Scratch-to-Advanced
              blog, watch the animated request flow, and try the live sandbox. Then build it on the canvas.
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

      <section className="section-container pb-6">
        <label className="block">
          <span className="sr-only">Search lessons</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${TOTAL_LESSONS} lessons — try “consistent hashing”, “rate limiter”, “Kafka”…`}
            className="w-full rounded-xl border border-line bg-app/70 px-4 py-3 text-[14px] text-content placeholder:text-content-tertiary focus:border-brass/50 focus:outline-none"
          />
        </label>
        {query.trim().length >= 2 && (
          <div className="mt-4">
            <p className="text-[12px] text-content-tertiary">
              {searchResults.length} result{searchResults.length === 1 ? "" : "s"}
            </p>
            <ul className="mt-3 divide-y divide-line/60 overflow-hidden rounded-xl border border-line bg-app/50">
              {searchResults.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-app">
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] text-content">{r.title}</span>
                      <span className="mt-0.5 block text-[11px] text-content-tertiary">
                        {r.partTitle} · {r.moduleTitle} · Lesson {r.lessonNumber}
                      </span>
                    </span>
                    <ArrowRight size={14} className="mt-1 shrink-0 text-content-tertiary" />
                  </Link>
                </li>
              ))}
              {searchResults.length === 0 && (
                <li className="px-4 py-6 text-center text-[13px] text-content-tertiary">
                  No lessons match “{query.trim()}”. Try a broader term.
                </li>
              )}
            </ul>
          </div>
        )}
      </section>

      {query.trim().length < 2 && PATH_PARTS.map((part, partIndex) => (
        <section key={part.id} id={part.id} className="section-container scroll-mt-24 pb-16 pt-10">
          <AnimatedSection className="flex flex-col gap-4 border-b border-zinc-800/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: part.accentHex }}>
                Part {partIndex}
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

                    <Collapsible open={expanded} durationMs={300}>
                        <div className="border-t border-zinc-800/70 px-5 py-5">
                            <div className="mb-4 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setViewModeByModule((prev) => ({ ...prev, [module.id]: "blog" }))}
                                className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                                  (viewModeByModule[module.id] ?? "blog") === "blog"
                                    ? "border-brass/50 bg-brass/15 text-brass"
                                    : "border-line bg-app/60 text-content-secondary hover:border-line-strong hover:text-content"
                                }`}
                              >
                                Read lesson blog
                              </button>
                              {article && (
                                <button
                                  type="button"
                                  onClick={() => setViewModeByModule((prev) => ({ ...prev, [module.id]: "summary" }))}
                                  className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                                    viewModeByModule[module.id] === "summary"
                                      ? "border-brass/50 bg-brass/15 text-brass"
                                      : "border-line bg-app/60 text-content-secondary hover:border-line-strong hover:text-content"
                                  }`}
                                >
                                  Module summary wiki
                                </button>
                              )}
                            </div>

                            <div className="mb-5 flex flex-col gap-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                Lessons - click any to read its blog
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {module.lessonTitles.map((lesson, lessonIndex) => {
                                  const blog = getLessonBlog(module.id, lessonIndex);
                                  const selected = (selectedLessonByModule[module.id] ?? 0) === lessonIndex;
                                  const done = completedLessons.has(blog.id);
                                  const lessonRoute = getLessonRoute(module.id, lessonIndex);
                                  return (
                                    <div
                                      key={lesson}
                                      className={`flex items-start gap-1 rounded-xl border text-left text-[12.5px] transition-colors ${
                                        selected
                                          ? "border-brass/50 bg-brass/10 text-content"
                                          : "border-line bg-app/60 text-content-secondary hover:border-line-strong hover:text-content"
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => setSelectedLessonByModule((prev) => ({ ...prev, [module.id]: lessonIndex }))}
                                        className="flex min-w-0 flex-1 items-start gap-2.5 px-3 py-2.5 text-left"
                                      >
                                        <span
                                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] tabular-nums ${
                                            done ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300" : ""
                                          }`}
                                          style={done ? undefined : { borderColor: `${part.accentHex}55`, color: part.accentHex }}
                                        >
                                          {done ? "\u2713" : lessonIndex + 1}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                          <span className="block leading-snug">{lesson}</span>
                                          <span className="mt-0.5 block text-[10.5px] text-content-tertiary">
                                            {blog.readMinutes} min read - read blog and try sandbox
                                          </span>
                                        </span>
                                      </button>
                                      {lessonRoute && (
                                        <Link
                                          href={lessonRoute.href}
                                          aria-label={`Open ${lesson} as a full page`}
                                          className="mt-2 mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-content-tertiary transition-colors hover:bg-app hover:text-content"
                                        >
                                          <ArrowRight size={13} />
                                        </Link>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {(viewModeByModule[module.id] ?? "blog") === "blog" ? (
                              <LessonBlogViewer
                                blog={getLessonBlog(module.id, selectedLessonByModule[module.id] ?? 0)}
                                onPrev={() =>
                                  setSelectedLessonByModule((prev) => ({
                                    ...prev,
                                    [module.id]: Math.max(0, (prev[module.id] ?? 0) - 1),
                                  }))
                                }
                                onNext={() =>
                                  setSelectedLessonByModule((prev) => ({
                                    ...prev,
                                    [module.id]: Math.min(
                                      module.lessonTitles.length - 1,
                                      (prev[module.id] ?? 0) + 1,
                                    ),
                                  }))
                                }
                                hasPrev={(selectedLessonByModule[module.id] ?? 0) > 0}
                                hasNext={(selectedLessonByModule[module.id] ?? 0) < module.lessonTitles.length - 1}
                                completed={completedLessons.has(
                                  getLessonBlog(module.id, selectedLessonByModule[module.id] ?? 0).id,
                                )}
                                onToggleComplete={() =>
                                  toggleComplete(getLessonBlog(module.id, selectedLessonByModule[module.id] ?? 0).id)
                                }
                                onMarkComplete={() =>
                                  markComplete(getLessonBlog(module.id, selectedLessonByModule[module.id] ?? 0).id)
                                }
                              />
                            ) : (
                              <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/60 px-4 py-3">
                                {article && <Markdown source={article.bodyMarkdown} />}
                                <div className="mt-4">
                                  <Link
                                    href={`/wiki/${article?.id}`}
                                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-brass transition-colors hover:text-brass-bright"
                                  >
                                    <BookOpen size={13} />
                                    Full module and visualizer
                                    <ArrowRight size={12} />
                                  </Link>
                                </div>
                              </div>
                            )}

                            {practiceLabs.length > 0 && (
                              <div className="mt-6">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                  Practice on canvas
                                </p>
                                <div className="mt-3 flex flex-col gap-2">
                                  {practiceLabs.map((lab) => {
                                    const progress = labProgress[lab.id];
                                    const done = Boolean(progress && progress.bestScore > 0);
                                    return (
                                      <Link
                                        key={lab.id}
                                        href={`/labs/${lab.id}`}
                                        className="group inline-flex items-center gap-2.5 rounded-xl border border-zinc-700/80 bg-zinc-900/70 px-4 py-2.5 text-[13px] text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800/70"
                                      >
                                        {done ? (
                                          <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                                        ) : (
                                          <FlaskConical size={14} className="shrink-0 text-amber-300" />
                                        )}
                                        <span className="min-w-0 flex-1 truncate">{labCleanTitle(lab)}</span>
                                        {done && (
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
                    </Collapsible>
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

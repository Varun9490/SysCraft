'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PATH_PARTS } from "@/data/pathData";
import { ENCYCLOPEDIA_MAP } from "@/data/encyclopediaData";
import { GUIDED_LABS } from "@/data/guidedLabs";
import { labCleanTitle } from "@/data/labMeta";
import { getLessonBlog } from "@/data/lessonBlogs";
import { LessonBlogViewer } from "@/components/path/LessonBlogViewer";
import { useLearningStore } from "@/store/useLearningStore";

function useLabIndex() {
  const byId = new Map(GUIDED_LABS.map((lab) => [lab.id, lab]));
  return byId;
}

function shortLine(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 100) return trimmed;
  return trimmed.slice(0, 97).trimEnd() + "…";
}

export function PathPageContent() {
  const [openModule, setOpenModule] = useState<string | null>("what-is-system-design");
  const [selectedLessonByModule, setSelectedLessonByModule] = useState<Record<string, number>>({});
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const labProgress = useLearningStore((s) => s.labProgress);
  const labsById = useLabIndex();

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
    setCompletedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persistCompleted(next);
      return next;
    });
  };

  const markComplete = (id: string) => {
    setCompletedLessons((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      persistCompleted(next);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-content md:text-4xl">
        The learning path
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-content-secondary">
        Start at the top. Each lesson is a short read, a picture of the request, and a slider you can try. Then open
        the canvas and build it.
      </p>

      <div className="mt-12 flex flex-col gap-10">
        {PATH_PARTS.map((part, partIndex) => (
          <section key={part.id} id={part.id} className="scroll-mt-24">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-content-tertiary">
              Part {partIndex + 1} · {part.title}
            </p>
            {part.subtitle && (
              <p className="mt-1 text-[13px] leading-relaxed text-content-tertiary">{part.subtitle}</p>
            )}

            <div className="mt-4 flex flex-col">
              {part.modules.map((module) => {
                const expanded = openModule === module.id;
                const article = module.encyclopediaId ? ENCYCLOPEDIA_MAP[module.encyclopediaId] : undefined;
                const practiceLabs = (module.practiceLabIds ?? [])
                  .map((id) => labsById.get(id))
                  .filter((lab): lab is (typeof GUIDED_LABS)[number] => Boolean(lab));
                const selectedLesson = selectedLessonByModule[module.id] ?? 0;

                return (
                  <div key={module.id} className="border-b border-line/60">
                    <button
                      type="button"
                      onClick={() => setOpenModule(expanded ? null : module.id)}
                      className="flex w-full items-baseline gap-4 py-4 text-left"
                      aria-expanded={expanded}
                    >
                      <span className="w-8 shrink-0 tabular-nums text-[13px] text-content-tertiary">
                        {String(module.number).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-medium text-content">{module.title}</span>
                        <span className="mt-1 block text-[13px] leading-relaxed text-content-secondary">
                          {module.description}
                        </span>
                      </span>
                      <span className="shrink-0 text-[12px] text-content-tertiary">
                        {expanded ? "−" : "+"}
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.2, ease: "linear" }}
                          className="overflow-hidden"
                        >
                          <div className="pb-6 pl-12">
                            <div className="flex flex-col">
                              {module.lessonTitles.map((lesson, lessonIndex) => {
                                const blog = getLessonBlog(module.id, lessonIndex);
                                const selected = selectedLesson === lessonIndex;
                                return (
                                  <button
                                    key={lesson}
                                    type="button"
                                    onClick={() =>
                                      setSelectedLessonByModule((prev) => ({ ...prev, [module.id]: lessonIndex }))
                                    }
                                    className={`flex w-full flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 text-left transition-colors ${
                                      selected ? "text-content" : "text-content-secondary hover:text-content"
                                    }`}
                                  >
                                    <span className="w-10 shrink-0 tabular-nums text-[12px] text-content-tertiary">
                                      {module.number}.{lessonIndex + 1}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-[14px] leading-snug">{lesson}</span>
                                      <span className="mt-0.5 block truncate text-[12px] text-content-tertiary">
                                        {shortLine(blog.rookieAnalogy)}
                                      </span>
                                    </span>
                                    <span className="w-full pl-[3.25rem] text-[12px] text-content-tertiary sm:w-auto sm:pl-0">
                                      Read · {blog.readMinutes}m
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-content-tertiary">
                              {article && (
                                <Link
                                  href={`/wiki/${article.id}`}
                                  className="transition-colors hover:text-content"
                                >
                                  Module wiki
                                </Link>
                              )}
                              {practiceLabs.map((lab) => {
                                const progress = labProgress[lab.id];
                                const done = Boolean(progress && progress.bestScore > 0);
                                return (
                                  <Link
                                    key={lab.id}
                                    href={`/labs/${lab.id}`}
                                    className="transition-colors hover:text-content"
                                  >
                                    {labCleanTitle(lab)}
                                    {done ? ` · ${progress.bestScore}/100` : ""}
                                  </Link>
                                );
                              })}
                            </div>

                            <div className="mt-6 max-w-3xl">
                              <LessonBlogViewer
                                blog={getLessonBlog(module.id, selectedLesson)}
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
                                hasPrev={selectedLesson > 0}
                                hasNext={selectedLesson < module.lessonTitles.length - 1}
                                completed={completedLessons.has(
                                  getLessonBlog(module.id, selectedLesson).id,
                                )}
                                onToggleComplete={() =>
                                  toggleComplete(getLessonBlog(module.id, selectedLesson).id)
                                }
                                onMarkComplete={() =>
                                  markComplete(getLessonBlog(module.id, selectedLesson).id)
                                }
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

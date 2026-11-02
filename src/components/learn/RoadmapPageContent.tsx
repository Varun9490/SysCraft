'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "@/components/ui/icons";
import { PATH_PARTS, TOTAL_LESSONS } from "@/data/pathData";
import { getLessonBlog } from "@/data/lessonBlogs";
import { getLessonRoute } from "@/lib/lessonRoutes";

const PROGRESS_KEY = "syscraft.completedLessons.v1";

function readCompleted(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

export function RoadmapPageContent() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCompleted(readCompleted());
    const onStorage = () => setCompleted(readCompleted());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const stats = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const part of PATH_PARTS) {
      for (const mod of part.modules) {
        mod.lessonTitles.forEach((_, i) => {
          total += 1;
          if (completed.has(getLessonBlog(mod.id, i).id)) done += 1;
        });
      }
    }
    return { total, done };
  }, [completed]);

  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Roadmap</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-content sm:text-4xl">
          The whole curriculum on one page
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-content-secondary">
          {PATH_PARTS.length} parts · {TOTAL_LESSONS} lessons. Follow it top to bottom, or jump to the problem you
          have today.
        </p>
      </header>

      <div className="mt-6 rounded-2xl border border-line bg-app/50 p-5">
        <div className="flex items-center justify-between text-[12px] text-content-secondary">
          <span>Your progress</span>
          <span className="tabular-nums">{stats.done} / {stats.total} lessons · {pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-app">
          <div className="h-full rounded-full bg-brass transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {PATH_PARTS.map((part, partIndex) => (
          <section key={part.id}>
            <div className="flex items-center gap-3">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold text-ink"
                style={{ backgroundColor: part.accentHex }}
              >
                {partIndex}
              </span>
              <div>
                <h2 className="text-[16px] font-semibold text-content">{part.title}</h2>
                <p className="text-[12px] text-content-tertiary">{part.subtitle}</p>
              </div>
            </div>

            <div className="relative mt-4 pl-10">
              <div className="absolute left-4 top-0 h-full w-px" style={{ backgroundColor: `${part.accentHex}44` }} aria-hidden="true" />
              <div className="grid gap-3 sm:grid-cols-2">
                {part.modules.map((mod) => {
                  const lessonRoutes = mod.lessonTitles.map((_, i) => getLessonRoute(mod.id, i)).filter(Boolean);
                  const doneCount = mod.lessonTitles.filter((_, i) => completed.has(getLessonBlog(mod.id, i).id)).length;
                  const modulePct = mod.lessonTitles.length > 0 ? Math.round((doneCount / mod.lessonTitles.length) * 100) : 0;
                  const first = lessonRoutes[0];
                  return (
                    <div key={mod.id} className="relative rounded-xl border border-line bg-app/50 p-4">
                      <div className="absolute -left-[26px] top-5 h-2.5 w-2.5 rounded-full border-2 border-app" style={{ backgroundColor: part.accentHex }} aria-hidden="true" />
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[13.5px] font-semibold text-content">{mod.title}</h3>
                        <span className="shrink-0 text-[11px] text-content-tertiary">{mod.lessonTitles.length} lessons</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-app">
                        <div className="h-full rounded-full" style={{ width: `${modulePct}%`, backgroundColor: part.accentHex }} />
                      </div>
                      {first && (
                        <Link href={first.href} className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-brass hover:text-brass-bright">
                          Start module <ArrowRight size={12} />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/learn" className="inline-flex items-center gap-1.5 rounded-full bg-brass px-4 py-2 text-[13px] font-semibold text-ink">
          Open the full curriculum <ArrowRight size={13} />
        </Link>
        <Link href="/case-studies" className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[13px] font-medium text-content">
          Browse case studies
        </Link>
      </div>
    </div>
  );
}

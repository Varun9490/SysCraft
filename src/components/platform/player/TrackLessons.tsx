'use client';

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, CheckCircle2, Clock, Layers } from "@/components/ui/icons";
import { AnimatedCounter } from "@/components/ui/interactive/AnimatedCounter";
import { ScrollReveal } from "@/components/ui/interactive/ScrollReveal";
import { BLOGS } from "@/content/platform/registry";
import { useLearnerPlatformStore } from "@/store/useLearnerPlatformStore";
import type { Track } from "@/learning/platform/types";

export function TrackLessons({ track }: { track: Track }) {
  const completedLessons = useLearnerPlatformStore((s) => s.completedLessons);
  const hydrate = useLearnerPlatformStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const completed = track.lessons.filter((lesson) => completedLessons.includes(lesson.id)).length;
  const minutes = track.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);
  const relatedBlogs = BLOGS.filter((blog) => blog.relatedLessonIds.some((id) => track.lessons.some((lesson) => lesson.id === id)));

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-12 sm:px-8">
      <nav className="flex flex-wrap items-center gap-2 text-[12px] text-content-tertiary" aria-label="Breadcrumb">
        <Link href="/paths" className="hover:text-content">Learning paths</Link>
        <span aria-hidden="true">/</span>
        <span>{track.title}</span>
      </nav>

      <header className="mt-6 max-w-3xl" data-cursor="read">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">{track.slug}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-content sm:text-4xl">{track.title}</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-content-secondary">{track.summary}</p>
        <div className="mt-5 flex flex-wrap items-center gap-4 text-[12px] text-content-tertiary">
          <span className="inline-flex items-center gap-1.5"><Layers size={13} /> {track.lessons.length} lessons</span>
          <span className="inline-flex items-center gap-1.5"><Clock size={13} /> {minutes} min</span>
          <span className="font-mono text-content-secondary"><AnimatedCounter to={completed} />/{track.lessons.length} complete</span>
        </div>
      </header>

      <ol className="mt-10 space-y-3">
        {track.lessons.map((lesson, index) => {
          const done = completedLessons.includes(lesson.id);
          return (
            <li key={lesson.id}>
              <ScrollReveal delay={Math.min(index, 8) * 0.045}>
                <Link
                  href={`/paths/${track.slug}/${lesson.slug}`}
                  className="group grid gap-4 rounded-2xl border border-line bg-app-raised p-5 shadow-card transition-colors hover:border-brass/40 sm:grid-cols-[auto_1fr_auto] sm:items-start"
                >
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-[12px] text-content-tertiary">{String(index + 1).padStart(2, "0")}</span>
                    <span
                      aria-hidden="true"
                      className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                        done ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300" : "border-line text-content-tertiary group-hover:border-brass/50"
                      }`}
                    >
                      {done ? <CheckCircle2 size={15} /> : <span className="text-[11px]">{index + 1}</span>}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-content group-hover:text-brass">{lesson.title}</span>
                    <span className="mt-1.5 block text-[13px] leading-relaxed text-content-secondary" data-cursor="read">
                      {lesson.storyHook}
                    </span>
                    <span className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-content-tertiary">
                      <span className="inline-flex items-center gap-1"><Clock size={12} /> {lesson.minutes} min</span>
                      {lesson.prerequisites.length > 0 ? (
                        <span>Prerequisites: {lesson.prerequisites.join(", ")}</span>
                      ) : (
                        <span>Starts from zero</span>
                      )}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-[12px] text-content-tertiary group-hover:text-brass">
                    {done ? <span className="text-emerald-300">Complete</span> : <span>Read lesson</span>}
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </ScrollReveal>
            </li>
          );
        })}
      </ol>

      {relatedBlogs.length > 0 ? (
        <section className="mt-14 border-t border-line pt-8" aria-labelledby="track-blogs">
          <h2 id="track-blogs" className="text-[15px] font-semibold text-content">Field notes for this track</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {relatedBlogs.map((blog) => (
              <li key={blog.id}>
                <Link href={`/blogs/${blog.slug}`} className="block rounded-xl border border-line bg-app px-4 py-3 transition-colors hover:border-brass/40">
                  <span className="block text-[13px] font-medium text-content">{blog.title}</span>
                  <span className="mt-1 block text-[12px] text-content-tertiary">{blog.minutes} min read</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-12 flex flex-wrap gap-4 text-[12px]">
        <Link href="/paths" className="text-content-secondary hover:text-brass">← All paths</Link>
        <Link href="/map" className="text-content-secondary hover:text-brass">See the knowledge map</Link>
        <Link href="/labs" className="text-content-secondary hover:text-brass">Run a lab</Link>
      </div>
    </main>
  );
}

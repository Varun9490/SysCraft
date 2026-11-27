'use client';

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, BookOpen, Clock } from "@/components/ui/icons";
import { AnimatedCounter } from "@/components/ui/interactive/AnimatedCounter";
import { ScrollReveal } from "@/components/ui/interactive/ScrollReveal";
import { TRACKS } from "@/content/platform/registry";
import { useLearnerPlatformStore } from "@/store/useLearnerPlatformStore";
import type { Track } from "@/learning/platform/types";

const ACCENT: Record<Track["accent"], { dot: string; text: string; ring: string }> = {
  emerald: { dot: "bg-emerald-400", text: "text-emerald-300", ring: "border-emerald-400/30" },
  amber: { dot: "bg-amber-400", text: "text-amber-300", ring: "border-amber-400/30" },
  rose: { dot: "bg-rose-400", text: "text-rose-300", ring: "border-rose-400/30" },
  indigo: { dot: "bg-indigo-400", text: "text-indigo-300", ring: "border-indigo-400/30" },
  cyan: { dot: "bg-cyan-400", text: "text-cyan-400", ring: "border-cyan-400/30" },
};

export function PathsIndex() {
  const completedLessons = useLearnerPlatformStore((s) => s.completedLessons);
  const hydrate = useLearnerPlatformStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <main className="mx-auto w-full max-w-7xl px-5 pb-24 pt-12 sm:px-8">
      <header className="max-w-3xl" data-cursor="read">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Seven guided tracks</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-content sm:text-4xl">Learning paths</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-content-secondary">
          Each track pairs a story with the engineering underneath it. Read at your own pace, then take the same idea to
          the canvas to run it under load. Everything is saved locally in this browser.
        </p>
      </header>

      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TRACKS.map((track, index) => {
          const completed = track.lessons.filter((lesson) => completedLessons.includes(lesson.id)).length;
          const total = track.lessons.length;
          const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
          const minutes = track.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);
          const accent = ACCENT[track.accent];

          return (
            <ScrollReveal key={track.id} delay={index * 0.04}>
              <Link
                href={`/paths/${track.slug}`}
                className={`group block h-full rounded-2xl border border-line bg-app-raised p-6 shadow-card transition-colors hover:border-brass/40 ${accent.ring}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-2 text-[12px] text-content-tertiary">
                    <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${accent.dot}`} />
                    <span className={accent.text}>{track.slug}</span>
                  </span>
                  <ArrowRight size={16} className="text-content-tertiary transition-transform group-hover:translate-x-1 group-hover:text-brass" />
                </div>
                <h2 className="mt-5 text-lg font-semibold text-content">{track.title}</h2>
                <p className="mt-2 min-h-[72px] text-[13px] leading-relaxed text-content-secondary" data-cursor="read">
                  {track.summary}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-4 text-[12px] text-content-tertiary">
                  <span className="inline-flex items-center gap-1.5"><BookOpen size={13} /> {total} lessons</span>
                  <span className="inline-flex items-center gap-1.5"><Clock size={13} /> {minutes} min</span>
                </div>
                <div className="mt-5">
                  <div className="flex items-center justify-between text-[11px] text-content-tertiary">
                    <span>Progress</span>
                    <span className="font-mono text-content-secondary">
                      {completed}/{total} · <AnimatedCounter to={percent} suffix="%" />
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                    <div className={`h-full rounded-full ${accent.dot}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              </Link>
            </ScrollReveal>
          );
        })}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-app-raised p-6 text-[13px] text-content-secondary" data-cursor="read">
        <p className="min-w-0 flex-1">
          Want to build instead of read? The canvas and challenge labs are always open when you want to move from reading to building.
        </p>
        <div className="flex gap-3">
          <Link href="/labs" className="rounded-xl border border-line px-4 py-2 text-content hover:border-brass/40">Browse labs</Link>
          <Link href="/canvas" className="rounded-xl bg-brass px-4 py-2 font-semibold text-ink hover:opacity-90">Open canvas</Link>
        </div>
      </div>
    </main>
  );
}

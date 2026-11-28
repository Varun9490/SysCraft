'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "@/components/ui/icons";
import {
  AnimatedCounter,
  ScrollReveal,
  TiltCard,
} from "@/components/ui/interactive";
import { useLearnerPlatformStore } from "@/store/useLearnerPlatformStore";

/**
 * Lesson totals are the curriculum constants, kept here so the progress strip
 * is deterministic and matches the server-rendered markup before hydration.
 */
const TRACK_CARDS = [
  {
    slug: "foundations",
    title: "Foundations",
    blurb: "One server, then the first cracks: queues, caches, and the latency budget.",
    lessons: 9,
  },
  {
    slug: "distributed",
    title: "Distributed systems",
    blurb: "Replication, consensus, partitions, and the cost of agreement.",
    lessons: 10,
  },
  {
    slug: "case-studies",
    title: "Case studies",
    blurb: "Familiar products rebuilt from constraints rather than diagrams.",
    lessons: 12,
  },
  {
    slug: "ai-engineering",
    title: "AI engineering",
    blurb: "Tokens, context, retrieval, and the boundaries an LLM cannot cross.",
    lessons: 6,
  },
  {
    slug: "llm-inference",
    title: "LLM inference",
    blurb: "Batching, KV cache, admission control, and the shape of a token bill.",
    lessons: 6,
  },
  {
    slug: "ml-math",
    title: "ML math",
    blurb: "The notation, vectors, and probability behind the model cards.",
    lessons: 5,
  },
  {
    slug: "backend-cloud",
    title: "Backend & cloud",
    blurb: "Deployment shapes, clusters, queues, and operational guardrails.",
    lessons: 5,
  },
] as const;

const EASE = [0.22, 1, 0.36, 1] as const;

/** Small topology marks: a quiet visual accent, never a fake metric. */
function TrackGlyph({ index }: { index: number }) {
  const paths = [
    "M 2 14 H 12 V 5 H 26",
    "M 2 14 H 10 M 10 6 H 26 M 10 22 H 26",
    "M 2 20 L 10 6 L 18 20 L 26 6",
    "M 2 14 C 9 4 15 24 26 14",
    "M 2 8 H 26 M 2 20 H 18",
    "M 2 22 L 8 6 L 14 22 L 20 6 L 26 22",
    "M 2 14 H 9 V 6 H 18 V 22 H 26",
  ];
  return (
    <svg viewBox="0 0 28 28" className="h-7 w-7 shrink-0" aria-hidden="true" fill="none">
      <path
        d={paths[index % paths.length]}
        stroke="rgb(var(--accent) / 0.5)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="26" cy={index % 2 === 0 ? 14 : 6} r="1.6" fill="rgb(var(--accent-bright) / 0.7)" />
    </svg>
  );
}

export function TrackShowcase() {
  const hydrate = useLearnerPlatformStore((state) => state.hydrate);
  const hydrated = useLearnerPlatformStore((state) => state.hydrated);
  const completedLessons = useLearnerPlatformStore((state) => state.completedLessons);
  // The loaded counts are keyed by the completed-lesson list they describe;
  // stale results are ignored during render rather than reset in an effect.
  const [loadedCounts, setLoadedCounts] = useState<{ key: string; counts: Record<string, number> } | null>(null);
  const progressKey = completedLessons.join("\u0000");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated || completedLessons.length === 0) return;
    const key = completedLessons.join("\u0000");
    let cancelled = false;
    // The full curriculum registry stays out of the landing bundle until a
    // learner actually has completed lessons to resolve.
    void import("@/content/platform/registry")
      .then(({ getLessonById }) => {
        if (cancelled) return;
        const counts: Record<string, number> = {};
        for (const lessonId of completedLessons) {
          const lesson = getLessonById(lessonId);
          if (!lesson) continue;
          counts[lesson.trackId] = (counts[lesson.trackId] ?? 0) + 1;
        }
        setLoadedCounts({ key, counts });
      })
      .catch(() => {
        if (!cancelled) setLoadedCounts({ key, counts: {} });
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, completedLessons]);

  const completedByTrack = loadedCounts?.key === progressKey ? loadedCounts.counts : null;

  return (
    <section className="section-container py-20 md:py-24">
      <ScrollReveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-brass">
              <span className="h-px w-6 bg-brass/70" aria-hidden="true" />
              Seven tracks
            </span>
            <h2 className="mt-4 max-w-2xl text-balance text-3xl font-medium tracking-tight text-content md:text-4xl">
              A path through the ideas, in the order you will need them.
            </h2>
          </div>
          <Link
            href="/paths"
            className="group inline-flex items-center gap-2 text-[13px] font-medium text-content-secondary transition-colors hover:text-brass"
          >
            All paths
            <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </ScrollReveal>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TRACK_CARDS.map((track, index) => {
          const done = Math.min(track.lessons, completedByTrack?.[track.slug] ?? 0);
          const percent = Math.round((done / track.lessons) * 100);
          // The last track closes the row as a full-width band instead of
          // leaving two empty cells in a three-column grid.
          const wide = index === TRACK_CARDS.length - 1;
          return (
            <ScrollReveal
              key={track.slug}
              delay={index * 0.055}
              y={20}
              blur={4}
              className={wide ? "lg:col-span-3" : undefined}
            >
              <TiltCard className="h-full" intensity={4}>
                <Link
                  href={`/paths/${track.slug}`}
                  className={`group relative flex h-full min-h-[196px] flex-col overflow-hidden rounded-2xl border border-line/70 bg-ink p-6 transition-colors hover:bg-app/60 ${
                    wide ? "lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-6 lg:py-5" : ""
                  }`}
                >
                  {/* Moving brass border sweep, activated on hover. */}
                  <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100">
                    <span className="absolute left-1/2 top-1/2 h-[190%] w-[190%] -translate-x-1/2 -translate-y-1/2 animate-[spin_7s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,rgb(var(--accent)/0.35)_50deg,transparent_110deg,transparent_200deg,rgb(var(--accent-bright)/0.28)_250deg,transparent_320deg)]" />
                  </span>
                  <span aria-hidden="true" className="pointer-events-none absolute inset-px rounded-[15px] bg-ink transition-colors group-hover:bg-app/85" />

                  <div className={`relative z-10 flex items-center justify-between gap-3 ${wide ? "lg:col-span-3" : ""}`}>
                    <span className="font-mono text-[11px] tabular-nums text-content-tertiary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex items-center gap-3">
                      <TrackGlyph index={index} />
                      <span className="font-mono text-[11px] tabular-nums text-content-tertiary">
                        {track.lessons} lessons
                      </span>
                    </div>
                  </div>

                  <h3 className={`relative z-10 mt-5 text-[16px] font-medium tracking-tight text-content ${wide ? "lg:col-span-2 lg:mt-0" : ""}`}>
                    {track.title}
                  </h3>
                  <p className={`relative z-10 mt-2 max-w-xs text-[13px] leading-relaxed text-content-secondary ${wide ? "lg:col-span-4 lg:mt-0 lg:max-w-none" : ""}`}>
                    {track.blurb}
                  </p>

                  <div className={`relative z-10 mt-auto pt-6 ${wide ? "lg:col-span-3 lg:mt-0 lg:pt-0" : ""}`}>
                    <div className="h-[3px] w-full overflow-hidden rounded-full bg-line/70" aria-hidden="true">
                      <motion.div
                        className="h-full rounded-full bg-brass"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${percent}%` }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{ duration: 0.9, delay: index * 0.03, ease: EASE }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-content-tertiary">
                      <AnimatedCounter to={percent} suffix="% complete" className="text-content-tertiary" />
                      <span className="text-brass opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        Open →
                      </span>
                    </div>
                  </div>
                </Link>
              </TiltCard>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}

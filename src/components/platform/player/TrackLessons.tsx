'use client';

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { ArrowRight, CheckCircle2, Clock, Layers } from "@/components/ui/icons";
import { AnimatedCounter } from "@/components/ui/interactive/AnimatedCounter";
import { ScrollReveal } from "@/components/ui/interactive/ScrollReveal";
import { useLearnerPlatformStore } from "@/store/useLearnerPlatformStore";

/**
 * Only the fields this screen reads from a track. Callers may pass the full
 * registry Track today, but the component never depends on step bodies,
 * security practices, or quiz banks, and a summary DTO satisfies the same
 * contract. Keeping the prop narrow stops the client from needing those
 * content modules just to render a list of links.
 */
type LessonCard = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly storyHook: string;
  readonly minutes: number;
  readonly prerequisites: readonly string[];
};

type TrackSummary = {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly lessons: readonly LessonCard[];
};

/**
 * View-only catalog of blog cards. `src/content/platform/registry.ts` stays the
 * source of truth for blog bodies; this projection exists so a track page does
 * not load every post's steps and quiz bank to find three related links.
 * Keep these cards in sync with the registry when blog metadata changes.
 */
type BlogCard = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly minutes: number;
  readonly relatedLessonIds: readonly string[];
};

const BLOG_CARDS: readonly BlogCard[] = [
  {
    id: "database-melts-at-10k-rps",
    slug: "database-melts-at-10k-rps",
    title: "Why Your Database Melts at 10,000 RPS (And How to Fix It)",
    minutes: 11,
    relatedLessonIds: [
      "single-server",
      "load-balancing",
      "caching-eviction",
      "sql-modeling",
      "scaling-databases",
      "observability-slos",
    ],
  },
  {
    id: "discord-trillions-of-messages",
    slug: "discord-trillions-of-messages",
    title: "How Discord Stores Trillions of Messages",
    minutes: 13,
    relatedLessonIds: [
      "chat-system",
      "kafka-streaming",
      "scaling-databases",
      "replication-consistency",
      "caching-eviction",
      "observability-slos",
    ],
  },
  {
    id: "securing-agents-against-indirect-injection",
    slug: "securing-agents-against-indirect-injection",
    title: "Securing AI Agents Against Indirect Prompt Injection",
    minutes: 12,
    relatedLessonIds: [
      "ai-security",
      "embeddings-rag",
      "agent-loop",
      "evals-guardrails",
      "observability-slos",
    ],
  },
  {
    id: "what-happens-during-token-generation",
    slug: "what-happens-during-token-generation",
    title: "What Actually Happens During an LLM Token Generation",
    minutes: 10,
    relatedLessonIds: [
      "kv-cache-paged-attention",
      "tokenization",
      "agent-loop",
      "transformer-bottlenecks",
      "observability-slos",
    ],
  },
  {
    id: "zero-downtime-schema-migrations",
    slug: "zero-downtime-schema-migrations",
    title: "Zero-Downtime Schema Migrations Explained Visually",
    minutes: 12,
    relatedLessonIds: [
      "sql-modeling",
      "safe-deployments",
      "distributed-transactions",
      "replication-consistency",
      "scaling-databases",
      "observability-slos",
    ],
  },
  {
    id: "consistent-hashing-in-production",
    slug: "consistent-hashing-in-production",
    title: "Consistent Hashing in Production",
    minutes: 10,
    relatedLessonIds: [
      "scaling-databases",
      "consistent-hashing",
      "caching-eviction",
      "replication-consistency",
      "load-balancing",
      "observability-slos",
    ],
  },
  {
    id: "kafka-consumer-lag",
    slug: "kafka-consumer-lag",
    title: "The Anatomy of Kafka Consumer Lag",
    minutes: 11,
    relatedLessonIds: [
      "kafka-streaming",
      "queues-jobs",
      "scaling-databases",
      "observability-slos",
      "load-balancing",
    ],
  },
  {
    id: "error-budgets-that-engineers-trust",
    slug: "error-budgets-that-engineers-trust",
    title: "Error Budgets Engineers Actually Trust",
    minutes: 9,
    relatedLessonIds: [
      "observability-slos",
      "safe-deployments",
      "load-balancing",
      "replication-consistency",
      "metrics-alerting",
    ],
  },
];

export function TrackLessons({ track }: { track: TrackSummary }) {
  const completedLessons = useLearnerPlatformStore((s) => s.completedLessons);
  const hydrate = useLearnerPlatformStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const { completed, minutes, relatedBlogs } = useMemo(() => {
    const lessonIds = new Set(track.lessons.map((lesson) => lesson.id));
    const done = track.lessons.filter((lesson) => completedLessons.includes(lesson.id)).length;
    const totalMinutes = track.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);
    const related = BLOG_CARDS.filter((blog) => blog.relatedLessonIds.some((id) => lessonIds.has(id)));
    return { completed: done, minutes: totalMinutes, relatedBlogs: related };
  }, [track.lessons, completedLessons]);

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

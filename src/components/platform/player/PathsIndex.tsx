'use client';

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { ArrowRight, BookOpen, Clock } from "@/components/ui/icons";
import { AnimatedCounter } from "@/components/ui/interactive/AnimatedCounter";
import { ScrollReveal } from "@/components/ui/interactive/ScrollReveal";
import { useLearnerPlatformStore } from "@/store/useLearnerPlatformStore";
import type { Track } from "@/learning/platform/types";

/**
 * View-only catalog for the paths index.
 *
 * `src/content/platform/registry.ts` remains the source of truth for all
 * curriculum content. This is a deliberately tiny projection of exactly the
 * fields this screen renders, so the index route no longer bundles every
 * lesson step, security practice, and quiz question just to show seven cards.
 * Keep the projection in sync when track metadata or lesson durations change.
 */
type IndexTrack = {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly accent: Track["accent"];
  readonly lessonIds: readonly string[];
  /** Sum of the track's lesson durations. */
  readonly minutes: number;
};

const PATH_CATALOG: readonly IndexTrack[] = [
  {
    slug: "foundations",
    title: "System Design Foundations",
    summary:
      "Build a reliable service from one machine to a coordinated system. These lessons connect requests, data, caches, queues, and live connections to the capacity limits and failure modes that appear as traffic grows.",
    accent: "emerald",
    lessonIds: [
      "single-server",
      "networking-protocols",
      "load-balancing",
      "caching-eviction",
      "sql-modeling",
      "scaling-databases",
      "rate-limiting",
      "queues-jobs",
      "realtime",
    ],
    minutes: 98,
  },
  {
    slug: "distributed",
    title: "Distributed Systems and Storage Internals",
    summary:
      "Learn how independent machines agree on data, distribute load, recover from failure, and preserve useful guarantees under delay. The track connects replication and consensus to sharding, storage engines, event streams, transactions, sketches, and operational measurement.",
    accent: "indigo",
    lessonIds: [
      "replication-consistency",
      "sharding-hot-keys",
      "consistent-hashing",
      "raft-consensus",
      "locks-circuit-breakers",
      "storage-engines",
      "kafka-streaming",
      "distributed-transactions",
      "probabilistic-sketches",
      "observability-slos",
    ],
    minutes: 119,
  },
  {
    slug: "case-studies",
    title: "Real-World HLD and LLD Case Studies",
    summary:
      "Twelve production-shaped design walkthroughs that move from capacity assumptions to concrete mechanisms, operational trade-offs, and defensive threat hardening.",
    accent: "amber",
    lessonIds: [
      "url-shortener",
      "chat-system",
      "video-streaming",
      "news-feed",
      "ride-hailing",
      "search-engine",
      "metrics-alerting",
      "lld-lru-cache",
      "lld-rate-limiter",
      "lld-pubsub",
      "lld-parking-lot",
      "lld-elevator",
    ],
    minutes: 173,
  },
  {
    slug: "ai-engineering",
    title: "AI Engineering",
    summary:
      "Build reliable model-powered products by budgeting context, grounding answers, controlling agent tools, and evaluating security behavior before release.",
    accent: "cyan",
    lessonIds: [
      "tokenization",
      "embeddings-rag",
      "agent-loop",
      "memory-architectures",
      "evals-guardrails",
      "ai-security",
    ],
    minutes: 72,
  },
  {
    slug: "llm-inference",
    title: "LLM Inference Engineering and Training Systems",
    summary:
      "Reason about transformer memory, KV-cache growth, prefill and decode behavior, quantization, serving budgets, and the training stages behind a model.",
    accent: "rose",
    lessonIds: [
      "transformer-bottlenecks",
      "kv-cache-paged-attention",
      "prefill-decode-batching",
      "quantization",
      "latency-cost-budgets",
      "pretraining-posttraining",
    ],
    minutes: 74,
  },
  {
    slug: "ml-math",
    title: "ML Mathematics and the Paper Decoder",
    summary:
      "Build geometric, probabilistic, optimization, and attention intuition, then learn to unpack unfamiliar paper equations one symbol at a time.",
    accent: "indigo",
    lessonIds: [
      "linear-algebra",
      "probability-information",
      "backprop-optimizers",
      "attention-scaling-laws",
      "notation-decoder",
    ],
    minutes: 61,
  },
  {
    slug: "backend-cloud",
    title: "Backend, Cloud and Production Security",
    summary:
      "Operate concurrent services, containers, Kubernetes, and safe release systems with backpressure, isolation, autoscaling, and defense-in-depth controls.",
    accent: "emerald",
    lessonIds: [
      "concurrency-event-loops",
      "linux-docker",
      "kubernetes",
      "safe-deployments",
      "appsec-zero-trust",
    ],
    minutes: 62,
  },
];

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

  const completedSet = useMemo(() => new Set(completedLessons), [completedLessons]);

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
        {PATH_CATALOG.map((track, index) => {
          const total = track.lessonIds.length;
          const completed = track.lessonIds.filter((id) => completedSet.has(id)).length;
          const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
          const accent = ACCENT[track.accent];

          return (
            <ScrollReveal key={track.slug} delay={index * 0.04}>
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
                  <span className="inline-flex items-center gap-1.5"><Clock size={13} /> {track.minutes} min</span>
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

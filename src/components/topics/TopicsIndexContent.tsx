'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight } from '@/components/ui/icons';
import { StaggerChild, StaggerGroup } from '@/components/ui/motion';
import { TOPICS, TOPIC_CATEGORIES, type TopicCategory } from '@/data/topics';

const KIND_GLYPH: Record<string, string> = {
  'consistent-hashing': '◍',
  'load-balancing': '⚖',
  cache: '◧',
  'rate-limit': '⧗',
  sharding: '⑃',
  cdn: '◉',
};

export function TopicsIndexContent() {
  const [filter, setFilter] = useState<TopicCategory | 'all'>('all');

  const topics = useMemo(
    () => (filter === 'all' ? TOPICS : TOPICS.filter((t) => t.category === filter)),
    [filter],
  );

  return (
    <div className="section-container py-14 md:py-20">
      <div className="max-w-3xl">
        <span className="eyebrow">
          <span className="h-1.5 w-1.5 rounded-full bg-brass" />
          Interactive topics
        </span>
        <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-content md:text-5xl">
          Concepts you can <span className="text-brass">turn the dials on</span>
        </h1>
        <p className="mt-5 text-pretty text-[15px] leading-relaxed text-content-secondary">
          Every topic is a working simulation. Change the parameters, watch the system respond, and see exactly which
          cloud services implement it in production.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-2">
        {(['all', ...TOPIC_CATEGORIES] as const).map((category) => {
          const active = filter === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setFilter(category)}
              className={`rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                active
                  ? 'border-brass/60 bg-brass/15 text-content'
                  : 'border-line bg-app/50 text-content-secondary hover:border-line-strong hover:text-content'
              }`}
            >
              {category === 'all' ? 'All topics' : category}
            </button>
          );
        })}
      </div>

      <StaggerGroup className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
        {topics.map((topic) => (
          <StaggerChild key={topic.slug}>
            <Link
              href={`/topics/${topic.slug}`}
              className="group flex h-full flex-col rounded-2xl border border-line bg-app/50 p-6 shadow-card transition-all hover:-translate-y-1 hover:border-brass/40"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line-strong bg-app-raised text-2xl text-brass">
                  {topic.kind ? KIND_GLYPH[topic.kind] : '✦'}
                </span>
                <span className="rounded-full border border-line px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-content-tertiary">
                  {topic.category}
                </span>
              </div>
              <h2 className="mt-5 text-[16px] font-semibold text-content">{topic.title}</h2>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-content-secondary">{topic.tagline}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brass">
                {topic.kind ? 'Open sandbox' : 'Read the concept'}
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </StaggerChild>
        ))}
      </StaggerGroup>
    </div>
  );
}

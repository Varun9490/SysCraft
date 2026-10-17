'use client';

import Link from 'next/link';
import { ArrowRight, Check, X } from '@/components/ui/icons';
import { Reveal, StaggerChild, StaggerGroup } from '@/components/ui/motion';
import { TOPICS, type Topic } from '@/data/topics';
import { TopicSimulator } from './TopicSimulator';

const PROVIDER_COLOR: Record<string, string> = {
  AWS: '#FF9900',
  Azure: '#3B82F6',
  GCP: '#4285F4',
  Cloudflare: '#F6821F',
};

export function TopicPageContent({ topic }: { topic: Topic }) {
  const related = TOPICS.filter((t) => t.slug !== topic.slug).slice(0, 3);

  return (
    <div className="section-container py-12 md:py-16">
      <nav className="flex items-center gap-2 text-[12px] text-content-tertiary">
        <Link href="/topics" className="transition-colors hover:text-content-secondary">
          Topics
        </Link>
        <span>/</span>
        <span className="text-content-secondary">{topic.title}</span>
      </nav>

      <header className="mt-6 max-w-3xl">
        <span className="eyebrow">
          <span className="h-1.5 w-1.5 rounded-full bg-brass" />
          {topic.category}
        </span>
        <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-content md:text-5xl">
          {topic.title}
        </h1>
        <p className="mt-4 text-pretty text-[16px] leading-relaxed text-content-secondary">{topic.tagline}</p>
      </header>

      {topic.kind && (
        <Reveal className="mt-8" y={20}>
          <TopicSimulator topic={topic} />
        </Reveal>
      )}

      <div className="mt-16 grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7">
          <p className="text-2xl leading-relaxed text-content">
            {topic.idea}
          </p>

          <h2 className="mt-10 text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">How it works</h2>
          <StaggerGroup className="mt-5 space-y-5" stagger={0.08}>
            {topic.howItWorks.map((step, i) => (
              <StaggerChild key={step.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-app-raised text-[13px] font-semibold tabular-nums text-brass">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-content">{step.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-content-secondary">{step.body}</p>
                </div>
              </StaggerChild>
            ))}
          </StaggerGroup>
        </div>

        <div className="space-y-8 lg:col-span-5">
          <Reveal>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Trade-offs</h2>
            <div className="mt-4 space-y-3">
              {topic.tradeoffs.map((t) => (
                <div key={t.pro} className="rounded-xl border border-line bg-app/50 p-4">
                  <p className="flex gap-2 text-[13px] leading-relaxed text-content">
                    <Check size={15} weight="bold" className="mt-0.5 shrink-0 text-success" />
                    {t.pro}
                  </p>
                  <p className="mt-2 flex gap-2 text-[13px] leading-relaxed text-content-secondary">
                    <X size={15} weight="bold" className="mt-0.5 shrink-0 text-danger" />
                    {t.con}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">In the cloud</h2>
            <div className="mt-4 space-y-2">
              {topic.cloud.map((c) => (
                <div key={`${c.provider}-${c.service}`} className="flex items-start gap-3 rounded-xl border border-line bg-app/50 p-3.5">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PROVIDER_COLOR[c.provider] }} />
                  <div>
                    <p className="text-[13px] font-semibold text-content">
                      <span className="text-content-tertiary">{c.provider}</span> · {c.service}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-content-secondary">{c.note}</p>
                  </div>
                </div>
              ))}
              <Link href="/cloud" className="inline-flex items-center gap-1.5 pt-1 text-[12px] font-semibold text-brass">
                Compare every provider <ArrowRight size={13} />
              </Link>
            </div>
          </Reveal>

          {topic.relatedLabId && (
            <Reveal delay={0.12}>
              <Link
                href={`/labs/${topic.relatedLabId}`}
                className="group block rounded-xl border border-brass/30 bg-brass/[0.06] p-4 transition-colors hover:border-brass/50"
              >
                <p className="text-[11px] uppercase tracking-[0.14em] text-content-tertiary">Apply it</p>
                <p className="mt-1 flex items-center gap-2 text-[14px] font-semibold text-content">
                  Build it in a guided lab
                  <ArrowRight size={14} className="text-brass transition-transform group-hover:translate-x-1" />
                </p>
              </Link>
            </Reveal>
          )}
        </div>
      </div>

      <div className="mt-16 border-t border-line pt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Keep exploring</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {related.map((r) => (
            <Link
              key={r.slug}
              href={`/topics/${r.slug}`}
              className="group rounded-2xl border border-line bg-app/50 p-5 shadow-card transition-all hover:-translate-y-1 hover:border-brass/40"
            >
              <p className="text-[10px] uppercase tracking-[0.14em] text-content-tertiary">{r.category}</p>
              <p className="mt-2 text-[15px] font-semibold text-content">{r.title}</p>
              <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-content-secondary">{r.tagline}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, FlaskConical, Gauge, XCircle } from "@/components/ui/icons";
import {
  COMMON_MISTAKES,
  DECISION_THRESHOLDS,
  LATENCY_LADDER,
  MACHINE_LIMITS,
  REFERENCE_CLAIMS,
  type Claim,
} from "@/data/claims";
import { Reveal, StaggerChild, StaggerGroup } from "@/components/ui/motion";
import { NumbersDrill } from "@/components/reference/NumbersDrill";

/**
 * /reference/numbers — the trust page. Every load-bearing number the site
 * teaches is here with provenance: where it came from, when it was last
 * checked, and what it is NOT claiming. Feeds the claims register habit:
 * numbers in an argument must have sources.
 */

const CATEGORY_LABEL: Record<Claim["category"], string> = {
  latency: "Latency",
  limits: "Machine limits",
  consistency: "Consistency",
  traffic: "Traffic & load",
  storage: "Storage & caching",
};

function claimById(id: string): Claim | undefined {
  return REFERENCE_CLAIMS.find((claim) => claim.id === id);
}

export function NumbersPageContent() {
  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
        <div className="line-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_0%,black,transparent)]" />
      </div>

      <div className="section-container relative pb-20 pt-12 md:pt-16">
        <StaggerGroup>
          <StaggerChild>
            <span className="eyebrow">
              <span className="h-1.5 w-1.5 rounded-full bg-brass" />
              The numbers reference
            </span>
          </StaggerChild>
          <StaggerChild>
            <h1 className="mt-6 max-w-2xl text-balance text-4xl font-semibold leading-[1.06] tracking-tight text-content md:text-5xl">
              Every number we teach, with provenance.
            </h1>
          </StaggerChild>
          <StaggerChild>
            <p className="mt-6 max-w-2xl text-pretty text-[15px] leading-relaxed text-content-secondary">
              Order-of-magnitude reasoning is 90% of system design — but only if the orders are real. This page is the
              claims registry behind the site: the latency ladder, the machine limits it rests on, the thresholds we
              advise, and the mistakes we exist to fix. When a claim has a source, we link it. When it&apos;s just
              arithmetic, we show the arithmetic.
            </p>
          </StaggerChild>
        </StaggerGroup>

        {/* Latency ladder */}
        <section className="mt-16" aria-label="Latency ladder">
          <Reveal>
            <h2 className="text-xl font-semibold text-content">The latency ladder</h2>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-content-secondary">
              Each row is roughly 10x the previous. Read down, not across — the design lesson is the{" "}
              <em>structure of the gap</em>, not any single number.
            </p>
          </Reveal>
          <Reveal className="mt-6">
            <div className="overflow-x-auto rounded-2xl border border-line bg-app/50 shadow-card">
              <table className="w-full min-w-[640px] text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-line bg-app-raised/40">
                    <th className="px-5 py-3 font-medium text-content-tertiary">Operation</th>
                    <th className="px-5 py-3 font-medium text-content-tertiary">Representative time</th>
                    <th className="px-5 py-3 font-medium text-content-tertiary">What it decides</th>
                  </tr>
                </thead>
                <tbody>
                  {LATENCY_LADDER.map((row) => (
                    <tr key={row.operation} className="border-b border-line/50 last:border-0">
                      <td className="px-5 py-3 font-medium text-content">{row.operation}</td>
                      <td className="px-5 py-3 tabular-nums text-brass-bright">{row.time}</td>
                      <td className="px-5 py-3 text-content-secondary">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        {/* Machine limits */}
        <section className="mt-14" aria-label="Machine limits">
          <Reveal>
            <h2 className="text-xl font-semibold text-content">Machine limits</h2>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-content-secondary">
              Backstops for everything above: physical ceilings — a 1 Gbps NIC moves ~125 MB/s at best, a single TCP
              stream is window ÷ RTT, and a process can exhaust file descriptors long before it exhausts memory. Any
              design claim that breaks one of these is simply wrong.
            </p>
          </Reveal>
          <Reveal className="mt-6">
            <div className="overflow-x-auto rounded-2xl border border-line bg-app/50 shadow-card">
              <table className="w-full min-w-[640px] text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-line bg-app-raised/40">
                    <th className="px-5 py-3 font-medium text-content-tertiary">Resource</th>
                    <th className="px-5 py-3 font-medium text-content-tertiary">Limit</th>
                    <th className="px-5 py-3 font-medium text-content-tertiary">Design consequence</th>
                  </tr>
                </thead>
                <tbody>
                  {MACHINE_LIMITS.map((row) => (
                    <tr key={row.resource} className="border-b border-line/50 last:border-0">
                      <td className="px-5 py-3 font-medium text-content">{row.resource}</td>
                      <td className="px-5 py-3 tabular-nums text-brass-bright">{row.limit}</td>
                      <td className="px-5 py-3 text-content-secondary">{row.designConsequence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        {/* Decision thresholds */}
        <section className="mt-14" aria-label="Decision thresholds">
          <Reveal>
            <h2 className="text-xl font-semibold text-content">Decision thresholds</h2>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-content-secondary">
              Heuristics, not laws: starting points, each with a reason. Tune against your own load before betting the
              SLO on one.
            </p>
          </Reveal>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {DECISION_THRESHOLDS.map((row, i) => (
              <Reveal key={row.signal} delay={i * 0.04}>
                <div className="rounded-2xl border border-line bg-app/50 p-5 shadow-card">
                  <p className="font-medium text-content">{row.signal}</p>
                  <p className="mt-1.5 text-[13px] tabular-nums text-brass-bright">{row.threshold}</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-content-secondary">{row.decision}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Common mistakes */}
        <section className="mt-14" aria-label="Common mistakes">
          <Reveal>
            <h2 className="text-xl font-semibold text-content">Common mistakes this site exists to fix</h2>
          </Reveal>
          <div className="mt-6 space-y-3">
            {COMMON_MISTAKES.map((row, i) => {
              const claim = row.claim ? claimById(row.claim) : undefined;
              return (
                <Reveal key={row.mistake} delay={i * 0.04}>
                  <div className="rounded-2xl border border-line bg-app/50 p-5 shadow-card">
                    <p className="flex items-start gap-2.5 text-[13.5px] text-content">
                      <XCircle size={15} className="mt-0.5 shrink-0 text-rose-400/80" />
                      <span>{row.mistake}</span>
                    </p>
                    <p className="mt-3 flex items-start gap-2.5 text-[13.5px] leading-relaxed text-content-secondary">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-brass" />
                      <span>{row.reality}</span>
                    </p>
                    {claim && (
                      <a
                        href={`#claim-${claim.id}`}
                        className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-brass hover:underline"
                      >
                        <Gauge size={12} /> Why: the claim and its source
                      </a>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* Decision drill — predict the verdict, then see the times */}
        <section className="mt-14" aria-label="Numbers decision drill">
          <NumbersDrill />
        </section>

        {/* Claims register */}
        <section id="claims-register" className="mt-14 scroll-mt-24" aria-label="Claims register">
          <Reveal>
            <h2 className="text-xl font-semibold text-content">Claims register</h2>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-content-secondary">
              Every load-bearing claim, its basis, and the source to check. Each claim carries an as-of date: we
              re-verify manually; you should re-verify before you stake your career pitch on a constant.
            </p>
          </Reveal>
          <div className="mt-6 space-y-3">
            {REFERENCE_CLAIMS.map((claim, i) => (
              <Reveal key={claim.id} delay={i * 0.03}>
                <article
                  id={`claim-${claim.id}`}
                  className="scroll-mt-24 rounded-2xl border border-line bg-app/50 p-5 shadow-card sm:p-6"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-app-raised/60 px-2.5 py-1 text-[11px] font-medium text-content-secondary">
                      <Gauge size={11} className="text-brass" />
                      {CATEGORY_LABEL[claim.category]}
                    </span>
                    <span className="text-[11px] text-content-tertiary">as of {claim.asOf}</span>
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-content">{claim.statement}</p>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-content-secondary">
                    <span className="font-medium text-content-tertiary">Basis: </span>
                    {claim.basis}
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                    {claim.sources.map((source) => (
                      <li key={source.label} className="text-[12.5px]">
                        {source.url ? (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-brass hover:underline"
                          >
                            {source.label}
                            <ArrowRight size={11} />
                          </a>
                        ) : (
                          <span className="text-content-secondary">{source.label}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <motion.div
          className="mt-16 rounded-2xl border border-brass/25 bg-brass/[0.06] p-6 sm:p-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Put the ladder to work</p>
          <h2 className="mt-3 text-lg font-semibold text-content">Numbers are the argument. Run them.</h2>
          <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-content-secondary">
            Every lab forces you to predict concurrency, queue depth, or cache behavior from these constants first,
            then grade your topology against them. Estimation before simulation is the habit that survives the
            interview room.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/labs"
              className="inline-flex items-center gap-2 rounded-full bg-brass px-5 py-2.5 text-[13px] font-semibold text-ink shadow-card transition-transform hover:scale-[1.03]"
            >
              Pick a lab
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/topics/caching-strategies"
              className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-app-raised/60 px-5 py-2.5 text-[13px] font-medium text-content-secondary transition-colors hover:border-brass/50 hover:text-content"
            >
              <FlaskConical size={14} className="text-brass" />
              Try the caching simulator
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

'use client';

import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import {
  MagneticLink,
  ScrollReveal,
  SpotlightGrid,
} from "@/components/ui/interactive";
// Count snapshot only — the landing shell must not pull in content registries.
import { CONTENT_SUMMARY } from "@/data/contentSummary";

const QUICK_STARTS = [
  { label: "URL shortener", meta: "caching · redirects", href: "/labs/bitly-url-shortener" },
  { label: "Rate limiter", meta: "admission · quotas", href: "/labs/distributed-rate-limiter" },
  { label: "WhatsApp chat", meta: "presence · delivery", href: "/labs/whatsapp-chat" },
] as const;

/**
 * The landing narrative ends on how a lesson works. This is the missing
 * next step: a quiet, single place to act on what was just described.
 */
export function ClosingCTA() {
  return (
    <section className="relative overflow-hidden border-t border-line/60 bg-ink/70">
      <SpotlightGrid grid="dot" color="rgb(var(--accent) / 0.12)" radius={480} className="opacity-60" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-10 h-72 w-72 rounded-full bg-brass/[0.05] blur-3xl"
      />

      <div className="section-container relative py-16 md:py-24">
        <ScrollReveal>
          <div className="relative grid overflow-hidden rounded-[2rem] border border-line/70 bg-app-raised/30 p-8 md:p-12 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-brass">
                <span className="h-px w-6 bg-brass/70" aria-hidden="true" />
                Start with a constraint
              </span>
              <h2 className="mt-5 max-w-xl text-balance text-3xl font-medium leading-[1.12] tracking-tight text-content md:text-4xl">
                Pick a system. See what breaks when you change it.
              </h2>
              <p className="mt-5 max-w-xl text-pretty text-[14px] leading-relaxed text-content-secondary">
                An empty canvas, a short brief, and a grader that checks your SLOs, budget, and topology. No
                account, no setup — your designs stay in this browser.
              </p>

              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <MagneticLink
                  href="/labs"
                  className="group inline-flex items-center gap-2 rounded-full bg-brass px-5 py-2.5 text-[13px] font-semibold text-ink shadow-[0_14px_32px_-18px_rgb(var(--accent)/0.9)] transition-colors hover:bg-brass-bright"
                >
                  Open the labs
                  <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
                </MagneticLink>
                <MagneticLink
                  href="/paths/foundations/single-server"
                  className="group inline-flex items-center gap-2 rounded-full border border-line-strong bg-ink/40 px-5 py-2.5 text-[13px] font-medium text-content-secondary transition-colors hover:border-brass/60 hover:text-content"
                >
                  Read the first lesson
                  <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                </MagneticLink>
              </div>

              <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-content-tertiary">
                No signup · {CONTENT_SUMMARY.labs} labs · Local-first
              </p>
            </div>

            <div className="mt-10 lg:col-span-5 lg:mt-0 lg:border-l lg:border-line/60 lg:pl-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">
                Jump straight in
              </p>
              <ul className="mt-5 divide-y divide-line/60">
                {QUICK_STARTS.map((item, index) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group flex items-center gap-4 py-4 transition-colors hover:text-brass"
                    >
                      <span className="font-mono text-[12px] tabular-nums text-brass/80">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-content">{item.label}</span>
                        <span className="mt-0.5 block truncate font-mono text-[11px] uppercase tracking-[0.1em] text-content-tertiary">
                          {item.meta}
                        </span>
                      </span>
                      <ArrowRight
                        size={15}
                        className="shrink-0 text-content-tertiary transition-[transform,color] duration-300 group-hover:translate-x-0.5 group-hover:text-brass"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

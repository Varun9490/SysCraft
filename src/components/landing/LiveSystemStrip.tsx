'use client';

import { AnimatedBeam, ScrollReveal } from "@/components/ui/interactive";

const PHASES = [
  { label: "Request", detail: "one intent leaves the client" },
  { label: "Route", detail: "the balancer picks a live API" },
  { label: "Query", detail: "the API reads the database" },
  { label: "Return", detail: "the answer travels back" },
] as const;

export function LiveSystemStrip() {
  return (
    <section className="border-b border-line/60 bg-ink/70">
      <div className="section-container py-8 md:py-10">
        <ScrollReveal>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass">
              One loop, every lesson
            </p>
            <p className="text-[12px] text-content-tertiary">
              The model above runs this same cycle. Break a step and the next one has to cope.
            </p>
          </div>
        </ScrollReveal>

        <div className="relative mt-5">
          <div className="absolute left-0 right-0 top-4 h-5 opacity-70" aria-hidden="true">
            <AnimatedBeam
              path="M 0 10 H 1200"
              viewBox="0 0 1200 20"
              duration={4}
              color="rgb(var(--accent))"
              className="h-5 w-full"
            />
          </div>
          <div className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PHASES.map((phase, index) => (
              <ScrollReveal key={phase.label} delay={index * 0.07} y={14} blur={3}>
                <div className="flex items-start gap-3 rounded-lg bg-ink/80 pr-3">
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brass/40 bg-ink font-mono text-[10px] tabular-nums text-brass">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-content">{phase.label}</span>
                    <span className="mt-1 block text-[12px] leading-relaxed text-content-tertiary">{phase.detail}</span>
                  </span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

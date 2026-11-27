'use client';

import { ArrowRight } from "@/components/ui/icons";
import {
  AnimatedBeam,
  MagneticLink,
  ScrollReveal,
  SpotlightGrid,
  TextReveal,
} from "@/components/ui/interactive";
import { HeroMiniCanvas } from "@/components/platform/hero/HeroMiniCanvas";
import { ResumePill } from "./ResumePill";

const HEADLINE =
  "Learn system design by watching a small architecture run, then read the idea in a story and in engineer language.";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line/60">
      <SpotlightGrid grid="dot" color="rgb(var(--accent) / 0.13)" radius={420} className="opacity-70" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-24 h-72 w-72 rounded-full bg-brass/[0.06] blur-3xl"
      />

      <div className="section-container relative grid items-center gap-12 py-16 md:py-24 lg:grid-cols-12 lg:gap-14 lg:py-28">
        <div className="lg:col-span-6">
          <ScrollReveal y={12} blur={0} duration={0.5}>
            <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-brass">
              <span className="h-px w-6 bg-brass/70" aria-hidden="true" />
              A quiet place to learn systems
            </span>
          </ScrollReveal>

          <TextReveal
            as="h1"
            text={HEADLINE}
            className="mt-6 max-w-2xl text-balance text-4xl font-medium leading-[1.08] tracking-tight text-content sm:text-5xl lg:text-[3.25rem]"
            mode="word"
            stagger={0.045}
            duration={0.65}
          />

          <ScrollReveal delay={0.22} y={18}>
            <p className="mt-6 max-w-xl text-pretty text-[15px] leading-relaxed text-content-secondary">
              Free in your browser, no account. Every lesson is a system you can touch, break, and put back together — at your own pace.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.32} y={18}>
            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <MagneticLink
                href="/paths/foundations/single-server"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-brass px-5 py-2.5 text-[13px] font-semibold text-ink shadow-[0_14px_32px_-18px_rgb(var(--accent)/0.9)] transition-colors hover:bg-brass-bright"
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  Start the learning path
                  <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
                </span>
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -translate-x-full bg-brass-sheen transition-transform duration-700 ease-out group-hover:translate-x-full"
                />
              </MagneticLink>
              <MagneticLink
                href="/labs"
                className="group inline-flex items-center gap-2 rounded-full border border-line-strong bg-app-raised/30 px-5 py-2.5 text-[13px] font-medium text-content-secondary transition-colors hover:border-brass/60 hover:text-content"
              >
                Open the interactive lab
                <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
              </MagneticLink>
            </div>
          </ScrollReveal>

          <div className="mt-5 min-h-[30px]">
            <ResumePill />
          </div>
        </div>

        <div className="relative lg:col-span-6">
          <ScrollReveal y={28} delay={0.12} duration={0.8}>
            <div className="group/canvas relative rounded-2xl p-px">
              {/* Aceternity-style moving border, drawn locally with a conic sweep. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl opacity-40 transition-opacity duration-500 group-hover/canvas:opacity-100"
              >
                <span className="absolute left-1/2 top-1/2 h-[190%] w-[190%] -translate-x-1/2 -translate-y-1/2 animate-[spin_9s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,rgb(var(--accent)/0.5)_52deg,transparent_110deg,transparent_196deg,rgb(var(--accent-bright)/0.42)_248deg,transparent_312deg)]" />
              </span>
              <span aria-hidden="true" className="pointer-events-none absolute inset-px rounded-2xl bg-ink" />
              <div className="relative">
                <HeroMiniCanvas />
              </div>
            </div>
          </ScrollReveal>
          <div className="mt-4 h-6" aria-hidden="true">
            <AnimatedBeam
              path="M 0 10 C 180 10 300 10 580 10"
              viewBox="0 0 580 20"
              duration={3.2}
              color="rgb(var(--accent))"
              className="h-6 w-full opacity-60"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

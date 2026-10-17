'use client';

import { GitBranch, Gauge, PenTool, Wrench } from "@/components/ui/icons";
import { Reveal, StaggerGroup, StaggerChild } from "@/components/ui/motion";

const STEPS = [
  {
    Icon: PenTool,
    title: "Sketch the system",
    description: "Drag primitives onto the canvas and wire them together — the same way you'd whiteboard an interview.",
    meta: "canvas · 10 min",
  },
  {
    Icon: GitBranch,
    title: "Define the contracts",
    description: "Nail down APIs, data models, and back-of-envelope numbers in the built-in design workbench.",
    meta: "api · data · estimate",
  },
  {
    Icon: Gauge,
    title: "Run it under load",
    description: "Start the simulation and watch requests flow. Latency, error rates, and cost update live at 20Hz.",
    meta: "live telemetry · 20Hz",
  },
  {
    Icon: Wrench,
    title: "Fix what breaks",
    description: "Inject chaos, read the traces, and iterate until your design meets its SLOs inside budget.",
    meta: "chaos · traces · SLOs",
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-line/60 bg-app-raised/20 py-24 md:py-32">
      <div className="section-container grid gap-14 lg:grid-cols-12 lg:gap-10">
        <Reveal className="lg:col-span-4">
          <div className="lg:sticky lg:top-24">
            <span className="eyebrow">The loop</span>
            <h2 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tighter text-content md:text-5xl">
              How the
              <br />
              work works
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-content-secondary">
              The same loop senior engineers run in production — drawing, contracting, load-testing, and hardening —
              compressed into a single sitting.
            </p>

            <div className="mt-8 flex items-end gap-6 border-t border-line/70 pt-6">
              <div>
                <p className="text-3xl font-semibold tabular-nums tracking-tight text-content">25</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-content-tertiary">min / loop</p>
              </div>
              <div>
                <p className="text-3xl font-semibold tabular-nums tracking-tight text-brass">4</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-content-tertiary">repeatable steps</p>
              </div>
            </div>
          </div>
        </Reveal>

        <StaggerGroup className="relative lg:col-span-8" stagger={0.12}>
          <div
            aria-hidden="true"
            className="rail-track pointer-events-none absolute bottom-4 left-[19px] top-4 w-px bg-line"
          />

          <div className="flex flex-col gap-10">
            {STEPS.map((step, index) => {
              const { Icon } = step;
              return (
                <StaggerChild key={step.title} className="relative pl-16">
                  <span className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-xl border border-brass/30 bg-app text-brass shadow-card">
                    <Icon size={18} weight="bold" />
                  </span>

                  <div className="rounded-2xl border border-line/70 bg-app/50 p-6 transition-colors duration-300 hover:border-brass/30 hover:bg-app/80">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="text-lg font-semibold tracking-tight text-content">
                        <span className="mr-2.5 font-mono text-[12px] tabular-nums text-brass-bright">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {step.title}
                      </h3>
                      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-content-tertiary">
                        {step.meta}
                      </span>
                    </div>
                    <p className="mt-2.5 max-w-lg text-[14px] leading-relaxed text-content-secondary">
                      {step.description}
                    </p>
                  </div>
                </StaggerChild>
              );
            })}
          </div>
        </StaggerGroup>
      </div>
    </section>
  );
}

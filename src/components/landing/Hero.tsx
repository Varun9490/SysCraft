'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "@/components/ui/icons";
import { Counter, Magnetic, StaggerChild, StaggerGroup } from "@/components/ui/motion";
import { IsometricArchitecture } from "@/components/diagrams/IsometricArchitecture";

const STATS = [
  { label: "Modules", value: 19 },
  { label: "Lessons", value: 137 },
  { label: "Labs", value: 16 },
  { label: "Primitives", value: 32 },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="dot-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_78%_68%_at_64%_38%,black,transparent)]" />
        <div className="absolute -top-28 right-[4%] h-[440px] w-[440px] rounded-full bg-brass/[0.08] blur-[150px]" />
      </div>

      <div className="section-container relative grid items-center gap-12 pb-16 pt-14 md:pb-24 md:pt-20 lg:grid-cols-12 lg:gap-6">
        <StaggerGroup className="lg:col-span-6">
          <StaggerChild>
            <span className="eyebrow">
              <span className="h-1.5 w-1.5 rounded-full bg-brass" />
              Interactive system design platform
            </span>
          </StaggerChild>

          <StaggerChild>
            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.04] tracking-tighter text-content sm:text-5xl lg:text-[3.5rem]">
              Learn system design
              <span className="block text-brass">by running it.</span>
            </h1>
          </StaggerChild>

          <StaggerChild>
            <p className="mt-6 max-w-xl text-pretty text-[15px] leading-relaxed text-content-secondary">
              Design real systems on an infinite canvas, then run them under load. Watch queues form, caches melt,
              and replicas fail — from a single server to globally distributed architectures.
            </p>
          </StaggerChild>

          <StaggerChild>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Magnetic strength={0.3}>
                <Link
                  href="/start"
                  className="group inline-flex items-center gap-2 rounded-full bg-brass px-6 py-3 text-sm font-semibold text-ink shadow-card transition-transform hover:scale-[1.03]"
                >
                  Start the guided path
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Magnetic>
              <Link
                href="/labs"
                className="group inline-flex items-center gap-2 rounded-full border border-line-strong bg-app-raised/60 px-6 py-3 text-sm font-medium text-content-secondary transition-colors hover:border-brass/50 hover:text-content"
              >
                <PlayCircle size={15} className="text-brass" />
                Explore 16 labs
              </Link>
            </div>
          </StaggerChild>

          <StaggerChild>
            <dl className="mt-10 grid max-w-lg grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-6 sm:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-[10px] uppercase tracking-[0.16em] text-content-tertiary">{stat.label}</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums text-content">
                    <Counter to={stat.value} />
                  </dd>
                </div>
              ))}
            </dl>
          </StaggerChild>
        </StaggerGroup>

        <div className="relative lg:col-span-6">
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <IsometricArchitecture className="mx-auto w-full max-w-[560px]" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="absolute left-0 top-8 hidden md:block"
          >
            <div className="animate-float-slow rounded-xl border border-line bg-app-raised/85 px-3.5 py-2 shadow-card backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.14em] text-content-tertiary">p99 latency</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-brass">84 ms</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="absolute bottom-10 right-0 hidden md:block"
          >
            <div className="animate-float-slow rounded-xl border border-line bg-app-raised/85 px-3.5 py-2 shadow-card backdrop-blur" style={{ animationDelay: "1.4s" }}>
              <p className="text-[10px] uppercase tracking-[0.14em] text-content-tertiary">throughput</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-content">12.4k rps</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

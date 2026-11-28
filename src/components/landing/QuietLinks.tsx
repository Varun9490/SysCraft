'use client';

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "@/components/ui/icons";
import {
  BentoItem,
  InteractiveBento,
  ScrollReveal,
} from "@/components/ui/interactive";

const LINKS = [
  {
    href: "/blogs",
    label: "Engineering blogs",
    note: "Long-form reads behind the designs",
    tag: "01 · READ",
    kind: "notes" as const,
  },
  {
    href: "/quiz",
    label: "Recall quiz",
    note: "A few questions drawn from what you have seen",
    tag: "02 · CHECK",
    kind: "quiz" as const,
  },
  {
    href: "/labs",
    label: "Interactive sandbox",
    note: "An empty canvas and a set of constraints",
    tag: "03 · BUILD",
    kind: "sandbox" as const,
  },
] as const;

const EASE = [0.22, 1, 0.36, 1] as const;

function MiniDiagram({ kind }: { kind: (typeof LINKS)[number]["kind"] }) {
  const reduced = useReducedMotion() === true;
  const drawn = (delay: number) => ({
    initial: { pathLength: reduced ? 1 : 0.35, opacity: reduced ? 1 : 0.6 },
    whileInView: { pathLength: 1, opacity: 1 },
    viewport: { once: true, margin: "-40px" },
    transition: { duration: reduced ? 0 : 0.9, delay, ease: EASE },
  });

  return (
    <svg viewBox="0 0 72 48" className="h-12 w-[72px] shrink-0 overflow-visible" aria-hidden="true" fill="none">
      {kind === "notes" && (
        <>
          <rect x="6" y="5" width="44" height="38" rx="4" stroke="rgb(var(--line-strong))" />
          <motion.path d="M 13 16 H 38 M 13 24 H 42 M 13 32 H 32" stroke="rgb(var(--accent) / 0.75)" strokeWidth="1.2" strokeLinecap="round" {...drawn(0)} />
          <motion.path
            d="M 50 30 H 66 M 61 25 L 66 30 L 61 35"
            stroke="rgb(var(--accent-bright))"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-500 group-hover:translate-x-1"
            {...drawn(0.18)}
          />
        </>
      )}
      {kind === "quiz" && (
        <>
          <motion.path d="M 8 24 H 20 M 30 24 H 42 M 52 24 H 64" stroke="rgb(var(--line-strong))" strokeWidth="1.2" strokeLinecap="round" {...drawn(0)} />
          {[14, 36, 58].map((x, index) => (
            <circle
              key={x}
              cx={x}
              cy="24"
              r={index === 1 ? 5 : 3.5}
              fill={index === 1 ? "rgb(var(--accent) / 0.24)" : "rgb(var(--line))"}
              stroke={index === 1 ? "rgb(var(--accent))" : "rgb(var(--line-strong))"}
              className="transition-all duration-500 group-hover:stroke-[rgb(var(--accent-bright))]"
            />
          ))}
          <motion.path d="M 33 24 L 36 27 L 40 21" stroke="rgb(var(--accent-bright))" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" {...drawn(0.2)} />
        </>
      )}
      {kind === "sandbox" && (
        <>
          <motion.path
            d="M 14 24 H 32 M 42 14 H 58 M 42 34 H 58 M 32 24 C 38 24 38 14 42 14 M 32 24 C 38 24 38 34 42 34"
            stroke="rgb(var(--accent) / 0.6)"
            strokeWidth="1.2"
            strokeLinecap="round"
            className="transition-transform duration-500 group-hover:translate-x-0.5"
            {...drawn(0)}
          />
          <rect x="4" y="19" width="10" height="10" rx="3" fill="rgb(var(--line))" stroke="rgb(var(--line-strong))" />
          <rect x="58" y="9" width="10" height="10" rx="3" fill="#141310" stroke="rgb(var(--accent))" />
          <rect x="58" y="29" width="10" height="10" rx="3" fill="#141310" stroke="rgb(var(--accent))" />
          <circle cx="36" cy="24" r="2.4" fill="rgb(var(--accent-bright))" className="transition-transform duration-500 group-hover:translate-x-2" />
        </>
      )}
    </svg>
  );
}

export function QuietLinks() {
  return (
    <section className="border-y border-line/60 bg-app-raised/20">
      <div className="section-container py-12 md:py-16">
        <ScrollReveal>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-content-tertiary">
            Other ways in
          </p>
        </ScrollReveal>

        <InteractiveBento className="mt-6">
          {LINKS.map((link, index) => (
            <ScrollReveal
              key={link.href}
              delay={index * 0.08}
              y={18}
              blur={4}
              className={index === LINKS.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""}
            >
              <BentoItem className="h-full">
                <Link
                  href={link.href}
                  className="group flex h-full min-h-[132px] items-center justify-between gap-5 px-5 py-5"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-brass/80">
                      {link.tag}
                    </span>
                    <span className="mt-2 block text-[14px] font-medium text-content">{link.label}</span>
                    <span className="mt-1 block text-[12px] leading-relaxed text-content-tertiary">{link.note}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <MiniDiagram kind={link.kind} />
                    <ArrowRight
                      size={16}
                      className="text-content-tertiary transition-[transform,color] duration-500 group-hover:translate-x-1.5 group-hover:text-brass"
                    />
                  </div>
                </Link>
              </BentoItem>
            </ScrollReveal>
          ))}
        </InteractiveBento>
      </div>
    </section>
  );
}

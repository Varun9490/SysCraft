'use client';

import Link from "next/link";
import { ArrowRight, PlayCircle } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/motion";

const QUICK_STARTS = [
  { label: "Bitly URL shortener", meta: "45 min · url shortener", href: "/labs/bitly-url-shortener" },
  { label: "Distributed rate limiter", meta: "30 min · rate limiting", href: "/labs/distributed-rate-limiter" },
  { label: "WhatsApp chat", meta: "60 min · realtime messaging", href: "/labs/whatsapp-chat" },
];

export function CTASection() {
  return (
    <section className="section-container py-24 md:py-32">
      <Reveal>
        <div className="relative grid overflow-hidden rounded-[2rem] border border-line/70 bg-app-raised/40 lg:grid-cols-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="line-grid absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_70%_80%_at_20%_20%,black,transparent)]" />
            <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-brass/[0.05] to-transparent" />
          </div>

          <div className="relative flex flex-col justify-center gap-6 p-8 md:p-14 lg:col-span-7">
            <span className="eyebrow">Start now</span>
            <h2 className="max-w-lg text-4xl font-semibold leading-[1.05] tracking-tighter text-content md:text-5xl">
              Design your first system this week.
            </h2>
            <p className="max-w-md text-[15px] leading-relaxed text-content-secondary">
              Start with a 45-minute lab or follow the path from module one. Everything runs in your browser — no signup, no
              setup, no backend.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/labs/bitly-url-shortener"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-brass px-6 py-3 text-sm font-semibold text-ink transition-transform hover:scale-[1.02] active:translate-y-px"
              >
                <PlayCircle size={16} weight="bold" />
                Start with Bitly
              </Link>
              <Link
                href="/path"
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-line bg-app/70 px-6 py-3 text-sm font-medium text-content transition-colors hover:border-brass/40 hover:bg-app"
              >
                Follow the learning path
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <p className="text-xs text-content-tertiary">
              100% client-side · Your designs stay in your browser · Free to explore
            </p>
          </div>

          <div className="relative border-t border-line/60 p-8 lg:col-span-5 lg:border-l lg:border-t-0 lg:p-10">
            <p className="text-[11px] uppercase tracking-[0.16em] text-content-tertiary">Jump straight in</p>
            <ul className="mt-6 divide-y divide-line/60">
              {QUICK_STARTS.map((item, index) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-4 py-4 transition-colors"
                  >
                    <span className="font-mono text-[12px] tabular-nums text-brass-bright">
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
                      className="shrink-0 text-content-tertiary transition-all group-hover:translate-x-0.5 group-hover:text-brass"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

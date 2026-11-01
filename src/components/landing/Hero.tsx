'use client';

import Link from "next/link";
import { CONTENT_COUNTS } from "@/data/contentManifest";

export function Hero() {
  return (
    <section className="py-20 md:py-28">
      <div className="reading-column">
        <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-content sm:text-4xl md:text-5xl">
          Learn system design in the order real systems need it.
        </h1>
        <p className="mt-5 text-pretty text-[15px] leading-relaxed text-content-secondary">
          One server, then a cache, then many machines, then AWS, Cloudflare, and Kubernetes. Each step builds on the
          last, so you are never learning a topic before you need it.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/learn"
            className="inline-flex items-center justify-center rounded-md bg-brass px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-brass-bright"
          >
            Start the path
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center text-sm font-medium text-content-secondary transition-colors hover:text-content"
          >
            See pricing
          </Link>
        </div>
        <p className="mt-10 text-[13px] text-content-tertiary">
          {CONTENT_COUNTS.modules} modules · {CONTENT_COUNTS.lessons} lessons · {CONTENT_COUNTS.labs} labs
        </p>
      </div>
    </section>
  );
}
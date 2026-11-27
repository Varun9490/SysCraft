'use client';

import Link from "next/link";

export function PricingPageContent() {
  return (
    <section className="py-16 md:py-24">
      <div className="reading-column">
        <h1 className="text-2xl font-semibold tracking-tight text-content sm:text-3xl">Free</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-content-secondary">
          Everything on this site is free and local-first. You can use it without an account:
          there are no plans, no checkout, and no gated features.
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-content-secondary">
          Your progress lives in your browser. You can export it from the study dock whenever
          you want a copy.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/start"
            className="text-sm font-medium text-content-secondary transition-colors hover:text-content"
          >
            Get started →
          </Link>
          <Link
            href="/paths"
            className="text-sm font-medium text-content-secondary transition-colors hover:text-content"
          >
            Browse learning paths →
          </Link>
        </div>
      </div>
    </section>
  );
}

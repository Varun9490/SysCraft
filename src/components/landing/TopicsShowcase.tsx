'use client';

import Link from "next/link";

export function TopicsShowcase() {
  return (
    <section className="py-16 md:py-20">
      <div className="reading-column">
        <h2 className="text-xl font-semibold tracking-tight text-content">Interactive topics</h2>
        <p className="mt-2 text-[14px] text-content-secondary">
          Move a slider and watch the metric change. Consistent hashing, caching, rate limiting, and more.
        </p>
        <Link href="/topics" className="mt-6 inline-block text-sm font-medium text-content-secondary hover:text-content">
          Browse topics →
        </Link>
      </div>
    </section>
  );
}
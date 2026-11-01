'use client';

import Link from "next/link";

export function CTASection() {
  return (
    <section className="py-16 md:py-20">
      <div className="reading-column">
        <h2 className="text-xl font-semibold tracking-tight text-content">Start this week</h2>
        <p className="mt-2 text-[14px] text-content-secondary">
          Follow the path from module one, or jump into a lab. Everything runs in this browser.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/learn" className="text-sm font-medium text-content-secondary hover:text-content">
            Follow the path
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-content-secondary hover:text-content">
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
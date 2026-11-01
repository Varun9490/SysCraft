'use client';

import Link from "next/link";

export function LabsPreview() {
  return (
    <section className="py-16 md:py-20">
      <div className="reading-column">
        <h2 className="text-xl font-semibold tracking-tight text-content">Labs</h2>
        <p className="mt-2 text-[14px] text-content-secondary">
          Design Bitly, YouTube, WhatsApp, and the rest from a blank canvas. Each lab is graded against real SLOs.
        </p>
        <Link href="/labs" className="mt-6 inline-block text-sm font-medium text-content-secondary hover:text-content">
          Browse the labs →
        </Link>
      </div>
    </section>
  );
}
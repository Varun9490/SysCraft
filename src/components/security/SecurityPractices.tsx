'use client';

import Link from 'next/link';
import { SECURITY_PRACTICES } from '@/data/securityPractices';
import { canvasHrefWithAdd } from '@/store/canvasDeepLink';

export function SecurityPractices() {
  return (
    <section id="practices" className="mt-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Security habits</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-content md:text-3xl">
        Ten habits you can practice today
      </h2>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-content-secondary">
        Learn the habit first. The CVE feed below shows what happens when the habit is missing.
      </p>

      <ol className="mt-6 space-y-6">
        {SECURITY_PRACTICES.map((practice) => (
          <li key={practice.id} className="border-b border-line pb-6 last:border-0">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[12px] text-content-tertiary">{practice.number}.</span>
              <h3 className="text-[16px] font-semibold text-content">{practice.title}</h3>
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-content-secondary">{practice.plainEnglish}</p>
            <details className="mt-3">
              <summary className="cursor-pointer text-[13px] text-brass">Show the practice</summary>
              <div className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-content-secondary">
                <p><span className="font-semibold text-content">Do this:</span> {practice.doThis}</p>
                <p><span className="font-semibold text-content">Never do this:</span> {practice.neverDoThis}</p>
                <p><span className="font-semibold text-content">AWS:</span> {practice.aws}</p>
                <p><span className="font-semibold text-content">Cloudflare:</span> {practice.cloudflare}</p>
                <p><span className="font-semibold text-content">Kubernetes:</span> {practice.kubernetes}</p>
                <p className="pt-1">
                  <Link
                    href={canvasHrefWithAdd(practice.tryOnCanvas)}
                    className="text-brass underline-offset-4 hover:underline"
                  >
                    Try on canvas
                  </Link>
                </p>
              </div>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}
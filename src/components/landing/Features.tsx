'use client';

import Link from "next/link";

const ROWS = [
  { title: "Canvas", href: "/canvas", sentence: "Drag primitives onto a canvas and run them under load." },
  { title: "Labs", href: "/labs", sentence: "Guided labs graded against real SLOs and budgets." },
  { title: "Cloud & Kubernetes", href: "/cloud", sentence: "AWS, Cloudflare, and Kubernetes drills you can click through." },
  { title: "Security habits", href: "/security", sentence: "Threat models, zero-trust, and live CVE triage." },
  { title: "Plugins", href: "/plugins", sentence: "Extend the engine with your own primitives and rules." },
  { title: "Enterprise", href: "/enterprise", sentence: "Cohorts, ADRs, and SLA math for teams." },
  { title: "Wiki", href: "/wiki", sentence: "Concept articles with diagrams and examples." },
];

export function Features() {
  return (
    <section className="py-16 md:py-20">
      <div className="reading-column">
        <h2 className="text-xl font-semibold tracking-tight text-content">Also in the product</h2>
        <p className="mt-2 text-[14px] text-content-secondary">
          The path is the spine. These are the tools around it.
        </p>
        <ul className="mt-6 divide-y divide-line/60">
          {ROWS.map((row) => (
            <li key={row.href} className="py-4">
              <Link href={row.href} className="group block">
                <span className="text-[15px] font-medium text-content group-hover:underline">{row.title}</span>
                <span className="mt-1 block text-[13px] text-content-secondary">{row.sentence}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
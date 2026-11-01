'use client';

import Link from "next/link";

const PLANS = [
  {
    name: "Individual",
    price: "Free",
    body: "Everything runs in this browser. No account, no signup.",
    links: [{ href: "/learn", label: "Start the path" }],
  },
  {
    name: "Team",
    price: "Talk to us",
    body: "Shared rooms, progress export, and the same curriculum for everyone. No checkout yet. Email the link in Privacy to talk.",
    links: [
      { href: "/room", label: "Open a room" },
      { href: "/progress", label: "See progress" },
    ],
  },
  {
    name: "Enterprise",
    price: "Talk to us",
    body: "Cohort radar, ADR studio, security tracks, and plugin rules for your org.",
    links: [{ href: "/enterprise", label: "Enterprise hub" }],
  },
];

export function PricingPageContent() {
  return (
    <section className="py-16 md:py-24">
      <div className="reading-column">
        <h1 className="text-2xl font-semibold tracking-tight text-content sm:text-3xl">Pricing</h1>
        <p className="mt-3 text-[14px] text-content-secondary">
          Your designs stay in this browser. Pick the plan that fits.
        </p>

        <ul className="mt-10 divide-y divide-line/60">
          {PLANS.map((plan) => (
            <li key={plan.name} className="py-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                <h2 className="text-lg font-semibold text-content">{plan.name}</h2>
                <span className="text-[13px] text-content-tertiary">{plan.price}</span>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-content-secondary">{plan.body}</p>
              <div className="mt-4 flex flex-wrap gap-4">
                {plan.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-medium text-content-secondary transition-colors hover:text-content"
                  >
                    {link.label} →
                  </Link>
                ))}
                {plan.name === "Team" && (
                  <Link
                    href="/privacy"
                    className="text-sm font-medium text-content-secondary transition-colors hover:text-content"
                  >
                    Privacy →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
'use client';

import Link from "next/link";
import { LogoMark } from "./SiteHeader";
import { SEED_RESOURCES } from "@/data/seedResources";
import { GUIDED_LABS } from "@/data/guidedLabs";
import { TOTAL_LESSONS, TOTAL_MODULES } from "@/data/pathData";

const PRODUCT_LINKS = [
  { href: "/learn", label: "Learning Path" },
  { href: "/wiki", label: "Concept Wiki" },
  { href: "/labs", label: "System Labs" },
  { href: "/flowchart", label: "Design Flowchart" },
  { href: "/play", label: "Play Modes" },
  { href: "/practice", label: "FSRS Review" },
  { href: "/room", label: "Live Rooms" },
  { href: "/progress", label: "Progress" },
  { href: "/settings", label: "Settings" },
  { href: "/canvas", label: "Canvas Workspace" },
  { href: "/cloud", label: "Cloud & Networking" },
  { href: "/topics", label: "Interactive Topics" },
];

const LIBRARY_LINKS = [
  { href: "/wiki/primitives", label: `${SEED_RESOURCES.length} Infrastructure Primitives` },
  { href: "/labs", label: `${GUIDED_LABS.length} Real-world Systems` },
  { href: "/learn", label: `${TOTAL_LESSONS} Structured Lessons` },
  { href: "/resources/new", label: "Custom Resource Studio" },
  { href: "/canvas", label: "IaC Export" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line/70 bg-ink">
      <div className="section-container py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <span className="flex items-center gap-2.5">
              <LogoMark size={22} />
              <span className="text-[15px] font-semibold tracking-tight text-content">
                Sys<span className="text-brass">Craft</span>
              </span>
            </span>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-content-tertiary">
              Learn system design by doing it. Design real architectures on an infinite canvas, run them under load, and watch
              what breaks.
            </p>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">Product</h3>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-1">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-[13px] text-content-secondary transition-colors hover:text-content">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="col-span-2 sm:col-span-1 text-[11px] tabular-nums text-content-tertiary">
                {TOTAL_MODULES} modules · {TOTAL_LESSONS} lessons in the path
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">Library</h3>
            <ul className="mt-4 space-y-2.5">
              {LIBRARY_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-[13px] text-content-secondary transition-colors hover:text-content">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-line/70 pt-6 sm:flex-row">
          <p className="text-xs text-content-tertiary">© 2026 SysCraft. Built for engineers who learn by building.</p>
          <p className="text-xs text-content-tertiary">100% client-side · Zero backend · Runs in your browser</p>
        </div>
      </div>
    </footer>
  );
}

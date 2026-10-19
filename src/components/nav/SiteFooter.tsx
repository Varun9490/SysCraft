'use client';

import Link from "next/link";
import { LogoMark } from "./SiteHeader";
import { CONTENT_COUNTS } from "@/data/contentManifest";

/**
 * Footer = the honest index. Four visibility tiers:
 *  1. The four verbs (same as the header).
 *  2. Practice & play surfaces (mode-based discovery lives here, not in nav).
 *  3. Reference racks (wiki, topics, numbers, primitives).
 *  4. Privacy & data — what actually leaves your browser (see /privacy).
 */

const LEARN_LINKS = [
  { href: "/learn", label: "Learning path" },
  { href: "/start", label: "Start here" },
  { href: "/progress", label: "Progress" },
];

const BUILD_LINKS = [
  { href: "/canvas", label: "Canvas workspace" },
  { href: "/labs", label: "Guided labs" },
  { href: "/flowchart", label: "Design flowchart" },
  { href: "/room", label: "Live rooms" },
];

const PRACTICE_LINKS = [
  { href: "/practice", label: "Spaced review" },
  { href: "/play", label: "Game modes" },
  { href: "/topics", label: "Interactive topics" },
  { href: "/cloud", label: "Cloud & networking drills" },
];

const REFERENCE_LINKS = [
  { href: "/wiki", label: "Concept wiki" },
  { href: "/wiki/primitives", label: "Primitive library" },
  { href: "/reference/numbers", label: "Numbers & claims" },
  { href: "/resources/new", label: "Custom resource studio" },
  { href: "/settings", label: "Settings" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line/70 bg-ink">
      <div className="section-container py-14">
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <span className="flex items-center gap-2.5">
              <LogoMark size={22} />
              <span className="text-[15px] font-semibold tracking-tight text-content">
                Sys<span className="text-brass">Craft</span>
              </span>
            </span>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-content-tertiary">
              Learn system design by doing it. Design real architectures on an infinite canvas, run them under load,
              and watch what breaks.
            </p>
            <p className="mt-3 max-w-xs text-[11.5px] leading-relaxed text-content-tertiary">
              {CONTENT_COUNTS.modules} modules · {CONTENT_COUNTS.lessons} lessons · {CONTENT_COUNTS.labs} labs ·{" "}
              {CONTENT_COUNTS.primitives} primitives
            </p>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">Learn & track</h3>
            <ul className="mt-4 space-y-2.5">
              {LEARN_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[13px] text-content-secondary transition-colors hover:text-content">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">Build & practice</h3>
            <ul className="mt-4 space-y-2.5">
              {BUILD_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[13px] text-content-secondary transition-colors hover:text-content">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="mt-2.5 space-y-2.5 border-t border-line/60 pt-2.5">
              {PRACTICE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[13px] text-content-secondary transition-colors hover:text-content">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">Reference</h3>
            <ul className="mt-4 space-y-2.5">
              {REFERENCE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[13px] text-content-secondary transition-colors hover:text-content">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line/70 pt-6 sm:flex-row">
          <p className="text-xs text-content-tertiary">© 2026 SysCraft. Built for engineers who learn by building.</p>
          <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-content-tertiary sm:justify-end">
            <span>Your design data stays in this browser</span>
            <Link href="/privacy" className="underline decoration-line-strong underline-offset-4 transition-colors hover:text-content">
              Privacy &amp; what leaves the browser
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

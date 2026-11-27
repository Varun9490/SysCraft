'use client';

import Link from "next/link";
import { LogoMark } from "./SiteHeader";
import { CONTENT_COUNTS } from "@/data/contentManifest";

const LEARN_LINKS = [
  { href: "/paths", label: "Learning paths" },
  { href: "/blogs", label: "Engineering blogs" },
  { href: "/quiz", label: "Recall quiz" },
  { href: "/encyclopedia", label: "Encyclopedia" },
  { href: "/progress", label: "Your progress" },
] as const;

const BUILD_LINKS = [
  { href: "/canvas", label: "Canvas workspace" },
  { href: "/labs", label: "Guided labs" },
  { href: "/map", label: "Topic map" },
  { href: "/tools", label: "Tools" },
  { href: "/wiki/primitives", label: "Primitive library" },
] as const;

const REFERENCE_LINKS = [
  { href: "/reference/numbers", label: "Numbers & claims" },
  { href: "/learn", label: "Read the path" },
  { href: "/settings", label: "Settings" },
  { href: "/pricing", label: "Free" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-line/70 bg-ink">
      <div className="section-container py-14">
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <span className="flex items-center gap-2.5">
              <LogoMark size={22} />
              <span className="text-[15px] font-medium tracking-tight text-content">
                Sys<span className="text-brass">Craft</span>
              </span>
            </span>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-content-secondary">
              Learn system design by watching a small architecture run, then reading the idea in a story and in engineer language.
            </p>
            <p className="mt-3 font-mono text-[11px] leading-relaxed text-content-tertiary">
              {CONTENT_COUNTS.lessons} lessons · {CONTENT_COUNTS.labs} labs · {CONTENT_COUNTS.primitives} primitives
            </p>
          </div>

          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">Learn</h3>
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
            <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">Build</h3>
            <ul className="mt-4 space-y-2.5">
              {BUILD_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[13px] text-content-secondary transition-colors hover:text-content">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">Reference</h3>
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

        <div className="mt-12 grid gap-4 border-t border-line/70 pt-6 md:grid-cols-2">
          <p className="text-[12px] leading-relaxed text-content-tertiary">
            Your progress stays in this browser. Export lives in the workspace dock — there is no account or server-side copy.
          </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-content-tertiary md:justify-end">
            <span>© 2026 SysCraft</span>
            <a
              href="https://github.com/Varun9490/SysCraft"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-line-strong underline-offset-4 transition-colors hover:text-content"
            >
              Source on GitHub
            </a>
            <Link href="/privacy" className="underline decoration-line-strong underline-offset-4 transition-colors hover:text-content">
              Privacy &amp; what leaves the browser
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

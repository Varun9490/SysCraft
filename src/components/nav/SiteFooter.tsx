'use client';

import Link from "next/link";
import { LogoMark } from "./SiteHeader";
import { CONTENT_COUNTS } from "@/data/contentManifest";

const LEARN_LINKS = [
  { href: "/learn", label: "Learning path" },
  { href: "/start", label: "Start here" },
  { href: "/topics", label: "Interactive topics" },
  { href: "/wiki", label: "Concept wiki" },
  { href: "/encyclopedia", label: "Encyclopedia" },
  { href: "/reference/numbers", label: "Numbers & claims" },
  { href: "/progress", label: "Progress" },
];

const PRODUCT_LINKS = [
  { href: "/canvas", label: "Canvas workspace" },
  { href: "/labs", label: "Guided labs" },
  { href: "/flowchart", label: "Design flowchart" },
  { href: "/room", label: "Live rooms" },
  { href: "/cloud", label: "AWS, Cloudflare & K8s" },
  { href: "/plugins", label: "Architecture plugins" },
  { href: "/play", label: "Game modes" },
  { href: "/practice", label: "Spaced review" },
  { href: "/resources/new", label: "Custom resource studio" },
  { href: "/settings", label: "Settings" },
];

const COMPANY_LINKS = [
  { href: "/security", label: "Security & live CVEs" },
  { href: "/enterprise", label: "Enterprise & architect hub" },
  { href: "/pricing", label: "Pricing" },
  { href: "/privacy", label: "Privacy" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line/60 bg-ink">
      <div className="section-container py-12">
        <div className="flex items-center gap-2">
          <LogoMark size={16} />
          <span className="text-[14px] font-semibold tracking-tight text-content">SysCraft</span>
          <span className="ml-2 text-[12px] text-content-tertiary">
            {CONTENT_COUNTS.modules} modules · {CONTENT_COUNTS.lessons} lessons · {CONTENT_COUNTS.labs} labs
          </span>
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">Learn</h3>
            <ul className="mt-3 space-y-2">
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
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">Product</h3>
            <ul className="mt-3 space-y-2">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[13px] text-content-secondary transition-colors hover:text-content">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">Company</h3>
            <ul className="mt-3 space-y-2">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[13px] text-content-secondary transition-colors hover:text-content">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-line/60 pt-5 sm:flex-row sm:items-center">
          <p className="text-xs text-content-tertiary">© 2026 SysCraft. Built for engineers who learn by building.</p>
          <p className="text-xs text-content-tertiary">Designs stay in this browser.</p>
        </div>
      </div>
    </footer>
  );
}
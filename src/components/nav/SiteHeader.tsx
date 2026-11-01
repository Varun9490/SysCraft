'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Menu, X } from "@/components/ui/icons";

const PRIMARY_LINKS = [
  { href: "/learn", label: "Path" },
  { href: "/labs", label: "Practice" },
  { href: "/security", label: "Security" },
  { href: "/pricing", label: "Pricing" },
];

const MORE_LINKS = [
  { href: "/cloud", label: "Cloud & Kubernetes", description: "AWS, Cloudflare, and Kubernetes drills." },
  { href: "/plugins", label: "Plugins", description: "Custom primitives and rules." },
  { href: "/enterprise", label: "Enterprise", description: "Cohorts, ADRs, and SLA math." },
  { href: "/wiki", label: "Wiki", description: "Concept articles and diagrams." },
  { href: "/reference/numbers", label: "Numbers", description: "Latency and throughput claims." },
  { href: "/play", label: "Play", description: "Game modes and drills." },
  { href: "/progress", label: "Progress", description: "Your saved designs and scores." },
  { href: "/settings", label: "Settings", description: "Preferences and keys." },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/canvas") return pathname === "/canvas" || pathname.startsWith("/canvas/");
  if (href === "/wiki") return pathname === "/wiki" || pathname.startsWith("/wiki/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function LogoMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="24" height="24" rx="7" stroke="rgb(var(--content-tertiary))" strokeWidth="1.2" />
      <circle cx="8" cy="8.5" r="2" fill="rgb(var(--content))" />
      <circle cx="18" cy="8.5" r="2" fill="rgb(var(--content-secondary))" />
      <circle cx="13" cy="18" r="2" fill="rgb(var(--content-tertiary))" />
      <path d="M9.6 9.7 12 15.9M16.4 9.7 14 15.9M10 8.5h6" stroke="rgb(var(--content-tertiary))" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [moreOpen]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-line/60 bg-ink/90">
      <div className="section-container flex h-12 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2" aria-label="SysCraft home">
          <LogoMark />
          <span className="text-[14px] font-semibold tracking-tight text-content">SysCraft</span>
        </Link>

        <nav className="hidden items-center gap-3 lg:flex" aria-label="Primary">
          {PRIMARY_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative py-1 text-[12.5px] font-medium transition-colors ${
                  active ? "text-content" : "text-content-secondary hover:text-content"
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute inset-x-0 -bottom-[9px] h-px bg-brass" />
                )}
              </Link>
            );
          })}

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className="inline-flex items-center gap-1 py-1 text-[13px] font-medium text-content-secondary transition-colors hover:text-content"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
            >
              More
              <ChevronDown size={12} />
            </button>
            {moreOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-60 rounded-md border border-line bg-app p-2 shadow-card"
              >
                {MORE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    className="block rounded px-3 py-2 transition-colors hover:bg-app-raised"
                    onClick={() => setMoreOpen(false)}
                  >
                    <span className="block text-[13px] font-medium text-content">{link.label}</span>
                    <span className="block text-[12px] text-content-tertiary">{link.description}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <Link
            href="/canvas"
            className="text-[13px] font-medium text-content-secondary transition-colors hover:text-content"
          >
            Open canvas
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex h-8 w-8 items-center justify-center text-content-secondary transition-colors hover:text-content lg:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-line/60 bg-ink lg:hidden max-h-[70vh] overflow-y-auto"
            aria-label="Mobile"
          >
            <div className="section-container flex flex-col gap-1 py-4">
              {PRIMARY_LINKS.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block py-2 text-[14px] font-medium transition-colors ${
                      active ? "text-content" : "text-content-secondary"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <Link
                href="/canvas"
                className="block py-2 text-[14px] font-medium text-content-secondary"
              >
                Open canvas
              </Link>
              <div className="mt-2 border-t border-line/60 pt-2">
                <p className="py-1 text-[11px] uppercase tracking-[0.16em] text-content-tertiary">More</p>
                {MORE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block py-2"
                  >
                    <span className="block text-[14px] font-medium text-content">{link.label}</span>
                    <span className="block text-[12px] text-content-tertiary">{link.description}</span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
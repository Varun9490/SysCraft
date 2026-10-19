'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu, X } from "@/components/ui/icons";

/**
 * Four verbs, four destinations — no mode-flavored word soup. Everything else
 * (practice, play, topics, flowchart, cloud drills, rooms) stays reachable
 * from the surfaces it serves and from the footer, not from the top bar.
 */
const NAV_LINKS = [
  { href: "/learn", label: "Learn" },
  { href: "/canvas", label: "Design" },
  { href: "/labs", label: "Labs" },
  { href: "/wiki", label: "Reference" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/canvas") return pathname === "/canvas" || pathname.startsWith("/canvas/");
  if (href === "/wiki") return pathname === "/wiki" || pathname.startsWith("/wiki/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="24" height="24" rx="7" stroke="url(#sc-logo-a)" strokeWidth="1.5" />
      <circle cx="8" cy="8.5" r="2" fill="#E6CC9F" />
      <circle cx="18" cy="8.5" r="2" fill="#9A7642" />
      <circle cx="13" cy="18" r="2" fill="#CDA86A" />
      <path d="M9.6 9.7 12 15.9M16.4 9.7 14 15.9M10 8.5h6" stroke="rgba(168,162,150,0.55)" strokeWidth="1.2" strokeLinecap="round" />
      <defs>
        <linearGradient id="sc-logo-a" x1="0" y1="0" x2="26" y2="26">
          <stop stopColor="#E6CC9F" />
          <stop offset="1" stopColor="#9A7642" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-all duration-300 ${
        scrolled || mobileOpen
          ? "border-zinc-800/70 bg-zinc-950/85 backdrop-blur-xl"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="section-container flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="SysCraft home">
          <LogoMark />
          <span className="text-[15px] font-semibold tracking-tight text-zinc-100">
            Sys<span className="text-brass">Craft</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  active ? "text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {link.label}
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute inset-x-3 -bottom-0.5 h-px bg-brass"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2.5 md:flex">
          <Link
            href="/reference/numbers"
            className="hidden text-[13px] font-medium text-zinc-400 transition-colors hover:text-zinc-200 lg:inline-flex"
          >
            Numbers
          </Link>
          <Link
            href="/canvas"
            className="group inline-flex items-center gap-1.5 rounded-full bg-brass px-4 py-1.5 text-[13px] font-semibold text-zinc-950 shadow-card transition-transform hover:scale-[1.03]"
          >
            Open Canvas
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 md:hidden"
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
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-zinc-800/70 bg-zinc-950/95 backdrop-blur-xl md:hidden"
            aria-label="Mobile"
          >
            <div className="section-container flex flex-col gap-1 py-4">
              {NAV_LINKS.map((link, index) => {
                const active = isActive(pathname, link.href);
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.25 }}
                  >
                    <Link
                      href={link.href}
                      className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        active ? "bg-zinc-800/70 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: NAV_LINKS.length * 0.05, duration: 0.25 }}
                className="mt-2"
              >
                <Link
                  href="/canvas"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-brass px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-card"
                >
                  Open Canvas
                  <ArrowRight size={14} />
                </Link>
              </motion.div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

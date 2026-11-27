'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "@/components/ui/icons";

/** Primary verbs. Everything else lives in the panel or the footer index. */
const PRIMARY_LINKS = [
  { href: "/paths", label: "Paths" },
  { href: "/blogs", label: "Blogs" },
  { href: "/labs", label: "Labs" },
  { href: "/map", label: "Map" },
  { href: "/tools", label: "Tools" },
  { href: "/quiz", label: "Quiz" },
] as const;

const LIBRARY_LINKS = [
  { href: "/encyclopedia", label: "Encyclopedia" },
  { href: "/learn", label: "Learn" },
  { href: "/wiki", label: "Wiki" },
  { href: "/reference/numbers", label: "Numbers & claims" },
] as const;

function isActive(pathname: string, href: string): boolean {
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
  // Keyed by pathname: navigating away closes the panel on the next render
  // without needing a synchronous state reset in an effect.
  const [menuState, setMenuState] = useState<{ pathname: string; open: boolean } | null>(null);
  const menuOpen = menuState !== null && menuState.pathname === pathname && menuState.open;

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuState(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-line/60 bg-ink/90 backdrop-blur-xl">
      <div className="section-container flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="SysCraft home">
          <LogoMark />
          <span className="text-[15px] font-medium tracking-tight text-content">
            Sys<span className="text-brass">Craft</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {PRIMARY_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors ${
                  active ? "text-content" : "text-content-tertiary hover:text-content"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/encyclopedia"
            aria-current={isActive(pathname, "/encyclopedia") ? "page" : undefined}
            className={`rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors ${
              isActive(pathname, "/encyclopedia") ? "text-content" : "text-content-tertiary hover:text-content"
            }`}
          >
            Library
          </Link>
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <Link
            href="/canvas"
            className="group inline-flex items-center gap-1.5 text-[12.5px] font-medium text-content-secondary transition-colors hover:text-brass"
          >
            Open canvas
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMenuState({ pathname, open: !menuOpen })}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line/70 text-content-secondary transition-colors hover:border-brass/50 hover:text-content lg:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="site-menu-panel"
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {menuOpen && (
        <nav
          id="site-menu-panel"
          aria-label="Site menu"
          className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-line/60 bg-ink/95 px-6 pb-7 pt-5 backdrop-blur-xl lg:hidden"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-content-tertiary">Explore</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg border px-3 py-2.5 text-[13px] transition-colors ${
                  isActive(pathname, link.href)
                    ? "border-brass/40 text-content"
                    : "border-line/60 text-content-secondary hover:border-line-strong hover:text-content"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.2em] text-content-tertiary">Library</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {LIBRARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg border px-3 py-2.5 text-[13px] transition-colors ${
                  isActive(pathname, link.href)
                    ? "border-brass/40 text-content"
                    : "border-line/60 text-content-secondary hover:border-line-strong hover:text-content"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.2em] text-content-tertiary">Workspace</p>
          <Link
            href="/canvas"
            className="mt-3 flex items-center justify-between rounded-lg border border-brass/40 bg-brass/[0.06] px-3 py-2.5 text-[13px] font-medium text-content transition-colors hover:bg-brass/[0.1]"
          >
            Open canvas
            <ArrowRight size={14} className="text-brass" />
          </Link>
        </nav>
      )}
    </header>
  );
}

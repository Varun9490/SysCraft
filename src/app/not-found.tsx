import Link from "next/link";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { ArrowRight } from "@/components/ui/icons";

/**
 * Branded 404 for static export. This is a Server Component with no browser
 * globals at module scope, so it prerenders to `out/404.html` cleanly. Next
 * injects `noindex` on not-found responses automatically; we deliberately do
 * not emit a canonical here.
 */
const RECOVERY_LINKS = [
  {
    href: "/",
    label: "Home",
    detail: "Back to the starting line and the full overview.",
  },
  {
    href: "/paths",
    label: "Learning paths",
    detail: "The primary seven-track curriculum, in order.",
  },
  {
    href: "/map",
    label: "Knowledge map",
    detail: "See how the tracks, prerequisites, and labs connect.",
  },
  {
    href: "/labs",
    label: "Guided labs",
    detail: "Design a real system and run it under load.",
  },
  {
    href: "/tools",
    label: "Tools",
    detail: "Capacity, cache, error-budget, and notation helpers.",
  },
  {
    href: "/blogs",
    label: "Field notes",
    detail: "Short write-ups on the trade-offs behind real systems.",
  },
] as const;

export default function NotFound() {
  return (
    <SiteChrome>
      <main className="section-container flex min-h-[60vh] flex-col justify-center py-20">
        <p className="eyebrow">
          <span className="h-1.5 w-1.5 rounded-full bg-brass" />
          404 · Route not found
        </p>
        <h1 className="mt-6 max-w-2xl text-balance text-4xl font-semibold leading-[1.06] tracking-tight text-content md:text-5xl">
          This part of the canvas is empty.
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-[15px] leading-relaxed text-content-secondary">
          The page you asked for does not exist at this address. Nothing was lost — your local progress and designs
          stay in this browser. Pick a well-known route below to get back on track.
        </p>

        <section aria-label="Recommended pages" className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {RECOVERY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex h-full flex-col rounded-2xl border border-line bg-app/50 p-5 shadow-card transition-colors hover:border-brass/50"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-[14px] font-medium text-content">{link.label}</span>
                <ArrowRight
                  size={15}
                  className="shrink-0 text-content-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-brass"
                />
              </span>
              <span className="mt-2 flex-1 text-[13px] leading-relaxed text-content-secondary">{link.detail}</span>
              <span className="mt-3 font-mono text-[11px] text-brass">{link.href}</span>
            </Link>
          ))}
        </section>

        <p className="mt-10 text-[12px] leading-relaxed text-content-tertiary">
          Followed an old link? The archive at <Link href="/learn" className="underline decoration-line-strong underline-offset-4 hover:text-content">/learn</Link>{" "}
          still holds the earlier lessons, but the seven guided paths are the current curriculum.
        </p>
      </main>
    </SiteChrome>
  );
}

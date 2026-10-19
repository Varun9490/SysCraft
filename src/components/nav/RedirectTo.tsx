'use client';

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "./SiteHeader";
import { ArrowRight } from "@/components/ui/icons";

/**
 * Static-export-friendly redirect: real static HTML with an honest notice is
 * rendered for crawlers and no-JS visitors, then clients hop to the new
 * location. Production traffic gets a true 301 from vercel.json — this page
 * only matters for local dev and statically-hosted mirrors.
 */
export function RedirectTo({
  href,
  name,
}: {
  href: string;
  /** Human label, e.g. "learning path". Defaults to the href slug. */
  name?: string;
}) {
  const router = useRouter();
  const label = name ?? href.split("/").filter(Boolean).join(" ") ?? "";

  useEffect(() => {
    const timer = window.setTimeout(() => router.replace(href), 120);
    return () => window.clearTimeout(timer);
  }, [href, router]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-ink px-6 text-center">
      <Link href="/" className="flex items-center gap-2.5" aria-label="SysCraft home">
        <LogoMark />
        <span className="text-[15px] font-semibold tracking-tight text-content">
          Sys<span className="text-brass">Craft</span>
        </span>
      </Link>
      <p className="max-w-md text-[14px] leading-relaxed text-content-secondary">
        The {label} has moved. Taking you there…
      </p>
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-full bg-brass px-5 py-2.5 text-sm font-semibold text-ink shadow-card transition-transform hover:scale-[1.03]"
      >
        Go to the {label || "destination"}
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

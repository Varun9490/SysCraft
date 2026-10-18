import Link from "next/link";
import { RedirectToWiki } from "@/components/wiki/RedirectToWiki";
import { SiteChrome } from "@/components/nav/SiteChrome";

export const metadata = {
  title: "Encyclopedia moved — SysCraft Wiki",
  description: "The SysCraft encyclopedia now lives at /wiki.",
};

export default function EncyclopediaPage() {
  return (
    <SiteChrome>
      <div className="section-container flex flex-col items-center justify-center py-24 text-center">
        <RedirectToWiki />
        <p className="text-[13px] text-zinc-400">The encyclopedia moved to its single home.</p>
        <Link
          href="/wiki"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brass/40 bg-brass/10 px-4 py-2 text-[13px] font-semibold text-brass-bright transition-colors hover:border-brass/70"
        >
          Open the wiki <span aria-hidden="true">→</span>
        </Link>
      </div>
    </SiteChrome>
  );
}

import Link from "next/link";
import { SiteChrome } from "@/components/nav/SiteChrome";

export const metadata = {
  title: "Encyclopedia moved — SysCraft knowledge map",
  description:
    "The encyclopedia has moved to the knowledge map at /map. The original articles are still available in the wiki at /wiki.",
};

export default function EncyclopediaPage() {
  return (
    <SiteChrome>
      <div className="section-container flex flex-col items-center justify-center py-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-content">
          The encyclopedia has moved
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-content-secondary">
          Explore the new knowledge map, or keep reading the original encyclopedia in the wiki.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/map"
            className="inline-flex items-center gap-1.5 rounded-full border border-brass/40 bg-brass/10 px-4 py-2 text-[13px] font-semibold text-brass-bright transition-colors hover:border-brass/70"
          >
            Open the knowledge map <span aria-hidden="true">→</span>
          </Link>
          <Link
            href="/wiki"
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[13px] font-semibold text-content-secondary transition-colors hover:text-content"
          >
            Open the wiki <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </SiteChrome>
  );
}

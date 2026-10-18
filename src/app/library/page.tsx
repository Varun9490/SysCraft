import Link from "next/link";
import { BookOpen } from "@phosphor-icons/react/dist/ssr";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { LibraryGrid } from "@/components/library/LibraryGrid";
import { LIBRARY_RESOURCES } from "@/data/learningHub";

export const metadata = {
  title: "Library — 16 Canonical Learning Sources | SysCraft",
  description:
    "Sixteen creator-vetted free sources across DSA, system design, backend, AI, DevOps, cloud, languages, and open source — each paired with an interactive SysCraft companion.",
};

export default function LibraryPage() {
  return (
    <SiteChrome>
      <div className="section-container py-10">
        <header>
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-brass">
            <BookOpen size={13} /> The library shelf
          </p>
          <h1 className="mt-2 bg-gradient-to-r from-zinc-50 via-zinc-200 to-zinc-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent md:text-5xl">
            Sixteen sources. No filler.
          </h1>
          <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-zinc-400">
            Every card is a canonical track others copy from — a zero-to-pro DSA ladder, the system design primer,
            Microsoft&apos;s AI course, official language docs. Hover a card for why it earned shelf space, open the
            syllabus to see the route inside, then pair it with the SysCraft module that turns the reading into a system
            you can break.
          </p>
        </header>

        <div className="mt-8">
          <LibraryGrid />
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-[12px] leading-relaxed text-zinc-600">
          ”Mark done” stays on this device. The {LIBRARY_RESOURCES.length} sources are external and free; interactive
          practice is native — start at the{" "}
          <Link href="/learn" className="text-sky-400 hover:text-sky-300">
            learning path
          </Link>{" "}
          or drop straight into the{" "}
          <Link href="/canvas" className="text-sky-400 hover:text-sky-300">
            canvas workspace
          </Link>
          .
        </p>
      </div>
    </SiteChrome>
  );
}

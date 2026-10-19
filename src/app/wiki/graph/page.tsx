import Link from "next/link";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { KnowledgeGraph } from "@/components/wiki/KnowledgeGraph";

export const metadata = {
  title: "Knowledge graph — wiki",
  description:
    "The SysCraft concept graph: every encyclopedia topic mapped by difficulty and relation, shaded by your spaced-repetition mastery.",
};

export default function WikiGraphPage() {
  return (
    <SiteChrome>
      <div className="section-container py-10">
        <header className="mb-8 max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Encyclopedia</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-50">Knowledge Graph</h1>
          <p className="mt-3 text-[14.5px] leading-relaxed text-zinc-400">
            Concepts are grouped by difficulty and linked where they relate. Node color reflects your FSRS mastery for that
            module: grey means untouched, amber means in review, emerald means stable recall. Click any node to read the concept;{" "}
            <Link href="/progress" className="text-sky-300 hover:text-sky-200">
              progress
            </Link>{" "}
            shows the full mastery forecast.
          </p>
        </header>
        <KnowledgeGraph />
      </div>
    </SiteChrome>
  );
}

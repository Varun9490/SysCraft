import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { ConceptReader } from "@/components/wiki/ConceptReader";
import { ENCYCLOPEDIA_MODULES, getEncyclopediaModule } from "@/data/encyclopediaData";

/**
 * Static concept pages: every /wiki/[concept] route is pre-rendered from the
 * same single source of truth used by the Almanac modal, the labs, and the
 * Design Doctor's "read:" links.
 */

export function generateStaticParams() {
  return ENCYCLOPEDIA_MODULES.map((module) => ({ concept: module.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ concept: string }>;
}): Promise<Metadata> {
  const { concept } = await params;
  const module = getEncyclopediaModule(concept);
  if (!module) return { title: "Concept — SysCraft Wiki" };
  return {
    title: `${module.title} — SysCraft Wiki`,
    description: module.summary,
  };
}

export default async function ConceptPage({ params }: { params: Promise<{ concept: string }> }) {
  const { concept } = await params;
  const module = getEncyclopediaModule(concept);
  if (!module) notFound();

  return (
    <SiteChrome>
      <div className="section-container py-10">
        <nav className="mb-6 text-[12.5px] text-zinc-500" aria-label="Breadcrumb">
          <Link href="/wiki" className="hover:text-zinc-300">
            Wiki
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">{module.title}</span>
        </nav>
        <ConceptReader module={module} />
      </div>
    </SiteChrome>
  );
}

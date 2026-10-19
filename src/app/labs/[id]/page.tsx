import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { LabBrief } from "@/components/labs/LabBrief";
import { GUIDED_LABS } from "@/data/guidedLabs";
import { formatRps, labCleanTitle } from "@/data/labMeta";
import { labLevel } from "@/data/labLevels";

/**
 * Lab landing page: crawlers and no-JS visitors get the full SSR brief
 * (scenario, numbers, rubric, stage ladder). Only the interactive canvas
 * lazy-loads behind the Start button — see LabBrief.
 */

export function generateStaticParams() {
  return GUIDED_LABS.map((lab) => ({ id: lab.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const lab = GUIDED_LABS.find((entry) => entry.id === id);
  if (!lab) return { title: "Lab — SysCraft" };

  const level = labLevel(lab.difficulty);
  const title = `${labCleanTitle(lab)} — Design lab`;
  const description =
    lab.briefMarkdown
      .split("\n")
      .map((line) => line.replace(/[#*`>-]/g, "").trim())
      .find((line) => line.length > 40) ??
    `Design ${labCleanTitle(lab)} under real load: target ${formatRps(lab.targetRps)}, p99 under ${lab.sloP99Ms} ms, within $${lab.budgetUsdPerHour}/hr.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      section: "Labs",
      tags: [lab.title, level.badge, "system design interview"],
    },
    twitter: { card: "summary_large_image" as const },
  };
}

export default async function LabWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lab = GUIDED_LABS.find((entry) => entry.id === id);
  if (!lab) notFound();
  return (
    <SiteChrome>
      <LabBrief lab={lab} />
    </SiteChrome>
  );
}

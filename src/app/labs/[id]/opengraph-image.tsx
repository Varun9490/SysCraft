import { renderOgCard } from "@/lib/og";
import { GUIDED_LABS } from "@/data/guidedLabs";
import { formatRps, labCleanTitle } from "@/data/labMeta";
import { labLevel } from "@/data/labLevels";

/** Per-lab OG card: the numbers that make the card worth clicking. */

export const dynamic = "force-static";

export const alt = "SysCraft design lab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return GUIDED_LABS.map((lab) => ({ id: lab.id }));
}

export default async function LabOgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lab = GUIDED_LABS.find((entry) => entry.id === id);

  if (!lab) {
    return renderOgCard({
      badge: "DESIGN LAB",
      title: "System Design Labs",
      subtitle: "Hands-on labs modeled on real architectures.",
    });
  }

  const level = labLevel(lab.difficulty);
  return renderOgCard({
    badge: `${level.badge.toUpperCase()} DESIGN LAB`,
    title: labCleanTitle(lab),
    subtitle: `${lab.company} architecture — design it, run it under load, and fix what breaks before the grader does.`,
    stats: [
      formatRps(lab.targetRps),
      `p99 ${lab.sloP99Ms} ms`,
      `$${lab.budgetUsdPerHour}/hr`,
      `${lab.stages.length} stages · ${lab.estimatedMinutes} min`,
    ],
  });
}

import { renderOgCard } from "@/lib/og";
import { ENCYCLOPEDIA_MODULES, getEncyclopediaModule } from "@/data/encyclopediaData";

/** Per-wiki-article OG card. */

export const dynamic = "force-static";

export const alt = "SysCraft wiki deep dive";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return ENCYCLOPEDIA_MODULES.map((module) => ({ concept: module.id }));
}

export default async function WikiOgImage({
  params,
}: {
  params: Promise<{ concept: string }>;
}) {
  const { concept } = await params;
  const module = getEncyclopediaModule(concept);

  if (!module) {
    return renderOgCard({
      badge: "SYSTEM DESIGN WIKI",
      title: "SysCraft Wiki",
      subtitle: "This topic is not in the wiki.",
    });
  }

  const summary = module.summary.length > 150 ? `${module.summary.slice(0, 147)}...` : module.summary;
  return renderOgCard({
    badge: "SYSTEM DESIGN WIKI",
    title: module.title,
    subtitle: summary,
  });
}

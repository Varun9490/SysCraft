import type { Metadata } from "next";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { KnowledgeMap } from "@/components/platform/player/KnowledgeMap";

export const metadata: Metadata = {
  title: "Knowledge map",
  description: "A pannable map of the seven learning tracks, prerequisites, and your local mastery.",
};

export default function MapPage() {
  return (
    <SiteChrome>
      <KnowledgeMap />
    </SiteChrome>
  );
}

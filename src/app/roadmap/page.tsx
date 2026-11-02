import type { Metadata } from "next";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { RoadmapPageContent } from "@/components/learn/RoadmapPageContent";

export const metadata: Metadata = {
  title: "System design roadmap",
  description:
    "The whole SysCraft curriculum on one page: every part, every module, and your progress through it.",
  openGraph: {
    title: "System design roadmap — SysCraft",
    description: "The whole curriculum on one page, with progress.",
    type: "website",
    url: "/roadmap",
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/roadmap" },
};

export default function RoadmapPage() {
  return (
    <SiteChrome>
      <RoadmapPageContent />
    </SiteChrome>
  );
}

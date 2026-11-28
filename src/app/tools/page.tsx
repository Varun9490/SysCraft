import type { Metadata } from "next";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { ToolsStudio } from "@/components/platform/player/ToolsStudio";
import { canonicalAlternates, routeCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Tools",
  description: "Working capacity, KV-cache, error-budget, notation, and security-checklist tools.",
  ...canonicalAlternates("tools"),
  openGraph: {
    title: "Tools",
    description: "Working capacity, KV-cache, error-budget, notation, and security-checklist tools.",
    url: routeCanonical("tools"),
  },
};

export default function ToolsPage() {
  return (
    <SiteChrome>
      <ToolsStudio />
    </SiteChrome>
  );
}

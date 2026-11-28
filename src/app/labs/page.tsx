import type { Metadata } from "next";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { LabsPageContent } from "@/components/labs/LabsPageContent";
import { CONTENT_COUNTS } from "@/data/contentManifest";
import { canonicalAlternates, routeCanonical } from "@/lib/seo";

const DESCRIPTION = `${CONTENT_COUNTS.labs} hands-on labs modeled on real-world architectures: Bitly, YouTube, WhatsApp, Uber, Netflix, Stripe and more — with graded SLOs, budgets, and chaos drills.`;

export const metadata: Metadata = {
  title: "System Design Labs",
  description: DESCRIPTION,
  ...canonicalAlternates("labs"),
  openGraph: {
    title: "System Design Labs",
    description: DESCRIPTION,
    url: routeCanonical("labs"),
  },
};

export default function LabsPage() {
  return (
    <SiteChrome>
      <LabsPageContent />
    </SiteChrome>
  );
}

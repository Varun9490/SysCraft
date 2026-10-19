import { SiteChrome } from "@/components/nav/SiteChrome";
import { LabsPageContent } from "@/components/labs/LabsPageContent";
import { CONTENT_COUNTS } from "@/data/contentManifest";

export const metadata = {
  title: "System Design Labs",
  description: `${CONTENT_COUNTS.labs} hands-on labs modeled on real-world architectures: Bitly, YouTube, WhatsApp, Uber, Netflix, Stripe and more — with graded SLOs, budgets, and chaos drills.`,
};

export default function LabsPage() {
  return (
    <SiteChrome>
      <LabsPageContent />
    </SiteChrome>
  );
}

import { SiteChrome } from "@/components/nav/SiteChrome";
import { LabsPageContent } from "@/components/labs/LabsPageContent";

export const metadata = {
  title: "System Design Labs — SysCanvas",
  description:
    "Sixteen hands-on labs modeled on real-world architectures: Bitly, YouTube, WhatsApp, Uber, Netflix, Stripe and more.",
};

export default function LabsPage() {
  return (
    <SiteChrome>
      <LabsPageContent />
    </SiteChrome>
  );
}

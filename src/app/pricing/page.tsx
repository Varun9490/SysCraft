import type { Metadata } from "next";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { PricingPageContent } from "@/components/pricing/PricingPageContent";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple plans. Your designs stay in this browser.",
};

export default function PricingPage() {
  return (
    <SiteChrome>
      <PricingPageContent />
    </SiteChrome>
  );
}
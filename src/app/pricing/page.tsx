import type { Metadata } from "next";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { PricingPageContent } from "@/components/pricing/PricingPageContent";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple plans. Your designs stay in this browser.",
  openGraph: {
    title: "Pricing — SysCraft",
    description: "Simple plans. Your designs stay in this browser.",
    type: "website",
    url: "/pricing",
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <SiteChrome>
      <PricingPageContent />
    </SiteChrome>
  );
}
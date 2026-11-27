import type { Metadata } from "next";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { PricingPageContent } from "@/components/pricing/PricingPageContent";

export const metadata: Metadata = {
  title: "Free",
  description:
    "Everything on SysCraft is free, local-first, and usable without an account. Progress lives in your browser and can be exported from the study dock.",
  openGraph: {
    title: "Free — SysCraft",
    description:
      "Everything on SysCraft is free, local-first, and usable without an account.",
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

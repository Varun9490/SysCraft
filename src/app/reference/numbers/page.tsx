import type { Metadata } from "next";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { NumbersPageContent } from "@/components/reference/NumbersPageContent";

export const metadata: Metadata = {
  title: "Numbers & claims — the reference rack",
  description:
    "The latency ladder backed by sources, machine limits, decision thresholds, and every load-bearing claim SysCraft makes — each with a source and an as-of date.",
  openGraph: {
    title: "Numbers & claims — the reference rack",
    description:
      "Latency ladder, machine limits, and the claims register behind the site: every number with provenance.",
    type: "article",
  },
  twitter: { card: "summary_large_image" as const },
};

export default function ReferenceNumbersPage() {
  return (
    <SiteChrome>
      <NumbersPageContent />
    </SiteChrome>
  );
}

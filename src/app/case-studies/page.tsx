import type { Metadata } from "next";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { CaseStudiesPageContent } from "@/components/case-studies/CaseStudiesPageContent";

export const metadata: Metadata = {
  title: "System design case studies",
  description:
    "Real systems, end to end: URL shortener, payments, chat, feeds, RAG, Kubernetes, multi-region. Open any blueprint on the canvas and break it.",
  openGraph: {
    title: "System design case studies — SysCraft",
    description:
      "Real systems, end to end: URL shortener, payments, chat, feeds, RAG, Kubernetes, multi-region.",
    type: "website",
    url: "/case-studies",
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/case-studies" },
};

export default function CaseStudiesPage() {
  return (
    <SiteChrome>
      <CaseStudiesPageContent />
    </SiteChrome>
  );
}

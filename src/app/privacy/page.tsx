import type { Metadata } from "next";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { PrivacyPageContent } from "@/components/privacy/PrivacyPageContent";

export const metadata: Metadata = {
  title: "Privacy — what leaves the browser",
  description:
    "The full data inventory: what SysCraft stores locally, and the exact external services invoked — only when you choose to — from AI review with your own key to live-room signaling.",
  openGraph: {
    title: "Privacy — what leaves the browser",
    description: "Every byte this app stores and every host it can call, named precisely.",
    type: "article",
  },
  twitter: { card: "summary_large_image" as const },
};

export default function PrivacyPage() {
  return (
    <SiteChrome>
      <PrivacyPageContent />
    </SiteChrome>
  );
}

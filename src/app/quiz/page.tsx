import type { Metadata } from "next";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { QuizDeck } from "@/components/platform/player/QuizDeck";
import { canonicalAlternates, routeCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Recall quiz",
  description: "Spaced recall from the lessons and field notes you have already read locally.",
  ...canonicalAlternates("quiz"),
  openGraph: {
    title: "Recall quiz",
    description: "Spaced recall from the lessons and field notes you have already read locally.",
    url: routeCanonical("quiz"),
  },
};

export default function QuizPage() {
  return (
    <SiteChrome>
      <QuizDeck />
    </SiteChrome>
  );
}

import { EncyclopediaPageContent } from "@/components/encyclopedia/EncyclopediaPageContent";
import { SiteChrome } from "@/components/nav/SiteChrome";

export const metadata = {
  title: "Encyclopedia — SysCanvas",
  description:
    "19 concept modules with trade-off matrices, spaced-repetition flashcards, quizzes, and interactive algorithm visualizations.",
};

export default function EncyclopediaPage() {
  return (
    <SiteChrome>
      <EncyclopediaPageContent />
    </SiteChrome>
  );
}

import { SiteChrome } from "@/components/nav/SiteChrome";
import { EncyclopediaPageContent } from "@/components/encyclopedia/EncyclopediaPageContent";

export const metadata = {
  title: "Wiki — the system design encyclopedia",
  description:
    "The SysCraft encyclopedia: concept modules with trade-off matrices, spaced-repetition flashcards, quizzes, and interactive algorithm visualizations.",
};

export default function WikiPage() {
  return (
    <SiteChrome>
      <EncyclopediaPageContent />
    </SiteChrome>
  );
}

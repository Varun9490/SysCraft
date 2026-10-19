import { SiteChrome } from "@/components/nav/SiteChrome";
import { PathPageContent } from "@/components/path/PathPageContent";

export const metadata = {
  title: "System Design Learning Path",
  description:
    "The full SysCraft curriculum: the delivery framework, foundations in the order a growing app needs them, distributed systems, and under-the-hood algorithms.",
  openGraph: {
    title: "System Design Learning Path",
    description:
      "The full SysCraft curriculum: the delivery framework, foundations in the order a growing app needs them, distributed systems, and under-the-hood algorithms.",
    type: "article",
  },
  twitter: { card: "summary_large_image" as const },
};

export default function LearnPage() {
  return (
    <SiteChrome>
      <PathPageContent />
    </SiteChrome>
  );
}

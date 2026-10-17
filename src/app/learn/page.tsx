import { SiteChrome } from "@/components/nav/SiteChrome";
import { PathPageContent } from "@/components/path/PathPageContent";

export const metadata = {
  title: "Learn — SysCraft Learning Path",
  description:
    "The full SysCraft curriculum: 20 modules and 137 lessons from how the internet works to distributed systems, Kubernetes, and AI/RAG architecture.",
};

export default function LearnPage() {
  return (
    <SiteChrome>
      <PathPageContent />
    </SiteChrome>
  );
}

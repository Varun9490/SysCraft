import { SiteChrome } from "@/components/nav/SiteChrome";
import { PathPageContent } from "@/components/path/PathPageContent";

export const metadata = {
  title: "Learning Path — SysCanvas",
  description:
    "19 modules and 137 lessons, from one server to distributed systems, in the order a growing application needs them.",
};

export default function PathPage() {
  return (
    <SiteChrome>
      <PathPageContent />
    </SiteChrome>
  );
}

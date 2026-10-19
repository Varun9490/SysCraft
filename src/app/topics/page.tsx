import type { Metadata } from "next";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { TopicsIndexContent } from "@/components/topics/TopicsIndexContent";

export const metadata: Metadata = {
  title: "Interactive topics",
  description:
    "Turn the dials on system design concepts: consistent hashing, load balancing, caching, rate limiting, sharding, and CDNs — every parameter live.",
};

export default function TopicsPage() {
  return (
    <SiteChrome>
      <TopicsIndexContent />
    </SiteChrome>
  );
}

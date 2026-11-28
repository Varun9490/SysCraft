import type { Metadata } from "next";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { BlogsIndex } from "@/components/platform/player/BlogsIndex";
import { canonicalAlternates, routeCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Field notes",
  description: "Short, focused write-ups on the trade-offs behind real systems.",
  ...canonicalAlternates("blogs"),
  openGraph: {
    title: "Field notes",
    description: "Short, focused write-ups on the trade-offs behind real systems.",
    url: routeCanonical("blogs"),
  },
};

export default function BlogsPage() {
  return (
    <SiteChrome>
      <BlogsIndex />
    </SiteChrome>
  );
}

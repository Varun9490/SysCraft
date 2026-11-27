import type { Metadata } from "next";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { BlogsIndex } from "@/components/platform/player/BlogsIndex";

export const metadata: Metadata = {
  title: "Field notes",
  description: "Short, focused write-ups on the trade-offs behind real systems.",
};

export default function BlogsPage() {
  return (
    <SiteChrome>
      <BlogsIndex />
    </SiteChrome>
  );
}

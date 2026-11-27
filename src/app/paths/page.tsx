import type { Metadata } from "next";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { PathsIndex } from "@/components/platform/player/PathsIndex";

export const metadata: Metadata = {
  title: "Learning paths",
  description: "Seven guided system-design tracks with story and engineering explanations side by side.",
};

export default function PathsPage() {
  return (
    <SiteChrome>
      <PathsIndex />
    </SiteChrome>
  );
}

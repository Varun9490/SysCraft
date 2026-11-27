import type { Metadata } from "next";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { ToolsStudio } from "@/components/platform/player/ToolsStudio";

export const metadata: Metadata = {
  title: "Tools",
  description: "Working capacity, KV-cache, error-budget, notation, and security-checklist tools.",
};

export default function ToolsPage() {
  return (
    <SiteChrome>
      <ToolsStudio />
    </SiteChrome>
  );
}

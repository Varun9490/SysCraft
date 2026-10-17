import { SiteChrome } from "@/components/nav/SiteChrome";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export const metadata = {
  title: "Settings — AI Tiers, Practice & Data | SysCraft",
  description:
    "Configure the three-tier AI engine (offline heuristics, BYOK cloud, WebGPU local), FSRS practice scheduling, canvas accessibility, and full local-data export, import, or deletion.",
};

export default function SettingsPage() {
  return (
    <SiteChrome>
      <div className="section-container py-10">
        <SettingsPanel />
      </div>
    </SiteChrome>
  );
}

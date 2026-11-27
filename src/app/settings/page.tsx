import { LearnerDataPanel } from "@/components/platform/settings/LearnerDataPanel";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export const metadata = {
  title: "Settings — learning, AI and data",
  description:
    "Set learning preferences, export or import browser-local progress, and configure the three-tier AI engine, FSRS practice scheduling, canvas accessibility, and full local-data controls.",
};

export default function SettingsPage() {
  return (
    <SiteChrome>
      <div className="section-container py-10">
        <div className="space-y-8">
          <LearnerDataPanel />
          <SettingsPanel />
        </div>
      </div>
    </SiteChrome>
  );
}

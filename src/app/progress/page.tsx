import { SiteChrome } from "@/components/nav/SiteChrome";
import { ProgressDashboard } from "@/components/progress/ProgressDashboard";
import { CONTENT_COUNTS } from "@/data/contentManifest";

export const metadata = {
  title: "Progress — mastery map",
  description: `Your mastery map across the full curriculum (${CONTENT_COUNTS.modules} modules, ${CONTENT_COUNTS.lessons} lessons): FSRS card states, prediction-drill accuracy, guided lab grades, play records, a weekly rhythm tracker, and an on-device retention estimate.`,
};

export default function ProgressPage() {
  return (
    <SiteChrome>
      <div className="section-container py-10">
        <ProgressDashboard />
      </div>
    </SiteChrome>
  );
}

import { SiteChrome } from "@/components/nav/SiteChrome";
import { ProgressDashboard } from "@/components/progress/ProgressDashboard";

export const metadata = {
  title: "Progress — Mastery Map | SysCraft",
  description:
    "Your mastery map across the 19-module curriculum: FSRS card states, guided lab grades, play records, a weekly rhythm tracker, and an on-device retention estimate.",
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

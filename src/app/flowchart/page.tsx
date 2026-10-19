import { SiteChrome } from "@/components/nav/SiteChrome";
import { FlowchartWizard } from "@/components/flowchart/FlowchartWizard";

export const metadata = {
  title: "Design flowchart — pattern picker",
  description:
    "Walk a decision tree from product shape to canonical architecture pattern. Sixteen runnable presets — CDN read paths, hybrid timelines, RAG services, agent workflows — each loadable into the canvas in one click.",
};

export default function FlowchartPage() {
  return (
    <SiteChrome>
      <div className="section-container py-10">
        <FlowchartWizard />
      </div>
    </SiteChrome>
  );
}

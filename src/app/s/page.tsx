import { SiteChrome } from "@/components/nav/SiteChrome";
import { ShareViewer } from "@/components/share/ShareViewer";

export const metadata = {
  title: "Shared design viewer",
  description:
    "A SysCraft architecture design, carried entirely in the link. Preview the topology, open a simulated copy in your own canvas, or download it as a .syscraft.json file.",
};

export default function SharePage() {
  return (
    <SiteChrome>
      <div className="section-container py-10">
        <ShareViewer />
      </div>
    </SiteChrome>
  );
}

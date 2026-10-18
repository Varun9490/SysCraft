import { SiteChrome } from "@/components/nav/SiteChrome";
import { StartPageContent } from "@/components/start/StartPageContent";

export const metadata = {
  title: "Start here — SysCraft",
  description:
    "A guided eight-step ramp from zero to a running, breakable system: read a concept, move the dials, load a real architecture, run it, break it, and lock it in with a lab.",
};

export default function StartPage() {
  return (
    <SiteChrome>
      <StartPageContent />
    </SiteChrome>
  );
}

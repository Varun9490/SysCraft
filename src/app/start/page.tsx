import { SiteChrome } from "@/components/nav/SiteChrome";
import { StartPageContent } from "@/components/start/StartPageContent";
import { START_STEPS } from "@/data/startHere";

export const metadata = {
  title: "Start here",
  description: `A guided ${START_STEPS.length}-step ramp from zero to a running, breakable system: read a concept, predict a number, move the dials, load a real architecture, run it, break it, and lock it in with a lab.`,
  openGraph: {
    title: "Start here — SysCraft",
    description: `A guided ${START_STEPS.length}-step ramp from zero to a running, breakable system.`,
    type: "website",
    url: "/start",
  },
  twitter: {
    card: "summary_large_image",
    title: "Start here — SysCraft",
    description: `A guided ${START_STEPS.length}-step ramp from zero to a running, breakable system.`,
  },
};

export default function StartPage() {
  return (
    <SiteChrome>
      <StartPageContent />
    </SiteChrome>
  );
}

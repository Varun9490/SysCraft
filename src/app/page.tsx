import { ClosingCTA } from "@/components/landing/ClosingCTA";
import { Hero } from "@/components/landing/Hero";
import { LessonAnatomy } from "@/components/landing/LessonAnatomy";
import { LiveSystemStrip } from "@/components/landing/LiveSystemStrip";
import { QuietLinks } from "@/components/landing/QuietLinks";
import { TrackShowcase } from "@/components/landing/TrackShowcase";
import { SiteChrome } from "@/components/nav/SiteChrome";

export default function LandingPage() {
  return (
    <SiteChrome>
      <Hero />
      <LiveSystemStrip />
      <TrackShowcase />
      <QuietLinks />
      <LessonAnatomy />
      <ClosingCTA />
    </SiteChrome>
  );
}

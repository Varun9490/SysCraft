import { CTASection } from "@/components/landing/CTASection";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LabsPreview } from "@/components/landing/LabsPreview";
import { PathPreview } from "@/components/landing/PathPreview";
import { TopicsShowcase } from "@/components/landing/TopicsShowcase";
import { TrustMarquee } from "@/components/landing/TrustMarquee";
import { SiteChrome } from "@/components/nav/SiteChrome";

export default function LandingPage() {
  return (
    <SiteChrome>
      <Hero />
      <TrustMarquee />
      <Features />
      <TopicsShowcase />
      <PathPreview />
      <LabsPreview />
      <HowItWorks />
      <CTASection />
    </SiteChrome>
  );
}

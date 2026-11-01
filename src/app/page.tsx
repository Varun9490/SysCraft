import { CTASection } from "@/components/landing/CTASection";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { PathPreview } from "@/components/landing/PathPreview";
import { SiteChrome } from "@/components/nav/SiteChrome";

export default function LandingPage() {
  return (
    <SiteChrome>
      <Hero />
      <PathPreview />
      <Features />
      <CTASection />
    </SiteChrome>
  );
}
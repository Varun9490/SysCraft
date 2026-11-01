import type { Metadata } from "next";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { SecurityHubContent } from "@/components/security/SecurityHubContent";

export const metadata: Metadata = {
  title: "Security architecture & CVE threat intelligence",
  description:
    "Audit your SysCraft canvas against zero-trust architecture checks, model STRIDE threats, and map live infrastructure CVEs onto the primitives that carry them — with one-click blast-radius simulation and defense-in-depth patching.",
};

export default function SecurityPage() {
  return (
    <SiteChrome>
      <SecurityHubContent />
    </SiteChrome>
  );
}

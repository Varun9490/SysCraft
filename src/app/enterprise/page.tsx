import type { Metadata } from "next";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { EnterpriseHubContent } from "@/components/enterprise/EnterpriseHubContent";

export const metadata: Metadata = {
  title: "Enterprise readiness & architect governance",
  description:
    "Role-based competency tracks, a live composite SLA and error-budget calculator, a multi-cloud FinOps TCO comparator, an ADR studio, and a local team readiness cohort for principal architects.",
};

export default function EnterprisePage() {
  return (
    <SiteChrome>
      <EnterpriseHubContent />
    </SiteChrome>
  );
}

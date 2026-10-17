import type { Metadata } from "next";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { CloudPageContent } from "@/components/cloud/CloudPageContent";

export const metadata: Metadata = {
  title: "Cloud & Networking — SysCanvas",
  description:
    "Compare AWS, Azure, GCP, Cloudflare and OCI service-by-service, then learn the networking underneath: anycast, VPCs, DNS, NAT, private links, TLS, and service meshes.",
};

export default function CloudPage() {
  return (
    <SiteChrome>
      <CloudPageContent />
    </SiteChrome>
  );
}

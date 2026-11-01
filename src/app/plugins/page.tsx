import { SiteChrome } from "@/components/nav/SiteChrome";
import { PluginsPageContent } from "@/components/plugins/PluginsPageContent";
import { BUILTIN_PLUGINS } from "@/data/pluginsCatalog";

export const metadata = {
  title: "Architecture Plugin Hub",
  description: `Install declarative architecture packs that audit your canvas for availability, security, Kubernetes readiness and spend. ${BUILTIN_PLUGINS.length} built-in packs, plus a studio for authoring and importing your own.`,
};

export default function PluginsPage() {
  return (
    <SiteChrome>
      <PluginsPageContent />
    </SiteChrome>
  );
}

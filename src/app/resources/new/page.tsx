import { SiteChrome } from "@/components/nav/SiteChrome";
import { CustomResourceRoute } from "@/components/studio/CustomResourceRoute";

export const metadata = {
  title: "New primitive — custom resource studio",
  description:
    "Author a custom infrastructure primitive: describe it in plain English, compile it with the offline synthesizer, save it to your local library, and place it on the canvas.",
};

export default function NewResourcePage() {
  return (
    <SiteChrome>
      <CustomResourceRoute />
    </SiteChrome>
  );
}

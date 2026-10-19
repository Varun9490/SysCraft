import { SiteChrome } from "@/components/nav/SiteChrome";
import { PrimitivesBrowser } from "@/components/wiki/PrimitivesBrowser";

export const metadata = {
  title: "Primitives — wiki",
  description:
    "The full SysCraft primitives library: every cloud and Kubernetes canvas block documented with production-realistic defaults, trade-off matrices, and engineering walkthroughs.",
};

export default function WikiPrimitivesPage() {
  return (
    <SiteChrome>
      <div className="pt-6">
        <nav className="section-container mb-4 text-[12.5px] text-zinc-500" aria-label="Breadcrumb">
          <a href="/wiki" className="hover:text-zinc-300">
            Wiki
          </a>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">Primitives</span>
        </nav>
        <PrimitivesBrowser />
      </div>
    </SiteChrome>
  );
}

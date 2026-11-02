import { CleanWorkspaceLoader } from "@/components/workspace/CleanWorkspaceLoader";

export const metadata = {
  title: "Architecture sandbox — infinite canvas",
  description:
    "An infinite architecture canvas with production-grade infrastructure primitives, a live load simulator, chaos injection, Design Doctor linting, and IaC export.",
};

export default function CanvasPage() {
  return (
    <>
      <noscript>
        <div className="section-container py-12 text-center">
          <h1 className="text-2xl font-semibold text-zinc-100">JavaScript required</h1>
          <p className="mt-3 text-zinc-400">
            The architecture canvas runs entirely in your browser. Enable JavaScript to open it.
          </p>
        </div>
      </noscript>
      <div className="lg:hidden border-b border-zinc-800 bg-amber-950/40 px-4 py-2 text-center text-[12px] text-amber-200">
        The canvas is designed for desktop. For the best experience, open on a laptop or larger screen.
      </div>
      <CleanWorkspaceLoader />
    </>
  );
}

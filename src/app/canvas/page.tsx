import { CleanWorkspaceLoader } from "@/components/workspace/CleanWorkspaceLoader";

export const metadata = {
  title: "Architecture sandbox — infinite canvas",
  description:
    "An infinite architecture canvas with production-grade infrastructure primitives, a live load simulator, chaos injection, Design Doctor linting, and IaC export.",
};

export default function CanvasPage() {
  return <CleanWorkspaceLoader />;
}

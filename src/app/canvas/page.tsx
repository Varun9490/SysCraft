import { CleanWorkspaceLoader } from "@/components/workspace/CleanWorkspaceLoader";

export const metadata = {
  title: "Canvas — SysCraft Architecture Sandbox",
  description:
    "An infinite architecture canvas with 32 production primitives, a live load simulator, chaos injection, Design Doctor linting, and IaC export.",
};

export default function CanvasPage() {
  return <CleanWorkspaceLoader />;
}

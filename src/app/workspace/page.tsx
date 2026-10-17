import { CleanWorkspaceLoader } from "@/components/workspace/CleanWorkspaceLoader";

export const metadata = {
  title: "Workspace — SysCraft",
  description:
    "A blank infinite canvas with the full SysCraft toolkit: 32 primitives, live simulation, telemetry, and IaC export.",
};

export default function WorkspacePage() {
  return <CleanWorkspaceLoader />;
}

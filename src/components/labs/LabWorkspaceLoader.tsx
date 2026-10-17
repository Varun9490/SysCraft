'use client';

import dynamic from "next/dynamic";
import { WorkspaceSkeleton } from "@/components/ui/WorkspaceSkeleton";

const LabWorkspace = dynamic(() => import("./LabWorkspace").then((module) => module.LabWorkspace), {
  ssr: false,
  loading: () => <WorkspaceSkeleton label="Loading your design canvas…" />,
});

export function LabWorkspaceLoader({ labId }: { labId: string }) {
  return <LabWorkspace labId={labId} />;
}

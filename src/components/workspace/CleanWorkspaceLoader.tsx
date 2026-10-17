'use client';

import dynamic from "next/dynamic";
import { WorkspaceSkeleton } from "@/components/ui/WorkspaceSkeleton";

const CleanWorkspaceShell = dynamic(() => import("./CleanWorkspaceShell"), {
  ssr: false,
  loading: () => <WorkspaceSkeleton label="Loading your workspace…" />,
});

export function CleanWorkspaceLoader() {
  return <CleanWorkspaceShell />;
}

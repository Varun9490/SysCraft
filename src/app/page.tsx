"use client";

import dynamic from "next/dynamic";

const WorkspaceShell = dynamic(() => import("@/components/WorkspaceShell"), {
  ssr: false,
  loading: () => (
    <main className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-400">
      <p className="text-sm tracking-wide">Loading SysCanvas workspace…</p>
    </main>
  ),
});

export default function HomePage() {
  return <WorkspaceShell />;
}

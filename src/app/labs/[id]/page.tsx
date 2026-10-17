import { LabWorkspaceLoader } from "@/components/labs/LabWorkspaceLoader";
import { GUIDED_LABS } from "@/data/guidedLabs";

export function generateStaticParams() {
  return GUIDED_LABS.map((lab) => ({ id: lab.id }));
}

export default async function LabWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LabWorkspaceLoader labId={id} />;
}

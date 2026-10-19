import { RedirectTo } from "@/components/nav/RedirectTo";

/**
 * Legacy route preserved for old links: the canvas now lives at /canvas.
 * A 301 is also declared in vercel.json for production traffic.
 */

export const metadata = {
  title: "Canvas (moved)",
  description: "The canvas workspace has moved to /canvas.",
  alternates: { canonical: "/canvas" },
};

export default function WorkspaceRedirectPage() {
  return <RedirectTo href="/canvas" name="canvas workspace" />;
}

import { RedirectTo } from "@/components/nav/RedirectTo";

/**
 * Legacy route preserved for old links: the canvas now lives at /canvas.
 * vercel.json declares a 301 on Vercel; on plain static hosts this page is
 * the fallback, with an explicit cross-canonical and a client hop.
 */

export const metadata = {
  title: "Canvas (moved)",
  description: "The canvas workspace has moved to /canvas.",
  alternates: { canonical: "/canvas" },
};

export default function WorkspaceRedirectPage() {
  return <RedirectTo href="/canvas" name="canvas workspace" />;
}

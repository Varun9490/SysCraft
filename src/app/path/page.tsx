import { RedirectTo } from "@/components/nav/RedirectTo";

/**
 * Legacy route preserved for old links: the learning path now lives at
 * /paths. vercel.json declares a 301 on Vercel; on plain static hosts this
 * page is the fallback, with an explicit cross-canonical and a client hop.
 */

export const metadata = {
  title: "Learning path (moved)",
  description: "The SysCraft learning path has moved to /paths.",
  alternates: { canonical: "/paths" },
};

export default function PathRedirectPage() {
  return <RedirectTo href="/paths" name="learning path" />;
}

import { RedirectTo } from "@/components/nav/RedirectTo";

/**
 * Legacy route preserved for old links: the learning path now lives at
 * /paths. A 301 is also declared in vercel.json for production traffic.
 */

export const metadata = {
  title: "Learning path (moved)",
  description: "The SysCraft learning path has moved to /paths.",
  alternates: { canonical: "/paths" },
};

export default function PathRedirectPage() {
  return <RedirectTo href="/paths" name="learning path" />;
}

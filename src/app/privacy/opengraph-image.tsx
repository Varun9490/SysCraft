import { renderOgCard } from "@/lib/og";

/** /privacy OG card: the honest data ledger. */

export const dynamic = "force-static";

export const alt = "SysCraft — Privacy: what leaves the browser";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function PrivacyOgImage() {
  return renderOgCard({
    badge: "LOCAL-FIRST",
    title: "What leaves the browser",
    subtitle: "Every byte this app stores and every host it can call, named precisely — nothing phoned home unless you bring a key or open a room.",
    stats: ["No account", "No analytics", "Your data, your disk"],
  });
}

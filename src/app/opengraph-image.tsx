import { renderOgCard } from "@/lib/og";
import { CONTENT_COUNTS, SITE_TAGLINE } from "@/data/contentManifest";

/** Root fallback OG card: what every page without its own image shares. */

export const dynamic = "force-static";

export const alt = "SysCraft — Learn system design by running it";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function RootOgImage() {
  return renderOgCard({
    badge: "Free · Local-first · No account",
    title: SITE_TAGLINE,
    subtitle:
      "Design real architectures on an infinite canvas, run them under load, and watch what breaks — from a single server to globally distributed systems.",
    stats: [
      `${CONTENT_COUNTS.modules} modules`,
      `${CONTENT_COUNTS.lessons} lessons`,
      `${CONTENT_COUNTS.labs} labs`,
      `${CONTENT_COUNTS.primitives} primitives`,
    ],
  });
}

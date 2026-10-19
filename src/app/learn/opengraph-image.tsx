import { renderOgCard } from "@/lib/og";
import { CONTENT_COUNTS } from "@/data/contentManifest";

/** /learn OG card: the four-verb curriculum spine. */

export const dynamic = "force-static";

export const alt = "SysCraft — System Design Learning Path";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function LearnOgImage() {
  return renderOgCard({
    badge: "LEARNING PATH",
    title: "System Design Learning Path",
    subtitle:
      "The full SysCraft curriculum: the delivery framework, foundations in the order a growing app needs them, distributed systems, and under-the-hood algorithms.",
    stats: [
      `${CONTENT_COUNTS.modules} modules`,
      `${CONTENT_COUNTS.lessons} lessons`,
      `${CONTENT_COUNTS.labs} labs`,
    ],
  });
}

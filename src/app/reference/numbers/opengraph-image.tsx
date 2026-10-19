import { renderOgCard } from "@/lib/og";
import {
  DECISION_THRESHOLDS,
  MACHINE_LIMITS,
  NUMBERS_DRILL,
  REFERENCE_CLAIMS,
} from "@/data/claims";

/** /reference/numbers OG card: the claims registry behind the site's numbers. */

export const dynamic = "force-static";

export const alt = "SysCraft — Numbers & claims, the reference rack";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function NumbersOgImage() {
  return renderOgCard({
    badge: "REFERENCE · PROVENANCE",
    title: "Numbers & claims",
    subtitle: "The latency ladder, machine limits, and decision thresholds behind every argument — each claim with a source and an as-of date.",
    stats: [
      `${REFERENCE_CLAIMS.length} sourced claims`,
      `${NUMBERS_DRILL.length} drill pairs`,
      `${MACHINE_LIMITS.length + DECISION_THRESHOLDS.length} hard rules`,
    ],
  });
}

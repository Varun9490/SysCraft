import type { GuidedLab } from "@/types/challenges";

/** First body line of a lab brief, used in cards and previews. */
export function labExcerpt(lab: GuidedLab): string {
  const lines = lab.briefMarkdown.split("\n").filter((line) => line.trim().length > 0);
  const body = lines.find((line) => !line.startsWith("#"));
  return body ?? lab.briefMarkdown.slice(0, 160);
}

/** Lab title without the trailing "(Company)" suffix, e.g. "URL Shortener". */
export function labCleanTitle(lab: GuidedLab): string {
  return lab.title.replace(/\s*\([^)]*\)\s*$/, "");
}

export function formatRps(rps: number): string {
  if (rps >= 1_000_000) return `${(rps / 1_000_000).toFixed(rps % 1_000_000 === 0 ? 0 : 1)}M rps`;
  if (rps >= 1_000) return `${(rps / 1_000).toFixed(rps % 1_000 === 0 ? 0 : 1)}k rps`;
  return `${rps} rps`;
}

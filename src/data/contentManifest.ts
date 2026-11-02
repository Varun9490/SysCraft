/**
 * Single source of truth for every content count quoted in UI copy.
 *
 * Never hard-code "137 lessons" or "16 labs" in a page: import from here.
 * The build fails (see src/data/__tests__/contentCounts.test.ts) if any copy
 * surface re-introduces a stale literal count.
 */

import { PATH_PARTS, TOTAL_LESSONS, TOTAL_MODULES } from "@/data/pathData";
import { GUIDED_LABS } from "@/data/guidedLabs";
import { SEED_RESOURCES } from "@/data/seedResources";
import { ENCYCLOPEDIA_MODULES } from "@/data/encyclopediaData";
import { TOPICS } from "@/data/topics";
import { CHAOS_SCENARIOS } from "@/data/chaosScenarios";
import { BLUEPRINTS } from "@/data/blueprints";
import { PLAY_MODES } from "@/data/playContent";
import { GLOSSARY } from "@/data/glossary";

export const CONTENT_COUNTS = {
  parts: PATH_PARTS.length,
  modules: TOTAL_MODULES,
  lessons: TOTAL_LESSONS,
  labs: GUIDED_LABS.length,
  primitives: SEED_RESOURCES.length,
  wikiArticles: ENCYCLOPEDIA_MODULES.length,
  topics: TOPICS.length,
  chaosDrills: CHAOS_SCENARIOS.length,
  blueprints: BLUEPRINTS.length,
  playModes: PLAY_MODES.length,
  glossaryTerms: GLOSSARY.length,
} as const;

export type ContentCountKey = keyof typeof CONTENT_COUNTS;

/** Hero stat block: modules / lessons / labs / primitives. */
export const HERO_STATS: Array<{ label: string; value: number }> = [
  { label: "Modules", value: CONTENT_COUNTS.modules },
  { label: "Lessons", value: CONTENT_COUNTS.lessons },
  { label: "Labs", value: CONTENT_COUNTS.labs },
  { label: "Primitives", value: CONTENT_COUNTS.primitives },
];

export const SITE_NAME = "SysCraft";
export const SITE_URL = "https://sys-craft-3vzz.vercel.app";
export const SITE_TAGLINE = "Learn system design by running it";
export const SITE_DESCRIPTION =
  "Design real architectures on an infinite canvas, run them under load, and watch what breaks — from a single server to globally distributed systems. Free, local-first, no account.";

/** Shared paragraph copy that quotes counts — kept in one place. */
export function pathSummarySentence(): string {
  return `${CONTENT_COUNTS.modules} modules and ${CONTENT_COUNTS.lessons} lessons, from a single server to distributed systems — in the order a growing application actually needs them.`;
}

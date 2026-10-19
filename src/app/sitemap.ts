import type { MetadataRoute } from "next";
import { SITE_URL } from "@/data/contentManifest";
import { GUIDED_LABS } from "@/data/guidedLabs";
import { ENCYCLOPEDIA_MODULES } from "@/data/encyclopediaData";
import { TOPICS } from "@/data/topics";

/**
 * Honest sitemap: reading surfaces and interactive surfaces get listed;
 * utility-only pages (room, settings, progress, raw tool pages) and redirect
 * stubs (/path, /workspace, /encyclopedia) are deliberately absent.
 */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority,
  });

  return [
    page("/", 1),
    page("/learn", 0.9),
    page("/start", 0.9),
    page("/labs", 0.85),
    ...GUIDED_LABS.map((lab) =>
      page(`/labs/${lab.id}`, 0.75),
    ),
    page("/topics", 0.8),
    ...TOPICS.map((topic) => page(`/topics/${topic.slug}`, 0.65)),
    page("/wiki", 0.8),
    ...ENCYCLOPEDIA_MODULES.map((module) => page(`/wiki/${module.id}`, 0.6)),
    page("/wiki/primitives", 0.6),
    page("/wiki/graph", 0.5),
    page("/practice", 0.7),
    page("/play", 0.7),
    page("/flowchart", 0.5),
    page("/cloud", 0.6),
    page("/reference/numbers", 0.6),
    page("/privacy", 0.4),
  ];
}

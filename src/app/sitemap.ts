import type { MetadataRoute } from "next";
import { SITE_URL } from "@/data/contentManifest";
import { GUIDED_LABS } from "@/data/guidedLabs";
import { ENCYCLOPEDIA_MODULES } from "@/data/encyclopediaData";
import { TOPICS } from "@/data/topics";
import { BLOGS, TRACKS } from "@/content/platform/registry";

/**
 * Discovery surface for canonical, indexable routes.
 *
 * Canonical policy (SEO-01 / ROUTE-03):
 * - The seven-track /paths tree is the primary curriculum and carries the
 *   highest priorities. Each track and lesson has its own canonical in its
 *   page metadata (see src/lib/seo.ts).
 * - The legacy /learn library is a secondary archive. Its index stays in the
 *   sitemap at low priority; its individual lesson pages are intentionally
 *   omitted because they duplicate canonical /paths lessons and declare the
 *   archive index as their canonical (noindex on the legacy detail pages).
 * - Utility-only pages (room, settings, progress, raw tool pages) and redirect
 *   stubs (/path, /workspace, /encyclopedia, /signin, /signup) are absent.
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
    // Primary curriculum.
    page("/paths", 0.9),
    ...TRACKS.map((track) => page(`/paths/${track.slug}`, 0.85)),
    ...TRACKS.flatMap((track) =>
      track.lessons.map((lesson) => page(`/paths/${track.slug}/${lesson.slug}`, 0.75)),
    ),
    page("/blogs", 0.85),
    ...BLOGS.map((blog) => page(`/blogs/${blog.slug}`, 0.75)),
    page("/map", 0.8),
    page("/tools", 0.8),
    page("/quiz", 0.8),
    page("/labs", 0.85),
    ...GUIDED_LABS.map((lab) => page(`/labs/${lab.id}`, 0.75)),
    // Secondary archive — deliberately lower priority than /paths.
    page("/learn", 0.3),
    // Supporting content surfaces.
    page("/case-studies", 0.85),
    page("/roadmap", 0.8),
    page("/start", 0.9),
    page("/topics", 0.8),
    ...TOPICS.map((topic) => page(`/topics/${topic.slug}`, 0.65)),
    page("/wiki", 0.8),
    ...ENCYCLOPEDIA_MODULES.map((module) => page(`/wiki/${module.id}`, 0.6)),
    page("/wiki/primitives", 0.6),
    page("/wiki/graph", 0.5),
    page("/practice", 0.7),
    page("/play", 0.7),
    page("/interview", 0.7),
    page("/security", 0.7),
    page("/enterprise", 0.65),
    page("/plugins", 0.6),
    page("/flowchart", 0.5),
    page("/cloud", 0.6),
    page("/reference/numbers", 0.6),
    page("/pricing", 0.4),
    page("/privacy", 0.4),
  ];
}

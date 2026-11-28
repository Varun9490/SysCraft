import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/data/contentManifest";
import { GUIDED_LABS } from "@/data/guidedLabs";
import { LESSON_ROUTES } from "@/lib/lessonRoutes";
import { BLOGS, TRACKS } from "@/content/platform/registry";

/**
 * The sitemap is real SEO surface, so pin the contract: every canonical
 * indexable page must appear, the legacy /learn archive must stay secondary,
 * utility-only and redirect pages must not appear, and no URL may be
 * duplicated. Origin and uniqueness assertions are intentionally kept strict.
 */
const entries = sitemap();
const paths = entries.map((entry) => entry.url.replace(SITE_URL, ""));
const byPath = new Map(entries.map((entry) => [entry.url.replace(SITE_URL, ""), entry]));

describe("sitemap", () => {
  it("lists every indexable content surface exactly once", () => {
    const expected = [
      "/",
      "/learn",
      "/paths",
      "/blogs",
      "/labs",
      "/topics",
      "/map",
      "/tools",
      "/quiz",
      "/wiki",
      "/case-studies",
      "/roadmap",
      "/start",
      "/practice",
      "/play",
      "/interview",
      "/security",
      "/enterprise",
      "/plugins",
      "/flowchart",
      "/cloud",
      "/reference/numbers",
      "/pricing",
      "/privacy",
    ];
    for (const path of expected) {
      expect(paths).toContain(path);
    }
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("includes every canonical track, path lesson, field note, and lab", () => {
    for (const track of TRACKS) {
      expect(paths).toContain(`/paths/${track.slug}`);
      for (const lesson of track.lessons) {
        expect(paths).toContain(`/paths/${track.slug}/${lesson.slug}`);
      }
    }
    for (const blog of BLOGS) expect(paths).toContain(`/blogs/${blog.slug}`);
    for (const lab of GUIDED_LABS) expect(paths).toContain(`/labs/${lab.id}`);
  });

  it("keeps the legacy lesson archive secondary to the seven-track curriculum", () => {
    expect((byPath.get("/paths")?.priority ?? 0)).toBeGreaterThan(byPath.get("/learn")?.priority ?? 1);
    expect(byPath.get("/learn")?.priority).toBeLessThan(0.5);
    for (const route of LESSON_ROUTES) {
      expect(paths).not.toContain(route.href);
    }
  });

  it("omits utility pages, redirect stubs, and transactional auth pages", () => {
    const omitted = [
      "/room",
      "/settings",
      "/progress",
      "/path",
      "/workspace",
      "/encyclopedia",
      "/canvas",
      "/signin",
      "/signup",
    ];
    for (const path of omitted) {
      expect(paths).not.toContain(path);
    }
  });

  it("emits absolute URLs under the canonical site origin", () => {
    for (const entry of entries) {
      expect(entry.url.startsWith(`${SITE_URL}/`)).toBe(true);
      expect(entry.priority).toBeGreaterThan(0);
      expect(entry.priority).toBeLessThanOrEqual(1);
    }
    expect(paths.filter((path) => path === "/")).toHaveLength(1);
  });
});

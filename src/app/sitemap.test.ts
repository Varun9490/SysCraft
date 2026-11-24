import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/data/contentManifest";

/**
 * The sitemap is real SEO surface, so pin the contract: every indexable
 * reading or interactive page must appear, utility-only and redirect pages
 * must not, and no URL may be duplicated.
 */
const paths = sitemap().map((entry) => entry.url.replace(SITE_URL, ""));

describe("sitemap", () => {
  it("lists every indexable content surface exactly once", () => {
    const expected = [
      "/",
      "/learn",
      "/labs",
      "/topics",
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
    for (const entry of sitemap()) {
      expect(entry.url.startsWith(`${SITE_URL}/`)).toBe(true);
      expect(entry.priority).toBeGreaterThan(0);
      expect(entry.priority).toBeLessThanOrEqual(1);
    }
  });
});

import { describe, expect, it } from "vitest";
import { PATH_PARTS, TOTAL_LESSONS } from "@/data/pathData";
import { LESSON_ROUTES, getAdjacentLessons, getLessonRoute, slugify } from "@/lib/lessonRoutes";

describe("lesson routes", () => {
  it("covers every lesson in the curriculum", () => {
    expect(LESSON_ROUTES).toHaveLength(TOTAL_LESSONS);
  });

  it("keeps slugs unique inside each module", () => {
    for (const part of PATH_PARTS) {
      for (const mod of part.modules) {
        const slugs = LESSON_ROUTES.filter((r) => r.moduleId === mod.id).map((r) => r.slug);
        expect(new Set(slugs).size).toBe(slugs.length);
      }
    }
  });

  it("builds a canonical href for every route", () => {
    for (const route of LESSON_ROUTES) {
      expect(route.href).toBe(`/learn/${route.moduleId}/${route.slug}`);
      expect(route.slug.startsWith(String(route.lessonIndex + 1).padStart(2, "0"))).toBe(true);
    }
  });

  it("resolves a lesson by module and index", () => {
    const route = getLessonRoute("what-is-system-design", 0);
    expect(route?.moduleId).toBe("what-is-system-design");
    expect(route?.lessonIndex).toBe(0);
  });

  it("links adjacent lessons in curriculum order", () => {
    const first = LESSON_ROUTES[0];
    const second = LESSON_ROUTES[1];
    expect(getAdjacentLessons(first).next?.href).toBe(second.href);
    expect(getAdjacentLessons(second).prev?.href).toBe(first.href);
    expect(getAdjacentLessons(LESSON_ROUTES[LESSON_ROUTES.length - 1]).next).toBeUndefined();
  });

  it("slugifies safely", () => {
    expect(slugify("Caching & fast reads")).toBe("caching-and-fast-reads");
    expect(slugify("  Rate limiting: overload  ")).toBe("rate-limiting-overload");
  });
});

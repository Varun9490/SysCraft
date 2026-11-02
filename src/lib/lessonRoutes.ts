import { PATH_PARTS } from "@/data/pathData";

/**
 * Stable, human-readable lesson routes.
 *
 * Every lesson gets one canonical URL: /learn/<moduleId>/<nn-slug>
 * The numeric prefix keeps ordering obvious and makes slugs unique even when
 * two lessons inside one module share a title.
 */

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export interface LessonRoute {
  moduleId: string;
  moduleNumber: number;
  moduleTitle: string;
  partId: string;
  partTitle: string;
  lessonIndex: number;
  lessonNumber: number;
  title: string;
  slug: string;
  href: string;
}

function buildRoutes(): LessonRoute[] {
  const routes: LessonRoute[] = [];
  for (const part of PATH_PARTS) {
    for (const mod of part.modules) {
      mod.lessonTitles.forEach((title, index) => {
        const slug = `${String(index + 1).padStart(2, "0")}-${slugify(title)}`;
        routes.push({
          moduleId: mod.id,
          moduleNumber: mod.number,
          moduleTitle: mod.title,
          partId: part.id,
          partTitle: part.title,
          lessonIndex: index,
          lessonNumber: index + 1,
          title,
          slug,
          href: `/learn/${mod.id}/${slug}`,
        });
      });
    }
  }
  return routes;
}

export const LESSON_ROUTES: readonly LessonRoute[] = buildRoutes();

export const LESSON_ROUTE_BY_MODULE: ReadonlyMap<string, readonly LessonRoute[]> = (() => {
  const map = new Map<string, LessonRoute[]>();
  for (const route of LESSON_ROUTES) {
    const list = map.get(route.moduleId) ?? [];
    list.push(route);
    map.set(route.moduleId, list);
  }
  return map;
})();

export function getLessonRoute(moduleId: string, lessonIndex: number): LessonRoute | undefined {
  return LESSON_ROUTE_BY_MODULE.get(moduleId)?.[lessonIndex];
}

export function getAdjacentLessons(route: LessonRoute): {
  prev?: LessonRoute;
  next?: LessonRoute;
} {
  const i = LESSON_ROUTES.findIndex(
    (r) => r.moduleId === route.moduleId && r.lessonIndex === route.lessonIndex,
  );
  if (i < 0) return {};
  return {
    prev: i > 0 ? LESSON_ROUTES[i - 1] : undefined,
    next: i < LESSON_ROUTES.length - 1 ? LESSON_ROUTES[i + 1] : undefined,
  };
}

export function findLessonRoute(moduleId: string, slug: string): LessonRoute | undefined {
  return LESSON_ROUTE_BY_MODULE.get(moduleId)?.find((r) => r.slug === slug);
}

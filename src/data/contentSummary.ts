/**
 * Tiny, build-time snapshot of the counts used by shared shell copy.
 *
 * WHY THIS EXISTS
 * `src/data/contentManifest.ts` is the derived source of truth, but it imports
 * pathData, guidedLabs, seedResources, encyclopediaData and the other legacy
 * registries. Importing it from `SiteFooter` (rendered on every route) pulled
 * those modules into the shared client graph. The shell only needs a few
 * integers, so it reads them from this dependency-free module instead.
 *
 * VERIFICATION (2026-11-27)
 * Values were read from the data itself, not guessed:
 *   tracks: 7        — TRACKS.length (src/content/platform/registry.ts)
 *   pathLessons: 53  — sum of track.lessons.length; curriculum.test.ts
 *   blogs: 8         — BLOGS.length
 *   labs: 16         — GUIDED_LABS.length; guidedLabs.test.ts
 *   primitives: 48   — SEED_RESOURCES.length (32 core + 16 kubernetes);
 *                      encyclopedia.test.ts
 *   legacyLessons: 234 — TOTAL_LESSONS (src/data/pathData.ts)
 *
 * `contentManifest.ts` remains authoritative and is still guarded by
 * `src/data/__tests__/contentCounts.test.ts`. When content changes, update both
 * files in the same commit. Do not consume this module in place of the manifest
 * anywhere that needs the actual content objects.
 *
 * ROUTE BUNDLE BUDGET CHECK (PERF-01)
 * After `npm run build`, measure the JS bytes referenced by each emitted page:
 *
 *   $html = Get-Content out/index.html -Raw
 *   $scripts = [regex]::Matches($html, '<script[^>]+src="([^"]+)"')
 *   ($scripts | ForEach-Object {
 *     (Get-Item (Join-Path 'out' $_.Groups[1].Value.TrimStart('/'))).Length
 *   } | Measure-Object -Sum).Sum
 *
 * Repeat with paths.html, tools.html, map.html, quiz.html, a lesson page and a
 * blog page. Count every referenced script (including preloads); these are
 * uncompressed bytes, not wire transfer. `src` paths in emitted HTML are
 * root-relative, so strip the leading slash before joining with `out`.
 *
 * Audit baseline (uncompressed bytes referenced by HTML): home 1,563,225,
 * tools 1,560,112, lesson 1,591,233, paths 2,138,136, map 2,148,111,
 * quiz 2,150,966, blog 2,200,785, learn 2,674,656. The shared shell should not
 * grow these numbers; the paths, blog and lesson shells should shrink.
 */

export const CONTENT_SUMMARY = {
  tracks: 7,
  pathLessons: 53,
  blogs: 8,
  labs: 16,
  primitives: 48,
  legacyLessons: 234,
} as const;

export type ContentSummaryKey = keyof typeof CONTENT_SUMMARY;

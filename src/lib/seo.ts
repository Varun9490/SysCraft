import type { Metadata } from "next";

/**
 * Canonical policy (SEO-01 / ROUTE-03).
 *
 * - The root layout sets `metadataBase` only. It deliberately emits *no*
 *   `alternates.canonical`, so child routes cannot inherit the homepage URL.
 * - Every canonical, indexable route declares its own canonical with
 *   `canonicalAlternates(...)`. The relative path is resolved against the
 *   root `metadataBase`.
 * - The seven-track `/paths` tree is the primary curriculum. The legacy
 *   `/learn` library is a secondary archive: legacy pages should use
 *   `legacyArchiveMetadata()` so they do not compete with the canonical
 *   lessons in search, and the sitemap treats them as a low-priority archive.
 *
 * Keep this module free of browser globals and heavy content imports: it is
 * used from Server Components during static-export prerendering.
 */

/** Build a rooted path from already URL-safe route segments. */
export function routeCanonical(...segments: string[]): string {
  const parts = segments.flatMap((segment) => segment.split("/")).filter(Boolean);
  return parts.length === 0 ? "/" : `/${parts.join("/")}`;
}

/** Spread into a route's `Metadata` to give it a self-referencing canonical. */
export function canonicalAlternates(...segments: string[]): Pick<Metadata, "alternates"> {
  return { alternates: { canonical: routeCanonical(...segments) } };
}

/**
 * Intentional policy for the legacy `/learn` archive: it remains reachable
 * and crawlable via its index, but individual legacy lesson pages must not be
 * indexed as a competing copy of the canonical `/paths` curriculum.
 */
export function legacyArchiveMetadata(): Metadata {
  return {
    alternates: { canonical: "/learn" },
    robots: { index: false, follow: true },
  };
}

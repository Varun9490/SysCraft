'use client';

/** Shared, static command/dock destinations. No content-module import needed. */

export type RouteEntry = { label: string; href: string; hint?: string };

export const STATIC_ROUTES: RouteEntry[] = [
  { label: "Paths", href: "/paths", hint: "Guided learning" },
  { label: "Labs", href: "/labs", hint: "Hands-on builds" },
  { label: "Blogs", href: "/blogs", hint: "Deep dives" },
  { label: "Map", href: "/map", hint: "Concept map" },
  { label: "Tools", href: "/tools", hint: "Utilities" },
  { label: "Quiz", href: "/quiz", hint: "Check yourself" },
  { label: "Canvas", href: "/canvas", hint: "Design workspace" },
  { label: "Encyclopedia", href: "/encyclopedia", hint: "Reference" },
  { label: "Practice", href: "/practice", hint: "Spaced review" },
];

const TRACK_SLUGS = [
  "foundations",
  "distributed",
  "case-studies",
  "ai-engineering",
  "llm-inference",
  "ml-math",
  "backend-cloud",
];

const BLOG_SLUGS = [
  "database-melts-at-10k-rps",
  "discord-trillions-of-messages",
  "securing-agents-against-indirect-injection",
  "what-happens-during-token-generation",
  "zero-downtime-schema-migrations",
  "consistent-hashing-in-production",
  "kafka-consumer-lag",
  "error-budgets-that-engineers-trust",
];

/**
 * Static slug -> canonical lesson route lookup. This is intentionally a small
 * hand-maintained map (no content-registry import) so the shell stays light.
 */
const LESSON_SLUGS_BY_TRACK: Record<string, string[]> = {
  foundations: [
    "single-server",
    "networking-protocols",
    "load-balancing",
    "caching-eviction",
    "sql-modeling",
    "scaling-databases",
    "rate-limiting",
    "queues-jobs",
    "realtime",
  ],
  distributed: [
    "replication-consistency",
    "sharding-hot-keys",
    "consistent-hashing",
    "raft-consensus",
    "locks-circuit-breakers",
    "storage-engines",
    "kafka-streaming",
    "distributed-transactions",
    "probabilistic-sketches",
    "observability-slos",
  ],
  "case-studies": [
    "url-shortener",
    "chat-system",
    "video-streaming",
    "news-feed",
    "ride-hailing",
    "search-engine",
    "metrics-alerting",
    "lld-lru-cache",
    "lld-rate-limiter",
    "lld-pubsub",
    "lld-parking-lot",
    "lld-elevator",
  ],
  "ai-engineering": [
    "tokenization",
    "embeddings-rag",
    "agent-loop",
    "memory-architectures",
    "evals-guardrails",
    "ai-security",
  ],
  "llm-inference": [
    "transformer-bottlenecks",
    "kv-cache-paged-attention",
    "prefill-decode-batching",
    "quantization",
    "latency-cost-budgets",
    "pretraining-posttraining",
  ],
  "ml-math": [
    "linear-algebra",
    "probability-information",
    "backprop-optimizers",
    "attention-scaling-laws",
    "notation-decoder",
  ],
  "backend-cloud": [
    "concurrency-event-loops",
    "linux-docker",
    "kubernetes",
    "safe-deployments",
    "appsec-zero-trust",
  ],
};

const LESSON_ROUTES: Record<string, string> = Object.fromEntries(
  Object.entries(LESSON_SLUGS_BY_TRACK).flatMap(([track, slugs]) =>
    slugs.map((slug) => [slug, `/paths/${track}/${slug}`]),
  ),
);

/** The 16 guided lab ids, kept in sync with src/data/guidedLabs.ts. */
const GUIDED_LAB_IDS = [
  "bitly-url-shortener",
  "pastebin-service",
  "youtube-upload-playback",
  "whatsapp-chat",
  "twitter-timeline",
  "instagram-feed",
  "bookmyshow-ticketing",
  "razorpay-payments",
  "uber-matching",
  "netflix-streaming",
  "search-autocomplete",
  "dynamodb-from-scratch",
  "notification-platform",
  "dropbox-file-sync",
  "distributed-rate-limiter",
  "agentic-rag-support",
];

const LAB_ROUTES: Record<string, string> = Object.fromEntries(
  GUIDED_LAB_IDS.map((id) => [id, `/labs/${id}`]),
);

export function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export function hrefFromSlug(slug: string): string {
  if (!slug) return "/";
  if (slug.startsWith("/")) return slug;
  if (BLOG_SLUGS.includes(slug)) return `/blogs/${slug}`;
  if (TRACK_SLUGS.includes(slug)) return `/paths/${slug}`;
  const lessonRoute = LESSON_ROUTES[slug];
  if (typeof lessonRoute === "string") return lessonRoute;
  const labRoute = LAB_ROUTES[slug];
  if (typeof labRoute === "string") return labRoute;
  return `/${slug}`;
}

export const TRACK_ROUTES: RouteEntry[] = TRACK_SLUGS.map((slug) => ({
  label: titleFromSlug(slug),
  href: `/paths/${slug}`,
  hint: "Path",
}));

export const BLOG_ROUTES: RouteEntry[] = BLOG_SLUGS.map((slug) => ({
  label: titleFromSlug(slug),
  href: `/blogs/${slug}`,
  hint: "Blog",
}));

export type BookmarkItem = { label: string; href: string };

function pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

/** Tolerate string slugs or objects with common label/href field names. */
export function asBookmarks(raw: unknown): BookmarkItem[] {
  if (!Array.isArray(raw)) return [];
  const items: BookmarkItem[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      items.push({ label: titleFromSlug(entry), href: hrefFromSlug(entry) });
      continue;
    }
    if (!entry || typeof entry !== "object") continue;
    const object = entry as Record<string, unknown>;
    const slug = pickString(object, ["slug", "id"]);
    const href =
      pickString(object, ["href", "url", "path"]) ?? (slug ? hrefFromSlug(slug) : "");
    if (!href) continue;
    const label =
      pickString(object, ["label", "title", "name"]) ?? (slug ? titleFromSlug(slug) : href);
    items.push({ label: label || href, href });
  }
  return items;
}

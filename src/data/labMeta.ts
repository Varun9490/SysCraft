import type { GuidedLab } from "@/types/challenges";
import { ENCYCLOPEDIA_MODULE_IDS, getEncyclopediaModule } from "@/data/encyclopediaData";
import { getTopic } from "@/data/topics";

/** First body line of a lab brief, used in cards and previews. */
export function labExcerpt(lab: GuidedLab): string {
  const lines = lab.briefMarkdown.split("\n").filter((line) => line.trim().length > 0);
  const body = lines.find((line) => !line.startsWith("#"));
  return body ?? lab.briefMarkdown.slice(0, 160);
}

/** Lab title without the trailing "(Company)" suffix, e.g. "URL Shortener". */
export function labCleanTitle(lab: GuidedLab): string {
  return lab.title.replace(/\s*\([^)]*\)\s*$/, "");
}

export function formatRps(rps: number): string {
  if (rps >= 1_000_000) return `${(rps / 1_000_000).toFixed(rps % 1_000_000 === 0 ? 0 : 1)}M rps`;
  if (rps >= 1_000) return `${(rps / 1_000).toFixed(rps % 1_000 === 0 ? 0 : 1)}k rps`;
  return `${rps} rps`;
}

/**
 * Concepts each lab exercises, wired to real teaching surfaces so the brief
 * links lessons (wiki deep dives) and interactive sandboxes (topics) instead
 * of naming jargon in a vacuum.
 */
export const LAB_CONCEPTS: Record<string, { wiki: string[]; topics: string[] }> = {
  "bitly-url-shortener": { wiki: ["caching-strategies", "load-balancing"], topics: ["caching-strategies", "latency-numbers"] },
  "pastebin-service": { wiki: ["sharding-partitioning", "caching-strategies"], topics: ["cdn-and-edge", "database-sharding"] },
  "youtube-upload-playback": { wiki: ["caching-strategies", "message-queues"], topics: ["cdn-and-edge", "api-styles"] },
  "whatsapp-chat": { wiki: ["replication", "event-streaming"], topics: ["load-balancing", "message-queues"] },
  "twitter-timeline": { wiki: ["caching-strategies"], topics: ["caching-strategies", "cache-invalidation"] },
  "instagram-feed": { wiki: ["caching-strategies", "event-streaming"], topics: ["cdn-and-edge", "message-queues"] },
  "bookmyshow-ticketing": { wiki: ["message-queues", "caching-strategies"], topics: ["rate-limiting", "idempotency"] },
  "razorpay-payments": { wiki: ["acid-vs-base"], topics: ["idempotency", "acid-vs-base"] },
  "uber-matching": { wiki: ["event-streaming", "consistent-hashing"], topics: ["database-sharding", "backpressure"] },
  "netflix-streaming": { wiki: ["caching-strategies"], topics: ["cdn-and-edge"] },
  "search-autocomplete": { wiki: ["consistent-hashing", "bloom-filters"], topics: ["caching-strategies", "bloom-filters"] },
  "dynamodb-from-scratch": { wiki: ["consistent-hashing", "replication"], topics: ["database-sharding", "consistent-hashing"] },
  "notification-platform": { wiki: ["message-queues"], topics: ["message-queues", "idempotency"] },
  "dropbox-file-sync": { wiki: ["merkle-trees", "sharding-partitioning"], topics: ["cdn-and-edge"] },
  "distributed-rate-limiter": { wiki: ["rate-limiting"], topics: ["rate-limiting", "consistent-hashing"] },
  "agentic-rag-support": { wiki: ["vector-search", "llm-systems"], topics: ["api-styles", "caching-strategies"] },
};

export interface LabConceptRef {
  kind: "wiki" | "topic";
  title: string;
  href: string;
}

/** Resolve a lab's concept map to live wiki/topic refs; drops dangling ids defensively. */
export function labConceptRefs(labId: string): LabConceptRef[] {
  const entry = LAB_CONCEPTS[labId];
  if (!entry) return [];
  const refs: LabConceptRef[] = [];
  for (const id of entry.wiki) {
    const module = getEncyclopediaModule(id);
    if (module && ENCYCLOPEDIA_MODULE_IDS.includes(id)) {
      refs.push({ kind: "wiki", title: module.title, href: `/wiki/${id}` });
    }
  }
  for (const slug of entry.topics) {
    const topic = getTopic(slug);
    if (topic) refs.push({ kind: "topic", title: topic.title, href: `/topics/${slug}` });
  }
  return refs;
}

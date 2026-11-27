import { GUIDED_LABS } from "@/data/guidedLabs";

export interface PlatformLab {
  id: string;
  labId: string;
  title: string;
  goal: string;
  securityAngle: string;
  passHint: string;
}

const PLATFORM_LAB_META: ReadonlyArray<Omit<PlatformLab, "title">> = [
  {
    id: "flash-sale-seat-booking",
    labId: "bookmyshow-ticketing",
    goal: "Absorb a 50× on-sale spike while keeping seat holds atomic and preventing oversell.",
    securityAngle: "Use per-show admission and per-account quotas to deter inventory scraping, and verify signed, idempotent payment webhooks.",
    passHint: "Gate admission before seat writes, enforce one atomic hold decision, and keep a durable uniqueness constraint as the final authority.",
  },
  {
    id: "hot-shard-rate-limiting",
    labId: "distributed-rate-limiter",
    goal: "Mitigate a Layer 7 request flood and hot-key pressure while keeping limiter decisions under 10 ms p99 and legitimate tenants within budget.",
    securityAngle: "Combine edge admission controls, authenticated tenant quotas, and bounded degraded-mode allowances; audit denials without logging secrets.",
    passHint: "Shard counters by bucket key, bound degraded per-instance allowances, and shed hot keys before they saturate one shard.",
  },
  {
    id: "rag-support-copilot",
    labId: "agentic-rag-support",
    goal: "Build a cited support copilot over millions of documents with strict task-time and cost budgets.",
    securityAngle: "Filter retrieval by tenant permissions, redact personal data, treat source text as untrusted, and gate refund tools behind approval.",
    passHint: "Combine lexical and vector retrieval, cite chunk identifiers, cap agent steps and spend, and require human escalation for risky actions.",
  },
  {
    id: "payment-ledger-integrity",
    labId: "razorpay-payments",
    goal: "Accept 10k payment attempts per second while preserving an append-only, reconciled ledger.",
    securityAngle: "Keep card data outside service boundaries with hosted fields, verify provider webhooks, and require dual control for manual adjustments.",
    passHint: "Persist intent, idempotency record, and outbox atomically; reconcile unknown outcomes before replay and prove every journal balances.",
  },
  {
    id: "redirect-cache-resilience",
    labId: "bitly-url-shortener",
    goal: "Serve 20k redirects per second at 100 ms p99 and survive a complete redirect-cache loss.",
    securityAngle: "Bound disabled-link cache lifetime, enforce per-owner creation quotas, and validate destinations through an approved URL policy.",
    passHint: "Separate read and write paths, coalesce cache misses, reserve database capacity, and serve analytics asynchronously.",
  },
  {
    id: "single-use-paste-semantics",
    labId: "pastebin-service",
    goal: "Separate large bodies from metadata while making expiry and burn-after-read promises enforceable.",
    securityAngle: "Use short-lived scoped upload grants, scan anonymous content before publication, and keep one-time and quarantined data out of shared caches.",
    passHint: "Put bodies in encrypted object storage, make the single-use transition atomic in the primary database, and verify expiry on every read.",
  },
  {
    id: "video-ingest-playback",
    labId: "youtube-upload-playback",
    goal: "Design resumable upload, asynchronous transcoding, and CDN playback for one million requests per second.",
    securityAngle: "Use resumable upload authorization, content moderation gates, private rendition storage, and entitlement checks before signed playback.",
    passHint: "Keep ingest and playback separate, fan out transcoding through durable queues, and make view counters sharded and idempotent.",
  },
  {
    id: "encrypted-realtime-chat",
    labId: "whatsapp-chat",
    goal: "Handle high-rate messaging with long-lived connections, presence, offline replay, and media offload.",
    securityAngle: "Preserve end-to-end encryption boundaries, minimize metadata retention, and protect abuse reports and media grants.",
    passHint: "Split connection and logic tiers, store per-user inboxes in a wide-column store, and make acknowledgements idempotent.",
  },
  {
    id: "celebrity-fanout",
    labId: "twitter-timeline",
    goal: "Build a 120 ms timeline with hybrid fan-out that handles celebrity accounts and traffic bursts.",
    securityAngle: "Enforce block and visibility rules at read time, rate-limit scraping, and prevent personalized data from entering shared cache keys.",
    passHint: "Push timelines for ordinary accounts, pull-merge celebrities at read time, and coalesce cache misses during bursts.",
  },
  {
    id: "ephemeral-feed",
    labId: "instagram-feed",
    goal: "Serve ranked feeds and 24-hour stories at 200k requests per second with controlled media cost.",
    securityAngle: "Apply private-account authorization to feeds and story grants, scan uploads asynchronously, and expire media copies on schedule.",
    passHint: "Precompute ranking candidates off the critical path, cache hot feed data, and use storage TTL plus a sweeper for stories.",
  },
  {
    id: "geospatial-dispatch",
    labId: "uber-matching",
    goal: "Match riders and drivers at high rate with geospatial indexes and bounded surge updates.",
    securityAngle: "Minimize precise-location retention, scope location access by role, and monitor spoofed or anomalous location signals.",
    passHint: "Partition geography explicitly, separate live matching from analytics, and make dispatch decisions idempotent under retries.",
  },
  {
    id: "edge-streaming",
    labId: "netflix-streaming",
    goal: "Coordinate streaming ladders, embedded caches, and steering for five million concurrent plays.",
    securityAngle: "Use short-lived entitlement-bound playback grants, protect origin access, and rotate cache and signing credentials.",
    passHint: "Serve popular titles close to users, steer around unhealthy caches, and keep viewing-state writes asynchronous.",
  },
  {
    id: "autocomplete-tail",
    labId: "search-autocomplete",
    goal: "Answer 100k suggestions per second with a hot cache, immutable segments, and a bounded cold tail.",
    securityAngle: "Keep personalization in signed short-lived headers rather than cache keys, cap query work, and protect index publishing credentials.",
    passHint: "Cache top prefixes at the edge, coalesce segment misses, publish checksummed immutable indexes, and bound typo expansion.",
  },
  {
    id: "partitioned-key-value",
    labId: "dynamodb-from-scratch",
    goal: "Fix a hot database shard, then scale a Dynamo-like key-value store to one million requests per second with explicit quorum behavior.",
    securityAngle: "Encrypt stored data, enforce tenant-aware authorization, isolate administrative credentials, and audit partition and membership changes.",
    passHint: "Derive partition count from target throughput, use consistent hashing and quorum overlap, and repair replicas with versioned reconciliation.",
  },
  {
    id: "multi-channel-notifications",
    labId: "notification-platform",
    goal: "Deliver notifications at 30k requests per second while honoring preferences, quiet hours, and provider failover.",
    securityAngle: "Record channel consent, minimize message content in logs, protect provider credentials, and prevent cross-user notification data access.",
    passHint: "Separate preference checks from delivery workers, queue provider attempts, deduplicate events, and fail over without duplicate sends.",
  },
  {
    id: "delta-file-sync",
    labId: "dropbox-file-sync",
    goal: "Synchronize a billion files with delta encoding, chunk storage, sharing, and consistent metadata.",
    securityAngle: "Use scoped share links with revocation, scan uploaded content, encrypt chunks, and authorize every metadata read.",
    passHint: "Keep block bytes separate from metadata, deduplicate chunks, version file changes, and make sync retries idempotent.",
  },
];

const META_BY_LAB_ID = new Map(PLATFORM_LAB_META.map((entry) => [entry.labId, entry]));

/** Titles come from the canonical guided-lab registry so catalog links stay honest. */
export const PLATFORM_LABS: PlatformLab[] = GUIDED_LABS.flatMap((lab) => {
  const meta = META_BY_LAB_ID.get(lab.id);
  return meta ? [{ ...meta, title: lab.title }] : [];
});

export function getPlatformLab(id: string): PlatformLab | undefined {
  return PLATFORM_LABS.find((lab) => lab.id === id || lab.labId === id);
}

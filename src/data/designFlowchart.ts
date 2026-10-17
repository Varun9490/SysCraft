/**
 * The SysCraft Design Flowchart (Union Blueprint §5.1).
 *
 * A deterministic decision tree that walks a learner from "what are you
 * building?" to one of sixteen canonical architecture patterns. Every leaf
 * ships a 1-click canvas preset built exclusively from SEED_RESOURCES ids, so
 * the result loads straight into the simulator with zero manual wiring.
 *
 * The data is pure (no browser globals) and validated by
 * `designFlowchart.test.ts`: every preset resource id must exist in the seed
 * catalog, every edge must reference a real preset node, and every wiki link
 * must resolve to an encyclopedia module.
 */

import type { ResourceOverrides } from "@/types/resource";

export interface FlowchartOption {
  id: string;
  /** Short button label. */
  label: string;
  /** One-line signal explaining when this branch is the right call. */
  detail: string;
  /** Next question id or leaf id. */
  next: string;
}

export interface FlowchartQuestion {
  kind: "question";
  id: string;
  title: string;
  prompt: string;
  options: FlowchartOption[];
}

export interface FlowPresetNode {
  id: string;
  resourceId: string;
  label: string;
  x: number;
  y: number;
  overrides?: ResourceOverrides;
}

export interface FlowPresetEdge {
  source: string;
  target: string;
}

export interface FlowchartLeaf {
  kind: "leaf";
  id: string;
  /** Canonical pattern name, e.g. "Hybrid fan-out timeline". */
  patternName: string;
  tagline: string;
  summary: string;
  /** Non-obvious failure modes you must design for. */
  watchouts: string[];
  /** Encyclopedia concept ids rendered as /wiki links. */
  wikiConceptIds: string[];
  presetNodes: FlowPresetNode[];
  presetEdges: FlowPresetEdge[];
}

export type FlowchartStep = FlowchartQuestion | FlowchartLeaf;

export const FLOWCHART_START_ID = "flow-start";

const question = (
  id: string,
  title: string,
  prompt: string,
  options: FlowchartOption[],
): FlowchartQuestion => ({ kind: "question", id, title, prompt, options });

export const FLOWCHART_STEPS: Record<string, FlowchartStep> = {
  "flow-start": question("flow-start", "What are you building?", "Pick the load shape closest to your product. Everything downstream branches from this.", [
    {
      id: "opt-read-heavy",
      label: "Read-heavy content",
      detail: "News, docs, catalogs, media pages — mostly cacheable GETs with a 10:1+ read:write ratio.",
      next: "q-read-heavy",
    },
    {
      id: "opt-transactional",
      label: "Transactional API",
      detail: "Orders, payments, bookings — every write has money or inventory attached to it.",
      next: "q-transactional",
    },
    {
      id: "opt-realtime",
      label: "Real-time messaging",
      detail: "Chat, presence, notifications — long-lived connections and per-recipient delivery.",
      next: "q-realtime",
    },
    {
      id: "opt-feed",
      label: "Social feed / timeline",
      detail: "Followers, home timelines, ranking — read fan-out is the whole problem.",
      next: "q-feed",
    },
    {
      id: "opt-media",
      label: "Media upload & playback",
      detail: "Photos, video, documents — big objects must never touch your database.",
      next: "q-media",
    },
    {
      id: "opt-analytics",
      label: "Analytics / event ingestion",
      detail: "Clickstreams, metrics, audit trails — millions of tiny immutable events per hour.",
      next: "q-analytics",
    },
    {
      id: "opt-ai",
      label: "AI / RAG product",
      detail: "Semantic search, copilots, agents — retrieval quality and inference cost are the constraints.",
      next: "q-ai",
    },
    {
      id: "opt-mvp",
      label: "Internal tool / MVP",
      detail: "A handful of users, one team — the goal is shipping, not surviving Black Friday.",
      next: "q-mvp",
    },
  ]),

  "q-read-heavy": question("q-read-heavy", "Where do the reads happen?", "The split between global anonymous reads and authenticated per-user queries changes the first hop.", [
    {
      id: "opt-read-global",
      label: "Globally, anonymous",
      detail: "The same URL is served to everyone — perfect for a CDN edge with long TTLs.",
      next: "leaf-cdn-read-path",
    },
    {
      id: "opt-read-per-user",
      label: "Authenticated dashboards",
      detail: "Each response is per-user and cache-control: private — a shared CDN cache would leak data.",
      next: "leaf-cache-aside-reads",
    },
  ]),

  "q-transactional": question("q-transactional", "What does a write guarantee?", "Strong consistency costs write latency and availability — spend it only where the money is.", [
    {
      id: "opt-txn-strong",
      label: "Strong — no double spend",
      detail: "Balances and inventory must never fork under a partition. Choose consistency over availability (CP).",
      next: "leaf-strong-consistency-writes",
    },
    {
      id: "opt-txn-async",
      label: "Core write strong, side-effects async",
      detail: "The charge must be safe; the confirmation email can be eventually consistent and retried.",
      next: "leaf-write-queue-drain",
    },
  ]),

  "q-realtime": question("q-realtime", "How big does a conversation get?", "Fan-out cost scales with group size, not message count.", [
    {
      id: "opt-realtime-small",
      label: "1:1 and small groups",
      detail: "Direct delivery through a connection tier with a per-recipient inbox is enough.",
      next: "leaf-chat-direct",
    },
    {
      id: "opt-realtime-large",
      label: "Channels of 10k+ members",
      detail: "Naive per-member writes melt under channel fan-out — buffer and process groups as streams.",
      next: "leaf-chat-fanout-streams",
    },
  ]),

  "q-feed": question("q-feed", "Do a few accounts have millions of followers?", "The celebrity problem decides push vs pull vs hybrid fan-out.", [
    {
      id: "opt-feed-celeb",
      label: "Yes — celebrity accounts",
      detail: "Pushing one post to 50M inboxes at write time is impossible; merge those at read time instead.",
      next: "leaf-hybrid-timeline",
    },
    {
      id: "opt-feed-normal",
      label: "No — ordinary users",
      detail: "Average friend counts stay small, so precomputing timelines at write time is cheap and fast to read.",
      next: "leaf-push-timeline",
    },
  ]),

  "q-media": question("q-media", "What hurts more: playback latency or processing backlog?", "Optimize the path your users feel first.", [
    {
      id: "opt-media-playback",
      label: "Global playback p99",
      detail: "Viewers everywhere expect <300ms start-up — the CDN and blob store carry the load.",
      next: "leaf-global-media-cdn",
    },
    {
      id: "opt-media-processing",
      label: "Heavy async processing",
      detail: "Transcoding and thumbnails are CPU-hours of work — pipeline them off the upload path.",
      next: "leaf-transcode-pipeline",
    },
  ]),

  "q-analytics": question("q-analytics", "What happens to the events after ingestion?", "The sink shapes the pipeline: durable rollups vs searchable history.", [
    {
      id: "opt-analytics-realtime",
      label: "Real-time rollups & alerts",
      detail: "Counters, p99s, and detectors must update per-second with exactly-once semantics.",
      next: "leaf-stream-analytics",
    },
    {
      id: "opt-analytics-search",
      label: "Search & ad-hoc queries",
      detail: "Analysts query months of history — index it and let them carve it up.",
      next: "leaf-lake-search",
    },
  ]),

  "q-ai": question("q-ai", "Single-shot retrieval or multi-step agents?", "Agents add loops, tools, and failure modes; plain RAG adds none.", [
    {
      id: "opt-ai-rag",
      label: "RAG search & answers",
      detail: "One retrieval hop, one generation — cap cost at the gateway and cache hard.",
      next: "leaf-rag-service",
    },
    {
      id: "opt-ai-agents",
      label: "Tool-using agents",
      detail: "The model plans, calls tools, and retries — budget for runaway loops and timeouts.",
      next: "leaf-agent-workflows",
    },
  ]),

  "q-mvp": question("q-mvp", "How fast is it growing?", "Boring technology is a feature. Only pre-scale when the curve says so.", [
    {
      id: "opt-mvp-small",
      label: "Flat — a few hundred users",
      detail: "One load balancer, one service, one managed database. Observability from day one.",
      next: "leaf-boring-baseline",
    },
    {
      id: "opt-mvp-growing",
      label: "Doubling monthly",
      detail: "Add the cache tier and CDN before they're needed so the first spike is a non-event.",
      next: "leaf-scale-ready-start",
    },
  ]),

  /* ------------------------------- leaves ------------------------------- */

  "leaf-cdn-read-path": {
    kind: "leaf",
    id: "leaf-cdn-read-path",
    patternName: "CDN-first read path",
    tagline: "Edge cache → service → cache → document store",
    summary:
      "Anonymous, cacheable reads should never reach your origin twice. The CDN absorbs the globe's GETs, a regional cache-aside layer catches the remainder, and only unique misses hit the document store. Your origin bandwidth bill collapses and p99 measures edge latency, not datacenter latency.",
    watchouts: [
      "Invalidation is the hard part — version URLs or purge on publish, never both ad hoc.",
      "Thundering herd after a purge: single-flight the origin refill.",
      "Cache-control: private leaks per-user data into shared caches — audit response headers.",
    ],
    wikiConceptIds: ["caching-strategies", "load-balancing", "replication"],
    presetNodes: [
      { id: "fc_cdn_dns", resourceId: "dns_load_balancer", label: "Global DNS LB", x: 40, y: 180, overrides: { clientRps: 40000 } },
      { id: "fc_cdn_edge", resourceId: "cdn_edge", label: "CDN Edge (95% hit)", x: 320, y: 60, overrides: { cacheHitRate: 0.95 } },
      { id: "fc_cdn_api", resourceId: "rest_service", label: "Read API ×3", x: 620, y: 60, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_cdn_cache", resourceId: "redis_cache", label: "Regional Cache (90%)", x: 900, y: 60, overrides: { cacheHitRate: 0.9, multiAz: true } },
      { id: "fc_cdn_store", resourceId: "document_store", label: "Content Store", x: 1180, y: 60, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_cdn_obs", resourceId: "observability_stack", label: "Traces & SLOs", x: 620, y: 300 },
    ],
    presetEdges: [
      { source: "fc_cdn_dns", target: "fc_cdn_edge" },
      { source: "fc_cdn_edge", target: "fc_cdn_api" },
      { source: "fc_cdn_api", target: "fc_cdn_cache" },
      { source: "fc_cdn_cache", target: "fc_cdn_store" },
      { source: "fc_cdn_api", target: "fc_cdn_obs" },
    ],
  },

  "leaf-cache-aside-reads": {
    kind: "leaf",
    id: "leaf-cache-aside-reads",
    patternName: "Authenticated cache-aside",
    tagline: "Gateway → service → per-user cache → multi-AZ Postgres",
    summary:
      "Per-user dashboards get no CDN shelter, so the win is a cache-aside read path keyed by user and view. The gateway enforces identity and rate limits, the service reads through Redis on 85%+ hit, and Postgres stays small enough to stay fast. Observability closes the loop: you can prove the hit rate that justifies the cache.",
    watchouts: [
      "Key cardinality explodes with per-user caches — budget memory per active user, not per row.",
      "Invalidation on profile writes: write-through or explicit purge, never TTL-only for 'my own data'.",
      "Cold-start after deploy: pre-warm the top tenants or the first minute looks like an outage.",
    ],
    wikiConceptIds: ["caching-strategies", "btree-vs-lsm", "observability-tracing"],
    presetNodes: [
      { id: "fc_ca_gw", resourceId: "api_gateway", label: "API Gateway", x: 40, y: 180, overrides: { clientRps: 8000 } },
      { id: "fc_ca_rl", resourceId: "rate_limiter", label: "Per-tenant limits", x: 300, y: 180, overrides: { rateLimitRps: 500 } },
      { id: "fc_ca_idp", resourceId: "identity_provider", label: "Identity (SSO)", x: 300, y: 380 },
      { id: "fc_ca_api", resourceId: "rest_service", label: "Dashboard API ×3", x: 560, y: 180, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_ca_cache", resourceId: "redis_cache", label: "Cache-aside (85%)", x: 820, y: 100, overrides: { cacheHitRate: 0.85, multiAz: true } },
      { id: "fc_ca_db", resourceId: "postgres_db", label: "Multi-AZ Postgres", x: 820, y: 300, overrides: { replicationFactor: 2, multiAz: true } },
      { id: "fc_ca_obs", resourceId: "observability_stack", label: "SLO dashboards", x: 560, y: 460 },
    ],
    presetEdges: [
      { source: "fc_ca_gw", target: "fc_ca_rl" },
      { source: "fc_ca_rl", target: "fc_ca_api" },
      { source: "fc_ca_idp", target: "fc_ca_api" },
      { source: "fc_ca_api", target: "fc_ca_cache" },
      { source: "fc_ca_cache", target: "fc_ca_db" },
      { source: "fc_ca_api", target: "fc_ca_obs" },
    ],
  },

  "leaf-strong-consistency-writes": {
    kind: "leaf",
    id: "leaf-strong-consistency-writes",
    patternName: "Strong-consistency write path",
    tagline: "Gateway → ledger on a CP database with multi-AZ quorum",
    summary:
      "Money writes get the strictest path available: identity at the edge, per-key limits against replay storms, and a serializable ledger on a distributed SQL store with quorum replication across zones. You deliberately pay write latency and partition availability to guarantee no double spend, ever.",
    watchouts: [
      "Quorum writes fail during partitions — define the client-visible failure (503 + retry) before it happens.",
      "Idempotency keys are mandatory; network retries must not double-charge.",
      "Read replicas lag — after a write, read-your-writes from the leader or use a version token.",
    ],
    wikiConceptIds: ["acid-vs-base", "raft-consensus", "replication"],
    presetNodes: [
      { id: "fc_sc_dns", resourceId: "dns_load_balancer", label: "Regional LB", x: 40, y: 180 },
      { id: "fc_sc_gw", resourceId: "api_gateway", label: "API Gateway", x: 300, y: 180, overrides: { clientRps: 6000 } },
      { id: "fc_sc_rl", resourceId: "rate_limiter", label: "Idempotency guard", x: 560, y: 60, overrides: { rateLimitRps: 400 } },
      { id: "fc_sc_idp", resourceId: "identity_provider", label: "Auth / KYC", x: 560, y: 320 },
      { id: "fc_sc_api", resourceId: "rest_service", label: "Ledger service ×3", x: 820, y: 180, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_sc_db", resourceId: "cockroach_db", label: "Serializable ledger ×3", x: 1080, y: 180, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_sc_obs", resourceId: "observability_stack", label: "Audit trail", x: 820, y: 420 },
    ],
    presetEdges: [
      { source: "fc_sc_dns", target: "fc_sc_gw" },
      { source: "fc_sc_gw", target: "fc_sc_rl" },
      { source: "fc_sc_gw", target: "fc_sc_idp" },
      { source: "fc_sc_rl", target: "fc_sc_api" },
      { source: "fc_sc_idp", target: "fc_sc_api" },
      { source: "fc_sc_api", target: "fc_sc_db" },
      { source: "fc_sc_api", target: "fc_sc_obs" },
    ],
  },

  "leaf-write-queue-drain": {
    kind: "leaf",
    id: "leaf-write-queue-drain",
    patternName: "Write-through, drain async",
    tagline: "Transactional write + queue + idempotent workers",
    summary:
      "The charge lands synchronously on Postgres inside a transaction; everything that can wait — emails, invoices, webhooks, analytics — goes on a durable queue drained by idempotent workers. Users see instant confirmation and slow side-effects scoped to their own retry budget instead of the request path.",
    watchouts: [
      "Dual-write hazard: enqueue inside the same transaction via an outbox table, not a second call.",
      "Poison messages must land in a DLQ with an owner and an alert, not redeliver forever.",
      "Consumer lag is a user-visible metric when webhooks are late — alert on oldest message age.",
    ],
    wikiConceptIds: ["message-queues", "observability-tracing", "acid-vs-base"],
    presetNodes: [
      { id: "fc_wq_gw", resourceId: "api_gateway", label: "Checkout gateway", x: 40, y: 180, overrides: { clientRps: 3000 } },
      { id: "fc_wq_api", resourceId: "rest_service", label: "Orders service ×3", x: 320, y: 180, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_wq_db", resourceId: "postgres_db", label: "Orders + outbox", x: 620, y: 60, overrides: { replicationFactor: 2, multiAz: true } },
      { id: "fc_wq_queue", resourceId: "message_queue", label: "Side-effects queue", x: 620, y: 320 },
      { id: "fc_wq_worker", resourceId: "background_worker", label: "Workers (idempotent)", x: 900, y: 320, overrides: { replicationFactor: 3 } },
      { id: "fc_wq_obs", resourceId: "observability_stack", label: "Lag & DLQ alerts", x: 900, y: 120 },
    ],
    presetEdges: [
      { source: "fc_wq_gw", target: "fc_wq_api" },
      { source: "fc_wq_api", target: "fc_wq_db" },
      { source: "fc_wq_db", target: "fc_wq_queue" },
      { source: "fc_wq_queue", target: "fc_wq_worker" },
      { source: "fc_wq_api", target: "fc_wq_obs" },
    ],
  },

  "leaf-chat-direct": {
    kind: "leaf",
    id: "leaf-chat-direct",
    patternName: "Direct delivery chat",
    tagline: "Connection tier + presence cache + durable inbox",
    summary:
      "For 1:1 and small groups, a stateless WebSocket tier routes messages through a presence cache to the recipient's device, falling back to a per-user inbox in Postgres when they're offline. Delivery is at-least-once with client-side dedup by message id — the classic WhatsApp skeleton at learning scale.",
    watchouts: [
      "Sticky routing: the connection tier must know which node holds a recipient, or messages bounce.",
      "Offline inbox growth is unbounded — cap and compact inboxes aggressively.",
      "Presence flaps under mobile networks: debounce offline transitions ~30s before declaring it.",
    ],
    wikiConceptIds: ["gossip-protocol", "replication", "message-queues"],
    presetNodes: [
      { id: "fc_ch_dns", resourceId: "dns_load_balancer", label: "Sticky LB", x: 40, y: 180 },
      { id: "fc_ch_gw", resourceId: "api_gateway", label: "WS Gateway ×3", x: 300, y: 180, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_ch_idp", resourceId: "identity_provider", label: "Auth + devices", x: 300, y: 400 },
      { id: "fc_ch_api", resourceId: "rest_service", label: "Messaging service", x: 580, y: 180, overrides: { replicationFactor: 3 } },
      { id: "fc_ch_cache", resourceId: "redis_cache", label: "Presence + routing", x: 860, y: 100, overrides: { cacheHitRate: 0.8, multiAz: true } },
      { id: "fc_ch_db", resourceId: "postgres_db", label: "Offline inbox", x: 860, y: 320, overrides: { replicationFactor: 2, multiAz: true } },
      { id: "fc_ch_obs", resourceId: "observability_stack", label: "Delivery SLOs", x: 580, y: 420 },
    ],
    presetEdges: [
      { source: "fc_ch_dns", target: "fc_ch_gw" },
      { source: "fc_ch_gw", target: "fc_ch_api" },
      { source: "fc_ch_idp", target: "fc_ch_gw" },
      { source: "fc_ch_api", target: "fc_ch_cache" },
      { source: "fc_ch_cache", target: "fc_ch_db" },
      { source: "fc_ch_api", target: "fc_ch_obs" },
    ],
  },

  "leaf-chat-fanout-streams": {
    kind: "leaf",
    id: "leaf-chat-fanout-streams",
    patternName: "Channel fan-out on streams",
    tagline: "Kafka between senders and a wide-column inbox store",
    summary:
      "Channels with thousands of members turn every message into thousands of deliveries. Senders write once to a partitioned stream; processor workers fan out to per-user inboxes in Cassandra, and media rides a separate blob path with signed URLs. Scale arrives by adding partitions and consumers, not by rewriting the service.",
    watchouts: [
      "Partition skew: hash by channel id so one huge channel doesn't own one partition.",
      "Fan-out amplification is real — batch inbox writes per processor cycle.",
      "Message ordering per channel matters; keep a monotonic sequence per channel id.",
    ],
    wikiConceptIds: ["event-streaming", "sharding-partitioning", "gossip-protocol"],
    presetNodes: [
      { id: "fc_cf_gw", resourceId: "api_gateway", label: "WS Gateway ×4", x: 40, y: 180, overrides: { replicationFactor: 4, multiAz: true } },
      { id: "fc_cf_api", resourceId: "rest_service", label: "Message ingest", x: 320, y: 180, overrides: { replicationFactor: 3 } },
      { id: "fc_cf_kafka", resourceId: "kafka_stream", label: "Channel streams (32 partitions)", x: 600, y: 100 },
      { id: "fc_cf_proc", resourceId: "stream_processor", label: "Fan-out workers", x: 880, y: 100, overrides: { replicationFactor: 3 } },
      { id: "fc_cf_cass", resourceId: "cassandra_store", label: "Per-user inboxes ×3", x: 1160, y: 100, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_cf_blob", resourceId: "blob_storage", label: "Media (signed URLs)", x: 600, y: 340 },
      { id: "fc_cf_cache", resourceId: "redis_cache", label: "Presence", x: 880, y: 340, overrides: { cacheHitRate: 0.8 } },
      { id: "fc_cf_obs", resourceId: "observability_stack", label: "Lag & fan-out p99", x: 1160, y: 340 },
    ],
    presetEdges: [
      { source: "fc_cf_gw", target: "fc_cf_api" },
      { source: "fc_cf_api", target: "fc_cf_kafka" },
      { source: "fc_cf_api", target: "fc_cf_blob" },
      { source: "fc_cf_kafka", target: "fc_cf_proc" },
      { source: "fc_cf_proc", target: "fc_cf_cass" },
      { source: "fc_cf_proc", target: "fc_cf_cache" },
      { source: "fc_cf_proc", target: "fc_cf_obs" },
    ],
  },

  "leaf-push-timeline": {
    kind: "leaf",
    id: "leaf-push-timeline",
    patternName: "Fan-out-on-write timeline",
    tagline: "Post → fan-out workers → precomputed Redis timelines",
    summary:
      "With ordinary follower counts, the cheapest read is no read at all: when someone posts, workers immediately splice the post into every follower's precomputed timeline in Redis backed by Cassandra history. Home-feed reads become a single fast key lookup, and ranking runs asynchronously off the critical path.",
    watchouts: [
      "Timeline stores are TTL caches, not truth — Cassandra keeps the durable copy.",
      "Cost scales with followers × posts; cap fan-out width and monitor it.",
      "Backfill after downtime must be idempotent or followers see duplicates.",
    ],
    wikiConceptIds: ["sharding-partitioning", "caching-strategies", "event-streaming"],
    presetNodes: [
      { id: "fc_pt_gw", resourceId: "api_gateway", label: "API Gateway", x: 40, y: 180, overrides: { clientRps: 15000 } },
      { id: "fc_pt_api", resourceId: "rest_service", label: "Post service ×3", x: 320, y: 100, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_pt_read", resourceId: "rest_service", label: "Feed reader ×4", x: 320, y: 320, overrides: { replicationFactor: 4, multiAz: true } },
      { id: "fc_pt_kafka", resourceId: "kafka_stream", label: "Post events", x: 620, y: 100 },
      { id: "fc_pt_worker", resourceId: "background_worker", label: "Fan-out writers", x: 880, y: 100, overrides: { replicationFactor: 4 } },
      { id: "fc_pt_cache", resourceId: "redis_cache", label: "Timelines (hot 800)", x: 1140, y: 220, overrides: { cacheHitRate: 0.92, multiAz: true } },
      { id: "fc_pt_cass", resourceId: "cassandra_store", label: "Durable posts ×3", x: 880, y: 400, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_pt_obs", resourceId: "observability_stack", label: "Feed p99", x: 620, y: 400 },
    ],
    presetEdges: [
      { source: "fc_pt_gw", target: "fc_pt_api" },
      { source: "fc_pt_gw", target: "fc_pt_read" },
      { source: "fc_pt_api", target: "fc_pt_kafka" },
      { source: "fc_pt_kafka", target: "fc_pt_worker" },
      { source: "fc_pt_worker", target: "fc_pt_cache" },
      { source: "fc_pt_worker", target: "fc_pt_cass" },
      { source: "fc_pt_read", target: "fc_pt_cache" },
      { source: "fc_pt_read", target: "fc_pt_obs" },
    ],
  },

  "leaf-hybrid-timeline": {
    kind: "leaf",
    id: "leaf-hybrid-timeline",
    patternName: "Hybrid fan-out timeline",
    tagline: "Push for everyone, pull-merge supernodes at read time",
    summary:
      "Celebrity accounts make pure push impossible — 50M inbox writes per post. The hybrid keeps push for normal follows and stores celebrity posts once; the reader merges a handful of celebrity timelines into the user's own at request time, with a bloom-filtered cache of 'already-seen' ids keeping merges idempotent.",
    watchouts: [
      "The celebrity list is dynamic — detect supernodes by follower threshold, don't hardcode names.",
      "Read-time merge happens for exactly your heaviest users: cache merged results briefly.",
      "Backfill on threshold crossing: a user promoted to celebrity needs their timeline reconciled once.",
    ],
    wikiConceptIds: ["sharding-partitioning", "caching-strategies", "bloom-filters"],
    presetNodes: [
      { id: "fc_ht_gw", resourceId: "api_gateway", label: "API Gateway", x: 40, y: 180, overrides: { clientRps: 20000 } },
      { id: "fc_ht_api", resourceId: "rest_service", label: "Post service ×3", x: 320, y: 100, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_ht_reader", resourceId: "rest_service", label: "Timeline merger ×4", x: 320, y: 360, overrides: { replicationFactor: 4, multiAz: true } },
      { id: "fc_ht_proc", resourceId: "stream_processor", label: "Fan-out classifier", x: 640, y: 100, overrides: { replicationFactor: 3 } },
      { id: "fc_ht_worker", resourceId: "background_worker", label: "Push workers", x: 920, y: 60, overrides: { replicationFactor: 4 } },
      { id: "fc_ht_cache", resourceId: "redis_cache", label: "Timelines + seen-set", x: 920, y: 260, overrides: { cacheHitRate: 0.9, multiAz: true } },
      { id: "fc_ht_cass", resourceId: "cassandra_store", label: "Posts + supernode timelines", x: 640, y: 360, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_ht_obs", resourceId: "observability_stack", label: "Merge latency", x: 640, y: 560 },
    ],
    presetEdges: [
      { source: "fc_ht_gw", target: "fc_ht_api" },
      { source: "fc_ht_gw", target: "fc_ht_reader" },
      { source: "fc_ht_api", target: "fc_ht_proc" },
      { source: "fc_ht_proc", target: "fc_ht_worker" },
      { source: "fc_ht_worker", target: "fc_ht_cache" },
      { source: "fc_ht_worker", target: "fc_ht_cass" },
      { source: "fc_ht_reader", target: "fc_ht_cache" },
      { source: "fc_ht_reader", target: "fc_ht_cass" },
      { source: "fc_ht_reader", target: "fc_ht_obs" },
    ],
  },

  "leaf-global-media-cdn": {
    kind: "leaf",
    id: "leaf-global-media-cdn",
    patternName: "Global media delivery",
    tagline: "Signed URLs → CDN → blob storage, metadata elsewhere",
    summary:
      "Playback is a CDN problem, not a server problem. Bytes live in blob storage behind signed URLs, the CDN caches them at the edge with long TTLs, and your services only serve small metadata lookups backed by a cache. Upload and download paths are completely separate so a viral video never touches the API fleet.",
    watchouts: [
      "Signed URL TTL vs DRM/piracy: short TTL wins; refresh via metadata API, not long-lived links.",
      "Byte-range requests (seeking) must be CDN-cached; misconfigured CORS breaks scrubbing.",
      "Egress cost is the bill — cache hit ratio is a financial metric, alert on it.",
    ],
    wikiConceptIds: ["caching-strategies", "load-balancing", "observability-tracing"],
    presetNodes: [
      { id: "fc_gm_dns", resourceId: "dns_load_balancer", label: "Geo DNS", x: 40, y: 200 },
      { id: "fc_gm_cdn", resourceId: "cdn_edge", label: "CDN (92% hit)", x: 320, y: 80, overrides: { cacheHitRate: 0.92 } },
      { id: "fc_gm_api", resourceId: "rest_service", label: "Metadata API ×3", x: 320, y: 320, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_gm_cache", resourceId: "redis_cache", label: "Metadata cache", x: 620, y: 320, overrides: { cacheHitRate: 0.9 } },
      { id: "fc_gm_doc", resourceId: "document_store", label: "Catalog", x: 900, y: 320, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_gm_blob", resourceId: "blob_storage", label: "Media origin", x: 620, y: 80, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_gm_obs", resourceId: "observability_stack", label: "Hit ratio & egress", x: 900, y: 520 },
    ],
    presetEdges: [
      { source: "fc_gm_dns", target: "fc_gm_cdn" },
      { source: "fc_gm_dns", target: "fc_gm_api" },
      { source: "fc_gm_cdn", target: "fc_gm_blob" },
      { source: "fc_gm_api", target: "fc_gm_cache" },
      { source: "fc_gm_cache", target: "fc_gm_doc" },
      { source: "fc_gm_api", target: "fc_gm_obs" },
    ],
  },

  "leaf-transcode-pipeline": {
    kind: "leaf",
    id: "leaf-transcode-pipeline",
    patternName: "Async media pipeline",
    tagline: "Upload → blob → stream → transcode workers → renditions",
    summary:
      "Resumable uploads land raw files in blob storage and publish an event; a stream-backed pipeline transcodes renditions and thumbnails with workers that can restart on spot instances. The client polls or gets a webhook when the asset is ready — upload latency stays seconds while processing takes minutes, off the request path entirely.",
    watchouts: [
      "Idempotent renders: a retried transcode must overwrite, not duplicate, a rendition.",
      "Store a per-asset job state machine; 'stuck in processing' is your most common support ticket.",
      "Spot-worker reclaim needs checkpoints — long transcodes must resume mid-file.",
    ],
    wikiConceptIds: ["event-streaming", "message-queues", "observability-tracing"],
    presetNodes: [
      { id: "fc_tp_gw", resourceId: "api_gateway", label: "Upload gateway", x: 40, y: 180, overrides: { clientRps: 4000 } },
      { id: "fc_tp_api", resourceId: "rest_service", label: "Ingest service ×3", x: 320, y: 180, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_tp_blob", resourceId: "blob_storage", label: "Raw + renditions", x: 620, y: 60, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_tp_kafka", resourceId: "kafka_stream", label: "Job stream", x: 620, y: 320 },
      { id: "fc_tp_worker", resourceId: "background_worker", label: "Transcode workers ×6", x: 900, y: 320, overrides: { replicationFactor: 6 } },
      { id: "fc_tp_proc", resourceId: "stream_processor", label: "Job state machine", x: 900, y: 120 },
      { id: "fc_tp_obs", resourceId: "observability_stack", label: "Stuck-job alerts", x: 1160, y: 320 },
    ],
    presetEdges: [
      { source: "fc_tp_gw", target: "fc_tp_api" },
      { source: "fc_tp_api", target: "fc_tp_blob" },
      { source: "fc_tp_api", target: "fc_tp_kafka" },
      { source: "fc_tp_kafka", target: "fc_tp_proc" },
      { source: "fc_tp_proc", target: "fc_tp_worker" },
      { source: "fc_tp_worker", target: "fc_tp_blob" },
      { source: "fc_tp_proc", target: "fc_tp_obs" },
    ],
  },

  "leaf-stream-analytics": {
    kind: "leaf",
    id: "leaf-stream-analytics",
    patternName: "Real-time stream analytics",
    tagline: "Ingest stream → stateful processors → rollup store",
    summary:
      "Events land on a partitioned log first — the durable buffer that absorbs spikes — and stateful processors compute counters, percentiles, and detectors per window. Rollups land in a wide-column store keyed by metric and time bucket, so dashboards read one row per window instead of scanning raw events.",
    watchouts: [
      "Late events: define window boundaries with allowed lateness; refire or drop, never both silently.",
      "Exactly-once sink writes: idempotent upserts on (metric, window) keys.",
      "Backpressure: if processors lag, shed or sample — the log is not infinite by default. Cap retention by cost.",
    ],
    wikiConceptIds: ["event-streaming", "sharding-partitioning", "observability-tracing"],
    presetNodes: [
      { id: "fc_sa_gw", resourceId: "api_gateway", label: "Ingest gateway", x: 40, y: 180, overrides: { clientRps: 50000 } },
      { id: "fc_sa_api", resourceId: "rest_service", label: "Collector ×4", x: 320, y: 180, overrides: { replicationFactor: 4, multiAz: true } },
      { id: "fc_sa_kafka", resourceId: "kafka_stream", label: "Event log (64 partitions)", x: 620, y: 180 },
      { id: "fc_sa_proc", resourceId: "stream_processor", label: "Windows ×4", x: 900, y: 100, overrides: { replicationFactor: 4 } },
      { id: "fc_sa_cass", resourceId: "cassandra_store", label: "Rollups ×3", x: 1180, y: 100, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_sa_blob", resourceId: "blob_storage", label: "Raw archive", x: 900, y: 360 },
      { id: "fc_sa_obs", resourceId: "observability_stack", label: "Consumer lag", x: 620, y: 400 },
    ],
    presetEdges: [
      { source: "fc_sa_gw", target: "fc_sa_api" },
      { source: "fc_sa_api", target: "fc_sa_kafka" },
      { source: "fc_sa_kafka", target: "fc_sa_proc" },
      { source: "fc_sa_proc", target: "fc_sa_cass" },
      { source: "fc_sa_proc", target: "fc_sa_blob" },
      { source: "fc_sa_kafka", target: "fc_sa_obs" },
    ],
  },

  "leaf-lake-search": {
    kind: "leaf",
    id: "leaf-lake-search",
    patternName: "Searchable event lake",
    tagline: "Stream → indexer + archive, queries hit the index",
    summary:
      "Analysts want SQL and full-text over months of events, so the pipeline splits at ingestion: a stream processor indexes hot events into a search cluster for interactive queries while a cheap archive keeps the raw log in blob storage for replays. Bloom-filtered id sets make 'did this event land?' checks cheap inside the indexer.",
    watchouts: [
      "Index mapping changes are breaking changes — version schemas before rollout.",
      "Archive replay must dedupe on event id, or reindexing doubles counts.",
      "Query-time joins across search and archive are a latency trap; denormalize at ingest.",
    ],
    wikiConceptIds: ["bloom-filters", "event-streaming", "sharding-partitioning"],
    presetNodes: [
      { id: "fc_lk_api", resourceId: "rest_service", label: "Ingest ×4", x: 40, y: 180, overrides: { replicationFactor: 4 } },
      { id: "fc_lk_kafka", resourceId: "kafka_stream", label: "Event log", x: 320, y: 180 },
      { id: "fc_lk_proc", resourceId: "stream_processor", label: "Indexer ×3", x: 600, y: 100, overrides: { replicationFactor: 3 } },
      { id: "fc_lk_search", resourceId: "search_cluster", label: "Search index ×3", x: 880, y: 100, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_lk_blob", resourceId: "blob_storage", label: "Raw archive (cheap)", x: 600, y: 360 },
      { id: "fc_lk_query", resourceId: "rest_service", label: "Query API ×3", x: 1160, y: 100, overrides: { replicationFactor: 3 } },
      { id: "fc_lk_obs", resourceId: "observability_stack", label: "Query latency", x: 880, y: 360 },
    ],
    presetEdges: [
      { source: "fc_lk_api", target: "fc_lk_kafka" },
      { source: "fc_lk_kafka", target: "fc_lk_proc" },
      { source: "fc_lk_proc", target: "fc_lk_search" },
      { source: "fc_lk_proc", target: "fc_lk_blob" },
      { source: "fc_lk_search", target: "fc_lk_query" },
      { source: "fc_lk_query", target: "fc_lk_obs" },
    ],
  },

  "leaf-rag-service": {
    kind: "leaf",
    id: "leaf-rag-service",
    patternName: "RAG service",
    tagline: "Gateway caps cost → retrieve → generate, cache aggressively",
    summary:
      "Retrieval-augmented generation is a latency-and-cost problem wearing an AI mask. The gateway enforces per-tenant rate limits and token budgets, a cache answers repeat questions instantly, the vector store handles semantic recall above 88%, and the inference tier autoscales on KV-cache pressure rather than raw RPS.",
    watchouts: [
      "Embedding model changes invalidate the whole index — version vectors alongside documents.",
      "Prompt inflation: context length creeping up silently triples TTFT and cost; cap and measure.",
      "Stale answers from cache: key on (question embedding bucket, corpus version), not raw text.",
    ],
    wikiConceptIds: ["vector-search", "llm-systems", "rate-limiting"],
    presetNodes: [
      { id: "fc_rg_gw", resourceId: "api_gateway", label: "AI Gateway", x: 40, y: 200, overrides: { clientRps: 6000 } },
      { id: "fc_rg_rl", resourceId: "rate_limiter", label: "Token budgets", x: 300, y: 80, overrides: { rateLimitRps: 300 } },
      { id: "fc_rg_cache", resourceId: "redis_cache", label: "Answer cache (80%)", x: 300, y: 340, overrides: { cacheHitRate: 0.8 } },
      { id: "fc_rg_api", resourceId: "rest_service", label: "RAG orchestrator ×3", x: 580, y: 200, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_rg_vec", resourceId: "vector_database", label: "Vector index ×3", x: 860, y: 60, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_rg_llm", resourceId: "llm_inference", label: "Inference (KV-cache aware)", x: 860, y: 340, overrides: { replicationFactor: 2, multiAz: true, vramGbPerReplica: 80 } },
      { id: "fc_rg_obs", resourceId: "observability_stack", label: "TTFT & recall", x: 1140, y: 200 },
    ],
    presetEdges: [
      { source: "fc_rg_gw", target: "fc_rg_rl" },
      { source: "fc_rg_gw", target: "fc_rg_cache" },
      { source: "fc_rg_rl", target: "fc_rg_api" },
      { source: "fc_rg_cache", target: "fc_rg_api" },
      { source: "fc_rg_api", target: "fc_rg_vec" },
      { source: "fc_rg_api", target: "fc_rg_llm" },
      { source: "fc_rg_api", target: "fc_rg_obs" },
    ],
  },

  "leaf-agent-workflows": {
    kind: "leaf",
    id: "leaf-agent-workflows",
    patternName: "Tool-using agent workflows",
    tagline: "Orchestrator plans → tools run → queue absorbs long steps",
    summary:
      "Agents loop: plan, call a tool, observe, repeat. The orchestrator owns that loop with a hard step and token budget, synchronous tools answer inline while slow ones are dispatched to a queue and resumed by workers, and every hop writes a trace step so a runaway loop is visible in seconds, not in the bill.",
    watchouts: [
      "Budget the loop: max steps, max tokens, max wall-clock — agents that can run forever will.",
      "Tool idempotency: a retried 'send email' tool must not send twice.",
      "Partial failures need a resumable plan state, or the agent restarts from zero every flake.",
    ],
    wikiConceptIds: ["llm-systems", "message-queues", "vector-search"],
    presetNodes: [
      { id: "fc_ag_gw", resourceId: "api_gateway", label: "Agent gateway", x: 40, y: 200, overrides: { clientRps: 3000 } },
      { id: "fc_ag_api", resourceId: "rest_service", label: "Session service ×3", x: 320, y: 200, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_ag_agent", resourceId: "agent_orchestrator", label: "Planner (bounded loop)", x: 600, y: 200, overrides: { replicationFactor: 2, multiAz: true } },
      { id: "fc_ag_llm", resourceId: "llm_inference", label: "Model tier", x: 880, y: 80, overrides: { replicationFactor: 2, vramGbPerReplica: 80 } },
      { id: "fc_ag_vec", resourceId: "vector_database", label: "Memory / retrieval", x: 880, y: 260, overrides: { replicationFactor: 3 } },
      { id: "fc_ag_queue", resourceId: "message_queue", label: "Long-running tools", x: 880, y: 440 },
      { id: "fc_ag_worker", resourceId: "background_worker", label: "Tool workers ×3", x: 1140, y: 440, overrides: { replicationFactor: 3 } },
      { id: "fc_ag_obs", resourceId: "observability_stack", label: "Step traces", x: 600, y: 440 },
    ],
    presetEdges: [
      { source: "fc_ag_gw", target: "fc_ag_api" },
      { source: "fc_ag_api", target: "fc_ag_agent" },
      { source: "fc_ag_agent", target: "fc_ag_llm" },
      { source: "fc_ag_agent", target: "fc_ag_vec" },
      { source: "fc_ag_agent", target: "fc_ag_queue" },
      { source: "fc_ag_queue", target: "fc_ag_worker" },
      { source: "fc_ag_agent", target: "fc_ag_obs" },
    ],
  },

  "leaf-boring-baseline": {
    kind: "leaf",
    id: "leaf-boring-baseline",
    patternName: "Boring baseline",
    tagline: "LB → monolith → managed Postgres + observability",
    summary:
      "A few hundred users do not need microservices. One load balancer, one stateless service, one managed multi-AZ database, and real observability from day one. Every later pattern in this flowchart is an incremental upgrade to this skeleton — nothing gets thrown away when the cache tier or queue lands.",
    watchouts: [
      "The monolith must stay stateless — no sessions on disk, or scaling out breaks logins.",
      "Migrations are your deployment risk: run them backward-compatible, one deploy ahead.",
      "Instrument before you need it: the first incident is not the time to add tracing.",
    ],
    wikiConceptIds: ["load-balancing", "microservices-monolith", "observability-tracing"],
    presetNodes: [
      { id: "fc_bb_dns", resourceId: "dns_load_balancer", label: "Load balancer", x: 60, y: 200 },
      { id: "fc_bb_api", resourceId: "rest_service", label: "App (stateless) ×2", x: 340, y: 200, overrides: { replicationFactor: 2 } },
      { id: "fc_bb_db", resourceId: "postgres_db", label: "Managed Postgres", x: 620, y: 200, overrides: { multiAz: true } },
      { id: "fc_bb_obs", resourceId: "observability_stack", label: "Logs, metrics, alerts", x: 340, y: 400 },
    ],
    presetEdges: [
      { source: "fc_bb_dns", target: "fc_bb_api" },
      { source: "fc_bb_api", target: "fc_bb_db" },
      { source: "fc_bb_api", target: "fc_bb_obs" },
    ],
  },

  "leaf-scale-ready-start": {
    kind: "leaf",
    id: "leaf-scale-ready-start",
    patternName: "Scale-ready start",
    tagline: "CDN + gateway + cache + multi-AZ database before the spike",
    summary:
      "For products doubling monthly, the cheap insurance is the pre-scale skeleton: CDN for static and cacheable traffic, a gateway with rate limits, a cache-aside tier, and a multi-AZ database with replicas. Nothing here is exotic — it's the boring baseline with the two tiers that every growth spike attacks first.",
    watchouts: [
      "Do not skip the boring parts to reach this: without observability the cache is a blind spot.",
      "Multi-AZ costs ~2× on the database — buy it when the SLA is real, not aspirational.",
      "Per-client rate limits must ship before the first partner integration, or they will be your load test.",
    ],
    wikiConceptIds: ["load-balancing", "caching-strategies", "rate-limiting"],
    presetNodes: [
      { id: "fc_sr_dns", resourceId: "dns_load_balancer", label: "DNS + LB", x: 40, y: 200 },
      { id: "fc_sr_cdn", resourceId: "cdn_edge", label: "CDN (static)", x: 300, y: 60, overrides: { cacheHitRate: 0.9 } },
      { id: "fc_sr_gw", resourceId: "api_gateway", label: "API Gateway", x: 300, y: 320, overrides: { clientRps: 10000 } },
      { id: "fc_sr_rl", resourceId: "rate_limiter", label: "Per-client limits", x: 560, y: 440, overrides: { rateLimitRps: 800 } },
      { id: "fc_sr_api", resourceId: "rest_service", label: "App ×3", x: 560, y: 240, overrides: { replicationFactor: 3, multiAz: true } },
      { id: "fc_sr_cache", resourceId: "redis_cache", label: "Cache-aside (85%)", x: 840, y: 140, overrides: { cacheHitRate: 0.85, multiAz: true } },
      { id: "fc_sr_db", resourceId: "postgres_db", label: "Primary + replica", x: 840, y: 340, overrides: { replicationFactor: 2, multiAz: true } },
      { id: "fc_sr_obs", resourceId: "observability_stack", label: "Golden signals", x: 1120, y: 240 },
    ],
    presetEdges: [
      { source: "fc_sr_dns", target: "fc_sr_cdn" },
      { source: "fc_sr_dns", target: "fc_sr_gw" },
      { source: "fc_sr_gw", target: "fc_sr_rl" },
      { source: "fc_sr_rl", target: "fc_sr_api" },
      { source: "fc_sr_api", target: "fc_sr_cache" },
      { source: "fc_sr_cache", target: "fc_sr_db" },
      { source: "fc_sr_api", target: "fc_sr_obs" },
    ],
  },
};

export const FLOWCHART_LEAVES: FlowchartLeaf[] = Object.values(FLOWCHART_STEPS).filter(
  (step): step is FlowchartLeaf => step.kind === "leaf",
);

export function getFlowchartStep(id: string): FlowchartStep | undefined {
  return FLOWCHART_STEPS[id];
}

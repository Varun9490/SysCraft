import type { ResourceOverrides } from "@/types/resource";

/**
 * Prebuilt, ready-to-run system topologies for the canvas.
 *
 * Each blueprint is a complete, defensible design a learner can load in one
 * click, run the simulator against, and then break with chaos scenarios. Node
 * `edges` reference other nodes by array index, so the loader can mint fresh
 * node ids without id juggling. Every blueprint ships an entry-point service
 * carrying `clientRps` so traffic actually flows the moment it loads.
 */

export type BlueprintDifficulty = "beginner" | "intermediate" | "advanced" | "expert";

export type BlueprintCategory = "Web" | "Realtime" | "Data" | "Payments" | "Media" | "AI" | "Platform";

export interface BlueprintNode {
  resourceId: string;
  label: string;
  x: number;
  y: number;
  overrides?: ResourceOverrides;
}

export interface Blueprint {
  id: string;
  name: string;
  summary: string;
  difficulty: BlueprintDifficulty;
  category: BlueprintCategory;
  /** What the learner should notice once it is on the canvas. */
  highlights: string[];
  nodes: BlueprintNode[];
  /** [sourceIndex, targetIndex] pairs into `nodes`. */
  edges: Array<[number, number]>;
}

export const BLUEPRINT_CATEGORIES: BlueprintCategory[] = [
  "Web",
  "Realtime",
  "Data",
  "Payments",
  "Media",
  "AI",
  "Platform",
];

export const BLUEPRINTS: Blueprint[] = [
  {
    id: "url-shortener",
    name: "URL shortener",
    summary: "Read-heavy redirect path with a cache in front of a durable code store and async click analytics.",
    difficulty: "beginner",
    category: "Web",
    highlights: ["Cache-aside on the hot redirect", "Writes stay tiny; reads are cached", "Click events leave the critical path"],
    nodes: [
      { resourceId: "api_gateway", label: "Shorten API", x: 60, y: 200 },
      { resourceId: "rest_service", label: "Redirect service", x: 360, y: 200, overrides: { clientRps: 500, multiAz: true } },
      { resourceId: "redis_cache", label: "Code cache", x: 660, y: 100, overrides: { cacheHitRate: 0.95 } },
      { resourceId: "postgres_db", label: "Code store", x: 660, y: 320, overrides: { replicationFactor: 2, multiAz: true } },
      { resourceId: "kafka_stream", label: "Click stream", x: 960, y: 200 },
      { resourceId: "background_worker", label: "Analytics writers", x: 1260, y: 200, overrides: { replicationFactor: 3 } },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [1, 3],
      [1, 4],
      [4, 5],
    ],
  },
  {
    id: "chat-app",
    name: "Realtime chat",
    summary: "WebSocket gateway, presence cache, wide-column message inbox, and a Kafka spool for offline delivery.",
    difficulty: "intermediate",
    category: "Realtime",
    highlights: ["Connection tier split from logic tier", "Presence is ephemeral, messages are durable", "Offline messages drain from the stream"],
    nodes: [
      { resourceId: "api_gateway", label: "WS / gateway", x: 60, y: 220 },
      { resourceId: "rest_service", label: "Chat service", x: 360, y: 220, overrides: { clientRps: 800, multiAz: true } },
      { resourceId: "redis_cache", label: "Presence", x: 660, y: 100, overrides: { cacheHitRate: 0.9 } },
      { resourceId: "cassandra_store", label: "Message inbox", x: 660, y: 340, overrides: { replicationFactor: 3, multiAz: true } },
      { resourceId: "kafka_stream", label: "Offline spool", x: 960, y: 220 },
      { resourceId: "blob_storage", label: "Media store", x: 960, y: 420 },
      { resourceId: "cdn_edge", label: "Media CDN", x: 1260, y: 420 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [1, 3],
      [1, 4],
      [1, 5],
      [5, 6],
    ],
  },
  {
    id: "social-feed",
    name: "Social timeline",
    summary: "Hybrid fan-out feed: push to follower timelines, pull from celebrities, all ranked off the critical path.",
    difficulty: "intermediate",
    category: "Realtime",
    highlights: ["Redis holds precomputed timelines", "Celebrity posts are pulled, not fanned out", "Ranking runs asynchronously in Flink"],
    nodes: [
      { resourceId: "cdn_edge", label: "Media CDN", x: 40, y: 200 },
      { resourceId: "api_gateway", label: "API gateway", x: 320, y: 200 },
      { resourceId: "rest_service", label: "Feed service", x: 600, y: 200, overrides: { clientRps: 900, multiAz: true } },
      { resourceId: "redis_cache", label: "Timeline cache", x: 900, y: 80, overrides: { cacheHitRate: 0.92 } },
      { resourceId: "cassandra_store", label: "Post store", x: 900, y: 300, overrides: { replicationFactor: 3, multiAz: true } },
      { resourceId: "kafka_stream", label: "Fan-out log", x: 320, y: 420 },
      { resourceId: "stream_processor", label: "Ranker (Flink)", x: 640, y: 420 },
    ],
    edges: [
      [1, 2],
      [2, 3],
      [2, 4],
      [2, 5],
      [5, 6],
      [6, 3],
      [0, 1],
    ],
  },
  {
    id: "ecommerce-checkout",
    name: "Checkout flow",
    summary: "Gateway, cart service, session cache, transactional orders database, and async order-confirmation workers.",
    difficulty: "intermediate",
    category: "Web",
    highlights: ["Orders need strong consistency", "Sessions live in Redis", "Confirmations and email are async"],
    nodes: [
      { resourceId: "web_application_firewall", label: "WAF + DDoS", x: 40, y: 220 },
      { resourceId: "api_gateway", label: "API gateway", x: 320, y: 220 },
      { resourceId: "rest_service", label: "Checkout service", x: 620, y: 220, overrides: { clientRps: 400, multiAz: true } },
      { resourceId: "redis_cache", label: "Cart + session", x: 920, y: 90, overrides: { cacheHitRate: 0.88 } },
      { resourceId: "postgres_db", label: "Orders DB", x: 920, y: 340, overrides: { replicationFactor: 3, multiAz: true, writeRatio: 0.7 } },
      { resourceId: "message_queue", label: "Confirmation queue", x: 1220, y: 220 },
      { resourceId: "background_worker", label: "Email + fulfilment", x: 1500, y: 220, overrides: { replicationFactor: 4 } },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
      [2, 5],
      [5, 6],
    ],
  },
  {
    id: "video-streaming",
    name: "Video streaming",
    summary: "Global edge delivery over object storage with async transcoding and per-session viewing state.",
    difficulty: "advanced",
    category: "Media",
    highlights: ["Control plane separate from data plane", "Transcode ladder built asynchronously", "Edge offload keeps origin egress sane"],
    nodes: [
      { resourceId: "cdn_edge", label: "Global CDN / OCA", x: 40, y: 220 },
      { resourceId: "api_gateway", label: "Playback API", x: 360, y: 220 },
      { resourceId: "rest_service", label: "Steering service", x: 680, y: 220, overrides: { clientRps: 1200, multiAz: true } },
      { resourceId: "blob_storage", label: "Encode origin", x: 1000, y: 90 },
      { resourceId: "cassandra_store", label: "Viewing state", x: 1000, y: 340, overrides: { replicationFactor: 3, multiAz: true } },
      { resourceId: "kafka_stream", label: "Telemetry", x: 1000, y: 560 },
      { resourceId: "stream_processor", label: "Transcode orchestrator", x: 680, y: 560 },
      { resourceId: "background_worker", label: "Encoder fleet", x: 360, y: 560, overrides: { replicationFactor: 6 } },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
      [2, 5],
      [7, 3],
      [6, 7],
    ],
  },
  {
    id: "payment-ledger",
    name: "Payment ledger",
    summary: "PCI-scoped ledger on distributed SQL with idempotent charges, signed webhooks, and fenced PSP failover.",
    difficulty: "advanced",
    category: "Payments",
    highlights: ["Ledger is append-only and consistent", "Every write is idempotent", "Webhooks retry from a durable queue"],
    nodes: [
      { resourceId: "web_application_firewall", label: "PCI edge / WAF", x: 40, y: 220 },
      { resourceId: "api_gateway", label: "Payments gateway", x: 320, y: 220 },
      { resourceId: "identity_provider", label: "Merchant auth", x: 320, y: 440 },
      { resourceId: "rest_service", label: "Charge service", x: 620, y: 220, overrides: { clientRps: 300, multiAz: true } },
      { resourceId: "cockroach_db", label: "Double-entry ledger", x: 940, y: 120, overrides: { replicationFactor: 3, multiAz: true, writeRatio: 0.9 } },
      { resourceId: "secrets_manager", label: "PSP secrets", x: 940, y: 340 },
      { resourceId: "message_queue", label: "Webhook queue", x: 940, y: 540 },
      { resourceId: "background_worker", label: "Retry workers", x: 1240, y: 540, overrides: { replicationFactor: 3 } },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [1, 3],
      [3, 4],
      [3, 5],
      [3, 6],
      [6, 7],
    ],
  },
  {
    id: "ride-hailing",
    name: "Ride-hailing dispatch",
    summary: "Write-heavy location stream into a geo index, cell-sharded matcher, and trip store with fencing tokens.",
    difficulty: "advanced",
    category: "Data",
    highlights: ["250k location writes/sec absorbed by the log", "Matching is sharded by H3 cell", "Stale drivers expire on TTL"],
    nodes: [
      { resourceId: "api_gateway", label: "Driver / rider GW", x: 40, y: 220 },
      { resourceId: "kafka_stream", label: "Location log", x: 360, y: 220 },
      { resourceId: "stream_processor", label: "H3 indexer", x: 680, y: 120 },
      { resourceId: "redis_cache", label: "Geo cell index", x: 1000, y: 120, overrides: { cacheHitRate: 0.85 } },
      { resourceId: "rest_service", label: "Match service", x: 680, y: 400, overrides: { clientRps: 600, multiAz: true } },
      { resourceId: "postgres_db", label: "Trips DB", x: 1000, y: 400, overrides: { replicationFactor: 3, multiAz: true, writeRatio: 0.6 } },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [1, 4],
    ],
  },
  {
    id: "search-autocomplete",
    name: "Search autocomplete",
    summary: "Edge-served top-k prefix suggestions backed by a trie cache, search cluster, and a trend ingester.",
    difficulty: "intermediate",
    category: "Data",
    highlights: ["Top prefixes served entirely from the edge", "Trie cache in Redis for the long tail", "Trends refresh every 60s"],
    nodes: [
      { resourceId: "cdn_edge", label: "Edge cache", x: 40, y: 200 },
      { resourceId: "api_gateway", label: "Suggest gateway", x: 340, y: 200 },
      { resourceId: "rest_service", label: "Suggester", x: 640, y: 200, overrides: { clientRps: 1500, multiAz: true } },
      { resourceId: "redis_cache", label: "Prefix trie", x: 940, y: 90, overrides: { cacheHitRate: 0.9 } },
      { resourceId: "search_cluster", label: "Phrase index", x: 940, y: 320, overrides: { replicationFactor: 2, multiAz: true } },
      { resourceId: "kafka_stream", label: "Query log", x: 640, y: 420 },
      { resourceId: "stream_processor", label: "Trend ingester", x: 340, y: 420 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
      [2, 5],
      [5, 6],
      [6, 3],
    ],
  },
  {
    id: "notification-platform",
    name: "Notification platform",
    summary: "Event-driven fan-out with per-provider queues, a rate limiter, and template rendering workers.",
    difficulty: "intermediate",
    category: "Realtime",
    highlights: ["One queue per provider isolates outages", "Rate limiter caps SMS storms", "Prefs evaluated at send time"],
    nodes: [
      { resourceId: "event_bus", label: "Event bus", x: 40, y: 220 },
      { resourceId: "rest_service", label: "Template service", x: 360, y: 220, overrides: { clientRps: 700, multiAz: true } },
      { resourceId: "rate_limiter", label: "Provider limiter", x: 680, y: 220, overrides: { rateLimitRps: 3000 } },
      { resourceId: "message_queue", label: "Send queue", x: 1000, y: 120 },
      { resourceId: "background_worker", label: "Sender workers", x: 1000, y: 360, overrides: { replicationFactor: 4 } },
      { resourceId: "observability_stack", label: "Delivery telemetry", x: 680, y: 440 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
    ],
  },
  {
    id: "rag-assistant",
    name: "RAG assistant",
    summary: "Retrieval-augmented agent: hybrid search over a vector store, LLM pool with KV-cache, and a tool sandbox.",
    difficulty: "advanced",
    category: "AI",
    highlights: ["Retrieve before you generate", "Vector store + search give hybrid recall", "Session cache cuts repeat retrieval cost"],
    nodes: [
      { resourceId: "api_gateway", label: "Assistant API", x: 40, y: 240 },
      { resourceId: "agent_orchestrator", label: "Agent (RAG + tools)", x: 360, y: 240, overrides: { clientRps: 60, multiAz: false } },
      { resourceId: "vector_database", label: "Vector store", x: 680, y: 80, overrides: { replicationFactor: 2 } },
      { resourceId: "search_cluster", label: "Hybrid search", x: 680, y: 260 },
      { resourceId: "redis_cache", label: "Session + retrieval cache", x: 680, y: 440, overrides: { cacheHitRate: 0.7 } },
      { resourceId: "llm_inference", label: "LLM pool (vLLM)", x: 1000, y: 160, overrides: { replicationFactor: 2, avgPromptTokens: 2048, avgOutputTokens: 384 } },
      { resourceId: "postgres_db", label: "Ticket store", x: 1000, y: 380, overrides: { multiAz: true } },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [1, 3],
      [1, 4],
      [1, 5],
      [1, 6],
    ],
  },
  {
    id: "global-active-active",
    name: "Global active-active",
    summary: "Multi-region deployment with a global DNS/L4 entry, per-region stacks, and replicated distributed SQL.",
    difficulty: "expert",
    category: "Platform",
    highlights: ["Global entry steers to the nearest healthy region", "Data replicated across regions", "Each region can serve alone"],
    nodes: [
      { resourceId: "dns_load_balancer", label: "Global DNS + L4", x: 40, y: 260 },
      { resourceId: "cdn_edge", label: "Anycast CDN", x: 320, y: 100 },
      { resourceId: "api_gateway", label: "US-East gateway", x: 620, y: 120 },
      { resourceId: "rest_service", label: "US-East service", x: 900, y: 120, overrides: { clientRps: 700, multiAz: true, region: "us-east-1" } },
      { resourceId: "api_gateway", label: "EU-West gateway", x: 620, y: 400 },
      { resourceId: "rest_service", label: "EU-West service", x: 900, y: 400, overrides: { clientRps: 500, multiAz: true, region: "eu-west-1" } },
      { resourceId: "cockroach_db", label: "Regional SQL quorum", x: 1200, y: 260, overrides: { replicationFactor: 3, multiAz: true } },
    ],
    edges: [
      [0, 1],
      [0, 2],
      [0, 4],
      [1, 2],
      [2, 3],
      [4, 5],
      [3, 6],
      [5, 6],
    ],
  },
  {
    id: "k8s-platform",
    name: "Kubernetes platform",
    summary: "Internal developer platform: ingress in front of a deployment, images from a registry, secrets mounted at runtime.",
    difficulty: "advanced",
    category: "Platform",
    highlights: ["Ingress is the only public entry", "Deployments autoscale on request rate", "Registry is a pull-through cache"],
    nodes: [
      { resourceId: "dns_load_balancer", label: "Public LB", x: 40, y: 240 },
      { resourceId: "ingress_controller", label: "Ingress (NGINX)", x: 340, y: 240 },
      { resourceId: "k8s_deployment", label: "API Deployment", x: 660, y: 160, overrides: { clientRps: 900, replicationFactor: 6, multiAz: true } },
      { resourceId: "k8s_cluster", label: "Control plane", x: 660, y: 420 },
      { resourceId: "container_registry", label: "Image registry", x: 980, y: 420 },
      { resourceId: "secrets_manager", label: "Mounted secrets", x: 980, y: 160 },
      { resourceId: "k8s_deployment", label: "Worker Deployment", x: 980, y: 600, overrides: { replicationFactor: 4 } },
      { resourceId: "observability_stack", label: "Cluster telemetry", x: 340, y: 500 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [3, 2],
      [3, 6],
      [4, 2],
      [2, 5],
      [2, 7],
      [6, 7],
    ],
  },
];

export const BLUEPRINT_MAP: Record<string, Blueprint> = Object.fromEntries(
  BLUEPRINTS.map((blueprint) => [blueprint.id, blueprint]),
);

export function getBlueprint(id: string): Blueprint | undefined {
  return BLUEPRINT_MAP[id];
}

export const BLUEPRINT_DIFFICULTY_TONE: Record<BlueprintDifficulty, string> = {
  beginner: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  intermediate: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  advanced: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  expert: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

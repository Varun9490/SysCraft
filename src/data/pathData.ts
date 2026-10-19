/**
 * The full SysCraft learning path, structured as: approach → foundations →
 * distributed systems → under the hood → AI systems.
 *
 * Invariants enforced by tests (src/data/__tests__/contentCounts.test.ts):
 *   - no two modules share an id;
 *   - no module has more lessons than a book chapter (nine max);
 *   - every practiceLabIds entry resolves to a real guided lab;
 *   - every encyclopediaId resolves to a real wiki article;
 *   - all counts quoted in UI copy come from TOTAL_MODULES / TOTAL_LESSONS.
 *
 * Module 0 is the delivery framework: how to approach ANY design. Modules
 * 1–10 walk a single starter system ("one server → distributed") in the order
 * a growing app actually hits the problems.
 *
 * CAP/PACELC lives in Module 12 (Problems in distributed systems) and the
 * replication deep dives — deliberately NOT in Module 1, which is an
 * on-ramp, not a theory paper.
 */

export interface PathModule {
  id: string;
  number: number;
  title: string;
  description: string;
  lessonTitles: string[];
  /** Encyclopedia article id when a matching deep-dive exists. */
  encyclopediaId?: string;
  /** Guided lab ids that practice this module's ideas on the canvas. */
  practiceLabIds?: string[];
}

export interface PathPart {
  id: string;
  title: string;
  subtitle: string;
  accentClass: string;
  accentHex: string;
  modules: PathModule[];
}

export const PATH_PARTS: PathPart[] = [
  {
    id: "approach",
    title: "Approach",
    subtitle: "The process to follow on every design problem, before any box is drawn.",
    accentClass: "text-rose-300",
    accentHex: "#CE7E78",
    modules: [
      {
        id: "how-to-approach-design",
        number: 0,
        title: "How to approach any design",
        description:
          "A six-step delivery framework — requirements, estimation, entities, API, high-level design, deep dives — that turns a blank page into a defensible architecture.",
        lessonTitles: [
          "Requirements first: functional, non-functional, and out of scope",
          "Estimation only when it changes the design",
          "Core entities and access patterns",
          "API contracts: verbs, idempotency, pagination, identity",
          "High-level design, endpoint by endpoint",
          "Deep dives and timeboxing: leading the design",
        ],
      },
    ],
  },
  {
    id: "foundations",
    title: "Foundations",
    subtitle: "The core ideas, in the order a growing app needs them.",
    accentClass: "text-brass",
    accentHex: "#CDA86A",
    modules: [
      {
        id: "what-is-system-design",
        number: 1,
        title: "What is system design?",
        description:
          "System design is making explicit trade-off decisions under constraints. Learn to read any problem before drawing any box.",
        lessonTitles: [
          "Functional vs non-functional requirements",
          "Simple is a design too: one server is often enough",
          "Latency, throughput, and availability numbers",
          "Back-of-the-envelope estimation",
          "How to read a system design problem",
        ],
      },
      {
        id: "simple-system",
        number: 2,
        title: "Start with a simple system",
        description:
          "One server, one database. Understand the full request lifecycle — DNS through TLS — before adding complexity.",
        lessonTitles: [
          "One server, one database",
          "Request lifecycle end to end",
          "API design: REST verbs, status codes, and pagination",
          "Data modeling: entities, access patterns, and indexes",
          "Database indexing: B-trees and why lookups stay fast",
          "DNS, TCP, and TLS in ten minutes",
          "Stateless vs stateful services",
          "Your first deployment topology",
        ],
        encyclopediaId: "load-balancing",
        practiceLabIds: ["pastebin-service"],
      },
      {
        id: "caching",
        number: 3,
        title: "Caching",
        description:
          "Why caches work, the four strategies, eviction policies, invalidation, and how hot keys melt production.",
        lessonTitles: [
          "Why caches work: the 80/20 rule",
          "Where to cache: browser, CDN, in-process, networked",
          "Cache-aside, read-through, write-through, write-back",
          "Eviction: LRU, LFU, and TTLs",
          "Cache invalidation strategies",
          "Hot keys and cache stampedes",
          "Measuring hit ratio and its ROI",
        ],
        encyclopediaId: "caching-strategies",
        practiceLabIds: ["bitly-url-shortener"],
      },
      {
        id: "one-server-not-enough",
        number: 4,
        title: "When one server isn't enough",
        description:
          "Horizontal scaling, load balancing layers, health checks, and the queuing theory that explains why p99 explodes.",
        lessonTitles: [
          "Horizontal scaling and statelessness",
          "Layer 4 vs layer 7 load balancing",
          "Health checks and connection draining",
          "Session state: sticky vs shared",
          "Autoscaling policies",
          "Queueing theory: why p99 explodes",
          "Capacity planning with Little's Law",
        ],
        encyclopediaId: "load-balancing",
      },
      {
        id: "one-database-not-enough",
        number: 5,
        title: "When one database isn't enough",
        description:
          "Replicas, failover, sharding, partitioning, CQRS, and choosing between SQL and NoSQL for the job at hand.",
        lessonTitles: [
          "Read replicas and replication lag",
          "Primary failover and split brain",
          "Indexing and query plans",
          "Sharding keys and hotspots",
          "Sharding keys vs range partitions",
          "CQRS and read models",
          "Choosing SQL vs NoSQL",
          "Schema migrations without downtime",
        ],
        encyclopediaId: "sharding-partitioning",
        practiceLabIds: ["dropbox-file-sync"],
      },
      {
        id: "live-updates",
        number: 6,
        title: "Live updates",
        description:
          "Polling to WebSockets: connection management at scale, presence, fan-out, and delivery guarantees for realtime.",
        lessonTitles: [
          "Polling, long polling, SSE, WebSockets",
          "Connection management at scale",
          "Presence and typing indicators",
          "Fan-out for group messaging",
          "Backpressure on live streams",
          "Delivery guarantees and receipts",
        ],
        encyclopediaId: "event-streaming",
        practiceLabIds: ["whatsapp-chat"],
      },
      {
        id: "background-jobs",
        number: 7,
        title: "Background jobs",
        description:
          "Decouple to survive: job queues, worker pools, retries, idempotency, and exactly-once vs at-least-once processing.",
        lessonTitles: [
          "Why async: decouple to survive",
          "Job queues and worker pools",
          "Retries, backoff, and dead-letter queues",
          "Idempotency keys",
          "Scheduling and cron at scale",
          "Exactly-once vs at-least-once processing",
        ],
        encyclopediaId: "message-queues",
        practiceLabIds: ["notification-platform"],
      },
      {
        id: "rate-limiting",
        number: 8,
        title: "Rate limiting and overload",
        description:
          "Token buckets to distributed counters, admission control, load shedding, and the retry storms you can cause yourself.",
        lessonTitles: [
          "Token bucket, leaky bucket, sliding window",
          "Distributed rate limiting with Redis",
          "Per-user, per-IP, per-key policies",
          "Fixed-window bursts and boundary effects",
          "Load shedding vs rate limiting",
          "Fairness: weighted queues and priorities",
        ],
        encyclopediaId: "rate-limiting",
        practiceLabIds: ["distributed-rate-limiter"],
      },
      {
        id: "growing-big",
        number: 9,
        title: "Growing big",
        description:
          "Service decomposition, API versioning, multi-region basics, cost-aware design, and observability for builders.",
        lessonTitles: [
          "Service decomposition signals",
          "API versioning and contracts",
          "Multi-region basics",
          "Cost-aware architecture",
          "Observability: metrics, logs, traces",
          "Incident response for builders",
        ],
        encyclopediaId: "observability-tracing",
      },
      {
        id: "putting-it-together",
        number: 10,
        title: "Putting it together",
        description:
          "Full walkthroughs of the classic interview systems — then how to review and present your own design.",
        lessonTitles: [
          "Design walkthrough: URL shortener",
          "Design walkthrough: chat at scale",
          "Design walkthrough: news feed",
          "Design walkthrough: payments",
          "Reviewing your own design",
          "Presenting a design in interviews",
        ],
        encyclopediaId: "microservices-monolith",
        practiceLabIds: ["bitly-url-shortener", "whatsapp-chat", "twitter-timeline", "razorpay-payments"],
      },
    ],
  },
  {
    id: "distributed-systems",
    title: "Distributed systems",
    subtitle: "What changes when machines can't trust each other, or the network.",
    accentClass: "text-brass",
    accentHex: "#C29A5E",
    modules: [
      {
        id: "microservices",
        number: 11,
        title: "Microservices",
        description:
          "When to split the monolith — and when not to — where the boundaries go, and the operational cost of every new service.",
        lessonTitles: [
          "Monolith first: when to split (and when not to)",
          "Service boundaries and domains",
          "Sync vs async service calls",
          "Service discovery",
          "API gateways and BFFs",
          "Sharing data between services",
          "Testing and deploying independently",
        ],
        encyclopediaId: "microservices-monolith",
      },
      {
        id: "distributed-problems",
        number: 12,
        title: "Problems in distributed systems",
        description:
          "Partial failure, timeouts, retry storms, clock skew — and why partitions force the consistency/availability choice (CAP, PACELC).",
        lessonTitles: [
          "Partial failure and timeouts",
          "Retries and retry storms",
          "Circuit breakers and bulkheads",
          "CAP and PACELC: the partition trade-off",
          "Clock skew and ordering",
          "Cascading failures",
          "Designing for failure",
        ],
        encyclopediaId: "cap-theorem",
      },
      {
        id: "replication-depth",
        number: 13,
        title: "Replication in depth",
        description:
          "Leader-based, multi-leader, and leaderless replication, quorums with honest failure semantics, conflict resolution, and a first pass at consensus.",
        lessonTitles: [
          "Single-leader replication",
          "Multi-leader and leaderless",
          "Quorums: R + W > N, and what happens when replicas fail",
          "Consistency models: linearizability to eventual",
          "Read-your-writes consistency",
          "Follower reads and monotonicity",
          "Consensus: Paxos and Raft intuition",
        ],
        encyclopediaId: "replication",
      },
      {
        id: "partitioning-depth",
        number: 14,
        title: "Partitioning in depth",
        description:
          "Consistent hashing, rebalancing without downtime, hot partitions, and the pain of cross-partition queries.",
        lessonTitles: [
          "Range vs hash partitioning",
          "Consistent hashing and virtual nodes",
          "Rebalancing without downtime",
          "Hot partitions and mitigation",
          "Secondary indexes across partitions",
          "Cross-partition queries",
          "Rebalancing case studies",
        ],
        encyclopediaId: "consistent-hashing",
      },
      {
        id: "messaging-kafka",
        number: 15,
        title: "Messaging: Kafka and pub/sub",
        description:
          "Logs as the source of truth: topics, partitions, consumer groups, ordering, and backpressure.",
        lessonTitles: [
          "Logs as the source of truth",
          "Topics, partitions, offsets",
          "Consumer groups and rebalancing",
          "Delivery semantics in practice",
          "Ordering guarantees",
          "Log compaction and retention",
          "Backpressure and consumer lag",
        ],
        encyclopediaId: "event-streaming",
      },
      {
        id: "cross-service-transactions",
        number: 16,
        title: "Transactions across services",
        description:
          "Why 2PC stalls, sagas, compensations, the outbox pattern, and choosing your consistency model per workflow.",
        lessonTitles: [
          "Why 2PC stalls",
          "Sagas: orchestration vs choreography",
          "Compensating transactions",
          "The outbox pattern",
          "Idempotent consumers",
          "Eventual consistency UX",
          "Choosing your consistency model",
        ],
        encyclopediaId: "acid-vs-base",
      },
      {
        id: "events-streams",
        number: 17,
        title: "Events and streams",
        description:
          "Event sourcing, projections, stream processing, windowing, and when an event-driven design is the wrong answer.",
        lessonTitles: [
          "Event sourcing fundamentals",
          "Projections and read models",
          "Stream processing with Flink",
          "Windowing and watermarks",
          "Exactly-once stream processing",
          "Event schema evolution",
          "When not to event source",
        ],
        encyclopediaId: "event-streaming",
      },
      {
        id: "availability-global",
        number: 18,
        title: "Availability and going global",
        description:
          "Error budgets, multi-region topologies, global load balancing, and failover drills you actually run.",
        lessonTitles: [
          "Availability math and error budgets",
          "Multi-region active-passive",
          "Multi-region active-active",
          "Global load balancing and DNS",
          "Data residency and compliance",
          "Failover drills and game days",
          "Graceful degradation patterns",
        ],
        encyclopediaId: "replication",
        practiceLabIds: ["netflix-streaming"],
      },
    ],
  },
  {
    id: "under-the-hood",
    title: "Under the hood",
    subtitle: "The classic algorithms that make distributed systems possible.",
    accentClass: "text-brass",
    accentHex: "#E6CC9F",
    modules: [
      {
        id: "hashing-and-sketches",
        number: 19,
        title: "Hashing and probabilistic sketches",
        description:
          "Consistent hashing, bloom filters, cardinality sketches, Merkle trees, and spatial indexes — the small algorithms behind big systems.",
        lessonTitles: [
          "Consistent hashing from scratch",
          "Bloom filters and false positives",
          "HyperLogLog cardinality estimation",
          "Count-min sketch heavy hitters",
          "Merkle trees for file sync",
          "Geohashing, quadtrees, and spatial indexes",
        ],
        encyclopediaId: "bloom-filters",
        practiceLabIds: ["dynamodb-from-scratch", "search-autocomplete"],
      },
      {
        id: "storage-engines",
        number: 20,
        title: "Storage engines",
        description:
          "How a database actually stores and finds bytes: LSM trees, B-trees, write-ahead logs, and probabilistic indexes.",
        lessonTitles: [
          "LSM trees and compaction",
          "B-trees and page splits",
          "Write-ahead logs",
          "Skip lists: the probabilistic index",
        ],
        encyclopediaId: "btree-vs-lsm",
      },
      {
        id: "coordination-and-time",
        number: 21,
        title: "Coordination and time",
        description:
          "Leader election, gossip, CRDTs, causal ordering, and fair scheduling — how a cluster agrees on anything.",
        lessonTitles: [
          "Raft leader election walkthrough",
          "Gossip and epidemic protocols",
          "CRDTs hands-on",
          "Vector clocks and causality",
          "Min-heaps and fair scheduling",
          "MapReduce intuition",
        ],
        encyclopediaId: "raft-consensus",
      },
    ],
  },
  {
    id: "ai-modern-patterns",
    title: "AI systems",
    subtitle: "Retrieval and LLM serving join the existing primitives.",
    accentClass: "text-violet-300",
    accentHex: "#C084FC",
    modules: [
      {
        id: "embeddings-retrieval",
        number: 22,
        title: "Embeddings and retrieval",
        description:
          "How text becomes numbers, how embeddings become searchable, and how retrieval augments generation — chunking, ANN, reranking, injection defense.",
        lessonTitles: [
          "Byte-pair encoding from scratch",
          "Subword encoding trade-offs",
          "Embedding space and cosine similarity",
          "Vector DB index design (HNSW vs IVF)",
          "Chunking strategies for RAG",
          "Hybrid lexical + dense retrieval",
          "Cross-encoder reranking",
          "Prompt-injection defense",
        ],
        encyclopediaId: "rag-patterns",
        practiceLabIds: ["agentic-rag-support", "search-autocomplete"],
      },
      {
        id: "llm-serving",
        number: 23,
        title: "LLM serving",
        description:
          "How self-attention's key/value memory scales, and how paged attention and continuous batching manage it.",
        lessonTitles: [
          "KV cache memory math",
          "Sliding window vs full context",
          "Paged attention design",
          "Continuous batching",
          "Batch scheduling with variable sequence lengths",
        ],
        encyclopediaId: "kv-cache-design",
      },
    ],
  },
];

export const TOTAL_MODULES = PATH_PARTS.reduce((sum, part) => sum + part.modules.length, 0);
export const TOTAL_LESSONS = PATH_PARTS.reduce(
  (sum, part) => sum + part.modules.reduce((s, m) => s + m.lessonTitles.length, 0),
  0,
);

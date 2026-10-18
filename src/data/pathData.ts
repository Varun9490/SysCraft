/**
 * The full SysCraft learning path: 19 modules across 3 parts, 137 lessons,
 * sequenced in the order a growing application needs them — from a single
 * server to globally distributed systems.
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
          "Requirements, constraints, and the vocabulary used to reason about real systems before writing a single line of infrastructure.",
        lessonTitles: [
          "Functional vs non-functional requirements",
          "Latency, throughput, and availability numbers",
          "Back-of-the-envelope estimation",
          "How to read a system design problem",
        ],
        encyclopediaId: "cap-theorem",
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
          "DNS, TCP, and TLS in ten minutes",
          "Load balancers appear",
          "Stateless vs stateful services",
          "Your first deployment topology",
        ],
        encyclopediaId: "load-balancing",
        practiceLabIds: ["pastebin-service"],
      },
      {
        id: "caching",        number: 3,
        title: "Caching",
        description:
          "Why caches work, the four strategies, eviction policies, invalidation, and how hot keys melt production.",
        lessonTitles: [
          "Why caches work: the 80/20 rule",
          "Cache-aside, read-through, write-through, write-back",
          "Eviction: LRU, LFU, and TTLs",
          "Cache invalidation strategies",
          "Hot keys and cache stampedes",
          "CDN and edge caching",
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
          "Range vs hash partitioning",
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
        title: "Rate limiting",
        description:
          "Token buckets to distributed counters: protecting services from abuse, overload, and the retry storms you caused yourself.",
        lessonTitles: [
          "Token bucket, leaky bucket, sliding window",
          "Distributed rate limiting with Redis",
          "Per-user, per-IP, per-key policies",
          "Graceful degradation under abuse",
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
          "When to split the monolith, where the boundaries go, and the operational cost of every new service.",
        lessonTitles: [
          "Monolith first: when to split",
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
          "Partial failure, timeouts, retry storms, clock skew, and how cascading failures actually start.",
        lessonTitles: [
          "Partial failure and timeouts",
          "Retries and retry storms",
          "Circuit breakers and bulkheads",
          "Clock skew and ordering",
          "Cascading failures",
          "Distributed debugging and tracing",
          "Designing for failure",
        ],
        encyclopediaId: "cap-theorem",
      },
      {
        id: "replication-depth",
        number: 13,
        title: "Replication in depth",
        description:
          "Leader-based, multi-leader, and leaderless replication, quorums, conflict resolution, and a first pass at consensus.",
        lessonTitles: [
          "Single-leader replication",
          "Multi-leader and leaderless",
          "Quorums: R + W > N",
          "Conflict resolution: LWW, CRDTs",
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
        id: "classic-algorithms",
        number: 19,
        title: "Classic algorithms in action",
        description:
          "Nineteen algorithms you meet in every real system — implemented, visualized, and connected to production use.",
        lessonTitles: [
          "Consistent hashing from scratch",
          "Bloom filters and false positives",
          "Merkle trees for file sync",
          "HyperLogLog cardinality estimation",
          "Count-min sketch heavy hitters",
          "LSM trees and compaction",
          "B-trees and page splits",
          "Raft leader election walkthrough",
          "Gossip and epidemic protocols",
          "CRDTs hands-on",
          "Geohashing and proximity search",
          "Vector clocks and causality",
          "Skip lists: the probabilistic index",
          "Rate limiting algorithms compared",
          "QuadTrees and spatial indexes",
          "Min-heap scheduling",
          "Write-ahead logs",
          "MapReduce intuition",
          "Choosing data structures in interviews",
        ],
        encyclopediaId: "merkle-trees",
        practiceLabIds: ["dynamodb-from-scratch", "search-autocomplete"],
      },
      {
        id: "tokenization-basics",
        number: 20,
        title: "Tokenization and embeddings",
        description:
          "How text becomes numbers, why vocabulary size is a design trade-off, and how embeddings become searchable.",
        lessonTitles: [
          "Byte-pair encoding from scratch",
          "Subword encoding trade-offs",
          "Embedding space and cosine similarity",
          "Vector DB index design (HNSW vs IVF)",
          "Chunking strategies for RAG",
          "Embedding model choice for multilingual data",
        ],
        encyclopediaId: "tokenization-basics",
        practiceLabIds: ["search-autocomplete", "rag-system"],
      },
      {
        id: "rag-patterns",
        number: 21,
        title: "Retrieval-augmented generation",
        description:
          "Ground LLM responses with retrieved context: chunking, embedding, ANN retrieval, reranking, prompt injection.",
        lessonTitles: [
          "Chunk size and overlap design",
          "Embedding model selection",
          "Approximate nearest neighbor retrieval",
          "Cross-encoder reranking",
          "Hybrid lexical + dense retrieval",
          "Prompt template architecture for RAG",
        ],
        encyclopediaId: "rag-patterns",
        practiceLabIds: ["rag-system", "search-autocomplete"],
      },
      {
        id: "system-design-primer-curriculum",
        number: 22,
        title: "System design primer mapped to primitives",
        description:
          "Every design concept in the primer mapped to a canvas primitive and a production paper reference.",
        lessonTitles: [
          "Rate limiters: token vs leaky bucket",
          "Sharding: consistent hash vs range",
          "Replication: sync vs async vs quorum",
          "Caching: aside vs through vs write-through",
          "Consistency levels: strong vs eventual",
          "Observability: metrics + logs + traces",
        ],
        encyclopediaId: "system-design-primer-curriculum",
        practiceLabIds: ["rate-limit-design", "sharding-patterns"],
      },
    ],
  },
  {
    id: "ai-modern-patterns",
    title: "AI & modern patterns",
    subtitle: "The new primitives that connect to every existing design.",
    accentClass: "text-violet-300",
    accentHex: "#C084FC",
    modules: [
      {
        id: "kv-cache-design",
        number: 23,
        title: "KV cache design for LLM serving",
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
        practiceLabIds: ["llm-serving", "batch-optimization"],
      },
      {
        id: "rate-limiting",
        number: 24,
        title: "Rate limiting and throttling",
        description:
          "From token buckets to distributed counters: how to protect downstream services with bounded admission.",
        lessonTitles: [
          "Token bucket semantics",
          "Leaky bucket behavior",
          "Sliding window rate limiters",
          "Distributed rate limiting with Redis",
          "Admission control and graceful degradation",
        ],
        encyclopediaId: "rate-limiting",
        practiceLabIds: ["rate-limit-design", "load-balancing"],
      },
    ],
  },
];

export const TOTAL_MODULES = PATH_PARTS.reduce((sum, part) => sum + part.modules.length, 0);
export const TOTAL_LESSONS = PATH_PARTS.reduce(
  (sum, part) => sum + part.modules.reduce((s, m) => s + m.lessonTitles.length, 0),
  0,
);

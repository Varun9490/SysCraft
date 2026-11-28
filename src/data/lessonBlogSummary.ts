// Generated from the authored lesson registry. Keep this summary dependency-free.
export interface LessonBlogSummary {
  id: string;
  moduleId: string;
  lessonIndex: number;
  title: string;
  readMinutes: number;
}

export const LESSON_BLOG_SUMMARY: readonly LessonBlogSummary[] = [
  {
    "id": "networking-fundamentals::0",
    "moduleId": "networking-fundamentals",
    "lessonIndex": 0,
    "title": "TCP vs UDP: reliability, ordering, and when to drop packets",
    "readMinutes": 5
  },
  {
    "id": "networking-fundamentals::1",
    "moduleId": "networking-fundamentals",
    "lessonIndex": 1,
    "title": "The TCP handshake, congestion control, and head-of-line blocking",
    "readMinutes": 5
  },
  {
    "id": "networking-fundamentals::2",
    "moduleId": "networking-fundamentals",
    "lessonIndex": 2,
    "title": "TLS 1.3: the handshake, 0-RTT, and certificate chains",
    "readMinutes": 5
  },
  {
    "id": "networking-fundamentals::3",
    "moduleId": "networking-fundamentals",
    "lessonIndex": 3,
    "title": "HTTP/2 multiplexing, HTTP/3 QUIC, and the end of head-of-line",
    "readMinutes": 5
  },
  {
    "id": "networking-fundamentals::4",
    "moduleId": "networking-fundamentals",
    "lessonIndex": 4,
    "title": "DNS resolution, caching, TTLs, and the 5-second outage",
    "readMinutes": 5
  },
  {
    "id": "networking-fundamentals::5",
    "moduleId": "networking-fundamentals",
    "lessonIndex": 5,
    "title": "Connection pooling, keep-alive, and the cost of a new connection",
    "readMinutes": 5
  },
  {
    "id": "networking-fundamentals::6",
    "moduleId": "networking-fundamentals",
    "lessonIndex": 6,
    "title": "Latency budgets: where the milliseconds go in a request",
    "readMinutes": 5
  },
  {
    "id": "web-protocols-and-edge::0",
    "moduleId": "web-protocols-and-edge",
    "lessonIndex": 0,
    "title": "HTTP methods, status codes, and headers: the contract of the web",
    "readMinutes": 5
  },
  {
    "id": "web-protocols-and-edge::1",
    "moduleId": "web-protocols-and-edge",
    "lessonIndex": 1,
    "title": "Cookies, sessions, and the stateless web",
    "readMinutes": 5
  },
  {
    "id": "web-protocols-and-edge::2",
    "moduleId": "web-protocols-and-edge",
    "lessonIndex": 2,
    "title": "L4 vs L7 load balancing: where the decision happens",
    "readMinutes": 5
  },
  {
    "id": "web-protocols-and-edge::3",
    "moduleId": "web-protocols-and-edge",
    "lessonIndex": 3,
    "title": "CDN and cache headers: making the edge do the work",
    "readMinutes": 5
  },
  {
    "id": "web-protocols-and-edge::4",
    "moduleId": "web-protocols-and-edge",
    "lessonIndex": 4,
    "title": "WebSockets, SSE, and long polling: realtime transports",
    "readMinutes": 5
  },
  {
    "id": "web-protocols-and-edge::5",
    "moduleId": "web-protocols-and-edge",
    "lessonIndex": 5,
    "title": "API styles: REST, gRPC, GraphQL, and when each fits",
    "readMinutes": 5
  },
  {
    "id": "how-to-approach-design::0",
    "moduleId": "how-to-approach-design",
    "lessonIndex": 0,
    "title": "Requirements first: functional, non-functional, and out of scope",
    "readMinutes": 6
  },
  {
    "id": "how-to-approach-design::1",
    "moduleId": "how-to-approach-design",
    "lessonIndex": 1,
    "title": "Estimation only when it changes the design",
    "readMinutes": 6
  },
  {
    "id": "how-to-approach-design::2",
    "moduleId": "how-to-approach-design",
    "lessonIndex": 2,
    "title": "Core entities and access patterns",
    "readMinutes": 6
  },
  {
    "id": "how-to-approach-design::3",
    "moduleId": "how-to-approach-design",
    "lessonIndex": 3,
    "title": "API contracts: verbs, idempotency, pagination, identity",
    "readMinutes": 6
  },
  {
    "id": "how-to-approach-design::4",
    "moduleId": "how-to-approach-design",
    "lessonIndex": 4,
    "title": "High-level design, endpoint by endpoint",
    "readMinutes": 6
  },
  {
    "id": "how-to-approach-design::5",
    "moduleId": "how-to-approach-design",
    "lessonIndex": 5,
    "title": "Deep dives and timeboxing: leading the design",
    "readMinutes": 6
  },
  {
    "id": "what-is-system-design::0",
    "moduleId": "what-is-system-design",
    "lessonIndex": 0,
    "title": "Functional vs non-functional requirements",
    "readMinutes": 6
  },
  {
    "id": "what-is-system-design::1",
    "moduleId": "what-is-system-design",
    "lessonIndex": 1,
    "title": "Simple is a design too: one server is often enough",
    "readMinutes": 6
  },
  {
    "id": "what-is-system-design::2",
    "moduleId": "what-is-system-design",
    "lessonIndex": 2,
    "title": "Latency, throughput, and availability numbers",
    "readMinutes": 6
  },
  {
    "id": "what-is-system-design::3",
    "moduleId": "what-is-system-design",
    "lessonIndex": 3,
    "title": "Back-of-the-envelope estimation",
    "readMinutes": 6
  },
  {
    "id": "what-is-system-design::4",
    "moduleId": "what-is-system-design",
    "lessonIndex": 4,
    "title": "How to read a system design problem",
    "readMinutes": 6
  },
  {
    "id": "simple-system::0",
    "moduleId": "simple-system",
    "lessonIndex": 0,
    "title": "One server, one database",
    "readMinutes": 6
  },
  {
    "id": "simple-system::1",
    "moduleId": "simple-system",
    "lessonIndex": 1,
    "title": "Request lifecycle end to end",
    "readMinutes": 6
  },
  {
    "id": "simple-system::2",
    "moduleId": "simple-system",
    "lessonIndex": 2,
    "title": "API design: REST verbs, status codes, and pagination",
    "readMinutes": 6
  },
  {
    "id": "simple-system::3",
    "moduleId": "simple-system",
    "lessonIndex": 3,
    "title": "Data modeling: entities, access patterns, and indexes",
    "readMinutes": 6
  },
  {
    "id": "simple-system::4",
    "moduleId": "simple-system",
    "lessonIndex": 4,
    "title": "Database indexing: B-trees and why lookups stay fast",
    "readMinutes": 6
  },
  {
    "id": "simple-system::5",
    "moduleId": "simple-system",
    "lessonIndex": 5,
    "title": "DNS, TCP, and TLS in ten minutes",
    "readMinutes": 6
  },
  {
    "id": "simple-system::6",
    "moduleId": "simple-system",
    "lessonIndex": 6,
    "title": "Stateless vs stateful services",
    "readMinutes": 6
  },
  {
    "id": "simple-system::7",
    "moduleId": "simple-system",
    "lessonIndex": 7,
    "title": "Your first deployment topology",
    "readMinutes": 6
  },
  {
    "id": "caching::0",
    "moduleId": "caching",
    "lessonIndex": 0,
    "title": "Why caches work: the 80/20 rule",
    "readMinutes": 6
  },
  {
    "id": "caching::1",
    "moduleId": "caching",
    "lessonIndex": 1,
    "title": "Where to cache: browser, CDN, in-process, networked",
    "readMinutes": 6
  },
  {
    "id": "caching::2",
    "moduleId": "caching",
    "lessonIndex": 2,
    "title": "Cache-aside, read-through, write-through, write-back",
    "readMinutes": 6
  },
  {
    "id": "caching::3",
    "moduleId": "caching",
    "lessonIndex": 3,
    "title": "Eviction: LRU, LFU, and TTLs",
    "readMinutes": 6
  },
  {
    "id": "caching::4",
    "moduleId": "caching",
    "lessonIndex": 4,
    "title": "Cache invalidation strategies",
    "readMinutes": 6
  },
  {
    "id": "caching::5",
    "moduleId": "caching",
    "lessonIndex": 5,
    "title": "Hot keys and cache stampedes",
    "readMinutes": 6
  },
  {
    "id": "caching::6",
    "moduleId": "caching",
    "lessonIndex": 6,
    "title": "Measuring hit ratio and its ROI",
    "readMinutes": 6
  },
  {
    "id": "one-server-not-enough::0",
    "moduleId": "one-server-not-enough",
    "lessonIndex": 0,
    "title": "Horizontal scaling and statelessness",
    "readMinutes": 6
  },
  {
    "id": "one-server-not-enough::1",
    "moduleId": "one-server-not-enough",
    "lessonIndex": 1,
    "title": "Layer 4 vs layer 7 load balancing",
    "readMinutes": 6
  },
  {
    "id": "one-server-not-enough::2",
    "moduleId": "one-server-not-enough",
    "lessonIndex": 2,
    "title": "Health checks and connection draining",
    "readMinutes": 6
  },
  {
    "id": "one-server-not-enough::3",
    "moduleId": "one-server-not-enough",
    "lessonIndex": 3,
    "title": "Session state: sticky vs shared",
    "readMinutes": 6
  },
  {
    "id": "one-server-not-enough::4",
    "moduleId": "one-server-not-enough",
    "lessonIndex": 4,
    "title": "Autoscaling policies",
    "readMinutes": 6
  },
  {
    "id": "one-server-not-enough::5",
    "moduleId": "one-server-not-enough",
    "lessonIndex": 5,
    "title": "Queueing theory: why p99 explodes",
    "readMinutes": 6
  },
  {
    "id": "one-server-not-enough::6",
    "moduleId": "one-server-not-enough",
    "lessonIndex": 6,
    "title": "Capacity planning with Little's Law",
    "readMinutes": 6
  },
  {
    "id": "one-database-not-enough::0",
    "moduleId": "one-database-not-enough",
    "lessonIndex": 0,
    "title": "Read replicas and replication lag",
    "readMinutes": 6
  },
  {
    "id": "one-database-not-enough::1",
    "moduleId": "one-database-not-enough",
    "lessonIndex": 1,
    "title": "Primary failover and split brain",
    "readMinutes": 6
  },
  {
    "id": "one-database-not-enough::2",
    "moduleId": "one-database-not-enough",
    "lessonIndex": 2,
    "title": "Indexing and query plans",
    "readMinutes": 6
  },
  {
    "id": "one-database-not-enough::3",
    "moduleId": "one-database-not-enough",
    "lessonIndex": 3,
    "title": "Sharding keys and hotspots",
    "readMinutes": 6
  },
  {
    "id": "one-database-not-enough::4",
    "moduleId": "one-database-not-enough",
    "lessonIndex": 4,
    "title": "Sharding keys vs range partitions",
    "readMinutes": 6
  },
  {
    "id": "one-database-not-enough::5",
    "moduleId": "one-database-not-enough",
    "lessonIndex": 5,
    "title": "CQRS and read models",
    "readMinutes": 6
  },
  {
    "id": "one-database-not-enough::6",
    "moduleId": "one-database-not-enough",
    "lessonIndex": 6,
    "title": "Choosing SQL vs NoSQL",
    "readMinutes": 6
  },
  {
    "id": "one-database-not-enough::7",
    "moduleId": "one-database-not-enough",
    "lessonIndex": 7,
    "title": "Schema migrations without downtime",
    "readMinutes": 6
  },
  {
    "id": "live-updates::0",
    "moduleId": "live-updates",
    "lessonIndex": 0,
    "title": "Polling, long polling, SSE, WebSockets",
    "readMinutes": 6
  },
  {
    "id": "live-updates::1",
    "moduleId": "live-updates",
    "lessonIndex": 1,
    "title": "Connection management at scale",
    "readMinutes": 6
  },
  {
    "id": "live-updates::2",
    "moduleId": "live-updates",
    "lessonIndex": 2,
    "title": "Presence and typing indicators",
    "readMinutes": 6
  },
  {
    "id": "live-updates::3",
    "moduleId": "live-updates",
    "lessonIndex": 3,
    "title": "Fan-out for group messaging",
    "readMinutes": 6
  },
  {
    "id": "live-updates::4",
    "moduleId": "live-updates",
    "lessonIndex": 4,
    "title": "Backpressure on live streams",
    "readMinutes": 6
  },
  {
    "id": "live-updates::5",
    "moduleId": "live-updates",
    "lessonIndex": 5,
    "title": "Delivery guarantees and receipts",
    "readMinutes": 6
  },
  {
    "id": "background-jobs::0",
    "moduleId": "background-jobs",
    "lessonIndex": 0,
    "title": "Why async: decouple to survive",
    "readMinutes": 6
  },
  {
    "id": "background-jobs::1",
    "moduleId": "background-jobs",
    "lessonIndex": 1,
    "title": "Job queues and worker pools",
    "readMinutes": 6
  },
  {
    "id": "background-jobs::2",
    "moduleId": "background-jobs",
    "lessonIndex": 2,
    "title": "Retries, backoff, and dead-letter queues",
    "readMinutes": 6
  },
  {
    "id": "background-jobs::3",
    "moduleId": "background-jobs",
    "lessonIndex": 3,
    "title": "Idempotency keys",
    "readMinutes": 6
  },
  {
    "id": "background-jobs::4",
    "moduleId": "background-jobs",
    "lessonIndex": 4,
    "title": "Scheduling and cron at scale",
    "readMinutes": 6
  },
  {
    "id": "background-jobs::5",
    "moduleId": "background-jobs",
    "lessonIndex": 5,
    "title": "Exactly-once vs at-least-once processing",
    "readMinutes": 6
  },
  {
    "id": "rate-limiting::0",
    "moduleId": "rate-limiting",
    "lessonIndex": 0,
    "title": "Token bucket, leaky bucket, sliding window",
    "readMinutes": 6
  },
  {
    "id": "rate-limiting::1",
    "moduleId": "rate-limiting",
    "lessonIndex": 1,
    "title": "Distributed rate limiting with Redis",
    "readMinutes": 6
  },
  {
    "id": "rate-limiting::2",
    "moduleId": "rate-limiting",
    "lessonIndex": 2,
    "title": "Per-user, per-IP, per-key policies",
    "readMinutes": 5
  },
  {
    "id": "rate-limiting::3",
    "moduleId": "rate-limiting",
    "lessonIndex": 3,
    "title": "Fixed-window bursts and boundary effects",
    "readMinutes": 6
  },
  {
    "id": "rate-limiting::4",
    "moduleId": "rate-limiting",
    "lessonIndex": 4,
    "title": "Load shedding vs rate limiting",
    "readMinutes": 5
  },
  {
    "id": "rate-limiting::5",
    "moduleId": "rate-limiting",
    "lessonIndex": 5,
    "title": "Fairness: weighted queues and priorities",
    "readMinutes": 6
  },
  {
    "id": "growing-big::0",
    "moduleId": "growing-big",
    "lessonIndex": 0,
    "title": "Service decomposition signals",
    "readMinutes": 6
  },
  {
    "id": "growing-big::1",
    "moduleId": "growing-big",
    "lessonIndex": 1,
    "title": "API versioning and contracts",
    "readMinutes": 6
  },
  {
    "id": "growing-big::2",
    "moduleId": "growing-big",
    "lessonIndex": 2,
    "title": "Multi-region basics",
    "readMinutes": 6
  },
  {
    "id": "growing-big::3",
    "moduleId": "growing-big",
    "lessonIndex": 3,
    "title": "Cost-aware architecture",
    "readMinutes": 6
  },
  {
    "id": "growing-big::4",
    "moduleId": "growing-big",
    "lessonIndex": 4,
    "title": "Observability: metrics, logs, traces",
    "readMinutes": 6
  },
  {
    "id": "growing-big::5",
    "moduleId": "growing-big",
    "lessonIndex": 5,
    "title": "Incident response for builders",
    "readMinutes": 5
  },
  {
    "id": "putting-it-together::0",
    "moduleId": "putting-it-together",
    "lessonIndex": 0,
    "title": "Design walkthrough: URL shortener",
    "readMinutes": 6
  },
  {
    "id": "putting-it-together::1",
    "moduleId": "putting-it-together",
    "lessonIndex": 1,
    "title": "Design walkthrough: chat at scale",
    "readMinutes": 6
  },
  {
    "id": "putting-it-together::2",
    "moduleId": "putting-it-together",
    "lessonIndex": 2,
    "title": "Design walkthrough: news feed",
    "readMinutes": 6
  },
  {
    "id": "putting-it-together::3",
    "moduleId": "putting-it-together",
    "lessonIndex": 3,
    "title": "Design walkthrough: payments",
    "readMinutes": 5
  },
  {
    "id": "putting-it-together::4",
    "moduleId": "putting-it-together",
    "lessonIndex": 4,
    "title": "Reviewing your own design",
    "readMinutes": 6
  },
  {
    "id": "putting-it-together::5",
    "moduleId": "putting-it-together",
    "lessonIndex": 5,
    "title": "Presenting a design in interviews",
    "readMinutes": 6
  },
  {
    "id": "microservices::0",
    "moduleId": "microservices",
    "lessonIndex": 0,
    "title": "Monolith first: when to split (and when not to)",
    "readMinutes": 6
  },
  {
    "id": "microservices::1",
    "moduleId": "microservices",
    "lessonIndex": 1,
    "title": "Service boundaries and domains",
    "readMinutes": 6
  },
  {
    "id": "microservices::2",
    "moduleId": "microservices",
    "lessonIndex": 2,
    "title": "Sync vs async service calls",
    "readMinutes": 6
  },
  {
    "id": "microservices::3",
    "moduleId": "microservices",
    "lessonIndex": 3,
    "title": "Service discovery",
    "readMinutes": 5
  },
  {
    "id": "microservices::4",
    "moduleId": "microservices",
    "lessonIndex": 4,
    "title": "API gateways and BFFs",
    "readMinutes": 6
  },
  {
    "id": "microservices::5",
    "moduleId": "microservices",
    "lessonIndex": 5,
    "title": "Sharing data between services",
    "readMinutes": 5
  },
  {
    "id": "microservices::6",
    "moduleId": "microservices",
    "lessonIndex": 6,
    "title": "Testing and deploying independently",
    "readMinutes": 6
  },
  {
    "id": "distributed-problems::0",
    "moduleId": "distributed-problems",
    "lessonIndex": 0,
    "title": "Partial failure and timeouts",
    "readMinutes": 6
  },
  {
    "id": "distributed-problems::1",
    "moduleId": "distributed-problems",
    "lessonIndex": 1,
    "title": "Retries and retry storms",
    "readMinutes": 6
  },
  {
    "id": "distributed-problems::2",
    "moduleId": "distributed-problems",
    "lessonIndex": 2,
    "title": "Circuit breakers and bulkheads",
    "readMinutes": 5
  },
  {
    "id": "distributed-problems::3",
    "moduleId": "distributed-problems",
    "lessonIndex": 3,
    "title": "CAP and PACELC: the partition trade-off",
    "readMinutes": 6
  },
  {
    "id": "distributed-problems::4",
    "moduleId": "distributed-problems",
    "lessonIndex": 4,
    "title": "Clock skew and ordering",
    "readMinutes": 5
  },
  {
    "id": "distributed-problems::5",
    "moduleId": "distributed-problems",
    "lessonIndex": 5,
    "title": "Cascading failures",
    "readMinutes": 6
  },
  {
    "id": "distributed-problems::6",
    "moduleId": "distributed-problems",
    "lessonIndex": 6,
    "title": "Designing for failure",
    "readMinutes": 5
  },
  {
    "id": "replication-depth::0",
    "moduleId": "replication-depth",
    "lessonIndex": 0,
    "title": "Single-leader replication",
    "readMinutes": 5
  },
  {
    "id": "replication-depth::1",
    "moduleId": "replication-depth",
    "lessonIndex": 1,
    "title": "Multi-leader and leaderless",
    "readMinutes": 5
  },
  {
    "id": "replication-depth::2",
    "moduleId": "replication-depth",
    "lessonIndex": 2,
    "title": "Quorums: R + W > N, and what happens when replicas fail",
    "readMinutes": 6
  },
  {
    "id": "replication-depth::3",
    "moduleId": "replication-depth",
    "lessonIndex": 3,
    "title": "Consistency models: linearizability to eventual",
    "readMinutes": 5
  },
  {
    "id": "replication-depth::4",
    "moduleId": "replication-depth",
    "lessonIndex": 4,
    "title": "Read-your-writes consistency",
    "readMinutes": 5
  },
  {
    "id": "replication-depth::5",
    "moduleId": "replication-depth",
    "lessonIndex": 5,
    "title": "Follower reads and monotonicity",
    "readMinutes": 5
  },
  {
    "id": "replication-depth::6",
    "moduleId": "replication-depth",
    "lessonIndex": 6,
    "title": "Consensus: Paxos and Raft intuition",
    "readMinutes": 6
  },
  {
    "id": "partitioning-depth::0",
    "moduleId": "partitioning-depth",
    "lessonIndex": 0,
    "title": "Range vs hash partitioning",
    "readMinutes": 6
  },
  {
    "id": "partitioning-depth::1",
    "moduleId": "partitioning-depth",
    "lessonIndex": 1,
    "title": "Consistent hashing and virtual nodes",
    "readMinutes": 6
  },
  {
    "id": "partitioning-depth::2",
    "moduleId": "partitioning-depth",
    "lessonIndex": 2,
    "title": "Rebalancing without downtime",
    "readMinutes": 6
  },
  {
    "id": "partitioning-depth::3",
    "moduleId": "partitioning-depth",
    "lessonIndex": 3,
    "title": "Hot partitions and mitigation",
    "readMinutes": 5
  },
  {
    "id": "partitioning-depth::4",
    "moduleId": "partitioning-depth",
    "lessonIndex": 4,
    "title": "Secondary indexes across partitions",
    "readMinutes": 6
  },
  {
    "id": "partitioning-depth::5",
    "moduleId": "partitioning-depth",
    "lessonIndex": 5,
    "title": "Cross-partition queries",
    "readMinutes": 6
  },
  {
    "id": "partitioning-depth::6",
    "moduleId": "partitioning-depth",
    "lessonIndex": 6,
    "title": "Rebalancing case studies",
    "readMinutes": 6
  },
  {
    "id": "messaging-kafka::0",
    "moduleId": "messaging-kafka",
    "lessonIndex": 0,
    "title": "Logs as the source of truth",
    "readMinutes": 5
  },
  {
    "id": "messaging-kafka::1",
    "moduleId": "messaging-kafka",
    "lessonIndex": 1,
    "title": "Topics, partitions, offsets",
    "readMinutes": 5
  },
  {
    "id": "messaging-kafka::2",
    "moduleId": "messaging-kafka",
    "lessonIndex": 2,
    "title": "Consumer groups and rebalancing",
    "readMinutes": 5
  },
  {
    "id": "messaging-kafka::3",
    "moduleId": "messaging-kafka",
    "lessonIndex": 3,
    "title": "Delivery semantics in practice",
    "readMinutes": 5
  },
  {
    "id": "messaging-kafka::4",
    "moduleId": "messaging-kafka",
    "lessonIndex": 4,
    "title": "Ordering guarantees",
    "readMinutes": 5
  },
  {
    "id": "messaging-kafka::5",
    "moduleId": "messaging-kafka",
    "lessonIndex": 5,
    "title": "Log compaction and retention",
    "readMinutes": 6
  },
  {
    "id": "messaging-kafka::6",
    "moduleId": "messaging-kafka",
    "lessonIndex": 6,
    "title": "Backpressure and consumer lag",
    "readMinutes": 5
  },
  {
    "id": "cross-service-transactions::0",
    "moduleId": "cross-service-transactions",
    "lessonIndex": 0,
    "title": "Why 2PC stalls",
    "readMinutes": 6
  },
  {
    "id": "cross-service-transactions::1",
    "moduleId": "cross-service-transactions",
    "lessonIndex": 1,
    "title": "Sagas: orchestration vs choreography",
    "readMinutes": 6
  },
  {
    "id": "cross-service-transactions::2",
    "moduleId": "cross-service-transactions",
    "lessonIndex": 2,
    "title": "Compensating transactions",
    "readMinutes": 5
  },
  {
    "id": "cross-service-transactions::3",
    "moduleId": "cross-service-transactions",
    "lessonIndex": 3,
    "title": "The outbox pattern",
    "readMinutes": 6
  },
  {
    "id": "cross-service-transactions::4",
    "moduleId": "cross-service-transactions",
    "lessonIndex": 4,
    "title": "Idempotent consumers",
    "readMinutes": 5
  },
  {
    "id": "cross-service-transactions::5",
    "moduleId": "cross-service-transactions",
    "lessonIndex": 5,
    "title": "Eventual consistency UX",
    "readMinutes": 5
  },
  {
    "id": "cross-service-transactions::6",
    "moduleId": "cross-service-transactions",
    "lessonIndex": 6,
    "title": "Choosing your consistency model",
    "readMinutes": 5
  },
  {
    "id": "events-streams::0",
    "moduleId": "events-streams",
    "lessonIndex": 0,
    "title": "Event sourcing fundamentals",
    "readMinutes": 5
  },
  {
    "id": "events-streams::1",
    "moduleId": "events-streams",
    "lessonIndex": 1,
    "title": "Projections and read models",
    "readMinutes": 5
  },
  {
    "id": "events-streams::2",
    "moduleId": "events-streams",
    "lessonIndex": 2,
    "title": "Stream processing with Flink",
    "readMinutes": 5
  },
  {
    "id": "events-streams::3",
    "moduleId": "events-streams",
    "lessonIndex": 3,
    "title": "Windowing and watermarks",
    "readMinutes": 5
  },
  {
    "id": "events-streams::4",
    "moduleId": "events-streams",
    "lessonIndex": 4,
    "title": "Exactly-once stream processing",
    "readMinutes": 5
  },
  {
    "id": "events-streams::5",
    "moduleId": "events-streams",
    "lessonIndex": 5,
    "title": "Event schema evolution",
    "readMinutes": 5
  },
  {
    "id": "events-streams::6",
    "moduleId": "events-streams",
    "lessonIndex": 6,
    "title": "When not to event source",
    "readMinutes": 5
  },
  {
    "id": "availability-global::0",
    "moduleId": "availability-global",
    "lessonIndex": 0,
    "title": "Availability math and error budgets",
    "readMinutes": 5
  },
  {
    "id": "availability-global::1",
    "moduleId": "availability-global",
    "lessonIndex": 1,
    "title": "Multi-region active-passive",
    "readMinutes": 5
  },
  {
    "id": "availability-global::2",
    "moduleId": "availability-global",
    "lessonIndex": 2,
    "title": "Multi-region active-active",
    "readMinutes": 5
  },
  {
    "id": "availability-global::3",
    "moduleId": "availability-global",
    "lessonIndex": 3,
    "title": "Global load balancing and DNS",
    "readMinutes": 5
  },
  {
    "id": "availability-global::4",
    "moduleId": "availability-global",
    "lessonIndex": 4,
    "title": "Data residency and compliance",
    "readMinutes": 5
  },
  {
    "id": "availability-global::5",
    "moduleId": "availability-global",
    "lessonIndex": 5,
    "title": "Failover drills and game days",
    "readMinutes": 5
  },
  {
    "id": "availability-global::6",
    "moduleId": "availability-global",
    "lessonIndex": 6,
    "title": "Graceful degradation patterns",
    "readMinutes": 5
  },
  {
    "id": "hashing-and-sketches::0",
    "moduleId": "hashing-and-sketches",
    "lessonIndex": 0,
    "title": "Consistent hashing from scratch",
    "readMinutes": 5
  },
  {
    "id": "hashing-and-sketches::1",
    "moduleId": "hashing-and-sketches",
    "lessonIndex": 1,
    "title": "Bloom filters and false positives",
    "readMinutes": 6
  },
  {
    "id": "hashing-and-sketches::2",
    "moduleId": "hashing-and-sketches",
    "lessonIndex": 2,
    "title": "HyperLogLog cardinality estimation",
    "readMinutes": 5
  },
  {
    "id": "hashing-and-sketches::3",
    "moduleId": "hashing-and-sketches",
    "lessonIndex": 3,
    "title": "Count-min sketch heavy hitters",
    "readMinutes": 5
  },
  {
    "id": "hashing-and-sketches::4",
    "moduleId": "hashing-and-sketches",
    "lessonIndex": 4,
    "title": "Merkle trees for file sync",
    "readMinutes": 5
  },
  {
    "id": "hashing-and-sketches::5",
    "moduleId": "hashing-and-sketches",
    "lessonIndex": 5,
    "title": "Geohashing, quadtrees, and spatial indexes",
    "readMinutes": 5
  },
  {
    "id": "storage-engines::0",
    "moduleId": "storage-engines",
    "lessonIndex": 0,
    "title": "LSM trees and compaction",
    "readMinutes": 5
  },
  {
    "id": "storage-engines::1",
    "moduleId": "storage-engines",
    "lessonIndex": 1,
    "title": "B-trees and page splits",
    "readMinutes": 5
  },
  {
    "id": "storage-engines::2",
    "moduleId": "storage-engines",
    "lessonIndex": 2,
    "title": "Write-ahead logs",
    "readMinutes": 5
  },
  {
    "id": "storage-engines::3",
    "moduleId": "storage-engines",
    "lessonIndex": 3,
    "title": "Skip lists: the probabilistic index",
    "readMinutes": 5
  },
  {
    "id": "coordination-and-time::0",
    "moduleId": "coordination-and-time",
    "lessonIndex": 0,
    "title": "Raft leader election walkthrough",
    "readMinutes": 5
  },
  {
    "id": "coordination-and-time::1",
    "moduleId": "coordination-and-time",
    "lessonIndex": 1,
    "title": "Gossip and epidemic protocols",
    "readMinutes": 5
  },
  {
    "id": "coordination-and-time::2",
    "moduleId": "coordination-and-time",
    "lessonIndex": 2,
    "title": "CRDTs hands-on",
    "readMinutes": 5
  },
  {
    "id": "coordination-and-time::3",
    "moduleId": "coordination-and-time",
    "lessonIndex": 3,
    "title": "Vector clocks and causality",
    "readMinutes": 5
  },
  {
    "id": "coordination-and-time::4",
    "moduleId": "coordination-and-time",
    "lessonIndex": 4,
    "title": "Min-heaps and fair scheduling",
    "readMinutes": 5
  },
  {
    "id": "coordination-and-time::5",
    "moduleId": "coordination-and-time",
    "lessonIndex": 5,
    "title": "MapReduce intuition",
    "readMinutes": 5
  },
  {
    "id": "embeddings-retrieval::0",
    "moduleId": "embeddings-retrieval",
    "lessonIndex": 0,
    "title": "Byte-pair encoding from scratch",
    "readMinutes": 5
  },
  {
    "id": "embeddings-retrieval::1",
    "moduleId": "embeddings-retrieval",
    "lessonIndex": 1,
    "title": "Subword encoding trade-offs",
    "readMinutes": 5
  },
  {
    "id": "embeddings-retrieval::2",
    "moduleId": "embeddings-retrieval",
    "lessonIndex": 2,
    "title": "Embedding space and cosine similarity",
    "readMinutes": 5
  },
  {
    "id": "embeddings-retrieval::3",
    "moduleId": "embeddings-retrieval",
    "lessonIndex": 3,
    "title": "Vector DB index design (HNSW vs IVF)",
    "readMinutes": 5
  },
  {
    "id": "embeddings-retrieval::4",
    "moduleId": "embeddings-retrieval",
    "lessonIndex": 4,
    "title": "Chunking strategies for RAG",
    "readMinutes": 5
  },
  {
    "id": "embeddings-retrieval::5",
    "moduleId": "embeddings-retrieval",
    "lessonIndex": 5,
    "title": "Hybrid lexical + dense retrieval",
    "readMinutes": 5
  },
  {
    "id": "embeddings-retrieval::6",
    "moduleId": "embeddings-retrieval",
    "lessonIndex": 6,
    "title": "Cross-encoder reranking",
    "readMinutes": 5
  },
  {
    "id": "embeddings-retrieval::7",
    "moduleId": "embeddings-retrieval",
    "lessonIndex": 7,
    "title": "Prompt-injection defense",
    "readMinutes": 5
  },
  {
    "id": "llm-serving::0",
    "moduleId": "llm-serving",
    "lessonIndex": 0,
    "title": "KV cache memory math",
    "readMinutes": 6
  },
  {
    "id": "llm-serving::1",
    "moduleId": "llm-serving",
    "lessonIndex": 1,
    "title": "Sliding window vs full context",
    "readMinutes": 5
  },
  {
    "id": "llm-serving::2",
    "moduleId": "llm-serving",
    "lessonIndex": 2,
    "title": "Paged attention design",
    "readMinutes": 5
  },
  {
    "id": "llm-serving::3",
    "moduleId": "llm-serving",
    "lessonIndex": 3,
    "title": "Continuous batching",
    "readMinutes": 5
  },
  {
    "id": "llm-serving::4",
    "moduleId": "llm-serving",
    "lessonIndex": 4,
    "title": "Batch scheduling with variable sequence lengths",
    "readMinutes": 5
  },
  {
    "id": "aws-architecture-scratch-to-prod::0",
    "moduleId": "aws-architecture-scratch-to-prod",
    "lessonIndex": 0,
    "title": "VPC fundamentals: public, private, and isolated subnets across AZs",
    "readMinutes": 5
  },
  {
    "id": "aws-architecture-scratch-to-prod::1",
    "moduleId": "aws-architecture-scratch-to-prod",
    "lessonIndex": 1,
    "title": "NAT Gateways vs Gateway VPC Endpoints (S3 & DynamoDB PrivateLink)",
    "readMinutes": 5
  },
  {
    "id": "aws-architecture-scratch-to-prod::2",
    "moduleId": "aws-architecture-scratch-to-prod",
    "lessonIndex": 2,
    "title": "Ingress choices: Route 53, CloudFront OAC, ALB (L7) vs NLB (L4)",
    "readMinutes": 5
  },
  {
    "id": "aws-architecture-scratch-to-prod::3",
    "moduleId": "aws-architecture-scratch-to-prod",
    "lessonIndex": 3,
    "title": "Compute trade-offs: EC2 vs ECS Fargate vs EKS vs Lambda",
    "readMinutes": 5
  },
  {
    "id": "aws-architecture-scratch-to-prod::4",
    "moduleId": "aws-architecture-scratch-to-prod",
    "lessonIndex": 4,
    "title": "Amazon Aurora storage engine: 6-way replication and 4/6 write quorum",
    "readMinutes": 6
  },
  {
    "id": "aws-architecture-scratch-to-prod::5",
    "moduleId": "aws-architecture-scratch-to-prod",
    "lessonIndex": 5,
    "title": "DynamoDB partition physics: 1k WCU, 3k RCU, GSI backpressure, and DAX",
    "readMinutes": 6
  },
  {
    "id": "aws-architecture-scratch-to-prod::6",
    "moduleId": "aws-architecture-scratch-to-prod",
    "lessonIndex": 6,
    "title": "Async decoupling on AWS: SQS FIFO, SNS fan-out, and EventBridge",
    "readMinutes": 5
  },
  {
    "id": "aws-architecture-scratch-to-prod::7",
    "moduleId": "aws-architecture-scratch-to-prod",
    "lessonIndex": 7,
    "title": "IAM STS short-lived roles (IRSA) and KMS envelope encryption",
    "readMinutes": 5
  },
  {
    "id": "cloudflare-edge-and-workers::0",
    "moduleId": "cloudflare-edge-and-workers",
    "lessonIndex": 0,
    "title": "Anycast BGP routing: how one IP terminates TLS within 15ms globally",
    "readMinutes": 6
  },
  {
    "id": "cloudflare-edge-and-workers::1",
    "moduleId": "cloudflare-edge-and-workers",
    "lessonIndex": 1,
    "title": "Tiered Cache, Origin Shield, and single-flight request coalescing",
    "readMinutes": 5
  },
  {
    "id": "cloudflare-edge-and-workers::2",
    "moduleId": "cloudflare-edge-and-workers",
    "lessonIndex": 2,
    "title": "Cloudflare Workers: V8 Isolates vs containers and microVM cold starts",
    "readMinutes": 5
  },
  {
    "id": "cloudflare-edge-and-workers::3",
    "moduleId": "cloudflare-edge-and-workers",
    "lessonIndex": 3,
    "title": "Edge state spectrum: Workers KV (eventual) vs D1 vs R2 zero-egress storage",
    "readMinutes": 5
  },
  {
    "id": "cloudflare-edge-and-workers::4",
    "moduleId": "cloudflare-edge-and-workers",
    "lessonIndex": 4,
    "title": "Durable Objects: single-threaded global actors for strong consistency",
    "readMinutes": 5
  },
  {
    "id": "cloudflare-edge-and-workers::5",
    "moduleId": "cloudflare-edge-and-workers",
    "lessonIndex": 5,
    "title": "Edge WAF, L7 DDoS mitigation, Bot Management, and Turnstile",
    "readMinutes": 5
  },
  {
    "id": "cloudflare-edge-and-workers::6",
    "moduleId": "cloudflare-edge-and-workers",
    "lessonIndex": 6,
    "title": "Zero Trust networking: outbound-only cloudflared Tunnels with zero open ports",
    "readMinutes": 5
  },
  {
    "id": "kubernetes-control-and-data-plane::0",
    "moduleId": "kubernetes-control-and-data-plane",
    "lessonIndex": 0,
    "title": "Control plane anatomy: kube-apiserver, admission webhooks, and watch cache",
    "readMinutes": 5
  },
  {
    "id": "kubernetes-control-and-data-plane::1",
    "moduleId": "kubernetes-control-and-data-plane",
    "lessonIndex": 1,
    "title": "etcd under the hood: Raft quorum math, WAL fsync latency, and compaction",
    "readMinutes": 5
  },
  {
    "id": "kubernetes-control-and-data-plane::2",
    "moduleId": "kubernetes-control-and-data-plane",
    "lessonIndex": 2,
    "title": "kube-scheduler pipeline: filtering predicates, scoring priorities, and preemption",
    "readMinutes": 5
  },
  {
    "id": "kubernetes-control-and-data-plane::3",
    "moduleId": "kubernetes-control-and-data-plane",
    "lessonIndex": 3,
    "title": "Level-triggered reconciliation: controllers, Informers, and workqueues",
    "readMinutes": 5
  },
  {
    "id": "kubernetes-control-and-data-plane::4",
    "moduleId": "kubernetes-control-and-data-plane",
    "lessonIndex": 4,
    "title": "Data plane networking: Pod-to-Pod CNI, iptables O(N) vs Cilium eBPF O(1)",
    "readMinutes": 5
  },
  {
    "id": "kubernetes-control-and-data-plane::5",
    "moduleId": "kubernetes-control-and-data-plane",
    "lessonIndex": 5,
    "title": "North-South vs East-West: Gateway API, Ingress, and Envoy mTLS sidecar/ambient mesh",
    "readMinutes": 5
  },
  {
    "id": "kubernetes-control-and-data-plane::6",
    "moduleId": "kubernetes-control-and-data-plane",
    "lessonIndex": 6,
    "title": "Elastic scaling & GitOps: HPA, KEDA event autoscaling, Karpenter, and Argo CD",
    "readMinutes": 5
  },
  {
    "id": "extensible-plugins-and-operators::0",
    "moduleId": "extensible-plugins-and-operators",
    "lessonIndex": 0,
    "title": "Four plugin patterns: in-process hooks, WASM sandboxes, RPC webhooks, and CRDs",
    "readMinutes": 5
  },
  {
    "id": "extensible-plugins-and-operators::1",
    "moduleId": "extensible-plugins-and-operators",
    "lessonIndex": 1,
    "title": "Envoy Proxy-Wasm: running sub-millisecond Rust/Go L7 filters in worker threads",
    "readMinutes": 5
  },
  {
    "id": "extensible-plugins-and-operators::2",
    "moduleId": "extensible-plugins-and-operators",
    "lessonIndex": 2,
    "title": "Kubernetes CustomResourceDefinitions (CRDs) and the Operator pattern",
    "readMinutes": 5
  },
  {
    "id": "extensible-plugins-and-operators::3",
    "moduleId": "extensible-plugins-and-operators",
    "lessonIndex": 3,
    "title": "Admission webhooks: fail-open vs fail-closed and avoiding self-deadlock",
    "readMinutes": 5
  },
  {
    "id": "extensible-plugins-and-operators::4",
    "moduleId": "extensible-plugins-and-operators",
    "lessonIndex": 4,
    "title": "Designing safe tenant plugin SDKs: CPU fuel limits, memory caps, and capabilities",
    "readMinutes": 5
  },
  {
    "id": "security-zero-trust-and-cve-defense::0",
    "moduleId": "security-zero-trust-and-cve-defense",
    "lessonIndex": 0,
    "title": "Beyond castle-and-moat: Zero-Trust architecture from edge to database",
    "readMinutes": 5
  },
  {
    "id": "security-zero-trust-and-cve-defense::1",
    "moduleId": "security-zero-trust-and-cve-defense",
    "lessonIndex": 1,
    "title": "STRIDE threat modeling mapped directly to system design components",
    "readMinutes": 5
  },
  {
    "id": "security-zero-trust-and-cve-defense::2",
    "moduleId": "security-zero-trust-and-cve-defense",
    "lessonIndex": 2,
    "title": "Identity architecture: OIDC/OAuth2 PKCE, short-lived JWTs, and edge JWKS",
    "readMinutes": 5
  },
  {
    "id": "security-zero-trust-and-cve-defense::3",
    "moduleId": "security-zero-trust-and-cve-defense",
    "lessonIndex": 3,
    "title": "East-West workload identity: SPIFFE/SPIRE X.509 mTLS and L7 authorization",
    "readMinutes": 5
  },
  {
    "id": "security-zero-trust-and-cve-defense::4",
    "moduleId": "security-zero-trust-and-cve-defense",
    "lessonIndex": 4,
    "title": "Secrets management, dynamic DB leases, and KMS envelope encryption",
    "readMinutes": 5
  },
  {
    "id": "security-zero-trust-and-cve-defense::5",
    "moduleId": "security-zero-trust-and-cve-defense",
    "lessonIndex": 5,
    "title": "Containing live CVEs: WAF virtual patching, CNI micro-segmentation, and egress blocks",
    "readMinutes": 5
  },
  {
    "id": "security-vulnerabilities-and-attacks::0",
    "moduleId": "security-vulnerabilities-and-attacks",
    "lessonIndex": 0,
    "title": "OWASP Top 10 in one page: the vulnerabilities that keep shipping",
    "readMinutes": 5
  },
  {
    "id": "security-vulnerabilities-and-attacks::1",
    "moduleId": "security-vulnerabilities-and-attacks",
    "lessonIndex": 1,
    "title": "Cross-site request forgery: how a cookie becomes an attack",
    "readMinutes": 5
  },
  {
    "id": "security-vulnerabilities-and-attacks::2",
    "moduleId": "security-vulnerabilities-and-attacks",
    "lessonIndex": 2,
    "title": "Cross-site scripting: stored, reflected, and DOM-based",
    "readMinutes": 5
  },
  {
    "id": "security-vulnerabilities-and-attacks::3",
    "moduleId": "security-vulnerabilities-and-attacks",
    "lessonIndex": 3,
    "title": "SQL injection and parameterised queries: why OR 1=1 still works",
    "readMinutes": 5
  },
  {
    "id": "security-vulnerabilities-and-attacks::4",
    "moduleId": "security-vulnerabilities-and-attacks",
    "lessonIndex": 4,
    "title": "Server-side request forgery: when your server attacks itself",
    "readMinutes": 5
  },
  {
    "id": "security-vulnerabilities-and-attacks::5",
    "moduleId": "security-vulnerabilities-and-attacks",
    "lessonIndex": 5,
    "title": "Infrastructure attacks: SSRF to metadata, privilege escalation, and lateral movement",
    "readMinutes": 5
  },
  {
    "id": "security-vulnerabilities-and-attacks::6",
    "moduleId": "security-vulnerabilities-and-attacks",
    "lessonIndex": 6,
    "title": "Defence in depth: CSP, CORS, SameSite, and security headers",
    "readMinutes": 5
  },
  {
    "id": "application-security-essentials::0",
    "moduleId": "application-security-essentials",
    "lessonIndex": 0,
    "title": "Authentication vs authorization: sessions, JWT, and OAuth2/OIDC",
    "readMinutes": 5
  },
  {
    "id": "application-security-essentials::1",
    "moduleId": "application-security-essentials",
    "lessonIndex": 1,
    "title": "Password storage: hashing, salting, and Argon2",
    "readMinutes": 6
  },
  {
    "id": "application-security-essentials::2",
    "moduleId": "application-security-essentials",
    "lessonIndex": 2,
    "title": "API security: BOLA, mass assignment, and rate limits",
    "readMinutes": 5
  },
  {
    "id": "application-security-essentials::3",
    "moduleId": "application-security-essentials",
    "lessonIndex": 3,
    "title": "Supply chain security: SBOM, dependency confusion, and lockfiles",
    "readMinutes": 5
  },
  {
    "id": "application-security-essentials::4",
    "moduleId": "application-security-essentials",
    "lessonIndex": 4,
    "title": "Cryptography for engineers: hashing vs encryption vs signing",
    "readMinutes": 5
  },
  {
    "id": "application-security-essentials::5",
    "moduleId": "application-security-essentials",
    "lessonIndex": 5,
    "title": "DDoS and bot defence: L3/L4 vs L7",
    "readMinutes": 5
  },
  {
    "id": "application-security-essentials::6",
    "moduleId": "application-security-essentials",
    "lessonIndex": 6,
    "title": "Detection and incident response: logs, alerts, and the first hour",
    "readMinutes": 5
  },
  {
    "id": "principal-architect-and-finops::0",
    "moduleId": "principal-architect-and-finops",
    "lessonIndex": 0,
    "title": "Composite SLA arithmetic: why serial chains multiply failure and parallel paths heal it",
    "readMinutes": 5
  },
  {
    "id": "principal-architect-and-finops::1",
    "moduleId": "principal-architect-and-finops",
    "lessonIndex": 1,
    "title": "Error budgets, multi-window burn-rate alerts, and freeze policies",
    "readMinutes": 5
  },
  {
    "id": "principal-architect-and-finops::2",
    "moduleId": "principal-architect-and-finops",
    "lessonIndex": 2,
    "title": "Writing high-leverage Architecture Decision Records (ADRs) and RFCs",
    "readMinutes": 5
  },
  {
    "id": "principal-architect-and-finops::3",
    "moduleId": "principal-architect-and-finops",
    "lessonIndex": 3,
    "title": "Cloud FinOps hierarchy: architectural elimination, right-sizing, and Spot/Reserved mix",
    "readMinutes": 5
  },
  {
    "id": "principal-architect-and-finops::4",
    "moduleId": "principal-architect-and-finops",
    "lessonIndex": 4,
    "title": "Multi-cloud & hybrid TCO: comparing AWS, Cloudflare Edge, and Kubernetes",
    "readMinutes": 5
  },
  {
    "id": "principal-architect-and-finops::5",
    "moduleId": "principal-architect-and-finops",
    "lessonIndex": 5,
    "title": "Leading enterprise architecture reviews and L4–L7 competency rubrics",
    "readMinutes": 5
  },
  {
    "id": "search-at-scale::0",
    "moduleId": "search-at-scale",
    "lessonIndex": 0,
    "title": "Inverted indexes: why search is not a WHERE clause",
    "readMinutes": 6
  },
  {
    "id": "search-at-scale::1",
    "moduleId": "search-at-scale",
    "lessonIndex": 1,
    "title": "Analyzers, tokenization, and the query you actually meant",
    "readMinutes": 5
  },
  {
    "id": "search-at-scale::2",
    "moduleId": "search-at-scale",
    "lessonIndex": 2,
    "title": "Ranking: TF-IDF, BM25, and learning to rank",
    "readMinutes": 5
  },
  {
    "id": "search-at-scale::3",
    "moduleId": "search-at-scale",
    "lessonIndex": 3,
    "title": "Sharding and replicating a search cluster",
    "readMinutes": 5
  },
  {
    "id": "search-at-scale::4",
    "moduleId": "search-at-scale",
    "lessonIndex": 4,
    "title": "Keeping the index fresh: CDC and reindexing",
    "readMinutes": 5
  },
  {
    "id": "search-at-scale::5",
    "moduleId": "search-at-scale",
    "lessonIndex": 5,
    "title": "Autocomplete, typo tolerance, and query suggestions",
    "readMinutes": 5
  },
  {
    "id": "analytics-and-recommendations::0",
    "moduleId": "analytics-and-recommendations",
    "lessonIndex": 0,
    "title": "Columnar analytics: why OLAP is a different database",
    "readMinutes": 5
  },
  {
    "id": "analytics-and-recommendations::1",
    "moduleId": "analytics-and-recommendations",
    "lessonIndex": 1,
    "title": "Batch vs stream: Lambda and Kappa in practice",
    "readMinutes": 5
  },
  {
    "id": "analytics-and-recommendations::2",
    "moduleId": "analytics-and-recommendations",
    "lessonIndex": 2,
    "title": "Data modeling for analytics: facts, dimensions, and grains",
    "readMinutes": 5
  },
  {
    "id": "analytics-and-recommendations::3",
    "moduleId": "analytics-and-recommendations",
    "lessonIndex": 3,
    "title": "Recommendations: collaborative filtering to embeddings",
    "readMinutes": 5
  },
  {
    "id": "analytics-and-recommendations::4",
    "moduleId": "analytics-and-recommendations",
    "lessonIndex": 4,
    "title": "Ranking a feed: candidates, features, and reranking",
    "readMinutes": 5
  },
  {
    "id": "analytics-and-recommendations::5",
    "moduleId": "analytics-and-recommendations",
    "lessonIndex": 5,
    "title": "Measuring quality: offline metrics vs online experiments",
    "readMinutes": 5
  }
] as const;

export const LESSON_BLOG_SUMMARY_BY_ID: ReadonlyMap<string, LessonBlogSummary> = new Map(
  LESSON_BLOG_SUMMARY.map((entry) => [entry.id, entry]),
);

'use client';

/**
 * Compact command-palette catalog. Keep this module dependency-free: the
 * global shell must not import the full lesson, blog, or guided-lab registries.
 */

export type SearchEntryType = "track" | "lesson" | "blog" | "lab" | "tool" | "notation";

export type SearchEntry = {
  id: string;
  type: SearchEntryType;
  label: string;
  href: string;
  hint?: string;
  keywords: readonly string[];
};

export type SearchGroup = {
  type: SearchEntryType;
  heading: string;
  entries: readonly SearchEntry[];
};

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isSubsequence(needle: string, haystack: string): boolean {
  let index = 0;
  for (const character of haystack) {
    if (character === needle[index]) index += 1;
    if (index === needle.length) return true;
  }
  return false;
}

function editDistance(left: string, right: string): number {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function scoreSearchTerm(term: string, words: readonly string[]): number {
  let best = 0;
  for (const word of words) {
    if (word === term) {
      best = 1;
    } else if (term.length > 1 && word.startsWith(term)) {
      best = Math.max(best, 0.94 - Math.min(0.1, (word.length - term.length) * 0.01));
    } else if (term.length > 2 && word.includes(term)) {
      best = Math.max(best, 0.86);
    } else if (term.length >= 3 && isSubsequence(term, word)) {
      best = Math.max(best, 0.66);
    } else if (term.length >= 4) {
      const allowedDistance = term.length >= 8 ? 2 : 1;
      const distance = editDistance(term, word);
      if (distance <= allowedDistance) best = Math.max(best, 0.8 - distance * 0.08);
    }
    if (best === 1) break;
  }
  return best;
}

/** Rank literal and token matches above conservative word-level fuzzy matches. */
export function scorePaletteMatch(value: string, search: string, keywords: string[] = []): number {
  const query = search.trim().toLowerCase();
  if (!query) return 1;

  const normalizedQuery = normalizeSearchText(query);
  const queryTerms = normalizedQuery.split(" ").filter(Boolean);
  let best = 0;

  for (const field of keywords.length > 0 ? keywords : [value]) {
    const rawField = field.toLowerCase();
    const normalizedField = normalizeSearchText(field);
    if (!rawField) continue;

    if (rawField === query) {
      best = 1;
    } else if (rawField.includes(query)) {
      best = Math.max(best, 0.96);
    }

    if (normalizedQuery && normalizedField === normalizedQuery) {
      best = 1;
    } else if (normalizedQuery && normalizedField.includes(normalizedQuery)) {
      best = Math.max(best, 0.92);
    }

    if (queryTerms.length > 0) {
      const words = normalizedField.split(" ").filter(Boolean);
      const scores = queryTerms.map((term) => scoreSearchTerm(term, words));
      if (scores.every((score) => score > 0)) {
        const average = scores.reduce((total, score) => total + score, 0) / scores.length;
        best = Math.max(best, average * 0.88);
      }
    }

    if (best === 1) break;
  }

  return best;
}

type LessonSeed = readonly [slug: string, title: string, keywords: string];
type BlogSeed = readonly [slug: string, title: string, keywords: string];
type LabSeed = readonly [slug: string, title: string, keywords: string];
type ToolSeed = readonly [slug: string, title: string, href: string, keywords: string];
type NotationSeed = readonly [symbol: string, hint: string, keywords: string];

type TrackSeed = {
  slug: string;
  title: string;
  short: string;
  keywords: string;
  lessons: readonly LessonSeed[];
};

const TRACKS = [
  {
    slug: "foundations",
    title: "System Design Foundations",
    short: "Foundations",
    keywords: "system design fundamentals servers networking caches databases queues",
    lessons: [
      ["single-server", "Single Server to Scale", "single server vertical horizontal scaling stateless capacity p99"],
      ["networking-protocols", "Networking and Protocols", "network dns http2 http3 grpc tcp udp tls protocols"],
      ["load-balancing", "Load Balancing", "load balancer l4 l7 health checks least connections p2c"],
      ["caching-eviction", "Caching and Eviction", "cache caching eviction lru lfu ttl invalidation stampede"],
      ["sql-modeling", "SQL Modeling and Indexing", "sql database modeling indexing btree normalization transactions"],
      ["scaling-databases", "Scaling Databases", "database scaling replicas read write sharding connection pools"],
      ["rate-limiting", "Rate Limiting", "rate limit token bucket leaky bucket fixed window sliding quota"],
      ["queues-jobs", "Queues and Background Jobs", "queue background jobs workers retries dead letter backpressure"],
      ["realtime", "Real-Time: Polling, SSE, WebSockets", "real time realtime polling sse websockets persistent connections"],
    ],
  },
  {
    slug: "distributed",
    title: "Distributed Systems and Storage Internals",
    short: "Distributed",
    keywords: "distributed systems replication consensus sharding storage streaming",
    lessons: [
      ["replication-consistency", "Replication and Consistency", "replication consistency quorum cap pacelc read your writes"],
      ["sharding-hot-keys", "Sharding and Hot Keys", "sharding partitioning hot keys range hash routing"],
      ["consistent-hashing", "Consistent Hashing", "consistent hashing hash ring virtual nodes rendezvous"],
      ["raft-consensus", "Consensus with Raft", "raft consensus leader election majority quorum replicated log"],
      ["locks-circuit-breakers", "Distributed Locks and Circuit Breakers", "distributed locks leases fencing circuit breaker bulkhead timeout"],
      ["storage-engines", "Storage Engines: B-Trees, LSM-Trees, WAL, MVCC", "storage engines btree lsm wal mvcc compaction"],
      ["kafka-streaming", "Event Streaming with Kafka", "kafka event streaming partitions consumer lag exactly once"],
      ["distributed-transactions", "Distributed Transactions: 2PC, Sagas, Outbox", "distributed transactions 2pc saga outbox idempotency"],
      ["probabilistic-sketches", "Bloom Filters and HyperLogLog", "bloom filter hyperloglog probabilistic sketches cardinality"],
      ["observability-slos", "Observability and SLOs", "observability slo sli error budget tracing metrics logging"],
    ],
  },
  {
    slug: "case-studies",
    title: "Real-World HLD and LLD Case Studies",
    short: "Case Studies",
    keywords: "real world case studies high level design low level design hld lld",
    lessons: [
      ["url-shortener", "URL Shortener", "url shortener bitly base62 redirects cache"],
      ["chat-system", "Chat at Discord Scale", "chat discord scale websocket message history fanout"],
      ["video-streaming", "Video Streaming", "video streaming upload transcode cdn playback"],
      ["news-feed", "News Feed Fan-out", "news feed fanout celebrity timeline"],
      ["ride-hailing", "Ride-Hailing Geospatial", "ride hailing uber geospatial location matching"],
      ["search-engine", "Search Engine", "search engine indexing crawling ranking"],
      ["metrics-alerting", "Metrics and Alerting", "metrics alerting cardinality paging prometheus grafana"],
      ["lld-lru-cache", "LLD: LRU and LFU Cache", "lru lfu cache low level design o1 linked list hashmap"],
      ["lld-rate-limiter", "LLD: Distributed Rate Limiter", "rate limiter lld token bucket distributed redis"],
      ["lld-pubsub", "LLD: Pub/Sub Broker", "pubsub broker low level design topics subscribers queues"],
      ["lld-parking-lot", "LLD: Parking Lot", "parking lot low level design state machine concurrency"],
      ["lld-elevator", "LLD: Elevator System", "elevator system low level design scheduling state machine"],
    ],
  },
  {
    slug: "ai-engineering",
    title: "AI Engineering",
    short: "AI Engineering",
    keywords: "ai engineering agents rag retrieval evaluation guardrails security",
    lessons: [
      ["tokenization", "Tokenization and Context Windows", "tokenizer token ids context window bpe"],
      ["embeddings-rag", "Embeddings and Hybrid RAG", "embedding vector hybrid rag retrieval bm25 citations"],
      ["agent-loop", "The Agent Loop: Planning, Tools, State, Permissions", "agent loop planning tools state permissions react"],
      ["memory-architectures", "Memory Architectures", "agent memory short term long term vector scratchpad"],
      ["evals-guardrails", "Evals and Guardrails", "evals evaluation guardrails safety regression"],
      ["ai-security", "AI Security: Prompt Injection, Exfiltration, Tool Sandboxing", "ai security prompt injection exfiltration tool sandboxing indirect injection"],
    ],
  },
  {
    slug: "llm-inference",
    title: "LLM Inference Engineering and Training Systems",
    short: "LLM Inference",
    keywords: "llm inference transformer gpu serving training systems",
    lessons: [
      ["transformer-bottlenecks", "Transformer Bottlenecks", "transformer attention qkv mlp roofline gpu"],
      ["kv-cache-paged-attention", "KV Cache Math and PagedAttention", "kv cache vram pagedattention gqa mqa memory"],
      ["prefill-decode-batching", "Prefill vs Decode and Continuous Batching", "prefill decode continuous batching throughput ttft tpot"],
      ["quantization", "Quantization: FP16, FP8, INT8, INT4", "quantization fp16 fp8 int8 int4 precision"],
      ["latency-cost-budgets", "Latency, Throughput, and Cost Budgets", "llm latency throughput cost budget serving"],
      ["pretraining-posttraining", "Pre-training vs Post-training: SFT, RLHF, DPO", "pretraining posttraining sft rlhf dpo fine tuning"],
    ],
  },
  {
    slug: "ml-math",
    title: "ML Mathematics and the Paper Decoder",
    short: "ML Math",
    keywords: "machine learning mathematics probability optimization paper notation",
    lessons: [
      ["linear-algebra", "Linear Algebra Intuition", "linear algebra vectors matrices dot product eigen svd"],
      ["probability-information", "Probability and Information Theory", "probability information theory entropy cross entropy kl bayes"],
      ["backprop-optimizers", "Backprop and Optimizers: SGD and AdamW", "backpropagation optimizers sgd adamw gradients"],
      ["attention-scaling-laws", "Attention and Scaling Laws", "attention scaling laws chinchilla compute data"],
      ["notation-decoder", "Interactive Math Notation Decoder", "notation decoder math symbols lambda mu rho p99"],
    ],
  },
  {
    slug: "backend-cloud",
    title: "Backend, Cloud and Production Security",
    short: "Backend & Cloud",
    keywords: "backend cloud production security concurrency containers kubernetes deployments",
    lessons: [
      ["concurrency-event-loops", "Concurrency and Event Loops", "concurrency parallelism event loop async backpressure cancellation"],
      ["linux-docker", "Linux and Docker Internals", "linux docker namespaces cgroups containers rootless"],
      ["kubernetes", "Kubernetes Architecture and Autoscaling", "kubernetes k8s autoscaling hpa pods scheduling"],
      ["safe-deployments", "Safe Deployments: Canary, Blue-Green, Feature Flags", "safe deployments canary blue green feature flags rollback"],
      ["appsec-zero-trust", "AppSec and Multi-Tenant Zero Trust", "appsec zero trust multi tenant mtls rbac least privilege"],
    ],
  },
] as const satisfies readonly TrackSeed[];

const BLOGS = [
  ["database-melts-at-10k-rps", "Why Your Database Melts at 10,000 RPS (And How to Fix It)", "database 10000 rps 10k qps capacity bottleneck p99"],
  ["discord-trillions-of-messages", "How Discord Stores Trillions of Messages", "discord trillions messages cassandra channel partition history"],
  ["securing-agents-against-indirect-injection", "Securing AI Agents Against Indirect Prompt Injection", "ai agents indirect prompt injection security"],
  ["what-happens-during-token-generation", "What Actually Happens During an LLM Token Generation", "llm token generation inference prefill decode"],
  ["zero-downtime-schema-migrations", "Zero-Downtime Schema Migrations Explained Visually", "zero downtime schema migrations expand contract backfill"],
  ["consistent-hashing-in-production", "Consistent Hashing in Production", "consistent hashing production hash ring virtual nodes"],
  ["kafka-consumer-lag", "The Anatomy of Kafka Consumer Lag", "kafka consumer lag partitions throughput backpressure"],
  ["error-budgets-that-engineers-trust", "Error Budgets Engineers Actually Trust", "error budget slo sli burn rate reliability"],
] as const satisfies readonly BlogSeed[];

const LABS = [
  ["bitly-url-shortener", "URL Shortener (Bitly)", "bitly url shortener redirect cache"],
  ["pastebin-service", "Pastebin & Expiring Shares", "pastebin expiring shares burn after read"],
  ["youtube-upload-playback", "YouTube Upload & Playback", "youtube upload playback video cdn transcode"],
  ["whatsapp-chat", "WhatsApp 1:1 & Groups", "whatsapp chat groups realtime messaging"],
  ["twitter-timeline", "X Timeline (Fan-out)", "twitter timeline x tweets fanout celebrity"],
  ["instagram-feed", "Instagram Feed & Stories", "instagram feed stories ranking ttl"],
  ["bookmyshow-ticketing", "BookMyShow Seat Booking", "bookmyshow seat booking ticketing flash sale oversell"],
  ["razorpay-payments", "Razorpay Payment Ledger", "razorpay payments ledger idempotency webhooks"],
  ["uber-matching", "Uber Rider-Driver Match", "uber rider driver match geospatial dispatch"],
  ["netflix-streaming", "Netflix Open Connect", "netflix open connect streaming cdn"],
  ["search-autocomplete", "Search Autocomplete (Typeahead)", "search autocomplete typeahead suggestions trie"],
  ["dynamodb-from-scratch", "DynamoDB: KV from Scratch", "dynamodb from scratch key value quorum consistent hashing"],
  ["notification-platform", "Notification Platform (SMS/Push)", "notification platform sms push fanout"],
  ["dropbox-file-sync", "Dropbox Sync & Sharing", "dropbox file sync sharing chunks"],
  ["distributed-rate-limiter", "Stripe-Grade Rate Limiter", "stripe grade distributed rate limiter hot key gcra"],
  ["agentic-rag-support", "Agentic RAG Support Copilot", "agentic rag support copilot citations tools"],
] as const satisfies readonly LabSeed[];

const TOOLS = [
  ["capacity", "Capacity Estimate", "/tools#capacity-title", "capacity estimate sizing dau qps storage egress calculator"],
  ["kv-cache", "KV Cache and VRAM", "/tools#kv-title", "kv cache vram gpu memory calculator pagedattention"],
  ["error-budget", "Error Budget", "/tools#sla-title", "error budget calculator sla slo downtime burn rate"],
  ["notation", "Notation Decoder", "/tools#notation", "notation decoder symbols equations lambda mu rho p99 quorum"],
  ["security-checklist", "Security Checklist", "/tools#security-tool-title", "security checklist defensive review controls audit"],
] as const satisfies readonly ToolSeed[];

const NOTATION = [
  ["λ", "Lambda · arrival rate", "lambda arrival rate requests jobs throughput queueing"],
  ["μ", "Mu · service rate", "mu service rate server throughput queueing"],
  ["ρ", "Rho · utilization", "rho utilization arrival service rate stability"],
  ["L", "Average requests in system", "little law concurrency requests jobs system"],
  ["Lq", "Average queue length", "queue length waiting requests little law"],
  ["W", "Average total time in system", "waiting service latency little law"],
  ["Wq", "Average waiting time", "queue wait latency little law"],
  ["Little's Law", "Concurrency = throughput × latency", "little law concurrency throughput latency l lambda w"],
  ["p50", "Median latency", "p50 median latency half requests"],
  ["p95", "95th-percentile latency", "p95 percentile latency tail"],
  ["p99", "99th-percentile latency", "p99 percentile latency slow tail worst one percent"],
  ["p99.9", "99.9th-percentile latency", "p99.9 percentile latency slow tail"],
  ["QPS", "Queries per second", "qps queries per second throughput"],
  ["RPS", "Requests per second", "rps requests per second throughput"],
  ["O(1)", "Constant time", "constant time complexity"],
  ["O(log n)", "Logarithmic time", "logarithmic time complexity binary search tree"],
  ["O(n)", "Linear time", "linear time complexity"],
  ["O(n²)", "Quadratic time", "quadratic time complexity"],
  ["CAP", "Consistency, availability, partition", "cap theorem consistency availability network partition"],
  ["PACELC", "Latency vs consistency", "pacelc cap latency consistency partition"],
  ["N + R > W", "Quorum overlap rule", "quorum overlap replicas reads writes consistency distributed"],
  ["2PC", "Two-phase commit", "2pc two phase commit distributed transaction blocking"],
  ["Raft", "Leader election and replicated log", "raft consensus leader election quorum replicated log"],
  ["SLA", "Service-level agreement", "sla service level agreement availability promise"],
  ["SLO", "Service-level objective", "slo service level objective target"],
  ["SLI", "Service-level indicator", "sli service level indicator measured signal"],
  ["Error budget", "Allowed unreliability", "error budget allowed unreliability slo downtime"],
  ["Burn rate", "Error-budget consumption rate", "burn rate error budget consumption slo alert"],
  ["RPO", "Recovery point objective", "rpo recovery point objective data loss"],
  ["RTO", "Recovery time objective", "rto recovery time objective restore downtime"],
  ["MTTR", "Mean time to repair", "mttr mean time to repair restore failure"],
  ["MTBF", "Mean time between failures", "mtbf mean time between failures reliability"],
  ["TLS", "Transport Layer Security", "tls transport layer security encryption in transit"],
  ["mTLS", "Mutual TLS", "mtls mutual tls client server authentication"],
  ["RBAC", "Role-based access control", "rbac role based access control permissions"],
  ["JWT", "JSON Web Token", "jwt json web token claims signing"],
  ["softmax", "Logits to probabilities", "softmax probability distribution logits normalization"],
  ["logits", "Raw model scores", "logits raw model scores softmax"],
  ["KL", "Kullback-Leibler divergence", "kl kullback leibler divergence distributions"],
  ["Perplexity", "Language-model confidence", "perplexity negative log likelihood language model"],
  ["Temperature", "Sampling sharpness", "temperature sampling distribution sharpness randomness"],
  ["KV", "Attention key-value cache", "kv key value cache attention memory generation"],
  ["TTFT", "Time to first token", "ttft time to first token latency prefill"],
  ["tokens/s", "Token throughput", "tokens per second token throughput generation"],
  ["Context window", "Model token capacity", "context window token capacity input output"],
  ["RAG", "Retrieval-augmented generation", "rag retrieval augmented generation grounding citations"],
  ["Embedding", "Dense meaning vector", "embedding dense numeric vector meaning features"],
  ["Cosine similarity", "Vector angle similarity", "cosine similarity embedding vector angle distance"],
] as const satisfies readonly NotationSeed[];

export const SEARCH_GROUPS: readonly SearchGroup[] = [
  {
    type: "track",
    heading: "Paths",
    entries: TRACKS.map((track) => ({
      id: `track:${track.slug}`,
      type: "track",
      label: track.title,
      href: `/paths/${track.slug}`,
      hint: "Path",
      keywords: [track.slug, track.title, track.keywords],
    })),
  },
  {
    type: "lesson",
    heading: "Lessons",
    entries: TRACKS.flatMap((track) =>
      track.lessons.map(([slug, title, keywords]) => ({
        id: `lesson:${track.slug}:${slug}`,
        type: "lesson",
        label: title,
        href: `/paths/${track.slug}/${slug}`,
        hint: track.short,
        keywords: [slug, track.slug, track.title, keywords],
      })),
    ),
  },
  {
    type: "blog",
    heading: "Blogs",
    entries: BLOGS.map(([slug, title, keywords]) => ({
      id: `blog:${slug}`,
      type: "blog",
      label: title,
      href: `/blogs/${slug}`,
      hint: "Blog",
      keywords: [slug, keywords],
    })),
  },
  {
    type: "lab",
    heading: "Labs",
    entries: LABS.map(([slug, title, keywords]) => ({
      id: `lab:${slug}`,
      type: "lab",
      label: title,
      href: `/labs/${slug}`,
      hint: "Guided lab",
      keywords: [slug, keywords],
    })),
  },
  {
    type: "tool",
    heading: "Tools",
    entries: TOOLS.map(([slug, title, href, keywords]) => ({
      id: `tool:${slug}`,
      type: "tool",
      label: title,
      href,
      hint: "Tool",
      keywords: [slug, keywords],
    })),
  },
  {
    type: "notation",
    heading: "Notation",
    entries: NOTATION.map(([symbol, hint, keywords]) => ({
      id: `notation:${symbol}`,
      type: "notation",
      label: symbol,
      href: "/tools#notation",
      hint,
      keywords: [symbol, keywords],
    })),
  },
];

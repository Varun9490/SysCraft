export type TopicKind =
  | "consistent-hashing"
  | "load-balancing"
  | "cache"
  | "rate-limit"
  | "sharding"
  | "cdn";

export type TopicCategory = "Fundamentals" | "Distributed" | "Networking" | "Data" | "Reliability";

export interface TopicParamChoice {
  value: string;
  label: string;
}

export interface TopicParam {
  id: string;
  label: string;
  kind: "range" | "choice";
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  default: number | string;
  choices?: TopicParamChoice[];
}

export interface Topic {
  slug: string;
  title: string;
  tagline: string;
  category: TopicCategory;
  /** Interactive sandbox kind. Omit for concept-only topics (no simulator). */
  kind?: TopicKind;
  idea: string;
  howItWorks: { title: string; body: string }[];
  tradeoffs: { pro: string; con: string }[];
  cloud: { provider: "AWS" | "Azure" | "GCP" | "Cloudflare"; service: string; note: string }[];
  params: TopicParam[];
  relatedLabId?: string;
}

export const TOPICS: Topic[] = [
  {
    slug: "consistent-hashing",
    title: "Consistent hashing",
    tagline: "Distribute keys across a changing set of nodes without reshuffling the world.",
    category: "Distributed",
    kind: "consistent-hashing",
    idea:
      "Map both nodes and keys onto a circular hash space. A key belongs to the first node clockwise from it. When a node joins or leaves, only the keys in its arc move — everyone else stays put.",
    howItWorks: [
      {
        title: "Hash the ring",
        body: "Both node identifiers and request keys are hashed into the same 0–360° space. The ring is just that space, wrapped end to end.",
      },
      {
        title: "Add virtual nodes",
        body: "One position per physical node produces lumpy arcs. Hashing each node many times (vnodes) spreads it around the ring and evens out the load.",
      },
      {
        title: "Assign clockwise",
        body: "To find a key's home, walk clockwise from its position to the first vnode. That node owns the key until the topology changes.",
      },
      {
        title: "Minimal disruption",
        body: "Losing a node only migrates its arc — roughly 1/N of keys — instead of the near-100% remap you get from modulo hashing.",
      },
    ],
    tradeoffs: [
      { pro: "Only ~1/N of keys move when the cluster changes size", con: "Ring metadata must be gossiped to every client or proxy" },
      { pro: "Vnodes smooth out hot spots without manual tuning", con: "Hot keys can still saturate a single arc" },
    ],
    cloud: [
      { provider: "AWS", service: "DynamoDB / DAX", note: "Partition keys are hashed onto a token ring internally" },
      { provider: "Cloudflare", service: "Workers KV", note: "Keys are globally distributed across the edge ring" },
      { provider: "GCP", service: "Bigtable", note: "Row keys split into tablets along a hashed or ordered space" },
    ],
    params: [
      { id: "nodes", label: "Ring nodes", kind: "range", min: 1, max: 12, step: 1, default: 4 },
      { id: "replicas", label: "Vnodes per node", kind: "range", min: 1, max: 6, step: 1, default: 3 },
      { id: "keys", label: "Keys to place", kind: "range", min: 6, max: 120, step: 1, default: 48 },
    ],
    relatedLabId: "dynamodb-from-scratch",
  },
  {
    slug: "load-balancing",
    title: "Load balancing",
    tagline: "Spread traffic across replicas — and decide what happens when they disagree.",
    category: "Networking",
    kind: "load-balancing",
    idea:
      "A load balancer is the single address your clients hit and the traffic cop that decides which backend serves each request. The algorithm determines how evenly work lands.",
    howItWorks: [
      {
        title: "Health check",
        body: "Backends that fail their check are pulled from rotation before they can serve a single bad request.",
      },
      {
        title: "Pick a target",
        body: "Round-robin cycles in order; least-connections sends to the emptiest server; random is stateless but lumpy at low counts.",
      },
      {
        title: "Move the bytes",
        body: "L4 balances on connections and is fast; L7 balances on the actual request and can route by path, header, or cookie.",
      },
      {
        title: "Watch the skew",
        body: "Any imbalance shows up as a hot server, a rising p99, and a queue. The bar chart is what your dashboard should look like.",
      },
    ],
    tradeoffs: [
      { pro: "Removes single points of failure and enables rolling deploys", con: "The balancer itself must be redundant and is a new hop" },
      { pro: "Least-connections adapts to uneven request cost", con: "Round-robin ignores cost and can overload a slow backend" },
    ],
    cloud: [
      { provider: "AWS", service: "ALB / NLB", note: "L7 and L4 balancing with target groups and health checks" },
      { provider: "Azure", service: "Application Gateway", note: "L7 routing with WAF and path-based rules" },
      { provider: "GCP", service: "Cloud Load Balancing", note: "Global anycast VIP with a single anycast address" },
      { provider: "Cloudflare", service: "Load Balancing", note: "DNS and proxy-level balancing with geo steering" },
    ],
    params: [
      { id: "servers", label: "Backends", kind: "range", min: 2, max: 12, step: 1, default: 5 },
      { id: "rps", label: "Incoming rps", kind: "range", min: 20, max: 400, step: 10, default: 140 },
      {
        id: "algorithm",
        label: "Algorithm",
        kind: "choice",
        default: "round-robin",
        choices: [
          { value: "round-robin", label: "Round-robin" },
          { value: "least-conn", label: "Least-conn" },
          { value: "random", label: "Random" },
        ],
      },
    ],
    relatedLabId: "bitly-url-shortener",
  },
  {
    slug: "caching-strategies",
    title: "Caching strategies",
    tagline: "Trade memory for latency — until the working set outgrows the cache.",
    category: "Data",
    kind: "cache",
    idea:
      "A cache keeps the small, hot slice of your data near the requester. The hit rate — not the cache technology — is what moves your latency and database load.",
    howItWorks: [
      {
        title: "Serve from memory",
        body: "An in-process hit never leaves the box: sub-microsecond. A networked cache hit (Redis, Memcached) still pays a ~1 ms round trip — close to 100x better than a typical DB read, but not free. A miss pays the cache round trip plus the origin read.",
      },
      {
        title: "Evict by policy",
        body: "LRU drops the least-recently-used entry when full. Tune the size against the request distribution to bend the curve.",
      },
      {
        title: "Mind the skew",
        body: "Real traffic is skewed: a few keys dominate. High skew means a small cache already absorbs most requests.",
      },
      {
        title: "Stay coherent",
        body: "Write-through, write-back, and TTL each trade staleness against write cost. Pick based on your tolerance for old reads.",
      },
    ],
    tradeoffs: [
      { pro: "Cuts origin load and p99 latency dramatically", con: "Adds a coherence problem: invalidation is famously hard" },
      { pro: "Cheap horizontal scale by adding cache nodes", con: "Cold start after a restart hammers the origin (thundering herd)" },
    ],
    cloud: [
      { provider: "AWS", service: "ElastiCache (Redis)", note: "In-memory cache with cluster mode and TTLs" },
      { provider: "Azure", service: "Azure Cache for Redis", note: "Managed Redis with geo-replication" },
      { provider: "GCP", service: "Memorystore", note: "Redis-compatible managed cache" },
      { provider: "Cloudflare", service: "Cache API / CDN cache", note: "Edge caching with cache rules and TTLs" },
    ],
    params: [
      { id: "cacheSize", label: "Cache size (entries)", kind: "range", min: 2, max: 64, step: 1, default: 16 },
      { id: "keySpace", label: "Distinct keys", kind: "range", min: 10, max: 200, step: 5, default: 60 },
      { id: "skew", label: "Access skew", kind: "range", min: 0, max: 1, step: 0.05, default: 0.8 },
      { id: "requests", label: "Requests", kind: "range", min: 200, max: 2000, step: 100, default: 800 },
      { id: "ttlFlushEvery", label: "Full flush every (requests, 0 = off)", kind: "range", min: 0, max: 600, step: 20, default: 0 },
    ],
    relatedLabId: "bitly-url-shortener",
  },
  {
    slug: "rate-limiting",
    title: "Rate limiting",
    tagline: "Protect a backend by deciding, up front, what it will refuse.",
    category: "Reliability",
    kind: "rate-limit",
    idea:
      "A token bucket refills at a steady rate and caps at a burst ceiling. Each request spends one token; when the bucket is empty, requests are shed cleanly instead of crushing the service.",
    howItWorks: [
      {
        title: "Refill",
        body: "Every tick the bucket gains `rate` tokens, never exceeding the burst cap. Idle time banks headroom.",
      },
      {
        title: "Spend",
        body: "A request takes one token if available. The bucket smoothly absorbs short spikes up to the burst size.",
      },
      {
        title: "Shed",
        body: "With no tokens left, requests are rejected — fast — with a 429 rather than queuing until everything times out.",
      },
      {
        title: "Distribute",
        body: "Across many nodes, counters must be shared in Redis or reconciled locally, trading exactness for speed.",
      },
    ],
    tradeoffs: [
      { pro: "Cheap, predictable protection against abuse and outages", con: "A global limit over distributed nodes needs shared state" },
      { pro: "Burst ceiling lets legitimate spikes through", con: "Mis-set limits either throttle users or fail to protect" },
    ],
    cloud: [
      { provider: "AWS", service: "API Gateway / WAF", note: "Per-route throttling and rate-based WAF rules" },
      { provider: "Cloudflare", service: "Rate Limiting Rules", note: "Edge rate limits by IP, header, or path" },
      { provider: "Azure", service: "API Management", note: "Subscription and product-level quotas" },
      { provider: "GCP", service: "Cloud Armor", note: "Rate-based bans and adaptive protection" },
    ],
    params: [
      { id: "rate", label: "Refill (tokens/s)", kind: "range", min: 1, max: 100, step: 1, default: 20 },
      { id: "burst", label: "Burst ceiling", kind: "range", min: 1, max: 120, step: 1, default: 40 },
      { id: "requestRps", label: "Incoming rps", kind: "range", min: 1, max: 200, step: 1, default: 60 },
      { id: "seconds", label: "Window (s)", kind: "range", min: 4, max: 20, step: 1, default: 10 },
    ],
    relatedLabId: "distributed-rate-limiter",
  },
  {
    slug: "database-sharding",
    title: "Database sharding",
    tagline: "Split one huge table into many — then fight the shard that got all the hot keys.",
    category: "Data",
    kind: "sharding",
    idea:
      "Sharding partitions rows across independent databases so each one stays small. The partitioning key decides whether the load is even or painfully lopsided.",
    howItWorks: [
      {
        title: "Choose a key",
        body: "The shard key must spread writes evenly and keep common reads on one shard. Get this wrong and everything downstream hurts.",
      },
      {
        title: "Hash or range",
        body: "Hashing spreads keys uniformly but kills range scans. Range sharding keeps scans local but concentrates hot ranges.",
      },
      {
        title: "Reshard",
        body: "When one shard grows hot you split it. Consistent hashing or a directory service keeps the move from touching other shards.",
      },
      {
        title: "Query across shards",
        body: "Cross-shard joins and transactions are the tax. Denormalize, or fan out and merge in the application layer.",
      },
    ],
    tradeoffs: [
      { pro: "Horizontal scale past what one machine can hold", con: "Cross-shard queries and transactions get expensive" },
      { pro: "Failure is contained to a single shard", con: "A skewed key is a reliability event, not a slow query" },
    ],
    cloud: [
      { provider: "AWS", service: "Aurora Limitless / DynamoDB", note: "Auto-sharding or managed partition scaling" },
      { provider: "GCP", service: "Cloud Spanner", note: "Automatically splits and rebalances ranges" },
      { provider: "Azure", service: "Cosmos DB", note: "Partition key chosen at container creation" },
    ],
    params: [
      { id: "shards", label: "Shards", kind: "range", min: 2, max: 16, step: 1, default: 4 },
      { id: "keys", label: "Rows / keys", kind: "range", min: 40, max: 400, step: 20, default: 240 },
      {
        id: "strategy",
        label: "Strategy",
        kind: "choice",
        default: "hash",
        choices: [
          { value: "hash", label: "Hash" },
          { value: "range", label: "Range" },
        ],
      },
      { id: "skew", label: "Hot-key share", kind: "range", min: 0, max: 0.9, step: 0.05, default: 0.25 },
    ],
    relatedLabId: "dynamodb-from-scratch",
  },
  {
    slug: "cdn-and-edge",
    title: "CDN & the edge",
    tagline: "Serve from the city next door instead of the region on the other side of the planet.",
    category: "Networking",
    kind: "cdn",
    idea:
      "A CDN is a fleet of caches placed close to users. On a hit, bytes never leave the edge; on a miss, the edge fetches from origin and caches for the next visitor.",
    howItWorks: [
      {
        title: "Anycast routing",
        body: "One IP announced from every location means the network itself steers each user to the nearest edge.",
      },
      {
        title: "Cache at the edge",
        body: "Static assets and cacheable responses are stored at the edge with a TTL. Hit ratio is the whole ballgame.",
      },
      {
        title: "Miss to origin",
        body: "A miss pays the full origin round trip — plus cache-fill — so warming and TTL tuning matter enormously.",
      },
      {
        title: "Offload the origin",
        body: "Each point of hit ratio is origin load you never serve, which is capacity you never buy.",
      },
    ],
    tradeoffs: [
      { pro: "Large latency win with almost no application change", con: "Stale content risk — invalidation is not instant everywhere" },
      { pro: "Absorbs traffic spikes and DDoS at the edge", con: "Dynamic, per-user responses are hard to cache" },
    ],
    cloud: [
      { provider: "Cloudflare", service: "CDN + Workers", note: "Anycast edge with programmable cache and compute" },
      { provider: "AWS", service: "CloudFront + Lambda@Edge", note: "Global edge cache with edge compute" },
      { provider: "Azure", service: "Front Door / CDN", note: "Global edge with WAF and routing" },
      { provider: "GCP", service: "Cloud CDN", note: "Edge caching backed by Google's network" },
    ],
    params: [
      { id: "edges", label: "Edge locations", kind: "range", min: 0, max: 8, step: 1, default: 4 },
      { id: "hitRatio", label: "Cache hit ratio (%)", kind: "range", min: 0, max: 100, step: 5, default: 60 },
      { id: "originLatency", label: "Origin latency (ms)", kind: "range", min: 20, max: 220, step: 5, default: 90 },
      { id: "edgeLatency", label: "Edge latency (ms)", kind: "range", min: 5, max: 50, step: 1, default: 18 },
    ],
    relatedLabId: "netflix-streaming" as string | undefined,
  },
  {
    slug: "api-gateway",
    title: "API gateway & reverse proxies",
    tagline: "One front door for auth, routing, throttling, and observability across every backend.",
    category: "Networking",
    kind: "load-balancing",
    idea:
      "An API gateway is a reverse proxy that owns the concerns every service would otherwise re-implement: authentication, routing, rate limits, request shaping, and telemetry. It centralizes the cross-cutting edges of your system.",
    howItWorks: [
      {
        title: "Terminate and authenticate",
        body: "TLS ends at the gateway and it validates tokens once, forwarding an identity header downstream instead of making every service re-parse a JWT.",
      },
      {
        title: "Route by request",
        body: "Path, header, and host rules map a single public address to many internal services — /orders to one fleet, /search to another.",
      },
      {
        title: "Shape and protect",
        body: "Per-route quotas, request size caps, and circuit breakers stop one abusive client or one sick backend from taking the rest down.",
      },
      {
        title: "Observe centrally",
        body: "Because all north-south traffic passes through it, the gateway is the cheapest place to emit RED metrics and access logs.",
      },
    ],
    tradeoffs: [
      { pro: "Removes duplicated auth, throttling, and logging from every service", con: "Becomes a critical shared dependency and a potential single point of failure" },
      { pro: "Fast to add a new service behind an existing contract", con: "Custom per-service logic in the gateway is hard to test and easy to bloat" },
    ],
    cloud: [
      { provider: "AWS", service: "API Gateway", note: "Managed REST/HTTP APIs with usage plans, auth, and stages" },
      { provider: "GCP", service: "Apigee / API Gateway", note: "Policy-driven gateway with quotas and analytics" },
      { provider: "Azure", service: "API Management", note: "Developer portal, products, and subscription keys" },
      { provider: "Cloudflare", service: "API Shield", note: "Edge schema validation and rate limiting" },
    ],
    params: [
      { id: "servers", label: "Backend services", kind: "range", min: 2, max: 12, step: 1, default: 5 },
      { id: "rps", label: "Gateway rps", kind: "range", min: 20, max: 400, step: 10, default: 180 },
      {
        id: "algorithm",
        label: "Upstream strategy",
        kind: "choice",
        default: "least-conn",
        choices: [
          { value: "round-robin", label: "Round-robin" },
          { value: "least-conn", label: "Least-conn" },
          { value: "random", label: "Random" },
        ],
      },
    ],
    relatedLabId: "distributed-rate-limiter",
  },
  {
    slug: "read-replicas",
    title: "Read replicas",
    tagline: "Scale reads horizontally — and decide how much staleness you can tolerate.",
    category: "Data",
    kind: "load-balancing",
    idea:
      "A replica is a copy of your database that serves reads. Send SELECT queries to replicas and leave the primary for writes, and a read-heavy workload scales almost linearly. The cost is replication lag: replicas are usually a few milliseconds behind.",
    howItWorks: [
      {
        title: "Stream the log",
        body: "The primary ships its write-ahead log to replicas, which replay it. Async replication keeps the primary fast but lets replicas lag.",
      },
      {
        title: "Route reads",
        body: "The application (or a proxy) sends reads to replicas and writes to the primary. Some queries must go to the primary to see fresh data.",
      },
      {
        title: "Handle lag",
        body: "Read-your-writes breaks the moment you read from a lagged replica. Pin a user to the primary briefly after they write, or read from the primary for that session.",
      },
      {
        title: "Failover",
        body: "When the primary dies, promote the most caught-up replica. Fence the old primary before promotion or you risk split-brain double writes.",
      },
    ],
    tradeoffs: [
      { pro: "Read capacity grows by adding replicas with little application change", con: "Replication lag causes stale reads unless you route carefully" },
      { pro: "Replicas double as failover targets and reporting copies", con: "The failover path must be rehearsed, not assumed" },
    ],
    cloud: [
      { provider: "AWS", service: "RDS Read Replicas / Aurora", note: "Async replicas with reader endpoints and auto-failover" },
      { provider: "GCP", service: "Cloud SQL read replicas", note: "Regional and cross-region replicas" },
      { provider: "Azure", service: "Azure SQL geo-replicas", note: "Readable secondaries in other regions" },
    ],
    params: [
      { id: "servers", label: "Replicas", kind: "range", min: 1, max: 8, step: 1, default: 3 },
      { id: "rps", label: "Read rps", kind: "range", min: 50, max: 600, step: 10, default: 260 },
      {
        id: "algorithm",
        label: "Read strategy",
        kind: "choice",
        default: "least-conn",
        choices: [
          { value: "round-robin", label: "Round-robin" },
          { value: "least-conn", label: "Least-conn" },
          { value: "random", label: "Random" },
        ],
      },
    ],
    relatedLabId: "bitly-url-shortener",
  },
  {
    slug: "message-queues",
    title: "Message queues & backpressure",
    tagline: "Turn a crash into a delay by letting producers and consumers move at different speeds.",
    category: "Distributed",
    kind: "rate-limit",
    idea:
      "A queue is a durable buffer between a producer and a consumer. When traffic spikes, the queue absorbs the burst and consumers drain it at their own pace instead of the whole system falling over.",
    howItWorks: [
      {
        title: "Produce",
        body: "The producer appends a message and moves on. It does not wait for the work to finish, which is what makes the spike survivable.",
      },
      {
        title: "Buffer",
        body: "The queue holds messages until a consumer is ready. Depth is a signal: a rising queue means consumers cannot keep up.",
      },
      {
        title: "Consume with ack",
        body: "A consumer pulls a message, processes it, then acks. If it dies mid-work, a visibility timeout redelivers it — hence at-least-once.",
      },
      {
        title: "Apply backpressure",
        body: "When the queue grows past a threshold, shed load (429), scale consumers, or dead-letter poison messages instead of queuing forever.",
      },
    ],
    tradeoffs: [
      { pro: "Absorbs bursts and decouples services so one slow consumer cannot stall producers", con: "At-least-once delivery means consumers must be idempotent" },
      { pro: "Queue depth is a clean autoscaling signal", con: "Unbounded queues hide failures until the backlog is hopeless" },
    ],
    cloud: [
      { provider: "AWS", service: "SQS / SNS", note: "Managed queues with visibility timeout and DLQs" },
      { provider: "GCP", service: "Pub/Sub", note: "At-least-once topics with dead-letter policies" },
      { provider: "Azure", service: "Service Bus", note: "Queues with sessions, retries, and DLQs" },
    ],
    params: [
      { id: "rate", label: "Consumer rate (msg/s)", kind: "range", min: 1, max: 100, step: 1, default: 25 },
      { id: "burst", label: "Buffer capacity", kind: "range", min: 1, max: 120, step: 1, default: 50 },
      { id: "requestRps", label: "Producer rps", kind: "range", min: 1, max: 200, step: 1, default: 70 },
      { id: "seconds", label: "Window (s)", kind: "range", min: 4, max: 20, step: 1, default: 12 },
    ],
    relatedLabId: "notification-platform",
  },
  {
    slug: "circuit-breakers",
    title: "Circuit breakers & bulkheads",
    tagline: "Fail fast when a dependency is down instead of piling requests onto a dying service.",
    category: "Reliability",
    kind: "rate-limit",
    idea:
      "A circuit breaker watches calls to a dependency and, once failures cross a threshold, stops calling it entirely for a cool-off period. Bulkheads isolate resource pools so one slow dependency cannot consume every thread.",
    howItWorks: [
      {
        title: "Closed",
        body: "Traffic flows normally while the breaker counts failures. A few sporadic errors are fine — you trip on a sustained rate, not one hiccup.",
      },
      {
        title: "Open",
        body: "Past the threshold the breaker short-circuits every call with an immediate error, giving the failing dependency room to recover and freeing your own threads.",
      },
      {
        title: "Half-open",
        body: "After a cooldown, a few trial requests probe the dependency. Success closes the breaker; failure reopens it and resets the timer.",
      },
      {
        title: "Isolate with bulkheads",
        body: "Give each dependency its own connection and thread pool so a slow search backend cannot starve the checkout path of all workers.",
      },
    ],
    tradeoffs: [
      { pro: "Prevents cascading failure and gives overloaded dependencies time to heal", con: "A mis-tuned threshold can trip on normal blips and shed good traffic" },
      { pro: "Bulkheads contain the blast radius of one bad dependency", con: "More pools mean more capacity reserved and less efficient utilisation" },
    ],
    cloud: [
      { provider: "AWS", service: "App Mesh / SDK retries", note: "Outlier detection ejects unhealthy targets" },
      { provider: "Azure", service: "Front Door", note: "Health probes and origin failover" },
      { provider: "GCP", service: "Service Mesh (Istio)", note: "Outlier detection and circuit breaking per service" },
    ],
    params: [
      { id: "rate", label: "Healthy call rate", kind: "range", min: 1, max: 100, step: 1, default: 40 },
      { id: "burst", label: "Trip threshold", kind: "range", min: 1, max: 120, step: 1, default: 60 },
      { id: "requestRps", label: "Incoming rps", kind: "range", min: 1, max: 200, step: 1, default: 90 },
      { id: "seconds", label: "Cooldown (s)", kind: "range", min: 4, max: 20, step: 1, default: 8 },
    ],
    relatedLabId: "razorpay-payments",
  },
  {
    slug: "partition-keys",
    title: "Choosing partition keys",
    tagline: "The single choice that decides whether your database scales or melts one shard.",
    category: "Data",
    kind: "sharding",
    idea:
      "A partition key decides which shard owns each row. A good key spreads writes evenly and keeps the rows a query needs on one shard. A bad key concentrates all traffic on a single hot partition.",
    howItWorks: [
      {
        title: "Match access to placement",
        body: "Partition by the field your hottest queries filter on, so a query touches one shard instead of fanning out to all of them.",
      },
      {
        title: "Spread the writes",
        body: "A monotonically increasing key (like a timestamp) sends every new write to the last shard. Composite or hashed keys scatter the load.",
      },
      {
        title: "Watch for hot keys",
        body: "A celebrity user or a viral item is one key with a million reads. Suffix-salting (key#1..#16) or a separate cache path spreads it.",
      },
      {
        title: "Plan resharding",
        body: "Pre-split before launch and move shards with dual writes. Keep each shard small enough that a move finishes in minutes.",
      },
    ],
    tradeoffs: [
      { pro: "Even write spread lets a database scale near-linearly", con: "A cross-partition query becomes scatter-gather and much slower" },
      { pro: "Co-locating related rows keeps joins local", con: "A skewed key is a reliability incident, not just a slow query" },
    ],
    cloud: [
      { provider: "AWS", service: "DynamoDB", note: "Partition key + sort key with adaptive capacity" },
      { provider: "GCP", service: "Bigtable / Spanner", note: "Row-key design drives tablet splitting" },
      { provider: "Azure", service: "Cosmos DB", note: "Partition key fixed at container creation" },
    ],
    params: [
      { id: "shards", label: "Partitions", kind: "range", min: 2, max: 16, step: 1, default: 6 },
      { id: "keys", label: "Rows", kind: "range", min: 40, max: 400, step: 20, default: 260 },
      {
        id: "strategy",
        label: "Key type",
        kind: "choice",
        default: "hash",
        choices: [
          { value: "hash", label: "Hashed" },
          { value: "range", label: "Ordered" },
        ],
      },
      { id: "skew", label: "Hot-key share", kind: "range", min: 0, max: 0.9, step: 0.05, default: 0.3 },
    ],
    relatedLabId: "dynamodb-from-scratch",
  },
  {
    slug: "cache-invalidation",
    title: "Cache invalidation & TTLs",
    tagline: "A cache is easy until data changes — then every read can be wrong in a different way.",
    category: "Data",
    kind: "cache",
    idea:
      "A cache keeps a copy of data closer to the reader. The moment the source changes, that copy is stale. Invalidation is the discipline of deciding how quickly, and how accurately, the copy catches up.",
    howItWorks: [
      {
        title: "Write-through",
        body: "Every write updates the cache and the database together. Reads are always fresh and cache hit ratio stays high, at the cost of slower writes.",
      },
      {
        title: "Cache-aside",
        body: "The application reads from the cache and, on a miss, loads from the database and populates the cache. Simple, but there is a window where a write and a cache fill can race.",
      },
      {
        title: "TTL and versioned keys",
        body: "Expire entries after a TTL, or embed a version in the key so an update writes a new key and the old one ages out. No deletes means no invalidation race.",
      },
      {
        title: "Guard against a stampede",
        body: "When a hot key expires, a thousand requests can miss at once. Single-flight coalescing, jittered TTLs, and HTTP stale-while-revalidate keep the origin alive.",
      },
    ],
    tradeoffs: [
      { pro: "Cuts origin load and p99 latency dramatically", con: "Stale reads are possible for the length of the TTL or invalidation delay" },
      { pro: "Immutability via versioned keys avoids deletes entirely", con: "It grows the key space and needs careful eviction to bound memory" },
    ],
    cloud: [
      { provider: "AWS", service: "ElastiCache for Redis", note: "TTL, keyspace notifications, and Lua for atomic fills" },
      { provider: "Cloudflare", service: "Cache Rules + SWR", note: "Edge TTLs with stale-while-revalidate" },
      { provider: "GCP", service: "Memorystore", note: "Redis-compatible cache with cluster mode" },
    ],
    params: [
      { id: "cacheSize", label: "Cache entries", kind: "range", min: 2, max: 64, step: 1, default: 20 },
      { id: "keySpace", label: "Distinct keys", kind: "range", min: 10, max: 200, step: 5, default: 70 },
      { id: "skew", label: "Access skew", kind: "range", min: 0, max: 1, step: 0.05, default: 0.75 },
      { id: "requests", label: "Requests", kind: "range", min: 200, max: 2000, step: 100, default: 900 },
      { id: "ttlFlushEvery", label: "Full flush every (requests, 0 = off)", kind: "range", min: 0, max: 600, step: 20, default: 0 },
    ],
    relatedLabId: "twitter-timeline",
  },
  {
    slug: "bloom-filters",
    title: "Bloom filters",
    tagline: "A tiny bitmap that answers 'definitely not here' before you touch the disk.",
    category: "Data",
    idea:
      "A Bloom filter is an m-bit array with k hash functions. Adding an item sets k bits; checking an item asks whether all k are set. It never says 'yes' wrongly — but it can say 'no' when the answer is actually yes.",
    howItWorks: [
      {
        title: "Insert",
        body: "Hash the item k ways and set those k bits to 1. Bits are shared, so the filter is far smaller than the set it represents.",
      },
      {
        title: "Query",
        body: "Hash k ways again. If any bit is 0 the item is definitely absent. If all are 1 it may be present — a false positive.",
      },
      {
        title: "Size for the rate",
        body: "False positives grow as the filter fills. About 10 bits per item with 7 hashes gives roughly a 1 percent false-positive rate.",
      },
      {
        title: "Skip the disk",
        body: "Used to skip SSTables (LSM stores), check usernames before a query, or avoid a CDN origin fetch for definitely-missing keys.",
      },
    ],
    tradeoffs: [
      { pro: "Constant, tiny memory to represent a huge set; inserts and queries are O(k)", con: "False positives mean you still check the source occasionally" },
      { pro: "No false negatives, so it is safe as a pre-filter", con: "You cannot delete an item without a counting variant" },
    ],
    cloud: [
      { provider: "AWS", service: "DynamoDB / ElastiCache", note: "Used internally to avoid disk reads; RedisBloom module for apps" },
      { provider: "GCP", service: "Bigtable", note: "Bloom filters per SSTable cut disk lookups" },
      { provider: "Azure", service: "Azure Cache for Redis", note: "RedisBloom for counting filters" },
    ],
    params: [
      { id: "bitsPerKey", label: "Bits per key", kind: "range", min: 4, max: 16, step: 1, default: 10 },
      { id: "hashes", label: "Hash functions", kind: "range", min: 1, max: 12, step: 1, default: 7 },
      { id: "inserted", label: "Items inserted", kind: "range", min: 100, max: 5000, step: 100, default: 2000 },
    ],
  },
  {
    slug: "consensus-and-quorums",
    title: "Consensus & quorums",
    tagline: "How a set of unreliable machines agrees on a single truth — even when some are down.",
    category: "Distributed",
    idea:
      "Consensus is how a cluster of machines agrees on one value despite crashes and lost messages. A majority quorum is the heart of it: any two majorities overlap, so the newest leader always inherits every committed decision.",
    howItWorks: [
      {
        title: "Leader election",
        body: "If a follower hears nothing from the leader before a randomized timeout, it becomes a candidate and asks for votes. Randomized timeouts make split votes rare.",
      },
      {
        title: "Replicate the log",
        body: "The leader appends each write to its log and asks followers to do the same. A write commits once a majority has acknowledged it.",
      },
      {
        title: "Overlapping majorities",
        body: "With 2f+1 nodes you tolerate f failures. Because any two majorities share at least one node, a new leader cannot miss a committed entry.",
      },
      {
        title: "Linearizable reads",
        body: "A leader can serve a consistent read by confirming it still holds a majority, or by committing a no-op entry and reading behind it.",
      },
    ],
    tradeoffs: [
      { pro: "Gives a single, agreed-upon value with defined failure tolerance", con: "Every write pays a majority round trip, so it is slower than eventual consistency" },
      { pro: "Malformed or partitioned nodes cannot corrupt committed state", con: "Losing quorum makes the system read-only until a majority returns" },
    ],
    cloud: [
      { provider: "AWS", service: "Aurora / DynamoDB", note: "Quorum-based storage and Paxos-style leader election" },
      { provider: "GCP", service: "Spanner", note: "Paxos groups per split with TrueTime ordering" },
      { provider: "Azure", service: "Cosmos DB", note: "Configurable consistency levels backed by quorum replication" },
    ],
    params: [
      { id: "nodes", label: "Cluster nodes", kind: "range", min: 3, max: 9, step: 2, default: 5 },
      { id: "failures", label: "Simulated failures", kind: "range", min: 0, max: 3, step: 1, default: 1 },
    ],
  },
  {
    slug: "client-server",
    title: "Client–server request lifecycle",
    tagline: "Follow one request from a tap on a screen to a byte landing in a database and back.",
    category: "Fundamentals",
    idea:
      "Every system you will ever design is, at heart, a client asking a server for something. The whole discipline is deciding how that request travels, who is allowed to serve it, how long it may take, and what happens when any hop fails.",
    howItWorks: [
      {
        title: "Resolve the name",
        body: "The client turns a hostname into an address through DNS. That lookup is itself a distributed system with caches at every layer, and it can fail or return a stale answer.",
      },
      {
        title: "Open a connection",
        body: "TCP (or QUIC) handshakes establish a reliable channel. TLS adds the certificate exchange that proves the server's identity. Connection setup is latency you pay before any work happens.",
      },
      {
        title: "The server decides",
        body: "A load balancer or gateway picks a healthy backend. The backend runs the handler, talks to databases and caches, and produces a response — or a timeout, which is a valid design outcome, not a bug.",
      },
      {
        title: "Render and repeat",
        body: "The client parses the response and paints. The round trip you just measured (DNS + connect + queue + compute + serialise) is the number every optimisation is trying to shrink.",
      },
    ],
    tradeoffs: [
      { pro: "One mental model scales from a laptop demo to a global platform", con: "It hides a dozen failure points that only surface under real traffic" },
      { pro: "Clear separation of who initiates and who owns data", con: "Every hop adds latency and a new place a request can be dropped" },
    ],
    cloud: [
      { provider: "AWS", service: "Route 53 + CloudFront + ALB", note: "Name resolution, edge termination, and L7 balancing as separate layers" },
      { provider: "Cloudflare", service: "DNS + CDN + Workers", note: "The whole first half of the path can run at the edge" },
      { provider: "GCP", service: "Cloud DNS + Cloud Load Balancing", note: "Global anycast means the nearest POP answers first" },
    ],
    params: [],
  },
  {
    slug: "latency-numbers",
    title: "Latency numbers every engineer should know",
    tagline: "The orders of magnitude that decide your architecture before you write a line of code.",
    category: "Fundamentals",
    idea:
      "Performance intuition is mostly memory of a few numbers. A cache read is a hundred times faster than an SSD read, which is thousands of times faster than a cross-continent round trip. Know the ratios and the design choices make themselves.",
    howItWorks: [
      {
        title: "Inside one machine",
        body: "L1 cache is roughly a nanosecond, main memory around 100 ns, an SSD read about 100 microseconds, and a spinning-disk seek around 10 milliseconds — an eternity by comparison.",
      },
      {
        title: "Across the network",
        body: "A same-datacentre round trip is ~0.5 ms, same-continent ~30 ms, and cross-continent ~150 ms. Light in fibre takes ~67 ms to cross the Atlantic one way; physics sets the floor.",
      },
      {
        title: "The multiplying factor",
        body: "Because these differ by orders of magnitude, the goal is usually to replace a slow hop with a fast one — serve from memory, keep data near the user, batch instead of looping.",
      },
      {
        title: "Budget backwards",
        body: "Start from the user's expectation (say 200 ms to first paint) and subtract each hop. What is left is your compute and query budget, and it is almost always smaller than you think.",
      },
    ],
    tradeoffs: [
      { pro: "Lets you estimate feasibility and cost in your head, on the spot", con: "Real numbers vary with hardware, contention, and load — treat them as tiers, not truths" },
      { pro: "Explains instantly why a cache or a CDN is worth the complexity", con: "Over-optimising a hop that was never the bottleneck wastes effort" },
    ],
    cloud: [
      { provider: "AWS", service: "ElastiCache / CloudFront", note: "Push hot reads into microseconds and bytes to the edge" },
      { provider: "GCP", service: "Memorystore / Cloud CDN", note: "Same two moves: memory for hot data, edge for distance" },
      { provider: "Azure", service: "Azure Cache for Redis / Front Door", note: "Managed cache plus a global entry point" },
    ],
    params: [],
  },
  {
    slug: "vertical-vs-horizontal-scaling",
    title: "Vertical vs horizontal scaling",
    tagline: "Make the box bigger, or add more boxes — each buys a different kind of headroom.",
    category: "Fundamentals",
    idea:
      "Vertical scaling means buying a larger machine; horizontal scaling means running more of them. Vertical is simpler and works until the biggest machine is not enough; horizontal is unlimited in principle but forces you to distribute state.",
    howItWorks: [
      {
        title: "Scale up",
        body: "Swap in more vCPU, RAM, or a faster disk. No code change, no distributed-systems tax — but there is a ceiling, prices rise super-linearly, and a single machine is still a single point of failure.",
      },
      {
        title: "Scale out",
        body: "Run N copies behind a load balancer. Capacity grows almost linearly and failures are survivable, provided every copy is interchangeable.",
      },
      {
        title: "The catch: state",
        body: "Stateless services scale out trivially. Anything holding session or data state must be externalised (cache, database) or partitioned, which is where most of the complexity lives.",
      },
      {
        title: "Do both, in order",
        body: "The usual path is to scale up first for instant relief, then scale out as you hit the ceiling — and to keep the stateful tier deliberately small and boring.",
      },
    ],
    tradeoffs: [
      { pro: "Vertical needs no code change and no coordination", con: "Hard ceiling, rising cost, and still one machine to lose" },
      { pro: "Horizontal gives near-limitless capacity and fault tolerance", con: "Forces you to make services stateless and data partitionable" },
    ],
    cloud: [
      { provider: "AWS", service: "EC2 instance types vs Auto Scaling groups", note: "Up-size an instance or add instances; the latter pairs with ELB" },
      { provider: "GCP", service: "Machine families vs Managed Instance Groups", note: "Autoscaling groups add capacity automatically under load" },
      { provider: "Azure", service: "VM sizes vs Virtual Machine Scale Sets", note: "Scale sets give you identical, replaceable members" },
    ],
    params: [],
  },
  {
    slug: "stateless-vs-stateful",
    title: "Stateless vs stateful services",
    tagline: "The single property that decides whether your service can be scaled, deployed, and replaced freely.",
    category: "Fundamentals",
    idea:
      "A stateless service keeps nothing between requests; any replica can serve any request. A stateful service remembers something locally, so requests must find the right replica. Almost all scaling pain comes from accidental state.",
    howItWorks: [
      {
        title: "Where state hides",
        body: "In-memory sessions, local file uploads, sticky routing, scheduled job locks, and long-lived websockets are all state. Each one pins a client to a machine.",
      },
      {
        title: "Externalise it",
        body: "Move sessions to Redis, files to object storage, and locks to a coordination service. Now every replica is interchangeable and can be killed at will.",
      },
      {
        title: "Own it on purpose",
        body: "Some state is irreducible: a database leader, a Kafka partition, a game server holding the match. Those get explicit ownership, replication, and failover.",
      },
      {
        title: "Deploy like cattle",
        body: "Stateless tiers can be rolled, restarted, and scaled with no coordination. Stateful tiers need leader election and careful, ordered handovers.",
      },
    ],
    tradeoffs: [
      { pro: "Stateless tiers scale, deploy, and recover with almost no coordination", con: "Every request pays to fetch state from an external store" },
      { pro: "Stateful tiers can be dramatically faster and simpler to reason about", con: "They need replication and failover, and are hard to resize" },
    ],
    cloud: [
      { provider: "AWS", service: "Lambda / ECS Fargate vs RDS", note: "Serverless compute is stateless by construction; RDS is where state lives" },
      { provider: "GCP", service: "Cloud Run vs Cloud SQL", note: "Cloud Run scales to zero, which only works if it holds no state" },
      { provider: "Azure", service: "Container Apps vs Azure SQL", note: "Same split: ephemeral compute in front of durable state" },
    ],
    params: [],
  },
  {
    slug: "availability-nines",
    title: "Availability and the nines",
    tagline: "What 99.9% actually costs you in downtime — and how reliability is bought.",
    category: "Reliability",
    idea:
      "Availability is the fraction of time a service answers correctly. Each additional nine roughly multiplies both the engineering effort and the cost, so you target the level the business actually needs, not the highest one.",
    howItWorks: [
      {
        title: "Count the downtime",
        body: "99% allows ~3.65 days a year, 99.9% ~8.8 hours, 99.99% ~52 minutes, and 99.999% about 5 minutes. The jump from four nines to five is brutal.",
      },
      {
        title: "Buy redundancy",
        body: "Remove single points of failure: multiple replicas, multiple availability zones, health-checked load balancers. Redundant components fail, but the service does not.",
      },
      {
        title: "Limit the blast radius",
        body: "Bulkheads, circuit breakers, and cell-based architecture keep one bad dependency or one hot tenant from taking the whole system down with it.",
      },
      {
        title: "Measure honestly",
        body: "Define SLIs the user feels (success rate, latency), set an SLO below the theoretical maximum, and spend the error budget deliberately on shipping.",
      },
    ],
    tradeoffs: [
      { pro: "Each nine makes failures survivable and incidents boring", con: "Cost and complexity climb faster than the nine does" },
      { pro: "An SLO with an error budget stops reliability and delivery fighting", con: "Requires real measurement; a made-up number helps no one" },
    ],
    cloud: [
      { provider: "AWS", service: "Multi-AZ RDS + Route 53 health checks", note: "Survive an AZ loss and steer around unhealthy regions" },
      { provider: "GCP", service: "Regional Managed Instance Groups", note: "Spread replicas across zones automatically" },
      { provider: "Azure", service: "Availability Zones + Traffic Manager", note: "Zone-redundant services plus global failover routing" },
    ],
    params: [],
  },
  {
    slug: "idempotency",
    title: "Idempotency and safe retries",
    tagline: "Retries are unavoidable — make sure doing something twice is the same as doing it once.",
    category: "Reliability",
    idea:
      "Networks drop responses, so a client that times out cannot know whether its write landed. An idempotent operation produces the same result whether it runs once or five times, which is what makes retrying safe.",
    howItWorks: [
      {
        title: "Free idempotency",
        body: "Reads and 'set to this value' writes are naturally idempotent. 'Add 1' and 'append' are not, because repeating them changes the outcome.",
      },
      {
        title: "Idempotency keys",
        body: "The client sends a unique key with each logical write. The server records the key and its result; a replay returns the stored result instead of charging or creating again.",
      },
      {
        title: "Make operations commutative",
        body: "Where a key is awkward, express the write as a state assignment or attach a version, so a late or duplicated message cannot corrupt the final value.",
      },
      {
        title: "Design for at-least-once",
        body: "Assume every queue and network delivers at least once, and pair that with idempotent handlers. Exactly-once is a property you build, not one you buy.",
      },
    ],
    tradeoffs: [
      { pro: "Turns an unreliable network into a reliable API surface", con: "Requires storing keys and results, and a sensible expiry policy" },
      { pro: "Makes retries, replays, and message redelivery harmless", con: "Only works if every write path is designed for it consistently" },
    ],
    cloud: [
      { provider: "AWS", service: "SQS FIFO + Lambda", note: "Deduplication IDs suppress duplicate sends within a window" },
      { provider: "Azure", service: "Service Bus", note: "Built-in duplicate detection on message IDs" },
      { provider: "GCP", service: "Pub/Sub", note: "Exactly-once delivery is opt-in per subscription; still keep handlers idempotent" },
    ],
    params: [],
  },
  {
    slug: "backpressure",
    title: "Backpressure and load shedding",
    tagline: "When demand exceeds capacity, choose what to drop on purpose instead of collapsing.",
    category: "Reliability",
    idea:
      "If requests arrive faster than a service can finish them, unbounded queuing turns a slowdown into an outage. Backpressure slows the producer; load shedding rejects excess; both protect the capacity you still have.",
    howItWorks: [
      {
        title: "Bounded queues",
        body: "A queue with no limit just moves the failure later and deeper. A bounded queue makes overload visible immediately, while the system is still healthy enough to react.",
      },
      {
        title: "Slow the producer",
        body: "Backpressure pushes the signal upstream: stop reading, return a busy signal, or apply TCP flow control so the sender naturally slows to match.",
      },
      {
        title: "Shed the right requests",
        body: "When dropping is unavoidable, drop cheapest-to-retry first, keep the paying or interactive traffic, and shed by priority, not arrival order.",
      },
      {
        title: "Keep latency honest",
        body: "Fast failures are kinder than slow timeouts. A quick 503 lets the client retry elsewhere; a 30-second hang ties up capacity and cascades.",
      },
    ],
    tradeoffs: [
      { pro: "Keeps the system responsive under overload instead of melting down", con: "Some users get rejected; the craft is choosing which" },
      { pro: "Bounded buffers give a clear, early overload signal", con: "Too-small buffers waste capacity and reject bursts that were survivable" },
    ],
    cloud: [
      { provider: "AWS", service: "API Gateway throttling + SQS", note: "Token-bucket limits in front, bounded queues behind" },
      { provider: "Cloudflare", service: "Rate limiting + Waiting Room", note: "Queue users at the edge before they reach origin" },
      { provider: "GCP", service: "Cloud Endpoints quotas + Pub/Sub", note: "Per-key quotas and a flow-controlled pull" },
    ],
    params: [],
  },
  {
    slug: "acid-vs-base",
    title: "ACID vs BASE",
    tagline: "Strong guarantees or high availability — the trade you make every time you pick a datastore.",
    category: "Data",
    idea:
      "ACID databases give you transactions that are atomic, consistent, isolated, and durable. BASE systems give up immediate consistency for availability and scale, settling for eventual agreement. Neither is better; they fit different problems.",
    howItWorks: [
      {
        title: "Atomic and durable",
        body: "ACID means a transaction either fully applies or not at all, and once committed survives a crash. This is what money, inventory, and bookings require.",
      },
      {
        title: "Isolated",
        body: "Concurrent transactions behave as if run in some serial order. Strong isolation prevents the anomalies (dirty reads, lost updates) that quietly corrupt data.",
      },
      {
        title: "Basically available",
        body: "BASE stores prefer to keep answering under partition, reconcile conflicts afterwards, and accept that a read may briefly return stale data.",
      },
      {
        title: "Pick per workload",
        body: "Most real systems are polyglot: a strongly-consistent store for the ledger, an eventually-consistent store for feeds, likes, and telemetry.",
      },
    ],
    tradeoffs: [
      { pro: "ACID removes whole classes of correctness bugs", con: "Distributed ACID costs coordination, so writes are slower and harder to scale" },
      { pro: "BASE scales out cheaply and stays available through partitions", con: "Application code must tolerate and resolve staleness and conflicts" },
    ],
    cloud: [
      { provider: "AWS", service: "Aurora (ACID) vs DynamoDB (BASE)", note: "Choose per table by what a stale read would cost" },
      { provider: "GCP", service: "Spanner (ACID) vs Firestore (BASE)", note: "Spanner buys global consistency with TrueTime waits" },
      { provider: "Azure", service: "SQL Database vs Cosmos DB", note: "Cosmos exposes five consistency levels you can tune per request" },
    ],
    params: [],
  },
  {
    slug: "api-styles",
    title: "REST, gRPC, and GraphQL",
    tagline: "Three ways to expose a service — and the traffic pattern each one is built for.",
    category: "Networking",
    idea:
      "The interface style decides how much the client must know, how chatty the wire is, and how easily you evolve it. REST is resource-oriented and cacheable, gRPC is typed and fast between services, GraphQL is a query language for screens that need many things at once.",
    howItWorks: [
      {
        title: "REST",
        body: "Model resources, use HTTP verbs, and lean on status codes and caching. It is universally understood, cache-friendly, and ideal for public CRUD APIs.",
      },
      {
        title: "gRPC",
        body: "Define a protobuf contract and get typed stubs and streaming. Binary framing and HTTP/2 make it compact and fast, which is why it dominates service-to-service calls.",
      },
      {
        title: "GraphQL",
        body: "Clients ask for exactly the fields they need in one round trip. Great for aggregating many sources behind a mobile screen; the server must guard against expensive queries.",
      },
      {
        title: "Match the caller",
        body: "Public and cacheable: REST. Internal and latency-sensitive: gRPC. Screen-shaped and aggregation-heavy: GraphQL — often behind a BFF rather than exposed directly.",
      },
    ],
    tradeoffs: [
      { pro: "REST is simple, cacheable, and needs no special tooling", con: "Over- and under-fetching; many round trips for a rich screen" },
      { pro: "gRPC is fast, typed, and streams natively", con: "Binary payloads are hard to inspect; poor fit for browsers without a proxy" },
      { pro: "GraphQL gives clients exactly the data they ask for", con: "Query cost is unbounded unless you add depth limits and persisted queries" },
    ],
    cloud: [
      { provider: "AWS", service: "API Gateway (REST/HTTP) + AppSync (GraphQL)", note: "Both styles managed, with HTTP/2 and streaming support" },
      { provider: "GCP", service: "Cloud Endpoints + API Gateway", note: "OpenAPI and gRPC transcoding in one front door" },
      { provider: "Cloudflare", service: "Workers + GraphQL gateway", note: "Aggregate and shape responses at the edge" },
    ],
    params: [],
  },
  {
    slug: "replication-basics",
    title: "Primary–replica replication",
    tagline: "Keep copies of your data so reads scale and a machine loss is not a data loss.",
    category: "Data",
    idea:
      "Replication writes the same data to more than one node. A primary takes writes and streams them to replicas, which serve reads and stand ready to take over. It is the most common way to scale reads and survive failure.",
    howItWorks: [
      {
        title: "Stream the log",
        body: "The primary records every change and ships it to replicas, which replay it. Asynchronous replicas lag; synchronous ones add write latency but lose nothing.",
      },
      {
        title: "Read from replicas",
        body: "Because replicas are read-only copies, you can fan reads out across many and scale read throughput far past a single machine.",
      },
      {
        title: "Expect replica lag",
        body: "An asynchronous replica can be milliseconds behind. A read straight after a write may miss it — the classic 'I saved it but it is gone' bug.",
      },
      {
        title: "Plan the failover",
        body: "Promoting a replica must pick the most up-to-date one and repoint clients. Without fencing, two primaries can accept writes and diverge.",
      },
    ],
    tradeoffs: [
      { pro: "Scales reads horizontally and gives a hot standby for failover", con: "Replica lag makes read-your-writes tricky to guarantee" },
      { pro: "Synchronous replicas guarantee no data loss on failover", con: "Every write waits for the slowest replica, raising latency" },
    ],
    cloud: [
      { provider: "AWS", service: "RDS read replicas + Aurora", note: "Managed streaming, promotion, and multi-AZ failover" },
      { provider: "GCP", service: "Cloud SQL read replicas", note: "Cross-region replicas for read locality and DR" },
      { provider: "Azure", service: "Azure SQL geo-replicas", note: "Readable secondaries with controlled failover groups" },
    ],
    params: [],
  },
];

export const TOPIC_MAP = new Map(TOPICS.map((topic) => [topic.slug, topic]));

export function getTopic(slug: string): Topic | undefined {
  return TOPIC_MAP.get(slug);
}

export const TOPIC_CATEGORIES: TopicCategory[] = [
  "Fundamentals",
  "Distributed",
  "Networking",
  "Data",
  "Reliability",
];

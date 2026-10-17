export type TopicKind =
  | "consistent-hashing"
  | "load-balancing"
  | "cache"
  | "rate-limit"
  | "sharding"
  | "cdn";

export type TopicCategory = "Distributed" | "Networking" | "Data" | "Reliability";

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
        body: "A hit returns in microseconds without touching the database. A miss pays both the lookup and the origin read.",
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
];

export const TOPIC_MAP = new Map(TOPICS.map((topic) => [topic.slug, topic]));

export function getTopic(slug: string): Topic | undefined {
  return TOPIC_MAP.get(slug);
}

export const TOPIC_CATEGORIES: TopicCategory[] = ["Distributed", "Networking", "Data", "Reliability"];

import type { GuidedLab } from "@/types/challenges";

/**
 * Guided Labs: 16 multi-stage system design labs with automated topology grading.
 * Each lab walks brief -> back-of-envelope -> topology -> API/data model -> review,
 * with concrete RPS/SLO/budget targets the canvas grader can verify.
 */

export const GUIDED_LABS: GuidedLab[] = [
  {
    id: "bitly-url-shortener",
    title: "URL Shortener (Bitly)",
    company: "Bitly",
    difficulty: "starter",
    estimatedMinutes: 60,
    briefMarkdown: "# Bitly: 100M URLs/month\n\nDesign a shortener handling **peak 2k writes/sec** (100M new links/mo, avg ~38/s), **20k redirects/sec** with 7-char base62 codes (62⁷ space ≈ 3.5×10¹²). Redirect p99 ≤ 100ms and the system must survive total cache loss without DB meltdown.\n\nThis lab grades three decisions end to end: **(1)** how codes are minted, **(2)** 301 vs 302 and its cache-control, **(3)** what the first second after the redirect cache dies looks like. Every stage ladders toward one of them.",
    targetRps: 22000,
    sloP99Ms: 100,
    budgetUsdPerHour: 12,
    stages: [
      {
        id: "bitly-s1",
        kind: "brief",
        title: "Scope the problem",
        instructionsMarkdown:
          "Write the requirements as commitments, not headings.\n\n**Functional:** shorten (custom aliases, bulk import, expiry, disable/kill), redirect, click analytics (async), per-owner throttling.\n\n**Non-functional:** redirect p99 ≤ 100ms; create ≤ 500ms; 99.9% availability; reads dominate 10:1 (20k vs 2k per second).\n\nThe scope test: 100M links/mo ≈ 38 writes/sec on average — the 2k/sec peak is roughly 50× that. Designs built for the mean die on the burst; say which numbers you're designing for and why.",
        hints: [
          "Separate the read path (redirect) from the write path (create) early — they scale for different reasons.",
          "Custom aliases need a race-free uniqueness story: a unique index plus retry, not app-side check-then-insert.",
          "Decide expiry/disabled links now: a killed phishing link must stop redirecting within minutes, which will constrain your caching decision in stage 4.",
        ],
        gradingRules: [],
      },
      {
        id: "bitly-s2",
        kind: "boe",
        title: "Back-of-envelope: show the arithmetic",
        instructionsMarkdown:
          "Every number below must come from arithmetic you can name — if you can't derive it, label it a guess out loud. That habit is the actual exam.\n\n| Quantity | Arithmetic | Result |\n| --- | --- | --- |\n| Avg write rate | 100M/mo ÷ 2.6M sec/mo | ≈ 38/s |\n| Peak write rate | given | 2k/s (~50× avg — size for it) |\n| Redirect rate | 10:1 read:write | ≈ 20k/s |\n| Rows in 5 years | 100M/mo × 60 | 6.0B |\n| Row storage | 6B × 500 B | ~3.0 TB |\n| Durable tier sized | indexes + metadata ≈ 3× raw | ~9–10 TB |\n| Code space, 7 chars | 62⁷ | ~3.5×10¹² (6B used ≈ 0.17% fill) |\n| Redirect egress | 20k/s × ~200 B | ~4 MB/s ≈ 32 Mbps |\n\nThen the estimate that decides everything — **the cache working set:**\n\nCaching the whole keyspace is nonsense: 6B keys × 500 B ≈ 3 TB of RAM. You cache **recency plus popularity** instead. Redirect traffic has a heavy tail — links minted in the last week plus the handful gone viral. Track real query logs, but plan on a working set of several million codes covering most of a day's unique reads: 5M codes × 500 B plus hash overhead ≈ **5–8 GB of Redis RAM** for a >90% hit rate.\n\nNow the meltdown arithmetic: 20k misses/sec × ~1.5 ms per flash point-lookup ≈ 30 worker-seconds of DB work per second — ~30–40 connections busy on redirect lookups alone, before duplicates pile on. Without in-flight deduplication, a thundering herd of repeated misses multiplies that tenfold, connection pools saturate, and latencies snowball. That collapse pattern — utilization pinned near 1.0 — is what actually takes sites down in the first second, not exhausted capacity.",
        hints: [
          "State every multiplier: 60 months, 500 B per row, log₂(62) ≈ 5.95 bits per character, ~200 B per redirect response.",
          "The cache decision is a working-set decision, not a keyspace fraction — log-guided, not Pareto-blind.",
          "Keep this arithmetic next to you for stage 5: the chaos drill grades whether you defended it.",
        ],
        gradingRules: [],
      },
      {
        id: "bitly-s3",
        kind: "topology",
        title: "Build the topology",
        instructionsMarkdown:
          "Place the tiers and draw the request paths.\n\n**Edge:** dns_load_balancer / cdn_edge for anycast locality and absorbed ambient repeats.\n**Front door:** api_gateway with rate_limiter — create-path quota per API key.\n**Core:** rest_service fleet split into two roles — fast redirectors (hot, read-only) and creators (mint + warm the cache).\n**Cache:** redis_cache, cache-aside, with single-flight on miss.\n**Durable:** postgres_db with a unique index on `code`.\n**Async:** kafka_stream for click events — analytics consumers aggregate rollups; nothing analytical rides the redirect path.\n\nEnable multi-AZ on every tier. Then run the simulation and confirm p99 and error rate land inside the SLO before you pass the stage.",
        hints: [
          "Cache-aside + single-flight: a miss for a hot code must trigger exactly one DB query no matter how many requests piled up behind it.",
          "Analytics is a fan-out, not a dependency — the 302 must not wait on a Kafka publish. Belt-and-suspenders: buffer-and-flush in the service, publish is the fast path only.",
          "Multi-AZ is not decoration: the whole point of stage 5 is that one AZ (or one cache fleet) can die without killing the other.",
        ],
        gradingRules: [
          { id: "bitly-g1", description: "Cache + durable DB + async analytics wired, all multi-AZ", requiredResourceIds: ["redis_cache", "postgres_db", "kafka_stream"], minNodeCount: 5, maxP99Ms: 100, maxErrorRate: null, maxCostPerHourUsd: null, requiresMultiAz: true, points: 25 },
          { id: "bitly-g1b", description: "Create path throttled and edge-resident", requiredResourceIds: ["api_gateway", "rate_limiter"], minNodeCount: 0, maxP99Ms: null, maxErrorRate: null, maxCostPerHourUsd: null, requiresMultiAz: false, points: 10 },
        ],
      },
      {
        id: "bitly-s4",
        kind: "api",
        title: "The redirect decision: 301 vs 302",
        instructionsMarkdown:
          "Sign the create contract, then make the redirect call.\n\n**POST /v1/shorten** — body `{url, alias?, expiresAt?}`, header `Idempotency-Key`; per-key quota (e.g. r = 5/s, burst 20), 429 + `Retry-After` on breach; database duplicate → `409` with the existing code (idempotent-ish honesty), not a silent second row.\n\n**The redirect choice — this is an analytics-budget decision first and a latency decision second:**\n\n| Choice | What you get | What it costs |\n| --- | --- | --- |\n| 301 + long browser cache | Later clicks never touch your servers — the user's own cache serves them | Your dashboards undercount clicks for the life of the URL; killing a phishing link becomes best-effort because browsers hold the mapping |\n| 302 + no-store | Every click is counted and killable | Origin absorbs the full 20k/s — p99 and DB relief hang entirely on your cache tier |\n| 302 + bounded public cache, e.g. `max-age=300–3600` | Ambient repeats absorbed at the edge; a counted sample still arrives; kill-links take ≤ one TTL, so expiry means something | Only slowly-aware analytics: repeat clicks inside the TTL window are absorbed (and undercounted) |\n\n308/307 preserve the HTTP method across redirects — matters for POST-heavy uses, irrelevant here: redirects are GETs.\n\nCommit: **default 302 with a configurable `Cache-Control: public, max-age=…`**, so customers can trade some analytics for control, and `410 Gone` for disabled links. Then defend your own number: which repeat-click loss percentage can this product tolerate? Say the sentence out loud.",
        hints: [
          "The kill-link requirement (stage 1) is what sets a TTL ceiling: unbounded cache lives and disablement timelines are the same argument.",
          "Browsers honor `max-age` for 302 — so the TTL buys origin relief at the edge, but the first wave of misses after a cache flush is still fully yours.",
        ],
        gradingRules: [],
      },
      {
        id: "bitly-cache-loss",
        kind: "chaos",
        title: "Chaos drill: lose the redirect cache",
        instructionsMarkdown:
          "Your Redis fleet just died mid-failover — zero hits. Prove the durable tier absorbs the miss storm instead of melting.\n\n**Do it:** from the canvas, tear out (or dependency-down) the redis_cache tier, re-run the simulation at 20k reads/sec, then re-run the checks below. You're allowed to add mitigation first — that's the exercise: single-flight coalescing at the service, a connection-pool guard reserving headroom for create-path writes, read-replica scale-out, adaptive TTLs as LRU re-warms.\n\n**What you're defending against (the stage-2 arithmetic again):** 20k misses/sec × ~1.5 ms ≈ 30 connection-seconds of DB work per second — survivable **only** if duplicates coalesce behind one in-flight query. Coalesce them and the DB sees ~(unique misses per tick) × 1.5 ms. Don't, and the herd multiplies utilization past 1.0, pools queue, and everything upstream times out.\n\nPassing this stage means: errors stay below the incident guardrail, p99 degrades without collapsing, and the tab you'd page first is the connection pool — not the cache. Write down what your design does at second 0, 30, and 300 of the outage.",
        hints: [
          "Second 0: in-flight dedup keeps the stampede single-file; second 30: LRU is warming, replica pool stretched; second 300: hit-rate climbing back, SLO restored.",
          "If your p99 explodes toward seconds, ask what queues: connection pool saturation hides as 'DB slow' — it usually isn't the disk.",
          "You may keep the cache node present but degraded — the grader checks latency and errors, not the tool you used to break it.",
        ],
        gradingRules: [
          { id: "bitly-cg1", description: "Redirect path still served from durable tier under cache loss", requiredResourceIds: ["postgres_db", "rest_service"], minNodeCount: 4, maxP99Ms: 400, maxErrorRate: 0.05, maxCostPerHourUsd: 12, requiresMultiAz: false, points: 25 },
        ],
      },
      {
        id: "bitly-s5",
        kind: "review",
        title: "Review: code allocation + the numbers you defend",
        instructionsMarkdown:
          "Defend the allocation choice with arithmetic, not vibes.\n\n- **Base62 counter with coordinated range leases** (e.g. 10k per lease): collision-free O(1) writes; at peak 2k/s that's ~17k lease grants/day — a genuinely trivial coordination load. State the dependency honestly: the lease service is now on the create critical path, so it needs its own HA story.\n- **Hash of the URL → base62, with collision retry:** no coordinator, but collision probability ≈ keyspace fill — at 6B/3.5×10¹² that's ~1 retry per 600 inserts at steady state. Also: the space is enumerable if hash inputs leak, and identical URLs collide permanently unless you append a nonce.\n- **Precomputed key pools (KGS style):** fastest create (look up, don't mint), but now you pool-ops unused keys, and the pool is a second stateful system to HA.\n\nThen the closing number-check — out loud, from memory: peak write rate, redirect rate, rows in 5 years, durable-tier TB, and Redis GB for a >90% hit rate. Finish with the failure mode you would page on first — and why (for the reference design: redirect-cache miss stampede hitting connection-pool saturation).",
        hints: [
          "Counter vs hash is a write-path decision, hot-tail cache sizing is a read-path decision — don't let the argument blur them.",
          "Collisions are self-healing (retry); the coordinator being down is not. Name the failure you can't retry out of.",
        ],
        gradingRules: [
          { id: "bitly-g2", description: "Final state inside budget and at the redirect SLO", requiredResourceIds: [], minNodeCount: 4, maxP99Ms: 100, maxErrorRate: 0.01, maxCostPerHourUsd: 12, requiresMultiAz: false, points: 20 },
        ],
      },
    ],
    solutionMarkdown: "# Reference: the gold-standard design\n\n## Edge tier\nAnycast DNS puts users on the nearest edge. The 302 is cached by browsers/ISPs only up to `max-age` (default 600s, per-customer override) — small enough that disablement holds, large enough that the edge eats ambient repeats. Redirect responses are a few hundred bytes, so the CDN here buys locality, not bandwidth relief.\n\n## Create path (≤ 500 ms)\n`api_gateway` (TLS, per-key quota r=5/s burst 20) → `rest_service` creators → **base62 counter with 10k range leases** (collision-free; ~17k grants/day at peak) → one durable insert into Postgres (unique index on `code` — custom aliases retry on conflict with the constraint as the arbiter) → cache warm-up insert → Kafka publish for the create event.\n\n## Redirect path (the 10:1 tier — p99 ≤ 100 ms)\n`rest_service` redirectors (hot, read-optimized) → **cache-aside Redis, single-flight on miss** (in-flight map: one DB lookup per unique in-flight key, all piled-up requests share the reply) → on miss, a Postgres point-lookup by `code` (~1–2 ms on flash) → 302 + `Location` + `Cache-Control: public, max-age=…`.\n\nWorking set: **several million-recent codes**, sized from query logs, ~5–8 GB of Redis RAM → >90% hit rate after warmup. Each added '9' of hit ratio buys ~10× origin relief — judge the tier by the origin-load curve, not by cache size (see `/reference/numbers`, Decisions).\n\n## Durable tier\nPostgres: `codes(code PK, url, owner_id, created_at, expires_at, disabled_at)`, monthly partitions by `created_at`. Writes go to a primary; one sync replica carries failover (< 30 s), and read replicas absorb redirect misses. 6.0B rows / ~3 TB raw / ~9–10 TB provisioned with indexes over 5 years.\n\n## Analytics tier\n`kafka_stream` receives click events (at-least-once, dedup by `(code, session hash, bucketed tick)` downstream); consumers aggregate 10-second rollups per link into the click warehouse. Nothing analytical blocks a redirect.\n\n## Chaos playbook — cache loss minute-by-minute\n- **Second 0:** single-flight coalescing converts the stampede into one query per unique key per tick; pool guard reserves ~20% of DB connections for create-path writes; read replicas absorb miss load.\n- **~30s:** LRU re-warming from the tail; p99 drifts up toward the 250–400ms guardrail; error rate stays under 5%.\n- **~300s:** hit rate climbs back past 70–90%; SLO restored. Alert on **pool utilization**, not cache emptiness — saturation hides as 'database slow'.\n- **The tab you page first: connection-pool saturation, not the cache.** Capacity was never the constraint; in-flight dedup was the survivor trait.\n\n## Cost ledger (~$11/hr, inside the $12 budget)\n| Tier | Nodes | ~$/h |\n| --- | --- | --- |\n| Gateway + rate limiter | 4 | 0.6 |\n| Creators | 4 | 0.8 |\n| Redirectors | 8 | 1.6 |\n| Redis fleet | 4 | 1.8 |\n| Postgres HA + replicas | 4 | 2.6 |\n| Kafka | 3 | 1.4 |\n| Observability | 1 | 0.4 |\n| Headroom / edges | — | ~1.8 |\n\n## Alternatives, defended\n| Design | Wins | Costs |\n| --- | --- | --- |\n| Counter + range leases | Collision-free O(1); uniform space | Lease service on the create critical path — needs HA like everything else |\n| Hash URL → base62, retry on collision | Stateless create | ~1 retry per 600 inserts at 6B keys; enumerable space; duplicate URLs need a nonce |\n| Precomputed key pool | Fastest create (no mint) | Pool itself is stateful; wasted keys; a second thing to fail |\n\n## What an interviewer probes next\nYour cache TTL vs kill-link promise; exactly-once analytics under retries; graceful degradation math when the cache fleet halves; and what re-sizes first if the month is 1B links instead of 100M — the keyspace, the lease cadence, the working set, or nothing.",
  },
  {
    id: "pastebin-service",
    title: "Pastebin & Expiring Shares",
    company: "Pastebin",
    difficulty: "starter",
    estimatedMinutes: 70,
    briefMarkdown:
      "# Pastebin: 10M pastes/month, most of them read once\n\nDesign a paste service with **peak 500 writes/sec** (10M pastes/mo is ~3.8/sec average, so the peak is roughly 130× the mean), **5k reads/sec**, a **10 MB** body cap, per-paste TTL expiry, and **burn-after-read** links. Read p99 ≤ 200ms, and the whole thing must stay inside a small budget.\n\nThis lab grades three decisions end to end: **(1)** where the bytes live and how a 10 MB body reaches them without crossing your app tier, **(2)** what actually makes a burn-after-read paste single-use under two concurrent readers — and under a retry, a crash, and a CDN, **(3)** what \"expired\" means operationally: a promise the read path enforces, or a cron you hope ran.\n\n**The trap:** every stage looks like a storage question. The grading question is a *semantics* question. A paste that is read twice, or an expired paste that is still served, is a breach, not a latency regression — and both bugs live in the gap between two stores.",
    targetRps: 5500,
    sloP99Ms: 200,
    budgetUsdPerHour: 8,
    stages: [
      {
        id: "paste-s1",
        kind: "brief",
        title: "Scope: three visibility classes, two promises",
        instructionsMarkdown:
          "Write the commitments first, then split the product by who is allowed to read it — because visibility decides caching, and caching decides whether your promises are enforceable.\n\n**Classes:**\n\n| Class | Who can read | May a cache serve it? | Default retention |\n| --- | --- | --- | --- |\n| public | anyone with the link | yes, edge-cached by URL + version | permanent until deleted |\n| unlisted | anyone with the secret URL | no shared caches; `private, no-store` | TTL, default 7 days |\n| burn-after-read | exactly one successful read | **never** — not a browser, not a CDN, not Redis | one read or TTL, whichever first |\n\nThat third column is the whole lab. A 302-style redirect cache, an ISP proxy, or a browser back-button cache can each turn a one-time link into a two-time link without your server being involved.\n\n**Functional:** create (anonymous and owned), read, delete, list my pastes, TTL override up to 30 days, burn-after-read, syntax highlighting as presentation only.\n\n**Non-functional:** read p99 ≤ 200ms; create finalized ≤ 1s; 99.9% availability; reads outnumber writes ~10:1 by request count (5k vs 500) — but not by bytes, which matters in stage 2.\n\n**Abuse is in scope, not a later feature:** anonymous upload at 10 MB × 500/sec is a file-hosting service for whoever finds it first. Decide now: per-IP and per-key create quotas, an async content scan before an anonymous paste is readable, and a quarantine state that is neither readable nor deleted.\n\n**Out of scope, said out loud:** collaboration, comments, and rich-text editing. Then commit to the sentence you will defend at the end: what \"burned\" means the moment your process dies mid-stream.",
        hints: [
          "Name the state a paste is in before its upload finishes: `pending`. If you skip that state, an abandoned upload is either a broken paste or an orphaned 10 MB blob.",
          "Scanning before readability is a product decision with a cost: an anonymous paste is not instantly shareable. Say which wait you accept.",
          "Write down what a retried GET of a burn-after-read link does. If your answer is 'probably 200 again', you have found the bug this lab grades.",
        ],
        gradingRules: [],
      },
      {
        id: "paste-s2",
        kind: "boe",
        title: "Back-of-envelope: bytes, rows, and the egress bill",
        instructionsMarkdown:
          "Show the arithmetic. The interesting result is not the storage number — it is that the two tiers scale for opposite reasons.\n\n| Quantity | Arithmetic | Result |\n| --- | --- | --- |\n| Avg write rate | 10M/mo ÷ 2.6M sec/mo | ≈ 3.8/s |\n| Peak write rate | given | 500/s (~130× the mean) |\n| Avg body | given | 50 KB (cap 10 MB) |\n| Raw bytes/month | 10M × 50 KB | 500 GB/mo |\n| Raw bytes/year | ×12 | ~6 TB/yr |\n| Steady state with TTL | ~70% of bytes under a 30-day TTL ≈ 1–2 months of traffic retained | ≈ 1.5–2 TB |\n| Metadata rows, 5 years | 10M × 60 | 600M |\n| Metadata bytes | 600M × ~400 B | ~240 GB raw, ~500 GB indexed |\n| Peak ingest, average body | 500/s × 50 KB | 25 MB/s |\n| Peak ingest, cap-sized bodies | 500/s × 10 MB | **5 GB/s** — why the cap and the quota matter |\n| Peak read egress | 5k/s × 50 KB | ~250 MB/s ≈ 2 Gbps |\n| Metadata cache | a few million recently-read rows × 400 B + overhead | ~2 GB of Redis |\n\n**Decision 1 — bodies are not rows.** 6 TB/yr inside Postgres means TOAST pages, a backup and restore path measured in terabytes, vacuum pressure on a table that is 99% cold bytes, and replication traffic that carries paste bodies to every replica. Object storage gives durability without app-side triple replication, and a range GET lets you stream a 10 MB body instead of buffering it. Metadata stays in Postgres because it is small, indexed, and transactional — which is exactly what burn-after-read needs (stage 4).\n\n**Decision 2 — the upload must not cross your app tier.** If 500 clients each push 1 MB/s through a REST node, you need ~500 MB/s of app bandwidth before any business logic runs. Instead: the app signs a short-lived presigned PUT, the client writes directly to the blob store, then calls finalize. Your peak write path costs one signature and one row update; the bytes never touch you.\n\n**The number to say out loud:** 250 MB/s of read egress is ~900 GB/hour, which at list-price object-storage egress is roughly $18/hour — more than double the compute budget before you rent a single server. The $8/hr budget here is *origin compute*; the real egress story is CDN caching for public pastes and a committed-rate contract for the rest. Pretending 2 Gbps is free is how these designs die in finance review, not engineering review.",
        hints: [
          "State every multiplier: 2.6M seconds per month, 30-day TTL, 400 B per metadata row, 60 months.",
          "Distinguish request ratio (10:1) from byte ratio — a 50 KB body makes the read path a bandwidth problem even though it is the lighter path by request count.",
          "The 5 GB/s cap-sized ingest case is the argument for presigned uploads; keep it for stage 3.",
        ],
        gradingRules: [],
      },
      {
        id: "paste-s3",
        kind: "topology",
        title: "Build the topology",
        instructionsMarkdown:
          "Place the tiers and draw both paths — create and read — separately.\n\n**Edge:** `dns_load_balancer`, plus `cdn_edge` for the public class only. Public bodies are cached by immutable versioned URL; unlisted and burn-after-read pastes must be routed to origin with `Cache-Control: private, no-store`.\n**Front door:** `api_gateway` with a `rate_limiter` — create quota per IP and per key, because create is the expensive verb (10 MB and a scan).\n**Core:** `rest_service` fleet. It signs uploads, finalizes them, serves metadata, and streams reads. It must never proxy a body: reads stream from `blob_storage` to the client, not through a second hop.\n**Metadata:** `postgres_db` (multi-AZ primary plus a read replica) as the arbiter of state: `pending → ready → burned | expired | quarantined`.\n**Cache:** `redis_cache` for hot ready metadata only. Burn and quarantine states are never cached as readable.\n**Bodies:** `blob_storage`, keyed by an opaque object key the metadata row owns. Encryption at rest with a per-paste key so deletion can be a key revocation.\n**Async:** `background_worker` for the expiry sweeper, the blob GC for orphaned `pending` uploads, and the content scanner. `message_queue` feeds them so a scanner outage backs up a queue instead of blocking the read path.\n\nEnable multi-AZ on the metadata tier; a single-AZ Postgres makes stage 5 unwinnable. Then run the simulation and confirm p99 and error rate sit inside the SLO before you pass the stage.",
        hints: [
          "Two arrows matter: client → blob store (presigned PUT) and client → blob store (range GET). If either passes through `rest_service`, your bandwidth bill is structural.",
          "The worker is not optional plumbing — expiry *and* orphan GC are correctness features. An expired row with a live blob is a broken promise even if nobody can see the bytes.",
          "Cache ready metadata, never cache the state transition. A cached `ready` row after a burn is exactly the double-read bug.",
        ],
        gradingRules: [
          { id: "paste-g1", description: "Bodies in blob storage, metadata in Postgres, cache and sweeper wired", requiredResourceIds: ["blob_storage", "postgres_db", "redis_cache", "background_worker"], minNodeCount: 5, maxP99Ms: 200, maxErrorRate: null, maxCostPerHourUsd: null, requiresMultiAz: true, points: 30 },
          { id: "paste-g1b", description: "Create path throttled and uploads signed at the edge", requiredResourceIds: ["api_gateway", "rate_limiter", "rest_service"], minNodeCount: 0, maxP99Ms: null, maxErrorRate: null, maxCostPerHourUsd: null, requiresMultiAz: false, points: 10 },
        ],
      },
      {
        id: "paste-s4",
        kind: "api",
        title: "The burn-after-read contract: one winner, no caches",
        instructionsMarkdown:
          "Sign the create contract, then make the read path enforce single use.\n\n**Create, two-phase:**\n\n- `POST /v1/pastes` — `{sizeBytes, ttlSeconds?, visibility, burnAfterRead}` → `201 {id, uploadUrl, expiresAt}`. Validate `sizeBytes ≤ 10 MB` and sign the presigned PUT for exactly that size and content type (a 15-minute expiry; one key per attempt). Insert the row as `pending`.\n- `PUT uploadUrl` — client writes bytes directly to the blob store.\n- `POST /v1/pastes/{id}/complete` — marks `ready`, runs the scan gate, returns the share URL. Repeat calls are idempotent: the second one returns `200`, not a second scan.\n\n**Read:** `GET /v1/pastes/{id}` → streamed body; `404` for unknown ids; `410 Gone` for expired or burned, which is honest (\"this existed, it is not here now\") rather than pretending it never existed.\n\n**The decision — how do two concurrent readers get exactly one body?**\n\n| Approach | What happens under a race | Verdict |\n| --- | --- | --- |\n| Read row, then delete row | Both readers see `ready`; both stream the body; two winners | Broken — this is the bug the lab names |\n| Cache the body in Redis, `GETDEL` on read | Atomic and fast, one winner | Works only if that is the *only* copy — any CDN, browser, or worker cache in front re-serves it |\n| `UPDATE … SET state='burned' WHERE id=$1 AND state='ready' RETURNING body_key` | Exactly one statement transitions the row; one winner, the loser gets 0 rows → `410` | **The arbiter.** The database is the point of truth, so the promise survives a cache miss, a shard failover, and a retry |\n\nTake the third row and then pay its price honestly: the winning request now streams the body from blob storage *after* the row is already `burned`. If that process dies mid-stream, the paste is gone and the client re-uploads — **fail closed, not reopen**. Say that sentence out loud; the alternative (mark burned only after a successful full transfer) reopens the double-read window under retries. The blob itself is deleted asynchronously by the worker, and a per-paste encryption key lets you revoke readability immediately even before the bytes are gone.\n\n**Expiry, not as an afterthought:** the read path checks `expires_at` on every read (one indexed comparison) and returns `410` even if the row is still present. The sweeper is then a storage-hygiene job, not the enforcement mechanism — because a sweeper that dies silently must not extend anyone's retention.\n\nFinish with the throttle table: create quota per IP (e.g. 10/hour anonymous), per key (e.g. 60/hour), `429` with `Retry-After`, and the scan gate's timeout behaviour — on timeout, hold the paste in `quarantined`, never publish it unread.",
        hints: [
          "`DELETE … RETURNING` also works as the claim; the point is one atomic compare-and-set, not a read followed by a write.",
          "If you cache a burn-after-read body, you must invalidate it in every tier on the same tick — that is three distributed deletes for a promise one SQL statement can keep.",
          "An idempotency key on create stops a client retry from minting two pastes and paying for two scans.",
        ],
        gradingRules: [],
      },
      {
        id: "paste-s5",
        kind: "chaos",
        title: "Chaos drill: metadata cache loss at peak",
        instructionsMarkdown:
          "Your Redis tier just failed over empty. Every hot paste now reads Postgres directly, at 5k reads/sec, while the burn path keeps claiming rows.\n\n**Do it:** tear out (or dependency-down) the `redis_cache`, re-run the simulation at 5k reads/sec, then re-run the checks. Mitigation is allowed and expected: single-flight coalescing on metadata misses, a connection-pool guard that reserves headroom for the burn claim, and a read replica to absorb the lookups.\n\n**The arithmetic you already did:** 5k misses/sec × ~2 ms per indexed point-lookup ≈ 10 connection-seconds of Postgres work per second. With a 40-connection pool that is ~25% utilization — survivable, *if* duplicates coalesce. Without in-flight dedup, a popular public paste hit 1,000 times/sec becomes 1,000 identical queries: the pool saturates, the burn claim queues behind lookups, and one-time links start timing out *before* anyone reads them.\n\n**What must not happen during the outage:** no fallback that serves a cached or replica-stale `ready` row for a burned paste, and no fallback that silently treats an expired paste as live. Degrade latency, never semantics. Burn claims run on the primary only; read replicas may serve `ready` metadata, never the state transition.\n\nPassing means: errors stay under the incident guardrail, p99 degrades without collapsing, expired and burned links still answer `410`, and the first page you open is connection-pool utilization — not the cache. Write down what your design does at second 0, 30, and 300.",
        hints: [
          "Second 0: dedup keeps the stampede single-file and the burn claim keeps its reserved connections; second 30: LRU rewarms, p99 drifts to 300–500ms; second 300: hit rate back above 80%.",
          "A replica is for reads only. Routing the claim to a replica is how a paste gets read twice.",
          "The blob path is untouched by this drill — if your read latency collapses, the bottleneck you built was the extra proxy hop, not the cache.",
        ],
        gradingRules: [
          { id: "paste-cg1", description: "Read path holds without the cache, and state checks stay on the primary", requiredResourceIds: ["postgres_db", "blob_storage", "rest_service"], minNodeCount: 4, maxP99Ms: 500, maxErrorRate: 0.05, maxCostPerHourUsd: 8, requiresMultiAz: false, points: 25 },
        ],
      },
      {
        id: "paste-s6",
        kind: "review",
        title: "Review: semantics you defend, numbers you remember",
        instructionsMarkdown:
          "Close by proving the promises, not the pictures.\n\n**1. The single-use proof.** State the exact statement that makes one reader win, what the loser receives, and what happens if the winner dies mid-stream. Then the adversarial cases: a client retry, a browser back-button, a shared cache, and a regional failover. For each, name the tier that enforces the promise — or admit there is none.\n\n**2. The expiry proof.** Two mechanisms must agree: lazy check on read (`410` even when the row exists) and the sweeper (storage hygiene). Explain why the sweeper alone is insufficient and why the lazy check alone is insufficient (storage grows unboundedly, and expired bytes stay readable to anyone with direct blob access).\n\n**3. The numbers, from memory:** average write rate, peak write rate, bytes/month, raw bytes/year, steady-state bytes with TTL, metadata rows over 5 years, metadata cache size, peak read egress. If you cannot reproduce one, say which and how you would measure it.\n\n**4. The cost ledger,** in a table, inside $8/hr for origin compute — and the honest note about egress being the real bill.\n\n**5. The 10× question:** at 10× traffic, what breaks first? For this design: read egress (public pastes must ride the CDN and unlisted reads need a committed-rate contract), then metadata write amplification from the sweeper (batch deletes, never one-per-row), then scanner throughput (queue depth becomes the publish latency).\n\nFinish with the failure you would page on first — for the reference design: a burn claim timing out because lookups filled the pool, i.e. a semantics outage disguised as a latency incident.",
        hints: [
          "The strongest answer to 'how do you know it is single-use?' is a statement, a state machine, and a failure mode — not a diagram.",
          "Name what you deliberately give up: a crashed mid-stream burn loses the paste; anonymous pastes wait for a scan; unlisted reads cannot be edge-cached.",
        ],
        gradingRules: [
          { id: "paste-g2", description: "Final state inside budget and at the read SLO", requiredResourceIds: [], minNodeCount: 4, maxP99Ms: 200, maxErrorRate: 0.02, maxCostPerHourUsd: 8, requiresMultiAz: false, points: 20 },
        ],
      },
    ],
    solutionMarkdown:
      "# Reference: bodies in blobs, state in Postgres\n\n## Shape\n`api_gateway` (per-IP and per-key create quotas) → `rest_service` (signs, finalizes, streams) → `blob_storage` for bodies with a per-paste data key → `postgres_db` multi-AZ primary plus read replica for the state machine → `redis_cache` for hot **ready** metadata only → `background_worker` for the expiry sweeper, orphan GC, and the scanner, fed by `message_queue`. `cdn_edge` fronts the public class by immutable versioned URL; unlisted and burn-after-read reads are origin-only with `Cache-Control: private, no-store`.\n\n## Envelope\n3.8 writes/sec average, 500/sec peak; 50 KB average body, 10 MB cap. 500 GB/month raw, ~6 TB/year, **~1.5–2 TB steady state** once TTLs churn the long tail. Metadata: **600M rows over 5 years, ~240 GB raw / ~500 GB indexed**, plus ~2 GB of Redis for a few million hot rows. Read egress at peak is **~250 MB/s ≈ 2 Gbps** — the number that makes egress the real constraint.\n\n## Create path (two-phase, bytes never cross the app tier)\n1. `POST /v1/pastes` validates the declared size, inserts `pending`, and returns a **presigned PUT** scoped to one object key, that exact size, and a 15-minute window. An `Idempotency-Key` header means a client retry returns the same paste.\n2. The client PUTs straight to the blob store. At 500/sec and 10 MB caps this is a 5 GB/s worst case that the app tier must never see.\n3. `POST /v1/pastes/{id}/complete` flips `pending → ready` (idempotent), enqueues the scan, and only publishes anonymously after the scan clears — otherwise `quarantined`.\n4. Abandoned `pending` rows are GC'd after an hour, together with their unreferenced object keys.\n\n## Read path (p99 ≤ 200 ms)\nMetadata from Redis on hit (~1ms), Postgres point-lookup (~2ms) on miss with single-flight, then a streamed range GET from the blob store (30–80ms for a 50 KB body). No proxy hop, no buffering.\n\n## Burn-after-read: the claim\n```sql\nUPDATE pastes SET state = 'burned', burned_at = now()\nWHERE id = $1 AND state = 'ready'\nRETURNING body_key, data_key_id;\n```\nExactly one concurrent reader gets a row; the loser gets zero rows and answers `410 Gone`. No shared cache ever holds a burn-after-read body, so there is no second copy to invalidate. The winner streams the bytes after the row is already burned: a crash mid-stream **loses the paste** rather than reopening it — fail closed. The object is deleted by the worker, and revoking the per-paste data key makes the bytes unreadable immediately, before GC catches up.\n\n## Expiry: enforce on read, sweep for storage\nEvery read compares `expires_at` against now using an indexed column and answers `410` even if the row survives. A five-minute sweeper deletes in batches (`LIMIT`, partition by `created_at`) and then GCs the blobs, so sweeper downtime grows storage, never retention. Lazy-only expiry would let expired bytes stay readable to anyone with direct store access.\n\n## Failure drills\n- **Cache loss at peak:** 5k misses/sec × 2ms ≈ 10 DB connection-seconds/sec; single-flight + a pool guard leaving room for claims keeps p99 under ~500ms and error rate under 5%. Burn claims stay on the primary; the replica serves only `ready` metadata.\n- **Scanner outage:** queue backs up; anonymous pastes stay `quarantined` and unreadable. Publish latency degrades, semantics do not.\n- **Worker outage:** expired rows remain but reads still `410`; storage grows until the sweeper returns. Orphaned `pending` uploads are visible as blob growth, not as public content.\n- **Region failover:** the primary is the arbiter; the claim is never served from a replica, so no paste is read twice across a failover.\n\n## Cost ledger (~$7.4/hr origin compute, inside the $8 budget)\n| Tier | Nodes | ~$/h |\n| --- | --- | --- |\n| Gateway + rate limiter | 3 | 0.4 |\n| REST + streamers | 6 | 1.0 |\n| Redis metadata | 3 | 1.1 |\n| Postgres HA + replica | 3 | 1.6 |\n| Blob storage (2 TB) + requests | — | 2.6 |\n| Workers + queue + scanner | 3 | 0.5 |\n| Observability | 1 | 0.2 |\n\nEgress is deliberately excluded and deliberately named: ~900 GB/hour of list-price egress is ~$18/hr, so public reads must ride the CDN and unlisted reads need a committed-rate contract. Say this before an interviewer asks.\n\n## Alternatives, defended\n| Design | Wins | Costs |\n| --- | --- | --- |\n| Bodies as Postgres rows/TOAST | One store, transactional | Terabyte backups, vacuum on cold bytes, bodies replicated to every replica |\n| Burn via Redis `GETDEL` only | Fastest single-use read | Any CDN, browser, or worker cache in front breaks the promise; only safe if it is the only copy |\n| Hourly cron as the only expiry | Simple to write | A missed run silently extends retention — a privacy bug, not a lag |\n\n## What an interviewer probes next\nWhether a shared cache can defeat burn-after-read; what happens if the winner crashes mid-stream (and why that is the right failure); how the sweeper and the read path disagree safely; how you would prove to an auditor that a specific paste was never read twice (state transition log with `burned_at` and the claim's transaction id); and what changes at 10× traffic — egress first, sweeper batching second, scanner throughput third.",
  },
  {
    id: "youtube-upload-playback",
    title: "YouTube Upload & Playback",
    company: "YouTube",
    difficulty: "advanced",
    estimatedMinutes: 90,
    briefMarkdown: "# YouTube: 500h uploaded/min\n\nDesign resumable upload, transcode DAG, CDN delivery, and feed ranking for 1M playback RPS with 300ms start-up SLO.",
    targetRps: 1000000,
    sloP99Ms: 300,
    budgetUsdPerHour: 900,
    stages: [
      { id: "yt-s1", kind: "brief", title: "Scope", instructionsMarkdown: "Cover upload, transcode ladder (1080p/720p/480p), thumbnails, views counting, and recommendations off critical path.", hints: ["Separate upload from playback paths."], gradingRules: [] },
      { id: "yt-s2", kind: "boe", title: "Back-of-envelope", instructionsMarkdown: "Compute ingest GB/s, transcode CPU-hours, and CDN egress PB/day.", hints: ["500h/min x 1 GB/h ~ 8 GB/s ingest."], gradingRules: [] },
      { id: "yt-s3", kind: "topology", title: "Topology", instructionsMarkdown: "Assemble CDN edge, blob storage, Kafka ingest, Flink transcode orchestrator, worker fleet, Postgres metadata, search cluster.", hints: ["Async transcode; serve progressive ladder."], gradingRules: [{ id: "yt-g1", description: "CDN + object store + stream + workers", requiredResourceIds: ["cdn_edge", "blob_storage", "kafka_stream", "background_worker"], minNodeCount: 6, maxP99Ms: null, maxErrorRate: null, maxCostPerHourUsd: null, requiresMultiAz: true, points: 30 }] },
      { id: "yt-s4", kind: "data_model", title: "Metadata model", instructionsMarkdown: "Design videos, renditions, and sharded views counters with rollups.", hints: ["Counter shards to avoid hot rows."], gradingRules: [] },
      { id: "yt-s5", kind: "review", title: "Review", instructionsMarkdown: "Defend ladder bitrates, cold-start catalog cost, and exactly-once view counting.", hints: ["HBV + AV1 ladder."], gradingRules: [{ id: "yt-g2", description: "SLO respected", requiredResourceIds: [], minNodeCount: 6, maxP99Ms: 400, maxErrorRate: 0.02, maxCostPerHourUsd: 900, requiresMultiAz: false, points: 20 }] },
    ],
    solutionMarkdown: "# Reference\n\nResumable upload -> S3 -> Kafka -> transcode workers -> multi-bitrate S3 + CDN. Metadata in sharded MySQL/Cassandra. Views via Kafka + Flink rollups. Start-up p99 ~250ms edge-cached.",
  },
  {
    id: "whatsapp-chat",
    title: "WhatsApp 1:1 & Groups",
    company: "WhatsApp",
    difficulty: "advanced",
    estimatedMinutes: 75,
    briefMarkdown: "# WhatsApp: 50B msgs/day\n\nDesign E2E-encrypted delivery with 60k msgs/sec avg, 500k peak, presence, receipts, and media offload. p99 delivery under 150ms.",
    targetRps: 500000,
    sloP99Ms: 150,
    budgetUsdPerHour: 600,
    stages: [
      { id: "wa-s1", kind: "brief", title: "Scope", instructionsMarkdown: "Define send/recv, receipts, presence staleness (30s), groups to 1024, and E2E envelope opaqueness.", hints: ["Server never sees plaintext."], gradingRules: [] },
      { id: "wa-s2", kind: "boe", title: "Back-of-envelope", instructionsMarkdown: "Compute 578k avg RPS equivalence, connection counts (50M concurrent), and media bytes.", hints: ["Connections dominate RAM: ~50 KB each."], gradingRules: [] },
      { id: "wa-s3", kind: "topology", title: "Topology", instructionsMarkdown: "Build gateway WebSocket tier, presence cache, Cassandra inbox, Kafka offline spool, blob media store.", hints: ["Connection tier separate from logic tier."], gradingRules: [{ id: "wa-g1", description: "Presence cache + wide-column + stream", requiredResourceIds: ["redis_cache", "cassandra_store", "kafka_stream"], minNodeCount: 5, maxP99Ms: null, maxErrorRate: null, maxCostPerHourUsd: null, requiresMultiAz: true, points: 30 }] },
      { id: "wa-s4", kind: "api", title: "Sync protocol", instructionsMarkdown: "Design WebSocket frames, ack/retry with dedup IDs, and fan-out for groups.", hints: ["At-least-once + client dedup."], gradingRules: [] },
      { id: "wa-s5", kind: "review", title: "Review", instructionsMarkdown: "Justify E2E trade-offs for search, abuse reporting, and multi-device sync.", hints: ["Hashed abuse reports."], gradingRules: [{ id: "wa-g2", description: "SLO/budget", requiredResourceIds: [], minNodeCount: 5, maxP99Ms: 200, maxErrorRate: 0.01, maxCostPerHourUsd: 600, requiresMultiAz: false, points: 20 }] },
    ],
    solutionMarkdown: "# Reference\n\nSticky connection nodes + Redis presence + Cassandra per-user inbox + Kafka offline replay + S3 media. Fan-out-on-write for groups under 200, fan-out-on-read beyond. p99 ~90ms.",
  },
  {
    id: "twitter-timeline",
    title: "X Timeline (Fan-out)",
    company: "X",
    difficulty: "standard",
    estimatedMinutes: 60,
    briefMarkdown: "# Timeline: 300k reads/sec, 5k writes/sec\n\nDesign home timeline with celebrity handling. p99 120ms, 99.9 percent availability.",
    targetRps: 305000,
    sloP99Ms: 120,
    budgetUsdPerHour: 220,
    stages: [
      { id: "tw-s1", kind: "brief", title: "Scope", instructionsMarkdown: "Define tweet, follow graph, timeline ranking, and celebrity threshold (1M followers).", hints: ["Two fan-out modes."], gradingRules: [] },
      { id: "tw-s2", kind: "boe", title: "Back-of-envelope", instructionsMarkdown: "Compute fan-out amplification: 5k writes x 500 avg followers = 2.5M timeline writes/sec naive.", hints: ["Hybrid fan-out cuts 90 percent."], gradingRules: [] },
      { id: "tw-s3", kind: "topology", title: "Topology", instructionsMarkdown: "Use REST service, Redis timeline cache, Cassandra tweets, Kafka fan-out, Flink ranker.", hints: ["Push for normal, pull for celebrities."], gradingRules: [{ id: "tw-g1", description: "Cache + wide-column + stream", requiredResourceIds: ["redis_cache", "cassandra_store", "kafka_stream"], minNodeCount: 5, maxP99Ms: null, maxErrorRate: null, maxCostPerHourUsd: null, requiresMultiAz: true, points: 30 }] },
      { id: "tw-s4", kind: "data_model", title: "Data model", instructionsMarkdown: "Model tweets_by_user, timeline_by_user, and follow edges with pagination cursors.", hints: ["TimeUUID clustering."], gradingRules: [] },
      { id: "tw-s5", kind: "review", title: "Review", instructionsMarkdown: "Defend hybrid fan-out and cache stampede guards during the World Cup final.", hints: ["Celebrity pull + single-flight."], gradingRules: [{ id: "tw-g2", description: "SLO/budget", requiredResourceIds: [], minNodeCount: 5, maxP99Ms: 150, maxErrorRate: 0.02, maxCostPerHourUsd: 220, requiresMultiAz: false, points: 20 }] },
    ],
    solutionMarkdown: "# Reference\n\nHybrid: push to Redis timelines for normal users, pull-merge celebrities at read. Kafka buffers fan-out. p99 ~80ms cached, cost ~$150/hr.",
  },
  {
    id: "instagram-feed",
    title: "Instagram Feed & Stories",
    company: "Meta",
    difficulty: "standard",
    estimatedMinutes: 60,
    briefMarkdown: "# Feed: 500M DAU, stories expire in 24h\n\nDesign media upload, feed ranking, and stories with 200k RPS and 150ms p99.",
    targetRps: 200000,
    sloP99Ms: 150,
    budgetUsdPerHour: 300,
    stages: [
      { id: "ig-s1", kind: "brief", title: "Scope", instructionsMarkdown: "Scope posts, stories TTL, reels short-video, and ranking signals.", hints: ["Stories are TTL-heavy."], gradingRules: [] },
      { id: "ig-s2", kind: "boe", title: "Back-of-envelope", instructionsMarkdown: "Estimate media GB/day and CDN egress for 500M DAU x 20 stories.", hints: ["Median photo 300 KB."], gradingRules: [] },
      { id: "ig-s3", kind: "topology", title: "Topology", instructionsMarkdown: "CDN + blob store + Redis feed cache + document store + stream processor for ranking features.", hints: ["Precompute top candidates async."], gradingRules: [{ id: "ig-g1", description: "CDN + blob + cache + doc store", requiredResourceIds: ["cdn_edge", "blob_storage", "redis_cache", "document_store"], minNodeCount: 5, maxP99Ms: null, maxErrorRate: null, maxCostPerHourUsd: null, requiresMultiAz: true, points: 30 }] },
      { id: "ig-s4", kind: "api", title: "Upload API", instructionsMarkdown: "Design resumable media upload, moderation hooks, and story expiry semantics.", hints: ["Signed upload URLs."], gradingRules: [] },
      { id: "ig-s5", kind: "review", title: "Review", instructionsMarkdown: "Explain ranking off critical path and stories GC.", hints: ["Feature store + TTL sweepers."], gradingRules: [{ id: "ig-g2", description: "SLO/budget", requiredResourceIds: [], minNodeCount: 5, maxP99Ms: 200, maxErrorRate: 0.02, maxCostPerHourUsd: 300, requiresMultiAz: false, points: 20 }] },
    ],
    solutionMarkdown: "# Reference\n\nDirect-to-S3 uploads, async moderation workers, Redis precomputed feeds, Cassandra stories with TTL. p99 ~110ms.",
  },
  {
    id: "bookmyshow-ticketing",
    title: "BookMyShow Seat Booking",
    company: "BookMyShow",
    difficulty: "standard",
    estimatedMinutes: 60,
    briefMarkdown: "# BookMyShow: a blockbuster opens bookings at 10:00\n\nOne ticketing platform opens the same release across ~3,000 screens: **~8,000 shows, ~1.6M seats** going on sale in the same minute. Baseline traffic is ~1k req/s; the on-sale spike is ~50× that, so design for **50k req/s of browsing and hold attempts** with **p99 ≤ 250 ms** and **zero double-booked seats**. An unpaid hold dies after **10 minutes**; a payment seen twice must never produce two tickets.\n\nThree decisions are actually graded, and every stage ladders toward one of them: **(1)** is a hold a lock or a lease, and where does its authority live; **(2)** what happens to 50k users who all want the same 200-seat show; **(3)** what the confirm path does when the payment provider is slow, down, or retries a webhook. The seat map is a correctness surface, not a UI detail — this lab is about losing a race you cannot retry out of.",
    targetRps: 50000,
    sloP99Ms: 250,
    budgetUsdPerHour: 60,
    stages: [
      {
        id: "bms-s1",
        kind: "brief",
        title: "Scope the on-sale, not the ticket page",
        instructionsMarkdown:
          "Write commitments, not feature headings.\n\n**Functional:** browse shows and seat maps, hold N adjacent seats, pay, confirm; auto-release on timeout; cancel/refund; seat-map layout versions; per-user and per-card purchase limits.\n\n**Non-functional:** seat-map read p99 ≤ 250 ms at 50k req/s; hold decision ≤ 300 ms; confirm is idempotent under webhook retries; 99.95% availability during the sale; **zero oversell**, including after a cache node dies.\n\n**The requirement that decides the design:** a hold is not a sale. A held seat is temporarily unavailable to everyone else and must become available again without human intervention. Write that sentence in your own words and say what breaks if holds never expire — inventory leaks, and a sold-out show has empty seats.\n\nAlso state the boundary you are *not* solving: seat-level pricing, food pre-orders, and recommendation ranking ride outside the hold/confirm path.",
        hints: [
          "Split the read path (seat map, heavy and cacheable) from the write path (hold/confirm, tiny and serialized). They scale for opposite reasons.",
          "Expiry is a feature, not cleanup: an abandoned payment must return the seat within a bounded time or the show sells out with holes in it.",
          "Decide the hold duration from the payment path, not from a round number — 10 minutes is a budget: ~8 minutes for the user plus provider callback, 2 minutes of buffer.",
        ],
        gradingRules: [],
      },
      {
        id: "bms-s2",
        kind: "boe",
        title: "Back-of-envelope: where the load actually is",
        instructionsMarkdown:
          "Every number must come from arithmetic you can name; label guesses as guesses.\n\n| Quantity | Arithmetic | Result |\n| --- | --- | --- |\n| Baseline traffic | given | ~1k req/s |\n| On-sale spike | 1k × 50 | 50k req/s |\n| Seat states per release | 8,000 shows × 200 seats | 1.6M |\n| Seat-map memory | 1.6M × ~200 B with overhead | ~320 MB (fits, but shard by venue) |\n| Active holds | 50k concurrent × 1 hold × ~150 B | ~7.5 MB — memory is not the problem |\n| Browse:write split | ~90% map reads / ~10% hold attempts | 45k reads/s vs 5k holds/s |\n| Hot-show contention | 10k watchers for 200 seats | 50:1 oversubscription |\n| Confirmed tickets/night | 1.6M sold, concentrated in first 20 min | ~1,300/s avg, ~4k/s peak |\n| Ledger growth | 1.6M rows/night × ~250 B | ~400 MB/night; partition + archive |\n| Payment provider ceiling | typically low-hundreds TPS per account | the real confirm bottleneck |\n\nThe two estimates that change the design:\n\n**Contention, not throughput.** 50k req/s sounds like a scaling problem, but the scarce resource is 200 seats in one show. If every watcher is allowed to attempt a hold, you convert a browse spike into a database race for the same 200 rows. Admission has to happen *before* the seat row is touched — a per-show gate, not a global one, because gating the whole platform on the hottest show starves every other screen.\n\n**Confirm rate is bounded by the payment provider, not by you.** 4k confirms/s at peak will not clear a provider that allows low-hundreds TPS. The queue is therefore on the confirm path: holds sit in `pending_payment` while a worker drains at the provider's actual rate. Size the hold TTL against that drain, or users will lose seats to your own backlog.",
        hints: [
          "Show the multiplier for every row: 50×, 90/10, 20 minutes = 1,200 s, 250 B/row.",
          "320 MB of seat state is one box; that is exactly why you shard it — blast radius, not capacity.",
          "Keep the 50:1 contention number next to you for stage 3: the topology must make most of those 10k watchers cheap.",
        ],
        gradingRules: [],
      },
      {
        id: "bms-s3",
        kind: "topology",
        title: "Build the topology: gate first, then serialize",
        instructionsMarkdown:
          "Place the tiers and draw both paths.\n\n**Edge / front door:** `dns_load_balancer` → `cdn_edge` for static assets and seat-map shells → `api_gateway` with `rate_limiter` (per-IP and per-account) → `web_application_firewall` for scripted inventory scraping.\n\n**Admission:** a per-show virtual waiting room. Issue numbered tokens at a rate the show can actually drain; the token is the only thing that lets a session call the hold API. Cache the waiting-room position in `redis_cache`, never in the seat row.\n\n**Read path:** seat map snapshots served from `redis_cache` (or the CDN for the static shell), versioned per layout. Reads must not touch `postgres_db`.\n\n**Hold path:** `rest_service` hold handler → atomic arbiter in `redis_cache` (`SET seat:{show}:{seat} {holdId} NX PX 600000`) → durable insert of the hold row into `postgres_db` (unique on show+seat where not released). Redis is the fast arbiter; Postgres is the truth. If they disagree, Postgres wins and a reconciler repairs Redis.\n\n**Confirm path:** `message_queue` between the confirm API and the payment workers so the provider's TPS ceiling cannot back-pressure the browse path; `background_worker` pool runs the confirm saga and the 60-second expiry sweeper; `observability_stack` tracks hold→confirm conversion and orphaned holds.\n\nEnable multi-AZ on Redis, Postgres, and the queue. Run the simulation and land inside 250 ms p99 before passing.",
        hints: [
          "The hold must be a single atomic decision (SET NX with TTL). Check-then-write in application code is the double-book bug, just harder to see.",
          "Queue the confirm, not the hold: users tolerate a spinner after paying; they do not tolerate a sold seat they thought they owned.",
          "Two writers must never own the same seat state. Pick Redis as the arbiter for speed, Postgres as the arbiter for truth, and write down the repair rule.",
        ],
        gradingRules: [
          { id: "bms-g1", description: "Queue + atomic hold cache + durable ledger, multi-AZ", requiredResourceIds: ["message_queue", "redis_cache", "postgres_db"], minNodeCount: 5, maxP99Ms: null, maxErrorRate: null, maxCostPerHourUsd: null, requiresMultiAz: true, points: 25 },
          { id: "bms-g1b", description: "Admission and abuse controls at the front door", requiredResourceIds: ["api_gateway", "rate_limiter"], minNodeCount: 0, maxP99Ms: null, maxErrorRate: null, maxCostPerHourUsd: null, requiresMultiAz: false, points: 10 },
        ],
      },
      {
        id: "bms-s4",
        kind: "data_model",
        title: "The seat ledger: leases, versions, idempotency",
        instructionsMarkdown:
          "Sign the contracts that make oversell impossible.\n\n**Tables (name the constraints, not just the columns):**\n\n- `shows(id, venue_id, starts_at, layout_version)` — layout version pins which seat map is authoritative.\n- `seat_states(show_id, seat_id, state, hold_id, expires_at, version)` with a **unique index on (show_id, seat_id) where state <> 'released'**. That partial unique index is the last line of defence: even if two application servers both believe a seat is free, the second insert fails.\n- `holds(id, show_id, user_id, seat_ids, state, expires_at, idempotency_key)` — state in `active | pending_payment | confirmed | expired | released`.\n- `payment_intents(id, hold_id, provider_ref, amount, state)` with **unique(provider_ref)** and **unique(hold_id)** — one hold, one charge.\n- `tickets(id, hold_id, show_id, seat_id)` with unique(show_id, seat_id) — the sale itself.\n\n**Hold contract:** `POST /v1/shows/{id}/holds`, body `{seats: [...], idempotencyKey}`, header `Idempotency-Key`; returns `201 {holdId, expiresAt}`; `409 {conflicts: [seatId]}` when any seat is taken; `429` with `Retry-After` and queue position when the token bucket says wait. Retrying the same idempotency key returns the original hold — never a second one.\n\n**Confirm contract:** `POST /v1/holds/{id}/confirm` returns `202 {paymentIntentId}` — accepted, not captured. The provider webhook is the authority; handle it **idempotently on provider event id**, and make the state transition `pending_payment → confirmed` a conditional update (`WHERE state = 'pending_payment'`). A duplicate webhook updates zero rows and returns 200.\n\n**Expiry:** Redis TTL releases the fast lock; a sweeper every 60 s flips `active` rows past `expires_at` to `expired` and frees the seats in one transaction. Never rely on TTL alone — a Redis restart loses TTLs, and the sweeper plus partial unique index are what stop the inventory leak.\n\nWrite the sentence that proves no oversell: *a seat can only become `confirmed` from `pending_payment`, and only one hold can ever be `pending_payment` for a given (show, seat).*",
        hints: [
          "A unique partial index is cheaper than any distributed lock and survives application bugs — it is the constraint you cannot forget to call.",
          "The provider callback can arrive before your confirm response, twice, or a day late. Design the state machine for all three.",
          "Holds are leases with a deadline. If you store an absolute `expires_at`, a clock skew or a paused worker is an inventory bug — compare against the database clock.",
        ],
        gradingRules: [],
      },
      {
        id: "bms-s5",
        kind: "chaos",
        title: "Chaos drill: 50× spike with a payment brownout",
        instructionsMarkdown:
          "Two things fail at once, because they always do.\n\n**Do it:** run the traffic-surge chaos at 50× for 3 minutes, and while it runs put the payment provider into a slow/failing dependency state (~5 s p99, 20% errors). Then re-run the checks.\n\n**What you are defending:**\n\n- **Admission:** the waiting room must absorb the spike. Without it, 50k sessions race for 200 seats and the hold handler's p99 collapses as Postgres serializes conflicting writes.\n- **Hold integrity:** no seat may appear in two confirmed tickets. If a hold handler times out mid-transaction, the client retry must be idempotent, and the partial unique index must reject the loser.\n- **Payment backlog:** confirms queue at the provider's real rate. Holds in `pending_payment` must not silently expire while their payment is still in flight — either extend the lease with a bounded grace state (`payment_pending`, not `active`) or reconcile the late webhook against a released seat and refund automatically. Pick one and defend it.\n- **Recovery:** when Redis restarts empty, the hold API must fail closed to Postgres for the affected shard (slower, correct) rather than rebuilding locks from nothing.\n\nPassing means: error rate stays under the incident guardrail, p99 degrades without collapsing, and the double-book count is **exactly zero**. Write down what your design does at second 0, 30, and 300, and name the metric you would page on first — for the reference design it is hold→confirm conversion plus orphaned `pending_payment` rows, not CPU.",
        hints: [
          "Second 0: gate closes, queue grows, browse stays fast. Second 30: confirm backlog is the p99. Second 300: sweeper has released abandoned holds; provider recovers and the queue drains.",
          "A timeout is not a failure — it is an unknown outcome. Every unknown must be resolved by reading durable state, never by retrying the charge.",
          "If you see double-books, look for a read-check-write path that bypassed SET NX or the partial unique index.",
        ],
        gradingRules: [
          { id: "bms-g2", description: "No oversell and bounded errors under 50× surge", requiredResourceIds: ["message_queue", "redis_cache", "postgres_db"], minNodeCount: 5, maxP99Ms: 600, maxErrorRate: 0.03, maxCostPerHourUsd: 60, requiresMultiAz: false, points: 20 },
        ],
      },
      {
        id: "bms-s6",
        kind: "review",
        title: "Review: defend the three decisions",
        instructionsMarkdown:
          "Close with the argument, not a diagram tour.\n\n**1. Hold as lease, not lock.** A lock needs an owner who will release it; a user who closes the tab will not. A lease with `expires_at` in the database and a TTL in Redis is self-healing. Cost: legitimate slow payers lose seats — which is why the lease is a product decision, not an infrastructure one.\n\n**2. Per-show admission, not global.** Gating the whole platform on the hottest show turns one sold-out screen into a site-wide outage. Tokens per show keep other screens browsable and make the 50:1 contention cheap: most of the 10k watchers get a seat-map read and a queue position, not a database write.\n\n**3. Conditional state transitions.** `pending_payment → confirmed` only from `pending_payment`, keyed by the provider event id; `tickets` unique on (show, seat). Every retry is then safe by construction. The alternative — trusting the client's `payment succeeded` callback — is how double-books and double-charges happen.\n\n**Numbers to say from memory:** 50k req/s spike, 1.6M seat states, ~320 MB of seat state, ~7.5 MB of active holds, ~4k/s peak confirms against a provider ceiling in the low hundreds, 1.6M tickets/night. Then name the first page: orphaned `pending_payment` rows or a hold→confirm conversion drop.\n\nFinally, state the honest trade-off you would tell the business: a waiting room loses some impulse buyers, but overselling a blockbuster costs refunds, support load, and trust. Correctness is the SLO here.",
        hints: [
          "If your answer to 'what if the webhook is late?' is 'retry the payment', you have not designed the state machine yet.",
          "The cheapest way to prevent double-booking is a constraint, not a lock service — say which constraint.",
        ],
        gradingRules: [
          { id: "bms-g3", description: "Final design inside budget and at the 250 ms on-sale SLO", requiredResourceIds: [], minNodeCount: 5, maxP99Ms: 250, maxErrorRate: 0.01, maxCostPerHourUsd: 60, requiresMultiAz: false, points: 20 },
        ],
      },
    ],
    solutionMarkdown: "# Reference: the gold-standard on-sale design\n\n## Read path (90% of traffic)\nCDN serves the static shell; `redis_cache` holds versioned seat-map snapshots per show (`layout_version` in the key). 45k reads/s never touch Postgres. Seat-map state is eventually consistent by a few hundred ms — acceptable, because the hold decision re-checks atomically; the map is a hint, not the truth.\n\n## Admission\nPer-show virtual waiting room: arriving sessions get a numbered token at a drain rate derived from that show's confirm capacity, not a global constant. `rate_limiter` enforces per-IP and per-account ceilings; `web_application_firewall` blocks obvious scrapers. A token is required to call the hold API, so the 50:1 contention on a hot show becomes cheap queue positions rather than 50k database writes.\n\n## Hold path (the correctness core)\n`POST /holds` with an idempotency key → hold handler computes the seat set → per-seat `SET seat:{show}:{seat} {holdId} NX PX 600000` (all-or-nothing via a small Lua script that rolls back partial acquisition) → durable `seat_states` insert with the partial unique index `(show_id, seat_id) WHERE state <> 'released'`. If Postgres rejects, release the Redis keys and return `409` with the conflicting seats. Redis is the fast arbiter; the index is the truth. On a Redis restart, the shard fails closed to Postgres until the cache is rebuilt from `seat_states` — slower, never wrong.\n\n## Confirm path\n`POST /holds/{id}/confirm` writes a `payment_intent` (unique on `hold_id`) and returns `202`; a `message_queue` buffers the charge so provider latency never back-pressures browsing. Workers charge at the provider's TPS ceiling. The webhook is authoritative: `UPDATE payment_intents ... WHERE provider_ref = $1 AND state = 'pending'`; a duplicate event matches zero rows and returns 200. Only after that transition does a conditional `UPDATE seat_states SET state='confirmed' WHERE hold_id=$1 AND state='pending_payment'` create `tickets` rows. If the webhook arrives after the lease expired, the reconciler refunds and releases, and the seat returns to inventory.\n\n## Expiry and repair\nA `background_worker` sweeper every 60 s expires `active` holds past `expires_at` (database clock), frees Redis keys, and flips seats to `released` in one transaction. Orphaned `pending_payment` rows older than the grace window are reconciled against provider state — never guessed. Metrics: hold→confirm conversion, orphan count, partial-index conflict rate, per-show queue depth.\n\n## Capacity and cost\nAt peak: a handful of `rest_service` pods behind the gateway, Redis sharded by venue (~320 MB total), Postgres partitioned by show date (1.6M rows/night), one worker pool sized to the provider's TPS ceiling. Reference cost is well inside the $60/hr budget; headroom is spent on multi-AZ and on the queue, not on bigger databases. p99: seat map ~40 ms edge-cached, hold ~120 ms, confirm accepted ~90 ms (capture happens asynchronously).\n\n## Why this does not oversell\nThree independent barriers, in order: the per-show gate (most attempts never reach a seat write), the atomic `SET NX` lease (one winner per seat), and the partial unique index plus conditional transition (the database refuses to record a second sale even if the first two fail). Any one alone is a bug waiting for a race; together they fail closed.",
  },
  {
    id: "razorpay-payments",
    title: "Razorpay Payment Ledger",
    company: "Razorpay",
    difficulty: "advanced",
    estimatedMinutes: 75,
    briefMarkdown:
      "# Payments: 10k attempts/sec, no lost or duplicated money\n\nDesign an intent API, a double-entry ledger, PSP routing, and settlement reconciliation at **10k charge attempts/sec**, **400ms p99**, **zero lost or duplicated postings**.\n\nThis lab grades the three decisions that separate a payment system from a CRUD app: **(1)** what the 400ms p99 actually covers - acceptance, not card-network authorization; **(2)** why the ledger is append-only postings instead of mutable balances; **(3)** what happens when a PSP times out after it may already have moved money. A design that says 'retry until success' fails stage five.",
    targetRps: 10000,
    sloP99Ms: 400,
    budgetUsdPerHour: 120,
    stages: [
      {
        id: "rp-s1",
        kind: "brief",
        title: "Scope the money movement",
        instructionsMarkdown:
          "Write requirements as commitments, not headings.\n\n**Functional:** charge intents with authorize, capture, void, refund (full and partial), multi-currency, PSP routing and failover, signed webhooks, and merchant settlement reports.\n\n**Non-functional:** 10k intent requests/sec peak, 400ms p99, 99.99% availability for reads of committed state, RPO 0 for acknowledged postings, 24h idempotency window, and zero tolerance for duplicate or missing money movements.\n\nThe first commitment is the clock. **400ms p99 is acceptance, not authorization.** A card-network round trip has its own p99 in the hundreds of milliseconds to seconds and is outside your control. So `POST /payments` validates, persists an intent, and returns **202** with an id; terminal state arrives by webhook or status poll. Say that explicitly - a design whose API waits on the PSP cannot also promise 400ms during a PSP slowdown, which is exactly when you need it most.\n\nSecond commitment is PCI scope. Card numbers are collected by hosted fields or the PSP SDK; your servers and logs see a token, never a PAN. State the boundary out loud: if PAN touches your VPC you are no longer in the lightest self-assessment tier, and every log sink becomes a compliance surface.\n\nThird: money is integer minor units with an explicit currency, never a float. A refund references the capture it reverses, not the original intent, so partial captures and partial refunds have an unambiguous parent.",
        hints: [
          "Separate 'accepted', 'authorized', 'captured', and 'settled' in the vocabulary now. Most broken payment designs collapse the first two.",
          "Decide the failure semantics of acceptance: if you return 202 and then crash, the intent must still be recoverable and eventually reach a terminal state.",
          "Name the currencies and the rounding rule before any arithmetic; JPY has no minor unit and 3-decimal currencies exist.",
        ],
        gradingRules: [],
      },
      {
        id: "rp-s2",
        kind: "boe",
        title: "Back-of-envelope: the ledger is the volume",
        instructionsMarkdown:
          "Do the arithmetic; 'partition the ledger' is not an answer until the numbers say by what.\n\n| Quantity | Arithmetic | Result |\n| --- | --- | --- |\n| Peak charge attempts | given | 10k/s |\n| Attempts/day at peak rate | 10k x 86,400 | 864M |\n| Authorization success | 60% assumed | 518M captured payments |\n| Postings per payment | 2 for authorize + 2 for capture | 4 |\n| Postings/day | 518M x 4 | ~2.07B |\n| Posting row | journal 16B + account 8B + amount 8B + currency 3B + ts 8B + request hash 32B + overhead | ~120B |\n| Raw postings/day | 2.07B x 120B | ~248 GB/day |\n| With 3x replication | 248 GB x 3 | ~744 GB/day |\n| Indexes and WAL | ~35% of replicated bytes | ~1 TB/day provisioned |\n| 30-day hot window | 1 TB x 30 | ~30 TB |\n| Idempotency records | 864M x (64B key + ~400B stored response + index) | ~430 GB/day |\n| Idempotency with 3 replicas | 430 GB x 3 | ~1.3 TB (24h TTL) |\n\nLatency budget for the 400ms: 15ms edge and TLS, 25ms gateway and auth, 120ms ledger commit at cross-region quorum, 10ms serialization = **170ms**, leaving 230ms for the p99 tail. That leftover is your tail budget, not permission to call the PSP synchronously.\n\nWebhook volume is its own number: 518M terminal events/day is ~6k/s average, but a PSP recovery or a batch capture can burst to 30k/s. Size the delivery tier for the burst and absorb the rest in a log.\n\nState the honest conclusion: at this write rate the ledger is a partitioned append-only log of postings with derived balances, not a table of account rows you update in place.",
        hints: [
          "Four postings per payment is a deliberately simple model. If you add fees, chargebacks, or FX, show the extra postings and the extra rows/day.",
          "The 60% success assumption drives everything downstream. Write it as an assumption so a reviewer can challenge it.",
          "Convert the 30 TB hot window into a storage bill and a restore-time estimate; both belong in the design.",
        ],
        gradingRules: [],
      },
      {
        id: "rp-s3",
        kind: "topology",
        title: "Build the topology",
        instructionsMarkdown:
          "Assemble the path so that no single component is allowed to be the source of truth for money.\n\n- **Edge:** WAF in front of the API gateway; card capture happens in hosted fields, so the WAF protects the intent API, not the PAN.\n- **Intent service:** stateless REST service that writes one transaction containing the intent row, its idempotency record, and an outbox row.\n- **Ledger:** CockroachDB (or equivalent CP store) with regional quorum. Postings are append-only; balances are materialized views rebuilt from postings.\n- **Outbox and streams:** the same transaction writes to an outbox, a relay publishes to Kafka. No dual-write between database and broker.\n- **PSP workers:** consume intent events, call the PSP with a stable idempotency key, write the outcome back with a compare-and-set on intent state.\n- **Webhook workers:** sign and deliver merchant events with retries and a DLQ.\n- **Secrets manager:** PSP API keys per environment, rotated; workers never read keys from config files.\n\nA Redis cache may hold recent idempotency responses for speed, but it must be a cache: the unique constraint in the database is what actually prevents a double charge. If Redis is down, correctness must not change, only latency.\n\nFailover rule: PSP routing may switch providers, but a switch creates a **new intent attempt fence** and must first resolve the prior attempt's unknown state. 'Route to the other PSP and retry' without that resolution is how customers get charged twice.",
        hints: [
          "Put the outbox in the same transaction as the intent. If your diagram has the service writing the DB and then publishing to Kafka directly, you have a dual-write and a lost-event window.",
          "The ledger store is the only component allowed to be strongly consistent on the write path; everything else can be eventually consistent.",
          "Draw the unknown-state resolution path (status query by PSP idempotency key) as a first-class flow, not an afterthought.",
        ],
        gradingRules: [
          {
            id: "rp-g1",
            description: "WAF, CP ledger, stream/outbox, and workers on the write path",
            requiredResourceIds: ["web_application_firewall", "cockroach_db", "kafka_stream", "background_worker"],
            minNodeCount: 7,
            maxP99Ms: null,
            maxErrorRate: null,
            maxCostPerHourUsd: null,
            requiresMultiAz: true,
            points: 30,
          },
        ],
      },
      {
        id: "rp-s4",
        kind: "api",
        title: "Idempotency and the intent state machine",
        instructionsMarkdown:
          "Design `POST /v1/payments` around one atomic transaction and one uniqueness rule.\n\n```\nPOST /v1/payments\nIdempotency-Key: 7f3c...   (client-generated, unique per merchant attempt)\n{ amount: 4999, currency: \"INR\", capture: \"manual\", payment_method_token: \"tok_...\" }\n\n202 { id: \"pay_123\", status: \"created\" }\n```\n\n**The rule:** a unique index on `(merchant_id, idempotency_key)`. The first request inserts the intent, the idempotency record with a hash of the request body, and an outbox row in one transaction. A concurrent duplicate loses the insert race and reads the stored response. Same key and same body hash returns the original response (**200** on replay, not a second charge); same key with a different body returns **422**. Keys are scoped per merchant and retained 24h; retention is a product promise, so write it down.\n\n**State machine:** `created -> authorized -> captured -> settled`, with `created -> failed`, `authorized -> voided`, and `captured -> partially_refunded -> refunded`. Every transition is a compare-and-set on `(state, version)`, so a late PSP webhook cannot move a captured payment back to authorized.\n\n**Posting rules:** nothing updates a balance directly. A transition appends postings, and a journal invariant requires debits to equal credits in the same currency. A refund appends reversing postings against the capture; it never edits the original rows.\n\nThe client-facing promise is at-least-once delivery with at-most-once effect. Across a network you cannot have exactly-once, so you get it by making the effect idempotent and reconciling the residue.",
        hints: [
          "Distinguish the client idempotency key from the PSP idempotency key. They have different lifetimes and different owners.",
          "Store the response body, not just the status code, or a replay returns a different payload than the original call.",
          "A webhook can arrive before your synchronous write commits in a pathological retry. Make the handler tolerate an unknown intent id by queuing it briefly.",
        ],
        gradingRules: [],
      },
      {
        id: "rp-s5",
        kind: "chaos",
        title: "Chaos: the PSP timed out after it succeeded",
        instructionsMarkdown:
          "At 14:07 the primary PSP's authorize p99 crosses 700ms. Your worker times out at 600ms and retries. Four percent of those retries reach a PSP that already authorized the first call. Because the buggy retry path generated a **new** idempotency key, the customer is charged twice and support has 3,000 duplicate-charge tickets by 14:30.\n\nRun the drill and keep error rate under 0.5%:\n\n1. **Do not retry with a new key.** A timeout is an *unknown* outcome, not a failure. Retry only with the same PSP idempotency key, or resolve the state first.\n2. **Resolve before re-attempt.** Query the PSP by your key; if the answer is authorized, record it. If the PSP has no record, the attempt is safe to replay.\n3. **Fence the transition.** The intent state CAS means two workers cannot both move `created -> authorized`; the loser re-reads and exits.\n4. **Hedge only with the same key.** A hedged request to a second PSP is a new provider relationship, so it needs its own attempt record and the first attempt must be terminal or explicitly abandoned - otherwise you have two live authorizations.\n5. **Reconcile the residue.** Settlement files and PSP status dumps catch what the live path missed. Duplicate-charge detection is a query over postings grouped by intent, not a support ticket.\n\nThe graded target is not 'retry faster'. It is: no duplicate capture, an explicit unknown-state queue, and a reconciliation job that can prove the ledger matches the PSP.",
        hints: [
          "Timeouts, connection resets, and 5xx responses are unknown outcomes. A 4xx decline is a known terminal failure and is safe to mark failed.",
          "Count the unknown-state queue as a first-class metric; its age is the real incident severity.",
          "A dead-letter queue without an owner and an alert is a data-loss queue with extra steps.",
        ],
        gradingRules: [
          {
            id: "rp-g3",
            description: "Unknown-outcome resolution without duplicate capture",
            requiredResourceIds: ["cockroach_db", "message_queue", "observability_stack"],
            minNodeCount: 6,
            maxP99Ms: 450,
            maxErrorRate: 0.005,
            maxCostPerHourUsd: 120,
            requiresMultiAz: false,
            points: 25,
          },
        ],
      },
      {
        id: "rp-s6",
        kind: "review",
        title: "Review: prove the invariants",
        instructionsMarkdown:
          "Close with the invariants an auditor or a staff reviewer will ask you to prove.\n\n- **Conservation:** for every journal and currency, sum(debits) = sum(credits). A posting that cannot be paired is rejected at write time.\n- **Immutability:** postings are append-only. Corrections are reversing entries; nothing is deleted or updated. Say how you enforce that in the database, not just in code review.\n- **One terminal state:** each intent reaches exactly one terminal state, and every terminal state is backed by a PSP fact (authorization id, capture id, settlement line).\n- **Replay safety:** re-delivering any webhook or client request produces no new postings. Show the unique constraint and the stored-response hash that make that true.\n- **Reconciliation:** daily settlement diff classifies every line as matched, in-transit, or broken, with aging thresholds and an owner. In-transit items older than the PSP's settlement window are incidents.\n- **Dual control:** manual journals and refunds above a threshold need a second approver and an audit record.\n\nThen answer the trade-off question: which part of this design would you relax to cut cost by half, and what invariant would you be risking? A defensible answer keeps the ledger and the idempotency constraint and sacrifices latency, cache warmth, or cross-region read locality.",
        hints: [
          "An invariant you cannot query for is a hope. Write the SQL or the check that proves each one.",
          "Name the reconciliation window explicitly; 'nightly' is not a recovery objective.",
          "If your answer to the cost question touches the ledger, you have failed the question.",
        ],
        gradingRules: [
          {
            id: "rp-g2",
            description: "SLO and budget respected with invariants intact",
            requiredResourceIds: [],
            minNodeCount: 6,
            maxP99Ms: 450,
            maxErrorRate: 0.005,
            maxCostPerHourUsd: 120,
            requiresMultiAz: false,
            points: 20,
          },
        ],
      },
    ],
    solutionMarkdown:
      "# Reference\n\n**Write path:** WAF -> gateway -> intent service. One transaction inserts the intent, the idempotency record (unique on merchant + key), and an outbox row. A relay publishes to Kafka; PSP workers call the provider with a stable idempotency key and compare-and-set the intent state on the result. Terminal state returns to the merchant by signed webhook; `GET /payments/{id}` is a cache-friendly read of committed state.\n\n**Ledger:** append-only postings in CockroachDB, four per captured payment (authorize debit/credit, capture debit/credit), 2.07B postings/day at peak, partitioned by day, ~1 TB/day provisioned with replicas and indexes, 30-day hot window then object storage. Balances are derived views; a journal invariant rejects any unbalanced write.\n\n**The 400ms budget:** 15ms edge, 25ms gateway and auth, 120ms ledger commit, 10ms serialize = 170ms, with 230ms of tail budget. The API returns **202** on acceptance and never waits on the card network.\n\n**Failure:** a timeout is an unknown outcome. The worker queries the PSP by its own idempotency key before replaying, fences state transitions with CAS, and queues unresolved attempts for reconciliation. Hedged requests reuse the same key or get a separate attempt record. Nightly settlement diff classifies every line as matched, in-transit, or broken, with aging alerts.\n\n**Invariants:** debits equal credits per journal and currency, postings are immutable, one terminal state per intent, replays add no postings, and manual adjustments need dual control. Cost is driven by ledger retention and cross-region quorum; neither is negotiable for correctness.",
  },
  {
    id: "uber-matching",
    title: "Uber Rider-Driver Match",
    company: "Uber",
    difficulty: "advanced",
    estimatedMinutes: 75,
    briefMarkdown: "# Matching: 1M concurrent drivers\n\nDesign geospatial dispatch with 2s match SLO, surge pricing, and 100k match RPS.",
    targetRps: 100000,
    sloP99Ms: 500,
    budgetUsdPerHour: 250,
    stages: [
      { id: "ub-s1", kind: "brief", title: "Scope", instructionsMarkdown: "Define location updates (4s), H3 indexing, match radius expansion, and surge zones.", hints: ["Write-heavy location stream."], gradingRules: [] },
      { id: "ub-s2", kind: "boe", title: "Back-of-envelope", instructionsMarkdown: "Compute 250k location writes/sec and H3 cell cardinality.", hints: ["1M drivers / 4s = 250k RPS."], gradingRules: [] },
      { id: "ub-s3", kind: "topology", title: "Topology", instructionsMarkdown: "Kafka location log + Flink H3 indexer + Redis geo cells + REST matcher + Postgres trips.", hints: ["Cell-sharded matching."], gradingRules: [{ id: "ub-g1", description: "Stream + cache + compute", requiredResourceIds: ["kafka_stream", "redis_cache", "rest_service"], minNodeCount: 5, maxP99Ms: null, maxErrorRate: null, maxCostPerHourUsd: null, requiresMultiAz: true, points: 30 }] },
      { id: "ub-s4", kind: "data_model", title: "Geo model", instructionsMarkdown: "Model driver_cells (H3, driver, ts) and trip intents with fencing tokens.", hints: ["TTL stale drivers in 30s."], gradingRules: [] },
      { id: "ub-s5", kind: "review", title: "Review", instructionsMarkdown: "Explain ETA accuracy vs match latency and surge fairness.", hints: ["Batch matches every 2s per cell."], gradingRules: [{ id: "ub-g2", description: "SLO/budget", requiredResourceIds: [], minNodeCount: 5, maxP99Ms: 600, maxErrorRate: 0.02, maxCostPerHourUsd: 250, requiresMultiAz: false, points: 20 }] },
    ],
    solutionMarkdown: "# Reference\n\nH3-indexed Redis cells fed by Flink, batched assignment every 2s, surge multipliers per cell, trip ledger in Postgres. p99 match ~1.4s.",
  },
  {
    id: "netflix-streaming",
    title: "Netflix Open Connect",
    company: "Netflix",
    difficulty: "advanced",
    estimatedMinutes: 70,
    briefMarkdown: "# Streaming: 5M concurrent plays\n\nDesign per-title ladder, OCA embeds, and steering with 500ms start-up p99.",
    targetRps: 80000,
    sloP99Ms: 500,
    budgetUsdPerHour: 800,
    stages: [
      { id: "nf-s1", kind: "brief", title: "Scope", instructionsMarkdown: "Scope encodes, manifest serving, steering, and offline downloads.", hints: ["Control plane vs data plane split."], gradingRules: [] },
      { id: "nf-s2", kind: "boe", title: "Back-of-envelope", instructionsMarkdown: "Estimate 5M x 5 Mbps = 25 Tbps edge, and per-title encode cost.", hints: ["OCA offloads 90 percent+."], gradingRules: [] },
      { id: "nf-s3", kind: "topology", title: "Topology", instructionsMarkdown: "CDN edge + blob origin + REST steering + Cassandra viewing state + Kafka telemetry.", hints: ["Steer to healthy OCA."], gradingRules: [{ id: "nf-g1", description: "CDN + blob + state", requiredResourceIds: ["cdn_edge", "blob_storage", "cassandra_store"], minNodeCount: 5, maxP99Ms: null, maxErrorRate: null, maxCostPerHourUsd: null, requiresMultiAz: true, points: 30 }] },
      { id: "nf-s4", kind: "api", title: "Playback API", instructionsMarkdown: "Design manifest + license + heartbeat endpoints with device limits.", hints: ["Signed manifests per session."], gradingRules: [] },
      { id: "nf-s5", kind: "review", title: "Review", instructionsMarkdown: "Defend per-title encodes and congestion-aware ladder switching.", hints: ["VMAF-guided bitrates."], gradingRules: [{ id: "nf-g2", description: "SLO/budget", requiredResourceIds: [], minNodeCount: 5, maxP99Ms: 600, maxErrorRate: 0.02, maxCostPerHourUsd: 800, requiresMultiAz: false, points: 20 }] },
    ],
    solutionMarkdown: "# Reference\n\nPer-title AV1/H.264 ladder pre-positioned on OCAs, steering API picks PoP by BGP + load, client ABR adapts. Start-up p99 ~350ms.",
  },
  {
    id: "search-autocomplete",
    title: "Search Autocomplete (Typeahead)",
    company: "Google",
    difficulty: "standard",
    estimatedMinutes: 70,
    briefMarkdown:
      "# Typeahead: 100k QPS, every keystroke\n\nDesign prefix completion at **100k requests/sec peak**, **10 suggestions per response**, **50ms p99**, over a **100M-phrase** vocabulary, with trending terms reaching users **inside 60 seconds**.\n\nThis lab grades three decisions end to end: **(1)** whether the index is something you query or something you build and swap, **(2)** what the 50ms clock actually measures and what eats it, **(3)** how typo tolerance stays a bounded cost instead of a 10x lookup multiplier. Every stage ladders toward one of them.",
    targetRps: 100000,
    sloP99Ms: 50,
    budgetUsdPerHour: 90,
    stages: [
      {
        id: "ac-s1",
        kind: "brief",
        title: "Scope the problem",
        instructionsMarkdown:
          "Write the requirements as commitments, not headings.\n\n**Functional:** prefix suggestions (10 max), ranked by predicted engagement, one-edit typo tolerance, trending boost, locale and safe-search filtering, opt-in personalization.\n\n**Non-functional:** 50ms p99, 99.95% availability, catalog staleness <= 24h, trending staleness <= 60s, 100k req/s peak.\n\nThe scope test is the clock. State explicitly that the SLO runs from **request send**, not from keypress: a 100ms client debounce would otherwise consume the whole budget before the request exists. Debounce is a load-shedding and responsiveness decision, and it changes the request rate you must serve, so write down the assumed debounce and the keys-per-query it implies.\n\nSecond commitment: typo tolerance is **not** free. One-edit expansion on a 6-character prefix fans out to roughly 100-300 candidate keys. Cap it (one edit, prefixes of 4+ characters) or move it to a slower tier, and say which.",
        hints: [
          "Name the request rate after debounce, then the rate you actually provision: they differ by 3-5x and the wrong one sizes the fleet.",
          "Separate freshness classes now: catalog (24h), trending (60s), personalization (per request). They have different storage and cache answers.",
          "Decide what an empty prefix and a 1-character prefix return before you design the index; they are the hottest keys in the system.",
        ],
        gradingRules: [],
      },
      {
        id: "ac-s2",
        kind: "boe",
        title: "Back-of-envelope: show the arithmetic",
        instructionsMarkdown:
          "The old version of this lab said 'trie RAM for 100M phrases' and left it there. Do the arithmetic instead.\n\n| Quantity | Arithmetic | Result |\n| --- | --- | --- |\n| Peak requests | given | 100k/s |\n| Response size | 10 x ~18 B text + JSON keys/quotes | ~200 B |\n| Egress at edge | 100k x 200 B | 20 MB/s = 160 Mbps |\n| Origin requests | 80% edge hit | 20k/s |\n| Origin egress | 20k x 200 B | 4 MB/s |\n| Vocabulary | given | 100M phrases, avg 22 chars |\n| Indexed phrases | top 10M by clicks ~= 95% of impressions | 10M |\n| Prefix nodes | 10M phrases x 22 chars, ~70% shared prefixes | ~60M distinct prefixes |\n| Per-node top-8 | 8 x (4 B phrase id + 4 B score) + 32 B header | ~96 B |\n| Index RAM | 60M x 96 B | ~5.8 GB |\n| With 2 replicas | 5.8 GB x 2 | ~12 GB |\n| Per shard, 8 shards | 12 GB / 8 | ~1.5 GB (2x build headroom) |\n| Egress cost | 72 GB/h x $0.02/GB | ~$1.44/h |\n| Trending overlay | 5M rows x 40 B | ~200 MB |\n\nNow the latency budget for the 50ms, in order: 5ms edge TLS/CDN, 8ms network RTT, 2ms app, 3ms index lookup, 1ms merge and rank = **19ms**, which leaves 31ms for the p99 tail (GC pause, cold pod, cross-AZ retry). A design that budgets 45ms of work and calls the remainder \"headroom\" has no tail budget and will miss p99 every day.\n\nState the honest conclusion: 100M phrases do not fit as a pointer-chasing trie you mutate live. You serve **10M phrases as a flat, versioned segment**, and you pay for the tail with edge caching, not with a bigger trie.",
        hints: [
          "Show the 70% prefix-sharing assumption as an assumption. Node count is the number that decides whether the index is 6 GB or 60 GB.",
          "Two replicas per shard is a read-throughput choice, not redundancy: with 3 the loss of one node costs 11% of a shard, with 2 it costs 50%.",
          "Convert egress to money in the same table. A 90 dollars/hour budget is ~60 TB/month at list CDN prices, which is plenty here - say so.",
        ],
        gradingRules: [],
      },
      {
        id: "ac-s3",
        kind: "topology",
        title: "Build the topology",
        instructionsMarkdown:
          "Place the tiers and draw two request paths: the hot cached path and the cold tail path.\n\n**Edge:** dns_load_balancer and cdn_edge. Cache the finished JSON for the top 10k prefixes (~80% of requests), keyed by locale + query + index version, `s-maxage=60`.\n**Front door:** api_gateway with rate_limiter, per API key and per IP, so one scraping client cannot take the tail.\n**Serving:** rest_service, stateless suggesters, 8 shards x 2-3 replicas, each holding one immutable segment in memory. Shard by hash(locale + first 2 chars) so a shard owns a contiguous slice of the keyspace.\n**Cache:** redis_cache for the mid-tail (prefixes ranked 10k-1M) at 60s TTL. It absorbs the second tier of repeats without touching the segment.\n**Index pipeline:** kafka_stream of impressions and clicks, stream_processor to aggregate counts and emit a new segment every hour, blob_storage for segments, and a pointer flip that swaps versions atomically.\n**Fallback:** search_cluster only for typo-expanded queries, never on the hot path.\n\nEnable multi-AZ everywhere and run the simulation until p99 and error rate clear the SLO. If a shard has no replica in a second AZ, the multi-AZ flag is decoration.",
        hints: [
          "The index is read-only at serve time. If your diagram has the suggester writing to the index, you have re-invented the thing this lab is arguing against.",
          "Version the cache key: `q=sys&v=2026-11-22T04` means a bad publish cannot poison the CDN for an hour.",
          "Typo tolerance on search_cluster needs its own concurrency limit, or a typo storm becomes a search-cluster outage that also kills the safety net.",
        ],
        gradingRules: [
          {
            id: "ac-g1",
            description: "Edge cache, in-memory segment tier, and durable segment store all present and multi-AZ",
            requiredResourceIds: ["cdn_edge", "redis_cache", "rest_service", "blob_storage"],
            minNodeCount: 8,
            maxP99Ms: null,
            maxErrorRate: null,
            maxCostPerHourUsd: null,
            requiresMultiAz: true,
            points: 25,
          },
          {
            id: "ac-g1b",
            description: "Index rebuild pipeline is asynchronous and off the read path",
            requiredResourceIds: ["kafka_stream", "stream_processor"],
            minNodeCount: 0,
            maxP99Ms: null,
            maxErrorRate: null,
            maxCostPerHourUsd: null,
            requiresMultiAz: false,
            points: 10,
          },
        ],
      },
      {
        id: "ac-s4",
        kind: "api",
        title: "Serving contract and segment format",
        instructionsMarkdown:
          "Two artefacts to specify: the HTTP contract and the on-disk segment.\n\n**Endpoint:** `GET /v1/suggest?q=&locale=&limit=10&v=`\n\n- `q` max 64 chars; below 2 chars return a curated top list, not an error.\n- Response: `{ v, suggestions: [{ t, score, kind }] }` where `kind` is `organic | trending | personal`. Clients need to know why a term was shown.\n- `limit` capped at 10 server-side. A client asking for 50 must not make the server do 5x the work.\n- `ETag` = index version; `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.\n- Personalization travels as a signed, short-lived header, never in the cache key. If it were in the key, the hit rate would collapse to per-user.\n\n**Segment format:** a flat, sorted array of prefix hashes with an 8-entry top-k posting each, plus a small header. Lookup is not a trie walk: a two-level index maps the first 4 characters to an offset range, then a binary search plus a short scan finds the prefix. One memory lookup, not 22 pointer chases.\n\n**Publish:** segment written to blob storage, checksummed, row count compared to the previous build, then an atomic pointer flip. Readers pin a version on boot and hot-swap on a poll. Never mutate a live segment.\n\nExplain why a Redis-hosted trie is the wrong tool here: either you pay a round trip per character, or you move the whole traversal into a Lua script and inherit a second, unversioned index.",
        hints: [
          "Cap `limit` server-side and say so in the contract; it is the cheapest load-protection decision in the whole design.",
          "The version in the cache key and the ETag should be the same string. Two versioning schemes drift within a month.",
          "Validation before the swap is the only thing standing between a bad build and a 60-minute stale CDN.",
        ],
        gradingRules: [],
      },
      {
        id: "ac-s5",
        kind: "chaos",
        title: "Chaos drill: cold cache, bad publish, dead shard",
        instructionsMarkdown:
          "Three drills, each with an expected shape.\n\n**1. Full edge flush.** All 100k/s land on the fleet at once. With 8 shards that is 12.5k/s per shard, well inside capacity, but request coalescing matters: 100 concurrent misses for `sys` must produce **one** segment lookup, not 100. Expect a p99 bump for one TTL window and no error spike. If p99 crosses 50ms and stays there, you sized for the mean, not the flush.\n\n**2. Bad segment publish.** New build is 30% short on rows or fails checksum. The pointer must not flip: keep serving the previous version, page the on-call, and let catalog staleness burn the 24h budget. Trending is the exception - it is a small overlay, so a bad trend batch is fixed by the next 60s window.\n\n**3. Shard loss.** One of 8 shards loses a replica. With 2 replicas, the survivor absorbs 2x its normal load, so per-shard capacity must be >= 2x steady state or you shed. With 3 replicas the loss costs 50% extra on two survivors, which fits in the same 2x headroom and is why 3 is the cheaper answer at this size. Show the rule you apply and verify error rate stays under 2%.\n\nAlso bound the typo storm: one-edit expansion is allowed only for 4+ character prefixes, capped at 15% of QPS, and shed to a plain prefix lookup (no expansion) when the cap trips.",
        hints: [
          "Single-flight per prefix is the difference between a flush and a self-inflicted DDoS on your own shards.",
          "Write the fallback explicitly: a failed publish serves the old version, it does not serve empty suggestions.",
          "Per-shard capacity headroom is a number you choose in stage 2, not a property you discover during the drill.",
        ],
        gradingRules: [
          {
            id: "ac-g2",
            description: "Survives a flush and a shard loss inside the SLO and budget",
            requiredResourceIds: ["redis_cache", "rest_service"],
            minNodeCount: 8,
            maxP99Ms: 60,
            maxErrorRate: 0.02,
            maxCostPerHourUsd: 90,
            requiresMultiAz: true,
            points: 25,
          },
        ],
      },
      {
        id: "ac-s6",
        kind: "review",
        title: "Review: defend the design",
        instructionsMarkdown:
          "Answer in prose, with numbers from your own envelope.\n\n1. Why is the index an immutable artefact rather than a database you query per keystroke? Name the two failure modes the immutable version removes (mutation contention at 100k/s, and an index that changes mid-request).\n2. Where does trending live, and why is a 200MB overlay merged at read time better than rebuilding a 6GB segment every 60 seconds? Give the rebuild cost you avoided.\n3. Your p99 is 50ms and your budget line says 19ms. What is the other 31ms for, and what will you instrument to prove it is not being eaten?\n4. At 10x traffic (1M/s), what breaks first - egress, shard count, or the publish pipeline - and what is the cheapest next move?\n5. What does this design deliberately give up? Say it plainly: no deep personalization on the hot path, capped typo tolerance, and up to 60s of stale trending.",
        hints: [
          "The 10x question has one right shape: shard count scales linearly, publish does not, so name the publish bottleneck specifically.",
          "A good review names a trade-off the design loses, not only the ones it wins.",
        ],
        gradingRules: [
          {
            id: "ac-g3",
            description: "Written review covers staleness, tail budget, and the 10x plan",
            requiredResourceIds: [],
            minNodeCount: 8,
            maxP99Ms: 50,
            maxErrorRate: 0.02,
            maxCostPerHourUsd: 90,
            requiresMultiAz: true,
            points: 15,
          },
        ],
      },
    ],
    solutionMarkdown:
      "# Reference\n\n**Shape:** CDN caches the top 10k prefixes (~80% hit, 60s TTL, versioned key), Redis covers ranks 10k-1M, and 8 shards x 3 replicas serve a ~6GB immutable segment from memory at ~1ms per lookup.\n\n**Envelope:** 100k x 200B = 20MB/s at the edge, ~4MB/s at origin. 10M indexed phrases over ~60M distinct prefixes at ~96B per node = ~5.8GB, doubled for replicas and 8-way sharded to ~1.5GB each. Latency: 5 + 8 + 2 + 3 + 1 = 19ms, leaving 31ms for the tail.\n\n**Why it holds:** the index is built hourly from the click stream and swapped by pointer flip, so no request ever reads a half-written index and the serve path never contends with a writer. Trending is a 200MB overlay refreshed every 60s and merged at read time, which is 30x cheaper than rebuilding the segment.\n\n**Failure story:** a bad publish fails validation and never flips, so the worst case is 24h of stale catalog, not an outage. A shard loss costs 50% extra on two replicas, inside the 2x headroom. A full cache flush coalesces to one lookup per prefix.\n\n**What it gives up:** deep personalization stays off the hot path, typo tolerance is capped at one edit on 4+ character prefixes, and trending can be 60s stale.",
  },
  {
    id: "dynamodb-from-scratch",
    title: "DynamoDB: KV from Scratch",
    company: "AWS",
    difficulty: "staff_plus",
    estimatedMinutes: 90,
    briefMarkdown: "# Build a Dynamo-like KV: 1M RPS\n\nDesign partitioning, gossip membership, hinted handoff, Merkle repair, and quorum APIs.",
    targetRps: 1000000,
    sloP99Ms: 20,
    budgetUsdPerHour: 500,
    stages: [
      { id: "ddb-s1", kind: "brief", title: "Scope", instructionsMarkdown: "Define Get/Put/Delete, conditional writes, GSIs, and on-demand vs provisioned.", hints: ["Single-digit ms at any scale."], gradingRules: [] },
      { id: "ddb-s2", kind: "boe", title: "Back-of-envelope", instructionsMarkdown: "Compute partitions for 1M RPS (3k RPS/partition -> 334 partitions) and storage nodes.", hints: ["Over-partition 2x."], gradingRules: [] },
      { id: "ddb-s3", kind: "topology", title: "Topology", instructionsMarkdown: "Gateway + consistent-hash ring + LSM storage nodes + gossip membership + stream processor for GSIs.", hints: ["N=3, W=2, R=2."], gradingRules: [{ id: "ddb-g1", description: "Wide-column + ring + gossip concepts", requiredResourceIds: ["cassandra_store", "dns_load_balancer", "kafka_stream"], minNodeCount: 4, maxP99Ms: null, maxErrorRate: null, maxCostPerHourUsd: null, requiresMultiAz: true, points: 30 }] },
      { id: "ddb-s4", kind: "data_model", title: "Partition model", instructionsMarkdown: "Design partition keys, sort keys, and GSI backfill via log replay.", hints: ["Uniform random suffix for hot tenants."], gradingRules: [] },
      { id: "ddb-s5", kind: "review", title: "Review", instructionsMarkdown: "Defend vector-clock reconciliation and why last-write-wins needs app help.", hints: ["Dotted version vectors."], gradingRules: [{ id: "ddb-g2", description: "SLO/budget", requiredResourceIds: [], minNodeCount: 4, maxP99Ms: 30, maxErrorRate: 0.01, maxCostPerHourUsd: 500, requiresMultiAz: false, points: 20 }] },
    ],
    solutionMarkdown: "# Reference\n\nConsistent-hash ring (Murmur3), N=3 LSM replicas, QUORUM writes, Merkle weekly repair, GSI via commit-log tailing. p99 ~12ms.",
  },
  {
    id: "notification-platform",
    title: "Notification Platform (SMS/Push)",
    company: "Uber",
    difficulty: "standard",
    estimatedMinutes: 55,
    briefMarkdown: "# Notify 100M users with prefs, quiet hours, and provider failover at 30k RPS.",
    targetRps: 30000,
    sloP99Ms: 800,
    budgetUsdPerHour: 70,
    stages: [
      { id: "nt-s1", kind: "brief", title: "Scope", instructionsMarkdown: "Define channels, templates, prefs, quiet hours, and per-provider budgets.", hints: ["Preference center is the contract."], gradingRules: [] },
      { id: "nt-s2", kind: "boe", title: "Back-of-envelope", instructionsMarkdown: "Compute fan-out and provider cost per 1k pushes vs SMS.", hints: ["SMS 100x push cost."], gradingRules: [] },
      { id: "nt-s3", kind: "topology", title: "Topology", instructionsMarkdown: "Event bus + template service + worker fleet + queue per provider + rate limiter.", hints: ["Per-provider queues isolate outages."], gradingRules: [{ id: "nt-g1", description: "Bus + queue + limiter + workers", requiredResourceIds: ["event_bus", "message_queue", "rate_limiter", "background_worker"], minNodeCount: 4, maxP99Ms: null, maxErrorRate: null, maxCostPerHourUsd: null, requiresMultiAz: true, points: 30 }] },
      { id: "nt-s4", kind: "api", title: "Send API", instructionsMarkdown: "Design POST /sends with idempotency, render preview, and quiet-hour evaluation.", hints: ["Evaluate prefs at send time."], gradingRules: [] },
      { id: "nt-s5", kind: "review", title: "Review", instructionsMarkdown: "Explain provider failover and retry budgets that stop SMS storms.", hints: ["20 percent retry budget."], gradingRules: [{ id: "nt-g2", description: "SLO/budget", requiredResourceIds: [], minNodeCount: 4, maxP99Ms: 900, maxErrorRate: 0.03, maxCostPerHourUsd: 70, requiresMultiAz: false, points: 20 }] },
    ],
    solutionMarkdown: "# Reference\n\nEventBridge intake -> Flink pref filter -> per-provider SQS -> workers with token buckets -> DLQ review. Push p99 ~400ms.",
  },
  {
    id: "dropbox-file-sync",
    title: "Dropbox Sync & Sharing",
    company: "Dropbox",
    difficulty: "advanced",
    estimatedMinutes: 70,
    briefMarkdown: "# Sync 1B files with delta sync, 150M users, 40k RPS metadata.",
    targetRps: 40000,
    sloP99Ms: 300,
    budgetUsdPerHour: 200,
    stages: [
      { id: "dbx-s1", kind: "brief", title: "Scope", instructionsMarkdown: "Define block-level delta, conflicts (forked copies), sharing links, and LAN sync.", hints: ["4 MB content-defined chunks."], gradingRules: [] },
      { id: "dbx-s2", kind: "boe", title: "Back-of-envelope", instructionsMarkdown: "Compute chunk index rows and dedup savings (30 percent).", hints: ["SHA-256 per chunk."], gradingRules: [] },
      { id: "dbx-s3", kind: "topology", title: "Topology", instructionsMarkdown: "REST metadata + blob chunks + Postgres namespace + Redis locks + notifier stream.", hints: ["Metadata separate from blocks."], gradingRules: [{ id: "dbx-g1", description: "Blob + metadata + cache", requiredResourceIds: ["blob_storage", "postgres_db", "redis_cache"], minNodeCount: 4, maxP99Ms: null, maxErrorRate: null, maxCostPerHourUsd: null, requiresMultiAz: true, points: 30 }] },
      { id: "dbx-s4", kind: "data_model", title: "Namespace model", instructionsMarkdown: "Model inodes, versions, and chunk manifests with Merkle roots.", hints: ["Merkle syncs deltas only."], gradingRules: [] },
      { id: "dbx-s5", kind: "review", title: "Review", instructionsMarkdown: "Defend dedup privacy (convergent encryption limits) and conflict UX.", hints: ["Per-user keys beat global dedup for privacy."], gradingRules: [{ id: "dbx-g2", description: "SLO/budget", requiredResourceIds: [], minNodeCount: 4, maxP99Ms: 350, maxErrorRate: 0.02, maxCostPerHourUsd: 200, requiresMultiAz: false, points: 20 }] },
    ],
    solutionMarkdown: "# Reference\n\nChunker -> S3 blocks (deduped) -> Postgres namespace journal -> notifier long-poll. Syncs deltas via Merkle compare. p99 ~180ms metadata.",
  },
  {
    id: "distributed-rate-limiter",
    title: "Stripe-Grade Rate Limiter",
    company: "Stripe",
    difficulty: "standard",
    estimatedMinutes: 60,
    briefMarkdown:
      "# Stripe: 50k limit decisions/sec without starving anyone\n\nYou are building the limiter in front of 200 internal services. Every request asks one question — may this key spend one unit on this route, now? — and the answer has to arrive inside the 10ms budget, not after it.\n\n**Commitments:** 50k decisions/sec at peak; 1M active API keys; per-key, per-plan and per-route buckets; deny responses that tell the client when to come back; a single abusive tenant must not be able to starve anyone else (the hot-key problem); one Redis shard dies at 09:00 and the platform still decides.\n\n**The trap:** this looks like a caching problem and is really a correctness problem. A limiter that over-admits by 1% is a different product from one that over-admits by 1000× under partition, and only the second one puts a wrong number on a customer's invoice.",
    targetRps: 50000,
    sloP99Ms: 10,
    budgetUsdPerHour: 25,
    stages: [
      {
        id: "rl-s1",
        kind: "brief",
        title: "Scope: buckets, route classes, and one percentage",
        instructionsMarkdown:
          "Write the commitments first, then the bucket hierarchy — the hierarchy decides your failure mode.\n\n**Hierarchy:** global → plan → key → route. Name which level is authoritative when two disagree. If the key-level bucket is authoritative, one tenant can exhaust the global budget; if global wins, a noisy tenant silently throttles everyone. Pick and defend.\n\n**Route classes (this drives stage 5):** reads and search may fail open — a missing throttle costs money, a refused read costs a customer. Writes, auth and payments fail closed — an unthrottled login endpoint is free credential-stuffing capacity. Say which bucket each class consults.\n\n**Fairness:** per-key fairness across 1M keys is the easy half. The hard case is one key at 10× its limit, which pins one shard, because single-key atomicity means that counter cannot be split. Decide now whether a single tenant may exceed one shard's capacity (it may not) and what the platform does when it tries.\n\n**Cardinality budget:** 1M keys × 3 bucket types × 2 windows ≈ 6M counters. Counters are cheap only if you never store a list per key — that constraint is the whole data model.\n\n**Non-goals:** billing-grade metering (offline ledger, stage 4) and per-IP abuse blocking (WAF at the edge).\n\nThen commit to two numbers you will defend for the rest of the lab: p99 ≤ 10ms *including* the limiter's own hop, and a maximum over-admit stated as a percentage.",
        hints: [
          "Per-route cost is not decoration: a GraphQL query fanning out to 40 resolvers and a key-lookup GET cannot debit the same one token.",
          "Write the fail-open/closed table per route class before you touch topology — retrofitting it after the chaos drill is how outages get worse.",
          "The hot-key limit is physical, not a config: one Redis shard's throughput is the ceiling for one key.",
        ],
        gradingRules: [],
      },
      {
        id: "rl-s2",
        kind: "boe",
        title: "Back-of-envelope: one round trip and one bounded error",
        instructionsMarkdown:
          "Two numbers decide this design, and both are arithmetic you can show.\n\n| Quantity | Arithmetic | Result |\n| --- | --- | --- |\n| Decisions/sec | given | 50k |\n| Redis ops per decision | one `EVALSHA` (GCRA in Lua), never read-then-write | 1 |\n| Total Redis ops | 50k × 1 | 50k/s |\n| Planned per-shard ceiling | Lua + script overhead on one core | ~25k ops/s |\n| Shards, throughput minimum | 50k ÷ 25k | 2 |\n| Shards to actually run | 2 per AZ × 3 AZs | 6 (~8.3k/s each, 33% of ceiling) |\n| After one AZ loss | 50k ÷ 4 shards | 12.5k/s each (50% of ceiling) |\n| State per key | TAT + period + limit ≈ 64 B | 1M keys ≈ 64 MB, ×3 replicas ≈ 200 MB |\n| Local memo | 10k hottest keys × ~100 B | ~1 MB per gateway instance |\n\n**Why not a sliding log?** A 1000-req/hour key needs 1000 timestamps. At 1M such keys that is 10⁹ timestamps × 8 B ≈ 8 GB, plus a sort per decision to find the window edge. GCRA keeps *two* numbers per key — the theoretical arrival time and the period — so 1M keys fit in tens of MB and each decision is O(1). You are trading exact history for bounded state; say that trade out loud.\n\n**Decision 1 — one round trip, not two.** Read-then-write is two RTTs (~0.4ms each in-AZ) and, worse, is not atomic: two gateways can both read 99/100 and both admit the last token. One single-key Lua script that checks and debits in the same call makes it one atomic hop, so p99 is ~1 hop (~2ms with queueing) instead of 2 hops plus a race.\n\n**Decision 2 — over-admit is r × T, but only if you split the budget.** A 1s local memo on a key limited to 1000/min (16.7/s) lets one instance admit up to ~16 extra requests before it re-reads: 1.6%, acceptable. Now do *not* hand every gateway the full budget and memoize it: with 100 instances the worst case becomes 100 × r × T, i.e. 100× the limit. Give each instance r/N, let it burst locally, reconcile every T — global over-admit stays bounded by r × T no matter how many instances you add. That sentence is the stage.\n\nFinally, price it: 6 shards with one replica each at list-price order of magnitude ≈ $4/hr, metrics ≈ $2/hr, inside the $25/hr budget with room for a second region.",
        hints: [
          "`EVALSHA` with a preloaded script, not `GET` then `INCR`: atomicity is what stops two gateways from both taking the last token.",
          "Plan the shard at ~25k ops/s, not Redis's best-case `GET` number — a Lua script is heavier, and you want headroom to survive an AZ.",
          "6 shards, not 2: the extra four are what let you lose an AZ without rehashing under load.",
          "Measure the memo's hit rate on real traffic before claiming 99% — the honest range for the top-10k-key working set is 60-80% of calls.",
        ],
        gradingRules: [],
      },
      {
        id: "rl-s3",
        kind: "topology",
        title: "Topology: put the decision where it cannot be skipped",
        instructionsMarkdown:
          "Place the tiers, then instrument the decision rather than only its outcome.\n\n**Front door:** api_gateway terminates and calls the limiter as an `ext_authz` hook — one extra localhost hop, already inside the 10ms budget.\n\n**Limiter:** rate_limiter as a sidecar (or a service_mesh authz filter) on every gateway pod, so a service that forgets to check cannot bypass the limit. Shard Redis by `hash(bucketKey)` so one key's counters live on exactly one shard and stay atomic. There are no cross-shard transactions here, which is precisely why every bucket boundary must be a single key.\n\n**State:** redis_cache — 6 primaries, one replica each, multi-AZ. No cluster-wide locks, no `MULTI` across shards.\n\n**Signals:** observability_stack tracking allow/deny ratio per bucket, a decision-latency histogram (not an average — an average hides the p99 that breaches the SLO), Redis CPU per shard, and a *burn* alert on deny rate rising across a whole plan rather than a single noisy key. Alert on the ratio, not on the count: absolute deny counts follow traffic and will page you at 3am for a marketing launch.\n\n**Async:** kafka_stream carries denied-decision events to abuse review and billing reconciliation — downstream of the decision, never on it. A limiter that waits for Kafka is a limiter with a Kafka-shaped outage.\n\nRun the simulation and confirm p99 lands under 10ms with the sidecar hop included before you pass the stage.",
        hints: [
          "Shard by key hash, never by tenant: a tenant-level shard concentrates its own hot key and takes neighbours down with it.",
          "One replica per shard is for failover, not for reads — reading counters from a replica reintroduces the stale-read race you removed in stage 2.",
          "Deny events asynchronously: the decision path must not depend on a broker ack.",
        ],
        gradingRules: [
          { id: "rl-g1", description: "Limiter on the request path, sharded state, and decision observability, all multi-AZ", requiredResourceIds: ["rate_limiter", "api_gateway", "redis_cache", "observability_stack"], minNodeCount: 5, maxP99Ms: null, maxErrorRate: null, maxCostPerHourUsd: null, requiresMultiAz: true, points: 30 },
        ],
      },
      {
        id: "rl-s4",
        kind: "api",
        title: "Decision API and the one-key data model",
        instructionsMarkdown:
          "Sign the contract, then the shape of the counter.\n\n**Internal decision call:** `POST /v1/limit/check` with `{bucketKey, cost, rule}` → `200 {allowed, limit, remaining, resetSeconds, retryAfterSeconds}`. Keep `cost` in the request: a query that fans out to 40 resolvers should debit more than one token, or your per-route limit is fiction.\n\n**Client-facing headers:** `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` — a *delta* in seconds, not an absolute timestamp, because absolute resets turn clock skew into a support ticket. On a 429 add `Retry-After`. Emit the headers on allowed responses too: a client that only learns its limit after being throttled cannot back off gracefully.\n\n**Data model — one hash per bucket:** `{ bucketKey, tat, period, limit, updatedAt }` where `tat` is the theoretical arrival time. Never store a request list. Encode `bucketKey` as `tenant:route:window` so a plan change is a new key rather than a migration, and version the prefix (`v2:`) so a semantics change can roll out beside the old one and be compared.\n\n**Time:** read the clock from Redis `TIME` inside the script, not from the gateway's wall clock. Pod-to-pod skew at minute boundaries is exactly the bug that turns a smooth limit into a synchronised burst.\n\n**Retries:** a client timeout plus retry must not double-debit, or a flaky minute doubles a customer's usage. Either pass a decision id the script dedupes inside the window, or accept the double debit and say why the dedupe state costs more than the error.\n\n**Refunds:** long work that fails after admission needs a compensating credit. Without it, a flaky downstream looks like traffic and the customer pays for your incident.",
        hints: [
          "A single hash per bucket is what lets the whole decision be one script over one key.",
          "Reset as a delta, never an absolute time — the header is read by clients you do not control.",
          "State the refund path explicitly; it is the part reviewers forget and customers notice.",
        ],
        gradingRules: [],
      },
      {
        id: "rl-s5",
        kind: "chaos",
        title: "Chaos drill: a shard dies, then one tenant goes hot",
        instructionsMarkdown:
          "Two failures, and they are different exercises — run both.\n\n**(a) Shard loss.** Kill one Redis shard mid-run. The sidecar starts seeing connection errors for the keys homed there. Three options, ranked: (1) fall back to the in-process bucket for those keys at limit/N, so the platform degrades instead of going unlimited; (2) fail open for read-class routes only and closed for writes; (3) serve those keys from the replica, accepting a short window of stale counters. Choose per route class and write down the degraded over-admit — it is no longer r × T, it is however many instances are guessing, so compute *that* number.\n\n**(b) Hot key.** One tenant at 10× its limit drives every decision for its key onto one shard. Single-key atomicity means you cannot shard that counter further, so: shed at the edge before Redis (a cheap per-instance token bucket), or stripe the bucket into N sub-keys (`key#0…#N-1`) each holding limit/N — which admits up to N−1 extra requests by construction. Stripe it and state the slack.\n\nPassing means: error rate stays under the guardrail, decision p99 degrades without collapsing, and you can name the tab you would page first. Write what the limiter does at second 0, 30 and 300 of each failure.",
        hints: [
          "Degraded mode must be bounded: limit/N per instance over-admits by the instance count, which you must be able to say as a percentage.",
          "Striping a hot key buys throughput at the price of slack — never stripe a payments or auth bucket without saying how much slack.",
          "Fail-open on reads is a policy, not a default; a search endpoint with no limit at all is an outage waiting for a scraper.",
        ],
        gradingRules: [
          { id: "rl-g3", description: "Bounded degradation on shard loss and a striped hot key", requiredResourceIds: ["rate_limiter", "redis_cache"], minNodeCount: 4, maxP99Ms: null, maxErrorRate: 0.01, maxCostPerHourUsd: null, requiresMultiAz: true, points: 20 },
        ],
      },
      {
        id: "rl-s6",
        kind: "review",
        title: "Review: defend four sentences with your own numbers",
        instructionsMarkdown:
          "Answer these with numbers from your design, not with adjectives.\n\n1. **Why not two Redis calls?** Because check-then-debit lets two gateways admit the same last token; one Lua script per key is the only atomicity you have across 200 services. Name the RTT difference you bought.\n2. **Why 6 shards and not 2?** 2 is the throughput minimum. The other four buy an AZ loss without rehashing under load. Say what re-sharding a live hot key costs and how you would avoid doing it at 09:00.\n3. **What is your over-admit, exactly?** r × T when each instance owns r/N; unbounded in the number of instances if they each own r. Give the percentage at your real limits and say which of the two you built.\n4. **What fails open, and what never does?** Reads and search, at limit/N per instance, with an alert; writes, auth and payments stay closed. An unthrottled login endpoint is free credential-stuffing capacity.\n\nThen the honest limitation: shared counters are per-region. A truly global limit needs either home-region pinning (a 60-150ms cross-region RTT — fine for admin routes, not for payments) or an approximate regional split that over-admits by the split ratio. Choose one and say which endpoints it protects.\n\nClose with the cost line: ~$4/hr for six shards with replicas, ~$2/hr of metrics, inside $25 — and the sentence that matters: **a limiter may be wrong by r × T, never by an instance count.**",
        hints: [
          "The best answers name the tradeoff they rejected, not only the one they chose.",
          "If your degraded mode is 'fail open', you have chosen unlimited traffic for that route — say it that way.",
        ],
        gradingRules: [
          { id: "rl-g2", description: "SLO/budget", requiredResourceIds: [], minNodeCount: 4, maxP99Ms: 15, maxErrorRate: 0.01, maxCostPerHourUsd: 25, requiresMultiAz: false, points: 20 },
        ],
      },
    ],
    solutionMarkdown:
      "# Reference\n\nGateway `ext_authz` → per-pod GCRA bucket at limit/N with a 1s memo for the 10k hottest keys → sharded Redis (6 primaries, 1 replica each, shard = hash(bucketKey)) running a single `EVALSHA` of `CL.THROTTLE`, clock from Redis `TIME`. Over-admit is bounded by r × T, independent of instance count; degraded mode is per-instance buckets at limit/N with reads failing open and writes closed; hot keys are striped into N sub-buckets at limit/N each. p99 ≈ 2-3ms including the local hop; ~$4/hr state + ~$2/hr metrics. The limiter does not oversell platform capacity: it can be wrong by r × T, never by an instance count.",
  },
  {
    id: "agentic-rag-support",
    title: "Agentic RAG Support Copilot",
    company: "Intercom",
    difficulty: "staff_plus",
    estimatedMinutes: 80,
    briefMarkdown: "# Copilot over 5M docs with tools, citations, and 9s p99 task budget at 500 tasks/min.",
    targetRps: 50,
    sloP99Ms: 9000,
    budgetUsdPerHour: 180,
    stages: [
      { id: "rag-s1", kind: "brief", title: "Scope", instructionsMarkdown: "Define retrieval corpus, tools (order lookup, refund), guardrails, and human escalation.", hints: ["Gates for refunds."], gradingRules: [] },
      { id: "rag-s2", kind: "boe", title: "Back-of-envelope", instructionsMarkdown: "Compute 8 LLM calls/task x 500 tasks = 4k calls/min; vector RAM for 5M chunks.", hints: ["~15 GB embeddings."], gradingRules: [] },
      { id: "rag-s3", kind: "topology", title: "Topology", instructionsMarkdown: "Orchestrator + vector DB + LLM pool + Redis session cache + Postgres tickets + search hybrid.", hints: ["Cache retrieval per ticket."], gradingRules: [{ id: "rag-g1", description: "Agent + vector + LLM + cache", requiredResourceIds: ["agent_orchestrator", "vector_database", "llm_inference", "redis_cache"], minNodeCount: 5, maxP99Ms: null, maxErrorRate: null, maxCostPerHourUsd: null, requiresMultiAz: false, points: 30 }] },
      { id: "rag-s4", kind: "data_model", title: "Memory model", instructionsMarkdown: "Design ticket scratchpad, long-term vector memory with consent, and citation store.", hints: ["Cite chunk IDs in answers."], gradingRules: [] },
      { id: "rag-s5", kind: "review", title: "Review", instructionsMarkdown: "Defend faithfulness evals, PII redaction, and step budgets stopping runaway loops.", hints: ["12-step cap, $0.40/task cap."], gradingRules: [{ id: "rag-g2", description: "SLO/budget", requiredResourceIds: [], minNodeCount: 5, maxP99Ms: 9500, maxErrorRate: 0.05, maxCostPerHourUsd: 180, requiresMultiAz: false, points: 20 }] },
    ],
    solutionMarkdown: "# Reference\n\nOrchestrator (12-step cap) -> hybrid BM25+vector top-20 -> cross-encoder top-5 -> vLLM 8B draft then 70B escalate -> tool gates -> cited answer. Faithfulness 92 percent, p99 7.8s.",
  },
];

export const GUIDED_LAB_IDS: string[] = GUIDED_LABS.map((l) => l.id);

export const GUIDED_LAB_MAP: Record<string, GuidedLab> = Object.fromEntries(
  GUIDED_LABS.map((l) => [l.id, l]),
);

export function getGuidedLab(id: string): GuidedLab | undefined {
  return GUIDED_LAB_MAP[id];
}

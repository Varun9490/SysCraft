/**
 * Curated per-module teaching scaffolding for the wiki reader.
 *
 * Every concept page gets the same pedagogy spine, in now-line order:
 *   1. plainWords — the one analogy a tired human remembers.
 *   2. mermaid — the end-to-end flow rendered as an interactive diagram.
 *   3. breakPoints — the failure anatomy learners simulate in the canvas.
 *   4. readNext — deliberate in-wiki cross-links that build the mental graph.
 *
 * Diagrams stay hand-curated (not generated) so labels read like a story:
 * cause on the left, consequence on the right, traps as dashed arrows.
 */

export interface ConceptReadNext {
  title: string;
  href: string;
  why: string;
}

export interface ConceptFlow {
  moduleId: string;
  plainWords: string;
  mermaid: string;
  breakPoints: string[];
  readNext: ConceptReadNext[];
}

export const CONCEPT_FLOWS: ConceptFlow[] = [
  {
    moduleId: "consistent-hashing",
    plainWords:
      "Hang clocks evenly around a wall and number every key by grade: whatever number is spoken, ownership goes to the next clock clockwise. Add a clock and only the slice between two neighbors gets retimed — almost nothing moves.",
    mermaid: `flowchart TD
  K["Keys hash into ring space"] --> R(("Ring: 0 .. 2^32"))
  R -->|clockwise| A["Node A owns arc 1"]
  R -->|clockwise| B["Node B owns arc 2"]
  R -->|clockwise| C["Node C owns arc 3"]
  ADD["Node D joins"] -.->|"only keys between C and D re-map"| R
  DROP["Node B retires"] -.->|"its keys hop to one neighbor"| R
  HOT["Hot tenant key"] -.->|"split with virtual shadow nodes, isolate tenant"| R`,
    breakPoints: [
      "No virtual nodes: hash values cluster, so one physical node inherits a giant arc and runs hot while its peer idles.",
      "Celebrity key: one key = one arc. Split hot keys into fake-key shards (key#1..#N) or move them to their own owner.",
      "Ring recomputed mid-flight on membership change: two clients disagree on owner, both write, replicas diverge.",
      "Rebalance storm: removing a fat node hands its whole arc to one survivor instead of re-spreading it.",
    ],
    readNext: [
      { title: "Sharding & Hot-Key Surgery", href: "/wiki/sharding-partitioning", why: "How the ring maps onto physical shards and what to do when one key owns an arc." },
      { title: "CAP Theorem", href: "/wiki/cap-theorem", why: "What the divergence from a mid-flight ring change means during a partition." },
    ],
  },
  {
    moduleId: "cap-theorem",
    plainWords:
      "During a network cut you can keep answering users or keep all replicas in agreement — never both, because they cannot hear each other. CAP is that forced choice during the cut, and the answer must be intentional, not accidental.",
    mermaid: `flowchart TD
  OK["Network healthy"] --> BOTH["You get consistency AND availability for free"]
  CUT["Partition splits the fleet"] --> Q{"Choose, per request or per store"}
  Q -->|"CP: refuse to guess"| CP["Replica rejects or waits: no stale writes, outages visible"]
  Q -->|"AP: keep serving"| AP["Replicas accept writes and diverge, reconcile later"]
  CP --> FIX["Back online: converge before serving that range again"]
  AP --> REC["Back online: anti-entropy + conflict resolution"]
  REC -.->|"no reconciliation job = silent divergence"| BAD["Course divergence you find from support tickets"]`,
    breakPoints: [
      "Fantasy land: an 'AP+CA' design that never wrote its reconciliation loop — replicas drift apart forever after partitions.",
      "CP everywhere: one partition flaps and the whole store returns 503s, including requests that never crossed the boundary.",
      "Reconciliation tested nowhere: the merge code runs for the first time during a real incident.",
      "Client-side 'exactly-once' built on a stale replica read instead of a quorum read.",
    ],
    readNext: [
      { title: "Raft Consensus", href: "/wiki/raft-consensus", why: "The CP answer done properly: quorum writes and safe leader elections." },
      { title: "ACID vs BASE", href: "/wiki/acid-vs-base", why: "What a BASE-posture service looks like when you pick the reconciling-later path." },
    ],
  },
  {
    moduleId: "raft-consensus",
    plainWords:
      "One bullhorn-holder gets elected by a majority and only they may announce decisions. If the bullhorn falls silent, the followers with the most-up-to-date diaries run a new vote; stale candidates lose.",
    mermaid: `stateDiagram-v2
  [*] --> Follower : boot
  Follower --> Candidate : election timeout, no heartbeat
  Candidate --> Leader : majority grants votes
  Candidate --> Follower : hears a higher term
  Leader --> Follower : hears a higher term
  Follower --> Follower : accepts entries, advances commit index
  Leader --> Leader : heartbeats + appends, commits on majority`,
    breakPoints: [
      "Election storms: heartbeat timeout shorter than GC pause tails — healthy leaders keep getting voted out, throughput collapses.",
      "Split votes loop forever when candidates restart with a different randomized timeout; also loses quorum on exactly-half partitions.",
      "Log truncation on install-snapshot while a slow follower still owned a commit rule edge — data loss between replicas.",
      "Joint-consensus membership change executed wrong (or not tested): removal of the leader produces two quorums with different commit indexes.",
    ],
    readNext: [
      { title: "Replication & Failover", href: "/wiki/replication", why: "How failures between replicas are healed, and where consensus must replace guesswork." },
      { title: "Gossip & Failure Detection", href: "/wiki/gossip-protocol", why: "The membership layer that decides who is even allowed to vote." },
    ],
  },
  {
    moduleId: "btree-vs-lsm",
    plainWords:
      "B-Tree is an archive where you update books in place; LSM is a shoebox of receipts you later consolidate. Writes go to the shoebox fast, lookups get slower until the archive gets its compaction pass.",
    mermaid: `flowchart LR
  W["Write"] -->|"B-Tree: WAL + in-place page edit"| BT["B-Tree pages on disk"]
  W -->|"LSM: append to memtable only"| MT["Memtable (skiplist)"]
  MT -->|flush| SST["SSTable run 1"]
  SST -->|compaction| L1["Run 2 + Tombstones collected"]
  Q["Point read"] -->|"B-Tree: 0-3 page reads, bloom on each pas"| BT
  Q -->|LSM path| BF{"Bloom filter per run"}
  BF -->|any bit zero| SKIP["Run absent: skip disk, zero I/O"]
  BF -->|maybe present| READ["Read run, merge newest wins"]
  READ --> AGG["All runs' answers merge: tombstone or live value wins"]`,
    breakPoints: [
      "Write amplification blackout: pages arrive faster than compaction empties them; the queue grows and every write eventually pays 10-30x I/O.",
      " undersized filters: false positives at 14 percent turn the 'skip' design back into full-scan behavior on cold runs.",
      "Secondary indexes multiply every write by the number of indexes — LSM index cost disclosure decides the schema.",
      "Compaction storms create p99 cliffs; the amp is right until the load report shows the latency spike every two hours.",
    ],
    readNext: [
      { title: "Bloom Filters", href: "/wiki/bloom-filters", why: "The math to size the skip-disk guard that LSM reads live and die by." },
      { title: "Sharding & Partitioning", href: "/wiki/sharding-partitioning", why: "Compaction debt per shard decides where to split, not just key space." },
    ],
  },
  {
    moduleId: "caching-strategies",
    plainWords:
      "Keep the receipts of things everyone always asks for on the counter. You decide: is the copy still fresh? What do two cashiers do when both reach for the last copy?",
    mermaid: `flowchart TD
  REQ["Read request"] --> HIT{"Cache hit?"}
  HIT -->|yes| FAST["Serve from cache, sub-ms"]
  HIT -->|no| MISS["Read through to origin"]
  MISS --> FILL{"Stampede guard"}
  FILL -->|"single-flight lock"| ONE["One loader fetches, others wait"]
  FILL -->|"no guard"| HERD["N identical origin reads thunder in"]
  PUT["Write request"] --> WP{"Write policy"}
  WP -->|write-through| WT["Cache + origin in same path"]
  WP -->|write-behind| WB["Cache acks now, origin later"]
  WP -->|write-around| WA["Origin only, cache on next read"]`,
    breakPoints: [
      "Thundering herd at expiry: no single-flight means every node misses at once, origin gets 50x its normal QPS.",
      "Negative caching absent: every invalid login or 404 asks the DB again, and the TTL is zero forever.",
      "Write-behind loses data on crash and double-writes on retry without an idempotency key.",
      "Stale-while-revalidate races: cache refresh uploads a version the origin has already rolled back.",
    ],
    readNext: [
      { title: "Load Balancing", href: "/wiki/load-balancing", why: "Health-aware routing is caching's stabilizer against the herd." },
      { title: "Rate Limiting", href: "/wiki/rate-limiting", why: "What protects the origin when the cache choose not to." },
    ],
  },
  {
    moduleId: "load-balancing",
    plainWords:
      "A head waiter who never seats two families at an already-crowded table, who pulls the plate from tables washing up slow, and who asks three friends how a waiter really is before pulling the plate.",
    mermaid: `flowchart TD
  C["Clients"] --> LB{"LB algorithm"}
  LB -->|round-robin| RR["Next name in the ring, no memory"]
  LB -->|least-outstanding| LO["Lowest in-flight + lowest p95"]
  LB -->|consistent hash| CH["Same key = same backend, cache-friendly"]
  RR --> POOL["Backend pool"]
  LO --> POOL
  CH --> POOL
  POOL --> HC{"Health probing"}
  HC -->|"failing"| EJ["Eject, slow-start returns gently"]
  HC -->|healthy| TR["Traffic flows, retries bounded"]`,
    breakPoints: [
      "Health checks lie: a fast ping succeeds on a server whose requests now take 4 seconds — check readiness depth, not just TCP lift.",
      "Least-connections with lopsided request cost: one chatty tenant pins a backend and the math defeats the score.",
      "Unbounded retry + obliteration: retries amplify an outage (4x requests instead of 4x timeout), killing the recovering server.",
      "No slow start: a freshly ejected (or cold-cache) backend takes 200 requests, spews errors, and thrashes the pool.",
    ],
    readNext: [
      { title: "Rate Limiting & Admission Control", href: "/wiki/rate-limiting", why: "The other half of load shedding — what to do when every backend is backlogged." },
      { title: "Observability & Tracing", href: "/wiki/observability-tracing", why: "You tune the LB on per-backend p95 — learn where those numbers come from." },
    ],
  },
  {
    moduleId: "message-queues",
    plainWords:
      "A conveyor belt with numbered tickets. Recipients may re-read a ticket; your processing must survive reading it twice, and a ticket nobody can process must land in the bin instead of blocking the belt.",
    mermaid: `sequenceDiagram
  autonumber
  participant P as Producer
  participant B as Broker partition
  participant C as Consumer
  participant D as DLQ bin
  P->>B: publish with partition key
  B-->>P: ack when ISR holds the copy
  B->>C: deliver batch (max.poll sized)
  C->>C: do side effects (idempotent by key)
  C->>B: commit offset AFTER effects
  B->>C: no commit = redelivered (at-least-once)
  C->>D: N failures down, DLQ and alert
  Note over C: exactly-once = idempotent consumer + transactional offset`,
    breakPoints: [
      "Rebalance offset loss: consumer dies with 'new partition owner commits old index', data gets skipped or double-processed.",
      "Non-idempotent side effects (charge the card twice): without an idempotency key the redelivery pays double.",
      "DLQ that never gets drained: poison tickets accumulate for weeks and the alert nobody reads turns into an outage.",
      "Partition key skew: a tenant hash puts everything in one partition — ordering sells, throughput dies.",
    ],
    readNext: [
      { title: "Event Streaming", href: "/wiki/event-streaming", why: "How the same log becomes replayable history, not just delivery syringes." },
      { title: "ACID vs BASE", href: "/wiki/acid-vs-base", why: "Outboxes turn exactly-once state changes across services from a hope into a pattern." },
    ],
  },
  {
    moduleId: "event-streaming",
    plainWords:
      "Everyone at the buffet reads from the same long replayable menu. You may join any time, start from the first page, and reread as often as needed — the menu never gets shorter when you look at it.",
    mermaid: `flowchart LR
  SRC["Services + CDC feed"] --> TOPIC["Topic: partitioned append-only log"]
  TOPIC --> P0["Partition 0: order guarantee inside"]
  TOPIC --> P1["Partition 1"]
  TOPIC --> P2["Partition 2"]
  P0 --> GA["Consumer group A (job workers)"]
  P1 --> GA
  P2 --> GA
  TOPIC -.->|"independent offset"| GB["Group B (new service replays history)"]
  GA --> PROC["Stream processors: join, window, aggregate"]
  PROC --> CHG["Changelog topics + materialized views"]
  CHG --> SERV["Read models + alerting feed"]`,
    breakPoints: [
      "Consumer lag crosses retention before anyone looks: the new service literally cannot join, and replay history is gone.",
      "Schema evolution without compatibility rules: field deleted, 12 consumers crash on the next release day.",
      "Global ordering assumptions across partitions — the will to rebuild ordering arrives only after the first bug report about money events arriving out of order.",
      "Exactly-once illusions from 'transactional' producers without (a) read_committed consumers and (b) idempotent downstream side effects.",
    ],
    readNext: [
      { title: "Message Queues", href: "/wiki/message-queues", why: "Delivery semantics and redelivery — what the log guarantees underneath." },
      { title: "Caching Strategies", href: "/wiki/caching-strategies", why: "Materialized views from the stream are cache-shaped: same miss/stampede rules apply." },
    ],
  },
  {
    moduleId: "sharding-partitioning",
    plainWords:
      "Divide the city by zip code so no post office melts — but a celebrity resident becomes a zip code of their own, otherwise every letter to the star still lands on one desk.",
    mermaid: `flowchart TD
  K["Row key"] --> S{"Shard strategy"}
  S -->|hash| HS["Uniform placement, no range scans"]
  S -->|range| RS["Sorted scans, hotspots where the data lives"]
  S -->|directory| DS["Flexible moves, lookup service to own"]
  HS --> HOT{"Hot shard detected"}
  RS --> HOT
  DS --> HOT
  HOT -->|yes| FIX["Split key with fake-key suffix, isolate tenant, cache owner"]
  HOT -->|no| OK["Steady state: balanced, boring"]
  CJ["Cross-shard query"] -.->|"scatter-gather p99 = slowest shard"| ALL["Every shard, every time"]
  RZ["Rebalance needed"] -.->|"bounded batches with dual-write vacuum"| MV["Move data without freezing the fleet"]`,
    breakPoints: [
      "Hot keys: one tenant, one SKU, one viral ID — plan fake-key splits and tenant isolation before the surge, not during it.",
      "Under-sharded forever: 16 shards that were fine at launch, then every op is a scramble at 8x volume with no split road.",
      "Reshard storms dump unbounded throughput into one cluster; migration must be bounded chunks with dual-writes, cutover, verify.",
      "Cross-shard joins turned into scatter-gather fans: p99 is now governed by the slowest shard at the busiest moment.",
    ],
    readNext: [
      { title: "Consistent Hashing", href: "/wiki/consistent-hashing", why: "The ring math that keeps rebalancing to a minimum." },
      { title: "Replication & Failover", href: "/wiki/replication", why: "Every shard also needs its own replica group and its own failover story." },
    ],
  },
  {
    moduleId: "replication",
    plainWords:
      "Follow the leader: the leader speaks, followers echo later. How late is lag, how many echoes you demand before trusting a word is the quorum, and who takes over when the leader disappears is failover.",
    mermaid: `sequenceDiagram
  autonumber
  participant L as Leader
  participant F1 as Follower 1 (sync quorum)
  participant F2 as Follower 2 (async)
  participant CL as Client
  CL->>L: write
  L->>F1: replicate WAL
  F1-->>L: ack, hold lease
  L-->>CL: commit visible
  L->>F2: async tail shipping
  Note over F2: lag = seconds of stale reads
  CL->>F2: stale read (bounded by lag)
  L->>L: crash detected
  L->>F1: promote, bump generation
  Note over L,F2: generations fence the old leader: split-brain refused`,
    breakPoints: [
      "Stale reads as bugs: async follower sits behind the leader by seconds and support tickets read 'I deleted it and it is still there'.",
      "Failover data loss: async promote of the most-lagging follower loses committed writes — require quorum acks on irreversible ops.",
      "Split-brain double-writes: two leaders claim the epoch and both accept writes because the fence never fired.",
      "Read-your-own-writes broken: reads pinned round-robin, users see old data right after a write; pin by session or wait for the replicated cursor.",
    ],
    readNext: [
      { title: "Raft Consensus", href: "/wiki/raft-consensus", why: "The quorum + lease rules that make failover correct, not just fast." },
      { title: "Merkle Trees & Anti-Entropy", href: "/wiki/merkle-trees", why: "How two replicas discover exactly where they drifted apart." },
    ],
  },
  {
    moduleId: "acid-vs-base",
    plainWords:
      "One bank teller can promise the whole transaction in one breath. Two tellers in two towns can only promise to try then undo — a saga is that deliberate un-do button with a remembered step list.",
    mermaid: `flowchart TD
  OP["Business operation"] --> SCOPE{"Same database?"}
  SCOPE -->|yes| ACID["Single ACID transaction (no 2PC needed)"]
  SCOPE -->|no| CH{"Need all-or-nothing across services?"}
  CH -->|yes| SAGA["Saga: local tx + durable step list + compensations back"]
  CH -->|"one fact + one event"| OUTBOX["Outbox: state change + event in one commit"]
  SAGA --> VIS["Intermediate states are visible to others"]
  VIS --> HAND["Idempotent steps + read-your-own-writes + explicit partial states"]
  SAGA --> BACK{"Compensation path"}
  BACK -->|tested| SAFE["Rehearsed refunds, reversible flows"]
  BACK -.->|"never tested = outage material"| RISK["The undo button does not exist"]`,
    breakPoints: [
      "Saga without a durable state machine: steps retried from nowhere, or worse, retried in a wrong order on restart.",
      "Compensations not idempotent: retrying them double-refunds, and now you are not solving transactional-ness, you are laundering money.",
      "Write skew at snapshot isolation: two writers each correct a different thing and together they break the rule — serializable only for invariants that matter.",
      "Outbox without ordering: event published before state commit, downstream acts on a fact the transaction removed.",
    ],
    readNext: [
      { title: "Message Queues", href: "/wiki/message-queues", why: "Outboxes ride queues — delivery semantics decide whether the saga completes." },
      { title: "CAP Theorem", href: "/wiki/cap-theorem", why: "Every saga relies on each local store's consistency choices during partitions." },
    ],
  },
  {
    moduleId: "bloom-filters",
    plainWords:
      "A doorman with photographic recall: 'never seen you' is always true; 'perhaps' is sometimes wrong. Failure only costs one wasted check, and the memory bill is pocket change.",
    mermaid: `flowchart LR
  INS["Insert key"] -.->|"set k hash bits"| BITS["Bit array of m bits"]
  Q["Query key"] --> BF{"Check k bits"}
  BF -->|"any bit = 0"| NO["Definitely absent: skip storage, zero I/O"]
  BF -->|all ones| MAY["Maybe present (maybe at 1 percent)"]
  MAY --> REAL["Real lookup"]
  REAL -->|absent| FP["False positive: one wasted read"]
  REAL -->|present| HIT["Served"]
  GROW["Keys + 10x"] -.->|"rebuild or scalable bloom layers"| BITS`,
    breakPoints: [
      "Undersized filter: 14 percent false positives means the read path does the work it was meant to skip, plus filter overhead for free.",
      "Bit-clearing deletion (no counting variant): cleared bits nuke other keys' membership — false negatives that corrupt correctness.",
      "Forgetting the absent path: the filter only saves work when absent; 'maybe' still reads — analyze the query mix not just the size.",
      "Closure over churn: high-turnover keys grow the filter with ghosts; count-min or rotation instead of starvation.",
    ],
    readNext: [
      { title: "B-Trees vs LSM", href: "/wiki/btree-vs-lsm", why: "The read path that makes the filter's guarantee make money." },
      { title: "Merkle Trees & Anti-Entropy", href: "/wiki/merkle-trees", why: "Where the data really comes from when two replicas disagree." },
    ],
  },
  {
    moduleId: "merkle-trees",
    plainWords:
      "Two librarians compare hash fingerprints of catalogs instead of trading whole books. If the top catalogs differ, they descend chapter by chapter until they know exactly which pages to exchange.",
    mermaid: `flowchart TD
  RA["Replica A root hash"] --> CMP{"Roots equal?"}
  RB["Replica B root hash"] --> CMP
  CMP -->|yes| EQ["Datasets identical up to hash collisions"]
  CMP -->|no| DESC["Descend: compare child hashes per level"]
  DESC --> LEAF["Isolate divergent leaves only"]
  LEAF --> SYNC["Stream just those keys to the stale replica"]
  SYNC --> RE["Roots converge, repair logged"]
  BYTE["One byte changes in one key"] -.->|"hash cascade up the path"| RA`,
    breakPoints: [
      "Interior nodes not cached: high-churn keys recompute the entire root on every write; caching or batching fixes it.",
      "Hash of unordered pairs (no ordering or domain-separation prefix): preimage tricks and false equal roots.",
      "Repair storms after mass drift (a fleet-wide config bug): anti-entropy amplifies the damage if it fans out all at once.",
      "Log-too-large trees: 1M leaves fine at 4KB chunks; billion-leaf ranges need multi-level trees or partial comparisons.",
    ],
    readNext: [
      { title: "Replication & Failover", href: "/wiki/replication", why: "The lag divergence that Merkle repair exists to heal." },
      { title: "Gossip & Failure Detection", href: "/wiki/gossip-protocol", why: "Who initiates the repair rounds when coordinators hear the rumor." },
    ],
  },
  {
    moduleId: "gossip-protocol",
    plainWords:
      "Rumor spreads a few people at a time and everyone hears it fast without a town hall. If someone does not reply, ask their neighbors before declaring them gone — false deaths are the real killer.",
    mermaid: `flowchart TD
  R1["Node starts a round"] --> P{"Pick fanout f = 3 random peers"}
  P --> EX["Exchange deltas (version vectors)"]
  EX --> M["Merge: newer wins per key"]
  M --> R2["Round + 1"]
  R2 -.->|"do again forever"| R1
  DEAD["Direct probe fails"] --> IND{"k indirect peers also fail?"}
  IND -->|no| ALIVE["Back to Alive: it refuted you"]
  IND -->|yes| SUP{"Suspect: window to refute"}
  SUP -->|refuted| ALIVE
  SUP -->|window closed| D["Dead: declare + gossip the fact"]`,
    breakPoints: [
      "Suspicion timeout shorter than GC pause tails: one stop-the-world pause evicts a healthy node, then churn touches every act.",
      "Fanout below 3 in wide-area: rounds cost full RTT hops and convergence goes from seconds to minutes.",
      "Mass join thundering herd: 200 nodes boot at once and gossip buries the channel; add join rate limiting and backoff.",
      "Unbounded state in deltas: full member lists and hot key maps flow every round; ship version cursors, not the dataset.",
    ],
    readNext: [
      { title: "Raft Consensus", href: "/wiki/raft-consensus", why: "Where the rumor layer stops and the authoritative quorum begins." },
      { title: "Consistent Hashing", href: "/wiki/consistent-hashing", why: "Membership changes ripple into ownership — see how the ring absorbs them." },
    ],
  },
  {
    moduleId: "rate-limiting",
    plainWords:
      "Tokens refill into a jar at a fixed rate; each request spends one. Empty jar means 'come back in a bit', said politely, with a time attached — never with an error page.",
    mermaid: `flowchart TD
  REQ["Incoming request"] --> T1["Tier 1: edge/local obvious-abuse drop"]
  T1 --> T2["Tier 2: global quota in shared store"]
  T2 --> KEY{"Per-key bucket (user / IP / tenant)"}
  KEY --> TOK{"Token available?"}
  TOK -->|yes| OK["200, spend one token, refill r/s"]
  TOK -->|no| REJ["429 + Retry-After + RateLimit headers"]
  STARVE["Dependency melting"] --> SHED["Tier 3: shed lowest-priority work fast"]
  FAIL{"Shared store down?"} -->|"reads"| OPEN["Fail open, keep serving"]
  FAIL -->|"paid writes"| CLOSED["Fail closed, protect the money path"]`,
    breakPoints: [
      "INCR + EXPIRE without a Lua script: the two calls race, limits leak, and roughly double the real quota hosts get through per node.",
      "Per-node limits multiplied by fleet size: 10 nodes x 100 rpm reads like 1000 rpm; global counters with local fast-drops is the honest shape.",
      "Rejection as 5xx: clients and browsers retry storms on 503; only 429 communicates 'you, come back later'.",
      "Health checks and internal traffic rate limited: the one real incident becomes an unobservable cascade.",
    ],
    readNext: [
      { title: "Load Balancing", href: "/wiki/load-balancing", why: "Load shedding and LB routing are the same battle at different thresholds." },
      { title: "Caching Strategies", href: "/wiki/caching-strategies", why: "The cheapest limit is the request that never reaches the origin." },
    ],
  },
  {
    moduleId: "vector-search",
    plainWords:
      "Instead of matching words, you file every idea by meaning and then find its neighbors on the shelf. A shortcut that almost always visits the right neighborhood first keeps the search fast enough for real users.",
    mermaid: `flowchart LR
  DQ["User query"] --> EMB["Embed into d-dim vector"]
  EMB --> ANN{"ANN search on index (HNSW graph)"}
  ANN --> CAND["Candidate set + metadata pre-filter"]
  CAND --> RR["Cross-encoder re-ranks top 50 down to k"]
  RR --> OUT["Grounded top-k to the LLM"]
  BUILD["Offline: chunk, embed, index"] -.->|"HNSW edges + PQ codes"| ANN
  MON{"recall@10 below target?"} -->|yes| TUNE["Raise efSearch, add re-ranker stage"]
  METRIC2{"metadata filter kills recall?"} -->|yes| FIXF["Partitioned indexes over post-filter"]`,
    breakPoints: [
      "Recall silently rotting: efSearch tuned once at launch, then embeddings drift after a model upgrade with no reindex and no recall CI.",
      "Pre-filter disaster: one metadata rule removes 90 percent of a cluster, and the index starts returning fewer than k results while asserting success.",
      "Chunking without overlap: a fact split across a chunk boundary is retrieved as two wrong half-facts.",
      "Hybrid missing: names, SKUs, error codes should be BM25 exact matches, not cosine vibes.",
    ],
    readNext: [
      { title: "LLM Serving", href: "/wiki/llm-systems", why: "The retrieval-then-generate pipeline this feeds, and what its latency budget is." },
      { title: "Sharding & Partitioning", href: "/wiki/sharding-partitioning", why: "Billion-scale vector indexes partition by tenant or LSH bucket, same hot-key traps." },
    ],
  },
  {
    moduleId: "llm-systems",
    plainWords:
      "Reading the question aloud is heavy compute; answering word by word is memory-bandwidth work. The notebook pages that keep each conversation repeating is the memory every user is fighting over.",
    mermaid: `sequenceDiagram
  autonumber
  participant U as Client
  participant R as Router / gateway
  participant G as GPU worker
  participant Q as KV block arena
  U->>R: prompt
  R->>G: route by SLO + prefix cache + batch slot
  G->>Q: reuse cached prefix blocks if any
  G->>G: prefill (parallel, TTFT clock)
  G->>G: decode loop (memory-bound, KV pinned)
  G-->>U: stream first token, then TPOT cadence
  G->>Q: release blocks on finish
  Note over Q: KV at 97 pct = preempt low priority, never grow batch`,
    breakPoints: [
      "KV-cache OOM near 97 percent VRAM: preemption off means the scheduler thrashes, drops sessions mid-decode and burns the SLO.",
      "Batch size growth chasing throughput: TTFT p99 is now 4 seconds; cap the batch and route the overflow elsewhere.",
      "Prefix cache misses on unstable prompts: a timestamp or random field on line one kills every shared-prefix win.",
      "No continuity between prefill/decode scheduling: one 30k-token request stalls a whole batch of chatty users.",
    ],
    readNext: [
      { title: "Vector Search & RAG", href: "/wiki/vector-search", why: "Where the prompt actually comes from, and how retrieval shapes token cost." },
      { title: "Rate Limiting", href: "/wiki/rate-limiting", why: "Cost-limited quotas (tokens, not requests) when every request is expensive." },
    ],
  },
  {
    moduleId: "microservices-monolith",
    plainWords:
      "An organized apartment building with real walls beats a city of tents sharing plumbing. Split along the walls residents actually knock on, one room at a time, while the lights stay on.",
    mermaid: `flowchart TD
  M["Modular monolith with enforced module walls"] --> SIG{"Split signals?"}
  SIG -->|"deploy contention, scaling asymmetry, PII scope"| EX["Extract ONE bounded context"]
  EX --> STR["Strangler facade routes endpoints incrementally"]
  STR --> OWN["Service owns its data; no shared schema"]
  OWN --> Q{"Access pattern"}
  Q -->|user-facing reads| SYNC["Sync gRPC + cached read model"]
  Q -->|side effects, fan-out| ACK["Async events via outbox"]
  STR --> DONE["Repeat: one seam at a time, verified each step"]
  NOSPLIT["Shared DB + distributed deploy"] -.->|"the distributed monolith trap"| BAD["All the coupling, now with network tax"]`,
    breakPoints: [
      "Split by technical layer, not domain: an 'auth service' plus 'user DB plus pipeline plus frontend service' is a network-shaped monolith.",
      "Shared database: services read each others' tables — schema coupling returns and every migration is a cross-team negotiation.",
      "Chatty synchronous fan-out: 10 services x p99 100ms means 800ms tail latency and no amount of caching fully cures topology.",
      "Big-bang rewrite alongside a strangler plan that ends up in 12 months of dual-running with no cutover schedule.",
    ],
    readNext: [
      { title: "ACID vs BASE", href: "/wiki/acid-vs-base", why: "The moment you split, cross-service atomicy is your first design problem." },
      { title: "Message Queues", href: "/wiki/message-queues", why: "The outbox/event handshake that replaces cross-database transactions." },
    ],
  },
  {
    moduleId: "observability-tracing",
    plainWords:
      "Metrics are the weather summary, logs the incident report, traces the GPS recording. A burn rate tells you when the fuel runs out if you keep flying exactly like this — that is when you sound the alarm.",
    mermaid: `flowchart LR
  SP["Spans: HTTP, DB, queue hops"] --> COL["OTel collector"]
  COL --> TAIL{"Tail sampling"}
  TAIL -->|"errors + p99 slow at 100 pct"| KEEP["Keep interesting traces"]
  TAIL -->|"clean paths head 1-10 pct"| LIGHT["Sample the boring ones"]
  KEEP --> SEG["Trace backend + exemplars linked to metrics"]
  GOOD["Golden signals: rate, errors, duration"] --> BR{"SLO burn rate"}
  BR -->|"fast burn"| PAGE["Page now: budget gone in hours"]
  BR -->|"slow burn"| TICKET["Ticket for the next business day"]`,
    breakPoints: [
      "Cardinality bombs: user id or raw path in metric labels — the TSDB dies or the bill explodes, usually both quietly.",
      "Head sampling at 1 percent: the one trace from the black-swan error was 99 percent likely to be dropped.",
      "Dashboards averaging p99: 'looks fine' while the tail is 3 seconds; alert on the SLO, not the mean.",
      "Alerts on causes (CPU high) instead of symptoms (checkout SLO burning): pages fire for harmless noise, real incidents page nobody.",
    ],
    readNext: [
      { title: "Rate Limiting", href: "/wiki/rate-limiting", why: "The budget you alert on and the request budgets you enforce belong to the same SLO math." },
      { title: "Load Balancing", href: "/wiki/load-balancing", why: "LB routing decisions should come from p95 and error rates, not averages." },
    ],
  },
];

export const CONCEPT_FLOW_IDS: string[] = CONCEPT_FLOWS.map((f) => f.moduleId);

export const CONCEPT_FLOW_MAP: Record<string, ConceptFlow> = Object.fromEntries(
  CONCEPT_FLOWS.map((f) => [f.moduleId, f]),
);

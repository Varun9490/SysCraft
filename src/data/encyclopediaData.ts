import type { EncyclopediaModule } from "@/types/encyclopedia";

/**
 * Visual Almanac: 19 deep-dive system design modules.
 * Each module pairs a long-form Markdown lesson with trade-off matrices,
 * an interactive visualizer hook, FSRS flashcards, and scenario quizzes.
 */

export const ENCYCLOPEDIA_MODULES: EncyclopediaModule[] = [
  {
    id: "consistent-hashing",
    title: "Consistent Hashing & Rendezvous",
    difficulty: "foundations",
    estimatedMinutes: 26,
    summary: "Spread keys evenly across a changing fleet with minimal reshuffling when nodes join or leave.",
    bodyMarkdown: "# Consistent Hashing & Rendezvous\n\nMap both keys and servers onto a shared hash ring so that a membership change reshuffles only one node's slice of the keyspace instead of renumbering everything.\n\n## Why modulo hashing breaks\n\nWith server = hash(key) mod N, every change to N renumbers almost all buckets. Going from 10 nodes to 11 remaps roughly 90 percent of keys: every cache lookup misses, every shard move becomes a full copy. Consistent hashing replaces the modulo with a ring, so a single membership event touches only about K/N keys.\n\n## The ring, precisely\n\n1. Hash each physical node onto a circle of 2^32 positions (Murmur3, xxHash, or truncated SHA-256).\n2. Hash each key with the same function.\n3. Walk clockwise from the key position to the first node token; that node owns the key.\n4. For durability, replicate to the next R distinct physical nodes clockwise.\n\nWhen a node joins it steals an arc from its clockwise successor; when it leaves, its arc passes to that successor. With N nodes and K keys, expected moves per event converge to K/N.\n\n## Virtual nodes\n\nOne token per node produces wildly uneven arcs at small N - the classic simulator demo where one of five servers owns 40 percent of the ring. Splitting each physical node into V tokens (128-256 is typical) averages many small arcs instead of one big one, and lets heterogeneous hardware carry proportional token counts.\n\n| Nodes | Vnodes each | Arc spread (p99/p50) | Verdict |\n| --- | --- | --- | --- |\n| 5 | 1 | 5-10x | Unusable for caches |\n| 5 | 128 | about 1.3x | Fine for most caches |\n| 100 | 256 | about 1.05x | Near-perfect spread |\n\n## Rendezvous (HRW) hashing\n\nAn alternative with zero ring state: score every node with hash(key, nodeId) and pick the maximum. One node moving only reassigns the keys that scored it highest - the same K/N property - and clients need nothing but the node list. Use a ring when servers need token ranges for range queries and repair; use rendezvous when clients are stateless and the topology is small.\n\n## Failure handling and membership\n\n- Replicate each key to the next R distinct nodes; on failure the successor already holds a copy, so failover is a pointer move.\n- Agree on membership through gossip (Cassandra, Consul) or a coordination service (etcd); two partitions must never disagree about ring order for long.\n- Health-check with hysteresis. Flapping membership churns vnodes and doubles move traffic for no availability gain.\n\n## Hot keys and skew\n\nHashing spreads keys, not load. One viral key still lands on one arc. Escalation order:\n\n1. Client-side or edge caching for read-heavy hot keys.\n2. Key salting (hotkey#1..#N) with scatter-gather reads merged at the client.\n3. Isolation: give the celebrity path its own shard class or dedicated tier.\n\n## Production numbers\n\n- Cassandra and Dynamo-style stores: Murmur3, 256 vnodes, RF=3 typical.\n- Redis Cluster: 16384 fixed slots via CRC16 - a fixed ring rebalanced explicitly.\n- Envoy and NGINX ring-hash LBs: bounded-load variants reroute to the next host when one target exceeds roughly twice its fair share.\n\n## Try it in the canvas\n\nBuild rate_limiter then rest_service then a redis_cache farm, start the simulation, and delete one cache node mid-run: watch p99 recover as only that node's arc remaps to successors.",
    tradeOffs: [
      { dimension: "Ring vs modulo hashing", optionA: "Consistent ring", optionB: "mod N", recommendation: "Ring for elastic fleets; mod N only for fixed shards." },
      { dimension: "Vnode count", optionA: "256 vnodes", optionB: "8 vnodes", recommendation: "128+ vnodes for even spread on small fleets." },
    ],
    interactiveVisual: "consistent_hash_ring",
    flashcards: [
      { cardId: "ch-1", front: "What fraction of keys move when 1 of N nodes leaves a consistent ring?", back: "Roughly 1/N (only the departing node's arc reassigns).", conceptTag: "consistent-hashing", moduleId: "consistent-hashing" },
      { cardId: "ch-2", front: "Why use virtual nodes?", back: "To even out arc sizes and give bigger machines proportionally more tokens.", conceptTag: "consistent-hashing", moduleId: "consistent-hashing" },
    ],
    quiz: [
      {
        id: "ch-q1",
        prompt: "A 10-node cache ring loses 1 node. Roughly how many keys remap?",
        options: [
          { id: "a", text: "About 10 percent", correct: true },
          { id: "b", text: "About 50 percent", correct: false },
          { id: "c", text: "About 90 percent", correct: false },
          { id: "d", text: "All keys", correct: false },
        ],
        explanation: "Only the failed node's arc (1/N) reassigns to successors.",
        conceptTag: "consistent-hashing",
      },
      {
        id: "ch-q2",
        prompt: "Which fix best heals a hot key hammering one ring arc?",
        options: [
          { id: "a", text: "Add more vnodes to every node", correct: false },
          { id: "b", text: "Split the hot key with suffix salting + scatter-gather", correct: true },
          { id: "c", text: "Shorten DNS TTL", correct: false },
          { id: "d", text: "Switch to modulo hashing", correct: false },
        ],
        explanation: "Key splitting spreads a single hot key across arcs.",
        conceptTag: "consistent-hashing",
      },
    ],
    keyNumbers: [
      { value: "1/N", label: "Keys that move on a membership change", note: "Only the arc touching the node reassigns — not the whole keyspace." },
      { value: "128-256", label: "Virtual nodes per physical node", note: "Averages many small arcs so no server owns a huge slice." },
      { value: "~1.05x", label: "P99/P50 arc spread at 100 nodes × 256 vnodes", note: "Near-perfect load balance; 1 token per node is 5-10x at 5 nodes." },
    ],
    relatedModuleIds: ["sharding-partitioning", "gossip-protocol"],
  },
  {
    id: "cap-theorem",
    title: "CAP, PACELC & Latency Trade-offs",
    difficulty: "foundations",
    estimatedMinutes: 21,
    summary: "Why partitions force a consistency-availability choice, and how PACELC extends the trade-off to healthy networks.",
    bodyMarkdown: "# CAP, PACELC & Latency Trade-offs\n\nDuring a network partition a distributed system must choose between consistency (refusing some requests) and availability (serving and diverging); PACELC adds that even on a healthy network you trade latency for consistency.\n\n## The theorem, stated honestly\n\nCAP says: when a partition occurs, a system cannot be both linearizable and available for every request. It does not say pick two of three forever - partitions are rare, so the real question is what happens during one, and what you pay the rest of the time. PACELC formalizes that: if Partition then Availability or Consistency, Else Latency or Consistency.\n\n## What consistency actually means\n\nConsistency in CAP means linearizability: every read sees the latest acknowledged write, from any replica. That is the strongest, most expensive point on the spectrum. Weaker models (read-your-writes, monotonic reads, snapshot isolation, eventual) each buy latency or availability in exchange for visible staleness. Most production systems sit at quorum reads with formal or informal session guarantees rather than full linearizability.\n\n## Quorum arithmetic\n\nWith N replicas, R read acks and W write acks: if R + W > N you intersect at least one node for strong-ish consistency.\n\n| N | W | R | Behavior |\n| --- | --- | --- | --- |\n| 3 | 2 | 2 | Strong; survives 1 node down |\n| 3 | 3 | 1 | Write-optimized; read from any, still linearizable with sync replicas |\n| 3 | 1 | 1 | Fast and divergent; last-writer-wins conflicts possible |\n| 5 | 3 | 3 | Cross-region strong; tolerates 2 failures |\n\n## Systems in the wild\n\n- CP: etcd, ZooKeeper, CockroachDB default, HBase, Spanner (with TrueTime waits).\n- AP: Cassandra at CL=ONE, DynamoDB eventually-consistent reads, Riak.\n- Tunable: DynamoDB, Cassandra, Cosmos DB - you pick per request class.\n\n## Mistakes that cause outages\n\n- Treating \"eventually consistent\" as \"free\": reconciliation runs must be designed, monitored, and bounded.\n- Mixing read and write quorums without budgeting for retries: one timed-out replica turns a 2 of 3 write into a 3 of 3 slow path.\n- Using an AP store for inventory, then discovering oversell during the next reconciliation.\n\n## Design rule\n\nPut money, inventory, and identity on CP or quorum paths. Put feeds, likes, presence, and telemetry on AP with bounded staleness. Never promise CA across regions - partitions always happen, and the only question is whether your behavior is chosen or accidental.\n\n## Try it in the canvas\n\nSimulate a region as a second Zone: cut its link mid-run and watch a CP database's write queue stall while an AP cache keeps serving reads.",
    tradeOffs: [
      { dimension: "CP vs AP", optionA: "CP (refuse on partition)", optionB: "AP (diverge + repair)", recommendation: "CP for money/inventory, AP for feeds/carts." },
      { dimension: "Latency vs consistency", optionA: "ONE (1 RTT)", optionB: "QUORUM (2 RTTs)", recommendation: "QUORUM for durable writes." },
    ],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "cap-1", front: "State CAP in one sentence.", back: "During a partition, a system is either consistent or available, not both.", conceptTag: "cap", moduleId: "cap-theorem" },
      { cardId: "cap-2", front: "What does the LC in PACELC add?", back: "Latency vs Consistency trade-off when the network is healthy.", conceptTag: "cap", moduleId: "cap-theorem" },
    ],
    quiz: [
      {
        id: "cap-q1",
        prompt: "Checkout inventory decrement during a partition should be?",
        options: [
          { id: "a", text: "CP: refuse minority writes to avoid oversell", correct: true },
          { id: "b", text: "AP: accept all writes blindly", correct: false },
          { id: "c", text: "Serve from CDN cache", correct: false },
        ],
        explanation: "Oversell is irreversible; consistency beats availability here.",
        conceptTag: "cap",
      },
      {
        id: "cap-q2",
        prompt: "PACELC says a healthy system still trades what?",
        options: [
          { id: "a", text: "Latency against consistency", correct: true },
          { id: "b", text: "CPU against RAM", correct: false },
          { id: "c", text: "Cost against headcount", correct: false },
        ],
        explanation: "Stronger consistency costs extra replica round trips.",
        conceptTag: "cap",
      },
    ],
    keyNumbers: [
      { value: "R + W > N", label: "The quorum overlap rule", note: "Guarantees at least one live replica saw the latest acknowledged write." },
      { value: "2 RTTs", label: "QUORUM writes vs 1 for local reads", note: "Every consistency level up costs a replica round trip." },
      { value: "~80 ms", label: "Cross-region RTT (us-east ↔ eu-west)", note: "Sync replication stalls writes by roughly this much." },
    ],
    relatedModuleIds: ["acid-vs-base", "replication"],
  },
  {
    id: "raft-consensus",
    title: "Raft Consensus & Leader Election",
    difficulty: "advanced",
    estimatedMinutes: 32,
    summary: "How Raft elects leaders, replicates logs, and stays writable through minority failures.",
    bodyMarkdown: "# Raft Consensus\n\nRaft keeps a replicated log identical across a cluster by electing one leader per term, funneling all writes through it, and requiring a majority before anything is committed.\n\n## The three sub-problems\n\n1. Leader election: followers with no heartbeat become candidates, bump the term, and request votes. A candidate needs a majority.\n2. Log replication: the leader appends client entries and replicates them; entries commit once a majority has acknowledged them in the leader's term.\n3. Safety: voting rules and the commit rule guarantee that any committed entry is present in every future leader's log.\n\n## Leader election in detail\n\nEach follower runs an election timeout (randomized 150-300ms in etcd; too tight causes constant churn, too loose lengthens failover). On timeout it becomes a candidate, increments the term, votes for itself, and asks everyone else. Granted votes require a candidate whose log is at least as up to date. A term with no majority winner simply times out and retries with a new term.\n\n## Replication and the commit rule\n\nClients write to the leader only. The leader appends to its log and ships entries to followers; when a majority stores an entry, it is committed and applied to the state machine. The subtle rule: a leader only commits entries from its own term by counting replicas - older-term entries commit indirectly once a current-term entry commits. This is the trap that naive Raft implementations get wrong and that causes lost-write bugs during leadership changes.\n\n## Reads and leases\n\nCommitted does not mean the leader knows it is still leader. Correct linearizable reads require either routing reads through the log or a lease: the leader holds a time-bounded grant, so it can answer reads without a quorum round trip. Lease reads are how etcd serves tens of thousands of reads per second without copying the log for each.\n\n## Membership changes and snapshots\n\n- Cluster membership changes use the single-server-change rule (one addition/removal at a time) or joint consensus; both avoid two majorities disagreeing.\n- The log grows forever, so leaders snapshot the state machine and truncate the prefix, shipping snapshots to lagging followers.\n\n## Failure modes to watch\n\n- Disk fsync latency spikes turn into missed heartbeats and surprise elections.\n- Asymmetric partitions can isolate the leader with a stale lease - keep lease durations much smaller than expected GC pauses.\n- Snapshot transfer competes with client traffic; rate-limit it.\n\n## Production numbers\n\n- etcd: 3 or 5 members, tens of thousands of writes per second, p99 fsync-bound.\n- Consul (also Raft) and CockroachDB (per-range Raft groups) reuse the same core.\n\n## Try it in the canvas\n\nModel a k8s_cluster plus postgres_db primary: pause the DB node (dependency_down chaos) and watch the write path fail over rather than silently diverge.",
    tradeOffs: [
      { dimension: "Raft vs multi-leader", optionA: "Raft single leader", optionB: "Multi-leader CRDT", recommendation: "Raft for linearizable control planes; CRDT for offline-first data." },
      { dimension: "Read path", optionA: "Leader lease reads", optionB: "Quorum reads", recommendation: "Lease reads in-region, quorum across regions." },
    ],
    interactiveVisual: "raft_election",
    flashcards: [
      { cardId: "raft-1", front: "How many nodes must ack to commit in a 5-node Raft group?", back: "3 — a majority quorum.", conceptTag: "raft", moduleId: "raft-consensus" },
      { cardId: "raft-2", front: "Why randomized election timeouts?", back: "To avoid repeated split votes so one candidate wins quickly.", conceptTag: "raft", moduleId: "raft-consensus" },
    ],
    quiz: [
      {
        id: "raft-q1",
        prompt: "A 5-node Raft cluster loses 2 nodes. Can it still elect a leader?",
        options: [
          { id: "a", text: "Yes, 3 remain which is a majority", correct: true },
          { id: "b", text: "No, it needs all 5", correct: false },
          { id: "c", text: "Only with manual intervention", correct: false },
        ],
        explanation: "Raft survives minority loss; 3/5 still forms quorum.",
        conceptTag: "raft",
      },
      {
        id: "raft-q2",
        prompt: "How does a new leader guarantee it has all committed entries?",
        options: [
          { id: "a", text: "It won a majority vote, and every commit reached a majority", correct: true },
          { id: "b", text: "It replays the full snapshot", correct: false },
          { id: "c", text: "Followers push their logs to it", correct: false },
        ],
        explanation: "Quorum intersection ensures the leader saw every commit.",
        conceptTag: "raft",
      },
    ],
    keyNumbers: [
      { value: "3 of 5", label: "Majority needed to elect or commit", note: "Fail fewer than floor((N-1)/2) nodes and the group keeps running." },
      { value: "150-300 ms", label: "Randomized election timeout window (etcd)", note: "Too tight causes churn; too loose lengthens failover." },
      { value: "2 RTTs → 1", label: "Quorum reads vs leader-lease reads", note: "Leases drop one round trip but rely on a bounded clock grant." },
    ],
    relatedModuleIds: ["cap-theorem", "replication"],
  },
  {
    id: "btree-vs-lsm",
    title: "B-Trees vs LSM-Trees",
    difficulty: "intermediate",
    estimatedMinutes: 28,
    summary: "Random-write amplification in B-trees versus write-friendly LSM buffering with compaction debt.",
    bodyMarkdown: "# B-Trees vs LSM Trees\n\nB-trees update pages in place for predictable reads; LSM trees buffer writes in memory and merge sorted runs on disk for write throughput - the choice decides which workload your storage engine is good at.\n\n## B-tree anatomy\n\nA B+-tree stores keys in fixed-size pages (often 8-16KB), usually 100-500 entries per page, with a fanout so wide that three or four levels cover billions of rows. Reads walk root to leaf - typically 3-4 random page reads, p99 around 1-10ms on NVMe. Writes update the leaf page and, if it splits, propagate upward; a write-ahead log makes each mutation durable before pages are touched. Postgres, MySQL InnoDB, and SQL Server all live here.\n\n## LSM anatomy\n\nAn LSM tree turns random writes into sequential ones:\n\n1. Writes land in a memtable (skiplist) plus a WAL.\n2. The memtable flushes to an immutable sorted table (SSTable) on disk.\n3. Background compaction merges SSTables level by level, dropping overwritten keys and tombstones.\n4. Reads consult memtable, then each level (with Bloom filters to skip files).\n\nRocksDB, LevelDB, Cassandra, ScyllaDB, and HBase are LSM engines.\n\n## The three amplification costs\n\n| Metric | B-tree | LSM |\n| --- | --- | --- |\n| Write amplification | High (page rewrites) | High but tunable (compaction) |\n| Read amplification | Low, fixed (~1 file) | Level count (Bloom filters cut it) |\n| Space amplification | Pages half-full worst case | Up to ~2x before compaction |\n\nEvery engine picks where to pay: leveled compaction minimizes space and read amplification at high write cost; size-tiered compaction is cheap to write but needs more temporary space.\n\n## Which to pick\n\n- Read-mostly OLTP with strong transactions: B-tree (Postgres, InnoDB).\n- Write-heavy ingest (metrics, events, time series): LSM (RocksDB, ClickHouse MergeTree, ScyllaDB).\n- Mixed with big value sizes: LSM with a value separation strategy, or B-tree with careful fill factor.\n\n## Operational realities\n\n- LSM compaction competes with query traffic for IO - throttle it (RocksDB rate limiter) or latency spikes arrive in waves.\n- Tomstones mean \"deleted\" data lingers until compaction; TTLs must be set with that in mind.\n- B-tree pages fill randomly; monitoring bloat and using fillfactor for append-only keys keeps them dense.\n\n## Try it in the canvas\n\nPlace a write-heavy kafka_stream feeding both a postgres_db and a cassandra_store; gen the traffic surge chaos and compare p99 under identical load.",
    tradeOffs: [
      { dimension: "Write throughput", optionA: "LSM (buffered)", optionB: "B-tree (in-place)", recommendation: "LSM for sustained write streams." },
      { dimension: "Read tail latency", optionA: "B-tree (stable)", optionB: "LSM (compaction jitter)", recommendation: "B-tree for strict p99 reads." },
    ],
    interactiveVisual: "btree_vs_lsm",
    flashcards: [
      { cardId: "lsm-1", front: "Why do LSM writes beat B-tree writes?", back: "Sequential memtable appends avoid random page I/O.", conceptTag: "storage-engines", moduleId: "btree-vs-lsm" },
      { cardId: "lsm-2", front: "What causes LSM p99 spikes?", back: "Background compaction competing for disk and CPU.", conceptTag: "storage-engines", moduleId: "btree-vs-lsm" },
    ],
    quiz: [
      {
        id: "lsm-q1",
        prompt: "Which workload favors LSM-trees?",
        options: [
          { id: "a", text: "10:1 write-heavy event ingestion", correct: true },
          { id: "b", text: "Strict serializable banking ledger", correct: false },
          { id: "c", text: "Rarely-written config table", correct: false },
        ],
        explanation: "LSM absorbs sequential write floods cheaply.",
        conceptTag: "storage-engines",
      },
      {
        id: "lsm-q2",
        prompt: "How do LSM reads skip irrelevant SSTables?",
        options: [
          { id: "a", text: "Per-file bloom filters", correct: true },
          { id: "b", text: "DNS caching", correct: false },
          { id: "c", text: "Longer TTLs", correct: false },
        ],
        explanation: "Bloom filters prove a key is absent without disk I/O.",
        conceptTag: "storage-engines",
      },
    ],
    keyNumbers: [
      { value: "3-4", label: "Page reads per B-tree point lookup", note: "P99 lands around 1-10 ms on NVMe — stable but read-bound." },
      { value: "≈4x", label: "Typical leveled-compaction write amplification", note: "Each byte written is rewritten several times by merges." },
      { value: "≤2x", label: "LSM space amplification before compaction", note: "Tombstones and overwritten keys linger until merged away." },
    ],
    relatedModuleIds: ["sharding-partitioning", "bloom-filters"],
  },
  {
    id: "caching-strategies",
    title: "Caching: Aside, Through & Coherence",
    difficulty: "foundations",
    estimatedMinutes: 24,
    summary: "Cache-aside, read/write-through, stampede protection, and invalidation patterns that hold 90 percent hit ratios.",
    bodyMarkdown: "# Caching Strategies\n\nA cache is a bet that a small, hot slice of data serves most traffic; strategy decides how that slice is filled, kept fresh, and protected when it is wrong.\n\n## The four classic patterns\n\n1. Cache-aside (lazy): the app checks the cache, on miss reads the source of truth, then writes the value with a TTL. Simplest, most common, and the default choice for read-heavy systems.\n2. Read-through: the cache itself fetches on miss; same semantics, less app code, needs a loader hook.\n3. Write-through: writes go to the cache and the store synchronously. Fresh reads, doubled write latency.\n4. Write-behind: writes hit the cache and flush to the store asynchronously. Fast writes, risk of loss on crash - only with a durable queue.\n\n## Keeping it honest\n\n- TTLs need jitter: identical expirations cause thundering herds. TTL + random(0, 10 percent) spreads reloads.\n- Stampede protection: singleflight or a short lock so one key is recomputed once, not N times; or serve stale while one worker refreshes (stale-while-revalidate).\n- Invalidate on write when freshness matters: delete the key, do not write the new value, to avoid lost-update races between concurrent writers.\n\n## Eviction policy\n\n| Policy | Strength | Pays for | Weakness |\n| --- | --- | --- | --- |\n| LRU | Recency skew | Sweep cost | Scans evict hot set |\n| LFU | Frequency skew | Aging counters | Stale popularity |\n| 2Q / SLRU | Scan-resistant | Slightly more state | Complexity |\n| TinyLFU (W-TinyLFU) | Best hit ratio in caches like Caffeine | Sketch memory | Newer, fewer knobs |\n\n## Hit ratio math\n\nLatency and capacity follow the hit ratio almost linearly: going from 90 percent to 99 percent hit ratio cuts backend load 10x. Before adding a cache tier, estimate the load curve: if the hot set does not fit memory, a cache only reshuffles misses. Measure with a trace replay, not a guess.\n\n## Consistency pitfalls\n\n- Cache-aside + delete-on-write still has a race (read repopulates a stale value). Dual-delete or short TTLs bound the damage.\n- Sessions and auth decisions belong in a consistent store or signed tokens, not in a plain LRU - eviction becomes a security event.\n\n## Production numbers\n\n- Redis single node: 100k+ ops/s at sub-ms p50; cluster mode shards by hash slot.\n- Memcached: multi-threaded, pure memory, no persistence - great for big value sets.\n- CDN edge caches hold on the order of 10k-100k objects per PoP; origin shield adds a second tier.\n\n## Try it in the canvas\n\nWire an api_gateway to a redis_cache ahead of rest_service, run 5k rps, and watch p99 drop by an order of magnitude - then remove the cache and watch it climb back.",
    tradeOffs: [
      { dimension: "Aside vs through", optionA: "Cache-aside", optionB: "Write-through", recommendation: "Aside by default; through for reference data." },
      { dimension: "TTL vs versioning", optionA: "TTL expiry", optionB: "Versioned keys", recommendation: "Versioned keys for instant purge." },
    ],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "cache-1", front: "What is a cache stampede?", back: "Many concurrent misses stampeding the DB for the same key.", conceptTag: "caching", moduleId: "caching-strategies" },
      { cardId: "cache-2", front: "How does single-flight help?", back: "One filler query serves all concurrent waiters.", conceptTag: "caching", moduleId: "caching-strategies" },
    ],
    quiz: [
      {
        id: "cache-q1",
        prompt: "Best invalidation for user profile updates?",
        options: [
          { id: "a", text: "Versioned key bump (v42 -> v43)", correct: true },
          { id: "b", text: "Wait 24h for TTL", correct: false },
          { id: "c", text: "Restart Redis", correct: false },
        ],
        explanation: "Version bumps invalidate instantly without flushing.",
        conceptTag: "caching",
      },
      {
        id: "cache-q2",
        prompt: "Hit ratio rises 80 to 95 percent. DB load changes how?",
        options: [
          { id: "a", text: "Miss rate falls 20 to 5 percent: 4x less DB load", correct: true },
          { id: "b", text: "No change", correct: false },
          { id: "c", text: "DB load doubles", correct: false },
        ],
        explanation: "DB sees only misses: 0.20 -> 0.05 is a 4x cut.",
        conceptTag: "caching",
      },
    ],
    keyNumbers: [
      { value: "10x", label: "Backend load cut from 90% → 99% hit ratio", note: "Misses are what backends serve: 0.10 → 0.01." },
      { value: "+10%", label: "Random TTL jitter added to expirations", note: "Identical TTLs thundering-herd the origin on expiry." },
      { value: "4x", label: "DB load cut from 80% → 95% hit ratio", note: "0.20 → 0.05 miss rate — linear inverse math." },
    ],
    relatedModuleIds: ["load-balancing", "sharding-partitioning"],
  },
  {
    id: "load-balancing",
    title: "Load Balancing & Autoscaling Signals",
    difficulty: "foundations",
    estimatedMinutes: 22,
    summary: "L4/L7 algorithms, health checks, connection draining, and scaling on queue age instead of CPU alone.",
    bodyMarkdown: "# Load Balancing\n\nA load balancer turns many backends into one address, chooses where each request lands, and hides failures - the choice of algorithm decides tail latency more than the choice of hardware.\n\n## L4 vs L7\n\n- L4 (transport): TCP/UDP flows by IP and port. Fast, protocol-agnostic, cannot see paths or headers. Great for TLS pass-through and raw throughput.\n- L7 (application): parses HTTP. Can route by path, header, method, cookie; can retry, inject headers, and enforce per-route policies. Costs more CPU per request.\n\nMost stacks use both: an L4 tier for DDoS absorption and TLS termination, then L7 for routing.\n\n## Algorithms and when they win\n\n| Algorithm | Best for | Failure mode |\n| --- | --- | --- |\n| Round robin | Homogeneous servers, cheap requests | Stragglers get full share |\n| Least connections | Uneven request durations | Prefers a fresh, cold node |\n| EWMA (latency-aware) | Mixed latency | Slow convergence after deploys |\n| Power-of-two-choices (P2C) | Near-optimal tail at low cost | Needs two probes per pick |\n| Consistent hash | Session/partition affinity | Hot keys, node churn |\n\nP2C is the default winner in modern mesh LBs: pick two random backends, send to the one with fewer inflight requests, get almost all the benefit of perfect queue-aware balancing.\n\n## Health checks and slow start\n\n- Passive checks (observe real failures) catch what synthetic probes miss; active checks catch a hung node faster. Run both.\n- Eject for a bounded time (outlier ejection), then probe back in.\n- Slow start ramps new instances in over 30-90s so a cold cache and JIT do not trigger a synchronous meltdown.\n\n## Retry and timeout budgets\n\nThe rule that prevents retry storms: at most one retry at the edge, and retry budgets as a percentage of total traffic (for example 10 percent) rather than per request. Every hop that retries multiplies worst-case load; an un-budgeted cascade turns a 1 percent error into an outage.\n\n## Numbers to remember\n\n- A single modern L7 box handles 100k-1M rps depending on TLS and payload.\n- Health check intervals: 2-10s with 2-3 consecutive successes to rejoin.\n- Connection idle timeouts should exceed p99 backend latency by a margin.\n\n## Try it in the canvas\n\nPut an api_gateway in front of three rest_service replicas, apply latency_spike to one, and watch the round-robin worry while P2C-style balancing keeps p99 flat.",
    tradeOffs: [
      { dimension: "Round-robin vs least-connections", optionA: "Round-robin", optionB: "Least-connections", recommendation: "Least-connections for variable-cost requests." },
      { dimension: "CPU vs queue-age scaling", optionA: "CPU target", optionB: "Queue-age target", recommendation: "Queue age for worker fleets." },
    ],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "lb-1", front: "When does least-connections beat round-robin?", back: "When per-request cost varies widely (video vs thumbnail).", conceptTag: "load-balancing", moduleId: "load-balancing" },
      { cardId: "lb-2", front: "Why drain connections on deploy?", back: "To let in-flight requests finish instead of 5xxing.", conceptTag: "load-balancing", moduleId: "load-balancing" },
    ],
    quiz: [
      {
        id: "lb-q1",
        prompt: "Requests cost 5ms or 5s mixed. Best algorithm?",
        options: [
          { id: "a", text: "Least-connections", correct: true },
          { id: "b", text: "Strict round-robin", correct: false },
          { id: "c", text: "Random", correct: false },
        ],
        explanation: "Least-connections avoids piling slow requests on one host.",
        conceptTag: "load-balancing",
      },
      {
        id: "lb-q2",
        prompt: "Best scale signal for queue workers?",
        options: [
          { id: "a", text: "Oldest-message age", correct: true },
          { id: "b", text: "Disk free space", correct: false },
          { id: "c", text: "Uptime", correct: false },
        ],
        explanation: "Age captures user-visible delay; depth alone can mislead.",
        conceptTag: "load-balancing",
      },
    ],
    keyNumbers: [
      { value: "2 probes", label: "Power-of-two-choices per pick", note: "Near-optimal queue-aware balancing at trivial cost." },
      { value: "10%", label: "Retry budget as a share of total traffic", note: "One edge retry max; un-budgeted retries multiply outages." },
      { value: "30-90 s", label: "Slow-start ramp for new instances", note: "Cold caches + JIT on full traffic melt fresh backends." },
    ],
    relatedModuleIds: ["caching-strategies", "message-queues"],
  },
  {
    id: "message-queues",
    title: "Queues, DLQs & Backpressure",
    difficulty: "intermediate",
    estimatedMinutes: 25,
    summary: "Visibility timeouts, FIFO versus standard, poison-pill handling, and pull-based backpressure.",
    bodyMarkdown: "# Message Queues\n\nA queue decouples producer from consumer, absorbs bursts, and retries failures - at the cost of a delivery contract you must understand precisely.\n\n## Delivery semantics\n\n| Guarantee | Mechanism | Cost |\n| --- | --- | --- |\n| At-most-once | Fire and forget | Lost messages on crash |\n| At-least-once | Ack after processing | Duplicates possible |\n| Effectively-once | Idempotent consumer + dedupe keys | App-level work |\n\nTrue exactly-once does not exist network-wide; what exists is at-least-once plus idempotency, or a broker transaction that fences duplicates within one system (SQS FIFO dedupe, Kafka transactions).\n\n## Visibility timeout and leases\n\nSQS-style consumers receive a message with a visibility window (30s default, up to 12h). Long jobs need heartbeat extension or small units of work. Miss the window and the message returns to the queue and runs twice - design for it with idempotent handlers keyed by message id.\n\n## Dead letters and backoff\n\n- After N failed deliveries, route to a dead-letter queue and alert. A DLQ without alerting is just a slower way to lose data.\n- Retry with exponential backoff and jitter; cap retries per message, not per hour.\n- Poison messages must fail fast into the DLQ, not block the partition forever.\n\n## Ordering\n\nStandard queues are effectively unordered under redelivery. When order matters: FIFO queues keyed per entity (customer id), or a partitioned stream where one key maps to one partition. Global ordering is a capacity trap - it caps throughput at one worker.\n\n## Backpressure\n\nQueues hide overload until the lag grows unbounded. Monitor: depth, age of oldest message, consumer lag rate. Shed or slow producers at a configured depth instead of letting lag compound. Consumer autoscaling on lag (not CPU) is the standard fix for bursty workloads.\n\n## Numbers\n\n- SQS: 256KB max payload (use the S3 pointer pattern for larger), 3k msg/s standard per region by default.\n- RabbitMQ: ~50k msg/s per node with persistent messages; quorum queues for durability.\n- Consumers should ack small batches (10-100) - large windows turn one crash into a full redelivery storm.\n\n## Try it in the canvas\n\nFeed rest_service into a message_queue with a background_worker pool; raise arrival rate until the queue depth climbs, then scale workers and watch age stabilize.",
    tradeOffs: [
      { dimension: "Standard vs FIFO", optionA: "Standard unlimited", optionB: "FIFO ordered", recommendation: "Standard unless ordering is mandatory." },
      { dimension: "Push vs pull", optionA: "Broker push", optionB: "Consumer pull", recommendation: "Pull for natural backpressure." },
    ],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "mq-1", front: "What makes queue processing idempotent?", back: "Dedup keys so redelivered messages apply once.", conceptTag: "queues", moduleId: "message-queues" },
      { cardId: "mq-2", front: "What is a DLQ for?", back: "Quarantining poison messages after repeated failures.", conceptTag: "queues", moduleId: "message-queues" },
    ],
    quiz: [
      {
        id: "mq-q1",
        prompt: "Consumer crashes mid-job. What saves the message?",
        options: [
          { id: "a", text: "Visibility timeout expires and it reappears", correct: true },
          { id: "b", text: "It is deleted immediately", correct: false },
          { id: "c", text: "Producer resends manually", correct: false },
        ],
        explanation: "Unacknowledged messages become visible again.",
        conceptTag: "queues",
      },
      {
        id: "mq-q2",
        prompt: "When must you pick FIFO over standard?",
        options: [
          { id: "a", text: "Per-customer ordered money movements", correct: true },
          { id: "b", text: "Best-effort thumbnail jobs", correct: false },
          { id: "c", text: "Fan-out analytics", correct: false },
        ],
        explanation: "Ordering matters for ledger-like sequences.",
        conceptTag: "queues",
      },
    ],
    keyNumbers: [
      { value: "30 s", label: "Default visibility timeout (SQS)", note: "Up to 12 h; heartbeat-extend long jobs or they run twice." },
      { value: "256 KB", label: "Max payload per message", note: "Above that, store the blob in S3 and ship the pointer." },
      { value: "3-5", label: "Redeliveries before the dead-letter queue", note: "A DLQ without alerting is just a slower way to lose data." },
    ],
    relatedModuleIds: ["event-streaming", "load-balancing"],
  },
  {
    id: "event-streaming",
    title: "Event Streaming & Exactly-Once",
    difficulty: "advanced",
    estimatedMinutes: 30,
    summary: "Partitioned logs, consumer groups, watermarks, and Flink exactly-once windowed joins.",
    bodyMarkdown: "# Event Streaming\n\nA stream is an append-only log that many consumers replay independently; unlike a queue, reading does not remove data, and offsets let each consumer group move at its own pace.\n\n## The log abstraction\n\nProducers append to partitions. Each record gets a monotonically increasing offset. Consumers commit offsets, so a restart resumes exactly where it stopped. Retention is time or size based (or compacted by key for changelogs). This single design gives ordered per-partition delivery, fan-out to many readers, and replay for rebuilds.\n\n## Partitions and groups\n\n- One partition is the unit of ordering and parallelism: two consumers in a group can never read the same partition simultaneously.\n- More partitions means more parallelism but slower rebalances and more broker state; 6-12 partitions per broker is a common healthy range.\n- Rebalances (member joins/leaves) stop consumption briefly; cooperative rebalancing and static membership cut the churn.\n\n## Delivery and exactly-once\n\nDefault is at-least-once: commit after processing. Transactions (Kafka producer transactions + read-process-write txn ids) give consumer-side exactly-once within Kafka, but external side effects (HTTP calls, DB writes) still need idempotency keys. EOS ends at your system boundary.\n\n## Schema and evolution\n\nEvents are contracts: enforce a schema registry, use backward-compatible changes (add fields with defaults, never reuse names), and treat delete/rename as breaking. Compaction plus tombstones gives you a durable \"latest value per key\" changelog - the backbone of stream processor state.\n\n## Operations and numbers\n\n- Kafka: millions of msg/s per cluster on commodity hardware; single-partition throughput caps per consumer thread (10k-100k msg/s depending on payload).\n- Set replica lag alerts on broker fetch lag, not just consumer lag.\n- Disk sizing: retention GB per day x days x replication factor - the most commonly underestimated number.\n- Tiered storage moves cold segments to object storage and decouples retention from broker disk.\n\n## Failure modes\n\n- A slow consumer one partition behind holds the whole group's progress metrics; monitor per-partition, not just group average.\n- Long processing without max.poll.interval tuning causes rebalance loops - the classic \"consumer keeps dying\" incident.\n- Cross-region replication tools (MirrorMaker) are eventually consistent; document which side is authoritative.\n\n## Try it in the canvas\n\nAttach a k8s_deployment consumer group to a kafka_stream, inject packet_loss, and watch consumer lag climb while producer throughput stays flat.",
    tradeOffs: [
      { dimension: "Log vs queue", optionA: "Kafka log (replayable)", optionB: "SQS queue (simple)", recommendation: "Log for replay and joins; queue for simple tasks." },
      { dimension: "Event vs processing time", optionA: "Event-time", optionB: "Processing-time", recommendation: "Event-time for billing-correct windows." },
    ],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "es-1", front: "What is the unit of Kafka parallelism and ordering?", back: "The partition.", conceptTag: "streaming", moduleId: "event-streaming" },
      { cardId: "es-2", front: "What do watermarks handle?", back: "Late-arriving events in event-time windows.", conceptTag: "streaming", moduleId: "event-streaming" },
    ],
    quiz: [
      {
        id: "es-q1",
        prompt: "You need to rebuild a projection after a bug. What helps?",
        options: [
          { id: "a", text: "Replay the retained log from offset 0", correct: true },
          { id: "b", text: "Ask producers to resend manually", correct: false },
          { id: "c", text: "Restore from CDN", correct: false },
        ],
        explanation: "Logs retain history precisely for replays.",
        conceptTag: "streaming",
      },
      {
        id: "es-q2",
        prompt: "Exactly-once in Kafka requires?",
        options: [
          { id: "a", text: "Idempotent producer + transactions", correct: true },
          { id: "b", text: "Longer TTLs", correct: false },
          { id: "c", text: "Bigger instances only", correct: false },
        ],
        explanation: "Transactions dedup across retries and partitions.",
        conceptTag: "streaming",
      },
    ],
    keyNumbers: [
      { value: "10k-100k", label: "Messages/s per partition per consumer thread", note: "Payload-dependent; partitions are the scaling unit." },
      { value: "6-12", label: "Healthy partitions per broker", note: "More parallelism vs slower rebalances and more broker state." },
      { value: "days × RF", label: "Disk = retention GB/day × days × replication factor", note: "The most commonly underestimated storage plan." },
    ],
    relatedModuleIds: ["message-queues", "sharding-partitioning"],
  },
  {
    id: "sharding-partitioning",
    title: "Sharding & Hot-Key Surgery",
    difficulty: "intermediate",
    estimatedMinutes: 27,
    summary: "Shard-key selection, scatter-gather, celebrity-key splitting, and painless resharding.",
    bodyMarkdown: "# Sharding & Partitioning\n\nSharding splits one logical dataset across independent storage units so size and throughput scale horizontally - the hard parts are choosing the split key and moving data when the split is wrong.\n\n## Strategies\n\n- Range partitioning: contiguous key ranges. Great for range scans and time series; rain risk is hotspots on the newest range.\n- Hash partitioning: uniform spread by hashing the key; destroys locality and range queries.\n- Directory / lookup: an explicit mapping (like a routing table or Vitess keyspace) from key to shard. Most flexible, adds a hop and a component to keep available.\n\n## Choosing a shard key\n\nAsk three questions:\n\n1. Cardinality: high enough to share load (user id yes, country no).\n2. Skew: avoid monotonic keys at ingest unless they are hashed or salted - sequential ids put all writes on the max shard.\n3. Query shape: can 95 percent of requests hit one shard? Multi-shard scatter-gather costs fanout x tail latency.\n\nThe classic cautionary tale: shard by user, then realize analytics needs every user - build the analytics path as a separate denormalized store instead of fanning out.\n\n## Rebalancing without pain\n\n- Fixed number of partitions (much larger than nodes, e.g. 10x) lets you move whole partitions and reassign to new nodes; MongoDB and Kafka both work this way.\n- Double sharding (shard count doubles over time) makes moves predictable.\n- Live migration needs dual reads or a versioned write fence: write a \"moving\" flag, copy, replay the delta, flip the pointer, delete.\n\n## Cross-shard operations\n\n- Scatter-gather reads: fan out, merge client-side; p99 is the slowest shard, so keep fanout small.\n- Distributed transactions: prefer per-shard transactions plus idempotent workflows over 2PC; if 2PC is unavoidable, keep participants minimal and coordinators highly available.\n- Secondary indexes: local (per shard) is cheap to write, expensive to query everywhere; global is the reverse.\n\n## Numbers and systems\n\n- PostgreSQL alone to a few TB per node; beyond that, Citus or app-level sharding.\n- Vitess (MySQL) manages thousands of shards with a proxy tier and online resharding workflows.\n- NoSQL defaults: Mongo chooses a hashed shard key for even spread; Cassandra's token ranges are the shard.\n\n## Try it in the canvas\n\nModel two postgres_db shards behind a rest_service router; send a traffic_surge and watch one shard saturate when the key distribution is hot.",
    tradeOffs: [
      { dimension: "Hash vs range", optionA: "Hash (even)", optionB: "Range (scannable)", recommendation: "Hash for KV, range for time scans." },
      { dimension: "Shard count", optionA: "Many small", optionB: "Few large", recommendation: "Many small for fast rebalancing." },
    ],
    interactiveVisual: "consistent_hash_ring",
    flashcards: [
      { cardId: "sh-1", front: "Traits of a good shard key?", back: "High cardinality, even spread, query-aligned.", conceptTag: "sharding", moduleId: "sharding-partitioning" },
      { cardId: "sh-2", front: "Fix for a viral hot key?", back: "Suffix-split the key and scatter-gather reads.", conceptTag: "sharding", moduleId: "sharding-partitioning" },
    ],
    quiz: [
      {
        id: "sh-q1",
        prompt: "Best shard key for a chat store?",
        options: [
          { id: "a", text: "conversation_id hash", correct: true },
          { id: "b", text: "country code (5 values)", correct: false },
          { id: "c", text: "boolean is_pinned", correct: false },
        ],
        explanation: "High cardinality and query-aligned.",
        conceptTag: "sharding",
      },
      {
        id: "sh-q2",
        prompt: "Shard size best practice?",
        options: [
          { id: "a", text: "Keep under ~100 GB for fast moves", correct: true },
          { id: "b", text: "Grow to 5 TB per shard", correct: false },
          { id: "c", text: "One shard total", correct: false },
        ],
        explanation: "Small shards rebalance and recover quickly.",
        conceptTag: "sharding",
      },
    ],
    keyNumbers: [
      { value: "<100 GB", label: "Target shard size for fast moves", note: "Small shards reassign, rebuild, and recover quickly." },
      { value: "10x", label: "Partitions vs physical nodes", note: "Move whole partitions to new nodes instead of splitting data." },
      { value: "≤3", label: "Scatter-gather fanout that protects p99", note: "Every extra shard multiplies tail latency, not median." },
    ],
    relatedModuleIds: ["consistent-hashing", "replication"],
  },
  {
    id: "replication",
    title: "Replication: Sync, Async & Quorums",
    difficulty: "intermediate",
    estimatedMinutes: 23,
    summary: "Leader-follower replication, quorum math, failover fencing, and zero-RPO patterns.",
    bodyMarkdown: "# Replication\n\nReplication keeps copies of data on multiple nodes for durability, read scale, and failover - the design question is who accepts writes and how far behind reads are allowed to be.\n\n## Topologies\n\n| Topology | Writes | Read scale | Conflict cost |\n| --- | --- | --- | --- |\n| Single-leader async | 1 node | Any replica | Failover lag/loss window |\n| Single-leader sync | 1 node | Any replica | Write latency = slowest live replica |\n| Multi-leader | Many | Local reads | Conflict resolution needed |\n| Leaderless quorum | Any W | Any R with R+W>N | Anti-entropy repair |\n\nSemi-synchronous (one sync ack, rest async) is the common production compromise: no loss on a single failure, no latency cliff on average.\n\n## Replication lag and its symptoms\n\nLag is not just \"stale reads\" - it produces specific anomalies with specific fixes:\n\n- Read-your-writes: a user writes then reads and misses. Fix: route a user's reads to the leader for a window, or carry the write's LSN/version in the session.\n- Monotonic reads: a user sees data go backwards when reads hit replicas of different freshness. Fix: pin a session to one replica.\n- Consistent prefix: caused by out-of-order delivery between replicas; fix with ordered log shipping.\n\n## Failover done right\n\nAutomated failover compares replication positions: promote the replica with the most complete log. Then fence the old leader (STONITH) before clients find it. Two rules that prevent split brain: never let two nodes believe they are leader in the same term, and never let a stale leader serve writes after a new term exists.\n\n## Conflict handling\n\n- Last-writer-wins is simple and loses data; acceptable only for ephemeral values.\n- Version vectors detect concurrency; apps must merge.\n- CRDTs (counters, sets, maps) merge deterministically without coordination; the price is metadata and merge semantics in the read path.\n\n## Numbers\n\n- Postgres streaming replication: single-digit ms lag on healthy links; WAL shipping saturates at one core of compression.\n- Cross-region lag: physical RTT dominates (70-200ms) - synchronous cross-region commits cost that on every write.\n- Replica promotion (Patroni/Orchestrator): seconds to tens of seconds including fencing.\n\n## Try it in the canvas\n\nFan reads from rest_service to both postgres_db replicas, inject latency_spike on one, and watch the read path shift to the healthy replica while the primary stays stable.",
    tradeOffs: [
      { dimension: "Sync vs async", optionA: "Sync (zero RPO)", optionB: "Async (fast)", recommendation: "Sync in-region, async cross-region." },
      { dimension: "Failover speed", optionA: "30s auto", optionB: "5-min manual", recommendation: "Auto with fencing for stateless; manual for ledgers." },
    ],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "rep-1", front: "Write the quorum overlap rule.", back: "W + R > N ensures reads see the latest write.", conceptTag: "replication", moduleId: "replication" },
      { cardId: "rep-2", front: "Why fence before failover?", back: "To stop the old leader taking writes (split-brain).", conceptTag: "replication", moduleId: "replication" },
    ],
    quiz: [
      {
        id: "rep-q1",
        prompt: "N=3, W=2, R=2 gives?",
        options: [
          { id: "a", text: "Quorum overlap surviving 1 loss", correct: true },
          { id: "b", text: "Eventual only", correct: false },
          { id: "c", text: "No availability", correct: false },
        ],
        explanation: "2+2 > 3 overlaps; any 2 include the latest write.",
        conceptTag: "replication",
      },
      {
        id: "rep-q2",
        prompt: "Biggest async risk?",
        options: [
          { id: "a", text: "Losing recent writes on failover", correct: true },
          { id: "b", text: "Higher write latency", correct: false },
          { id: "c", text: "Extra storage cost", correct: false },
        ],
        explanation: "Unreplicated tail is lost when the leader dies.",
        conceptTag: "replication",
      },
    ],
    keyNumbers: [
      { value: "W + R > N", label: "Quorum overlap keeping reads fresh", note: "Fewer acks means stale reads become possible." },
      { value: "1 ack", label: "Semi-sync minimum for no-loss single failure", note: "One synced replica + async tail = no latency cliff, no loss." },
      { value: "<1 s", label: "In-region replica lag budget", note: "Lag above this surfaces as read-your-writes bugs." },
    ],
    relatedModuleIds: ["cap-theorem", "raft-consensus"],
  },
  {
    id: "acid-vs-base",
    title: "ACID vs BASE & Isolation Levels",
    difficulty: "intermediate",
    estimatedMinutes: 21,
    summary: "Transactions, isolation anomalies, and where sagas replace 2PC across services.",
    bodyMarkdown: "# ACID vs BASE\n\nACID is the contract that makes single-node reasoning possible; BASE is what distributed systems fall back to when that contract is too expensive across the network - knowing when each applies prevents both corruption and paralysis.\n\n## ACID, component by component\n\n- Atomicity: all or nothing per transaction (via undo logs).\n- Consistency: transactions only move the database between valid states (your invariants, enforced by the app and constraints).\n- Isolation: concurrent transactions do not see each other's partial work; the levels define exactly which anomalies are allowed.\n- Durability: committed means committed - WAL fsync before acknowledgment (client-side group commit trades latency for throughput).\n\n## Isolation levels and the anomalies they allow\n\n| Level | Dirty read | Non-repeatable read | Phantom | Write skew |\n| --- | --- | --- | --- | --- |\n| Read uncommitted | Yes | Yes | Yes | Yes |\n| Read committed | No | Yes | Yes | Yes |\n| Repeatable read (snapshot) | No | No | Yes (MVCC: no) | Yes |\n| Serializable | No | No | No | No |\n\nPostgres defaults to read committed; many systems run snapshot isolation and must add explicit locks or SSI for write skew.\n\n## BASE\n\nBasically Available, Soft state, Eventual consistency: accept writes during partitions, let replicas diverge, reconcile later. The engineering work moves from the database into reconciliation jobs, conflict handling, and observability of divergence (which is rarely monitored well).\n\n## Distributed transactions and their replacements\n\n- 2PC: correct but blocking and fragile - coordinator failure can hold locks across systems.\n- Saga: local transactions plus compensations in reverse order. The state machine must be durable, idempotent, and explicitly tested.\n- Outbox pattern: write the event in the same local transaction as the state change, publish from the outbox reliably - the standard way to keep consistency without 2PC.\n\n## Practical guidance\n\nMoney movement, inventory decrement, and unique-identity creation: ACID with serializable or explicit locking. Feeds, notifications, analytics counters: BASE with idempotent consumers. Every crossover point needs an idempotency key - the single most valuable artifact in a distributed system.\n\n## Try it in the canvas\n\nRun a postgres_db primary with cockroach_db across zones; apply zone_outage and watch the CP path queue while an AP store keeps accepting writes that will reconcile later.",
    tradeOffs: [
      { dimension: "2PC vs saga", optionA: "2PC (atomic)", optionB: "Saga (available)", recommendation: "Saga across services; 2PC inside one DB." },
      { dimension: "Serializable vs read-committed", optionA: "Serializable", optionB: "Read-committed", recommendation: "Serializable for money, RC for feeds." },
    ],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "acid-1", front: "What anomaly does repeatable-read still allow?", back: "Phantoms (new rows matching the predicate).", conceptTag: "acid", moduleId: "acid-vs-base" },
      { cardId: "acid-2", front: "What replaces 2PC across microservices?", back: "Sagas with compensating actions.", conceptTag: "acid", moduleId: "acid-vs-base" },
    ],
    quiz: [
      {
        id: "acid-q1",
        prompt: "Booking flight + hotel atomically across services?",
        options: [
          { id: "a", text: "Saga with cancel compensations", correct: true },
          { id: "b", text: "Single 2PC across companies", correct: false },
          { id: "c", text: "No transaction at all", correct: false },
        ],
        explanation: "Cross-company 2PC never completes; sagas do.",
        conceptTag: "acid",
      },
      {
        id: "acid-q2",
        prompt: "Cheapest isolation without dirty reads?",
        options: [
          { id: "a", text: "Read-committed", correct: true },
          { id: "b", text: "Serializable", correct: false },
          { id: "c", text: "Read-uncommitted", correct: false },
        ],
        explanation: "Read-committed blocks dirty reads at modest cost.",
        conceptTag: "acid",
      },
    ],
    keyNumbers: [
      { value: "4", label: "Anomalies serializable eliminates", note: "Dirty reads, non-repeatables, phantoms, write skew." },
      { value: "N", label: "Saga steps forward ↔ compensations back", note: "Durable, idempotent state machines or nothing." },
      { value: "1 tx", label: "Outbox: state + event in one local commit", note: "The standard way to avoid 2PC across services." },
    ],
    relatedModuleIds: ["cap-theorem", "message-queues"],
  },
  {
    id: "bloom-filters",
    title: "Bloom Filters & Probabilistic Guards",
    difficulty: "intermediate",
    estimatedMinutes: 18,
    summary: "Trade a few bits per key for skipping disk I/O with mathematically bounded false positives.",
    bodyMarkdown: "# Bloom Filters\n\nA Bloom filter answers \"definitely not present\" or \"possibly present\" in a handful of bits per key - the cheapest way to skip work you know is useless.\n\n## Mechanics\n\nA bit array of m bits and k hash functions. Insert: set the k bits for the key. Query: if any bit is 0, the key is definitely absent; if all are 1, it may be present (false positive). False negatives are impossible by construction.\n\n## Sizing math\n\nFalse-positive rate p with n keys: m/n = -1.44 log2(p) bits per key, and k = 0.69 x (m/n) hash functions. Concrete anchors:\n\n| Keys | Target p | Bits | k |\n| --- | --- | --- | --- |\n| 1M | 1 percent | 9.6M bits (1.2MB) | 7 |\n| 1M | 0.1 percent | 14.4M bits (1.8MB) | 10 |\n| 100M | 1 percent | 120MB | 7 |\n\nNotice the size: one percent false positives costs about 1.2 bytes per key.\n\n## Where they earn their keep\n\n- Storage engines: RocksDB/LevelDB keep a Bloom filter per SSTable to skip files on point reads - the difference between one and five disk reads.\n- LSM read path, Cassandra partition indexes, HBase row lookups.\n- CDNs: remember \"has been requested once\" sets to filter one-hit wonders from cache.\n- Networking: routing/flow dedupe; Chrome's Safe Browsing prefilter; Bitcoin SPV filters.\n- Rate limiters and dedupe windows where a rare false positive is acceptable (fail closed on the expensive path only).\n\n## Variants\n\n- Counting Bloom: replace bits with small counters to support deletion, cost 2-4x memory.\n- Blocked Bloom: one cache line per key, faster in practice with slight false-positive inflation.\n- Cuckoo filter: supports deletes natively, better than Bloom at low occupancy.\n- Scalable Bloom: grows by adding layers - useful when the key count is unknown up front.\n\n## Pitfalls\n\n- You cannot enumerate contents; it is a membership oracle only.\n- Deletions require counting/blocked variants, never plain bit clearing.\n- False positives cost real work: size the filter so the expensive path sees a rate you can tolerate.\n\n## Try it in the canvas\n\nPut a redis_cache (cache-aside) in front of a document_store; the engine's Bloom-backed read path is exactly why p99 stays flat as the working set exceeds memory.",
    tradeOffs: [
      { dimension: "Bits per key", optionA: "10 bits (1 pct FP)", optionB: "4 bits (14 pct FP)", recommendation: "10 bits default for storage engines." },
      { dimension: "Bloom vs exact set", optionA: "Bloom (tiny)", optionB: "HashSet (exact)", recommendation: "Bloom as a pre-filter before exact checks." },
    ],
    interactiveVisual: "bloom_filter",
    flashcards: [
      { cardId: "bf-1", front: "Can a Bloom filter have false negatives?", back: "No — only false positives. Absent means definitely absent.", conceptTag: "bloom", moduleId: "bloom-filters" },
      { cardId: "bf-2", front: "Bits per key for ~1 percent FP?", back: "About 10 bits with 7 hash functions.", conceptTag: "bloom", moduleId: "bloom-filters" },
    ],
    quiz: [
      {
        id: "bf-q1",
        prompt: "Bloom says NOT present. Meaning?",
        options: [
          { id: "a", text: "Definitely absent, skip disk", correct: true },
          { id: "b", text: "Maybe present", correct: false },
          { id: "c", text: "Definitely present", correct: false },
        ],
        explanation: "No false negatives is the core guarantee.",
        conceptTag: "bloom",
      },
      {
        id: "bf-q2",
        prompt: "Best LSM use?",
        options: [
          { id: "a", text: "Skip SSTables missing the key", correct: true },
          { id: "b", text: "Replace the memtable", correct: false },
          { id: "c", text: "Compress values", correct: false },
        ],
        explanation: "Filters prune file reads before disk I/O.",
        conceptTag: "bloom",
      },
    ],
    keyNumbers: [
      { value: "10 bits", label: "Per key at ~1% false-positive rate", note: "About 1.2 bytes buys cheap disk-skip guarantees." },
      { value: "7", label: "Hash functions at 10 bits/key", note: "k = 0.69 × (m/n); more than that wastes probes." },
      { value: "1.2 MB", label: "Filter for 1M keys at 1% FP", note: "100M keys still fits in ~120MB of RAM." },
    ],
    relatedModuleIds: ["btree-vs-lsm", "merkle-trees"],
  },
  {
    id: "merkle-trees",
    title: "Merkle Trees & Anti-Entropy",
    difficulty: "advanced",
    estimatedMinutes: 20,
    summary: "Hash trees that pinpoint divergent ranges so replicas sync kilobytes instead of full datasets.",
    bodyMarkdown: "# Merkle Trees\n\nA Merkle tree is a hash tree whose root fingerprints the entire dataset while every interior node fingerprints a slice - enabling both tamper detection and surgical difference finding in O(log n).\n\n## Construction\n\nLeaves are hashes of data blocks (SHA-256 typically). Each parent is the hash of its children concatenated, recursively up to a single root. Any byte change anywhere flips the root hash. Order matters: hash(left || right) with a domain-separation prefix prevents the classic second-preimage trick on unordered pairs.\n\n## Anti-entropy repair\n\nTo reconcile two replicas holding millions of keys, exchange root hashes first (equal roots, done). On mismatch, descend: compare children hashes level by level until the differing leaves are isolated. Two million keys with a thousand scattered differences resolve in about log2(2M) = 21 levels of comparison, and only differing subtrees get data transferred - the mechanism behind Dynamo and Cassandra repair, and Riak's handoff.\n\n## Beyond databases\n\n- Git: every object is content-addressed; a commit's tree chain is a Merkle DAG. Verification is recomputation of hashes, not trust.\n- Certificate Transparency: Signed Certificate Timestamps are appended to Merkle logs; inclusion/consistency proofs let anyone verify no certificate was silently removed.\n- Blockchains: blocks commit to Merkle roots of transactions; light clients verify inclusion with log-sized proofs. (Ethereum's Patricia trie is the state-Merkle variant.)\n- File systems: ZFS/Btrfs checksum trees detect bit rot; rsync's rolling checksums play the same role at block level.\n\n## Complexity ledger\n\n- Proof of inclusion: O(log n) hashes (a 1M-leaf tree proves membership with 20 hashes).\n- Change detection during repair: O(log n) probes then O(differences) transfer.\n- Cost: every write updates the path to the root - fine for append-only logs, expensive for high-churn hot sets without caching interior nodes.\n\n## Pitfalls\n\n- Rebuilding whole trees per write is O(n); production systems keep interior nodes cached and update incrementally.\n- Weak hashes (MD5/SHA-1) are collision-forgeable - use SHA-256 or BLAKE3 for adversarial settings.\n- Sparse Merkle trees cost O(2^d) structure; use compressed variants for sparse key spaces.\n\n## Try it in the canvas\n\nReplicas resync via Merkle exchange after a zone_outage - the simulator's repair traffic matches difference size, not dataset size.",
    tradeOffs: [
      { dimension: "Granularity", optionA: "Fine (4 KB leaves)", optionB: "Coarse (1 MB leaves)", recommendation: "Fine for fast pinpointing, coarse for tiny trees." },
      { dimension: "Repair trigger", optionA: "Scheduled weekly", optionB: "On-read only", recommendation: "Both: scheduled plus read-repair sampling." },
    ],
    interactiveVisual: "merkle_tree",
    flashcards: [
      { cardId: "mk-1", front: "What does a matching Merkle root prove?", back: "Both datasets are identical (up to hash collisions).", conceptTag: "merkle", moduleId: "merkle-trees" },
      { cardId: "mk-2", front: "Why walk the tree instead of full sync?", back: "To isolate and stream only divergent ranges.", conceptTag: "merkle", moduleId: "merkle-trees" },
    ],
    quiz: [
      {
        id: "mk-q1",
        prompt: "Roots differ. Next step?",
        options: [
          { id: "a", text: "Compare child hashes recursively to the divergent leaf", correct: true },
          { id: "b", text: "Copy the entire dataset", correct: false },
          { id: "c", text: "Delete both copies", correct: false },
        ],
        explanation: "Tree walk pinpoints the minimal diff.",
        conceptTag: "merkle",
      },
      {
        id: "mk-q2",
        prompt: "Which system uses Merkle repair?",
        options: [
          { id: "a", text: "Cassandra anti-entropy repair", correct: true },
          { id: "b", text: "DNS round-robin", correct: false },
          { id: "c", text: "JWT signing", correct: false },
        ],
        explanation: "Cassandra compares trees per range.",
        conceptTag: "merkle",
      },
    ],
    keyNumbers: [
      { value: "21", label: "Hash comparisons to diff 2M keys", note: "log₂(2M) — a whole-replica check on a tree walk." },
      { value: "20", label: "Hashes to prove inclusion in a 1M-leaf tree", note: "Proofs are log-sized, so light clients verify cheaply." },
      { value: "O(log n)", label: "Change detection instead of full sync", note: "Only divergent subtrees transfer — gigabytes to kilobytes." },
    ],
    relatedModuleIds: ["bloom-filters", "replication"],
  },
  {
    id: "gossip-protocol",
    title: "Gossip, Membership & Failure Detection",
    difficulty: "advanced",
    estimatedMinutes: 23,
    summary: "Epidemic dissemination, SWIM detectors, and phi-accrual thresholds for serverless membership.",
    bodyMarkdown: "# Gossip Protocols\n\nGossip spreads state like a rumor: each node periodically exchanges its knowledge with a few random peers, and information reaches everyone in O(log N) rounds with no central coordinator.\n\n## Epidemic mechanics\n\nEach round, a node picks fanout f peers and exchanges updates. With fanout 3 and 1000 nodes, complete dissemination takes about log3(1000) = 6-7 rounds; even with message loss the tail closes fast because overlap is redundant. Two modes: anti-entropy (reconcile entire state, reliable, heavy) and rumor mongering (forward new updates only, light, slightly less reliable).\n\n## SWIM: membership the right way\n\n- Ping a random member; if no ack, ask k indirect peers to ping it.\n- On continued failure, mark the member Suspect (not Dead) and let it refute during a timeout window - this avoids false positives from transient network blips.\n- Only after the suspicion window expires does the node declare Dead and propagate the fact.\n\nSuspicion with refutation is why modern clusters miss fewer failovers than naive ping-dead protocols.\n\n## State size and convergence\n\n- Exchange deltas, not the whole map: version vectors or per-key timestamps keep messages small.\n- Merkle-tree diffs (Cassandra) or set reconciliation (Redis Enterprise) accelerate convergence when state is large.\n- Convergence time scales with the network diameter, not the member count; wide-area clusters pay real RTTs per round.\n\n## Where it runs\n\n- Cassandra/SeedDB: nodes gossip endpoints, tokens, schema, and load.\n- Consul (Serf/SWIM): membership and failure detection under the service registry.\n- Redis Cluster: gossip buses carry slot ownership and epoch bumps.\n- Bitcoin/Ethereum peer discovery; Kademlia overlays for DHTs.\n\n## Tuning and hazards\n\n- Fanout up means faster convergence and more bandwidth; 3-6 is the usual sweet spot.\n- Suspicion timeouts must exceed GC pause tails, or a stop-the-world pause triggers a false failure cascade.\n- Separating control-plane gossip from data-plane traffic prevents repair storms from delaying membership updates.\n\n## Try it in the canvas\n\nAdd three k8s_cluster nodes under one region: the control-plane chatter is gossip - kill one node and watch membership converge before the health checker even fires.",
    tradeOffs: [
      { dimension: "Gossip vs central registry", optionA: "Gossip (no SPOF)", optionB: "ZooKeeper registry", recommendation: "Gossip past 50 nodes or multi-DC." },
      { dimension: "Probe interval", optionA: "200ms (fast)", optionB: "2s (quiet)", recommendation: "500ms-1s balanced for most fleets." },
    ],
    interactiveVisual: "gossip",
    flashcards: [
      { cardId: "gs-1", front: "How fast does gossip spread one update?", back: "Exponentially — O(log N) rounds.", conceptTag: "gossip", moduleId: "gossip-protocol" },
      { cardId: "gs-2", front: "What does SWIM indirect probing fix?", back: "False death declarations from one-sided network blips.", conceptTag: "gossip", moduleId: "gossip-protocol" },
    ],
    quiz: [
      {
        id: "gs-q1",
        prompt: "Why suspicion before death?",
        options: [
          { id: "a", text: "To avoid flapping on transient loss", correct: true },
          { id: "b", text: "To save disk", correct: false },
          { id: "c", text: "To elect leaders", correct: false },
        ],
        explanation: "Suspicion lets witnesses confirm before eviction.",
        conceptTag: "gossip",
      },
      {
        id: "gs-q2",
        prompt: "Best fit for gossip membership?",
        options: [
          { id: "a", text: "200-node multi-DC Cassandra ring", correct: true },
          { id: "b", text: "3-node control plane", correct: false },
          { id: "c", text: "Single Postgres primary", correct: false },
        ],
        explanation: "Gossip shines at scale without coordinators.",
        conceptTag: "gossip",
      },
    ],
    keyNumbers: [
      { value: "O(log N)", label: "Rounds for one update to reach everyone", note: "Fanout 3 over 1000 nodes ≈ 6-7 rounds, loss-tolerant." },
      { value: "3-6", label: "Fanout sweet spot per gossip round", note: "Higher converges faster and burns more bandwidth." },
      { value: ">50", label: "Nodes (or multi-DC) where gossip beats a registry", note: "No coordinator means no coordination SPOF." },
    ],
    relatedModuleIds: ["consistent-hashing", "raft-consensus"],
  },
  {
    id: "rate-limiting",
    title: "Rate Limiting & Admission Control",
    difficulty: "foundations",
    estimatedMinutes: 20,
    summary: "Token buckets, sliding windows, and load-shedding that keep one tenant from melting the fleet.",
    bodyMarkdown: "# Rate Limiting\n\nA limiter protects a dependency from overload by bounding request rate per key (user, IP, tenant, route) - the algorithm decides burst behavior, and the distributed store decides the failure mode.\n\n## Algorithms, in escalating precision\n\n| Algorithm | Burst behavior | Memory | Notes |\n| --- | --- | --- | --- |\n| Fixed window | Double burst at window edges | Tiny | Simplest; acceptable for coarse limits |\n| Sliding log | Exact | O(requests) | Precise, expensive at high rate |\n| Sliding counter (approx) | Near-exact | Tiny | Weighted average of two windows - good default |\n| Token bucket | Configurable burst (bucket size) | Tiny | Industry standard; tokens refill at rate r |\n| Leaky bucket | Smooths output rate | Tiny | Good for shaping outbound calls |\n| GCRA | Configurable burst, no refill loop | Tiny | Token bucket without ticks; used by Redis-cell |\n\n## Distributed limiting\n\nCounters live in Redis (INCR + EXPIRE, or Lua for atomic token bucket) or in an edge store (Cloudflare DO, Envoy local + global service). Local-only limiting is a fast first tier but multiplies limits by node count. The hybrid: local drop for obvious abuse, global quota for the real number.\n\nClock and atomicity pitfalls: multi-step read-modify-write in Lua or a single sprint API; rejection should be 429 with Retry-After and rate limit headers (IETF draft: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset).\n\n## Choosing limits\n\n- Derive from capacity: per-node safe rps x nodes x 0.8, divided by expected tenants - then make it configurable per plan.\n- Limit counts requests, not cost; for expensive endpoints (LLM tokens, exports) limit cost units instead.\n- Always exempt health checks and internal services from public limits.\n\n## Fairness and blast radius\n\nPer-tenant quotas prevent one noisy tenant from starving others; global limits protect the dependency. Pair limiters with load shedding at the consumer (return 503 early when over capacity) so the limiter is the first line, not the only line.\n\n## Numbers\n\n- Redis token bucket via Lua: 100k+ checks/s per node, sub-ms.\n- A 1000 rps limit with burst 2000 tolerates flash crowds while keeping steady-state load safe.\n- Shed at 90 percent utilization to keep p99 inside SLO; dropping 1 percent of requests beats timing out 30 percent.\n\n## Try it in the canvas\n\nPut a rate_limiter in front of rest_service, set the arrival rate above the limit, and watch rejected requests separate cleanly from served ones in the trace waterfall.",
    tradeOffs: [
      { dimension: "Bucket vs window", optionA: "Token bucket", optionB: "Sliding window", recommendation: "Bucket for burst UX, window for billing exactness." },
      { dimension: "Fail-open vs closed", optionA: "Fail-open", optionB: "Fail-closed", recommendation: "Open for reads, closed for paid writes." },
    ],
    interactiveVisual: "token_bucket",
    flashcards: [
      { cardId: "rl-1", front: "Token bucket in one line?", back: "Tokens refill at rate R up to burst B; each request spends one.", conceptTag: "rate-limit", moduleId: "rate-limiting" },
      { cardId: "rl-2", front: "What status signals throttling?", back: "429 Too Many Requests with Retry-After.", conceptTag: "rate-limit", moduleId: "rate-limiting" },
    ],
    quiz: [
      {
        id: "rl-q1",
        prompt: "Bucket capacity 100, refill 10/s. Burst allowed?",
        options: [
          { id: "a", text: "100 immediate, then 10/s", correct: true },
          { id: "b", text: "10 total ever", correct: false },
          { id: "c", text: "Unlimited", correct: false },
        ],
        explanation: "Capacity bounds bursts; refill bounds sustained rate.",
        conceptTag: "rate-limit",
      },
      {
        id: "rl-q2",
        prompt: "Overloaded service should?",
        options: [
          { id: "a", text: "Shed low-priority load with fast 429s", correct: true },
          { id: "b", text: "Queue unboundedly", correct: false },
          { id: "c", text: "Crash the process", correct: false },
        ],
        explanation: "Fast rejection preserves p99 for admitted traffic.",
        conceptTag: "rate-limit",
      },
    ],
    keyNumbers: [
      { value: "429", label: "The only correct rejection signal", note: "Complain with Retry-After and RateLimit headers, never 5xx." },
      { value: "0.8 ×", label: "Capacity derating when deriving limits", note: "Per-node safe RPS × nodes × 0.8, split across tenants." },
      { value: "2", label: "Windows averaged by the sliding counter", note: "Near-exact limits with tiny memory — the pragmatic default." },
    ],
    relatedModuleIds: ["load-balancing", "caching-strategies"],
  },
  {
    id: "vector-search",
    title: "Vector Search & RAG Retrieval",
    difficulty: "advanced",
    estimatedMinutes: 29,
    summary: "Embeddings, HNSW tuning, chunking, and hybrid BM25+vector pipelines that ground LLM answers.",
    bodyMarkdown: "# Vector Search\n\nVector search finds the nearest neighbors of a query embedding in high-dimensional space - the engineering is 90 percent indexing and filtering strategy, and about 10 percent the distance function.\n\n## Embeddings and metrics\n\nA model maps text/image/audio to a vector (384-3072 dimensions typically). Similarity is measured by cosine similarity (normalized dot product), dot product (when magnitude matters), or L2. Normalize vectors at write time if you use cosine - it converts cosine to a plain dot product and speeds every scan.\n\n## Exact kNN is a full scan\n\nBrute force: N vectors x d dimensions per query. One million 768-dim float32 vectors is 3GB of memory; a scan touches all of it at roughly memory bandwidth 50-100GB/s = tens of milliseconds per query before filtering. That works up to a few million vectors per node with strict latency budgets - beyond that, use ANN.\n\n## ANN index families\n\n| Index | Recall @ speed | Memory | Great for |\n| --- | --- | --- | --- |\n| HNSW | Best latency/recall | High (graph edges) | Serving, <10ms p99 |\n| IVF + PQ | Tunable | Low (compressed) | Billion-scale, RAM-bound |\n| DiskANN | High recall on disk | Low RAM | Cold/big datasets |\n| ScaNN / tree+quant | High throughput | Medium | Batch + hybrid scoring |\n\nHNSW builds a navigable small-world graph; queries greedily descend. IVF clusters vectors and scans the nearest few centroids; PQ compresses each vector to a few bytes, trading recall for a 10-30x memory cut.\n\n## Recall is a dial, not a promise\n\nEvery ANN index exposes knobs (efSearch, nprobe) trading latency for recall. Measure recall@10 against exact ground truth on your own data, and put it in CI - \"fast but wrong\" is the default failure.\n\n## Filtering is the hard problem\n\nPre-filter (restrict the search space) keeps latency but can destroy recall if the filter excludes most of a cluster; post-filter over-fetches and can return fewer than k results. Production solution: partition the index by the filter dimension (tenant, date, ACL) or use filtered-HNSW with predicate-aware traversal. Never post-filter with a small over-fetch factor and call it done.\n\n## Hybrid search\n\nBM25 keyword search catches exact tokens and rare terms embeddings blur; fuse rankings with reciprocal rank fusion (RRF), then rerank the top 50-200 with a cross-encoder for the gains that matter. This pipeline (retrieve wide, rerank narrow) is the industry standard for RAG.\n\n## Numbers\n\n- HNSW query: 1-10ms for 1M-100M vectors with 95 percent+ recall.\n- PQ compression: 768-dim float32 (3KB) to 96 bytes - 32x smaller.\n- pgvector: HNSW built in parallel; 1M vectors query in single-digit ms with efSearch 40-100.\n\n## Try it in the canvas\n\nChain rest_service, embedding_service, and vector_database; watch how reranking caps the number of expensive similarity ops while keeping recall high.",
    tradeOffs: [
      { dimension: "Chunk size", optionA: "400 tokens", optionB: "2000 tokens", recommendation: "400-800 with 10 percent overlap." },
      { dimension: "Pure vector vs hybrid", optionA: "Vector only", optionB: "BM25 + vector fused", recommendation: "Hybrid for names, codes, and IDs." },
    ],
    interactiveVisual: "vector_hnsw",
    flashcards: [
      { cardId: "vs-1", front: "What does ef_search control?", back: "Recall-latency trade-off per HNSW query.", conceptTag: "vector", moduleId: "vector-search" },
      { cardId: "vs-2", front: "Why re-rank after ANN?", back: "Cheap ANN recalls broadly; cross-encoders refine precisely.", conceptTag: "vector", moduleId: "vector-search" },
    ],
    quiz: [
      {
        id: "vs-q1",
        prompt: "Exact SKUs fail on pure vectors. Fix?",
        options: [
          { id: "a", text: "Add BM25 hybrid fusion", correct: true },
          { id: "b", text: "Bigger chunks", correct: false },
          { id: "c", text: "Lower ef_search", correct: false },
        ],
        explanation: "Lexical match nails exact codes; vectors handle semantics.",
        conceptTag: "vector",
      },
      {
        id: "vs-q2",
        prompt: "RAM for 1M x 768 fp32 vectors?",
        options: [
          { id: "a", text: "Roughly 3 GB plus index overhead", correct: true },
          { id: "b", text: "Roughly 3 MB", correct: false },
          { id: "c", text: "Roughly 3 TB", correct: false },
        ],
        explanation: "1M * 768 * 4 bytes = ~2.9 GB.",
        conceptTag: "vector",
      },
    ],
    keyNumbers: [
      { value: "≈2.9 GB", label: "RAM for 1M × 768-dim fp32 embeddings", note: "1M × 768 × 4 bytes — before index graph overhead." },
      { value: "<10 ms", label: "HNSW p99 at high recall targets", note: "The latency/recall champion for serving." },
      { value: "400-800", label: "Tokens per chunk (≈10% overlap)", note: "Smaller chunks retrieve sharper, larger carry context." },
    ],
    relatedModuleIds: ["llm-systems", "sharding-partitioning"],
  },
  {
    id: "llm-systems",
    title: "LLM Serving: TTFT, KV-Cache & Batching",
    difficulty: "advanced",
    estimatedMinutes: 32,
    summary: "Prefill versus decode, PagedAttention, continuous batching, and holding TTFT SLOs under load.",
    bodyMarkdown: "# LLM Serving Systems\n\nServing a large language model is a queuing problem wearing a compute costume: prefill is a bursty GPU-bound job, decode is a latency-bound streaming job, and the KV cache is the memory budget everything else fights over.\n\n## The two phases\n\n- Prefill: process the whole prompt in parallel. Compute-bound; cost scales with prompt tokens. Determines time-to-first-token (TTFT).\n- Decode: generate one token at a time, each step reading the whole model. Memory-bandwidth-bound. Determines time-per-output-token (TPOT) and the streaming pace.\n\nA good serving stack schedules them separately: batch prefills together, interleave decodes, and never let one long prompt stall a hundred streaming users.\n\n## KV cache math\n\nEach token keeps key/value tensors for every layer: with 70B params in fp16, about 0.5-1.5MB per token depending on architecture (GQA cuts this several-fold). A 4k-token conversation can hold hundreds of MB of cache. Consequences:\n\n- Paged attention (vLLM): KV in fixed blocks, no fragmentation, higher batch occupancy.\n- Continuous batching: admit new requests every step instead of waiting for a batch to drain - the single biggest throughput win over naive static batching.\n- Prefix caching: identical system prompts share KV across requests; near-linear cost savings for agents.\n\n## Throughput vs latency\n\n| Goal | Technique | Cost |\n| --- | --- | --- |\n| TTFT | Shorter prompts, prefill priority, prompt cache | Slightly lower peak throughput |\n| TPOT | Bigger batches (more users per GPU) | Higher TTFT under load |\n| Cost per token | Quantization, batching, speculative decoding | Occasional quality risk |\n\nQuantization anchors: fp16 to int8 halves VRAM with near-identical quality for most models; int4 needs calibration and per-channel scales, and can hurt reasoning-heavy workloads.\n\n## Caching and routing\n\n- Exact-match cache: hash prompt + params, serve identical requests instantly.\n- Semantic cache: embed the prompt, serve verified near-duplicates - gains depend on traffic repetition.\n- Model cascade: cheap model first, escalate on low confidence; route by prompt difficulty classifier.\n- Fallback chain: primary model, secondary provider, degraded local model - with circuit breakers per provider.\n\n## SLOs and capacity\n\nSet explicit SLOs: p95 TTFT under 800ms, TPOT under 50ms for chat. Then capacity-plan from tokens/s per GPU measured under your batch profile - vendor numbers assume perfect batches. Keep headroom for prompt-length variance: p99 prompts can be 10x the median and dominate queueing.\n\n## Failure modes\n\n- One 100k-token prompt starfs every short request behind it - enforce per-tenant token budgets and prefill quotas.\n- Autoscaling on GPU utilization misses memory pressure; scale on queue wait time instead.\n- Retries on timeouts duplicate token spend; idempotency keys plus per-request spend caps.\n\n## Try it in the canvas\n\nRun llm_inference behind an agent_orchestrator: raise avg prompt tokens in the inspector and watch TTFT explode while TPOT stays flat - the prefill/decode split made visible.",
    tradeOffs: [
      { dimension: "70B vs 8B", optionA: "70B quality", optionB: "8B speed/cost", recommendation: "Route by difficulty classifier." },
      { dimension: "Batch size", optionA: "Large (throughput)", optionB: "Small (TTFT)", recommendation: "Cap batch to hold TTFT SLO." },
    ],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "llm-1", front: "TTFT vs TPOT?", back: "Time-to-first-token (prefill) vs time-per-output-token (decode).", conceptTag: "llm", moduleId: "llm-systems" },
      { cardId: "llm-2", front: "What saturates first on GPUs?", back: "KV-cache VRAM, usually before FLOPS.", conceptTag: "llm", moduleId: "llm-systems" },
    ],
    quiz: [
      {
        id: "llm-q1",
        prompt: "KV-cache hits 97 percent. Correct action?",
        options: [
          { id: "a", text: "Preempt low-priority requests", correct: true },
          { id: "b", text: "Increase batch size", correct: false },
          { id: "c", text: "Disable sampling", correct: false },
        ],
        explanation: "Preemption frees VRAM and protects TTFT.",
        conceptTag: "llm",
      },
      {
        id: "llm-q2",
        prompt: "Long system prompts repeat every call. Optimization?",
        options: [
          { id: "a", text: "Prefix KV caching", correct: true },
          { id: "b", text: "Bigger tokenizer", correct: false },
          { id: "c", text: "More CPUs", correct: false },
        ],
        explanation: "Shared prefixes reuse computed KV blocks.",
        conceptTag: "llm",
      },
    ],
    keyNumbers: [
      { value: "0.5-1.5 MB", label: "KV cache per token (70B, fp16)", note: "4k conversation ⇒ hundreds of MB; GQA cuts it several-fold." },
      { value: "2x", label: "VRAM saved going int8 vs fp16", note: "Near-identical quality for most models; int4 needs calibration." },
      { value: "#1", label: "Throughput lever: continuous batching", note: "Admit requests every step instead of letting batches drain." },
    ],
    relatedModuleIds: ["vector-search", "load-balancing"],
  },
  {
    id: "microservices-monolith",
    title: "Monolith to Microservices: Seams",
    difficulty: "intermediate",
    estimatedMinutes: 22,
    summary: "When to split, bounded contexts, strangler migration, and why distributed monoliths fail.",
    bodyMarkdown: "# Microservices vs Monolith\n\nThe unit of decomposition is teams and failure domains, not code files - a modular monolith with clean boundaries beats a distributed mess every time, and the migration path matters more than the destination.\n\n## Start with the monolith\n\nA single deployable with enforced internal modules (no cross-module imports, one schema per module, explicit interfaces) gives you: transactional consistency for free, one deploy, trivial refactoring, and one on-call rotation. Shopify, Stack Overflow, and Basecamp run enormous monoliths successfully. The first fix for a painful monolith is almost never \"split it\" - it is enforcing module boundaries that already exist logically.\n\n## Signals it is time to split\n\n- Deploy coupling: one team's change blocks another's release, routinely.\n- Scaling asymmetry: one component needs 100x the CPU of the rest.\n- Availability asymmetry: search outages should not take down checkout.\n- Compliance or blast radius boundaries (PII isolation, payment scope).\n\nEach signal should name the specific service to extract - \"microservices\" as a vibe is how you get a distributed monolith.\n\n## Boundaries: bounded contexts\n\nSplit along domain seams (DDD bounded contexts), not technical layers. A service owns its data; other services access it through APIs or events, never through its tables. Shared databases are the distributed-monolith factory: you keep coupling and pay the network tax.\n\n## Communication patterns\n\n| Pattern | Latency | Coupling | Use when |\n| --- | --- | --- | --- |\n| Sync REST/gRPC | Low | Temporal (both up) | Queries, strong user-facing reads |\n| Async events | Higher | Loose | Side effects, fan-out, workflows |\n| Shared read model | Low | Contract only | Read-heavy projections |\n\nDefault to synchronous for queries with tight UX needs; async for anything with side effects. Every sync hop multiplies p99: a request fanning out to 10 services each at p99 100ms is a p99 over 300ms with luck and over a second without.\n\n## The migration: strangler fig\n\n1. Put a facade (gateway) in front of the monolith.\n2. Extract one context at a time behind it, with a dual-write or change-data-capture bridge.\n3. Move reads first (safe), then writes, then delete the old path.\n4. Keep the ability to route back until the new path has soaked.\n\n## The real costs\n\nA service multiplies: repos, pipelines, dashboards, alerts, SDK versioning, on-call surface, and local dev complexity. Ten services does not mean ten times the cost - it means a step change in coordination overhead. Budget for platform work (service templates, tracing, contract tests) or the architecture will tax every team forever.\n\n## Try it in the canvas\n\nCompare a single rest_service against a five-service fan-out at the same rps: the queueing math shows tail latency multiplication without any code being wrong.",
    tradeOffs: [
      { dimension: "Modular monolith vs services", optionA: "Modular monolith", optionB: "Microservices", recommendation: "Monolith until 3+ teams collide." },
      { dimension: "Choreography vs orchestration", optionA: "Events", optionB: "Orchestrator", recommendation: "Events for simple flows, orchestrator for rollbacks." },
    ],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "ms-1", front: "First sign you must split?", back: "Independent scaling or deploy contention between teams.", conceptTag: "architecture", moduleId: "microservices-monolith" },
      { cardId: "ms-2", front: "What is a distributed monolith?", back: "Services that must deploy together due to shared DB/schema coupling.", conceptTag: "architecture", moduleId: "microservices-monolith" },
    ],
    quiz: [
      {
        id: "ms-q1",
        prompt: "Safest migration pattern?",
        options: [
          { id: "a", text: "Strangler: route endpoints incrementally", correct: true },
          { id: "b", text: "Big-bang rewrite", correct: false },
          { id: "c", text: "Copy-paste the DB", correct: false },
        ],
        explanation: "Incremental routing bounds blast radius.",
        conceptTag: "architecture",
      },
      {
        id: "ms-q2",
        prompt: "Each service with its own DB gives?",
        options: [
          { id: "a", text: "Independent evolution at the cost of sagas", correct: true },
          { id: "b", text: "Free joins", correct: false },
          { id: "c", text: "Zero ops overhead", correct: false },
        ],
        explanation: "Autonomy trades against distributed transactions.",
        conceptTag: "architecture",
      },
    ],
    keyNumbers: [
      { value: "3+", label: "Teams colliding before splitting the monolith", note: "Below that, modular boundaries beat distributed calls." },
      { value: "800 ms+", label: "Worst-case sync fanout: 10 hops × p99 100ms", note: "Sequential p99 multiplies; parallelize or cache the read model." },
      { value: "1 DB", label: "Per service — data autonomy is the seam", note: "Shared schemas are the distributed-monolith factory." },
    ],
    relatedModuleIds: ["acid-vs-base", "message-queues"],
  },
  {
    id: "observability-tracing",
    title: "Observability: Metrics, Traces & SLOs",
    difficulty: "foundations",
    estimatedMinutes: 21,
    summary: "RED/USE signals, tail sampling, burn-rate alerts, and reading a waterfall like a profiler.",
    bodyMarkdown: "# Observability & Tracing\n\nLogs, metrics, and traces answer different questions: logs say what happened, metrics say how much and how often, traces say where the time went - incident response needs all three, wired to the same context.\n\n## The three pillars, honestly assessed\n\n- Metrics: cheap, aggregatable, perfect for alerting (\"error rate > 2 percent for 5 minutes\"). Blind to individual requests.\n- Logs: rich detail per event; expensive at scale and useless without structure. Use JSON with trace ids, sample aggressively, keep high cardinality in log columns, not metric labels.\n- Traces: the request's full path across services with timing per span. The only pillar that localizes latency precisely in a distributed call graph.\n\n## Trace anatomy\n\nA trace is a tree of spans. Each span has: trace id (shared), span id, parent id, start time, duration, status, and attributes. Context propagates via the W3C traceparent header (or B3 for older stacks). Instrument at the edges (HTTP/gRPC frameworks), the data layer (DB clients), and async boundaries (queue publish/consume links) - three integrations usually cover the critical path.\n\n## Sampling strategy\n\n| Approach | How | Trade-off |\n| --- | --- | --- |\n| Head sampling | Decide at trace start (e.g. 1 percent) | Cheap, misses rare errors |\n| Tail sampling | Buffer the whole trace, keep interesting ones | Catches errors/latency spikes; needs collector memory |\n| Adaptive/per-key | Higher rate for VIP tenants or new endpoints | Complexity, storage |\n\nThe standard production combo: head sample at 1-10 percent, tail-sample errors and slow traces at 100 percent.\n\n## Alerting on symptoms, not causes\n\n- Golden signals per service: latency (p50/p95/p99), traffic, errors, saturation.\n- SLO burn-rate alerts: \"we will exhaust the error budget in 6 hours at current pace\" - far more actionable than static thresholds.\n- Cardinality control: user id, URL path with ids, and raw email as metric labels will melt your time-series DB; use exemplars linking metrics to traces instead.\n\n## OpenTelemetry pipeline\n\nApps emit OTLP to a collector; collectors batch, sample, redact, and fan out to backends (Tempo/Jaeger for traces, Prometheus/Mimir for metrics, Loki/OpenSearch for logs). The collector is a single place for policy - keep secrets and PII out of span attributes there.\n\n## Cost control that actually works\n\n- Drop health-check and synthetic spans at the collector, not the SDK.\n- Compress and batch exports; traces are the most compressible pillar.\n- Retention tiers: 3-7 days hot, 30-90 days cold, aggregate rollups forever.\n- Cardinality budgets per metric namespace, enforced in CI for dashboards.\n\n## Try it in the canvas\n\nRun any topology, open the trace waterfall after a latency_spike, and the span breakdown shows exactly which hop owns the p99 - that is the whole value proposition of tracing in one screen.",
    tradeOffs: [
      { dimension: "Head vs tail sampling", optionA: "Head (cheap)", optionB: "Tail (keeps errors)", recommendation: "Tail for user-facing paths." },
      { dimension: "Threshold vs burn-rate", optionA: "Static threshold", optionB: "Error-budget burn", recommendation: "Burn-rate pages only on real SLO risk." },
    ],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "obs-1", front: "Expand RED.", back: "Rate, Errors, Duration per service.", conceptTag: "observability", moduleId: "observability-tracing" },
      { cardId: "obs-2", front: "Why burn-rate alerts?", back: "They page on SLO-budget consumption, not noise.", conceptTag: "observability", moduleId: "observability-tracing" },
    ],
    quiz: [
      {
        id: "obs-q1",
        prompt: "Cheapest way to keep error visibility?",
        options: [
          { id: "a", text: "Tail-sample: all errors + 1 percent successes", correct: true },
          { id: "b", text: "Keep every span forever", correct: false },
          { id: "c", text: "Disable tracing", correct: false },
        ],
        explanation: "Tail sampling preserves the interesting traces.",
        conceptTag: "observability",
      },
      {
        id: "obs-q2",
        prompt: "Waterfall shows 800ms in one downstream span. Fix focus?",
        options: [
          { id: "a", text: "That downstream on the critical path", correct: true },
          { id: "b", text: "All fast parallel spans", correct: false },
          { id: "c", text: "The browser", correct: false },
        ],
        explanation: "Critical-path spans determine user latency.",
        conceptTag: "observability",
      },
    ],
    keyNumbers: [
      { value: "1-10%", label: "Head sample rate on normal traffic", note: "Errors and slow traces get tail-sampled at 100%." },
      { value: "100%", label: "Tail-sampled error + p99-slow traces", note: "Rare failures keep full visibility at bounded cost." },
      { value: "RED", label: "The per-service golden triad", note: "Rate, Errors, Duration — alert on symptoms, not causes." },
    ],
    relatedModuleIds: ["load-balancing", "rate-limiting"],
  },
];

export const ENCYCLOPEDIA_MODULE_IDS: string[] = ENCYCLOPEDIA_MODULES.map((m) => m.id);

export const ENCYCLOPEDIA_MAP: Record<string, EncyclopediaModule> = Object.fromEntries(
  ENCYCLOPEDIA_MODULES.map((m) => [m.id, m]),
);

/**
 * Short quiz conceptTags ("cap", "bloom", "queues"…) are historical aliases of
 * module ids; resolve them so FSRS cards land under the right module.
 * Exact matches and explicit overrides win; token containment is the fallback.
 */
const CONCEPT_TAG_ALIASES: Record<string, string> = {
  cap: "cap-theorem",
  raft: "raft-consensus",
  "storage-engines": "btree-vs-lsm",
  caching: "caching-strategies",
  queues: "message-queues",
  streaming: "event-streaming",
  merkle: "merkle-trees",
  gossip: "gossip-protocol",
  "rate-limit": "rate-limiting",
  vector: "vector-search",
  llm: "llm-systems",
  architecture: "microservices-monolith",
};

export function quizCardModuleId(conceptTag: string): string {
  if (!conceptTag) return "general";
  if (ENCYCLOPEDIA_MAP[conceptTag]) return conceptTag;
  const alias = CONCEPT_TAG_ALIASES[conceptTag];
  if (alias) return alias;
  const token = new RegExp(`(^|-)${conceptTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|-)`);
  const fuzzy = ENCYCLOPEDIA_MODULES.find((m) => token.test(m.id));
  return fuzzy?.id ?? "general";
}

export function getEncyclopediaModule(id: string): EncyclopediaModule | undefined {
  return ENCYCLOPEDIA_MAP[id];
}

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
    estimatedMinutes: 18,
    summary: "Spread keys evenly across a changing fleet with minimal reshuffling when nodes join or leave.",
    bodyMarkdown: "# Consistent Hashing\n\nHash both keys and nodes onto a shared ring. Each key belongs to the first node clockwise. When a node leaves, only its arc reassigns.\n\n## Virtual nodes\n\nGive each physical node 100-200 virtual tokens so arcs even out. Heterogeneous hardware gets proportional token counts.\n\n## Failure handling\n\nReplicate each key to the next 2 clockwise nodes. On failure the successor already holds the data. Client-side rendezvous hashing avoids any coordinator.\n\n## Production numbers\n\nDynamo and Cassandra use Murmur3 with vnodes. Reshuffle per membership change stays near K/N keys instead of full rehash.",
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
    relatedModuleIds: ["sharding-partitioning", "gossip-protocol"],
  },
  {
    id: "cap-theorem",
    title: "CAP, PACELC & Latency Trade-offs",
    difficulty: "foundations",
    estimatedMinutes: 15,
    summary: "Why partitions force a consistency-availability choice, and how PACELC extends the trade-off to healthy networks.",
    bodyMarkdown: "# CAP and PACELC\n\nUnder a network partition you must pick consistency (reject writes) or availability (accept divergence). PACELC adds: even without partitions, you trade latency for consistency.\n\n## Practical reads\n\n- CP: etcd, CockroachDB default, HBase — refuse minority writes.\n- AP: Cassandra ONE, DynamoDB, Riak — always writable, reconcile later.\n- Tunable: QUORUM reads/writes give strong-ish behavior with 2/3 RTTs.\n\n## Design rule\n\nPut money paths on CP/QUORUM and feeds on AP. Never promise CA across regions; partitions always happen.",
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
    relatedModuleIds: ["acid-vs-base", "replication"],
  },
  {
    id: "raft-consensus",
    title: "Raft Consensus & Leader Election",
    difficulty: "advanced",
    estimatedMinutes: 25,
    summary: "How Raft elects leaders, replicates logs, and stays writable through minority failures.",
    bodyMarkdown: "# Raft Consensus\n\nNodes are follower, candidate, or leader. Randomized election timeouts (150-300ms) prevent split votes. The leader appends client writes to its log and commits once a majority acks.\n\n## Safety\n\nElection safety: at most one leader per term. Log matching: committed entries never roll back. A new leader holds all committed entries.\n\n## Operations\n\nPre-vote avoids disruptive re-elections. Joint consensus moves membership safely. Single-leader reads can serve linearizable reads via lease or quorum check.",
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
    relatedModuleIds: ["cap-theorem", "replication"],
  },
  {
    id: "btree-vs-lsm",
    title: "B-Trees vs LSM-Trees",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    summary: "Random-write amplification in B-trees versus write-friendly LSM buffering with compaction debt.",
    bodyMarkdown: "# B-Trees vs LSM-Trees\n\nB-trees update pages in place: great reads, but random writes pay 1.5x amplification. LSM-trees buffer writes in memtables, flush immutable SSTables, and compact in the background.\n\n## Read path\n\nLSM reads check memtable, then SSTables newest-first, using bloom filters to skip files. Compaction keeps file counts bounded.\n\n## When to pick\n\nPostgres/MySQL (B-tree) for transactional point reads. Cassandra/RocksDB (LSM) for write-heavy streams. Expect periodic compaction latency spikes on LSM.",
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
    relatedModuleIds: ["sharding-partitioning", "bloom-filters"],
  },
  {
    id: "caching-strategies",
    title: "Caching: Aside, Through & Coherence",
    difficulty: "foundations",
    estimatedMinutes: 16,
    summary: "Cache-aside, read/write-through, stampede protection, and invalidation patterns that hold 90 percent hit ratios.",
    bodyMarkdown: "# Caching Strategies\n\nCache-aside keeps app code in control: miss, load, populate. Write-through keeps cache fresh on every write. TTL plus versioned keys gives instant invalidation.\n\n## Stampede defense\n\nSingle-flight coalescing lets one filler serve 100 waiters. Probabilistic early refresh refills before expiry. Circuit-break the filler so cache loss never kills the DB.\n\n## Numbers\n\nRedis p95 ~2ms versus Postgres 18ms. Raising hit ratio from 80 to 95 percent cuts DB load 4x.",
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
    relatedModuleIds: ["load-balancing", "sharding-partitioning"],
  },
  {
    id: "load-balancing",
    title: "Load Balancing & Autoscaling Signals",
    difficulty: "foundations",
    estimatedMinutes: 14,
    summary: "L4/L7 algorithms, health checks, connection draining, and scaling on queue age instead of CPU alone.",
    bodyMarkdown: "# Load Balancing\n\nRound-robin is fair for uniform tasks; least-connections wins for variable latency. Maglev hashing gives sticky-but-balanced routing.\n\n## Health\n\nActive probes every 5s; 2 failures evict, 2 successes restore. Draining gives 30s for in-flight completion.\n\n## Autoscale\n\nScale on p95 and queue depth, not CPU alone. CPU can sit at 40 percent while queues explode behind a slow dependency.",
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
    relatedModuleIds: ["caching-strategies", "message-queues"],
  },
  {
    id: "message-queues",
    title: "Queues, DLQs & Backpressure",
    difficulty: "intermediate",
    estimatedMinutes: 17,
    summary: "Visibility timeouts, FIFO versus standard, poison-pill handling, and pull-based backpressure.",
    bodyMarkdown: "# Message Queues\n\nQueues turn crashes into delays: producers append, consumers pull at their own pace. At-least-once plus idempotency keys is the durable default.\n\n## Reliability\n\nVisibility timeout 30s hides in-flight work. After 5 receives the message moves to the DLQ for inspection. FIFO gives ordering at 300 TPS per group.\n\n## Backpressure\n\nPull with long-polling so consumers set the pace. Alert on queue age exceeding 2x SLO.",
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
    relatedModuleIds: ["event-streaming", "load-balancing"],
  },
  {
    id: "event-streaming",
    title: "Event Streaming & Exactly-Once",
    difficulty: "advanced",
    estimatedMinutes: 22,
    summary: "Partitioned logs, consumer groups, watermarks, and Flink exactly-once windowed joins.",
    bodyMarkdown: "# Event Streaming\n\nKafka partitions order per key and retain days of history. Consumer groups scale horizontally; Flink checkpoints state for exactly-once windows.\n\n## Semantics\n\nIdempotent producers plus transactional commits give exactly-once. Event-time watermarks tolerate 5-minute late arrivals.\n\n## Sizing\n\nPartitions equal max parallelism. Keep 2x headroom. Tier retention: 7 days hot, then object storage.",
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
    relatedModuleIds: ["message-queues", "sharding-partitioning"],
  },
  {
    id: "sharding-partitioning",
    title: "Sharding & Hot-Key Surgery",
    difficulty: "intermediate",
    estimatedMinutes: 19,
    summary: "Shard-key selection, scatter-gather, celebrity-key splitting, and painless resharding.",
    bodyMarkdown: "# Sharding\n\nShard by the most selective, evenly spread key: tenant_id or user_id. Range sharding suits scans; hash sharding suits point lookups.\n\n## Hot keys\n\nCelebrity keys (a viral creator) overwhelm one shard. Suffix-salting (key#1..#16) plus scatter-gather spreads them. Directory-based routing eases resharding.\n\n## Resharding\n\nPre-split 2x shards before launches. Dual-write during moves, then cut over. Keep shard size under 100 GB for fast moves.",
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
    relatedModuleIds: ["consistent-hashing", "replication"],
  },
  {
    id: "replication",
    title: "Replication: Sync, Async & Quorums",
    difficulty: "intermediate",
    estimatedMinutes: 16,
    summary: "Leader-follower replication, quorum math, failover fencing, and zero-RPO patterns.",
    bodyMarkdown: "# Replication\n\nSynchronous replication acks after standby commit: zero data loss, higher p99. Async acks immediately: fast, may lose seconds on failover.\n\n## Quorums\n\nW + R > N guarantees overlap. Dynamo-style N=3, W=2, R=2 survives one loss with strong-enough reads.\n\n## Failover\n\nFence the old leader (STONITH) before promoting, or split-brain double-writes corrupt data.",
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
    relatedModuleIds: ["cap-theorem", "raft-consensus"],
  },
  {
    id: "acid-vs-base",
    title: "ACID vs BASE & Isolation Levels",
    difficulty: "intermediate",
    estimatedMinutes: 15,
    summary: "Transactions, isolation anomalies, and where sagas replace 2PC across services.",
    bodyMarkdown: "# ACID vs BASE\n\nACID transactions give atomicity and serializability on one database. Across services, sagas chain local transactions with compensations.\n\n## Isolation\n\nRead-committed blocks dirty reads. Repeatable-read blocks non-repeatable reads. Serializable blocks phantoms at the highest cost.\n\n## Sagas\n\nChoreography (events) suits simple flows; orchestration (central coordinator) suits complex rollbacks. Every step needs an undo action.",
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
    relatedModuleIds: ["cap-theorem", "message-queues"],
  },
  {
    id: "bloom-filters",
    title: "Bloom Filters & Probabilistic Guards",
    difficulty: "intermediate",
    estimatedMinutes: 12,
    summary: "Trade a few bits per key for skipping disk I/O with mathematically bounded false positives.",
    bodyMarkdown: "# Bloom Filters\n\nAn m-bit array with k hashes represents a set. Membership says definitely-not or maybe. 10 bits/key with 7 hashes gives ~1 percent false positives.\n\n## Uses\n\nLSM SSTable skips, username-taken checks, and CDN cache-key guards. Counting variants support deletes.\n\n## Math\n\nFalse-positive rate approx (1 - e^(-kn/m))^k. Size for the target rate, not vibes.",
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
    relatedModuleIds: ["btree-vs-lsm", "merkle-trees"],
  },
  {
    id: "merkle-trees",
    title: "Merkle Trees & Anti-Entropy",
    difficulty: "advanced",
    estimatedMinutes: 14,
    summary: "Hash trees that pinpoint divergent ranges so replicas sync kilobytes instead of full datasets.",
    bodyMarkdown: "# Merkle Trees\n\nLeaves hash data partitions; parents hash children up to one root. Differing roots mean divergence; walk down to find the exact range.\n\n## Repair\n\nCassandra and Dynamo compare per-range roots during repair, then stream only mismatched segments. Git commits form a Merkle DAG.\n\n## Cost\n\nTree depth log(N); verification needs O(log N) hashes. Rebuild incrementally on write.",
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
    relatedModuleIds: ["bloom-filters", "replication"],
  },
  {
    id: "gossip-protocol",
    title: "Gossip, Membership & Failure Detection",
    difficulty: "advanced",
    estimatedMinutes: 16,
    summary: "Epidemic dissemination, SWIM detectors, and phi-accrual thresholds for serverless membership.",
    bodyMarkdown: "# Gossip Protocols\n\nEach node periodically tells random peers what it knows. Information spreads exponentially: O(log N) rounds infect the cluster.\n\n## SWIM\n\nProbe a random peer; on timeout ask k witnesses to probe indirectly. Suspicion spreads before declaring death, cutting false positives.\n\n## Tuning\n\nPhi-accrual adapts to network jitter instead of fixed timeouts. Seed nodes bootstrap, then gossip takes over.",
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
    relatedModuleIds: ["consistent-hashing", "raft-consensus"],
  },
  {
    id: "rate-limiting",
    title: "Rate Limiting & Admission Control",
    difficulty: "foundations",
    estimatedMinutes: 13,
    summary: "Token buckets, sliding windows, and load-shedding that keep one tenant from melting the fleet.",
    bodyMarkdown: "# Rate Limiting\n\nToken buckets allow bursts up to capacity, refilling at the sustained rate. Sliding-window counters give exact per-minute fairness.\n\n## Layering\n\nEdge WAF blocks floods, gateway enforces per-key quotas, and services shed low-priority load (return 429 + Retry-After) before queues explode.\n\n## Headers\n\nAlways return X-RateLimit-Limit, Remaining, and Retry-After so clients back off gracefully.",
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
    relatedModuleIds: ["load-balancing", "caching-strategies"],
  },
  {
    id: "vector-search",
    title: "Vector Search & RAG Retrieval",
    difficulty: "advanced",
    estimatedMinutes: 21,
    summary: "Embeddings, HNSW tuning, chunking, and hybrid BM25+vector pipelines that ground LLM answers.",
    bodyMarkdown: "# Vector Search for RAG\n\nChunk docs to 300-800 tokens with overlap, embed, and index HNSW. Retrieve top-20, cross-encoder re-rank to top-5, then synthesize with citations.\n\n## Quality levers\n\nChunk boundaries beat raw size: split on headings. Metadata filters (tenant, date) prune before vector scoring. Quantize to int8 past 20M vectors.\n\n## Eval\n\nTrack recall@20 and faithfulness. Distractor chunks in eval catch sycophancy.",
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
    relatedModuleIds: ["llm-systems", "sharding-partitioning"],
  },
  {
    id: "llm-systems",
    title: "LLM Serving: TTFT, KV-Cache & Batching",
    difficulty: "advanced",
    estimatedMinutes: 24,
    summary: "Prefill versus decode, PagedAttention, continuous batching, and holding TTFT SLOs under load.",
    bodyMarkdown: "# LLM Serving Physics\n\nPrefill crunches prompts in parallel; decode streams one token per step. TTFT equals queue + prefill; TPOT governs stream smoothness.\n\n## Memory\n\nKV-cache grows with prompt + output tokens. PagedAttention tiles it like virtual memory. Past 95 percent saturation, preempt low-priority requests.\n\n## Batching\n\nContinuous batching mixes prefill and decode each step, doubling throughput versus static batches. Prefix caching reuses system prompts.",
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
    relatedModuleIds: ["vector-search", "load-balancing"],
  },
  {
    id: "microservices-monolith",
    title: "Monolith to Microservices: Seams",
    difficulty: "intermediate",
    estimatedMinutes: 15,
    summary: "When to split, bounded contexts, strangler migration, and why distributed monoliths fail.",
    bodyMarkdown: "# Splitting Seams\n\nStart modular-monolith: strict module boundaries, one deployable. Split when teams block each other or scale needs diverge 10x.\n\n## Bounded contexts\n\nBilling, identity, and catalog change for different reasons — those are seams. Shared databases across services recreate the monolith with network hops.\n\n## Migration\n\nStrangler fig: route one endpoint at a time behind the gateway, dual-run, compare, cut over.",
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
    relatedModuleIds: ["acid-vs-base", "message-queues"],
  },
  {
    id: "observability-tracing",
    title: "Observability: Metrics, Traces & SLOs",
    difficulty: "foundations",
    estimatedMinutes: 14,
    summary: "RED/USE signals, tail sampling, burn-rate alerts, and reading a waterfall like a profiler.",
    bodyMarkdown: "# Observability\n\nRED (rate, errors, duration) per service plus USE (utilization, saturation, errors) per resource covers most pages. Traces connect the hops.\n\n## Sampling\n\nKeep 100 percent of errors and slow traces, 1 percent of successes — tail sampling preserves signal at 1/50th cost.\n\n## SLOs\n\nBurn-rate alerts (2 percent budget in 1h) beat static thresholds. Read waterfalls for the critical path, not total span count.",
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
    relatedModuleIds: ["load-balancing", "rate-limiting"],
  },
];

export const ENCYCLOPEDIA_MODULE_IDS: string[] = ENCYCLOPEDIA_MODULES.map((m) => m.id);

export const ENCYCLOPEDIA_MAP: Record<string, EncyclopediaModule> = Object.fromEntries(
  ENCYCLOPEDIA_MODULES.map((m) => [m.id, m]),
);

export function getEncyclopediaModule(id: string): EncyclopediaModule | undefined {
  return ENCYCLOPEDIA_MAP[id];
}

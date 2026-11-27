import type {
  Lesson,
  LessonStep,
  QuizQuestion,
  SecurityPractice,
  Track,
  VisualId,
} from "@/learning/platform/types";

const identifier = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const securityTitle = (threat: string): string => {
  const boundary = threat.search(/\b(?:when|so|because|through|after|during)\b/i);
  return boundary > 24 ? threat.slice(0, boundary).replace(/[.,]$/, "") : threat;
};

const STORY_HOOKS: Record<string, string> = {
  "replication-consistency": "Two courthouse clerks copy a deed book while a washed-out bridge forces them to choose between waiting and serving.",
  "sharding-hot-keys": "A warehouse divides books by region until one celebrity title creates a queue at a single filing room.",
  "consistent-hashing": "Bags move around a ring of lockers so replacing one locker does not reshuffle every bag in the building.",
  "raft-consensus": "A ship crew elects a captain in a storm and accepts orders only when a majority has recorded them.",
  "locks-circuit-breakers": "A repair workshop lends one key under a lease while an electrical breaker stops repeated failures from spreading.",
  "storage-engines": "A library keeps an append-only arrival log, a card catalog, compact daily notebooks, and dated reading-room snapshots.",
  "kafka-streaming": "Numbered mail slots in each neighborhood preserve local order while independent neighborhoods keep moving.",
  "distributed-transactions": "An airline, hotel, and rental desk coordinate a trip through staged promises, compensations, and one reliable receipt ledger.",
  "probabilistic-sketches": "A club counts hats without keeping names and checks membership with a compact wall of labeled switches.",
  "observability-slos": "A hospital triage board and a flight recorder turn scattered signals into promises, warnings, and evidence.",
};

const step = (value: Omit<LessonStep, "id">): LessonStep => ({
  id: identifier(value.title),
  ...value,
});
const practice = (value: Omit<SecurityPractice, "id" | "title">): SecurityPractice => ({
  id: identifier(securityTitle(value.threat)),
  title: securityTitle(value.threat),
  ...value,
});
const question = (value: Omit<QuizQuestion, "id">): QuizQuestion => ({
  id: `${value.topicId}-${value.kind}`,
  ...value,
});
const lesson = (value: Omit<Lesson, "slug" | "storyHook">): Lesson => ({
  slug: value.id,
  storyHook: STORY_HOOKS[value.id] ?? value.summary,
  ...value,
});
const visual = (value: VisualId): VisualId => value;

export const trackDistributed: Track = {
  id: "distributed",
  slug: "distributed",
  title: "Distributed Systems and Storage Internals",
  accent: "indigo",
  summary:
    "Learn how independent machines agree on data, distribute load, recover from failure, and preserve useful guarantees under delay. The track connects replication and consensus to sharding, storage engines, event streams, transactions, sketches, and operational measurement.",
  lessons: [
    lesson({
      id: "replication-consistency",
      trackId: "distributed",
      title: "Replication and Consistency",
      summary:
        "Compare synchronous and asynchronous copies, quorum reads and writes, the CAP partition choice, and PACELC's latency-versus-consistency tradeoff.",
      minutes: 13,
      prerequisites: ["scaling-databases"],
      steps: [
        step({
          title: "Two desks copy the deed book",
          story:
            "A courthouse keeps property deeds in two buildings. In the careful method, the central clerk waits until the branch clerk signs the same page before telling an owner that a transfer is complete. This gives both offices the same answer, but a slow courier makes every customer wait. In the faster method, the central clerk records the page immediately and sends a copy later. Customers finish sooner, yet the branch may briefly show the previous owner. The clerk labels each copy with a page number so a reader can tell which version is being used.",
          engineer:
            "Synchronous replication waits for one or more remote copies before acknowledging a write, improving durability and freshness while adding latency and dependency on replica availability. Asynchronous replication acknowledges locally and ships changes later, reducing write latency but allowing lag and possible data loss during failover. Semi-synchronous approaches wait for at least one replica and let others catch up. Measure commit latency, replication position, and the age of the newest usable copy. A common failure is describing asynchronous replication as a backup: it faithfully copies accidental deletes and does not provide historical recovery. Product behavior must state which reads may observe stale data.",
          visualId: visual("replication"),
          visualCaption:
            "A primary waits for some replicas while other copies receive the same versioned change asynchronously.",
        }),
        step({
          title: "Collect enough signatures to decide",
          story:
            "For an urgent deed correction, the courthouse asks three offices to respond. If two offices confirm the same page number, the clerk can trust that version even when the third office is unreachable. A customer who reads only one office might still receive an older page, so urgent readers also consult two offices and choose the newest confirmed version. The rule works only when every response carries a version and when a writer cannot change its story after another clerk has taken over. Counting signatures without matching the actual document would create confidence without agreement.",
          engineer:
            "Quorum replication stores each version across multiple nodes. A write quorum W and read quorum R can provide overlap when R plus W exceeds the number of replicas N, but the protocol must also compare versions and handle concurrent writers correctly. Quorums trade availability against coordination: smaller quorums reduce latency and tolerate more failures but can weaken guarantees. Read repair and anti-entropy gradually converge replicas. A frequent failure is assuming R plus W greater than N automatically prevents stale reads while ignoring version comparison, sloppy quorums, or failed handoffs. Specify the exact consistency model and test behavior during partitions and delayed messages rather than relying on the formula alone.",
          visualId: visual("replication"),
          visualCaption:
            "Versioned read and write quorums overlap while an unreachable replica remains outside the decision.",
        }),
        step({
          title: "The bridge is gone",
          story:
            "A storm washes out the bridge between the courthouse and its branch. The central clerk can still record local deeds, while the branch can still record local transfers, but neither can immediately know what the other is doing. Allowing both offices to issue final ownership certificates would create conflicting claims. The courthouse therefore chooses one side to keep certifying deeds while the other pauses that service, or it pauses certification on both sides until contact returns. The choice depends on whether wrong ownership is worse than temporary unavailability, not on which option sounds more impressive.",
          engineer:
            "The CAP theorem describes a system's behavior during a network partition: it cannot simultaneously guarantee linearizable consistency for every operation and availability for every request when messages may be lost. It does not say that consistency or availability is always impossible in normal operation. Systems often preserve consistency for a critical subset and degrade other features. PACELC extends this reasoning: during a partition choose availability or consistency, and else, during ordinary operation, choose latency or consistency. A dangerous failure is quietly switching to local writes on both sides of a partition without fencing or conflict rules. Make the partition policy explicit per operation class.",
          visualId: visual("replication"),
          visualCaption:
            "A partition separates two replicas and forces an explicit choice between local availability and coordinated consistency.",
        }),
        step({
          title: "Quiet days still have a price",
          story:
            "Even when the bridge is open, the courthouse can make customers wait for a signature from another building on every deed. That careful habit feels safe, but a hundred small transfers become a long line. The manager separates urgent ownership changes, which require coordinated confirmation, from a public list of newly filed documents that can lag by a few seconds. A dashboard shows both waiting time and how old each branch copy is. The office learns that consistency is not one switch for the whole courthouse; it is a promise attached to a particular question.",
          engineer:
            "PACELC's else branch captures the everyday tradeoff between latency and consistency. Strong coordination costs network round trips and waiting for the slowest participant; local or asynchronous decisions return faster with weaker visibility. Use the weakest consistency that satisfies the business invariant, and express it as an API guarantee. Session consistency, monotonic reads, causal ordering, and linearizability serve different needs. Avoid spreading one global consistency label across operations with different requirements. A common production failure is optimizing p50 commit latency while p99 stalls during cross-region coordination, then hiding the stall behind client retries that add more load and can duplicate work.",
          visualId: visual("replication"),
          visualCaption:
            "Urgent writes pay a coordination cost while delay-tolerant read models advance independently.",
        }),
      ],
      security: [
        practice({
          threat:
            "A partitioned or demoted replica continues accepting writes and creates a second authoritative history after failover.",
          control:
            "Use quorum-based leadership, external fencing tokens, and network policy that removes write access from demoted nodes before promotion.",
          verify:
            "Run a controlled partition and failover exercise, confirming that the former leader rejects writes and emits an attributable fencing event.",
        }),
        practice({
          threat:
            "An untrusted node or network attacker impersonates a replica, reads changes, or injects records into the replication stream.",
          control:
            "Require mutually authenticated TLS between replicas, verify node identity and cluster membership, and authorize replication streams by source and destination.",
          verify:
            "Test that untrusted certificates and non-member nodes cannot join or read the stream, and inspect logs for verified peer identities.",
        }),
        practice({
          threat:
            "Old or duplicated replication messages are applied again, moving a record backward or repeating a sensitive state transition.",
          control:
            "Include term, log position, and record version in replication messages, reject stale entries, and make state transitions idempotent at their destination.",
          verify:
            "Replay authorized duplicate and out-of-order test messages and confirm the replica rejects stale versions without changing current state.",
        }),
      ],
      quiz: [
        question({
          topicId: "replication-consistency",
          kind: "scenario",
          prompt:
            "A product can display a follower count that is several seconds old but must never lose a confirmed payment. Which replication choice best matches those needs?",
          choices: [
            "Use asynchronous reads for the count and a durably coordinated write path for payments",
            "Serve both from any asynchronous replica",
            "Make every operation wait for all replicas worldwide",
            "Remove versioning from payment records",
          ],
          answerIndex: 0,
          explanation:
            "Different operations can use different consistency guarantees: stale-tolerant display reads and durable authoritative payment writes.",
        }),
        question({
          topicId: "replication-consistency",
          kind: "security",
          prompt:
            "Why is fencing required when promoting a new primary?",
          choices: [
            "To make replication asynchronous",
            "To stop the old primary from issuing conflicting writes after losing leadership",
            "To increase DNS caching",
            "To remove the need for authentication",
          ],
          answerIndex: 1,
          explanation:
            "Fencing establishes one write authority and prevents a partitioned former leader from continuing to mutate state.",
        }),
        question({
          topicId: "replication-consistency",
          kind: "tradeoff",
          prompt:
            "What does PACELC add beyond CAP?",
          choices: [
            "It describes only hardware failures",
            "It includes the normal-operation tradeoff between latency and consistency when there is no partition",
            "It guarantees availability during every partition",
            "It replaces versioned replication",
          ],
          answerIndex: 1,
          explanation:
            "PACELC addresses the else case: even without a partition, stronger coordination usually costs latency.",
        }),
        question({
          topicId: "replication-consistency",
          kind: "story-match",
          prompt:
            "In the courthouse story, what do matching page numbers on two signed responses provide?",
          choices: [
            "Proof that both offices are discussing the same version",
            "A guarantee that every future write is instantaneous",
            "A replacement for node authentication",
            "A cache eviction policy",
          ],
          answerIndex: 0,
          explanation:
            "Quorum responses must refer to comparable versions; counting unrelated signatures does not establish agreement.",
        }),
      ],
    }),
    lesson({
      id: "sharding-hot-keys",
      trackId: "distributed",
      title: "Sharding and Hot Keys",
      summary:
        "Distribute data and write ownership with a deliberate shard key, then detect and relieve hot partitions without breaking tenant isolation.",
      minutes: 11,
      prerequisites: ["replication-consistency"],
      steps: [
        step({
          title: "Divide the warehouse by region",
          story:
            "A regional warehouse stores books labeled with destination codes. One room handles codes beginning with A through F, another handles G through M, and a third handles N through Z. Each clerk can find a shelf quickly because the first letter points to a room. The arrangement also makes it easy to store similar destinations together. Later, a popular series receives thousands of books with the same first letter, and one room fills while the others have empty shelves. Dividing work required choosing a label, and every label has a pattern that can become uneven.",
          engineer:
            "Range partitioning orders keys and assigns contiguous ranges to shards. It supports efficient range scans and predictable placement, but skewed or sequential keys can concentrate traffic and writes. Hash partitioning applies a hash function to the shard key, distributing values more evenly while sacrificing natural range locality. Directory-based routing stores an explicit key-to-shard map and supports flexible placement at the cost of another stateful component. Choose the key from actual access patterns, data volume, growth, and transaction boundaries. A common failure is sharding by a monotonically increasing identifier and creating one write hotspot on the newest shard.",
          visualId: visual("sharding"),
          visualCaption:
            "Range and hash strategies map ordered keys onto independent storage shards.",
        }),
        step({
          title: "The routing desk knows the room",
          story:
            "Customers no longer search every warehouse room. A routing desk receives the destination code, checks a current floor plan, and points to the responsible room. The floor plan can live in a replicated configuration service or be cached by each clerk with a version number. When a room changes, the desk publishes a new plan and old plans expire. If the routing desk itself fails, clerks can use a recent signed copy rather than guessing. The map must never contradict the physical location of a book, or a correct lookup becomes an apparent data loss.",
          engineer:
            "Shard routing can be computed directly from a hash, stored in a directory, or discovered through a range metadata service. The router should be stateless or highly available, and cached maps need versions and bounded staleness. Scatter-gather queries fan out to several shards and then merge results, increasing tail latency and load. Cross-shard joins and transactions require explicit coordination and often become the dominant cost. A frequent failure is moving data without atomically updating routing metadata, causing requests to reach an empty shard. Use a migration state machine with validation, bounded traffic shifts, and a rollback plan.",
          visualId: visual("sharding"),
          visualCaption:
            "A versioned routing map sends each key to its current shard during stable operation and migration.",
        }),
        step({
          title: "One celebrity fills one room",
          story:
            "A famous author releases a new book, and every order carries the same title code. Even if the warehouse has twenty rooms, that title belongs to one room, so nineteen clerks watch while one clerk stacks boxes. The manager tries adding copies to several rooms, but then needs a rule for which copy owns inventory. Another solution gives the title its own sub-rooms and routes requests among them. The manager also limits how many boxes one title can send per minute while reserving capacity for ordinary orders. Spreading unrelated work cannot solve a key that everyone genuinely needs.",
          engineer:
            "A hot key concentrates reads or writes on one partition despite an otherwise balanced shard count. Detect it using per-shard throughput, latency, CPU, storage growth, and queue depth rather than aggregate averages. Remedies include caching reads, splitting a logical key into bounded subkeys, replicating read-only data, queuing writes, or moving the key to dedicated capacity. Each remedy adds consistency or routing complexity, and splitting writes does not automatically split an atomic counter. A common failure is applying rate limits only at the service edge while internal workers continue to hammer the same partition. Budget hot-key capacity explicitly and alert before the partition saturates.",
          visualId: visual("sharding"),
          visualCaption:
            "One hot key saturates a single shard while dedicated subshards and admission limits relieve pressure.",
        }),
        step({
          title: "Move shelves without losing the map",
          story:
            "The warehouse opens a new room and transfers some shelves. Staff first copy the books, verify counts and checksums, then update the floor plan for a small group of destinations. Clerks using the old plan are forwarded to the new room for a short transition. After traffic has moved, the old copies are removed. If the new room fails, the manager can restore the previous plan while copies still exist. Every step leaves a written record of which room owns each destination, so no clerk is forced to improvise during a busy shift.",
          engineer:
            "Resharding changes ownership and must preserve routing correctness throughout the transition. A typical sequence creates the new topology, copies and verifies data, dual-routes or forwards reads, shifts writes, validates invariants, and removes obsolete copies. Backpressure prevents migration from starving user traffic. Consistent hashing can reduce movement for some layouts, but it does not eliminate migration state or metadata. A dangerous failure is deleting source data before confirming that every destination copy and index is complete. Measure migration lag, failed records, duplicate writes, and client-visible errors, and rehearse rollback with representative data volume.",
          visualId: visual("consistent-hash"),
          visualCaption:
            "A staged shard migration copies, verifies, shifts routing, and retains rollback data until completion.",
        }),
      ],
      security: [
        practice({
          threat:
            "Routing mistakes or overly broad administrative access allow one tenant to read or modify another tenant's shard.",
          control:
            "Include tenant identity in authorization, enforce database roles and network policies per shard, and validate tenant boundaries in routing and migration jobs.",
          verify:
            "Run cross-tenant read, write, and migration tests and confirm that application credentials cannot enumerate or access unrelated tenant data.",
        }),
        practice({
          threat:
            "A hot key drives one shard into sustained saturation and denies service to unrelated tenants sharing that failure domain.",
          control:
            "Apply per-tenant and per-key admission limits, reserve shard headroom, isolate sensitive workloads, and provide bounded caching or subkey strategies for legitimate spikes.",
          verify:
            "Use an authorized hot-key load test and confirm unrelated shards remain healthy while the affected tenant receives controlled backpressure.",
        }),
        practice({
          threat:
            "Forged or stale routing metadata sends requests to the wrong shard or causes data to be copied into an unauthorized destination.",
          control:
            "Authenticate topology changes, version and sign routing metadata where appropriate, restrict migration permissions, and validate destination identity before copying.",
          verify:
            "Test rejection of unauthorized or outdated topology updates and audit each migration with approved source, destination, actor, and completion evidence.",
        }),
      ],
      quiz: [
        question({
          topicId: "sharding-hot-keys",
          kind: "scenario",
          prompt:
            "A table is evenly sharded by user ID, but one public figure's timeline receives most reads. What is the most direct response?",
          choices: [
            "Add unrelated shards and assume the key spreads itself",
            "Use bounded caching or dedicated read capacity for that key while preserving its write authority",
            "Remove the shard key",
            "Route every read to every shard",
          ],
          answerIndex: 1,
          explanation:
            "A single logical hot key stays on one shard, so it needs targeted capacity, caching, or a deliberate split strategy.",
        }),
        question({
          topicId: "sharding-hot-keys",
          kind: "security",
          prompt:
            "Why should shard routing enforce tenant authorization rather than only mapping a key?",
          choices: [
            "A correct physical route can still target another tenant's data",
            "Routing metadata removes the need for encryption",
            "Hash functions authenticate users",
            "Every shard must be public",
          ],
          answerIndex: 0,
          explanation:
            "Placement and permission are separate concerns; a router must not become a way to bypass tenant isolation.",
        }),
        question({
          topicId: "sharding-hot-keys",
          kind: "tradeoff",
          prompt:
            "What is a common drawback of hash partitioning compared with range partitioning?",
          choices: [
            "It cannot use primary keys",
            "It makes natural range scans and ordered access require scatter-gather work",
            "It always creates one giant shard",
            "It eliminates the need for routing metadata",
          ],
          answerIndex: 1,
          explanation:
            "Hashing improves distribution but scatters related ranges, so range queries may touch many shards.",
        }),
        question({
          topicId: "sharding-hot-keys",
          kind: "story-match",
          prompt:
            "In the warehouse story, why does one celebrity title overload a room despite many available rooms?",
          choices: [
            "The title is a hot key whose requests still map to one owner",
            "The floor plan has no versions",
            "Every book uses range partitioning",
            "The building has no clerks",
          ],
          answerIndex: 0,
          explanation:
            "Adding unrelated shards does not distribute a key whose requests all resolve to the same partition.",
        }),
      ],
    }),
    lesson({
      id: "consistent-hashing",
      trackId: "distributed",
      title: "Consistent Hashing",
      summary:
        "Map keys onto a token ring, use virtual nodes for balance, and handle membership changes without moving the entire dataset.",
      minutes: 10,
      prerequisites: ["sharding-hot-keys"],
      steps: [
        step({
          title: "Lockers stand in a ring",
          story:
            "A station stores bags in lockers arranged around a circular wall. Each locker has a numbered position, and each bag's label is converted into another position on the same circle. The bag goes into the first locker encountered when walking clockwise from its label position. If locker four breaks, only bags whose clockwise path ended there move to the next working locker. Bags assigned to lockers elsewhere keep their places. The circular order, rather than a fresh assignment of every bag, is what prevents one broken locker from reshuffling the entire room.",
          engineer:
            "Consistent hashing hashes keys and node identifiers into a shared numeric space, usually a ring. A key is owned by the first node at or after its hash position, with wraparound at the end. When a node joins or leaves, only keys in the affected interval change ownership, rather than every key as in modulo-N hashing. The benefit depends on a stable hash function, consistent membership views, and controlled handoff. A common failure is treating the ring as a complete distributed database: it solves placement, not replication, durability, routing authority, or concurrent migration. Those concerns still require explicit protocols.",
          visualId: visual("consistent-hash"),
          visualCaption:
            "Keys map clockwise to ring nodes and only an interval changes owner when a node leaves.",
        }),
        step({
          title: "One locker can own too much wall",
          story:
            "The station manager notices that a single locker receives a large share of bags because node positions landed unevenly. Instead of giving each locker one point on the circle, the manager gives the same physical locker several smaller labeled positions spread around the ring. Those virtual points still lead to the same locker, but they divide the ownership intervals into more pieces. A locker with more virtual points receives more intervals, so the manager can adjust capacity by changing point counts. The wall looks more detailed, while the number of actual storage lockers stays small.",
          engineer:
            "Virtual nodes place multiple tokens for each physical node around the ring. They reduce variance in key ownership and make membership changes less abrupt, at the cost of more metadata and routing lookups. Weighted virtual nodes let larger nodes own more intervals. Choose enough tokens to smooth distribution without making every membership update expensive; the correct count depends on node count, churn, and implementation. A frequent failure is assuming virtual nodes eliminate hot keys: a single key still hashes to one owner. They balance the distribution of many keys, not the traffic of one unusually popular key, so hot-key controls remain necessary.",
          visualId: visual("consistent-hash"),
          visualCaption:
            "Multiple virtual points per physical node divide the ring into smoother ownership intervals.",
        }),
        step({
          title: "Repair a locker without losing bags",
          story:
            "When a new locker opens, it takes over one arc of the circle. Staff do not immediately empty the old locker. They mark the arc as moving, copy bags to the new locker, verify labels and contents, and then send future arrivals directly there. Clerks who still hold the old floor plan are forwarded during the transition. When the new locker is removed, the process reverses. Because each arc has a clear previous and next owner, staff know exactly which bags require attention instead of checking every locker in the station.",
          engineer:
            "Membership changes require a handoff protocol. The new owner can fetch a range from the old owner, with explicit state for planned, copying, serving, and complete. Requests may be served by the old owner until the new range is ready, but writes need forwarding or version checks to avoid divergence. Membership views should converge through gossip or a coordination service, and clients should detect stale ownership. A dangerous failure is deleting the old copy immediately after a timeout while the new owner has not verified completeness. Track migration progress and checksums, cap concurrent transfers, and retain rollback data until validation succeeds.",
          visualId: visual("consistent-hash"),
          visualCaption:
            "A new ring node copies and verifies its interval before taking ownership while old data remains available.",
        }),
        step({
          title: "A trustworthy circle needs trusted members",
          story:
            "A visitor once moved a locker's numbered sign, causing bags to be handed to the wrong place. The station now authenticates every membership change, records who approved it, and publishes a signed version of the floor plan. Duplicate copies of a bag are placed in lockers with separate failure domains, not adjacent positions that one broken wall section could destroy. Clerks reject an old floor plan for sensitive transfers and report conflicting plans instead of guessing. The ring remains useful because its order is simple, but its safety comes from verified membership and deliberate replica placement.",
          engineer:
            "Ring metadata is security-sensitive because it determines data placement and ownership. Authenticate nodes, authorize membership updates, version the topology, and monitor unexpected token changes. Replica placement should account for failure domains rather than blindly using the next token, which may belong to the same host or availability zone. During churn, stale ring views can create overlapping owners, so operations that require uniqueness need fencing or a stronger coordination layer. A common failure is assuming cryptographic hashing makes membership trustworthy; hashing provides distribution, not authentication. Protect control-plane access and audit topology changes just as carefully as data-plane requests.",
          visualId: visual("consistent-hash"),
          visualCaption:
            "Authenticated ring membership and failure-domain-aware replica placement protect ownership intervals.",
        }),
      ],
      security: [
        practice({
          threat:
            "An unauthorized membership update changes token ownership and redirects data or requests to an attacker-controlled node.",
          control:
            "Authenticate cluster members, restrict topology administration, version membership updates, and audit every token or weight change.",
          verify:
            "Attempt an authorized negative test with a non-member identity and confirm it cannot alter the ring or receive data traffic.",
        }),
        practice({
          threat:
            "Stale ring views create overlapping owners and allow conflicting writes during rapid membership changes.",
          control:
            "Require monotonically versioned topology, reject older views for ownership-sensitive operations, and use fencing or forwarding while views converge.",
          verify:
            "Exercise rapid join and leave events and confirm that stale routers cannot commit conflicting writes or silently acknowledge lost updates.",
        }),
        practice({
          threat:
            "Replicas chosen by adjacent ring tokens share one machine, rack, or zone and fail together.",
          control:
            "Choose replicas across failure domains, verify placement constraints during membership changes, and alert when ring tokens violate isolation policy.",
          verify:
            "Inspect replica placement for representative rings and run a controlled node or zone loss to confirm the configured redundancy remains available.",
        }),
      ],
      quiz: [
        question({
          topicId: "consistent-hashing",
          kind: "scenario",
          prompt:
            "What is the main advantage of consistent hashing over simple modulo assignment when one node leaves?",
          choices: [
            "Only keys in the departed node's interval need reassignment",
            "No keys ever need reassignment",
            "Every key becomes immediately durable",
            "Replication is no longer required",
          ],
          answerIndex: 0,
          explanation:
            "The ring localizes ownership changes to the affected interval instead of reshuffling the whole keyspace.",
        }),
        question({
          topicId: "consistent-hashing",
          kind: "security",
          prompt:
            "Why must ring membership updates be authenticated?",
          choices: [
            "Hashing encrypts the node's storage",
            "An unapproved token change can redirect ownership and data to an unauthorized node",
            "Authentication increases key entropy",
            "The ring otherwise becomes a cache",
          ],
          answerIndex: 1,
          explanation:
            "Topology controls data placement, so unauthorized changes are a control-plane integrity risk.",
        }),
        question({
          topicId: "consistent-hashing",
          kind: "tradeoff",
          prompt:
            "Why use virtual nodes?",
          choices: [
            "They guarantee that no key can ever be hot",
            "They smooth key distribution across physical nodes at the cost of more ring metadata",
            "They eliminate replication",
            "They make all range queries local",
          ],
          answerIndex: 1,
          explanation:
            "More tokens reduce ownership variance and movement imbalance but increase metadata and routing complexity.",
        }),
        question({
          topicId: "consistent-hashing",
          kind: "story-match",
          prompt:
            "In the locker story, what keeps bags assigned to other lockers from moving?",
          choices: [
            "The clockwise ring order changes only the broken locker's interval",
            "Every bag is assigned randomly after each change",
            "All lockers share one bag",
            "The station deletes the ring",
          ],
          answerIndex: 0,
          explanation:
            "Consistent hashing limits reassignment to keys whose ownership interval changed.",
        }),
      ],
    }),
    lesson({
      id: "raft-consensus",
      trackId: "distributed",
      title: "Consensus with Raft",
      summary:
        "Follow leader election, log replication, majority commitment, and safe membership changes while preserving one authoritative history.",
      minutes: 13,
      prerequisites: ["replication-consistency"],
      steps: [
        step({
          title: "A storm requires one captain",
          story:
            "A ship crew loses radio contact during a storm. Several officers could give steering orders, but contradictory instructions would be worse than waiting. The crew agrees that an officer becomes captain only after a majority of available officers votes for that person in the current emergency term. If nobody receives a majority, the ship continues on its last safe heading while the crew votes again. A captain who cannot reach the majority stops issuing new orders. The crew values one clear authority more than having every possible officer shout at once.",
          engineer:
            "Raft is a consensus algorithm for replicating a log across a majority of nodes. Nodes begin as followers and become candidates when an election timeout expires without hearing from a leader. A candidate increments its term and requests votes; a node grants at most one vote per term under the protocol's rules. Randomized timeouts reduce repeated split votes. A leader sends periodic heartbeats and must receive a majority to remain authoritative. A common failure is treating a candidate's self-vote as leadership or allowing two leaders in the same term. Monitoring term changes and election frequency helps detect unstable timing or network problems.",
          visualId: visual("raft-election"),
          visualCaption:
            "Followers time out, candidates request votes, and a majority elects one leader for the current term.",
        }),
        step({
          title: "Orders are numbered, not repeated from memory",
          story:
            "The captain writes each steering order on a numbered page and sends copies to the officers. Each officer appends the page to a bound log rather than rewriting previous pages. The captain tracks which page numbers a majority has stored. A new captain first studies the last completed pages before adding a new order, so it does not erase a command the crew already followed. If an officer missed a page, the captain sends the missing sequence. The bound log turns spoken instructions into a record that can be compared, repaired, and continued.",
          engineer:
            "The leader appends client commands to its log with increasing indexes and sends them to followers. Followers persist entries according to the configured durability rules and acknowledge them. The leader advances the commit index when a majority has replicated an entry under Raft's safety conditions. Log matching uses term and index to detect conflicts; the leader forces its authoritative history when needed. A frequent failure is acknowledging a write before it is committed by a majority, or assuming that a locally stored entry is automatically durable. Client retries should carry operation identifiers so a lost response does not create duplicate commands.",
          visualId: visual("raft-election"),
          visualCaption:
            "A leader appends indexed orders and advances commit only after majority replication.",
        }),
        step({
          title: "The oldest promise still matters",
          story:
            "During the storm, a captain who has been isolated continues writing private orders in a notebook. The rest of the crew elects another captain and follows a shared log. When the isolated officer returns, their notebook contains orders that were never accepted by a majority. The crew does not splice those pages into the shared record. It compares page numbers and terms, discards the uncommitted suffix, and catches up with the accepted history. A late writer cannot rewrite the past simply because their notebook is longer or newer in wall-clock time.",
          engineer:
            "Raft's election restriction and log-matching rules ensure that committed entries survive leadership changes. A leader must contain all previously committed entries, and only entries from the leader's current term are committed directly by counting replicas; earlier entries commit indirectly when a current-term entry does. This prevents a new leader from overwriting history that clients already observed. A subtle failure is implementing a majority vote without the election restriction or comparing only log length. Test delayed old leaders, lost acknowledgments, and crash recovery at every log boundary. Clients need commit awareness, not merely an append acknowledgment.",
          visualId: visual("raft-election"),
          visualCaption:
            "A returning stale leader discards its uncommitted suffix and adopts the majority's committed history.",
        }),
        step({
          title: "Change the crew without two captains",
          story:
            "The ship needs to replace an officer who is leaving. Removing and adding officers at the same moment could create a temporary overlap where neither group has a clear majority. The captain first introduces the replacement as a learner who copies the log but does not vote. Once the new officer is caught up, the crew records a joint membership change and waits for the required majorities before completing the switch. Throughout the process, one term has one leader, and a removed officer loses authority before it can issue accepted orders.",
          engineer:
            "Single-node membership changes can create periods with two disjoint majorities, so production Raft implementations use joint consensus or a carefully defined phased approach. Learners replicate data without voting until caught up. Membership configuration is itself a log entry, and leadership and write authority must be fenced when nodes are removed. A common failure is changing configuration from an operator console without consensus, or promoting a learner that is far behind. Bound catch-up time, monitor replication position, and rehearse node loss during membership changes. Raft coordinates a replicated log; it does not automatically make every external side effect atomic.",
          visualId: visual("raft-election"),
          visualCaption:
            "A learner catches up before a joint membership change transfers voting authority safely.",
        }),
      ],
      security: [
        practice({
          threat:
            "A node with stale credentials or a demoted leader participates in elections or accepts writes after replacement.",
          control:
            "Rotate node credentials, remove membership through consensus, fence demoted nodes, and enforce network policy against unauthorized control-plane access.",
          verify:
            "During a controlled membership exercise, confirm a removed node cannot collect votes, extend its term, or commit new entries.",
        }),
        practice({
          threat:
            "An attacker impersonates a voter or leader and injects false votes, heartbeats, or log entries.",
          control:
            "Require mutually authenticated TLS with verified node identities, restrict Raft ports to cluster members, and rotate certificates before expiration.",
          verify:
            "Test that untrusted identities cannot connect or vote and inspect logs to confirm every accepted Raft message has a verified peer identity.",
        }),
        practice({
          threat:
            "Captured or delayed messages from an old term are applied as current orders, corrupting the replicated log.",
          control:
            "Carry term and log-index metadata, reject stale-term leadership messages, enforce log matching, and make client command application idempotent.",
          verify:
            "Replay controlled duplicate and old-term messages and confirm they cannot change the current leader, commit index, or authoritative state.",
        }),
      ],
      quiz: [
        question({
          topicId: "raft-consensus",
          kind: "scenario",
          prompt:
            "A five-node Raft cluster loses two nodes. What is required for the remaining cluster to continue committing writes?",
          choices: [
            "One available node",
            "A majority of the full five-node membership, which is three nodes",
            "All five original nodes",
            "Two candidates without a leader",
          ],
          answerIndex: 1,
          explanation:
            "Raft needs a majority of the configured membership, so three of five nodes must participate for elections and commits.",
        }),
        question({
          topicId: "raft-consensus",
          kind: "security",
          prompt:
            "Why authenticate every Raft peer?",
          choices: [
            "To make log entries smaller",
            "To prevent outsiders from forging votes, heartbeats, or replicated entries",
            "To eliminate leader election",
            "To guarantee exactly-once client side effects",
          ],
          answerIndex: 1,
          explanation:
            "Consensus messages determine authority and history, so peer identity must be verified before accepting them.",
        }),
        question({
          topicId: "raft-consensus",
          kind: "tradeoff",
          prompt:
            "What is a central safety condition that prevents committed history from being overwritten?",
          choices: [
            "Always choosing the node with the longest log",
            "Restricting elections and using log-matching rules so a leader contains every committed entry",
            "Allowing every node to write independently",
            "Using wall-clock timestamps as the only version",
          ],
          answerIndex: 1,
          explanation:
            "Raft's election restriction plus term-and-index log matching preserve committed entries across leadership changes.",
        }),
        question({
          topicId: "raft-consensus",
          kind: "story-match",
          prompt:
            "In the ship story, what does the isolated captain's longer notebook represent?",
          choices: [
            "An uncommitted suffix that must be discarded when it conflicts with majority history",
            "A valid majority commit",
            "A new election term",
            "A durable client acknowledgment",
          ],
          answerIndex: 0,
          explanation:
            "Local log length does not establish authority; entries not committed by a majority cannot override accepted history.",
        }),
      ],
    }),
    lesson({
      id: "locks-circuit-breakers",
      trackId: "distributed",
      title: "Distributed Locks and Circuit Breakers",
      summary:
        "Use expiring locks with fencing tokens for mutual exclusion and circuit breakers to contain dependency failures without creating a new outage.",
      minutes: 11,
      prerequisites: ["raft-consensus"],
      steps: [
        step({
          title: "The workshop key comes with a time limit",
          story:
            "A repair workshop has one cutting machine and lends its key to a mechanic for ten minutes. The key card records the borrower, the expiry time, and a steadily increasing claim number. If the mechanic disappears, the card expires and another mechanic can borrow the key. The machine also checks the claim number before starting, so a mechanic who returns late with an old card cannot cut a newer job. The lock reduces collisions, but the machine's own check is what makes an expired promise harmless. Staff practice an expired-card drill before busy weekends.",
          engineer:
            "A distributed lock coordinates access to a shared resource across processes, commonly through a lease stored in a strongly consistent service. The owner renews the lease while work continues, and the resource rejects expired ownership. Leases improve availability because a dead holder cannot block the resource forever, but they introduce the possibility of a paused holder resuming after expiry. Network delays, garbage collection, and clock skew make this real. A common failure is treating lock acquisition as permanent protection while performing long work outside the lease. Keep critical sections bounded and define what happens when renewal fails.",
          visualId: visual("threat-defense"),
          visualCaption:
            "An expiring workshop key grants temporary ownership while the protected machine checks claim authority.",
        }),
        step({
          title: "The machine trusts a claim number, not a key shape",
          story:
            "Two mechanics believe they hold the workshop key because the first mechanic paused past the expiry time. Both keys look identical, so the machine cannot distinguish them by appearance. The claim number solves the argument: each new loan receives a larger number, and the machine remembers the largest number it has accepted. The mechanic with the smaller number is refused even if the key still opens the cabinet. The cabinet lock prevents casual collisions; the monotonic claim fence protects the actual cutting operation from an expired owner. The claim number remains attached to every completed repair.",
          engineer:
            "Fencing tokens are monotonically increasing numbers issued with a lease. The protected resource stores the highest accepted token and rejects operations carrying older tokens. This shifts correctness from the lock client to the resource that performs the side effect, which is essential because a client can pause after acquiring a lock and before writing. Some resources support native fencing; others require a conditional write or compare-and-swap on a version column. A frequent failure is fencing only the lock service while the database, queue, or external API accepts stale writes. Every resource that requires mutual exclusion must participate in the same fencing protocol.",
          visualId: visual("threat-defense"),
          visualCaption:
            "A protected resource rejects older fencing tokens even when two clients temporarily believe they own the lease.",
        }),
        step({
          title: "The breaker opens before the room goes dark",
          story:
            "A workshop tool repeatedly overheats. At first, mechanics keep trying it and burn out other equipment while waiting. The manager installs a breaker that counts recent failures and opens after a threshold, redirecting mechanics to a safe manual process. While open, a small number of trial jobs test whether the tool has recovered. If trials succeed, the breaker closes gradually; if they fail, it stays open and waits longer. The breaker does not repair the tool, but it prevents one broken dependency from consuming every worker and hiding the original problem.",
          engineer:
            "A circuit breaker wraps calls to a dependency and moves among closed, open, and half-open states. In the closed state, calls pass and failures are measured over a window or count. The open state rejects calls quickly for a cooldown period. Half-open admits limited probes before deciding whether to close or reopen. Choose thresholds from normal failure rates and recovery behavior, and separate dependency failures from client errors. A frequent failure is opening breakers for expected validation rejections or keeping them open forever after recovery. Emit state-transition metrics and preserve a fallback with defined freshness and functionality limits.",
          visualId: visual("threat-defense"),
          visualCaption:
            "A circuit breaker stops repeated dependency calls, tests recovery with probes, and gradually resumes traffic.",
        }),
        step({
          title: "Fallbacks need limits and an exit plan",
          story:
            "The workshop's manual fallback uses a smaller hand tool. It keeps essential repairs moving, but it is slower and cannot perform every task. The manager posts which jobs are allowed, caps how many mechanics use the fallback, and alerts when demand exceeds that cap. A ticket shows whether the result came from the powered machine or the manual method so customers are not misled. When the breaker closes, mechanics return gradually instead of creating a synchronized rush. The fallback is a controlled degradation, not a promise that the broken machine never mattered.",
          engineer:
            "Combine breakers with timeouts, concurrency limits, retry budgets, and load shedding. A timeout bounds how long a caller waits, while a breaker prevents repeated calls to a dependency that is already failing. Retries should be limited, jittered, and safe for the operation. Bulkheads isolate resource pools so one dependency cannot consume all threads or connections. A common failure is layering aggressive retries over an open breaker and accidentally defeating it, or allowing every caller to execute the same expensive fallback. Measure fallback saturation and degraded results separately, and define criteria for full recovery and rollback.",
          visualId: visual("rate-limiter"),
          visualCaption:
            "Timeouts, bulkheads, bounded retries, and a capped fallback contain a failing dependency.",
        }),
      ],
      security: [
        practice({
          threat:
            "A paused or malicious client continues using an expired lock lease and performs privileged work after another owner has taken over.",
          control:
            "Issue short renewable leases with monotonic fencing tokens and require protected resources to reject tokens older than the highest accepted value.",
          verify:
            "Use a controlled pause past lease expiry and confirm the old owner's operation is rejected by the resource, not merely unable to renew the lock.",
        }),
        practice({
          threat:
            "Unauthorized clients acquire locks, renew other owners' leases, force breakers open, or change their thresholds.",
          control:
            "Authenticate lock and breaker administration, authorize by resource and action, separate read from write permissions, and audit lease and policy changes.",
          verify:
            "Test that non-owners cannot renew or release a lease and that unapproved identities cannot modify breaker configuration or state.",
        }),
        practice({
          threat:
            "An attacker induces dependency failures to hold a circuit open and deny service through the fallback path.",
          control:
            "Monitor breaker transitions and fallback saturation, isolate per-tenant bulkheads, cap fallback concurrency, and require an authenticated recovery procedure.",
          verify:
            "Run an authorized dependency-failure exercise and confirm unaffected tenants retain capacity while open-breaker and fallback alerts identify the affected scope.",
        }),
      ],
      quiz: [
        question({
          topicId: "locks-circuit-breakers",
          kind: "scenario",
          prompt:
            "A worker acquires a lease, pauses past its expiry, and resumes while another worker owns the resource. What protects the resource?",
          choices: [
            "The original key's appearance",
            "A fencing token check that rejects the older owner's operation",
            "A longer client timeout",
            "A circuit breaker only",
          ],
          answerIndex: 1,
          explanation:
            "Lease expiry can let two clients believe they own a lock; resource-side fencing rejects the stale owner.",
        }),
        question({
          topicId: "locks-circuit-breakers",
          kind: "security",
          prompt:
            "Why should protected resources enforce fencing tokens rather than relying only on the lock service?",
          choices: [
            "The lock service cannot experience network delays",
            "A client may still perform a side effect after losing its lease, so the resource must reject stale authority",
            "Fencing tokens encrypt the payload",
            "Locks eliminate all concurrency",
          ],
          answerIndex: 1,
          explanation:
            "The final side effect needs its own authority check because lock ownership can change before the operation reaches it.",
        }),
        question({
          topicId: "locks-circuit-breakers",
          kind: "tradeoff",
          prompt:
            "What is the main benefit of a circuit breaker?",
          choices: [
            "It repairs the failing dependency automatically",
            "It fails fast and limits repeated calls while a dependency recovers",
            "It guarantees every fallback has fresh data",
            "It removes the need for timeouts",
          ],
          answerIndex: 1,
          explanation:
            "A breaker contains failure and reduces wasted work; it does not fix the dependency or make fallbacks correct.",
        }),
        question({
          topicId: "locks-circuit-breakers",
          kind: "story-match",
          prompt:
            "In the workshop story, why does the breaker redirect mechanics to a capped manual process?",
          choices: [
            "To provide controlled degradation without letting one broken tool consume all capacity",
            "To make the powered tool work again",
            "To remove the need for maintenance",
            "To give every mechanic unlimited access",
          ],
          answerIndex: 0,
          explanation:
            "The fallback keeps essential work moving with explicit limits while the dependency remains unavailable.",
        }),
      ],
    }),
    lesson({
      id: "storage-engines",
      trackId: "distributed",
      title: "Storage Engines: B-Trees, LSM-Trees, WAL, MVCC",
      summary:
        "See how append logs, B-trees, LSM compaction, and multiversion snapshots trade write cost, read latency, durability, and transaction visibility.",
      minutes: 14,
      prerequisites: ["sql-modeling", "replication-consistency"],
      steps: [
        step({
          title: "Write the arrival before moving the book",
          story:
            "A library records every arriving book in a bound ledger before filing it on a shelf. The ledger pages are numbered and sealed in order. If the library closes suddenly, staff can compare the shelves with the last ledger pages and finish unfinished work. Rewriting the ledger for each correction would be slow and could damage earlier entries, so corrections are appended as new pages. The ledger is not the reading catalog, but it is the durable story of what the engine was asked to do and in which order.",
          engineer:
            "A write-ahead log records intended changes before the main data structures are updated. Recovery replays committed records after a crash, allowing the engine to reconstruct state from a known checkpoint. Sequential append is efficient, while fsync or group commit determines durability and latency. The log needs bounded retention, checksums, and replication if the storage system promises availability. A common failure is acknowledging a write before the required log flush, then losing it during power loss. WAL also does not make an incomplete external side effect atomic; transaction boundaries and idempotency still matter.",
          visualId: visual("btree-lsm"),
          visualCaption:
            "A sequential write-ahead log records durable changes before B-tree or LSM structures are modified.",
        }),
        step({
          title: "The card catalog keeps pages balanced",
          story:
            "The reading catalog is organized as a tree of drawers. A top drawer points to narrower drawers, and the final drawer holds exact shelf references. When new cards fill a drawer, the librarian splits it and adds a pointer to the parent, keeping every path short and balanced. Readers can jump directly to a narrow range instead of examining every card. Updates modify several pages, so the librarian first writes the change in the arrival ledger. The catalog favors predictable lookup and ordered scanning even though maintaining its shape costs work on every insertion.",
          engineer:
            "B-trees store sorted keys in high-fanout pages, keeping tree depth low and supporting point lookups, range scans, and ordered iteration. Page splits, merges, and rebalancing preserve search properties. Buffer pools keep frequently used pages in memory, while WAL protects changes before dirty pages are flushed. B-trees are a strong default for mixed read and write workloads, but random writes can require multiple page reads and writes. A frequent failure is treating an index as free: each secondary index duplicates selected data and adds write amplification. Measure page cache hit rate, split activity, and query plans rather than only logical query count.",
          visualId: visual("btree-lsm"),
          visualCaption:
            "A balanced B-tree routes lookups through high-fanout pages and supports ordered range scans.",
        }),
        step({
          title: "Daily notebooks are compacted into volumes",
          story:
            "Instead of editing the catalog for every arrival, a night clerk writes changes into small sequential notebooks. Reading the current answer may require checking the newest notebook and then older volumes. Each night, the clerk merges overlapping notebooks into a larger sorted volume and removes superseded pages. This makes writing fast because new pages are simply appended, but compaction competes for disk and can temporarily increase read work. If compaction falls behind, reads inspect too many volumes and the library loses its speed. The clerk watches notebook count and available shelf space.",
          engineer:
            "LSM-trees buffer writes in a memtable, flush immutable sorted tables, and compact them through leveled or tiered strategies. Sequential writes and compression can deliver high throughput, while reads may check several structures or use Bloom filters to avoid unnecessary work. Compaction reclaims obsolete versions but consumes CPU and I/O and creates write amplification. A common failure is sizing only incoming writes and forgetting sustained compaction capacity; lag then causes long reads and storage growth. Tune level sizes, compaction concurrency, and rate limits against measured workloads. LSM is not universally faster: its read and maintenance profile must fit the access pattern.",
          visualId: visual("btree-lsm"),
          visualCaption:
            "LSM writes flow through a memtable and sorted runs while background compaction merges obsolete versions.",
        }),
        step({
          title: "Readers hold dated snapshots",
          story:
            "A researcher checks out a dated snapshot of the catalog while librarians continue updating the live shelves. The researcher sees the world as it existed at checkout time, even if a book is moved later. The engine preserves old row versions long enough for active snapshots, then removes versions that no reader can need. A reader who keeps a snapshot open for hours prevents cleanup and increases storage use. The reading room must therefore balance consistent views against the cost of retaining history. Regular cleanup keeps the reading room usable for everyone.",
          engineer:
            "Multiversion concurrency control keeps multiple versions of a row so readers can observe a consistent snapshot without blocking writers. Transaction IDs and visibility rules determine which version a statement or transaction can see. Snapshot isolation, read committed, and serializable isolation provide different anomaly guarantees. Long-running transactions retain old versions and can cause table, index, and log bloat. A frequent failure is assuming MVCC eliminates all conflicts; writes may still conflict and require retries under serializable or optimistic protocols. Monitor oldest active transaction, version cleanup lag, and retry rates. Durability, isolation, and cleanup are separate responsibilities.",
          visualId: visual("btree-lsm"),
          visualCaption:
            "MVCC preserves dated row versions for active readers while cleanup removes versions no snapshot needs.",
        }),
      ],
      security: [
        practice({
          threat:
            "Unauthorized access to WAL files, snapshots, or backups reveals sensitive records or allows tampering with recovery data.",
          control:
            "Encrypt logs and snapshots with managed keys, restrict engine-level file access, separate backup administration from application roles, and retain auditable recovery copies.",
          verify:
            "Inspect permissions and encryption for every log and snapshot destination, then perform an isolated restore using only the approved recovery identity.",
        }),
        practice({
          threat:
            "Silent disk or software corruption produces plausible but incorrect records and undermines later transaction decisions.",
          control:
            "Use checksums for pages and log records, validate compaction and replication transfers, and run routine restore and consistency checks.",
          verify:
            "Introduce controlled corruption in a test copy and confirm detection, alerting, and recovery from a verified checkpoint rather than silent acceptance.",
        }),
        practice({
          threat:
            "Overly long retention of old row versions or snapshots preserves personal data beyond its intended purpose.",
          control:
            "Bound transaction and snapshot lifetime, expire obsolete versions according to policy, and apply deletion workflows that account for replicas, logs, and backups.",
          verify:
            "Review oldest snapshot age and retention settings, and test that expired versions are cleaned while active transactions retain only the history they require.",
        }),
      ],
      quiz: [
        question({
          topicId: "storage-engines",
          kind: "scenario",
          prompt:
            "An LSM database has fast writes but progressively slower reads. What should operators inspect first?",
          choices: [
            "Compaction lag, number of sorted runs, and stale version buildup",
            "The color of the dashboard",
            "Only the client request timeout",
            "The number of primary key columns",
          ],
          answerIndex: 0,
          explanation:
            "Read amplification grows when compaction falls behind or too many versions and runs remain visible.",
        }),
        question({
          topicId: "storage-engines",
          kind: "security",
          prompt:
            "Why should WAL and snapshot storage be encrypted and tightly restricted?",
          choices: [
            "They contain durable records and may reveal sensitive changes even when the live database is protected",
            "Encryption makes writes sequential",
            "Snapshots replace authentication",
            "WAL files are always public",
          ],
          answerIndex: 0,
          explanation:
            "Logs and snapshots are full data copies and require the same confidentiality and integrity protection as primary storage.",
        }),
        question({
          topicId: "storage-engines",
          kind: "tradeoff",
          prompt:
            "What is a central LSM-tree tradeoff?",
          choices: [
            "Perfectly free reads in exchange for expensive hashing",
            "Efficient sequential writes in exchange for compaction work and possible read amplification",
            "No durability in exchange for lower latency",
            "No indexes in exchange for simpler transactions",
          ],
          answerIndex: 1,
          explanation:
            "LSM engines optimize append and merge patterns, but background compaction and multi-run reads add cost.",
        }),
        question({
          topicId: "storage-engines",
          kind: "story-match",
          prompt:
            "In the library story, what does a researcher's dated snapshot model?",
          choices: [
            "An MVCC snapshot that sees a consistent historical version",
            "A WAL flush",
            "A B-tree page split",
            "An LSM compaction trigger",
          ],
          answerIndex: 0,
          explanation:
            "The snapshot preserves a consistent view while concurrent updates continue, just as MVCC retains visible row versions.",
        }),
      ],
    }),
    lesson({
      id: "kafka-streaming",
      trackId: "distributed",
      title: "Event Streaming with Kafka",
      summary:
        "Use partitioned append-only logs, offsets, consumer groups, and careful delivery semantics to build replayable event pipelines with controlled poison messages.",
      minutes: 12,
      prerequisites: ["queues-jobs", "replication-consistency"],
      steps: [
        step({
          title: "Numbered mail slots for each neighborhood",
          story:
            "An apartment building replaces a pile of unsorted letters with numbered mail slots. Each neighborhood has its own column of slots, and letters are appended in arrival order. A resident remembers the last slot number they read and can return later without rereading the whole column. Adding another neighborhood creates another column instead of making every column longer. The building can keep slots for a defined period, but old letters are eventually removed. The slots form a durable sequence that many readers can follow at their own pace. Each resident can therefore catch up without blocking another reader.",
          engineer:
            "Kafka organizes records into topics, topics into partitions, and partitions into ordered append-only logs. Each record has an offset that identifies its position within a partition. Producers choose a partition explicitly or through a key, and consumers track committed offsets. Retention can be time- or size-based, so a consumer that falls beyond retention may lose the ability to replay from its last position. A common failure is treating Kafka as a traditional queue where acknowledging removes a message. Kafka retains history and supports independent readers, which changes replay, compaction, and storage planning.",
          visualId: visual("kafka-partitions"),
          visualCaption:
            "Producers append records to ordered partition slots while consumers track independent offsets.",
        }),
        step({
          title: "A key keeps one account's story together",
          story:
            "Letters about one household should stay in the same neighborhood column so the building manager reads them in order. If each letter chose a random column, a payment confirmation could appear before the request that explains it. The sender therefore puts the household code on the envelope and uses it to choose the column. This preserves local order but means a very noisy household can fill one column. Splitting that household across columns would improve capacity while weakening the single story, so the building only does it with an explicit aggregation design.",
          engineer:
            "Kafka guarantees order within a partition, not across an entire topic. Producers should partition by a key when related events must share an order, such as updates to one account or device. More partitions increase potential parallelism but also add metadata, open files, consumer assignments, and failover work. A frequent failure is choosing a low-cardinality key that creates a hot partition, or changing key semantics without planning migration. Measure per-partition throughput, lag, key distribution, and consumer utilization. Do not assume that increasing consumer count beyond partition count increases parallelism for a given consumer group.",
          visualId: visual("kafka-partitions"),
          visualCaption:
            "A stable event key routes related records to one ordered partition while other partitions progress independently.",
        }),
        step({
          title: "Readers divide columns, not individual letters",
          story:
            "Several building managers subscribe to the same neighborhood columns. The coordinator assigns each column to one manager so two people do not process the same slot at the same time. A manager reads a batch, performs the work, and records the next offset it has completed. If the manager disappears, another receives the column and resumes from the committed position. During reassignment, the coordinator pauses affected columns briefly rather than letting old and new managers both continue. Each group has its own assignments, so a separate analytics team can read the same letters independently.",
          engineer:
            "Consumers in a group divide partition ownership, with one member processing a partition at a time within that group. Offsets are committed after processing according to the chosen reliability pattern. Rebalances occur when members join, leave, or fail, and long processing or poor heartbeat handling can delay progress. A common failure is committing an offset before the side effect completes, causing data loss on redelivery, or committing after a non-idempotent side effect and creating duplicates. Use cooperative assignment where supported, bounded processing time, static membership when appropriate, and idempotent writes. Track group lag and rebalance frequency.",
          visualId: visual("kafka-partitions"),
          visualCaption:
            "A consumer group assigns whole partitions and resumes each partition from a committed offset.",
        }),
        step({
          title: "Reliable pipelines isolate bad letters",
          story:
            "One envelope arrives with a damaged address that no manager can process. Returning it to the same slot would block the neighborhood forever. The manager records the failure, moves the event to a review channel, and continues with later letters. Ordinary temporary delivery failures receive a few delayed attempts, but repeated failures stop consuming the whole column. The review channel has restricted access and a retention limit because it may contain private contents. When a corrected event is approved, it is reintroduced with its original operation identity so downstream effects are not repeated blindly.",
          engineer:
            "Kafka commonly provides at-least-once processing when offsets commit after work, while idempotent producers and transactions can reduce duplicate writes within supported boundaries. End-to-end exactly-once behavior still depends on every external sink. Design consumers for idempotency, bounded retries with jitter, and dead-letter routing for permanent failures. Transactions can atomically commit consumed offsets and produced records, but they add latency and operational complexity. A frequent failure is retrying a poison record indefinitely or replaying a dead letter without deduplication. Validate schemas at ingestion, protect topic ACLs, and monitor dead-letter volume and age alongside consumer lag.",
          visualId: visual("kafka-partitions"),
          visualCaption:
            "Idempotent consumers commit progress while poison events leave the main stream through a controlled dead-letter path.",
        }),
      ],
      security: [
        practice({
          threat:
            "Unauthorized producers, consumers, or administrators read private topics, inject forged events, or alter topic configuration.",
          control:
            "Use authenticated TLS and least-privilege topic ACLs, separate producer and consumer roles, restrict administrative changes, and audit configuration updates.",
          verify:
            "Test that each identity can access only its approved topics and operations, and review audit logs for unauthorized publish, consume, or configuration attempts.",
        }),
        practice({
          threat:
            "Malformed or repeatedly failing poison events block partitions, trigger unsafe retries, or overload downstream services.",
          control:
            "Validate schemas at ingestion, bound retries with jitter, route permanent failures to an access-controlled dead-letter topic, and alert on dead-letter growth.",
          verify:
            "Process a controlled invalid event and confirm attempt limits, isolation, alerting, and continued progress for valid records in the same partition.",
        }),
        practice({
          threat:
            "Sensitive event payloads remain readable in retained topics, dead letters, or backups after their business purpose ends.",
          control:
            "Minimize payload data, encrypt topics and backups, restrict replay and dead-letter access, and enforce retention aligned with privacy and recovery requirements.",
          verify:
            "Inspect retention and encryption across primary, dead-letter, and backup storage, and test that expired topics are no longer readable through ordinary consumer roles.",
        }),
      ],
      quiz: [
        question({
          topicId: "kafka-streaming",
          kind: "scenario",
          prompt:
            "A consumer performs a non-idempotent side effect, then crashes before committing its offset. What is the likely result?",
          choices: [
            "The event is lost because Kafka removes it",
            "The event is processed again, so the side effect must be made idempotent",
            "All partitions stop permanently",
            "The producer is automatically rolled back",
          ],
          answerIndex: 1,
          explanation:
            "Committing after work creates at-least-once redelivery, which can repeat a side effect unless the consumer deduplicates safely.",
        }),
        question({
          topicId: "kafka-streaming",
          kind: "security",
          prompt:
            "Why separate Kafka producer, consumer, and administrator permissions?",
          choices: [
            "To make every topic public",
            "To limit a compromised identity to the smallest set of publish, consume, or configuration actions",
            "To eliminate partition ordering",
            "To remove the need for TLS",
          ],
          answerIndex: 1,
          explanation:
            "Separate least-privilege roles reduce the blast radius of compromised credentials and make access auditable.",
        }),
        question({
          topicId: "kafka-streaming",
          kind: "tradeoff",
          prompt:
            "What happens when related events are spread across many partitions?",
          choices: [
            "They gain greater parallelism but lose a single cross-partition ordering guarantee",
            "They automatically become globally ordered",
            "Consumer lag disappears",
            "Retention becomes infinite",
          ],
          answerIndex: 0,
          explanation:
            "Partitioning increases independent processing capacity, but Kafka orders records only within each partition.",
        }),
        question({
          topicId: "kafka-streaming",
          kind: "story-match",
          prompt:
            "In the mail-slot story, what does remembering the last slot number represent?",
          choices: [
            "A committed consumer offset used to resume an ordered partition",
            "A Raft election term",
            "A cache TTL",
            "A shard range boundary",
          ],
          answerIndex: 0,
          explanation:
            "The resident's position models the offset that lets a consumer resume without rereading the entire partition.",
        }),
      ],
    }),
    lesson({
      id: "distributed-transactions",
      trackId: "distributed",
      title: "Distributed Transactions: 2PC, Sagas, Outbox",
      summary:
        "Coordinate independent services through two-phase commit, compensating sagas, and transactional outbox records without unsafe dual writes.",
      minutes: 13,
      prerequisites: ["replication-consistency", "kafka-streaming"],
      steps: [
        step({
          title: "Three desks prepare one trip",
          story:
            "A traveler books an airline seat, a hotel room, and a rental car at separate desks. A coordinator first asks each desk to prepare and hold the reservation without making it final. Each desk replies whether it can honor the request. Only after all three agree does the coordinator tell them to commit. The traveler sees a delay while every desk answers. If one desk refuses, the coordinator tells the others to release their holds. During the preparation window, customers wait while desks keep resources locked, so a slow desk can make the whole trip slower.",
          engineer:
            "Two-phase commit coordinates a distributed transaction through a prepare phase and a commit or abort phase. Participants record durable prepare decisions and may hold locks or reserved resources until the coordinator decides. It can provide atomic commit across participating systems when implemented correctly, but blocking, coordinator failure, and recovery logs create operational cost. A common failure is assuming that two successful network calls are enough; participants need durable decision records and recovery rules. In ambiguous outcomes, a participant may need to consult the coordinator or use a protocol that tolerates its unavailability. Measure prepare duration and blocked resources.",
          visualId: visual("saga-outbox"),
          visualCaption:
            "A two-phase coordinator collects durable prepare votes before committing or aborting all participants.",
        }),
        step({
          title: "A coordinator that disappears holds the line",
          story:
            "After all three desks prepare, the coordinator loses power before sending the final instruction. The desks cannot release their holds because the traveler might still receive a confirmation, and they cannot safely complete without knowing whether another desk agreed. Customers queue while staff wait for recovery. The travel agency decides that long global holds are too costly for ordinary bookings and limits two-phase commit to operations where strict atomicity justifies the wait. Most trips use a different workflow with explicit intermediate states and recovery actions. The agency records this waiting time in its planning metrics.",
          engineer:
            "The blocking nature of two-phase commit is a major tradeoff. Coordinator failure can leave participants in doubt until recovery, and replica failover must preserve protocol state. Termination protocols and presumed-abort optimizations reduce some stalls but do not remove the fundamental coordination cost. A frequent architectural mistake is applying two-phase commit to high-throughput workflows spanning many independently deployed services. Choose it only when participants support the protocol and atomicity outweighs availability and latency requirements. Otherwise prefer local transactions plus an orchestrated saga with visible intermediate states and compensations. Recovery tests include failure after each durable vote.",
          visualId: visual("saga-outbox"),
          visualCaption:
            "Prepared participants wait for a coordinator decision and remain blocked until its state can be recovered.",
        }),
        step({
          title: "Book step by step and keep receipts",
          story:
            "The agency changes the trip workflow into a sequence. It reserves the flight first, then the hotel, then the car. Each step records a receipt and the next action. If the hotel fails, the agency cancels the flight using a prepared cancellation plan. If the traveler later cancels, it reverses the remaining steps in a safe order. The trip is not invisible halfway through: the traveler sees reserved, confirmed, or canceled states. Compensation handles completed business steps, while retries handle temporary failures, and each action checks the trip identifier to avoid doing the same step twice.",
          engineer:
            "A saga is a sequence of local transactions coordinated by an orchestrator or choreography. Each step has a forward action and, where possible, a compensating action. Sagas avoid long global locks but provide eventual consistency rather than all-or-nothing isolation, so intermediate states can be visible. Use a durable state machine, idempotent commands, operation identifiers, and explicit retry and compensation rules. A common failure is treating compensation as a universal rollback; refunds, reservations, and notifications are new business actions that can themselves fail. Design pivot points and recovery ownership, and expose saga status to operators and users.",
          visualId: visual("saga-outbox"),
          visualCaption:
            "A durable saga advances local steps and runs compensating actions when a later step cannot complete.",
        }),
        step({
          title: "One drawer holds the order and its receipt",
          story:
            "The agency once wrote a booking in its database and then separately asked a mail service to announce it. If the process stopped between those actions, the booking existed without an announcement, or an announcement existed without a booking. The agency now writes the booking and an outbox receipt in the same local database transaction. A relay reads committed receipts and delivers them to the mail service, retrying safely until delivery is confirmed. Staff never perform two independent writes and hope both succeed. The mail delay becomes visible instead of silently losing news.",
          engineer:
            "The transactional outbox pattern stores a business change and an event record in the same local transaction. A relay or change-data-capture process publishes committed events and tracks delivery separately. This avoids the unsafe dual-write problem between a database and a broker, but it introduces relay lag, duplicate delivery, and ordering considerations. Consumers need idempotency keys or an inbox table to deduplicate. A frequent failure is marking an outbox event delivered before the external system acknowledges it, or deleting it before retries are exhausted. Monitor oldest unpublished event, publish failures, and duplicate rates. Outbox guarantees reliable intent, not exactly-once external effects.",
          visualId: visual("saga-outbox"),
          visualCaption:
            "A local transaction commits state and an outbox event together before a reliable relay publishes it.",
        }),
      ],
      security: [
        practice({
          threat:
            "Repeated or replayed saga commands charge a customer, duplicate a reservation, or apply a compensation more than once.",
          control:
            "Require stable idempotency keys for each business operation, store durable deduplication records, and authorize retries against the original operation context.",
          verify:
            "Replay controlled duplicate commands and timeout responses, confirming that the original result is returned and no additional side effect occurs.",
        }),
        practice({
          threat:
            "A dual write updates a database but fails to publish the corresponding event, producing silent divergence between services.",
          control:
            "Use a transactional outbox or change-data capture from committed state, and avoid independent database and broker writes as one logical operation.",
          verify:
            "Inject a failure between commit and relay execution and confirm the event remains durable, is retried, and reaches consumers without repeating the local transaction.",
        }),
        practice({
          threat:
            "Outbox records, saga receipts, and compensation logs expose sensitive booking details or permit unauthorized recovery actions.",
          control:
            "Minimize stored payloads, encrypt outbox and recovery storage, restrict relay and compensation permissions, and audit manual replay or override actions.",
          verify:
            "Inspect retained records and access logs, and test that ordinary service roles cannot replay another tenant's saga or invoke privileged compensations.",
        }),
      ],
      quiz: [
        question({
          topicId: "distributed-transactions",
          kind: "scenario",
          prompt:
            "A service commits an order to its database, then crashes before publishing an event. Which pattern best prevents the event from being lost?",
          choices: [
            "Write the event to a separate broker first and hope",
            "Store the event in an outbox row within the same database transaction and publish it through a reliable relay",
            "Remove all retries",
            "Use a longer client timeout only",
          ],
          answerIndex: 1,
          explanation:
            "The transactional outbox makes event intent atomic with local state and provides durable retryable publication.",
        }),
        question({
          topicId: "distributed-transactions",
          kind: "security",
          prompt:
            "Why are idempotency keys important for saga steps and compensations?",
          choices: [
            "They encrypt the message body",
            "They prevent repeated execution of the same business operation after retries or replays",
            "They replace authorization",
            "They guarantee zero network latency",
          ],
          answerIndex: 1,
          explanation:
            "Sagas and relays can deliver commands more than once, so stable operation identities protect against duplicate side effects.",
        }),
        question({
          topicId: "distributed-transactions",
          kind: "tradeoff",
          prompt:
            "What is a central tradeoff of sagas compared with two-phase commit?",
          choices: [
            "Sagas provide strict global isolation with no intermediate states",
            "Sagas avoid long distributed locks but require visible intermediate states and compensating actions",
            "Sagas cannot use local transactions",
            "Sagas eliminate the need for idempotency",
          ],
          answerIndex: 1,
          explanation:
            "Sagas improve availability and autonomy at the cost of eventual consistency and explicit recovery logic.",
        }),
        question({
          topicId: "distributed-transactions",
          kind: "story-match",
          prompt:
            "In the travel story, what does writing the booking and outbox receipt in one drawer model?",
          choices: [
            "An atomic local database transaction containing both state and event intent",
            "A two independent writes with no recovery",
            "A global Raft election",
            "A cache eviction policy",
          ],
          answerIndex: 0,
          explanation:
            "The shared drawer represents the single local transaction that makes state and outbox event commit together.",
        }),
      ],
    }),
    lesson({
      id: "probabilistic-sketches",
      trackId: "distributed",
      title: "Bloom Filters and HyperLogLog",
      summary:
        "Use compact approximate structures for membership checks and cardinality estimates while respecting false positives, error bounds, and privacy limits.",
      minutes: 10,
      prerequisites: ["consistent-hashing"],
      steps: [
        step({
          title: "A wall of switches checks club guests",
          story:
            "A club wants to avoid searching a giant guest book for every arrival. It builds a wall of small switches and gives each guest name several positions derived from a recipe. To register a name, staff flip every related switch on. At the door, the bouncer checks those positions. If any switch is off, the name was never registered. If all are on, the name might be registered, but another guest could have flipped the same switches. The bouncer treats the result as a quick filter and performs an exact lookup only when necessary.",
          engineer:
            "A Bloom filter is a bit array with multiple hash functions. Insertion sets all corresponding bits, and lookup returns possibly present when every bit is set or definitely absent when any bit is clear. Bloom filters have no false negatives but can have false positives, and they do not store the original elements. Choose bit-array size and hash count from expected element count and target false-positive rate. A common failure is using a positive result as final authorization or deleting elements without a counting structure. Standard Bloom filters cannot remove individual entries safely; use variants or rebuild when deletion is required.",
          visualId: visual("bloom-hll"),
          visualCaption:
            "A Bloom filter sets shared bits for inserted values and rules out absent values when any bit is clear.",
        }),
        step({
          title: "A larger wall lowers mistaken welcomes",
          story:
            "A tiny switch wall fills quickly, so many unrelated names appear to match. The club builds a larger wall and adjusts how many positions each name uses. More room reduces accidental overlap, but the wall consumes more memory and takes longer to inspect. The manager chooses a mistake rate appropriate to the next step: if an exact guest book lookup is cheap, a small filter is useful; if a false match triggers an expensive search, a larger filter may be worth the memory. The filter is designed backward from the cost of being wrong.",
          engineer:
            "For a fixed element count, increasing bits per element lowers false-positive probability, while the optimal number of hash functions depends on that ratio. Larger filters cost memory and may increase cache or network overhead, so approximate does not mean free. Estimate capacity before deployment and monitor saturation; once the filter is too full, false positives rise sharply. A frequent failure is setting a target error rate without considering the number of insertions or forgetting that different tenants may need isolated filters. Store filters beside the data they describe and refresh or rebuild them as the underlying set changes.",
          visualId: visual("bloom-hll"),
          visualCaption:
            "Filter size and hash count tune false-positive probability against memory and lookup cost.",
        }),
        step({
          title: "Count the crowd without keeping every name",
          story:
            "For a festival, the manager needs an estimate of distinct visitors, not a list suitable for billing or identity checks. A clerk uses a special ledger where each visitor name updates one of many numbered counters according to its leading pattern. Over time, the counters hold a rough record of the largest patterns observed, and a formula converts those values into a crowd estimate. The clerk can merge ledgers from two gates by taking the larger value in each counter. The result is useful for planning while avoiding a database of everyone's name.",
          engineer:
            "HyperLogLog estimates distinct cardinality using a fixed set of registers and a hash of each element. Each hash chooses a register and records information about leading zeros, producing a bounded-memory sketch with a known relative error. Sketches can be merged by taking per-register maxima, which supports distributed aggregation. Sparse representations reduce memory for small cardinalities, while precision is controlled by register count. A common failure is expecting exact counts or membership checks from HyperLogLog; it answers approximately how many distinct values occurred, not which values they were. Use exact structures when business decisions require exactness.",
          visualId: visual("bloom-hll"),
          visualCaption:
            "HyperLogLog updates fixed registers and merges them to estimate distinct cardinality without storing elements.",
        }),
        step({
          title: "Approximate answers still need privacy rules",
          story:
            "The club realizes that even a compact filter can reveal information when combined with a guessed name. A reporter checks several likely guests and learns whether their switches match. The manager stops exposing raw filters, uses an internal keyed transformation where practical, limits who can query sketches, and avoids retaining per-user records that are unnecessary for crowd planning. Aggregate estimates are published with a stated error range. Privacy comes from the data-handling policy around the sketch, not from the fact that its memory footprint is small. Staff review combined outputs before publishing any report.",
          engineer:
            "Probabilistic sketches trade accuracy for bounded memory, but they are not automatically anonymous. A membership structure can support guesses about known candidates, and repeated queries may leak presence. Use tenant isolation, access controls, keyed hashing where appropriate, aggregation thresholds, and short retention. Cardinality sketches avoid storing raw identifiers, yet small or repeatedly filtered groups can still reveal sensitive information. A common failure is treating approximate output as harmless and exporting raw sketches without review. Document error bounds, acceptable uses, and prohibited uses such as authorization or identity decisions, and test whether combinations of outputs permit inference.",
          visualId: visual("bloom-hll"),
          visualCaption:
            "Access-controlled sketches publish bounded-error aggregate estimates without exposing raw membership records.",
        }),
      ],
      security: [
        practice({
          threat:
            "Exposed membership sketches allow observers to test whether specific people, accounts, or private resources are present.",
          control:
            "Keep raw Bloom filters inside the authorized service boundary, use keyed transformations where practical, rate-limit probes, and require exact authorization outside the sketch.",
          verify:
            "Review external interfaces for raw sketch exposure and test that unauthorized callers cannot query or export membership structures.",
        }),
        practice({
          threat:
            "Cardinality reports for tiny or repeatedly filtered groups reveal sensitive behavior despite avoiding raw user identifiers.",
          control:
            "Apply aggregation thresholds, suppress small-group results, restrict combination and export of sketches, and retain only the precision required for analysis.",
          verify:
            "Test representative small cohorts and overlapping filters, confirming that suppressed or coarsened outputs meet the documented privacy threshold.",
        }),
        practice({
          threat:
            "Stale or attacker-controlled sketch input creates misleading estimates that influence security or capacity decisions.",
          control:
            "Authenticate ingestion, validate input scope, version sketches, bound update rates, and compare sketch trends with independent operational signals.",
          verify:
            "Run controlled invalid-ingestion tests and confirm that estimates remain attributable, bounded, and capable of triggering anomaly review without storing raw identifiers.",
        }),
      ],
      quiz: [
        question({
          topicId: "probabilistic-sketches",
          kind: "scenario",
          prompt:
            "A Bloom filter reports possibly present for a username. What should an authorization service do?",
          choices: [
            "Grant access immediately",
            "Deny every positive result",
            "Treat it as a hint and perform the authoritative exact check",
            "Store the username in every bit",
          ],
          answerIndex: 2,
          explanation:
            "Bloom filters can have false positives, so a positive result cannot establish identity or permission by itself.",
        }),
        question({
          topicId: "probabilistic-sketches",
          kind: "security",
          prompt:
            "Why should raw Bloom filters usually remain private?",
          choices: [
            "They contain no useful information",
            "They can support membership guesses about known candidates and leak presence",
            "They always decrypt data",
            "They replace network authentication",
          ],
          answerIndex: 1,
          explanation:
            "Even without storing raw elements, a membership sketch can reveal whether specific candidate values were inserted.",
        }),
        question({
          topicId: "probabilistic-sketches",
          kind: "tradeoff",
          prompt:
            "Why might a team choose HyperLogLog instead of an exact set of user IDs?",
          choices: [
            "It provides exact membership and deletion",
            "It estimates distinct cardinality with bounded memory and avoids storing raw IDs",
            "It guarantees zero error",
            "It requires no hash functions",
          ],
          answerIndex: 1,
          explanation:
            "HyperLogLog is designed for approximate cardinality with fixed memory, not exact membership or identity tracking.",
        }),
        question({
          topicId: "probabilistic-sketches",
          kind: "story-match",
          prompt:
            "In the club story, why can all switches be on for an unregistered name?",
          choices: [
            "Other names may have set the same shared bits, creating a false positive",
            "The filter guarantees exact membership",
            "The bouncer deleted the name",
            "The switch wall has infinite capacity",
          ],
          answerIndex: 0,
          explanation:
            "Bloom-filter hash collisions can set all relevant bits through unrelated insertions, so positives require confirmation.",
        }),
      ],
    }),
    lesson({
      id: "observability-slos",
      trackId: "distributed",
      title: "Observability and SLOs",
      summary:
        "Turn metrics, logs, and traces into service-level objectives, burn-rate alerts, error budgets, and safe operational decisions under failure.",
      minutes: 12,
      prerequisites: ["rate-limiting", "replication-consistency"],
      steps: [
        step({
          title: "The hospital measures waiting, not effort",
          story:
            "A hospital director is proud that doctors worked longer hours, but patients still wait too long for urgent care. The director changes the dashboard to measure the patient's experience: time from arrival to treatment, percentage treated within the promised window, and outcomes for the sickest group. Staff effort remains useful for diagnosis, but it is not the promise made to patients. The hospital chooses a target it can measure consistently, then reviews every missed week against that target. Averages alone would hide the longest waits that matter most. The director reviews both the target and its measurement every quarter.",
          engineer:
            "A service-level indicator is a quantitative measure of user-visible behavior, such as the fraction of successful requests served within a latency threshold. A service-level objective sets a target over a time window. Define the population, exclusions, measurement method, and ownership before choosing a number. Availability and latency objectives should reflect critical user journeys rather than infrastructure uptime alone. A common failure is targeting average CPU or server health while users experience failed requests. The director reviews both the target and its measurement every quarter. Use percentiles and event-based measures where appropriate, and validate that synthetic and production measurements agree on the same promise.",
          visualId: visual("traffic-flow"),
          visualCaption:
            "User-journey measurements roll requests into an SLI and compare them with a time-bound SLO target.",
        }),
        step({
          title: "Three lenses explain the same delay",
          story:
            "When a patient waits too long, the hospital uses three kinds of evidence. Counters show that triage volume rose and treatment capacity fell. Written notes explain that one scanner was offline. A trace follows one patient's path through registration, triage, imaging, and treatment, revealing where the minutes accumulated. No single lens is sufficient. Counters find patterns, logs preserve events, and traces connect work across services. The director insists that each record carries a shared visit identifier without copying the patient's full medical story into every system. These lenses share identifiers but retain different amounts of detail.",
          engineer:
            "Metrics provide low-cardinality aggregates for rates, durations, and resource use. Logs capture discrete events and context, while traces link spans across service boundaries. Together they support diagnosis at different scales. Use consistent service names, propagated trace context, structured fields, and exemplars that connect metrics to representative traces. A frequent failure is treating logs as the only observability tool or creating unlimited metric labels that explode storage cost. Bound cardinality and sample thoughtfully, retaining enough detail for rare failures. Measure telemetry drop rates and query latency so the observability system does not become an unmonitored dependency.",
          visualId: visual("traffic-flow"),
          visualCaption:
            "Metrics, logs, and linked trace spans provide aggregate, event, and request-level views of one journey.",
        }),
        step({
          title: "Page on broken promises, not every fluctuation",
          story:
            "A nurse call light flickers once, while another remains dark for an hour. Paging a supervisor for every flicker creates noise and hides the serious failure. The hospital watches how quickly the promised treatment window is being consumed. A small sustained miss may warrant investigation, while a rapid miss across many patients triggers immediate response. Each alert names the affected promise, the evidence, and the first safe action. The team tests alerts by sending a controlled signal and confirming that the right person receives it with enough context to act.",
          engineer:
            "Multi-window burn-rate alerting compares recent error-budget consumption with longer-term behavior. Fast burns page promptly, while slower burns create tickets or planning work. Alert on symptoms tied to an SLO, then include diagnostic links rather than paging on every possible cause. A common failure is alerting on high CPU without a user impact, or setting thresholds so sensitive that normal deployment noise causes fatigue. Route alerts to an owner, define severity and escalation, and test delivery and runbooks. Use inhibition and grouping to avoid a storm while preserving distinct incidents. Record alert quality and review missed, false, and non-actionable pages.",
          visualId: visual("threat-defense"),
          visualCaption:
            "Burn-rate windows convert SLO consumption into actionable pages with severity and diagnostic context.",
        }),
        step({
          title: "An error budget balances speed and safety",
          story:
            "The hospital reserves a small amount of treatment time outside the promised window for unexpected demand. If the reserve is nearly untouched, the team can test a faster admission process. If the reserve is exhausted, risky changes pause and effort shifts to reliability. The budget does not excuse avoidable harm; it makes the tradeoff visible and consistent. During an incident, the team tracks how much of the reserve remains and which patient groups are affected. After recovery, a review changes the process rather than simply asking staff to work harder.",
          engineer:
            "An error budget is the allowed amount of SLO miss over a window. It connects reliability work with product delivery: healthy budgets support faster change, while exhausted budgets prioritize stabilization. Budgets should be calculated from the same events as the SLI and accompanied by a policy for freezing risky releases or reducing scope. A common failure is treating the budget as a paperwork metric while alerts, deployment approvals, and incident reviews ignore it. Define who can declare budget exhaustion and how normal service resumes. Blameless reviews should identify systemic causes, improve detection, and track corrective actions to verified closure.",
          visualId: visual("traffic-flow"),
          visualCaption:
            "An error-budget gauge links observed reliability to release velocity, incident review, and remediation priorities.",
        }),
      ],
      security: [
        practice({
          threat:
            "Telemetry captures credentials, personal data, or private request bodies and exposes them through broad log and trace access.",
          control:
            "Redact sensitive fields at collection, minimize message bodies, restrict telemetry access by role, and enforce retention appropriate to operational need.",
          verify:
            "Inspect representative logs, traces, and exports with test secrets and personal fields, confirming that only approved metadata remains accessible.",
        }),
        practice({
          threat:
            "Untrusted high-cardinality labels or oversized events exhaust telemetry ingestion and hide the signals needed during an incident.",
          control:
            "Allowlist metric dimensions, bound label and event sizes, rate-limit noisy sources, sample intelligently, and alert on ingestion drops and cost anomalies.",
          verify:
            "Use an authorized noisy-client test and confirm that limits protect ingestion while critical service signals continue to arrive and alert.",
        }),
        practice({
          threat:
            "Tampered or unavailable telemetry causes missed incidents, misleading SLO reports, or false confidence during recovery.",
          control:
            "Authenticate telemetry producers, protect pipeline integrity, monitor freshness and drop rates, and retain independent evidence for critical audit and SLO calculations.",
          verify:
            "Test producer rejection and pipeline interruption, confirming freshness alerts fire and SLO reports clearly distinguish missing data from healthy behavior.",
        }),
      ],
      quiz: [
        question({
          topicId: "observability-slos",
          kind: "scenario",
          prompt:
            "A service meets its SLO normally but suddenly consumes its error budget rapidly. Which response best matches burn-rate practice?",
          choices: [
            "Ignore it until the monthly average changes",
            "Page the owner with the affected SLO and pause risky changes while investigating",
            "Lower the SLO target retroactively",
            "Disable telemetry",
          ],
          answerIndex: 1,
          explanation:
            "Rapid budget consumption indicates urgent user impact and should trigger an actionable response plus stabilization.",
        }),
        question({
          topicId: "observability-slos",
          kind: "security",
          prompt:
            "What is the safest default for request bodies in application logs?",
          choices: [
            "Log every body indefinitely",
            "Avoid or redact bodies and retain only approved structured metadata",
            "Publish logs to a public dashboard",
            "Store credentials in labels",
          ],
          answerIndex: 1,
          explanation:
            "Request bodies often contain sensitive data, so minimization and redaction reduce exposure without losing essential diagnostics.",
        }),
        question({
          topicId: "observability-slos",
          kind: "tradeoff",
          prompt:
            "Why limit metric-label cardinality?",
          choices: [
            "It guarantees exact traces",
            "It controls storage cost and query complexity while preserving useful aggregate signals",
            "It removes the need for SLOs",
            "It prevents all incidents",
          ],
          answerIndex: 1,
          explanation:
            "Unbounded labels create excessive time series and cost; useful dimensions should be deliberate and bounded.",
        }),
        question({
          topicId: "observability-slos",
          kind: "story-match",
          prompt:
            "In the hospital story, why replace staff-hours dashboards with treatment-wait measurements?",
          choices: [
            "Staff effort is never useful",
            "SLOs should measure the user-visible promise rather than an internal activity",
            "Averages are always more important than percentiles",
            "Logs cannot contain timestamps",
          ],
          answerIndex: 1,
          explanation:
            "Service-level objectives track outcomes users experience, while internal activity is diagnostic rather than the promise itself.",
        }),
      ],
    }),
  ],
};

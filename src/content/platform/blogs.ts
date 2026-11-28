import type {
  BlogPost,
  BlogStep,
  QuizKind,
  QuizQuestion,
  SecurityPractice,
} from "@/learning/platform/types";

type RawQuestion = {
  question: string;
  choices: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
  explanation: string;
  kind: QuizKind;
};

function quizFor(topicId: string, questions: RawQuestion[]): QuizQuestion[] {
  return questions.map((question, index) => ({
    id: `${topicId}-q${index + 1}`,
    topicId,
    prompt: question.question,
    choices: question.choices,
    answerIndex: question.answerIndex,
    explanation: question.explanation,
    kind: question.kind,
  }));
}

const practiceTitle = (threat: string): string => {
  const firstSentence = threat.split(/[.!?]/)[0].trim();
  return firstSentence.length <= 88
    ? firstSentence
    : `${firstSentence.slice(0, 85).replace(/\s+\S*$/, "")}…`;
};

const blogPostsData = [
  {
    id: "database-melts-at-10k-rps",
    slug: "database-melts-at-10k-rps",
    title: "Why Your Database Melts at 10,000 RPS (And How to Fix It)",
    dek:
      "Ten thousand requests per second is not a universal cliff; it is where hidden assumptions about queries, connections, and writes become visible. Learn to diagnose the saturated resource before reaching for replicas, caches, or shards.",
    minutes: 11,
    relatedLessonIds: [
      "single-server",
      "load-balancing",
      "caching-eviction",
      "sql-modeling",
      "scaling-databases",
      "observability-slos",
    ],
    steps: [
      {
        title: "Ten thousand is a workload, not a diagnosis",
        story:
          "A checkout counter can serve ten thousand customers smoothly if each needs a preprinted ticket. It collapses if every customer asks the cashier to search a warehouse, call a supplier, and reconcile an account. Requests per second tells you how crowded the counter is, but not how much work hides behind each request. Two services with identical RPS can have radically different database behavior. The meltdown usually begins when a graph looks healthy at the edge while every request is carrying an expensive surprise. At 10,000 RPS, a missing index can turn every cheap ticket request into a warehouse search.",
        engineer:
          "Translate QPS into database work: point lookups, indexed range scans, joins, sort operations, row bytes returned, writes, and transactions. Assume a read-heavy API at ten thousand requests per second, but a ten-millisecond database service time already implies roughly one hundred concurrent operations through Little's Law before pooling overhead. If a query takes fifty milliseconds, the required concurrency is five hundred. Ten thousand cheap cacheable reads may be easy; ten thousand writes with several indexes and replicas are not. State peak-to-average ratio, payload size, and latency target, then measure queueing and utilization rather than treating the number itself as a threshold.",
        visualId: "sql-indexing",
        visualCaption:
          "Requests fan out through two API instances to one database; the moving dots grow denser as traffic rises.",
      },
      {
        title: "Find the real bottleneck: locks, I/O, CPU, or connections",
        story:
          "When a laptop slows down, people often buy more memory before checking whether one browser tab is using the entire processor. Databases invite the same mistake. A replication lag graph does not explain a lock wait, and a CPU graph does not explain a connection pool that is smaller than the application fleet. The useful investigation starts at the resource that is actually saturated. Otherwise every fix is a guess wearing a monitoring dashboard. A pool with twenty connections can queue behind one table lock while the database CPU still looks almost idle until the lock owner finally commits.",
        engineer:
          "Compare application queue time with database execution time, then break execution into wait events and active CPU. Look for pool exhaustion, lock contention, sequential scans, large sorts, fsync pressure, replication lag, and oversized result sets. One missing index can turn point reads into table scans; one unbounded IN clause can create a plan explosion. Raising connection counts can make contention worse. Capture representative query fingerprints, not full statements containing secrets, and inspect plans at production-like data volume. The failure mode of superficial diagnosis is adding replicas that all execute the same bad query faster while the primary remains overloaded.",
        visualId: "sql-indexing",
        visualCaption:
          "The split panel contrasts in-place B-tree page updates with append-and-flush LSM runs.",
      },
      {
        title: "Remove repeated reads with a disciplined cache",
        story:
          "A popular restaurant should not ask the kitchen to cook the same soup ten thousand times because ten thousand people ordered it. It can prepare a batch, serve it quickly, and refresh when the recipe changes. A cache is that shared soup pot. The hard part is not storing values; it is deciding which answers are safe to reuse, how fresh they must be, and what happens when everyone asks for a new pot at the same moment. Ten thousand simultaneous misses must still be capped so they do not stampede back into the database.",
        engineer:
          "Cache results whose correctness tolerates bounded staleness, using keys that include every authorization and locale input that changes the response. Start with the highest-volume, lowest-complexity queries and measure origin offload. Bound cache memory, set expiry and jitter, and use request coalescing for misses so a cold cache does not amplify load. Negative caching helps missing keys but must not preserve an authorization mistake. A cache stampede, stale permission decision, or eviction of the entire hot set can make the meltdown worse. Measure hit ratio, miss concurrency, origin latency, and invalidation lag, with a fallback that sheds noncritical work.",
        visualId: "cache-ring",
        visualCaption:
          "A cache ring marks one hit and one miss, with the miss routed to a cold disk read.",
      },
      {
        title: "Move noncritical writes behind durable queues",
        story:
          "A hotel receptionist can confirm a booking without personally washing every towel in the room. Some database work is urgent, while some can wait a few seconds. Sending every side effect through the primary transaction is like making the receptionist do the laundry. A durable queue lets a bounded set of workers perform the slower work at a rate the database can sustain, while the user receives a prompt acknowledgement for the part that truly needs immediate confirmation. If workers can drain only two hundred events per second, an unbounded intake promises more delay than the system can recover.",
        engineer:
          "Separate command acceptance from projections, notifications, audit enrichment, and analytics. Use an outbox when the business write and event intent must commit together; otherwise a crash can create a committed order with no event, or an event for a rolled-back order. Workers should be idempotent, horizontally scalable, and observable through oldest-message age and throughput. Bound queue retention and apply backpressure when the database cannot keep up. This pattern cannot fix a write-heavy core transaction by itself, but it removes unnecessary synchronous work. The failure mode to watch is an ever-growing backlog that silently turns a seconds-long promise into a minutes-long one.",
        visualId: "sharding",
        visualCaption:
          "A producer feeds a growing queue that fans out to three workers, making backlog and parallelism visible.",
      },
      {
        title: "Scale the database only after reducing its work",
        story:
          "Adding more cash registers does not help if every register must ask the same locked vault for every coin. Replicas, caching, and shards solve different problems. Replicas spread reads, shards spread ownership, and neither repairs an inefficient transaction. A production recovery plan starts with the least invasive change that addresses the measured bottleneck, then defines the trigger for the next step. That order keeps the system understandable and gives rollback a chance to work. A replica added before fixing a fifty-millisecond scan simply gives the same expensive scan another place to run.",
        engineer:
          "Route read-only, staleness-tolerant queries to replicas while keeping consistency-sensitive reads on the primary. Check replica lag before declaring a read safe, and cap replica fan-out. Shard when a single writer, index, or storage volume is the limiting resource, choosing a key from real access patterns rather than hashing randomly. Introduce dual reads or shadow writes during migration, reconcile differences, and rehearse resharding. Connection proxies, admission control, and per-tenant quotas protect the database during traffic spikes. Track p95 and p99 latency, pool saturation, lock waits, replication lag, and cost per successful operation so the next capacity decision is based on evidence.",
        visualId: "observability-sli",
        visualCaption:
          "Four shards show one hot partition; in the final stage, that hot shard splits into two ranges.",
      },
    ],
    security: [
      {
        threat:
          "One tenant sends expensive broad queries and consumes the shared database capacity.",
        control:
          "Apply authenticated tenant quotas, query timeouts, bounded result sizes, and admission control before dispatch.",
        verify:
          "Drive a noisy tenant above its quota and confirm rejection while other tenants retain their latency and correctness targets.",
      },
      {
        threat:
          "Application credentials or connection strings expose direct unrestricted database access.",
        control:
          "Use least-privilege database roles per workload, short-lived credentials, network restrictions, and audited administrative access.",
        verify:
          "Attempt schema changes and cross-database reads with application credentials; expect denial and complete audit records.",
      },
      {
        threat:
          "A cache outage or replica failover causes stale private data to be served to another identity.",
        control:
          "Include authorization context in cache keys, enforce tenant-scoped access, and fail closed when permission freshness cannot be guaranteed.",
        verify:
          "Flush caches and force failover during cross-tenant tests, then confirm no private response crosses identities.",
      },
    ],
    quiz: quizFor("database-melts-at-10k-rps", [
      {
        kind: "story-match",
        question:
          "In the checkout-counter story, why does 10,000 RPS fail to diagnose the database?",
        choices: [
          "Each request may carry a very different amount of database work",
          "The database has reached its maximum connection limit",
          "RPS includes the latency and row count of each request",
          "The application automatically routes every request to a replica",
        ],
        answerIndex: 0,
        explanation:
          "The counter is equally crowded in both cases, but warehouse searches cost far more than preprinted tickets. QPS must be combined with service time and query cost.",
      },
      {
        kind: "scenario",
        question:
          "During a checkout spike, application p99 rises, database CPU is 30%, pool waits are high, and one transaction holds a lock. What is the best first move?",
        choices: [
          "Increase every connection pool until the wait disappears",
          "Bound request concurrency and shorten or remove the long lock holder",
          "Add read replicas to absorb the primary's writes",
          "Disable transaction logging for the duration of the spike",
        ],
        answerIndex: 1,
        explanation:
          "Low CPU with pool and lock waits points to contention, not insufficient compute. More connections would add pressure to the same bottleneck.",
      },
      {
        kind: "tradeoff",
        question:
          "An order is acknowledged before email and analytics finish in a queue. Which product promise must the design make explicit?",
        choices: [
          "Queued side effects become immediate once an outbox exists",
          "Every queued task must finish before the order can be acknowledged",
          "Acceptance and completion times diverge, so backlog age needs an objective",
          "An outbox removes the need for idempotent workers",
        ],
        answerIndex: 2,
        explanation:
          "The queue moves work off the request path but does not make it instantaneous. Oldest-message age and drain rate define the delayed completion promise.",
      },
      {
        kind: "security",
        question:
          "A shared cache fails over while tenant-specific responses are stored. Which control prevents cross-tenant disclosure?",
        choices: [
          "Keep tenant identifiers only in server logs",
          "Cache permission decisions indefinitely to avoid origin reads",
          "Use opaque cache keys and assume they cannot be guessed",
          "Include authorization context in keys and fail closed when freshness is unknown",
        ],
        answerIndex: 3,
        explanation:
          "Cache identity must include the authorization boundary, and uncertain permission freshness must not be treated as approval.",
      },
    ]),
  },
  {
    id: "discord-trillions-of-messages",
    slug: "discord-trillions-of-messages",
    title: "How Discord Stores Trillions of Messages",
    dek:
      "A messaging database must serve recent history quickly while keeping years of conversations searchable and affordable. The useful design lesson is to treat channel, time, and retention as explicit data-model boundaries.",
    minutes: 13,
    relatedLessonIds: [
      "chat-system",
      "kafka-streaming",
      "scaling-databases",
      "replication-consistency",
      "caching-eviction",
      "observability-slos",
    ],
    steps: [
      {
        title: "Messages are append-heavy and channel-local",
        story:
          "A conversation is not one enormous document that gets rewritten whenever someone says hello. It is a sequence of small events attached to one room. That distinction sounds obvious, but it determines the database. If each new message rewrites the room's entire history, the system slows as the conversation grows. If each message has a permanent address inside its channel, recent reads become simple and the past can be stored according to a retention policy. A channel with four million messages should still fetch its newest page without scanning the other three million active channels.",
        engineer:
          "Model message ID, channel ID, author ID, content or attachment reference, timestamp, sequence, and edit state. Channel ID is the dominant access boundary: history, search, moderation, and deletion usually start there. Snowflake-style IDs provide sortable uniqueness and reduce coordination compared with a global auto-increment counter, but the channel sequence remains useful for cursor-based catch-up. Assume millions of active channels and uneven activity; a small number may produce enormous histories while most remain small. Capacity planning must include indexes, tombstones, replicas, and secondary search copies, not just message bytes. Test catch-up pagination across a synthetic channel with two million messages, and alert on scan amplification per history request.",
        visualId: "kafka-partitions",
        visualCaption:
          "Three partition lanes stand in for independent message ranges, showing how channel-local history can advance without a global rewrite.",
      },
      {
        title: "Partition by channel and bucket time",
        story:
          "A filing cabinet with one drawer per room is easy to use until a single room fills a thousand drawers. Then the clerk needs a smaller subdivision, perhaps one drawer per month. Channel partitioning gives locality, while time buckets bound partition size and make retention cheaper. The combination prevents one busy channel from becoming an unmanageable file and lets old periods be archived without touching recent conversations. A channel receiving fifty thousand messages a day might use daily buckets, while a quiet channel keeps the same retention rule in monthly buckets.",
        engineer:
          "Use a partition key that includes channel and a time bucket sized so each partition stays within operational limits. Cassandra-style wide-column storage or a similarly partitioned log store can append messages efficiently and read a channel's recent range by clustering order. Choose bucket duration from channel volume, not calendar habit: a hyperactive channel may need daily partitions while a quiet one can use monthly buckets. Time buckets complicate cross-bucket pagination, so clients fetch ordered buckets until the requested page is full. Avoid a global timestamp partition because it creates a hot write region and poor channel locality.",
        visualId: "queue-workers",
        visualCaption:
          "The sharding grid highlights one partition while the others retain separate ownership ranges.",
      },
      {
        title: "Serve recent history from replicas and caches",
        story:
          "The archive stores every letter, but the front desk keeps a small tray of today's envelopes. Recent history deserves the fast tray; deep history deserves the archive. Discord-scale traffic is heavily concentrated in current conversations, so the read path can serve most requests from replicas or bounded caches while retaining older messages in colder storage. The mistake is treating every historical page as equally urgent and loading every tier at once. A two-second replica lag may be fine for a public feed, but it is unacceptable when the same request checks whether membership was revoked.",
        engineer:
          "Route recent channel history to replicas with lag monitoring, and cache hot channel pages briefly with authorization-aware keys. Keep cursor pagination based on immutable message identity or sequence so inserts do not shift pages. Deep history can live in object storage or a columnar archive with asynchronous indexing for search. A deletion must update the canonical record, live indexes, caches, and archival policy according to legal and product requirements. Replica lag is acceptable for some feed views but not for permission revocation, so authorization-sensitive operations may require a strongly consistent read or a synchronous deny path.",
        visualId: "sharding",
        visualCaption:
          "Writes reach the primary first; one replica is marked in sync while the other carries visible lag.",
      },
      {
        title: "Search and moderation are derived views",
        story:
          "The main conversation log should not become a Swiss Army knife that performs every possible question. Search, moderation, and analytics ask different questions and need different indexes. Building them as derived views keeps the write path understandable and lets each view scale independently. The cost is duplication and eventual consistency, so the design needs explicit rules for freshness and deletion propagation. If a deletion event sits behind ten minutes of analytics traffic, search can keep showing content that the canonical message store has already denied. The projection needs its own freshness alarm.",
        engineer:
          "Publish message changes through a durable event stream and build search indexes, moderation queues, and analytics projections asynchronously. Consumers must be idempotent and able to replay from an offset after failure. Search indexes may tokenize content and retain attachments separately, while moderation tracks reports and policy state. Use tombstones and policy filters so deleted or newly restricted messages disappear from derived views. Measure event lag per consumer because a healthy canonical database does not guarantee fresh search. Avoid rebuilding every projection from a full scan; incremental processing with periodic reconciliation is usually more operable.",
        visualId: "cache-ring",
        visualCaption:
          "Three Kafka partition lanes feed a consumer group; differing lag bars expose uneven projection progress.",
      },
      {
        title: "Operate retention, deletion, and abuse at enormous scale",
        story:
          "A trillion-message archive is impressive until someone asks to delete one private conversation and discovers copies in caches, search indexes, backups, and analytics tables. Privacy operations become ordinary engineering work at this scale. The design needs a deletion workflow with observable stages, bounded retention, and a clear distinction between immediate access denial and physical erasure. Operators also need protection against enumeration, scraping, and abusive query patterns without making normal conversation slow. An operator can deny access to a private message immediately, then track tombstone propagation through search, caches, and archive cleanup as separate measurable stages.",
        engineer:
          "Authorize channel access on every history and search request; opaque IDs do not replace membership checks. Apply rate limits to history export, search, and attachment access, and redact secrets from logs. Deletion can begin with a synchronous deny record, then propagate tombstones through caches and derived indexes before scheduled physical cleanup. Retention jobs should be resumable, idempotent, and measured by oldest pending deletion. Backups require documented expiry and restore-time filtering. Verify with cross-channel access tests, bulk deletion drills, replica-lag scenarios, and consumer replay so compliance claims correspond to observable system behavior.",
        visualId: "consistent-hash",
        visualCaption:
          "Untrusted text reaches a shield at the midpoint; later stages block it before the trusted service.",
      },
    ],
    security: [
      {
        threat:
            "A user enumerates message or channel identifiers to read private conversations.",
          control:
            "Enforce channel membership on history, search, attachment, and export endpoints with uniform authorization failures.",
          verify:
            "Use authenticated non-members to query known private IDs across every read surface and confirm no content or metadata leaks.",
      },
      {
        threat:
          "Deleted messages remain visible through search, caches, or delayed derived consumers.",
        control:
          "Apply an immediate deny record, propagate tombstones through every projection, and monitor deletion lag to completion.",
        verify:
          "Delete representative messages and query live history, search, caches, and restored views until all required surfaces confirm removal.",
      },
      {
        threat:
          "A single account performs bulk history exports or broad searches that consume shared capacity.",
        control:
          "Apply identity-based quotas, bounded pagination, query-complexity limits, and audited export permissions.",
        verify:
          "Exceed export and search quotas while confirming normal channel reads remain within their latency target.",
      },
    ],
    quiz: quizFor("discord-trillions-of-messages", [
      {
        kind: "scenario",
        question:
          "One channel produces one hundred times the messages of an average channel. Which storage boundary best protects the rest of the system?",
        choices: [
          "A global partition sorted only by timestamp",
          "A channel key combined with a volume-aware time bucket",
          "One table row containing the channel's entire history",
          "A partition key based only on author ID",
        ],
        answerIndex: 1,
        explanation:
          "Channel locality matches history reads, while time buckets keep an unusually active channel from creating an unbounded partition.",
      },
      {
        kind: "story-match",
        question:
          "What does the filing-cabinet analogy teach about channel and time partitioning?",
        choices: [
          "Old periods should be deleted before they are archived",
          "Every drawer must be replicated to every server",
          "Channel gives locality while time buckets bound size and retention work",
          "Every channel should use the same monthly bucket regardless of volume",
        ],
        answerIndex: 2,
        explanation:
          "The room identifies the conversation, and smaller drawers keep a busy room from overwhelming the cabinet or complicating retention.",
      },
      {
        kind: "tradeoff",
        question:
          "What is the central trade-off when search is built as an asynchronous projection?",
        choices: [
          "It requires a global transaction for every message",
          "Deletion propagation becomes unnecessary",
          "It prevents cursor pagination in the canonical store",
          "It scales independently but adds duplication, lag, and tombstone work",
        ],
        answerIndex: 3,
        explanation:
          "The canonical log stays simple, but search freshness and deletion correctness now depend on a separately monitored consumer.",
      },
      {
        kind: "security",
        question:
          "An urgent private-message deletion arrives while derived indexes are behind. What should happen first?",
        choices: [
          "Apply an immediate read deny while tombstones and cleanup propagate",
          "Wait for every backup to expire before blocking access",
          "Remove only the message from the user interface",
          "Rebuild the entire cluster before acknowledging the request",
        ],
        answerIndex: 0,
        explanation:
          "Immediate denial stops new exposure; physical cleanup can then proceed through caches, projections, archives, and backups.",
      },
    ]),
  },
  {
    id: "securing-agents-against-indirect-injection",
    slug: "securing-agents-against-indirect-injection",
    title: "Securing AI Agents Against Indirect Prompt Injection",
    dek:
      "Retrieved documents, web pages, and tool output are untrusted data even when they look authoritative. Build agents that keep instructions separate from evidence, minimize tool authority, and require confirmation before sensitive actions.",
    minutes: 12,
    relatedLessonIds: [
      "ai-security",
      "embeddings-rag",
      "agent-loop",
      "evals-guardrails",
      "observability-slos",
    ],
    steps: [
      {
        title: "Understand the trust boundary inside the context window",
        story:
          "A research assistant should treat a note found in a filing cabinet as evidence, not as a new employment contract. Language models process text as tokens, so a document that contains instruction-like language can compete with the system's real instructions. Indirect prompt injection is the risk that untrusted retrieved or returned content steers the agent's behavior. The core mistake is believing that because the agent fetched the text itself, the text has become trustworthy. A retrieved page saying 'ignore previous instructions' remains a quoted exhibit, not a new rule for the judge or the courtroom.",
        engineer:
          "Separate trusted system and developer instructions from untrusted user content, retrieved passages, web pages, and tool observations using explicit roles, structured envelopes, and provenance labels. Labels improve reasoning but are not a complete security boundary, so enforce policy outside the model as well. Keep retrieval snippets bounded, mark their source, and prevent retrieved text from changing tool definitions or permission grants. Record which sources contributed to a decision so suspicious influence can be investigated. Do not evaluate retrieved text as code, shell syntax, authorization policy, or configuration; parse it into inert data with a schema.",
        visualId: "rag-space",
        visualCaption:
          "A query retrieves nearby passages in embedding space, showing where external evidence enters the agent's context.",
      },
      {
        title: "Keep retrieved evidence separate from instructions",
        story:
          "A courtroom exhibit may describe what someone should do, but the judge still decides which instructions are admissible. An agent needs the same discipline. Retrieved text should answer a question or provide facts, not silently become a command to contact a server, change a record, or ignore earlier constraints. The design should make the difference visible in the data model, not rely on the model to guess from punctuation or capitalization. A search result can rank first because its wording matches the question, not because its author had permission to change the agent's goals.",
        engineer:
          "Represent retrieval results as typed objects with source, timestamp, trust classification, and content, then pass them through a rendering layer that cannot emit tool calls. Maintain tool availability and policy in code outside the context. Ask the model to cite evidence and return structured intents, which a deterministic policy layer validates against the original user request and current permissions. Restrict cross-source reasoning when provenance matters, and reject outputs that reference unavailable sources or unsupported actions. Retrieval ranking should not elevate content because it is persuasive; relevance, source policy, and freshness are separate signals.",
        visualId: "rag-space",
        visualCaption:
          "A query lands in embedding space, three nearby passages are highlighted, and the lowest-scoring point is rejected.",
      },
      {
        title: "Give tools the smallest useful authority",
        story:
          "A volunteer helping in a library does not need the keys to the vault. An agent with a general search tool may be helpful, while the same agent holding payment, deletion, and administrative credentials is a much larger risk. Tool authority should be scoped to the task and environment. A read-only research assistant should not inherit write privileges just because a powerful tool happens to be installed in the same runtime. A research task can receive a search-only token even when the same runtime also contains an administrator credential for a different service.",
        engineer:
          "Maintain explicit tool allowlists per task, tenant, and user permission. Scope credentials to resources and operations, use short-lived tokens, and run tools in a sandbox with restricted network and filesystem access. Separate read tools from write tools and require a policy check before invocation. Validate arguments against schemas, cap output size, and impose time and cost budgets. Do not let model-generated text select arbitrary endpoints, commands, or database queries. Log tool name, policy decision, and outcome without logging secrets, and verify that a compromised or confused model cannot call a tool outside its declared capability set.",
        visualId: "agent-loop",
        visualCaption:
          "The tool allowlist is the active stage, while an 'other tool' call stays crossed out outside the approved loop.",
      },
      {
        title: "Confirm sensitive actions and redact tool output",
        story:
          "A careful assistant reads a contract aloud before asking for a signature. For an agent, irreversible or high-impact actions deserve the same pause. Confirmation should describe the actual target and consequence, not merely ask whether the user wants to continue. At the same time, tool output may contain credentials or private records, so the agent should not repeat secrets into a transcript or forward them to another service. Approving a payment to merchant A must not authorize the same agent to send merchant B a larger amount after one parameter changes.",
        engineer:
          "Classify actions by impact and require out-of-band or explicit user confirmation for payments, external messages, permission changes, deletion, and production modifications. Bind approval to a structured action hash, resource, parameters, and expiry so a changed action cannot reuse an old confirmation. Show a human-readable summary and require re-approval when material parameters change. Redact secrets and sensitive fields from tool results before they enter model context, using allowlisted fields where possible. Sandbox untrusted tools and constrain outbound destinations. Verify that approval cannot be forged through retrieved content and that secret-like output is absent from logs and final answers.",
        visualId: "threat-defense",
        visualCaption:
          "A labeled block of untrusted text is stopped at the shield before it can enter the trusted service.",
      },
      {
        title: "Contain failures with budgets, telemetry, and kill switches",
        story:
          "Even a well-trained assistant can make a bad recommendation, so the building needs fire exits. Agents need step limits, token and cost budgets, sandbox boundaries, and a manual stop control. If a task loops, repeatedly calls an external service, or starts requesting unexpected tools, the system should stop and ask for help. The goal is not to make the model infallible; it is to make mistakes bounded, visible, and reversible. When the fourth tool call fails, the runtime should cancel the fifth call, preserve the user's original request, and leave a short incident record.",
        engineer:
          "Enforce maximum steps, tool calls, elapsed time, token spend, and external side effects for every task. Monitor tool-policy denials, confirmation overrides, unusual source diversity, repeated retries, and changes in action type. Provide a kill switch that revokes credentials and cancels pending actions, and require idempotency for retryable writes. Use canary evaluation with adversarial but safe fixtures to test separation and policy enforcement, without embedding exploit prompts in production documentation. Keep an audit trail with source provenance and policy decisions. Recovery should preserve the original user request, not blindly resume from an untrusted model-generated plan.",
        visualId: "agent-loop",
        visualCaption:
          "The loop keeps a stop gate beside the tool stages, making bounded execution visible even when planning restarts.",
      },
    ],
    security: [
      {
        threat:
          "Untrusted retrieved text is treated as instructions that redirect the agent toward an unauthorized action.",
        control:
          "Separate evidence from instructions, attach provenance, and validate model-produced intents with deterministic policy outside the model.",
        verify:
          "Use benign instruction-like fixtures and confirm the agent reports them as evidence without changing tools, permissions, or goals.",
      },
      {
        threat:
          "A confused or compromised agent invokes a powerful tool beyond the user's authority.",
        control:
          "Apply per-task tool allowlists, least-privilege scoped credentials, sandboxing, and runtime policy checks before every call.",
        verify:
          "Attempt out-of-scope calls from each task role and confirm denial, credential containment, and an auditable policy event.",
      },
      {
        threat:
          "Tool output leaks secrets into model context, logs, or the user-visible answer.",
        control:
          "Return allowlisted fields, redact sensitive values before context assembly, and restrict outbound data destinations.",
        verify:
          "Run tools with synthetic secret fixtures and scan transcripts, logs, and final responses for unauthorized disclosure.",
      },
    ],
    quiz: quizFor("securing-agents-against-indirect-injection", [
      {
        kind: "story-match",
        question:
          "In the courtroom analogy, how should an agent treat a retrieved page that says 'ignore previous instructions'?",
        choices: [
          "As trusted instructions because retrieval selected the page",
          "As permission to rewrite the agent's tool definitions",
          "As inert evidence whose claims and provenance can be inspected",
          "As authorization when it ranks above other sources",
        ],
        answerIndex: 2,
        explanation:
          "Fetching or ranking a document does not grant it authority. Instruction-like content must remain evidence, not policy.",
      },
      {
        kind: "security",
        question:
          "Which boundary best survives a confused or manipulated model proposing a powerful tool call?",
        choices: [
          "A polite sentence in the system prompt",
          "Trusting tool names because they are valid JSON",
          "A larger context window with more examples",
          "Deterministic runtime allowlists, scoped credentials, and permission checks",
        ],
        answerIndex: 3,
        explanation:
          "Policy enforced outside the model limits actual authority even when the model produces an unsafe intent.",
      },
      {
        kind: "tradeoff",
        question:
          "A research runtime also has an administrator credential installed for another service. What is the safest design?",
        choices: [
          "Give the research task a search-only credential scoped to its resources",
          "Share the administrator credential so tools are easier to configure",
          "Let model-generated text choose whichever endpoint it needs",
          "Rely on prompt wording instead of separating tool permissions",
        ],
        answerIndex: 0,
        explanation:
          "Capability should follow the task, not the union of every tool installed in the process.",
      },
      {
        kind: "scenario",
        question:
          "A user approved a $100 payment to merchant A. The agent now proposes $500 to merchant B. What should happen?",
        choices: [
          "Reuse the approval because both actions are payments",
          "Require a new confirmation bound to merchant B and the $500 parameters",
          "Hash only the action type and skip parameter checks",
          "Let a retrieved document approve the changed payment",
        ],
        answerIndex: 1,
        explanation:
          "Approval must bind to the exact target, amount, and expiry; material changes invalidate the old consent.",
      },
    ]),
  },
  {
    id: "what-happens-during-token-generation",
    slug: "what-happens-during-token-generation",
    title: "What Actually Happens During an LLM Token Generation",
    dek:
      "A generated sentence is a sequence of probability-driven decisions, not a paragraph retrieved in one jump. Follow the path from prefill to decode, understand why the KV cache matters, and see where batching changes throughput and latency.",
    minutes: 10,
    relatedLessonIds: [
      "kv-cache-paged-attention",
      "tokenization",
      "agent-loop",
      "transformer-bottlenecks",
      "observability-slos",
    ],
    steps: [
      {
        title: "The model predicts one token at a time",
        story:
          "Writing a sentence with a very cautious autocomplete feels unfamiliar: choose a word, append it, reconsider, then choose again. An autoregressive language model does exactly that at token granularity. It converts context into numerical representations, scores possible next tokens, samples or selects one, and feeds the enlarged sequence back into the next step. The fluent paragraph appears all at once on screen, but underneath it is a loop with many small decisions. For a five-hundred-token answer, that loop runs roughly five hundred prediction steps after the prompt has been prefilled once.",
        engineer:
          "Tokenize the prompt into IDs, add positional information, and pass them through transformer layers during prefill. The output distribution over the vocabulary is shaped by decoding policy such as temperature, top-k, or top-p, then a token is selected and appended. Decode repeats with the new token until an end condition or maximum length. Sampling randomness affects reproducibility, while context limits and stop rules bound the loop. Do not confuse token count with word count; punctuation, code, and non-English text can tokenize very differently. Log prompt tokens, generated tokens, finish reason, and timing to explain both cost and user experience.",
        visualId: "tokenization",
        visualCaption:
          "A context-length bar divides GPU memory among weights, the growing KV cache, and activations.",
      },
      {
        title: "Prefill and decode have different resource profiles",
        story:
          "An actor preparing for a long performance first reads the entire briefing with the cast assembled, then delivers the script one new line at a time. Prefill is that first read: the model processes the prompt in parallel and builds the cast's shared notes. Decode is the performance: each new line depends on the previous one, so the actor cannot read the whole remaining script at once. The briefing makes time to first token possible, but a long run depends on how quickly the actor can speak each next line. Optimizing the opening read while every later line crawls leaves the audience waiting through the whole scene.",
        engineer:
          "Prefill is compute-heavy because it processes the prompt in parallel across layers and produces initial attention key and value tensors. Decode is often memory-bandwidth-heavy because each new token attends to the cached context and must read substantial weights and KV state. Time to first token is dominated by queueing, prefill, and scheduling, while inter-token latency reflects decode throughput and batch composition. A long prompt can make first-token latency high even when generated output is short. Measure both phases separately; reporting only total generation time hides which part needs optimization. Track prefill milliseconds per thousand prompt tokens separately from inter-token latency at fixed batch sizes.",
        visualId: "attention-kv",
        visualCaption:
          "The KV matrix fills another attended row as a new token connects to cached key/value blocks.",
      },
      {
        title: "The KV cache avoids recomputing the past",
        story:
          "A chess player does not rebuild the entire position from memory before every move. They keep notes about the pieces that matter and update them incrementally. The KV cache is the model's working note. Without it, every new token would force attention to reprocess the whole prefix, turning generation into an increasingly expensive reread. With it, the model stores past keys and values and updates only the new position. At a thirty-two-thousand-token context, the same live request may reserve pages for every layer before it can generate its first new token.",
        engineer:
          "During prefill, compute and store key and value tensors for each transformer layer and token. During decode, the new token's queries attend to those cached tensors, then its own keys and values are appended. Memory grows with layer count, sequence length, batch size, and numerical precision, so long contexts and many concurrent requests compete for GPU memory. Paged KV allocation reduces fragmentation by mapping sequence blocks to physical pages. Eviction, preemption, and cache reuse policies affect latency and cost. A cache hit can skip prefix work only when the exact prefix and relevant model state match, so cache keys must include model and tokenizer identity.",
        visualId: "attention-kv",
        visualCaption:
          "A new token sends dashed attention lines into several cached rows, with one reused paged block outlined.",
      },
      {
        title: "Batching trades waiting for throughput",
        story:
          "A bus can carry more passengers than a taxi, but everyone waits until enough riders arrive. Continuous batching works the same way for tokens. The scheduler keeps a running batch of sequences, adds new work when slots open, and removes finished sequences. Throughput improves because matrix operations serve several requests together, yet a large batch can make individual tokens slower. The operator's job is to choose a queue that feels responsive without leaving the expensive processor idle. A batch of eight long prompts may fill the GPU before a single short interactive request gets a scheduling slot.",
        engineer:
          "Use continuous or iteration-level batching instead of waiting for a fixed batch to finish. Admit requests based on available KV blocks, token budget, and latency class. Prefill-heavy and decode-heavy work may need separate queues or priority rules because their resource profiles differ. Streaming exposes first tokens early and improves perceived latency, but it does not remove total decode time. Set maximum input and output lengths, cap queue age, and apply admission control under overload. Track time to first token, inter-token latency, tokens per second per request, aggregate throughput, GPU memory utilization, and queue length so a throughput gain does not conceal a tail-latency regression.",
        visualId: "queue-workers",
        visualCaption:
          "A producer queue feeds three workers; each added item makes the waiting batch easier to compare with available capacity.",
      },
      {
        title: "Make generation safe, observable, and cost-aware",
        story:
          "A powerful autocomplete still needs guardrails. It may expose a secret from retrieved context, produce malformed output, or consume a surprising budget before the application can intervene. Serving infrastructure should treat prompts and outputs as untrusted data, enforce structured schemas where possible, and stop work when limits are crossed. Observability should explain what the system did without copying every private prompt into a permanent log. A tenant that asks for a hundred thousand output tokens should hit a policy limit before its request consumes the memory reserved for other users on the same worker.",
        engineer:
          "Validate structured outputs with a constrained decoder or parser and retry only within a bounded policy. Apply input and output moderation appropriate to the product, but keep those services from becoming unbounded synchronous dependencies. Redact secrets and personal data from telemetry, isolate tenants, and rate-limit expensive long-context requests. Propagate request IDs across retrieval, scheduling, and generation so incidents can be traced. Record token usage, cache reuse, queue delay, prefill time, decode time, and finish reason. Provide per-tenant budgets and kill switches, and verify that cancellation releases KV pages and stops billable work promptly.",
        visualId: "threat-defense",
        visualCaption:
          "Untrusted input is inspected at a shield, which blocks unsafe content before it reaches the trusted service.",
      },
    ],
    security: [
      {
        threat:
          "A user submits enormous prompts or generation limits to monopolize GPU memory and serving capacity.",
        control:
          "Enforce token, context, output, concurrency, and tenant budgets with admission control before expensive prefill.",
        verify:
          "Exceed each limit while confirming bounded rejection, prompt cancellation, and unaffected service for other tenants.",
      },
      {
        threat:
          "Prompts, retrieved context, or tool output expose secrets in logs or generated answers.",
        control:
          "Redact sensitive fields before context assembly and telemetry, return allowlisted retrieval data, and restrict log access.",
        verify:
          "Use synthetic secret fixtures and inspect traces, stored logs, and final outputs for unintended disclosure.",
      },
      {
        threat:
          "Generated structured output is treated as trusted commands or configuration without validation.",
        control:
          "Parse model output into typed data and enforce runtime schemas, policy checks, and tool allowlists before use.",
        verify:
          "Supply malformed and out-of-policy structured outputs and confirm rejection before any side effect occurs.",
      },
    ],
    quiz: quizFor("what-happens-during-token-generation", [
      {
        kind: "scenario",
        question:
          "A request has a long prompt but asks for a short answer, and users see high time to first token. What should the team measure first?",
        choices: [
          "Shard the prompt across unrelated tenants",
          "Disable the KV cache to reduce memory",
          "Always increase batch size until the GPU is full",
          "Separate queue and prefill time from decode time, then cap input length",
        ],
        answerIndex: 3,
        explanation:
          "A long prompt can dominate first-token latency even when decode is short. Separate phase metrics identify the right fix.",
      },
      {
        kind: "story-match",
        question:
          "In the actor-and-briefing scene, what distinguishes prefill from decode?",
        choices: [
          "Prefill reads the prompt in parallel; decode delivers one dependent line at a time",
          "Prefill and decode have identical memory and compute profiles",
          "Decode generates every remaining line in parallel",
          "The briefing removes the need for cached keys and values",
        ],
        answerIndex: 0,
        explanation:
          "The cast can absorb the briefing together, but each spoken line waits for the preceding line and shapes what comes next.",
      },
      {
        kind: "tradeoff",
        question:
          "What is the central trade-off in continuous batching?",
        choices: [
          "It always lowers both latency and KV memory use",
          "Higher throughput can increase queueing, per-token latency, and memory pressure",
          "It removes the need for admission control",
          "A fixed batch is always more responsive than a running batch",
        ],
        answerIndex: 1,
        explanation:
          "Batching improves hardware utilization, but the scheduler must protect interactive latency and KV capacity.",
      },
      {
        kind: "security",
        question:
          "A tenant requests the maximum output length for many concurrent prompts. Which control best protects other users?",
        choices: [
          "Let the requests run and redact logs afterward",
          "Rate-limit only after generation finishes",
          "Enforce token and concurrency budgets before prefill, and release KV pages on cancellation",
          "Store full prompts in shared logs for later review",
        ],
        answerIndex: 2,
        explanation:
          "Expensive work must be bounded before it consumes shared GPU memory; cancellation must reclaim resources promptly.",
      },
    ]),
  },
  {
    id: "zero-downtime-schema-migrations",
    slug: "zero-downtime-schema-migrations",
    title: "Zero-Downtime Schema Migrations Explained Visually",
    dek:
      "A safe migration is a sequence of compatible deployments, not one dramatic table rewrite. Use expand-and-contract, backfill in bounded batches, validate both paths, and make rollback possible until the old schema is truly unused.",
    minutes: 12,
    relatedLessonIds: [
      "sql-modeling",
      "safe-deployments",
      "distributed-transactions",
      "replication-consistency",
      "scaling-databases",
      "observability-slos",
    ],
    steps: [
      {
        title: "Compatibility is the unit of migration",
        story:
          "Renovating a shop should not require closing the street whenever one wall changes. Zero-downtime migration applies that idea to a database. Old and new application versions overlap, so each schema change must be readable and writable by both. If the new version removes a column while an old instance still reads it, the deployment order has already failed. The safe move is to add the new structure first and remove the old one only after every consumer has moved. Old instances still running during a rollout become compatibility tests that no migration checklist can safely ignore.",
        engineer:
          "Use expand-and-contract: add nullable columns, tables, indexes, or compatible types; deploy code that can read both shapes; backfill; switch reads; stop writes to the old shape; then remove it in a later release. Each phase needs a compatibility statement and a rollback plan. Adding an index can still lock or saturate I/O depending on the database, so use online or concurrent operations where supported and test on production-like data. Avoid changing a column's meaning in place; introduce a new field and versioned interpretation so old rows remain understandable. Test each release against the previous two application versions, and alert on lock wait time during index creation.",
        visualId: "expand-contract",
        visualCaption:
          "The split visual contrasts in-place B-tree page rewrites with buffered LSM writes flushing into sorted runs.",
      },
      {
        title: "Backfill without creating a second outage",
        story:
          "Copying a million-row archive in one enormous move is like trying to move a library through the front door at once. The books arrive, but so does the crowd. A backfill needs batches, pauses, checkpoints, and a way to resume. It should yield to live traffic and report progress. The goal is not merely to finish; it is to finish without making the application unavailable during the copy. A backfill that stops whenever p95 latency rises preserves checkout traffic, then resumes from its last committed key range instead of starting over.",
        engineer:
          "Scan stable row identifiers or keyset ranges in bounded batches, update only rows that still need migration, and commit between batches. Use conditional updates so a live write to the new shape is not overwritten by stale backfill data. Checkpoint the last completed range and make each batch idempotent. Add rate limits, timeouts, and automatic pauses when database latency or replica lag crosses policy. Handle deletes and rows inserted behind the scan cursor through a reconciliation query or change stream. Monitor rows remaining, oldest pending row, error rate, and source impact rather than relying on a percentage that can stall at ninety-nine.",
        visualId: "expand-contract",
        visualCaption:
          "A producer feeds a queue and three workers; batch growth shows how migration work can be bounded and distributed.",
      },
      {
        title: "Shadow writes and dual reads expose disagreement",
        story:
          "Two maps can both look plausible while disagreeing about one important road. During migration, write the new shape alongside the old and compare reads or results before committing to the switch. Shadowing is a rehearsal with real traffic. It catches missing defaults, encoding differences, timezone mistakes, and stale backfill logic that a test database may never reveal. If a currency value changes meaning during the move, both paths can return plausible numbers while disagreeing about the customer's actual balance. The comparison must use the same business invariant before any cutover.",
        engineer:
          "After expansion, write both old and new representations, preferably through one transaction or an outbox when they span stores. Read from the new path for a small cohort while keeping the old path available, and compare normalized results without logging sensitive values. Track mismatch counts by category and block promotion if correctness checks fail. Make shadow writes bounded and idempotent because retries can duplicate side effects. Beware dual-write availability coupling: if the new store is down, decide explicitly whether the request fails or queues a retry. A rollback must work with data written only to the new path, often by making the old version understand that path.",
        visualId: "expand-contract",
        visualCaption:
          "A service commits to an outbox before a relay delivers to the sink; the return path marks atomic commit.",
      },
      {
        title: "Cut over gradually and keep a real rollback",
        story:
          "A bridge opens one lane at a time so engineers can watch the traffic and close a lane if something bends. Schema cutover deserves the same gradualism. Feature flags, canary cohorts, and reversible code paths let the team observe behavior before everyone crosses. Removing the old bridge immediately after the first car passes turns a manageable migration into a one-way gamble. Moving one percent of reads first may reveal a timezone bug that would have been invisible in staging, while ninety-nine percent of users remain on the working path for now.",
        engineer:
          "Promote reads and writes through versioned flags, starting with internal accounts or a small traffic percentage. Watch error rate, latency, query plans, data mismatches, replication lag, and business invariants at each step. Keep old code deployable until the new path has survived a full release and recovery window. Document rollback for both code and data: a binary rollback may be easy while restoring overwritten rows is not. Freeze destructive contract changes until telemetry proves the old field is unused across services, jobs, and analytics. Pause the migration when guardrails regress rather than pushing forward to meet a calendar.",
        visualId: "expand-contract",
        visualCaption:
          "A deployment bar advances from five percent new traffic to full rollout, then shows a rollback state if errors rise.",
      },
      {
        title: "Protect sensitive data and verify recovery",
        story:
          "A migration often copies the organization's most sensitive records into a new location. That new table, shadow stream, and comparison log all become part of the security boundary. It is not enough for the migration to finish quickly; it must avoid broad credentials, unnecessary copies, and permanent debug artifacts. Recovery is equally important because the safest rollback still depends on backups that can actually be restored. A migration role that can read every customer secret creates a temporary breach surface even if the final table has perfect row-level policies and encryption.",
        engineer:
          "Use dedicated migration credentials with only the required schema and row permissions, and avoid selecting secret columns into staging or comparison logs. Encrypt data in transit and at rest, enforce retention on temporary tables, and audit administrative changes. If the new shape changes access control, verify row-level policies and application authorization before enabling reads. Rehearse restore in an isolated environment and measure recovery time against the service objective. At contract completion, remove old columns and temporary artifacts through another reviewed migration, not an ad hoc production command. Verify that backups, replicas, and derived indexes converge on the intended retention and deletion policy.",
        visualId: "threat-defense",
        visualCaption:
          "External input meets a shield before the trusted service; the final stages show the request blocked.",
      },
    ],
    security: [
      {
        threat:
          "Migration credentials or temporary tables expose more sensitive data than the migration requires.",
        control:
          "Use dedicated least-privilege credentials, minimize selected columns, encrypt storage, and expire temporary artifacts.",
        verify:
          "Review migration permissions and scan temporary tables and logs for unnecessary sensitive fields before promotion.",
      },
      {
        threat:
          "A new schema bypasses existing row-level or application authorization rules.",
        control:
          "Port and test access policies during expansion, and require authorization checks before any new-path read is enabled.",
        verify:
          "Run cross-role and cross-tenant reads against old and new paths and compare allowed and denied records.",
        },
      {
        threat:
          "A failed migration leaves no trustworthy rollback because backups or dual-write reconciliation are untested.",
        control:
          "Rehearse restore and rollback with production-like data, and require reconciliation before destructive contract changes.",
        verify:
          "Execute a timed restore-and-rollback drill and confirm data invariants, service recovery time, and audit completeness.",
      },
    ],
    quiz: quizFor("zero-downtime-schema-migrations", [
      {
        kind: "story-match",
        question:
          "In the shop-renovation analogy, what is the safest first schema change while old and new application versions overlap?",
        choices: [
          "Add a backward-compatible structure before removing the old one",
          "Close all traffic until every instance is replaced",
          "Rewrite every row in one transaction",
          "Remove old application instances before changing the database",
        ],
        answerIndex: 0,
        explanation:
          "Expansion gives every running version a readable and writable path; contraction waits until the old shape is unused.",
      },
      {
        kind: "scenario",
        question:
          "A backfill stalls at 99% while p95 database latency rises. Which recovery is safest?",
        choices: [
          "Finish the remaining rows in one long transaction",
          "Restart with offset pagination and no checkpoint",
          "Use checkpointed keyset batches, conditional updates, and latency-based pauses",
          "Overwrite live writes with the backfill's older values",
        ],
        answerIndex: 2,
        explanation:
          "Bounded idempotent batches protect live traffic and resume safely without skipping rows or clobbering newer writes.",
      },
      {
        kind: "tradeoff",
        question:
          "What is the main trade-off of shadow writes during a migration?",
        choices: [
          "They eliminate the need for rollback planning",
          "They expose semantic drift but add duplicate-work and availability coupling",
          "They remove the need for schema compatibility",
          "They remove the need to compare business invariants",
        ],
        answerIndex: 1,
        explanation:
          "Shadowing catches real-data differences early, but retries and cross-store failures must be bounded and explicitly handled.",
      },
      {
        kind: "security",
        question:
          "Which setup best protects sensitive records copied into temporary migration tables?",
        choices: [
          "A broad administrator credential shared by every migration job",
          "Comparison logs that include secret columns for debugging",
          "Unencrypted staging tables retained indefinitely",
          "Least-privilege credentials, minimal selected columns, encryption, and expiry",
        ],
        answerIndex: 3,
        explanation:
          "Temporary copies expand the security boundary and should expose only the data and access required for the migration.",
      },
    ]),
  },
  {
    id: "consistent-hashing-in-production",
    slug: "consistent-hashing-in-production",
    title: "Consistent Hashing in Production",
    dek:
      "Consistent hashing reduces the remapping caused by cluster membership changes, but it does not eliminate hot keys or operational failure. Learn how virtual nodes, replication, balancing, and careful key design turn a clever ring into a dependable production system.",
    minutes: 10,
    relatedLessonIds: [
      "scaling-databases",
      "consistent-hashing",
      "caching-eviction",
      "replication-consistency",
      "load-balancing",
      "observability-slos",
    ],
    steps: [
      {
        title: "Understand what modulo hashing remaps",
        story:
          "If seats in a theater are assigned by taking the guest number modulo the current seat count, adding one section moves almost every guest. A cache cluster using simple modulo has the same problem: one node joins or leaves, and most keys point to new owners. Users experience a cold-cache storm while databases absorb the misses. Consistent hashing arranges owners around a ring so a membership change moves only a neighboring slice of keys, not the entire audience. With one hundred servers, modulo hashing can remap almost every key when a single machine joins or leaves.",
        engineer:
          "Hash keys and node identifiers into the same fixed space, place nodes on a circle, and assign each key to the next node clockwise. Adding a node takes keys from its predecessor until the next boundary; removing a node sends its keys to the next surviving owner. With few nodes, key distribution can still be uneven and a single failure can move a large arc. This is why the basic ring is a teaching model rather than the final production design. Measure remapped key percentage during membership changes and define acceptable cache warmth and data-migration time.",
        visualId: "consistent-hash",
        visualCaption:
          "Sixteen keys are arranged around four ring nodes, making the clockwise ownership slices visible.",
      },
      {
        title: "Use virtual nodes to smooth ownership",
        story:
          "A circular table with four large place settings does not divide a crowd evenly. Consistent hashing without many points can leave one server with a tiny arc and another with half the ring. Virtual nodes give each physical server several smaller place settings around the table. The server's total share is then the sum of many small arcs, which tends to be smoother and makes adding or removing capacity less lopsided. Giving each physical server sixty-four smaller positions makes ownership changes finer-grained, but the routing table now has four times as many boundaries to maintain.",
        engineer:
          "Create multiple virtual nodes per physical server and hash each into the ring. More virtual nodes generally improve balance and finer-grained movement, at the cost of larger routing metadata and more membership updates. Choose the count through load testing rather than a universal magic number. Weight virtual-node count when machines have different capacity, but rebalance slowly because changing weights moves data. Keep the hash function stable across deployments; an algorithm or serialization change can silently move every key. Maintain a sorted ring index or a tree structure so owner lookup remains logarithmic without scanning all points.",
        visualId: "consistent-hash",
        visualCaption:
          "The notation strip highlights service rate μ beside arrival rate λ, decoding the utilization ratio ρ.",
      },
      {
        title: "Replicate on the ring and plan for handoff",
        story:
          "A key assigned to one ring position is not the same as a key stored safely. Production systems usually assign a primary and several successors as replicas, but the coordinator must decide which replicas are eligible and how failures change quorum. When a node leaves, the ring identifies new owners; it does not magically copy the bytes. Handoff is a data-migration problem with consistency and bandwidth costs. A successor on the ring might be in the same rack, so replica selection must skip that tempting neighbor and choose a genuinely independent failure domain.",
        engineer:
          "Walk clockwise from the key's primary to select distinct failure domains as replicas, avoiding placement that puts all copies in one rack or region. Define read and write consistency independently: quorum reads can improve freshness, while asynchronous replicas reduce latency but risk stale results. During membership changes, stream affected ranges to new owners, track progress, and keep old copies until acknowledgements and retention rules permit deletion. Use epochs or fencing tokens so a departing node cannot accept stale writes after ownership moves. Monitor replication lag and handoff backlog, and cap migration rate so rebalancing does not overwhelm the network.",
        visualId: "replication",
        visualCaption:
          "A primary fans writes to two replicas; one replica stays synchronized while the other accumulates visible lag.",
      },
      {
        title: "Consistent hashing does not solve hot keys",
        story:
          "A perfect seating chart still fails if every guest wants the same chair. Hashing distributes keys, not popularity. One celebrity account, common cache key, or shared counter can dominate a partition no matter how elegant the ring looks. Production capacity planning must identify these hot keys and give them a separate strategy instead of pretending virtual nodes can split one immutable key by themselves. If one celebrity account generates forty percent of requests, a beautifully balanced ring still sends most of that traffic to one owner for every cache lookup.",
        engineer:
          "Measure per-partition request rate, bytes, latency, and key concentration before and after rebalancing. Mitigate hot keys with local caching, read replicas, request coalescing, finer-grained subkeys where semantics allow, or deliberate application-level sharding. A counter can sometimes be decomposed into time or tenant buckets and summed, but that changes consistency and must be explicit. Hierarchical routing can add a load-aware rendezvous step for the hottest subset. Avoid random salting as a default because it turns point reads into scatter-gather operations. Alert when one partition's share materially exceeds its capacity share, and test failure of the node holding that hot key.",
        visualId: "sharding",
        visualCaption:
          "The final sharding stage splits the highlighted hot shard into two ranges instead of pretending the ring redistributed one key.",
      },
      {
        title: "Operate membership changes as controlled deployments",
        story:
          "Adding a node should feel like opening an extra checkout lane, not evacuating the store. In a live ring, membership changes interact with caches, replication, client routing, and data movement. If clients learn different ring versions at different times, requests can bounce or observe conflicting owners. The operational design needs versioned membership, graceful draining, and clear rollback criteria so the ring remains understandable during change. Two clients that disagree about the membership version can send writes to different owners unless routing updates and ownership epochs move together during a rollout.",
        engineer:
          "Publish membership versions through a consistent control plane, let nodes join in read-only or drain state, and move data before assigning them write responsibility. Prevent split ownership with epochs and require in-flight operations to finish within a bounded drain window. Stagger simultaneous node changes because each one shifts key boundaries and can compound migration load. Monitor routing errors, cache hit ratio, replication lag, range-transfer throughput, and p99 latency during the operation. Roll back by freezing membership rather than immediately removing several nodes. Verify behavior with node loss, network partition, restart during handoff, and clients holding stale routing tables.",
        visualId: "deploy-strategies",
        visualCaption:
          "The rollout bar shifts traffic toward the new membership version; the rollback stage keeps a reversible path visible.",
      },
    ],
    security: [
      {
        threat:
          "An attacker crafts keys that all map to one partition and exhausts its capacity.",
        control:
          "Monitor key concentration, enforce per-tenant quotas, and use bounded subkey or replica strategies for legitimate hot-key patterns.",
        verify:
          "Load-test concentrated and diverse key sets and confirm hot-partition limits protect unrelated tenants.",
      },
      {
        threat:
          "A departing or partitioned node accepts writes after ownership has moved.",
        control:
          "Use ownership epochs, fencing tokens, quorum rules, and explicit drain state before reassigning ranges.",
        verify:
          "Partition an old owner during handoff and confirm its stale writes are rejected without corrupting the new owner's data.",
      },
      {
        threat:
          "Replication places every copy in one failure domain or an unauthorized region.",
        control:
          "Select replicas across approved failure domains and enforce placement policy in the ring assignment layer.",
        verify:
          "Inspect replica placement under node and region loss, and confirm policy rejects disallowed destinations.",
      },
    ],
    quiz: quizFor("consistent-hashing-in-production", [
      {
        kind: "story-match",
        question:
          "What does the theater-seating analogy show about consistent hashing?",
        choices: [
          "The ring redistributes popularity evenly across every key",
          "Replica bytes copy automatically when seats move",
          "A membership change moves a neighboring slice instead of almost every guest",
          "Hashing makes key ownership reversible",
        ],
        answerIndex: 2,
        explanation:
          "The ring limits remapping to nearby ownership boundaries; it does not remove popularity skew or data-migration work.",
      },
      {
        kind: "scenario",
        question:
          "A ring with four physical nodes still has uneven ownership. Which change most directly improves balance?",
        choices: [
          "Switch to a new hash serialization during the incident",
          "Add capacity-weighted virtual nodes and rebalance gradually",
          "Disable authorization on the routing layer",
          "Return to global modulo hashing",
        ],
        answerIndex: 1,
        explanation:
          "Multiple points per server smooth arcs, while stable hashing and gradual movement prevent a full-keyspace remap.",
      },
      {
        kind: "tradeoff",
        question:
          "A key's next ring successor is in the same rack as its primary. What should the coordinator do?",
        choices: [
          "Skip that failure domain and manage replica handoff with fencing",
          "Accept the successor because ring order overrides placement policy",
          "Assume the ring copies bytes without bandwidth cost",
          "Use asynchronous replication and ignore stale-read risk",
        ],
        answerIndex: 0,
        explanation:
          "Replica selection must combine ring order with failure-domain policy, and ownership changes still require data transfer and stale-writer protection.",
      },
      {
        kind: "security",
        question:
          "A partitioned old owner keeps accepting writes after a range moves. Which control prevents split ownership?",
        choices: [
          "Increase the cache TTL for affected keys",
          "Ask clients to retry until both owners agree",
          "Rely on eventual replication without fencing stale writers",
          "Use ownership epochs, fencing tokens, quorum rules, and a drain state",
        ],
        answerIndex: 3,
        explanation:
          "Fencing and versioned ownership reject stale writers even when network partitions delay routing updates.",
      },
    ]),
  },
  {
    id: "kafka-consumer-lag",
    slug: "kafka-consumer-lag",
    title: "The Anatomy of Kafka Consumer Lag",
    dek:
      "Consumer lag is the distance between committed offsets and log end offsets, but the number alone does not explain the incident. Break lag into throughput, processing time, partition skew, rebalances, and downstream backpressure before changing the consumer group.",
    minutes: 11,
    relatedLessonIds: [
      "kafka-streaming",
      "queues-jobs",
      "scaling-databases",
      "observability-slos",
      "load-balancing",
    ],
    steps: [
      {
        title: "Lag is an offset gap with a time cost",
        story:
          "A library return slot shows how many books are waiting, but not how long each reader has been without them. Kafka lag counts records between a consumer's committed position and the end of a partition. Two groups can show the same lag while one is milliseconds behind and the other has missed a deadline for hours. The useful question is not only how far behind the consumer is, but how old the oldest unprocessed record has become. Ten thousand unread records may be seconds old on a busy topic but several hours old on a quiet one.",
        engineer:
          "For each partition, compare the consumer group's committed offset with the log end offset. Convert that gap into time using producer timestamps or consumer processing metrics, and monitor oldest-message age alongside record count. Committed offset means the application declared progress, not that every external side effect succeeded, so commit policy matters. A lag spike can come from a producer burst, consumer slowdown, partition reassignment, or a poisoned record. Establish an SLO such as maximum event age for business freshness, and alert on sustained burn rather than a single sample that may be noisy.",
        visualId: "kafka-partitions",
        visualCaption:
          "Three partition lanes carry different lag bars before feeding a shared consumer group.",
      },
      {
        title: "Find whether the group lacks throughput or parallelism",
        story:
          "A queue at a bakery may mean the ovens are too slow, the bakers are too few, or one baker has been assigned every complicated order. Kafka groups can fail in the same ways. Total processing capacity, partition count, and per-key work all matter. Adding consumers beyond the number of active partitions cannot increase parallelism; adding partitions to a consumer stuck on one bad record does not help either. If twelve consumers share three active partitions, nine have no partition to own, so their extra capacity cannot drain the backlog.",
        engineer:
          "Measure incoming records per second, processing rate, batch size, per-record service time, and active consumer count per partition. If all consumers are busy and processing rate is below arrival rate, optimize work or add capacity within partition limits. If many consumers are idle while one partition is hot, repartition or isolate the hot key rather than scaling the whole group. If one consumer repeatedly fails on a record, inspect error classes and dead-letter policy without replaying sensitive payloads into logs. Batch size and fetch settings can improve throughput but may increase latency and memory, so test them against the freshness SLO.",
        visualId: "kafka-partitions",
        visualCaption:
          "A queue fans out to three workers, making the difference between available workers and useful parallelism explicit.",
      },
      {
        title: "Downstream backpressure appears as Kafka lag",
        story:
          "A delivery driver does not become slow because the street is crowded; the warehouse door may simply be locked. Consumers often inherit the health of a database, API, or index they write to. When that dependency slows, records accumulate in Kafka even though the consumer code is unchanged. Looking only at consumer CPU misses the real queue in the system and can lead to adding workers that make the downstream problem worse. Adding more consumers while the database accepts only fifty writes per second simply creates more blocked workers and a larger retry storm.",
        engineer:
          "Trace processing spans from poll through external calls and commit. Compare dependency latency, error rate, connection pool saturation, and write quotas with consumer throughput. Apply bounded concurrency and circuit breakers so one slow dependency does not hold every partition thread. Use exponential backoff with jitter, but cap retry time so poison or permanently failing records move to a dead-letter path. Pause partition assignment when a dependency is unhealthy and resume after recovery. Preserve order where required by keeping a partition's processing sequential; parallelizing blindly can create correctness bugs. Monitor oldest record age during dependency incidents to quantify user-visible staleness.",
        visualId: "observability-sli",
        visualCaption:
          "Two API paths converge on a database; the upper path is marked slow, showing how one dependency can throttle the flow.",
      },
      {
        title: "Rebalances and commits can hide or create delay",
        story:
          "A relay team that stops to redistribute all batons every few minutes loses time even if each runner is fast. Consumer-group rebalances have a similar cost: partitions pause, in-flight work drains, offsets are committed, and ownership moves. Long processing or large batches make that pause worse. Commit policy also matters; committing before work completes can hide lag while losing data, while committing too late causes duplicate work after a crash. A consumer that takes ninety seconds to finish a batch can spend most of every rebalance draining work instead of processing new records.",
        engineer:
          "Use cooperative rebalancing where supported, keep processing within the session and poll timeouts, and checkpoint safely without committing records whose side effects are incomplete. Prefer bounded incremental batches to very large ones that delay ownership handoff. Static membership can reduce churn for stable workloads, but it can also delay failover if a dead member is not detected promptly. Instrument rebalance count, assignment time, processing duration, commit latency, and replay volume. After a restart, expect some duplicate processing and make handlers idempotent. Test rolling deploys and sudden consumer loss to ensure lag recovers within the objective.",
        visualId: "kafka-partitions",
        visualCaption:
          "The deployment bar advances through traffic stages and then reverses, visualizing a controlled handoff rather than an abrupt restart.",
      },
      {
        title: "Respond with a bounded incident playbook",
        story:
          "The worst response to a growing queue is a frantic change that multiplies traffic. A responder should first confirm that the lag is real, identify the affected partitions, and decide whether to restore throughput, shed noncritical work, or pause intake. Scaling is one tool, not the opening move. The playbook should protect the freshness promise while keeping the system understandable enough to recover safely. A responder who scales to fifty consumers before checking the downstream write limit may turn a two-minute backlog into a thirty-minute incident and a database outage.",
        engineer:
          "Start by measuring event age, partition skew, arrival rate, processing rate, and dependency health. Restore failed dependencies, pause expensive optional stages, or route low-priority events to a separate queue. Scale consumers only up to useful partition parallelism and verify downstream capacity first. If producers outrun sustainable processing, apply admission control or backpressure instead of letting backlog grow without bound. Record the timeline and the configuration changes, then replay from a known offset after correctness is verified. Monitor recovery slope and oldest-event age, not just the lag number, and review why alerting detected or missed the incident.",
        visualId: "observability-sli",
        visualCaption:
          "A staged rollout bar and rollback arrow show how capacity changes should be promoted gradually and reversed under guardrails.",
      },
    ],
    security: [
      {
        threat:
          "A compromised producer or consumer manipulates topics to disrupt shared processing capacity.",
        control:
          "Enforce topic-level ACLs, authenticated identities, producer quotas, and least-privilege consumer groups.",
        verify:
          "Attempt unauthorized produce, consume, group-join, and admin operations and confirm denial with audit records.",
      },
      {
        threat:
          "Malformed or malicious records crash consumers or leak secrets through error logs.",
        control:
          "Validate bounded schemas at the boundary, isolate processing, redact errors, and use controlled dead-letter handling.",
        verify:
          "Process malformed synthetic records and confirm bounded failure, safe logging, and continued processing of valid records.",
      },
      {
        threat:
          "An operational scaling change removes backpressure and overwhelms downstream databases or APIs.",
        control:
          "Require capacity-aware admission control, dependency quotas, and staged consumer scaling with freshness guardrails.",
        verify:
          "Simulate a backlog and downstream slowdown during scale-out and confirm the system sheds or pauses safely.",
      },
    ],
    quiz: quizFor("kafka-consumer-lag", [
      {
        kind: "scenario",
        question:
          "Two partitions show the same record lag, but one is busy and one is quiet. Which metric best explains user-visible staleness?",
        choices: [
          "The number of partitions alone",
          "The consumer group's configured name",
          "An early offset commit before processing completes",
          "The producer timestamp of the oldest unprocessed record",
        ],
        answerIndex: 3,
        explanation:
          "The same offset gap can represent seconds or hours. Oldest-message age connects backlog to the freshness objective.",
      },
      {
        kind: "story-match",
        question:
          "In the bakery analogy, what should an engineer distinguish before adding more consumers?",
        choices: [
          "Slow ovens, too few bakers, and one baker stuck with every complex order",
          "Only the total number of menu items",
          "Whether the queue uses JSON or Avro",
          "The broker's replication factor alone",
        ],
        answerIndex: 0,
        explanation:
          "Throughput, useful partition parallelism, and poison or hot records are different constraints and need different fixes.",
      },
      {
        kind: "tradeoff",
        question:
          "A downstream database slows and consumer lag rises. Which response avoids amplifying the incident?",
        choices: [
          "Scale consumers without checking database capacity",
          "Bound concurrency, apply backpressure or circuit breakers, and preserve partition order",
          "Commit offsets before external writes finish",
          "Parallelize every partition regardless of ordering requirements",
        ],
        answerIndex: 1,
        explanation:
          "More blocked workers and retries can worsen the dependency. Backpressure protects the downstream system while preserving correctness.",
      },
      {
        kind: "security",
        question:
          "Which control best limits a compromised producer or consumer on a shared Kafka cluster?",
        choices: [
          "Shared administrator credentials for every service",
          "Raw payload logging so failures are easier to inspect",
          "Topic ACLs, authenticated identities, quotas, schema validation, and redacted errors",
          "Disabled consumer groups for all production topics",
        ],
        answerIndex: 2,
        explanation:
          "Authentication, least privilege, quotas, and safe record handling constrain both capacity abuse and data disclosure.",
      },
    ]),
  },
  {
    id: "error-budgets-that-engineers-trust",
    slug: "error-budgets-that-engineers-trust",
    title: "Error Budgets Engineers Actually Trust",
    dek:
      "An error budget turns a reliability target into a shared decision about risk, but only when the measurement and policy are credible. Define user-visible indicators, use multi-window burn alerts, and make budget decisions predictable without hiding chronic failure.",
    minutes: 9,
    relatedLessonIds: [
      "observability-slos",
      "safe-deployments",
      "load-balancing",
      "replication-consistency",
      "metrics-alerting",
    ],
    steps: [
      {
        title: "Start with the user promise, not server uptime",
        story:
          "A theater can keep its lights on while the projector shows the wrong film. Infrastructure availability and user success are different promises. Engineers trust an error budget when it measures something they recognize as the product working: a payment completing, a message arriving, or a search returning a valid result. A budget built from vague server health encourages teams to optimize the dashboard instead of the experience. If nine hundred ninety-nine of one thousand checkouts succeed, the dashboard must count those exact checkout outcomes rather than assuming a green server means a good purchase.",
        engineer:
          "Define a service-level indicator from good and total valid events, excluding only agreed-upon client errors and planned maintenance according to a written policy. Choose the measurement window and percentile deliberately, then derive the error budget as one minus the objective. A 99.9% objective permits 0.1% bad events over the window, but that number is meaningful only with consistent event classification. Label SLIs by user journey and critical dependency, and write examples of what counts as good. Avoid averaging away a severe failure in a small critical cohort by adding journey-specific indicators.",
        visualId: "observability-sli",
        visualCaption:
          "A notation strip decodes arrival rate λ, service rate μ, and utilization ρ against the stability boundary.",
      },
      {
        title: "Use burn rate to detect slow and fast exhaustion",
        story:
          "A fuel gauge that only warns when the tank is empty is technically accurate and operationally useless. Error budgets need the same early-warning thinking. Burn rate compares how quickly the budget is being consumed with the rate that would exhaust it over the chosen window. A severe outage can consume several windows of budget in minutes, while a smaller chronic problem may erase it steadily over days. One threshold cannot see both shapes. A five-minute window catches a sudden outage, while a six-hour window reveals the smaller failure that quietly drains the same budget.",
        engineer:
          "Alert on multi-window, multi-burn-rate conditions: a fast window catches acute high-severity failure, while a longer window catches sustained moderate degradation. Require enough event volume in both windows to avoid noisy decisions from tiny samples. Page when user-visible burn threatens the objective, and create a ticket when the trend warrants investigation but not immediate interruption. Include an error-budget remaining panel and burn forecast in service reviews. Tune thresholds using incident history rather than copying generic numbers. The failure mode of overly sensitive rules is alert fatigue; overly loose rules make the budget a retrospective accounting trick.",
        visualId: "observability-sli",
        visualCaption:
          "Four token-bucket slots empty as requests arrive, ending with a denied request when the bucket is exhausted.",
      },
      {
        title: "Turn the budget into an explicit release policy",
        story:
          "A team with plenty of road left can try a new route. A team with almost none should repair the car before attempting a stunt. Error budgets are useful because they make that trade-off discussable before launch day. They do not mean reckless releases when healthy or frozen development when tired. They create a shared expectation: if reliability is being consumed quickly, the next priority is reducing risk and restoring user trust. A team at twenty percent remaining budget can still ship behind a canary, but a failed canary should trigger rollback instead of a debate about percentages.",
        engineer:
          "Define actions for healthy, warning, and exhausted states, such as normal release velocity, added review and staged rollout, or a temporary focus on reliability work. Base decisions on current burn and forecast, not only a red dashboard snapshot. Keep an exception process for security fixes and legally required changes, with explicit compensating controls. Pair every launch with rollback criteria, canary measurement, and an owner for budget recovery. Avoid punishing teams for reporting failures honestly; otherwise the metric becomes a performance incentive to hide bad events. Review whether policy changed outcomes, not merely whether everyone attended the meeting.",
        visualId: "deploy-strategies",
        visualCaption:
          "The rollout advances from five to twenty-five to one hundred percent new traffic, with a rollback state for rising errors.",
      },
      {
        title: "Make the measurement trustworthy",
        story:
          "A fuel gauge is useless if the fuel line leaks or the needle is calibrated differently in each car. Error budgets fail in the same quiet ways. Missing telemetry can look like perfect reliability, and inconsistent event definitions can move the goalposts after an incident. Trust requires visible data completeness, reproducible queries, and a clear record of exclusions. Engineers should be able to explain a budget number without opening a hundred dashboards. If the telemetry pipeline drops half the failed checkouts, the remaining sample can make a broken service look healthier than it really is.",
        engineer:
          "Monitor SLI event coverage, ingestion delay, dropped samples, and client-side versus server-side disagreement. Version definitions and backfill carefully when classification changes, because rewriting history can erase accountability. Store aggregate good and bad counts at a retention that supports the review window, with access controls for sensitive labels. Build one canonical query and expose it to all teams so dashboards and alerts do not diverge. When telemetry is incomplete, mark the budget unknown rather than healthy and investigate independently. Verify that synthetic good and bad events flow through the full pipeline and that outage conditions are classified correctly.",
        visualId: "observability-sli",
        visualCaption:
          "The replication diagram contrasts synchronized followers with a lagging one, making missing or delayed state visible.",
      },
      {
        title: "Review chronic risk and protect the budget itself",
        story:
          "A team can spend its entire budget on a thousand small paper cuts and never have a dramatic outage. The dashboard stays mostly green, but users keep waiting. Trusted budgets therefore look at chronic degradation, dependency risk, and repeated near misses, not only major incidents. The measurement system also needs protection: if anyone can alter SLI data or suppress alerts, the budget becomes a persuasive story rather than a safety signal. An engineer who can edit the SLI query without review can erase a bad week from the budget as easily as they can fix a dashboard label.",
        engineer:
          "Review recurring slow responses, partial failures, capacity margins, and unresolved action items alongside numerical budget consumption. Track leading indicators such as saturation and dependency error rate, but do not confuse them with the user-facing SLI. Restrict alert suppression and SLI configuration changes through reviewed roles, versioned policy, and audit logs. Ensure at least one independent monitor detects loss of the monitoring pipeline itself. Conduct game days that test both incident response and the trustworthiness of the budget. Security fixes may spend budget intentionally, but they should leave a documented recovery plan and a visible reduction in future risk.",
        visualId: "threat-defense",
        visualCaption:
          "Untrusted input is stopped at the shield before the trusted service, mirroring controls that protect reliability policy.",
      },
    ],
    security: [
      {
        threat:
          "An unauthorized actor changes SLI definitions or suppresses alerts to make reliability appear healthier.",
        control:
          "Version SLI policy, require reviewed privileged access, audit changes, and monitor configuration drift independently.",
        verify:
          "Attempt unapproved definition and suppression changes; confirm denial, alerts, and immutable audit evidence.",
      },
      {
        threat:
          "Sensitive labels or user identifiers leak through SLI exports and incident dashboards.",
        control:
          "Use bounded metric labels, aggregate exports, redact identifiers, and apply tenant-aware dashboard authorization.",
        verify:
          "Inspect exports and cross-tenant dashboard views for forbidden identifiers and ensure only aggregate authorized data appears.",
      },
      {
        threat:
          "Loss of monitoring is interpreted as a healthy error budget and hides an active outage.",
        control:
          "Track SLI coverage and ingestion freshness, mark unknown states explicitly, and alert independently on observability loss.",
        verify:
          "Stop SLI ingestion during a simulated incident and confirm the budget becomes unknown and the independent monitor pages.",
      },
    ],
    quiz: quizFor("error-budgets-that-engineers-trust", [
      {
        kind: "story-match",
        question:
          "In the theater analogy, why are the lights being on insufficient evidence of a reliable service?",
        choices: [
          "Server uptime guarantees user success",
          "The SLI must measure user-visible good events against valid total events",
          "Deployment count is the only meaningful reliability signal",
          "A green infrastructure dashboard replaces journey metrics",
        ],
        answerIndex: 1,
        explanation:
          "The projector can show the wrong film while every light works. The budget must measure the user journey, not a proxy.",
      },
      {
        kind: "scenario",
        question:
          "SLI ingestion stops during a suspected outage. How should the error budget respond?",
        choices: [
          "Assume the service is healthy because no bad events arrived",
          "Raise the objective retroactively to absorb the gap",
          "Mark the budget unknown and trigger independent observability alerting",
          "Delete the SLO until telemetry returns",
        ],
        answerIndex: 2,
        explanation:
          "Missing data is not success. Unknown state must be visible and monitored independently from the failed pipeline.",
      },
      {
        kind: "tradeoff",
        question:
          "Which release policy best uses an error budget without creating bad incentives?",
        choices: [
          "Freeze every healthy team and allow exhausted teams to ship freely",
          "Punish each failure so teams report fewer incidents",
          "Replace incident response with a budget dashboard",
          "Set predictable canary and rollback actions, with reviewed exceptions and recovery ownership",
        ],
        answerIndex: 3,
        explanation:
          "A credible policy links current burn to release risk while preserving honest reporting and explicit exceptions for necessary changes.",
      },
      {
        kind: "security",
        question:
          "An engineer can silently edit the canonical SLI query after a bad week. Which control protects the budget?",
        choices: [
          "Reviewed, versioned policy changes with audit logs and independent drift monitoring",
          "Unrestricted dashboard access for every operator",
          "Alert suppression whenever the query changes",
          "Rewriting historical events without retaining the old definition",
        ],
        answerIndex: 0,
        explanation:
          "The measurement system is part of the security boundary; changes must be attributable and observable.",
      },
    ]),
  },
];

type BlogSeed = (typeof blogPostsData)[number];

function toBlog(seed: BlogSeed): BlogPost {
  const { security, ...post } = seed;
  return {
    ...post,
    steps: post.steps.map((entry, index): BlogStep => ({
      id: `${post.id}-step-${index + 1}`,
      title: entry.title,
      story: entry.story,
      engineer: entry.engineer,
      visualId: entry.visualId as BlogStep["visualId"],
      visualCaption: entry.visualCaption,
    })),
    securityTakeaways: security.map(
      (entry, index): SecurityPractice => ({
        id: `${post.id}-security-${index + 1}`,
        title: practiceTitle(entry.threat),
        threat: entry.threat,
        control: entry.control,
        verify: entry.verify,
      }),
    ),
    quiz: post.quiz,
  };
}

export const blogPosts: BlogPost[] = blogPostsData.map(toBlog);

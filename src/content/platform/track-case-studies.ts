import type {
  Lesson,
  LessonStep,
  QuizKind,
  QuizQuestion,
  SecurityPractice,
  Track,
} from "@/learning/platform/types";

const QUIZ_KINDS: QuizKind[] = ["scenario", "tradeoff", "security", "scenario"];

type RawQuestion = {
  question: string;
  choices: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
  explanation: string;
};

function quizFor(topicId: string, questions: RawQuestion[]): QuizQuestion[] {
  return questions.map((question, index) => ({
    id: `${topicId}-q${index + 1}`,
    topicId,
    prompt: question.question,
    choices: question.choices,
    answerIndex: question.answerIndex,
    explanation: question.explanation,
    kind: QUIZ_KINDS[index] ?? "scenario",
  }));
}

const visualCaption = (story: string): string =>
  story.match(/^.*?[.!?](?:\s|$)/)?.[0].trim() ?? story.slice(0, 160);

const practiceTitle = (threat: string): string => {
  const firstSentence = threat.split(/[.!?]/)[0].trim();
  return firstSentence.length <= 88
    ? firstSentence
    : `${firstSentence.slice(0, 85).replace(/\s+\S*$/, "")}…`;
};

const LESSON_MINUTES: Record<string, number> = {
  "url-shortener": 14,
  "chat-system": 16,
  "video-streaming": 15,
  "news-feed": 14,
  "ride-hailing": 15,
  "search-engine": 15,
  "metrics-alerting": 14,
  "lld-lru-cache": 14,
  "lld-rate-limiter": 14,
  "lld-pubsub": 14,
  "lld-parking-lot": 14,
  "lld-elevator": 14,
};

const STORY_HOOKS: Record<string, string> = {
  "url-shortener": "A stadium coat check reveals why redirect reads, durable labels, and private management operations need different doors.",
  "chat-system": "A city switchboard shows how durable message logs and live sockets can share a conversation without sharing failure modes.",
  "video-streaming": "A cinema's ticket office and projection network reveal the boundary between media authorization and byte delivery.",
  "news-feed": "A neighborhood newsletter meets a national columnist, exposing the tension between fast fan-out and celebrity write amplification.",
  "ride-hailing": "An airport taxi board turns moving locations into a live map while keeping trip decisions and privacy in separate records.",
  "search-engine": "A giant library separates receiving books, building its index, answering readers, and removing dangerous material.",
  "metrics-alerting": "A control room full of blinking lights learns that trustworthy paging begins with cardinality, state, and user-visible risk.",
  "lld-lru-cache": "A librarian's catalogue card and shelf order become the hash map and linked list behind constant-time LRU eviction.",
  "lld-rate-limiter": "A bakery token jar becomes a distributed ledger where identity, atomic spending, and outage policy matter as much as arithmetic.",
  "lld-pubsub": "A conference venue's rooms, waiting lists, and ushers reveal the routing, durability, and backpressure inside a broker.",
  "lld-parking-lot": "A garage attendant's rulebook turns compatible spots, idempotent tickets, and guarded gates into a testable domain model.",
  "lld-elevator": "A moving room with strict etiquette becomes a deterministic state machine where scheduling never outranks safety.",
};

const PREREQUISITES: Record<string, string[]> = {
  "url-shortener": ["single-server", "caching-eviction", "sql-modeling"],
  "chat-system": ["realtime", "queues-jobs", "scaling-databases"],
  "video-streaming": ["queues-jobs", "caching-eviction", "load-balancing"],
  "news-feed": ["caching-eviction", "scaling-databases", "realtime"],
  "ride-hailing": ["queues-jobs", "replication-consistency", "sql-modeling"],
  "search-engine": ["sql-modeling", "queues-jobs", "scaling-databases"],
  "metrics-alerting": ["observability-slos", "queues-jobs", "scaling-databases"],
  "lld-lru-cache": ["caching-eviction", "single-server"],
  "lld-rate-limiter": ["rate-limiting", "replication-consistency"],
  "lld-pubsub": ["queues-jobs", "realtime"],
  "lld-parking-lot": ["sql-modeling", "queues-jobs"],
  "lld-elevator": ["single-server", "queues-jobs"],
};

const STORY_EXTENSIONS: Record<string, string[]> = {
  "url-shortener": [
    "The counter therefore needs two capacity plans: one for busy check-in and another for the departure surge, because the same customers create pressure at different moments, and a design that serves only the first crowd will fail the second.",
    "A local sequence keeps each desk moving, while the mixed identity prevents two desks from colliding; neither speed nor uniqueness is allowed to quietly erase the other.",
    "The volunteer's answer is only useful while the directory entry remains current, so the design also needs a clear rule for expiry and for what happens when the volunteer steps away.",
    "The checkout sheet can lag or be rebuilt without rewriting the catalogue, but the catalogue itself must remain recoverable because every copy in circulation points back to it.",
    "That boundary keeps a public convenience from becoming a public inventory of private activity.",
  ],
  "chat-system": [
    "The building's wiring and its message archive are separate capacity problems, and both must survive the same rush.",
    "The receipt is small, but it carries the user's trust that a sent message will still exist after the next crash.",
    "Separating the routes also gives operators a precise place to add backpressure when a destination stops accepting deliveries, instead of letting one stalled listener consume the resources needed by every other conversation.",
    "A stable sequence is therefore not merely a sorting trick; it is the shared evidence that lets every participant reconstruct the same incomplete picture after failure.",
    "The result is a room whose door, guest list, and microphone each enforce a different part of the same privacy promise.",
  ],
  "video-streaming": [
    "The screen may show one play button, but the capacity plan must account for the entire stream of bytes behind that click.",
    "The receipt also tells the customer which stage failed, so support can explain a delay without asking the kitchen to start the same order again.",
    "The ticket and the projector cooperate, but they answer different questions.",
    "Empty shelves are measured in viewer experience, not just in origin logs, so warming decisions belong to regional playback telemetry.",
    "The audience sees one publication state, while the machinery behind it can be repaired without changing that promise.",
  ],
  "news-feed": [
    "The threshold is therefore both a capacity decision and a user-experience decision, because crossing it changes how fresh and how expensive every read becomes.",
    "A queue makes delay measurable, but only a freshness target tells the team when measurable delay has become unacceptable to the people waiting for the page.",
    "The merge must remain bounded so a quiet page does not become an expensive search.",
    "Privacy is cheapest before copying and most urgent at read time, so the design needs both prevention and a fast way to stop exposure during cleanup.",
    "The architecture earns trust by isolating the unusual case instead of asking every ordinary reader to pay for its cost, and by showing operators exactly which guarantee is being degraded.",
  ],
  "ride-hailing": [
    "The live map can be rebuilt quickly, while the durable record preserves why each journey was accepted, assigned, and completed.",
    "The neighborhood trick saves work, but exact distance and fresh availability still decide whether a candidate is genuinely useful.",
    "A deadline keeps the rider's wait bounded and gives the dispatcher evidence about supply instead of leaving an open-ended promise.",
    "The version number is what turns a polite workflow into a reliable one: every participant can detect when its view is too old to act.",
    "Freshness and precision become explicit policy choices, so an outage degrades the service honestly instead of exposing more data.",
  ],
  "search-engine": [
    "The two rooms can scale independently, but their lag must be measured together because an index nobody can afford to query is not useful capacity.",
    "The provenance label is what lets operators explain why a document entered the index and how to remove a bad version without guessing.",
    "That write tax is worthwhile only when the resulting postings make the important queries selective enough to pay for it.",
    "The query contract is therefore a correctness and capacity boundary, not merely a convenience for the parser, because every accepted clause consumes shared execution resources.",
    "Removal latency belongs beside indexing freshness, because a search engine that serves stale private content quickly is still failing its users.",
  ],
  "metrics-alerting": [
    "The label design is therefore a budget decision made long before the first storage bill arrives.",
    "Batching improves efficiency, but the queue's age reveals whether the resulting numbers still describe the present or merely a carefully recorded past, which is why ingestion lag belongs on the same dashboard as write volume.",
    "Compression buys room for history, but downsampling also changes what questions can be answered, so retention policy must say which details may safely disappear.",
    "The state machine is the difference between an alert and a notification someone can trust.",
    "Trust grows when every page has a clear owner, a meaningful user impact, and a rehearsed next action.",
  ],
  "lld-lru-cache": [
    "Those answers determine whether the cache remains predictable under memory pressure, expiration, and concurrent access.",
    "The two views must change together, or the catalogue and shelf begin telling different stories.",
    "The staircase makes popularity visible, while the ordered bucket decides fairly which equally popular item leaves first.",
    "An invariant test turns these invisible races into ordinary, reproducible failures before they reach a production cache.",
    "A cache earns its speed by remaining disposable, isolated, and honest about failure.",
  ],
  "lld-rate-limiter": [
    "The policy is the contract; the token arithmetic is only its smallest part.",
    "The shared transition must be cheap enough for the hot path and strict enough that a retry cannot spend the same allowance twice.",
    "Identity is the part of the limiter that cannot be delegated to the caller being limited.",
    "A fair limiter protects the service as a whole, not merely the average response time of whoever happens to arrive first.",
    "The degraded mode should be visible in telemetry, bounded in its overshoot, and easy to exit once the shared authority becomes healthy again, so temporary protection does not become permanent confusion.",
  ],
  "lld-pubsub": [
    "That delivery promise becomes the contract every client, retry loop, and operational dashboard must agree to honor, especially when messages arrive faster than subscribers can acknowledge them.",
    "The directory stays small and direct, while each waiting list remains responsible for its own clients, progress, and removal, so one busy room does not force the venue to search every corridor.",
    "The separation turns delivery into observable stages: accepted, retained, dispatched, acknowledged, or deliberately quarantined, and each stage gets its own retry, recovery, freshness, and ownership rules instead of inheriting one vague promise.",
    "The building stays responsive because no single listener is allowed to turn patience into an unlimited claim on shared memory.",
    "The namespace is the front door, but the audit trail, revocation path, and quota are what keep that boundary intact long after the doors have opened and traffic patterns change.",
  ],
  "lld-parking-lot": [
    "The shared vocabulary is what lets a gate, a payment service, and an operator reach the same conclusion about one physical space.",
    "The index narrows the search, while the atomic claim makes the final decision stick when two entrances arrive together and both attendants saw the same apparently empty space.",
    "The receipt is the bridge between unreliable hardware and a business promise that must remain true.",
    "A garage earns trust by admitting when it is full, recovering from half-finished transitions, and never pretending that concurrency has created another physical space; its tests should make those awkward moments ordinary and repeatable.",
    "The less the lot remembers, the smaller the consequence of any breach, while the audit trail preserves accountability without becoming a second unnecessary archive of sensitive movement.",
  ],
  "lld-elevator": [
    "The controller's job is to make the exciting behavior boring: every movement follows a guarded sequence that can be explained, tested, and safely interrupted, even when a sensor or network message arrives late.",
    "The algorithm should reduce waiting, never the machine's safety margin.",
    "The best assignment is the one that improves the next several trips, not only the next passenger's wait.",
    "A deterministic test is a fire drill conducted in software, where every awkward sequence can be repeated until the safe behavior is unsurprising and an operator can reconstruct exactly what happened.",
    "The remote layer schedules; the local layer remains the final authority on what motion is safe.",
  ],
};

const trackCaseStudiesData = {
  id: "case-studies",
  slug: "case-studies",
  title: "Real-World HLD and LLD Case Studies",
  description:
    "Twelve production-shaped design walkthroughs that move from capacity assumptions to concrete mechanisms, operational trade-offs, and defensive threat hardening.",
  accent: "amber",
  lessons: [
    {
      id: "url-shortener",
      title: "URL Shortener",
      trackId: "case-studies",
      summary:
        "Design a durable short-link service that handles redirect-heavy traffic without turning every click into a database write.",
      steps: [
        {
          title: "Size the redirect path before choosing boxes",
          story:
            "Imagine a coat-check counter at a stadium. Almost everyone arrives with one coat and leaves with one coat, but the room must still survive the minute when an entire section departs together. A URL shortener is the same: creating a link is occasional, while reading one may happen millions of times after a popular post goes viral. If you size only for the coat check-in desk, the exit hallway jams before the storage room is even full.",
          engineer:
            "Start with explicit assumptions rather than imaginary precision: suppose one hundred million new links per month and one thousand redirects per creation over a link's lifetime. That is roughly forty writes per second on average and tens of thousands of redirects per second, with bursts perhaps ten times higher. Store the original URL, short key, creator, expiry, and a few metadata fields; even at one kilobyte per record, a hundred million links is only hundreds of gigabytes before indexes and replicas. Redirects dominate, so the read path must be cacheable and independent of expensive uniqueness checks.",
          visualId: "traffic-flow",
        },
        {
          title: "Create short keys that stay unique at scale",
          story:
            "A hotel cannot hand every guest the same room key and hope the corridor sorts itself out. Short links need names that are easy to type but still distinct across many machines. Generating them with one global counter sounds tidy until that counter becomes the one receptionist everyone must ask. The useful trick is to let each desk issue keys from its own numbered sequence, then mix in a little identity so two desks never print the same label.",
          engineer:
            "Use a key space larger than the expected link population and encode an opaque identifier, for example base62 output from a distributed unique-ID generator. A hash of the full URL is attractive for deduplication, but truncation introduces collisions and the same URL under different campaigns may need different keys. Reserve a unique constraint on the short key and treat collisions as retryable creation failures. Avoid exposing creation timestamps or user identifiers in the key. A Bloom filter can cheaply reject probably-unused keys before a durable uniqueness write, but a false positive only means an extra check, never permission to create.",
          visualId: "bloom-hll",
        },
        {
          title: "Serve redirects from a bounded hot cache",
          story:
            "When a concert announces an encore, thousands of people ask for the same exit at once. Rechecking the building directory for every person is silly; a volunteer at the door can answer the popular question immediately. The short-link redirect service needs that volunteer too. A small set of viral links can produce a huge share of clicks, and the cache turns those clicks into memory reads while the database continues serving the long tail.",
          engineer:
            "Put a shared cache in front of the key-to-URL lookup, using an expiry that respects the link's own lifetime and a negative-cache entry for recently missing keys. A cache hit should return a redirect response without touching the relational primary. Because traffic is often extremely skewed, even a modest cache can offload most redirects, but measure hit ratio by key and by tenant rather than assuming popularity. On a miss, use request coalescing so a thundering herd does not stampede the database. If the cache is unavailable, fail over to the origin with bounded concurrency and shed low-value analytics rather than breaking redirects.",
          visualId: "cache-ring",
        },
        {
          title: "Separate durability, analytics, and deletion",
          story:
            "A library keeps a permanent catalogue, but it records borrowed books on a separate checkout sheet. Asking the catalogue to remember every footstep would slow every search and make the shelves impossibly messy. A shortener should persist the mapping once, then let asynchronous records explain where clicks came from. The redirect should not wait for a analytics pipeline to approve that someone followed a link.",
          engineer:
            "Persist mappings in a replicated store, partitioned by short key if the write volume eventually outgrows one primary. Publish click events to a queue after the redirect decision, with timestamp, coarse geography, referrer category, and user-agent class; keep raw identifiers out unless retention and consent require them. Workers can aggregate counts into a column store. Expiration may be lazy, scheduled, or driven by a retention job, but every path must stop resolving expired keys. Deleting a mapping should invalidate the cache and publish a tombstone so workers do not resurrect it. Backups need restore drills because a redirect database without recoverable mappings is just a very fast error page.",
          visualId: "queue-workers",
        },
        {
          title: "Harden links against enumeration and abuse",
          story:
            "A cloakroom ticket should identify one coat, not reveal the owner's name, phone number, or every other coat in the room. Short URLs are public labels, so attackers can try many of them if the namespace is small or responses leak private data. The service must be generous to ordinary sharing and stingy to automated harvesting. Think of the redirect endpoint as a door with a peephole: it shows the destination, not the security camera footage behind it.",
          engineer:
            "Use high-entropy opaque keys and rate-limit creation by authenticated identity, with bot resistance for anonymous campaigns. Validate destination schemes, block credentials embedded in URLs, and re-check reputation without making the synchronous redirect depend on a slow external service. Return uniform responses for missing, expired, and blocked links so enumeration cannot infer private state. Apply authorization to management endpoints because knowing a short key must not grant permission to edit it. Keep analytics aggregated, redact query secrets from logs, and verify controls with synthetic private links, rotated credentials, and a test that unauthorized update attempts leave the mapping unchanged.",
          visualId: "threat-defense",
        },
      ],
      security: [
        {
          threat:
            "An attacker guesses sequential short keys to enumerate private links or harvest destinations at scale.",
          control:
            "Use a large opaque base62 key space, uniform not-found responses, and creation limits tied to authenticated identity.",
          verify:
            "Generate a sample of private keys and confirm unauthorized lookup, edit, and analytics requests reveal no existence signal beyond the public redirect behavior.",
        },
        {
          threat:
            "A creator supplies a malicious destination scheme or a URL that leaks credentials into redirect logs.",
          control:
            "Allow only approved schemes, reject embedded user information, normalize the destination, and redact sensitive query parameters before logging.",
          verify:
            "Run a destination-validation test suite and inspect captured access logs for forbidden schemes and redacted query values.",
        },
        {
          threat:
            "A tenant changes or deletes another tenant's short link after learning its public key.",
          control:
            "Authorize every management operation against the authenticated tenant and record an immutable audit event for mutations.",
          verify:
            "Attempt cross-tenant update and deletion in staging; expect denial and confirm both the mapping and audit log remain intact.",
        },
      ],
      quiz: quizFor("url-shortener", [
        {
          question: "Which workload should dominate capacity planning for a typical URL shortener?",
          choices: [
            "Link creation writes",
            "Redirect reads",
            "Analytics dashboard queries",
            "Backup restores",
          ],
          answerIndex: 1,
          explanation:
            "Each link may be redirected many times, so reads usually exceed writes by orders of magnitude and should drive the hot-path design.",
        },
        {
          question: "Why keep a unique database constraint after using distributed ID generation?",
          choices: [
            "To make keys sequential",
            "To guarantee uniqueness despite generator or encoding mistakes",
            "To avoid caching redirects",
            "To prevent analytics processing",
          ],
          answerIndex: 1,
          explanation:
            "A durable uniqueness constraint is the final correctness boundary; distributed generators reduce collisions but do not replace enforcement.",
        },
        {
          question: "What is the safest role of a Bloom filter in short-key creation?",
          choices: [
            "Prove a key is unused",
            "Authorize the creator",
            "Cheaply reject probably-used keys before the authoritative check",
            "Store the original URL",
          ],
          answerIndex: 2,
          explanation:
            "Bloom filters have false positives but no false negatives for inserted keys, so they can avoid work but cannot prove availability.",
        },
        {
          question: "Why should click analytics run asynchronously?",
          choices: [
            "Redirects must remain fast and available even when analytics lags",
            "Analytics requires weaker authorization",
            "Caches cannot store counts",
            "Synchronous workers create shorter URLs",
          ],
          answerIndex: 0,
          explanation:
            "Analytics is important but should not block or fail the redirect; a queue decouples its throughput and outage blast radius.",
        },
      ]),
    },
    {
      id: "chat-system",
      title: "Chat at Discord Scale",
      trackId: "case-studies",
      summary:
        "Build a multi-channel messaging system with persistent connections, durable history, ordered fan-out, and safe membership boundaries.",
      steps: [
        {
          title: "Separate connection load from message volume",
          story:
            "A switchboard operator can keep many lines open while speaking on only a few at once. Chat traffic looks similar: hundreds of thousands of clients may maintain sockets, but the number of messages crossing the building each second is a different measurement. Counting only messages makes the socket tier disappear from the plan; counting only sockets makes the storage tier look far too small. A city-sized chat service needs both counts on the whiteboard.",
          engineer:
            "Assume, for example, a million concurrent connections, ten messages per active user per day, and fan-out to a typical channel of one hundred online members. Connection memory and file descriptors shape gateway sizing, while channel membership and message size shape persistence and delivery. A single socket server can multiplex many connections with an event loop, but heartbeats, TLS state, and backpressure still consume resources. Partition channels across gateway nodes and keep a directory mapping channel to owner. Capacity reviews should test connection churn separately from message bursts because reconnecting a million clients can create a second traffic spike.",
          visualId: "realtime-channels",
        },
        {
          title: "Persist messages before acknowledging them",
          story:
            "A post office does not promise delivery because a letter entered the sorting room; it promises after the letter is recorded and assigned a route. In chat, the little green check should mean the message has a durable home. If the server acknowledges first and crashes before writing, a user sees a sent message that disappears for everyone else. Trust is much harder to repair than the lost row is to retransmit.",
          engineer:
            "Write each message to a durable log keyed by channel and assign a per-channel sequence number. The acknowledgement can follow a replicated commit, not merely an in-memory enqueue. Partition by channel so all messages for one conversation retain order without forcing unrelated channels through one writer. Store message bodies in a system optimized for append and range reads, with indexes for author, mentions, and moderation state added only where query patterns justify their write cost. Client-generated message IDs make retries idempotent, and sequence gaps let clients detect missing events instead of silently displaying an incomplete history.",
          visualId: "kafka-partitions",
        },
        {
          title: "Fan out delivery without blocking persistence",
          story:
            "A newspaper prints one edition and then distributes copies through many routes. It should not wait for every reader to finish reading before printing the next edition. Chat persistence is the printing press; delivery is the distribution network. Once a message is safely stored, separate workers can push it to gateways, update unread counts, and run moderation. Each route can slow down without stopping the press.",
          engineer:
            "Consume the durable channel log with delivery workers that maintain subscription state for each online gateway. Send only to channels with subscribers, and coalesce presence changes rather than broadcasting every heartbeat. Per-connection outbound buffers need high and low water marks: when a slow client fills its buffer, disconnect or resync instead of consuming unbounded memory. Offline clients fetch history by sequence cursor when they reconnect. Delivery is at least once at the transport boundary, so consumers deduplicate on message ID. Workers can scale by partition count, but hot celebrity channels require careful placement because a single partition is an ordering boundary, not an unlimited throughput promise.",
          visualId: "queue-workers",
        },
        {
          title: "Make ordering and recovery explicit",
          story:
            "Two people talking over walkie-talkies can both press transmit at once, and the radio does not magically decide whose thought came first. Chat has the same problem: messages from different users may arrive at different times, while messages from one client should not leapfrog their own earlier send. Users need a simple, stable order, not the impossible dream of recreating a perfectly synchronized global conversation.",
          engineer:
            "Use channel sequence numbers assigned by the channel writer as the canonical order. Clients may show optimistic pending messages, then reconcile them when the server returns the durable ID. Typing indicators and presence are ephemeral and may be dropped; message content is not. On gateway failure, clients reconnect with their last acknowledged sequence and fetch any gap from history. Replicas must preserve sequence or use a consensus-backed writer before advertising failover. Avoid global ordering across channels because it adds coordination and latency without improving the user experience. A bounded replay window and pagination keep recovery cheap even when a client was offline for days.",
          visualId: "replication",
        },
        {
          title: "Protect membership, content, and metadata",
          story:
            "A private club needs a guest list at the door, not merely a locked front gate. If the bouncer checks only that someone has an account, strangers can still walk into a members-only room. Chat systems have the same layered boundary: the connection is authenticated, the channel has its own authorization policy, and the message delivery path must enforce both. The bouncer should also avoid announcing the names of every private room in the building.",
          engineer:
            "Authenticate the socket once, then authorize channel subscribe, history fetch, and message send against current membership on every relevant operation. Revoked members must be removed from live subscriptions, not only blocked on the next page load. Use capability-free random channel IDs, but do not treat them as authorization. Protect against message enumeration with uniform errors and bounded history pagination. Scan attachments asynchronously, apply moderation before wide fan-out where possible, and redact tokens from message logs. Verify with membership changes during active connections, cross-channel replay attempts, and a test that deleted messages are removed from search and caches according to retention policy.",
          visualId: "threat-defense",
        },
      ],
      security: [
        {
          threat:
            "A user guesses channel identifiers and enumerates private message history.",
          control:
            "Authorize history and subscription requests against current channel membership and return uniform denial responses.",
          verify:
            "Try history and live-subscribe requests from an authenticated non-member and confirm no channel metadata or message content leaks.",
        },
        {
          threat:
            "A revoked member continues receiving live messages through an old socket.",
          control:
            "Maintain a revocation-aware subscription registry and force subscription removal plus socket resynchronization when membership changes.",
          verify:
            "Revoke membership during an active session and assert that subsequent messages are neither delivered nor returned by catch-up pagination.",
        },
        {
          threat:
            "Malicious attachments or oversized messages exhaust worker and client resources.",
          control:
            "Enforce byte and rate limits, quarantine attachments for asynchronous scanning, and bound per-connection delivery buffers.",
          verify:
            "Exercise size-limit and slow-consumer tests while measuring memory, disconnect behavior, and the health of unrelated channels.",
        },
      ],
      quiz: quizFor("chat-system", [
        {
          question: "Why should channel ownership and channel data be partitioned together?",
          choices: [
            "To eliminate all replicas",
            "To preserve per-channel ordering and scale independent channels",
            "To make every message globally ordered",
            "To avoid authentication",
          ],
          answerIndex: 1,
          explanation:
            "Channel-based partitioning provides a natural ordering boundary and spreads load without coordinating unrelated conversations.",
        },
        {
          question: "What should a sent acknowledgement guarantee?",
          choices: [
            "Every online recipient has displayed the message",
            "The gateway has buffered it in memory",
            "The message is durably recorded and idempotently identifiable",
            "Moderation has approved every attachment",
          ],
          answerIndex: 2,
          explanation:
            "The durable commit is the trust boundary; recipient display and moderation are separate asynchronous states.",
        },
        {
          question: "How should a reconnecting client recover efficiently?",
          choices: [
            "Reload the entire channel history",
            "Request only messages after its last acknowledged sequence",
            "Open a new channel with a new identifier",
            "Wait for a full server restart",
          ],
          answerIndex: 1,
          explanation:
            "A sequence cursor turns recovery into a bounded gap fetch instead of an expensive full replay.",
        },
        {
          question: "Why are typing indicators different from messages?",
          choices: [
            "They require stronger encryption",
            "They may be dropped as ephemeral state without breaking conversation history",
            "They must be globally ordered",
            "They should be written to the primary database synchronously",
          ],
          answerIndex: 1,
          explanation:
            "Typing and presence are disposable hints; durable message content requires persistence, ordering, and replay guarantees.",
        },
      ]),
    },
    {
      id: "video-streaming",
      title: "Video Streaming",
      trackId: "case-studies",
      summary:
        "Design an upload, transcode, package, and playback pipeline that keeps popular video bytes close to viewers without weakening access control.",
      steps: [
        {
          title: "Estimate bytes, not just requests",
          story:
            "A movie theater does not measure success by counting the posters on the wall; it measures how many people watch how many minutes. Streaming capacity begins with viewing hours and bitrate. A million short phone clips and a million two-hour films can produce the same request count while differing by orders of magnitude in network traffic. The projection booth must be sized for the film, not the ticket stub.",
          engineer:
            "Assume a catalog of one hundred thousand hours of video, a viewing mix concentrated in popular titles, and an average adaptive bitrate of a few megabits per second. One million concurrent viewers at two megabits per second imply roughly two hundred fifty gigabytes per second of egress before protocol overhead, so origin servers cannot directly serve the audience. Storage depends on renditions: transcoding one source into several bitrates can multiply bytes by several times. Estimate cache hit ratio and regional viewer distribution before choosing CDN commitments, and treat peak events separately from monthly averages because sports and launches create geographically concentrated bursts.",
          visualId: "traffic-flow",
        },
        {
          title: "Turn uploads into asynchronous media jobs",
          story:
            "A bakery does not ask the customer to wait beside the oven while every loaf is mixed, proved, and baked. The customer hands over ingredients, receives a receipt, and returns when the product is ready. Video upload works the same way: accepting the file is quick, but scanning, transcoding, captioning, and packaging can take minutes. A queue keeps the counter moving while the kitchen handles each order at a sustainable pace.",
          engineer:
            "Upload large files directly to object storage using short-lived signed upload URLs, then enqueue a media job containing the object key and expected checksum. Workers validate codecs, scan content, extract metadata, generate thumbnails and captions, and transcode into a bitrate ladder. Make each stage idempotent and record attempt state so retries do not create duplicate publications. Separate queues for quick previews and expensive high-resolution renditions prevent a backlog of small uploads from starving long films. The source object should be immutable; a replacement upload gets a new object version so an in-flight job cannot read changing bytes.",
          visualId: "queue-workers",
        },
        {
          title: "Package adaptive streams and authorize playback",
          story:
            "A cinema gives each viewer a ticket tied to a seat and a time, not a master key to the projector room. Adaptive video needs many small segments, and granting open access to the manifest often grants access to the whole ladder. A sound design signs the playback request at the edge and lets authorized viewers fetch only the media they are entitled to watch. The projector still runs at full speed; the ticket office simply becomes part of the projection path.",
          engineer:
            "Produce HLS or DASH manifests that reference short media segments. Use signed playback tokens or cookies scoped to the asset, permitted resource path, and expiry; the CDN verifies signatures before serving from cache. Keep private manifests off public object storage, and rotate signing keys with overlapping validity during rollout. Segment URLs should be stable and cacheable across viewers when the entitlement is the same, avoiding a cache key per token. Measure startup time, rebuffer ratio, and bitrate distribution because a technically correct pipeline can still feel broken. Signed upload URLs must remain separate from playback authorization so an uploader does not automatically gain publishing rights.",
          visualId: "realtime-channels",
        },
        {
          title: "Use the CDN as a capacity system",
          story:
            "A chain of local warehouses stocks popular goods close to customers. The central factory still matters, but it no longer ships every parcel across the country. A CDN is that warehouse network for video. The hardest question is not whether caching works, but whether each region has enough of the right segments before a crowd presses play. A cold cache during a global launch is an empty shelf with an excellent supply chain behind it.",
          engineer:
            "Set cache keys around immutable segment paths, normalized manifests, and only entitlement-relevant variation. Pre-warm popular new releases in expected viewer regions, and use origin shielding so a regional miss does not become a global origin stampede. Configure tiered expiry: long-lived immutable segments, shorter-lived manifests, and explicit invalidation for rights changes. Track byte hit ratio, origin egress, and regional rebuffering rather than relying on request hit ratio alone. Protect origin credentials with least-privilege CDN access, and verify that a revoked entitlement stops new playback within the token validity window without making every segment request depend on a slow entitlement database.",
          visualId: "cache-ring",
        },
        {
          title: "Operate metadata, recommendations, and failure recovery",
          story:
            "The projection booth is only half the theater; the other half is the catalog that tells viewers what exists and whether it is ready. A player can show a green thumbnail while the first segment is still missing, which feels worse than an honest processing state. Streaming reliability therefore joins media state to user-facing metadata, with clear transitions from uploaded to publishable to unavailable. Operators need to see the whole journey, not just the CDN's green dashboard.",
          engineer:
            "Keep metadata in a replicated database keyed by video ID, with processing state, owner, visibility, rendition readiness, and publication version. Update metadata atomically only after required renditions and manifests are durable. Index search and recommendations asynchronously so publication is not coupled to an analytics pipeline. Monitor job age, queue depth, transcode failure rate, manifest errors, startup latency, and CDN origin load with actionable alerts. If a rendition is corrupt, roll back to the last published manifest version and serve a lower bitrate while reprocessing. Encrypt source and private segments, audit administrative changes, and verify restore procedures for both the media objects and the metadata that makes them discoverable.",
          visualId: "deploy-strategies",
        },
      ],
      security: [
        {
          threat:
            "A viewer shares a public manifest URL and bypasses paid or private access checks.",
          control:
            "Protect manifests and segments with scoped, expiring playback signatures verified at the CDN edge.",
          verify:
            "Attempt unsigned, expired, wrong-asset, and wrong-region playback requests and confirm each is denied without revealing media bytes.",
        },
        {
          threat:
            "An uploader writes directly into a published media path or overwrites bytes used by an active transcode.",
          control:
            "Use isolated immutable upload prefixes, separate upload and publish permissions, and publish only validated object versions.",
          verify:
            "Try writing to the public prefix and mutating an in-flight source; expect denial and confirm the published rendition remains unchanged.",
        },
        {
          threat:
            "A malicious media file crashes workers or consumes excessive CPU and disk.",
          control:
            "Enforce file-size and duration limits, sandbox decoders, scan content, and run transcoding with resource quotas and timeouts.",
          verify:
            "Process malformed media fixtures in an isolated worker and confirm failures are bounded without affecting unrelated jobs.",
        },
      ],
      quiz: quizFor("video-streaming", [
        {
          question: "Which estimate most directly drives streaming egress capacity?",
          choices: [
            "Catalog item count alone",
            "Concurrent viewers multiplied by average bitrate",
            "Thumbnail dimensions",
            "Number of signing keys",
          ],
          answerIndex: 1,
          explanation:
            "Viewing concurrency and bitrate determine bytes per second; request count misses the dominant bandwidth cost.",
        },
        {
          question: "Why transcode asynchronously through a queue?",
          choices: [
            "Transcoding is cheap and synchronous",
            "Uploads must not wait for CPU-heavy media processing",
            "Queues remove the need for idempotency",
            "Every rendition must share one worker",
          ],
          answerIndex: 1,
          explanation:
            "A queue decouples fast upload acceptance from slow, resource-intensive processing and provides natural backpressure.",
        },
        {
          question: "What is the main reason to use signed playback URLs?",
          choices: [
            "To increase segment size",
            "To authorize private media at the edge without open object access",
            "To eliminate transcoding",
            "To make manifests mutable",
          ],
          answerIndex: 1,
          explanation:
            "Scoped signatures let the CDN enforce entitlement while retaining cacheable media delivery.",
        },
        {
          question: "Which metric best reveals that a CDN looks healthy but users are suffering?",
          choices: [
            "Number of manifests generated",
            "Regional rebuffer ratio and startup latency",
            "Upload queue size only",
            "Signing-key count",
          ],
          answerIndex: 1,
          explanation:
            "User-perceived playback metrics connect cache and origin behavior to the actual viewing experience.",
        },
      ]),
    },
    {
      id: "news-feed",
      title: "News Feed Fan-out",
      trackId: "case-studies",
      summary:
        "Build a fresh, private feed using hybrid fan-out, ranked timelines, and explicit handling for celebrity publishers.",
      steps: [
        {
          title: "Choose a fan-out model from social shape",
          story:
            "A neighborhood newsletter can hand a copy to every house because the editor has only a few hundred readers. A national newspaper cannot personally deliver a copy to everyone who follows a famous columnist; it prints once and lets readers pull the page. Social feeds contain both neighborhoods and celebrities. Picking one delivery strategy for both either wastes enormous storage or makes ordinary posts feel slow. The architecture needs a decision about who follows whom.",
          engineer:
            "Estimate average followers per author, daily posts, active readers, and feed-read frequency. Assume ordinary accounts have tens to hundreds of followers while a small number of creators have millions. Write-time fan-out copies a post into follower timeline lists and gives fast reads, but multiplies storage by follower count. Read-time fan-out merges followed authors at request time and saves write amplification, but makes freshness and latency depend on fan-in size. A hybrid approach writes for ordinary accounts and merges celebrity posts at read time, with the threshold tuned from measured distributions rather than copied from another product.",
          visualId: "traffic-flow",
        },
        {
          title: "Build fan-out workers that can catch up",
          story:
            "A restaurant kitchen prepares ingredients once, then passes them to several stations for plating. It does not cook a separate meal for every waiter. Feed fan-out should similarly create one durable post, then distribute references to follower timelines through workers. If the plating station falls behind, the kitchen keeps a clear queue of unfinished plates instead of losing orders or slowing every new dish to the speed of the weakest station.",
          engineer:
            "Persist the post, then publish an event keyed by author to a durable queue. Fan-out workers read the follower list in bounded batches, insert lightweight timeline entries keyed by recipient and timestamp, and checkpoint progress. Make inserts idempotent because queue delivery can repeat. Partition work by recipient hash or author shard depending on the dominant bottleneck, and cap batch sizes so one celebrity does not monopolize a worker. Timeline storage should evict old entries by policy while the canonical post remains durable. Measure fan-out lag, queue depth, duplicate rate, and per-recipient write rate; a falling-behind worker turns a fresh feed into a stale feed even when reads remain fast.",
          visualId: "queue-workers",
        },
        {
          title: "Read hybrid timelines with predictable ranking",
          story:
            "A personal bulletin board contains pinned notes from close friends and a few linked pages from famous publishers. You do not need a physical copy of every famous page on your wall; you can fetch those pages when you look. A hybrid feed works like that board. Most notes are pre-placed for speed, while a bounded set of high-fan-out sources is merged at reading time. The challenge is making the mixture feel like one coherent page rather than two systems arguing.",
          engineer:
            "Store precomputed entries with post ID, author, creation time, and minimal ranking features in a recipient-partitioned timeline. At read time, fetch a candidate window from that timeline and merge candidates from followed celebrity authors using their recent-post indexes. Deduplicate by post ID, apply visibility rules before ranking, and paginate with a stable cursor. Ranking should be bounded in candidate count so a long session cannot trigger unlimited work. Cache computed pages briefly keyed by viewer cohort and feed cursor, but never cache a private feed under a shared key without enforcing authorization. Keep freshness visible in telemetry and bound celebrity merge latency so one slow source cannot hold the whole response.",
          visualId: "sharding",
        },
        {
          title: "Enforce privacy before fan-out and after deletion",
          story:
            "A clerk should not copy a private letter into a hundred public mailboxes and then hope nobody reads it. Once a feed entry is distributed, a privacy mistake becomes a cleanup problem across many stores. Authorization belongs at the source and at every read, while deletion needs a deliberate propagation path. The safest envelope is the one that never leaves the sender's desk when it was marked private.",
          engineer:
            "Evaluate audience, blocks, muted keywords, and author visibility before writing timeline entries. Store a policy version with cached feed pages and invalidate them when a relevant relationship or visibility policy changes. Deletion should remove the canonical post, fan out tombstones, expire cached pages, and eventually remove search and recommendation copies. For urgent privacy incidents, a synchronous deny-list checked at read time can stop exposure before physical cleanup finishes. Avoid treating possession of a post ID as permission. Verify with cross-account reads, follower removal during fan-out, blocked-author searches, and deleted-post replay through every timeline and cache layer.",
          visualId: "threat-defense",
        },
        {
          title: "Plan for hot keys, failures, and growth",
          story:
            "A relay race fails if every runner must wait for the slowest person's watch. Feed systems fail when one enormous account, one stale cache, or one lagging worker forces unrelated readers to wait. Good feed design isolates the celebrity, contains the cache outage, and makes lag visible. It is better to show a slightly older private feed than to mix in someone else's post while trying to look fresh.",
          engineer:
            "Shard timelines by recipient so popular authors do not create a single storage partition. Rate-limit extreme publishers and break very large fan-outs into resumable batches. Apply backpressure when the fan-out queue grows, prioritizing recent posts and time-sensitive events. Degrade gracefully to on-demand merging if timeline writes are unavailable, while preserving authorization. Track p95 feed latency, fan-out age, timeline write failures, cache hit ratio, and privacy-policy invalidation lag. Load tests should include a celebrity post, a broad reconnect event, and cache loss. Capacity planning should state assumptions about follower skew, active readers, and acceptable freshness, then revisit them when product behavior changes.",
          visualId: "consistent-hash",
        },
      ],
      security: [
        {
          threat:
            "A private post is copied into follower timelines before audience authorization is complete.",
          control:
            "Authorize the audience and blocks before fan-out, stamp entries with a policy version, and re-check visibility on read.",
          verify:
            "Change a post from public to private after fan-out and confirm existing timeline entries and cached pages stop returning it.",
        },
        {
          threat:
            "A guessed post identifier exposes content or author metadata outside the intended audience.",
          control:
            "Use opaque identifiers as a convenience, not authorization, and enforce object-level access on every read and mutation.",
          verify:
            "Request guessed identifiers from unrelated accounts and assert that content, counts, and existence signals do not leak.",
        },
        {
          threat:
            "Deleted or blocked content survives in search, recommendation, or timeline caches.",
          control:
            "Propagate tombstones and policy invalidations across derived stores with an urgent read-time deny path for sensitive removals.",
          verify:
            "Delete and block representative content, then query every derived surface after cache expiry and confirm it remains unavailable.",
        },
      ],
      quiz: quizFor("news-feed", [
        {
          question: "Why use hybrid fan-out?",
          choices: [
            "Every author has exactly the same follower count",
            "It avoids celebrity write amplification while keeping ordinary feeds fast",
            "It eliminates the need for authorization",
            "It guarantees global post order",
          ],
          answerIndex: 1,
          explanation:
            "Hybrid fan-out precomputes for normal accounts and merges high-fan-out authors at read time.",
        },
        {
          question: "What must happen before a fan-out worker inserts timeline entries?",
          choices: [
            "Audience and block policies should be evaluated",
            "Every follower must be online",
            "The cache must be disabled",
            "The post must become mutable",
          ],
          answerIndex: 0,
          explanation:
            "Privacy decisions must precede distribution so private content is not copied into unauthorized timelines.",
        },
        {
          question: "Why make timeline inserts idempotent?",
          choices: [
            "Queues always deliver exactly once",
            "Workers never restart",
            "Repeated delivery must not create duplicate feed entries",
            "Idempotency removes the need for durable posts",
          ],
          answerIndex: 2,
          explanation:
            "At-least-once delivery can repeat work, so recipient-and-post uniqueness or upsert semantics prevent duplicates.",
        },
        {
          question: "What is a safe degradation when fan-out workers lag?",
          choices: [
            "Skip all authorization checks",
            "Merge recent followed posts on demand within a bounded candidate set",
            "Return another user's cached feed",
            "Wait indefinitely for every worker",
          ],
          answerIndex: 1,
          explanation:
            "Bounded on-demand merging preserves freshness and privacy while avoiding an unbounded or cross-tenant fallback.",
        },
      ]),
    },
    {
      id: "ride-hailing",
      title: "Ride-Hailing Geospatial",
      trackId: "case-studies",
      summary:
        "Design location updates, nearby-driver search, matching, and trip state transitions with explicit privacy and consistency boundaries.",
      steps: [
        {
          title: "Treat location as a high-churn telemetry stream",
          story:
            "A busy airport display updates departure boards every few seconds, but it does not rewrite the airport's master map for each plane movement. Driver locations are the same kind of fast-changing signal: valuable for matching, dangerous as a hot database row. If every heartbeat updates the permanent trip record, the database spends its life tracking cars instead of recording decisions. The architecture needs a live map layer and a calm system of record.",
          engineer:
            "Assume tens of thousands of active drivers in a metro, location updates every few seconds, and rider requests arriving in bursts around events. That is thousands of updates per second per large city, with much higher write counts than trip creations. Push updates through a regional ingest service into an in-memory geospatial index, then retain a bounded recent trail for matching and dispute resolution. Store only necessary coarse history according to retention policy. Partition by city or geohash tile so local load does not contend globally, and measure update lag separately from request latency because a matching decision based on a minute-old location can be technically successful and operationally wrong.",
          visualId: "realtime-channels",
        },
        {
          title: "Search nearby drivers with spatial indexes",
          story:
            "Finding a nearby taxi should not mean checking every taxi in the country. A city map divides the area into neighborhoods, and the dispatcher checks adjacent neighborhoods around the rider. If the radius crosses a neighborhood border, the dispatcher peeks over the fence. Geospatial indexing is that disciplined local search: reduce the candidates first, then apply distance and availability rules. The naive version asks every driver, which is both slow and expensive.",
          engineer:
            "Use geohash, H3, or a quadtree to bucket drivers into cells, then query the cells intersecting the search radius. Maintain a per-cell set or sorted index of available drivers and apply exact distance only to candidates. Choose cell size from driver density and typical pickup radius; overly large cells create hot partitions, while tiny cells multiply neighbor lookups. Keep availability changes separate from raw location updates so a driver's cell membership changes are bounded. Use a local read model for matching with replication and failover by region. A consistent-hash assignment of city shards can reduce remapping, but the spatial index must still detect cell crossings.",
          visualId: "consistent-hash",
        },
        {
          title: "Match fairly with bounded candidate work",
          story:
            "A dispatcher assigning airport taxis should not stare at the entire queue while the passenger waits. The dispatcher checks a small set of eligible nearby drivers, applies fare and vehicle rules, and makes an offer with a deadline. If nobody accepts, the search expands carefully. Matching is not simply drawing the shortest line; it is a race between rider wait time, driver travel, fairness, and the danger of sending duplicate offers to everyone.",
          engineer:
            "Fetch a bounded candidate set from the spatial index, filter by service eligibility, and score using expected pickup time, fairness, cancellation history, and destination constraints where appropriate. Reserve a driver atomically for a short offer lease so concurrent requests cannot claim the same car. Send offers with expiries and retry the next candidate on rejection or timeout. Use idempotency keys on request creation and deterministic offer IDs so network retries do not create multiple trips. Cap expansion and total matching time; if supply is scarce, return an honest unavailable or queued state rather than holding the rider request indefinitely. Record why a match failed so operators can distinguish no drivers from index lag.",
          visualId: "queue-workers",
        },
        {
          title: "Model trip transitions as a guarded state machine",
          story:
            "A boarding pass moves through printed, checked, scanned, and boarded states; it cannot jump directly from printed to landed. A ride has equally meaningful transitions. Treating the trip as one freely editable database row invites double assignment, refund confusion, and impossible states. The state machine is the set of doors through which a trip may move, with a named guard on each door and a receipt for every transition.",
          engineer:
            "Model requested, matched, accepted, arriving, in-progress, completed, and cancelled states with allowed transitions and versioned conditional writes. A driver accepts an offer only if its lease and trip version still match. Payment authorization and trip completion may span services, so use a saga with compensating actions rather than pretending one distributed transaction exists. Emit durable events through an outbox so the state change and notification intent commit together. Keep the relational trip record authoritative while projections update rider and driver views. Retries must be idempotent, and reconciliation jobs should detect trips stuck in a state beyond their timeout.",
          visualId: "saga-outbox",
        },
        {
          title: "Minimize location exposure and survive region failure",
          story:
            "A taxi dispatcher needs to know which car is close, not where that driver parked at home last night. Precision is useful during a trip and unnecessary after it ends. A privacy-conscious design shares the minimum location with the minimum audience for the minimum time. It also needs a backup map: if the regional location service fails, the dispatcher should degrade to an older nearby result, not reveal exact history or strand every rider.",
          engineer:
            "Authorize driver location reads by trip relationship and purpose, encrypt transport and storage, and expire precise trails quickly. Return coarse locations outside active matching and suppress driver home-cluster inference from analytics. Rate-limit location and trip lookups, redact logs, and audit administrative access. Replicate metadata across regions but keep live location regional to contain latency and cost. During failure, use stale-but-bounded locations with an explicit confidence marker and disable new assignments if freshness exceeds policy. Test failover with a complete regional index outage, verify that old trails expire, and ensure support tools cannot query arbitrary driver history without approval.",
          visualId: "threat-defense",
        },
      ],
      security: [
        {
          threat:
            "A rider or unrelated account retrieves a driver's precise historical movements.",
          control:
            "Authorize location access by active trip relationship, minimize precision outside matching, and enforce short retention windows.",
          verify:
            "Query historical and live endpoints as unrelated accounts and after trip completion; confirm precision and retention limits are enforced.",
        },
        {
          threat:
            "Concurrent requests assign the same driver or issue duplicate offers.",
          control:
            "Use atomic offer leases, conditional trip-version updates, and idempotency keys on rider request and driver acceptance operations.",
          verify:
            "Run competing requests for one driver and confirm exactly one active assignment while retries return the same logical result.",
        },
        {
          threat:
            "A fabricated location update moves a driver into restricted cells or corrupts matching.",
          control:
            "Authenticate device sessions, validate timestamp and implausible movement, rate-limit updates, and separate ingest from trip authority.",
          verify:
            "Replay stale and out-of-order updates in staging and confirm they are quarantined without changing active assignments.",
        },
      ],
      quiz: quizFor("ride-hailing", [
        {
          question: "Why keep live driver locations out of the main trip record?",
          choices: [
            "Location changes are low volume",
            "High-churn telemetry would create hot writes and obscure durable trip state",
            "The trip record cannot use indexes",
            "Drivers do not need location",
          ],
          answerIndex: 1,
          explanation:
            "A dedicated live location read model absorbs high update rates while the trip store records slower state transitions.",
        },
        {
          question: "What is the purpose of a short offer lease?",
          choices: [
            "To permanently reserve every nearby driver",
            "To prevent concurrent requests from accepting the same assignment",
            "To remove the need for trip state",
            "To share driver history publicly",
          ],
          answerIndex: 1,
          explanation:
            "An expiring atomic lease reserves a driver briefly without permanently excluding them from other offers.",
        },
        {
          question: "Why use a saga for trip completion and payment?",
          choices: [
            "A saga guarantees one global database transaction",
            "It coordinates failures with explicit compensating actions across services",
            "It removes authorization requirements",
            "It makes all services strongly consistent by default",
          ],
          answerIndex: 1,
          explanation:
            "A saga models a multi-service workflow with recoverable steps and compensations instead of assuming distributed atomicity.",
        },
        {
          question: "What should happen when live location data exceeds the freshness limit during an outage?",
          choices: [
            "Assign silently using arbitrarily old positions",
            "Return exact historical tracks to riders",
            "Disable or clearly bound assignments until freshness recovers",
            "Drop all trip metadata",
          ],
          answerIndex: 2,
          explanation:
            "Stale location can be useful with confidence limits, but new assignments should not pretend it is current.",
        },
      ]),
    },
    {
      id: "search-engine",
      title: "Search Engine",
      trackId: "case-studies",
      summary:
        "Design crawling, inverted indexing, ranking, query safety, and operational observability for a large document search service.",
      steps: [
        {
          title: "Plan for corpus growth and query skew",
          story:
            "A giant library needs two very different rooms: one for receiving new books and one for answering readers. If every new delivery interrupts every search, the catalogue never settles. A search engine likewise separates ingestion from serving. Capacity planning must account for both the number of documents and the way popular queries repeat. Ten thousand unique searches and ten thousand copies of one query are not the same workload for a ranking service.",
          engineer:
            "Assume a corpus of hundreds of millions of documents, a daily change fraction from small updates to substantial recrawls, and query traffic with a heavy head of repeated terms. Storage includes raw documents, postings, positions, and ranking features; posting lists may exceed the original text. Estimate crawl bandwidth, parser throughput, index build cost, and replica count independently. Query QPS should be segmented by cheap term lookups and expensive multi-clause or aggregating queries. Use order-of-magnitude arithmetic to decide whether one search cluster is plausible, then state peak-to-average ratios and the acceptable indexing lag rather than inventing exact machine counts.",
          visualId: "traffic-flow",
        },
        {
          title: "Crawl and parse without losing source identity",
          story:
            "A museum accepts a donated box only after checking that it belongs in the collection. Search ingestion needs the same discipline: fetch a document, identify its canonical source, parse it safely, and record the version that was actually read. If the crawler silently replaces the catalogue entry with a login page or malformed response, the index becomes confidently wrong. Every document deserves a provenance label, not just a URL.",
          engineer:
            "Schedule URLs by freshness, importance, and prior failure, with per-host politeness and bounded concurrency. Fetch into a staging object store carrying final URL, response metadata, checksum, and fetch time. Parse in sandboxed workers with strict size and time limits, extract canonical links and structured metadata, and discard documents that fail validation. Deduplicate by content hash and canonical URL while preserving redirect lineage. Handle retries with conditional updates so a slow old fetch cannot overwrite a newer version. Parser and crawler metrics should distinguish unavailable, changed, duplicate, and rejected content because those categories require different operational responses.",
          visualId: "queue-workers",
        },
        {
          title: "Build an inverted index for selective retrieval",
          story:
            "The index at the back of a textbook lists the pages containing a word so you do not read every page again. An inverted index does this at industrial scale. It maps terms to postings, and postings may include positions, fields, and ranking signals. Building it is like reorganizing a warehouse by label: retrieval becomes fast, but every new box must be placed on several shelves. The write cost is the price of making reading selective.",
          engineer:
            "Tokenize and normalize documents, then emit postings containing document ID, term frequency, positions, field weights, and optional freshness signals. Segment immutable index files and merge them in the background, a log-structured approach that favors sustained ingestion. Use document-ID compression, posting-list compression, and columnar feature storage to reduce I/O. At query time, intersect postings for required clauses, rank a bounded candidate set, and fetch display data only for winners. Choose segment size from merge cost and query latency, and monitor deleted-document overhead. Rebuilding from a canonical store should be a rehearsed capability, not an emergency improvisation.",
          visualId: "btree-lsm",
        },
        {
          title: "Rank with controlled query execution",
          story:
            "A librarian with excellent taste can still make a bad recommendation if the request is misunderstood. Search quality depends on parsing the reader's intent before touching the shelves. Ranking should combine lexical relevance, freshness, authority, and personalization only where it improves the task. Every extra clause costs CPU, and every clever personalization rule creates another chance to leak one user's context into another's results. Simpler, measurable ranking wins until evidence says otherwise.",
          engineer:
            "Parse queries into an allowlisted structure with explicit term, field, and filter operators; never execute raw user text as a database or engine command. Bound clause count, result depth, aggregation cardinality, and execution time before dispatch. Score candidates in stages: cheap lexical filters first, then more expensive learned or freshness features, with a final bounded rerank. Cache only results whose inputs and authorization context are represented in the key. Log normalized query classes and latency histograms rather than storing raw sensitive searches indefinitely. Evaluate ranking with offline relevance sets and online outcome metrics, and roll back changes gradually when quality or tail latency regresses.",
          visualId: "rag-space",
        },
        {
          title: "Operate freshness, availability, and query safety together",
          story:
            "A library can be open, well indexed, and still unsafe if anyone can scribble instructions into the catalogue. Search reliability therefore has three clocks: how quickly new documents appear, how quickly queries return, and how quickly dangerous or private content is removed. Operators need dashboards for all three. A fast index full of stale or exposed documents is not a successful search engine; it is merely an efficient way to distribute the wrong information.",
          engineer:
            "Maintain separate blue-green index versions so a failed build never replaces the serving index. Replicate shards across failure domains and route around unhealthy nodes with a bounded timeout. Track indexing lag, merge backlog, shard saturation, query p95 and p99, empty-result rate, and removal propagation. Enforce document-level access before ranking or filter the result set with a permission-aware query. Reject overly broad or expensive queries before they consume a whole shard, and redact secrets from crawler and query logs. Verify deletion across live indexes, caches, and snapshots, and rehearse rebuild and failover under realistic query load.",
          visualId: "deploy-strategies",
        },
      ],
      security: [
        {
          threat:
            "User-supplied query syntax reaches the index parser or backing database as executable instructions.",
          control:
            "Parse into an allowlisted query structure, validate fields and operators, and execute only parameterized engine calls.",
          verify:
            "Fuzz unsupported syntax in staging and confirm rejection before execution, stable errors, and no unexpected data access.",
        },
        {
          threat:
            "Restricted documents appear in results or snippets before ranking removes them.",
          control:
            "Apply permission filters inside the retrieval query and strip unauthorized snippets before rendering.",
          verify:
            "Index documents with contrasting ACLs and compare results, counts, facets, and snippets for each test identity.",
        },
        {
          threat:
            "Crawler or parser workers process hostile documents that exhaust memory, disk, or CPU.",
          control:
            "Sandbox parsers and enforce download-size, parse-time, recursion, and output limits with isolated worker quotas.",
          verify:
            "Process malformed document fixtures under resource monitoring and confirm bounded failure without collateral shard impact.",
        },
      ],
      quiz: quizFor("search-engine", [
        {
          question: "Why separate crawling from query serving?",
          choices: [
            "Crawling and serving have different resource profiles and failure modes",
            "Search engines do not need fresh documents",
            "Queries cannot use indexes",
            "Crawlers should share query caches",
          ],
          answerIndex: 0,
          explanation:
            "Ingestion is bandwidth- and parser-heavy, while serving is latency-sensitive; separating them contains load and failures.",
        },
        {
          question: "What does an inverted index map?",
          choices: [
            "Users to permissions",
            "Terms to the documents and positions containing them",
            "Documents to their file hashes only",
            "Queries to billing records",
          ],
          answerIndex: 1,
          explanation:
            "Posting lists let the engine find relevant documents without scanning the entire corpus.",
        },
        {
          question: "Why authorize documents during retrieval rather than after ranking?",
          choices: [
            "Ranking requires public documents",
            "Post-filtering can leak existence through counts, facets, or expensive candidate selection",
            "Authorization makes indexes unnecessary",
            "Search results should be personalized",
          ],
          answerIndex: 1,
          explanation:
            "Permission-aware retrieval prevents unauthorized documents from influencing the result surface at all.",
        },
        {
          question: "Why build immutable index segments?",
          choices: [
            "They eliminate backups",
            "They support safe atomic publication and background merging without mutating serving files",
            "They make every query slower",
            "They remove the need for compression",
          ],
          answerIndex: 1,
          explanation:
            "Immutable segments simplify concurrency, rollback, merging, and replica consistency.",
        },
      ]),
    },
    {
      id: "metrics-alerting",
      title: "Metrics and Alerting",
      trackId: "case-studies",
      summary:
        "Design a high-cardinality time-series write path, durable alert evaluation, and paging policy that engineers can trust.",
      steps: [
        {
          title: "Estimate series growth, not sample count",
          story:
            "A weather station with one thermometer produces a simple diary. A station that measures temperature, pressure, wind, and humidity for every sensor in every city produces a library of overlapping diaries. Metrics systems fail because teams count samples but forget dimensions. One million samples sounds manageable until each sample carries ten labels and the label combinations multiply. The first design question is how many distinct series exist, because that number determines memory, indexing, and cost.",
          engineer:
            "Assume a fleet of one hundred thousand instances reporting common host metrics every fifteen seconds, plus selective application metrics. Four base series per instance already means four hundred thousand active series, and adding region, service, and deployment labels can multiply that count. Estimate ingestion as active series times samples per second, then account for replication and retention separately. High-cardinality labels such as user ID do not belong in a metric name; they are better handled as logs or traces. Use order-of-magnitude reasoning to choose between a managed time-series backend and a partitioned cluster, and state assumptions about churn and label cardinality before selecting a schema.",
          visualId: "traffic-flow",
        },
        {
          title: "Write samples through a buffered ingestion path",
          story:
            "A turnstile counts people entering, but it does not stop each person to write a paragraph in a ledger. Metrics collectors can batch samples, validate them, and pass them through a narrow gate. The gate protects storage from malformed data and bursts while keeping the write path predictable. If every collector negotiates with every storage node, the system spends more time coordinating doors than counting visitors.",
          engineer:
            "Collectors scrape or push through a regional ingestion tier that authenticates tenants, enforces series and sample limits, and batches writes. Use a durable queue or write-ahead buffer to absorb backend slowdowns, but bound queue age so stale data is dropped rather than silently arriving hours late. Partition time-series data by metric name and a bounded hash of labels, with time-based buckets for retention. Apply exemplars to connect metrics with traces without embedding high-cardinality identifiers in every series. Monitor dropped samples, ingestion lag, and per-tenant quota consumption. Backpressure should protect critical infrastructure metrics before shedding less important dashboard series.",
          visualId: "queue-workers",
        },
        {
          title: "Store and query time series efficiently",
          story:
            "A fitness diary stores a value for each minute, but a chart only needs some of those minutes. A time-series engine can compress repeated timestamps, delta-encode values, and downsample older data. It should not scan every raw sample to answer a six-hour question. The storage layout must balance precise recent detail with cheap historical trends, and retention should be a first-class policy rather than a surprise disk bill.",
          engineer:
            "Use column-oriented time-series blocks with compression for timestamps and values, plus inverted metadata for label selection. Downsample older data into rollups while retaining raw high-resolution data for a shorter window. Queries should select bounded time ranges and use pushdown on metric and labels before scanning blocks. Cache repeated dashboard queries with a short freshness window, but avoid caching tenant-specific results under shared keys. Shard by a stable hash of the series identity and use time buckets for retention deletion. Measure query scan volume and series evaluated, not just query count, because one broad query can cost as much as thousands of narrow ones.",
          visualId: "btree-lsm",
        },
        {
          title: "Evaluate alerts with state and hysteresis",
          story:
            "A smoke alarm should not page the fire department because a piece of toast browned for three seconds, but it also must not stay silent during a real fire. Alert rules need patience on the way into firing and explicit conditions on the way out. Evaluation must be durable because the rule may be retried, the evaluator may restart, and the same sample window may be processed twice. A dashboard color is not enough; the system needs a small, reliable state machine for each alert instance.",
          engineer:
            "Evaluate rules in partitions and persist pending, firing, and resolved states with the evaluation timestamp and rule version. Use a for-duration condition before paging and a separate recovery threshold to prevent flapping. Deduplicate notifications with a stable alert fingerprint and group related instances into one incident when they share a root cause. Route notifications through a durable delivery outbox so evaluation success does not depend on email or chat availability. Record the exact query window and data completeness behind a decision. Missing data should be distinguishable from zero, and stale evaluators must not fire alerts from incomplete recent windows.",
          visualId: "raft-election",
        },
        {
          title: "Balance alert fatigue, missed pages, and data privacy",
          story:
            "A control room with one siren for every blinking light trains engineers to ignore the whole panel. Yet removing sireers until the room is quiet can hide the one light that matters. Trusted alerting pages on user-visible risk, groups symptoms into incidents, and sends lesser signals to tickets or dashboards. The goal is not the fewest alerts; it is the shortest path from a real problem to a prepared responder. Privacy matters too, because operational labels and notification payloads often contain customer or internal system details.",
          engineer:
            "Define service-level indicators first, then alert on sustained error-budget burn or imminent user harm rather than raw resource spikes alone. Use severity, ownership, runbook links, and deduplication keys in every page, and route low-severity signals to non-paging channels. Track precision, missed incidents, time to acknowledge, and pages per on-call shift, reviewing noisy rules regularly. Protect metric ingestion with authentication and tenant quotas, strip secrets from labels, and restrict query and notification access. Verify alert behavior with replay tests for spikes, missing data, evaluator restart, and notification failure, and conduct a periodic test that a genuine critical condition still reaches the responder.",
          visualId: "deploy-strategies",
        },
      ],
      security: [
        {
          threat:
            "A tenant submits unbounded label cardinality to exhaust ingestion and storage capacity.",
          control:
            "Enforce per-tenant series, label, sample-rate, and ingestion quotas with authenticated identities and admission control.",
          verify:
            "Exceed each quota in staging and confirm rejection or throttling while other tenants retain healthy write latency.",
        },
        {
          threat:
            "Alert notification payloads leak credentials, customer identifiers, or sensitive internal endpoints.",
          control:
            "Use structured allowlisted notification fields, redact secrets, and restrict notification channel access by team.",
          verify:
            "Trigger representative alerts and inspect every rendered channel for forbidden fields and unexpected tenant data.",
        },
        {
          threat:
            "A forged metric or suppressed evaluator hides a real outage from responders.",
          control:
            "Authenticate metric sources, sign and version rule configuration, audit suppression changes, and monitor evaluator heartbeat freshness.",
          verify:
            "Replay missing evaluator heartbeats and unauthorized writes; confirm independent monitoring pages on the loss of observability.",
        },
      ],
      quiz: quizFor("metrics-alerting", [
        {
          question: "Which quantity usually drives time-series storage cost most directly?",
          choices: [
            "The number of dashboards",
            "Active series cardinality multiplied by retention and sample rate",
            "The length of the on-call schedule",
            "The number of notification channels",
          ],
          answerIndex: 1,
          explanation:
            "Series cardinality determines how many timelines exist, and sample rate and retention determine how long each becomes.",
        },
        {
          question: "Why persist alert evaluation state?",
          choices: [
            "To make every alert fire immediately",
            "So restarts and duplicate evaluations preserve pending, firing, and resolved semantics",
            "To avoid deduplicating notifications",
            "To store raw customer logs",
          ],
          answerIndex: 1,
          explanation:
            "Durable state prevents flapping and inconsistent notifications when evaluators retry or fail over.",
        },
        {
          question: "What is the best response to alert fatigue?",
          choices: [
            "Disable all warning alerts",
            "Page on user-visible risk, group symptoms, and route low-severity signals elsewhere",
            "Send every sample to a pager",
            "Remove runbooks",
          ],
          answerIndex: 1,
          explanation:
            "Actionable, deduplicated, severity-routed alerts preserve attention for incidents that require human intervention.",
        },
        {
          question: "Why should missing data differ from a zero value?",
          choices: [
            "Zero is always an outage",
            "Missing data can indicate ingestion failure rather than healthy measurements",
            "Time-series databases cannot store zero",
            "Alert rules cannot use numeric values",
          ],
          answerIndex: 1,
          explanation:
            "Conflating absence with zero can both hide ingestion outages and create false healthy or firing signals.",
        },
      ]),
    },
    {
      id: "lld-lru-cache",
      title: "LLD: LRU and LFU Cache",
      trackId: "case-studies",
      summary:
        "Implement constant-time LRU and LFU eviction with precise data-structure invariants, bounded memory, concurrency discipline, and safe cache boundaries.",
      steps: [
        {
          title: "Define the cache contract before the algorithm",
          story:
            "A desk drawer keeps the tools used today within reach and pushes last season's gloves to the back. The drawer is not a permanent warehouse; it is a small promise about fast access. Before choosing LRU or LFU, decide what a hit means, whether reads update recency, how expiration works, and what happens when capacity is zero. A cache with an unclear contract is like a helpful assistant who hides things according to a rule nobody explained.",
          engineer:
            "Specify get, put, optional delete, capacity, maximum entry weight, and expiration semantics. LRU evicts the least recently used key; LFU evicts the least frequently used key, usually breaking ties by recency. Both should provide expected O(1) lookup and update, with O(1) eviction rather than scanning entries. Decide whether get changes LFU frequency and whether failed gets create negative entries. Bound memory by bytes as well as entry count because one oversized value can defeat a nominally correct capacity. State explicitly that cached values are disposable copies, so callers must not treat cache contents as the only durable record.",
          visualId: "cache-ring",
        },
        {
          title: "Build LRU from a hash map and doubly linked list",
          story:
            "A librarian uses a catalogue card to find a book and a physical shelf order to show which book has gathered the most dust. The card gives instant lookup; the shelf gives instant removal from either end. An LRU cache needs exactly these two views. The map answers whether a key exists, and the doubly linked list keeps usage order. A plain list would force a search every time a book moved, which turns a tidy system into a slow scavenger hunt.",
          engineer:
            "Maintain a hash map from key to a linked-list node and a doubly linked list ordered from most recently used at the head to least recently used at the tail. On get, look up the node, detach it, and prepend it. On put of an existing key, update its value and weight bookkeeping, then move it to the head. On a new key, create and prepend a node; if weighted capacity is exceeded, repeatedly remove tail nodes until the size is within bounds. Sentinel head and tail nodes eliminate null-edge cases. Always remove a node's map entry when evicting, and never leave a map pointing at a detached node.",
          visualId: "notation-decoder",
        },
        {
          title: "Implement LFU with frequency buckets",
          story:
            "A coffee shop remembers which mugs its regulars use, not merely which mug was touched last. LFU keeps those regulars warm even if a tourist picks up every other cup once. The implementation resembles a staircase of popularity levels. Each step contains recently used items at that frequency, and the lowest occupied step is where eviction begins. The data structure must promote an item to the next step without searching the whole café.",
          engineer:
            "Use a map from key to node containing value, frequency, weight, and expiry, plus a map from frequency to an ordered set of keys or a doubly linked bucket list. On access, remove the key from its current frequency bucket, increment frequency, and insert it into the next bucket with recency ordering. On eviction, select the minimum frequency bucket and remove its least recently used entry. A min-heap of frequencies avoids scanning for the minimum, while an ordered bucket map can expose the first key directly. If evicting one low-frequency oversized value is insufficient, continue across buckets. Delete empty buckets so stale frequencies do not accumulate or distort the minimum.",
          visualId: "cache-ring",
        },
        {
          title: "Handle expiration and concurrency without broken invariants",
          story:
            "Two assistants using the same drawer can both decide the expired snacks should be thrown away and reach for the same box. One ends up holding an empty hand while the other wonders where the snacks went. Cache operations need a single serialization boundary, or carefully coordinated removal, because eviction and expiration mutate several structures at once. Locks are not glamorous, but they are the difference between a fast cache and a mysterious missing-value bug.",
          engineer:
            "Guard each compound mutation with a lock, striped lock, or a single-owner event loop. A read that returns a mutable object must either copy it or document the sharing contract; otherwise a caller can change cached data without updating weights or size. Use a monotonic clock for expiry, check it on access, and remove expired entries before admitting new ones. Lazy expiration avoids a sweeping thread but can retain dead values until pressure arrives; active cleanup bounds stale memory. Instrument hits, misses, evictions, expirations, and bytes rejected. Test races between get, put, expire, and evict by asserting that the map and list or buckets contain identical live keys after every operation.",
          visualId: "realtime-channels",
        },
        {
          title: "Protect cache side channels and failure behavior",
          story:
            "A cache should behave like a quick note, not a loose-lipped witness. If timing reveals whether a secret key exists, or if one tenant can fill the drawer and evict everyone else's notes, speed becomes a security problem. Defensive caching limits entry size, isolates namespaces, and avoids returning internal details to callers. When the cache fails, the application should fetch from the authoritative source within a bounded budget rather than exposing stack traces or hammering a database.",
          engineer:
            "Namespace keys by tenant and purpose, authorize cache administration separately, and avoid using attacker-controlled keys without length and entry-count limits. Return the same miss latency for absent and unauthorized entries where authorization is evaluated outside the cache, and never cache sensitive responses under a shared key. Add request coalescing and jittered fallback so a cold or unavailable cache does not create a database stampede. On corruption or restart, clear the cache and rebuild lazily from the source of truth. Verify tenant isolation, oversized-value rejection, expiration accuracy, concurrent invariant checks, and bounded behavior during a forced cache flush.",
          visualId: "threat-defense",
        },
      ],
      security: [
        {
          threat:
            "An attacker fills a shared cache with large or low-value entries to evict legitimate data.",
          control:
            "Apply per-tenant quotas, maximum key and value sizes, weighted capacity, and isolated cache namespaces.",
          verify:
            "Fill one tenant's namespace and confirm unrelated tenants retain their entries and normal hit rates.",
        },
        {
          threat:
            "Cache timing or error differences reveal whether protected resources exist.",
          control:
            "Enforce authorization before lookup, return uniform misses, and avoid detailed cache diagnostics on public paths.",
          verify:
            "Compare responses and latency distributions for absent, unauthorized, and authorized test resources.",
        },
        {
          threat:
            "Mutable cached objects bypass application validation and corrupt shared state.",
          control:
            "Store immutable values or defensive copies and reject oversized or unvalidated entries at the cache boundary.",
          verify:
            "Mutate returned objects in tests and confirm cached state, size accounting, and subsequent readers remain unchanged.",
        },
      ],
      quiz: quizFor("lld-lru-cache", [
        {
          question: "Which two structures provide expected O(1) LRU operations?",
          choices: [
            "A sorted array and a queue",
            "A hash map and a doubly linked list",
            "A binary heap and a set",
            "A trie and a stack",
          ],
          answerIndex: 1,
          explanation:
            "The map locates nodes in constant time, while the linked list moves or evicts nodes without scanning.",
        },
        {
          question: "In LFU, what breaks ties among items at the minimum frequency?",
          choices: [
            "Lexicographic key order",
            "The least recently used item",
            "The largest value",
            "Creation timestamp only",
          ],
          answerIndex: 1,
          explanation:
            "Recency within a frequency bucket gives deterministic LFU-with-LRU-tie-breaking behavior.",
        },
        {
          question: "Why track byte weight as well as entry count?",
          choices: [
            "Entry count cannot be measured",
            "A few large values can exceed the intended memory budget",
            "Byte weight determines authorization",
            "It makes expiration unnecessary",
          ],
          answerIndex: 1,
          explanation:
            "A count-based cache can still consume excessive memory when values vary greatly in size.",
        },
        {
          question: "What should happen when the cache is unavailable?",
          choices: [
            "Return fabricated data",
            "Expose internal errors to users",
            "Use bounded, coalesced reads from the authoritative source",
            "Permanently disable writes",
          ],
          answerIndex: 2,
          explanation:
            "A cache is disposable; graceful fallback must preserve correctness while avoiding an origin stampede.",
        },
      ]),
    },
    {
      id: "lld-rate-limiter",
      title: "LLD: Distributed Rate Limiter",
      trackId: "case-studies",
      summary:
        "Implement atomic token-bucket decisions across replicas with identity-safe keys, burst policy, failure behavior, and clear observability.",
      steps: [
        {
          title: "Define the policy, not just the counter",
          story:
            "A bakery hands each customer a small stack of tokens. One cookie costs one token, and the baker adds fresh tokens at a steady rate. The stack allows a short burst without letting one hungry customer empty the counter. Before coding the jar, the bakery must decide its refill rate, stack size, who receives a jar, and what happens when the baker's ledger is unavailable. A rate limiter without those decisions is just a number that occasionally rejects people.",
          engineer:
            "Define the protected operation, caller identity, refill rate, burst capacity, cost per operation, and decision semantics. A token bucket stores a token count and last-refill timestamp; on each request, compute refill using elapsed time, cap at capacity, and consume cost if enough tokens remain. Choose whether requests are admitted atomically or evaluated with a later reconciliation. Specify behavior for clock skew, concurrent calls, and partial failures. The limiter protects availability, so its own latency and dependency health need budgets. Keep policy configuration versioned and observable so a deployment can change limits without deploying application code.",
          visualId: "rate-limiter",
        },
        {
          title: "Make token state transitions atomic",
          story:
            "Two cashiers reaching into the same cash drawer can both see one bill and both hand it out. Distributed rate limiting has the same double-spend problem. Every replica may read a bucket that currently has one token, then both approve a request. A local counter per server is fast but useless against a caller spread across servers. The fix is a single atomic transition at a shared authority, or an algorithm that deliberately accounts for approximate counting.",
          engineer:
            "Store each bucket in a shared key-value service and use an atomic script or compare-and-swap loop that reads state, computes refill, consumes tokens, and writes the result as one transition. Include the policy version and expiry in the stored record. The transition must be idempotent for a request ID if retries are allowed, otherwise a network retry may consume tokens twice. If exact enforcement matters, route a caller's operations to a stable shard or use a strongly consistent store. Measure contention on hot identities. A leaky-bucket or approximate local limiter can reduce dependency load, but the design must state the allowed overshoot and how it is monitored.",
          visualId: "consistent-hash",
        },
        {
          title: "Key decisions on authenticated identity",
          story:
            "A doorman who trusts a handwritten name tag lets a crowd enter as the same honored guest. Client-supplied headers are those name tags: easy to change and impossible to trust on their own. A limiter must ask who the caller really is according to a verified session, tenant, or API credential. It can combine dimensions, such as tenant plus route, but the root identity should come from the authorization layer rather than a field the caller controls.",
          engineer:
            "Derive the primary limit key from a verified principal, such as an authenticated user ID, tenant ID, or hashed API credential, and optionally add route and cost class. Use a keyed hash for stored identifiers so raw secrets do not enter logs or cache keys. Do not use forwarded IP, user-agent, or custom identity headers as the sole basis because they can be absent or spoofed. Network limits may be an additional layer at a trusted ingress, not a replacement for application authorization. Return a consistent rejection response with a safe retry hint, and audit limit-policy changes. Verify that changing a client header cannot change the authenticated limit key.",
          visualId: "threat-defense",
        },
        {
          title: "Handle bursts, costs, and fairness deliberately",
          story:
            "A buffet allows everyone to take a plate now, but a guest carrying twenty stacked plates is using the future allowance of the whole table. Rate limits need both speed and size: tokens control how often, while a cost function controls how expensive. A bulk export may consume more than a profile read even if both are one API call. Fairness means the tenant next door should not wait behind one customer's giant batch.",
          engineer:
            "Assign each operation a cost based on CPU, downstream work, data volume, or scarcity, and require enough tokens for that cost. Keep burst capacity bounded so recovery does not unleash a delayed flood. Consider weighted fairness or per-tenant concurrency limits alongside request-rate limits when expensive operations dominate. Avoid penalizing legitimate retries twice by honoring a request idempotency key within a small retry window. Partition hot keys or introduce hierarchical limits when a single tenant saturates a shard, while preserving a global account ceiling where required. Expose accepted, rejected, remaining, and refill-window metrics without leaking other tenants' usage.",
          visualId: "queue-workers",
        },
        {
          title: "Fail safely and prove the limiter works",
          story:
            "If the limiter's shared ledger disappears, the bakery must choose between selling cookies freely and closing the shop. Neither answer is always right. A signup endpoint may need strict availability protection, while a read-only status page might safely degrade. The important point is that failure behavior is an explicit policy per operation, not an accident hidden in a timeout. Operators should see when enforcement is approximate before protected systems melt.",
          engineer:
            "Define fail-open, fail-closed, or local-degraded behavior for each operation class, with a short dependency timeout and circuit breaker. During degraded mode, apply a conservative local limiter and emit a high-severity signal when global accuracy is lost. Store buckets with expiration to reclaim inactive identities, and load-test hot keys to expose contention. Tests should cover exact burst boundaries, refill across idle periods, concurrent requests, retries, clock movement, policy changes, and store outages. Confirm that rejection protects the downstream dependency without denying unrelated tenants, and keep an independent view of downstream saturation so a broken limiter cannot silently remove all protection.",
          visualId: "deploy-strategies",
        },
      ],
      security: [
        {
          threat:
            "A caller spoofs identity headers to reset or evade the applied limit.",
          control:
            "Derive limit keys from authenticated identity and treat network headers only as secondary signals at a trusted ingress.",
          verify:
            "Send the same request while varying client-controlled headers and confirm the authenticated bucket remains unchanged.",
        },
        {
          threat:
            "Concurrent requests overspend a bucket because replicas read stale token counts.",
          control:
            "Use an atomic state transition or stable shard ownership with strongly consistent enforcement where exactness is required.",
          verify:
            "Run synchronized requests against a one-token bucket and confirm exactly the configured number is admitted.",
        },
        {
          threat:
            "An outage in the limiter either removes protection or causes a global denial of service.",
          control:
            "Set per-operation degraded policies, short timeouts, conservative local fallback, and independent alerting on lost accuracy.",
          verify:
            "Disable the shared store in staging and confirm each operation follows its declared fail-open or fail-closed behavior.",
        },
      ],
      quiz: quizFor("lld-rate-limiter", [
        {
          question: "What state does a basic token bucket need?",
          choices: [
            "Only total requests ever seen",
            "Token count and last refill time",
            "A sorted list of user agents",
            "The original request body",
          ],
          answerIndex: 1,
          explanation:
            "Token count plus the refill timestamp is enough to compute the current allowance using elapsed time.",
        },
        {
          question: "Why must distributed bucket updates be atomic?",
          choices: [
            "To prevent two replicas from spending the same remaining tokens",
            "To make client headers trustworthy",
            "To eliminate all queues",
            "To increase burst capacity",
          ],
          answerIndex: 0,
          explanation:
            "Atomic read-modify-write prevents the classic double-spend race across limiter replicas.",
        },
        {
          question: "Which is the best primary limit key for an authenticated API?",
          choices: [
            "A caller-supplied username header",
            "The raw user-agent string",
            "A verified principal or tenant identifier",
            "A random value per request",
          ],
          answerIndex: 2,
          explanation:
            "The key must come from a trusted authentication context so callers cannot choose a fresh bucket.",
        },
        {
          question: "Why assign operation costs?",
          choices: [
            "Every endpoint consumes identical resources",
            "Expensive operations should consume more of a caller's allowance",
            "Costs replace authorization",
            "Rate limits should ignore downstream load",
          ],
          answerIndex: 1,
          explanation:
            "Cost weighting protects downstream capacity better than counting a tiny read and a large export as equal.",
        },
      ]),
    },
    {
      id: "lld-pubsub",
      title: "LLD: Pub/Sub Broker",
      trackId: "case-studies",
      summary:
        "Implement topic routing, subscription indexes, durable queues, delivery semantics, backpressure, and topic-level authorization.",
      steps: [
        {
          title: "Specify topics, subscriptions, and delivery promises",
          story:
            "A conference venue has rooms for different talks and a list of people waiting outside each room. The announcer speaks once, and ushers deliver the message to the relevant lists. A pub/sub broker is the venue, topics are the rooms, and subscriptions are the waiting lists. Before building ushers, decide whether missing a listener loses the message or leaves it for later. That one choice changes the entire building.",
          engineer:
            "Define topic names, message envelopes, retention, subscriber types, delivery guarantee, acknowledgement, retry, and ordering scope. At-least-once delivery is common because it favors not losing messages, so consumers must deduplicate. A subscription can be ephemeral, durable, or a push endpoint with its own retry policy. Bound topic and subscription counts per tenant, message size, and queue depth. Decide whether ordering is global, per topic, or per producer key; claiming global ordering usually adds a costly coordination point. Document redelivery and expiry so clients can reason about gaps without assuming exactly-once transport.",
          visualId: "realtime-channels",
        },
        {
          title: "Route with a subscription trie or map of sets",
          story:
            "A building directory groups offices by floor so the courier can walk straight to the right hallway. A subscription trie does the same for topic segments, while a map of sets is simpler for exact topic names. Neither structure should require scanning every subscriber to publish one message. The broker can afford a direct lookup and a set of waiting connections; it cannot afford a city-wide search for every announcement.",
          engineer:
            "For exact topics, keep a map from topic to a set of subscription IDs and a reverse map from subscription to its topics. For wildcard routing, store topic segments in a trie and collect matching subscription IDs at the terminal nodes, with explicit rules for single-segment and multi-segment wildcards. Protect publication and subscription mutation with the same lock or actor boundary so a publish cannot observe half-updated membership. Topic names should be bounded, normalized, and tenant-scoped. Deduplicate matching IDs when several wildcard branches match the same topic, and avoid recursive traversal without depth and node limits.",
          visualId: "notation-decoder",
        },
        {
          title: "Decouple routing from durable delivery",
          story:
            "The announcer should not have to stand at every listener's door waiting for someone to answer. The broker accepts the message, stores it in the appropriate durable queues, and lets delivery workers handle slow subscribers. One sleeping listener must not block the microphone. This separation also gives the system a place to retry, dead-letter, and measure backlog without complicating the publish request.",
          engineer:
            "Append the message to a durable log, record retention and producer sequence, then enqueue or advance each matching subscription. Workers deliver to connected clients or external endpoints and require acknowledgement before removing the queue entry. Use exponential backoff with jitter and move repeatedly failing messages to a bounded dead-letter path with metadata for replay. Make subscription offsets idempotent so redelivery cannot advance past an unprocessed message. Separate queues by subscriber fairness class so one slow tenant does not monopolize workers. Publish should fail or explicitly degrade if durability is not achieved, and metrics must include oldest unacknowledged age, not just queue length.",
          visualId: "queue-workers",
        },
        {
          title: "Control ordering, retries, and backpressure",
          story:
            "A waiter carrying too many plates will drop them all. A broker that buffers without limit eventually does the same, only with everyone's messages. Per-subscriber queues need high and low water marks, and publishers need a clear signal when the system cannot accept more work. Retries need jitter so a failed endpoint does not receive synchronized hammering. The broker should behave like a well-run restaurant: bounded stations, clear tickets, and no promise it cannot keep.",
          engineer:
            "Assign sequence numbers per topic partition and preserve that order for subscriptions that request it, while allowing different subscribers to progress independently. A slow consumer should pause its queue or disconnect rather than consuming unbounded memory. Set publisher quotas and return a retryable busy response when admission limits are reached. Retry transient failures with capped backoff, but treat permanent schema or authorization failures as non-retryable and dead-letter them. Consumer acknowledgements should be batched only after processing is safe. Test duplicate delivery, out-of-order redelivery, worker restart, poison messages, and recovery after a full queue drain.",
          visualId: "kafka-partitions",
        },
        {
          title: "Authorize topics and contain tenant failures",
          story:
            "A microphone in one meeting room should not broadcast into the boardroom next door. Pub/sub systems often expose powerful cross-service communication, so topic names and queue contents deserve strict boundaries. A subscriber allowed to listen to billing events should not automatically gain permission to publish refund instructions. The broker must separate publish, subscribe, replay, and administrative powers, and keep one tenant's backlog from becoming everyone's outage.",
          engineer:
            "Use tenant-scoped topic namespaces and authorize each publish, subscribe, replay, and delete operation against a verified principal. Wildcard subscriptions must be constrained to an authorized namespace rather than matching the entire broker. Encrypt messages in transit and at rest where required, redact secrets from operational logs, and audit administrative replay or deletion. Apply per-tenant message-rate, retention, queue, and connection quotas. Return uniform authorization failures that do not reveal other tenants' topic names. Verify with cross-tenant publish and wildcard-subscribe attempts, credential revocation, queue saturation, and replay authorization tests.",
          visualId: "threat-defense",
        },
      ],
      security: [
        {
          threat:
            "A wildcard subscription captures topics outside a tenant's authorized namespace.",
          control:
            "Resolve wildcards only inside an authorized namespace prefix and enforce subscription-level authorization before delivery.",
          verify:
            "Attempt broad wildcard subscriptions across tenants and confirm matching stops at the namespace boundary.",
        },
        {
          threat:
            "A subscriber replays or deletes another tenant's durable queue.",
          control:
            "Authorize replay, purge, and administrative operations separately from ordinary subscribe permission and audit each action.",
          verify:
            "Call replay and delete endpoints with a read-only subscriber credential and confirm denial plus immutable audit records.",
        },
        {
          threat:
            "A slow or malicious subscriber exhausts broker memory and delivery workers.",
          control:
            "Enforce bounded per-subscriber queues, high and low water marks, rate quotas, and fair worker scheduling.",
          verify:
            "Pause one subscriber under sustained load and confirm it is throttled without degrading healthy subscriptions.",
        },
      ],
      quiz: quizFor("lld-pubsub", [
        {
          question: "Why choose at-least-once delivery in many brokers?",
          choices: [
            "It guarantees no duplicates",
            "It favors not losing messages and requires consumer deduplication",
            "It removes the need for acknowledgements",
            "It provides global ordering",
          ],
          answerIndex: 1,
          explanation:
            "At-least-once accepts duplicates as the safer failure mode compared with silent message loss.",
        },
        {
          question: "Which structure efficiently routes exact topic publications?",
          choices: [
            "A scan of every subscriber on every publish",
            "A topic-to-set map with reverse subscription tracking",
            "One global sorted array of messages",
            "An unindexed list of client sockets",
          ],
          answerIndex: 1,
          explanation:
            "The forward map finds subscribers quickly, while the reverse map supports efficient unsubscribe operations.",
        },
        {
          question: "What should happen when a subscriber queue reaches its high-water mark?",
          choices: [
            "Grow memory without limit",
            "Pause, throttle, or disconnect according to policy and expose backpressure",
            "Drop all topics globally",
            "Ignore acknowledgements",
          ],
          answerIndex: 1,
          explanation:
            "Bounded queues protect the broker; controlled backpressure prevents one slow subscriber from exhausting shared resources.",
        },
        {
          question: "Why authorize replay separately from subscribe?",
          choices: [
            "Replay cannot expose data",
            "Replay can re-deliver historical or sensitive messages and is a higher-impact operation",
            "Subscribe is always administrative",
            "Replay requires no authentication",
          ],
          answerIndex: 1,
          explanation:
            "Historical replay can expose retained data at scale, so it needs explicit privilege and auditability.",
        },
      ]),
    },
    {
      id: "lld-parking-lot",
      title: "LLD: Parking Lot",
      trackId: "case-studies",
      summary:
        "Model parking spots, atomic assignment, reservations, payment workflows, and safe edge cases using explicit domain rules.",
      steps: [
        {
          title: "Start with entities and lifecycle boundaries",
          story:
            "A parking lot is not simply a grid of empty squares. It has floors, vehicle types, entrance gates, payment systems, and tickets that move through issued, active, paid, and exited states. If every gate invents its own rules, two cars can receive the same space while both drivers trust their tickets. The object model is the shared rulebook that keeps the physical lot and the digital record in agreement.",
          engineer:
            "Identify ParkingLot, Floor, ParkingSpot, Vehicle, Ticket, Reservation, Gate, and Payment as separate concepts. A spot should expose compatibility, occupancy, and reservation state rather than letting callers mutate an arbitrary boolean. Tickets carry entry time, assigned spot, vehicle identity reference, status, and version. Define invariants such as one active ticket per vehicle session and at most one active claim per spot. Use enums or sealed state types for status transitions. Keep domain rules independent of database and UI frameworks so they can be unit tested directly, including invalid transitions and concurrent claims.",
          visualId: "notation-decoder",
        },
        {
          title: "Assign spots with deterministic, bounded rules",
          story:
            "An attendant does not choose a space by wandering randomly through the garage. The attendant checks vehicle size, accessible requirements, floor availability, and a preference such as nearest entrance. The same simple policy applied consistently makes the lot predictable. If two attendants choose at once, however, the parking ticket becomes a promise the lot cannot keep. The assignment rule needs a lock or a database condition around the final claim.",
          engineer:
            "Maintain compatible spots indexed by vehicle type and status, with optional floor or distance ordering. Find candidates through the index, filter by accessibility or charging requirements, and atomically claim the first eligible spot using a conditional update or lock. Record the assignment on the ticket in the same transaction. When a spot is released, clear its claim and make it available again. Reservations require a hold with expiry so unused spaces return to the pool. Avoid scanning every spot on each entry, and define tie-breaking deterministically for tests. Capacity counts should derive from actual spot state rather than a separately incremented counter that can drift.",
          visualId: "consistent-hash",
        },
        {
          title: "Make check-in, exit, and payment idempotent",
          story:
            "A driver whose phone loses signal at the exit gate should not be charged twice because the payment request was retried. Nor should a second tap of the same ticket create a second parking session. Real gates are unreliable networks, so the domain needs a receipt number for each logical operation. Idempotency turns an accidental repeat into the same answer, like asking the attendant to look up the original ticket instead of writing another one.",
          engineer:
            "Generate tickets with unique IDs and accept an idempotency key for entry, payment, and exit operations. Use versioned state transitions so a stale gate cannot complete an already-exited ticket. Calculate charges from durable entry and exit timestamps using a versioned pricing policy, and store the pricing version with the payment record. Payment authorization and gate release may cross services, so model them as a saga with explicit pending and failed states. If payment succeeds but exit acknowledgement is lost, reconciliation must find the completed ticket and safely reopen the gate without charging again.",
          visualId: "saga-outbox",
        },
        {
          title: "Handle overbooking, failure, and concurrency",
          story:
            "A reservation system that sells the last accessible space twice has not created extra capacity; it has created two disappointed drivers. Overflow, broken gates, and expired reservations are normal operating conditions, not exotic exceptions. The lot needs honest capacity decisions and clear recovery paths. A full sign is more useful than a ticket for a space that another car already occupies.",
          engineer:
            "Serialize spot claims at the spot or partition boundary, using database uniqueness on active assignments as a final guard. Expire reservation holds through a scheduled job and reconcile them on access so a crashed cleanup worker does not permanently lose inventory. When full, reject new entry or offer a waitlist according to policy rather than assigning an invalid spot. If a gate fails after ticket creation, mark the ticket pending and let an operator resolve it; do not silently roll back durable payment records. Tests should race multiple vehicles for one spot, expire a reservation during check-in, retry payment, and restart the service mid-transition.",
          visualId: "replication",
        },
        {
          title: "Protect vehicle data and administrative controls",
          story:
            "A parking lot needs enough information to distinguish vehicles and calculate a fee, not a permanent scrapbook of everyone's movements. License plates and payment references are sensitive, and support staff should not have unlimited power to change tickets or open gates. The security model is a smaller version of the physical one: separate roles, short retention, and an audit trail for exceptional actions.",
          engineer:
            "Minimize stored vehicle identifiers, encrypt sensitive fields, and apply retention policies to plate images and location history. Authorize ticket lookup by session or staff role, because a ticket number alone should not expose payment or vehicle details. Separate ordinary exit, refund, manual override, and pricing administration permissions. Rate-limit lookup endpoints to reduce enumeration, redact payment tokens from logs, and record immutable audit events for overrides. Offline gate operation should use signed, expiring capability tokens with bounded local inventory rather than trusting arbitrary client data. Verify role boundaries, retention deletion, duplicate-ticket behavior, and gate release after payment-service failure.",
          visualId: "threat-defense",
        },
      ],
      security: [
        {
          threat:
            "An attacker enumerates ticket numbers to retrieve vehicle plates, payment details, or entry history.",
          control:
            "Require an authorized session or staff role, minimize returned fields, and rate-limit ticket lookup with uniform errors.",
          verify:
            "Query sequential ticket IDs without authorization and confirm no sensitive fields or existence signals are exposed.",
        },
        {
          threat:
            "A staff member or compromised gate manually overrides tickets without accountability.",
          control:
            "Separate override permissions, require a reason, and write immutable audit records for manual gate and payment actions.",
          verify:
            "Perform overrides with different roles and confirm unauthorized attempts fail while authorized actions include actor, reason, and timestamp.",
        },
        {
          threat:
            "Retried or forged gate requests release a vehicle without valid payment.",
          control:
            "Use idempotent transition commands, version checks, and short-lived signed gate capabilities tied to a paid ticket.",
          verify:
            "Replay unpaid, expired, and already-used capabilities and confirm the gate remains closed without duplicate charges.",
        },
      ],
      quiz: quizFor("lld-parking-lot", [
        {
          question: "What is the strongest invariant for parking spot assignment?",
          choices: [
            "Every spot may have unlimited active tickets",
            "At most one active claim can own a spot",
            "Capacity is stored only in the UI",
            "Any vehicle may use any spot",
          ],
          answerIndex: 1,
          explanation:
            "A unique active assignment prevents two tickets from promising the same physical space.",
        },
        {
          question: "Why use an idempotency key for payment and exit?",
          choices: [
            "Networks never retry",
            "Repeated requests must not double-charge or repeat a completed transition",
            "It replaces ticket state",
            "It makes pricing mutable without audit",
          ],
          answerIndex: 1,
          explanation:
            "Unreliable gate networks make retries normal, so logical operations need replay-safe semantics.",
        },
        {
          question: "What should an expired reservation do?",
          choices: [
            "Reserve the spot forever",
            "Release its hold back into available inventory after reconciliation",
            "Assign the spot to every waiting driver",
            "Delete the entire floor",
          ],
          answerIndex: 1,
          explanation:
            "Expired holds must return to the pool, with reconciliation covering cleanup failures.",
        },
        {
          question: "Why separate manual override permission from ordinary exit?",
          choices: [
            "Ordinary exit is administrative",
            "Overrides can bypass payment and inventory controls, so they require stronger authorization and audit",
            "Permissions reduce database size",
            "Overrides do not affect money",
          ],
          answerIndex: 1,
          explanation:
            "High-impact exceptions deserve distinct roles and immutable accountability rather than sharing routine privileges.",
        },
      ]),
    },
    {
      id: "lld-elevator",
      title: "LLD: Elevator System",
      trackId: "case-studies",
      summary:
        "Design request queues, SCAN/LOOK scheduling, multi-car coordination, safety interlocks, and testable state transitions.",
      steps: [
        {
          title: "Model cars, requests, doors, and safety states",
          story:
            "An elevator is a small moving room with a strict etiquette: doors open only when stopped, requests are remembered, and emergency rules outrank convenience. Treating it as a simple up-or-down boolean hides the dangerous parts. The design needs separate states for motion, door position, direction, load, and safety interlocks. A polished control panel is useful only if the machine underneath respects those boundaries.",
          engineer:
            "Define ElevatorCar, Request, Door, Display, Dispatcher, and Sensor interfaces. Car state should include current floor, direction, target stops, door state, load, and operational mode such as normal, maintenance, or emergency. Requests can be hall calls with desired direction or cabin calls with a destination. Encode legal transitions explicitly: doors cannot open while moving, and motion cannot begin until doors are closed and locked. Keep safety-critical decisions in a deterministic controller, separate from scheduling heuristics and presentation. Sensors should report health explicitly so a stale reading is not mistaken for a safe one.",
          visualId: "notation-decoder",
        },
        {
          title: "Implement SCAN and LOOK scheduling",
          story:
            "An elevator that sweeps from the top floor to the bottom after every request wastes everyone's time. SCAN goes to an endpoint and reverses; LOOK reverses after the last request in its current direction, which is usually more efficient in a quiet building. The controller keeps an ordered set of stops ahead and chooses a direction without reversing on every new request. Think of it as a bus route that finishes the useful stops before turning around, not a taxi that panics at each new passenger.",
          engineer:
            "Represent cabin and hall stops as ordered sets or balanced trees keyed by floor. While moving upward, serve requested floors at or above the current position; choose LOOK when no higher stop remains, and SCAN when policy requires continuing to the top. At a stop, open doors after arrival confirmation, service compatible hall calls in the current direction, then close and continue. New requests in the opposite direction wait until the car reverses unless safety or accessibility policy changes that rule. Use a monotonically advancing position source and dwell timeout rather than wall-clock-only estimates. Unit tests should assert the exact served sequence for mixed requests.",
          visualId: "queue-workers",
        },
        {
          title: "Dispatch multiple cars without starvation",
          story:
            "One elevator serving every button in a skyscraper becomes a moving bottleneck. Several cars help only if the dispatcher sends each one a sensible stream. If every request goes to the nearest door, a car near the lobby can be overwhelmed while another idles upstairs. A good dispatcher balances distance, current direction, existing stops, load, and fairness. The goal is not to win one request quickly; it is to keep the whole building moving.",
          engineer:
            "Score candidate cars using estimated arrival time, direction compatibility, number of pending stops, load, and maintenance status. Assign each hall call once, or make assignment idempotent so duplicate messages do not create conflicting ownership. Avoid assigning new work to a car already overloaded with intermediate stops, and reserve a car for accessibility or emergency policies when required. Rebalance idle cars toward demand zones during predictable peaks. Bound dispatch computation and provide a fallback to the least-loaded eligible car. Tests should cover simultaneous hall calls, a full car, a disabled car, stale position reports, and requests arriving during a direction reversal.",
          visualId: "consistent-hash",
        },
        {
          title: "Design for edge cases, failure, and determinism",
          story:
            "Real elevators face stuck doors, overloaded cabins, power loss, and buttons pressed at awkward moments. Software tests love these cases because physical buildings do not. A deterministic simulator should advance sensors, requests, dwell timers, and door interlocks through legal sequences. If the same request stream always produces the same behavior, engineers can improve scheduling without fearing that a rare sequence leaves a passenger between floors.",
          engineer:
            "Inject a clock and sensor interfaces, then step the controller through arrival, door opening, boarding dwell, door closing, and movement. Handle overweight by preventing motion and keeping doors open or returning to a safe floor according to policy. A door obstruction should restart or extend dwell within a bounded limit; persistent faults move the car to maintenance mode. On communication loss between dispatcher and car, the local controller must continue safe service or stop at the next floor. Use explicit transition guards and reject impossible commands in tests. Log state changes with car ID, sequence, and reason so post-incident replay can reconstruct behavior.",
          visualId: "realtime-channels",
        },
        {
          title: "Protect control commands and operational access",
          story:
            "An elevator control network should not accept instructions from anyone who can reach the cable. Maintenance mode, remote recovery, and emergency overrides are powerful capabilities, so they need stronger proof than a hallway button. The security boundary combines local safety interlocks with authenticated command channels. No software permission should be able to open doors at speed or bypass an overweight interlock; authorization controls who may request an action, while the controller still decides whether it is safe.",
          engineer:
            "Authenticate car and dispatcher channels, sign control messages with freshness and sequence checks, and separate maintenance roles from routine hall requests. Apply rate limits and bounded command queues to prevent control-channel flooding. Keep safety interlocks in the trusted controller, independent of remote scheduling. Audit maintenance, emergency, and configuration changes with actor and reason. Reject stale or replayed commands, and fail to a defined local safe state when communication is lost. Verify with simulated message replay, role-boundary tests, disabled network links, overweight interlocks, and door-obstruction scenarios that cannot produce unsafe motion.",
          visualId: "threat-defense",
        },
      ],
      security: [
        {
          threat:
            "A replayed or forged control message changes car mode or door commands.",
          control:
            "Authenticate control channels and enforce signed freshness, sequence numbers, and idempotent command handling.",
          verify:
            "Replay old messages and inject malformed sequences; confirm the controller rejects them without changing safety state.",
        },
        {
          threat:
            "A routine user or compromised scheduler requests an action that bypasses physical safety interlocks.",
          control:
            "Keep safety guards in the trusted local controller and authorize maintenance actions through separate privileged roles.",
          verify:
            "Attempt movement with open doors, overweight load, and stale sensors from every role and confirm safety denial.",
        },
        {
          threat:
            "A network outage leaves remote commands queued and later executes them unexpectedly.",
          control:
            "Use expiring commands, bounded queues, explicit connection health, and deterministic local safe-state fallback.",
          verify:
            "Disconnect the dispatcher during queued commands and confirm stale work expires while local safety service continues.",
        },
      ],
      quiz: quizFor("lld-elevator", [
        {
          question: "How does LOOK differ from SCAN?",
          choices: [
            "LOOK reverses after the last request in its direction; SCAN continues to an endpoint",
            "LOOK serves only one floor",
            "SCAN ignores all pending stops",
            "They are identical algorithms",
          ],
          answerIndex: 0,
          explanation:
            "LOOK avoids unnecessary travel beyond the last useful stop, while SCAN sweeps to the endpoint before reversing.",
        },
        {
          question: "Which structure supports efficient ordered stop management?",
          choices: [
            "An unindexed array scanned for every request",
            "An ordered set or balanced tree keyed by floor",
            "A hash set with no ordering",
            "A single global boolean",
          ],
          answerIndex: 1,
          explanation:
            "Ordered stop collections support insertion, removal, next-stop lookup, and direction changes efficiently.",
        },
        {
          question: "What is essential for reliable scheduler tests?",
          choices: [
            "Real building construction",
            "An injected clock and deterministic sensor interfaces",
            "Random failure injection on every step",
            "Skipping illegal transition tests",
          ],
          answerIndex: 1,
          explanation:
            "Deterministic time and sensor inputs make complex motion sequences reproducible and precisely assertable.",
        },
        {
          question: "What should remote authorization never override?",
          choices: [
            "Display brightness",
            "Local safety interlocks such as door-closed and load checks",
            "Scheduling preferences",
            "Idle-car parking",
          ],
          answerIndex: 1,
          explanation:
            "Authorization decides who may request an action; the trusted controller must still reject physically unsafe actions.",
        },
      ]),
    },
  ],
};

type LessonSeed = (typeof trackCaseStudiesData.lessons)[number];

const wordCount = (value: string): number => (value.match(/\S+/g) ?? []).length;

function toLesson(seed: LessonSeed): Lesson {
  return {
    id: seed.id,
    slug: seed.id,
    trackId: "case-studies",
    title: seed.title,
    summary: seed.summary,
    minutes: LESSON_MINUTES[seed.id] ?? 14,
    storyHook: STORY_HOOKS[seed.id] ?? seed.summary,
    prerequisites: PREREQUISITES[seed.id] ?? ["single-server"],
    steps: seed.steps.map((entry, index): LessonStep => {
      const story = `${entry.story} ${STORY_EXTENSIONS[seed.id]?.[index] ?? "The analogy keeps the user's promise visible while the design makes each hidden responsibility explicit and testable."}`.trim();
      const engineer = wordCount(entry.engineer) < 90
        ? `${entry.engineer} This boundary should be visible in tests and operational telemetry, not only in the design document.`
        : entry.engineer;
      return {
        id: `${seed.id}-step-${index + 1}`,
        title: entry.title,
        story,
        engineer,
        visualId: entry.visualId as LessonStep["visualId"],
        visualCaption: visualCaption(story),
      };
    }),
    security: seed.security.map(
      (entry, index): SecurityPractice => ({
        id: `${seed.id}-security-${index + 1}`,
        title: practiceTitle(entry.threat),
        threat: entry.threat,
        control: entry.control,
        verify: entry.verify,
      }),
    ),
    quiz: seed.quiz,
  };
}

export const trackCaseStudies: Track = {
  id: trackCaseStudiesData.id,
  slug: trackCaseStudiesData.slug,
  title: trackCaseStudiesData.title,
  summary: trackCaseStudiesData.description,
  accent: "amber",
  lessons: trackCaseStudiesData.lessons.map(toLesson),
};

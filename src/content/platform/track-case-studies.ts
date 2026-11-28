import type {
  Lesson,
  LessonStep,
  QuizKind,
  QuizQuestion,
  SecurityPractice,
  Track,
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
            "Imagine a coat-check counter at a stadium. Almost everyone arrives with one coat and leaves with one coat, but the room must still survive the minute when an entire section departs together. A URL shortener is the same: creating a link is occasional, while reading one may happen millions of times after a popular post goes viral. If you size only for the coat check-in desk, the exit hallway jams before the storage room is even full. At halftime, the coat desk finally catches up while the exit gates empty in parallel; two lines form, and each attendant can see which queue needs another lane.",
          engineer:
            "Start with explicit assumptions rather than imaginary precision: suppose one hundred million new links per month and one thousand redirects per creation over a link's lifetime. That is roughly forty writes per second on average and tens of thousands of redirects per second, with bursts perhaps ten times higher. Store the original URL, short key, creator, expiry, and a few metadata fields; even at one kilobyte per record, a hundred million links is only hundreds of gigabytes before indexes and replicas. Redirects dominate, so the read path must be cacheable and independent of expensive uniqueness checks.",
          visualId: "traffic-flow",
          visualCaption: "Traffic flows left to right from clients through a load balancer and two API lanes to the database. Compare the moving dots with the database endpoint: redirect reads, not link creation, should dominate the hot path.",
        },
        {
          title: "Create short keys that stay unique at scale",
          story:
            "A hotel cannot hand every guest the same room key and hope the corridor sorts itself out. Short links need names that are easy to type but still distinct across many machines. Generating them with one global counter sounds tidy until that counter becomes the one receptionist everyone must ask. The useful trick is to let each desk issue keys from its own numbered sequence, then mix in a little identity so two desks never print the same label. Each receptionist keeps a numbered pad beside a desk letter, so a guest can trace a key back to its issuing desk without reading the guest's name.",
          engineer:
            "Use a key space larger than the expected link population and encode an opaque identifier, for example base62 output from a distributed unique-ID generator. A hash of the full URL is attractive for deduplication, but truncation introduces collisions and the same URL under different campaigns may need different keys. Reserve a unique constraint on the short key and treat collisions as retryable creation failures. Avoid exposing creation timestamps or user identifiers in the key. A Bloom filter can cheaply reject probably-unused keys before a durable uniqueness write, but a false positive only means an extra check, never permission to create.",
          visualId: "bloom-hll",
          visualCaption: "The bit array fills as keys are added while the approximate count rises. Read the highlighted bits as a fast probably-unused check; a set bit never replaces the database uniqueness constraint.",
        },
        {
          title: "Serve redirects from a bounded hot cache",
          story:
            "When a concert announces an encore, thousands of people ask for the same exit at once. Rechecking the building directory for every person is silly; a volunteer at the door can answer the popular question immediately. The short-link redirect service needs that volunteer too. A small set of viral links can produce a huge share of clicks, and the cache turns those clicks into memory reads while the database continues serving the long tail. When the volunteer misses a shift, the doorman checks the directory once and writes the answer on a board that expires before the next concert.",
          engineer:
            "Put a shared cache in front of the key-to-URL lookup, using an expiry that respects the link's own lifetime and a negative-cache entry for recently missing keys. A cache hit should return a redirect response without touching the relational primary. Because traffic is often extremely skewed, even a modest cache can offload most redirects, but measure hit ratio by key and by tenant rather than assuming popularity. On a miss, use request coalescing so a thundering herd does not stampede the database. If the cache is unavailable, fail over to the origin with bounded concurrency and shed low-value analytics rather than breaking redirects.",
          visualId: "cache-ring",
          visualCaption: "The cache ring marks one warm slot as a hit and an empty slot as a miss routed to disk. Read the warm count to estimate how many redirects avoid the origin.",
        },
        {
          title: "Separate durability, analytics, and deletion",
          story:
            "A library keeps a permanent catalogue, but it records borrowed books on a separate checkout sheet. Asking the catalogue to remember every footstep would slow every search and make the shelves impossibly messy. A shortener should persist the mapping once, then let asynchronous records explain where clicks came from. The redirect should not wait for an analytics pipeline to approve that someone followed a link. After the show, a clerk totals the checkout sheet into a weekly report while the catalogue remains available for lost-ticket claims and the next event.",
          engineer:
            "Persist mappings in a replicated store, partitioned by short key if the write volume eventually outgrows one primary. Publish click events to a queue after the redirect decision, with timestamp, coarse geography, referrer category, and user-agent class; keep raw identifiers out unless retention and consent require them. Workers can aggregate counts into a column store. Expiration may be lazy, scheduled, or driven by a retention job, but every path must stop resolving expired keys. Deleting a mapping should invalidate the cache and publish a tombstone so workers do not resurrect it. Backups need restore drills because a redirect database without recoverable mappings is just a very fast error page.",
          visualId: "queue-workers",
          visualCaption: "A producer feeds a queue that drains into three workers; later steps add a dead-letter branch. Follow an item from left to right to see why click analytics can lag without blocking redirects.",
        },
        {
          title: "Harden links against enumeration and abuse",
          story:
            "A cloakroom ticket should identify one coat, not reveal the owner's name, phone number, or every other coat in the room. Short URLs are public labels, so attackers can try many of them if the namespace is small or responses leak private data. The service must be generous to ordinary sharing and stingy to automated harvesting. Think of the redirect endpoint as a door with a peephole: it shows the destination, not the security camera footage behind it. A visitor photographs another guest's ticket, but the attendant still asks for the claim stub before revealing which coat it opens.",
          engineer:
            "Use high-entropy opaque keys and rate-limit creation by authenticated identity, with bot resistance for anonymous campaigns. Validate destination schemes, block credentials embedded in URLs, and re-check reputation without making the synchronous redirect depend on a slow external service. Return uniform responses for missing, expired, and blocked links so enumeration cannot infer private state. Apply authorization to management endpoints because knowing a short key must not grant permission to edit it. Keep analytics aggregated, redact query secrets from logs, and verify controls with synthetic private links, rotated credentials, and a test that unauthorized update attempts leave the mapping unchanged.",
          visualId: "threat-defense",
          visualCaption: "Untrusted input meets a shield before the trusted service, switching from inspecting to blocked. Read the shield as the validation, authorization, and audit boundary around link management.",
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
          kind: "story-match",
          question: "In the coat-check story, why plan separate capacity for arrivals and departures?",
          choices: [
            "Because link creation and redirect reads are different workloads with different peaks",
            "Because each redirect should be replicated before it is cached",
            "Because click events must be committed before the redirect is returned",
            "Because cache hits and link creations must share one capacity pool",
          ],
          answerIndex: 0,
          explanation:
            "The coat check-in and departure surge correspond to occasional writes and repeated redirects; each needs its own peak assumption.",
        },
        {
          kind: "tradeoff",
          question: "A team proposes replacing the unique short-key constraint with distributed IDs alone. Which tradeoff is correct?",
          choices: [
            "It removes collision handling but weakens the final uniqueness guarantee",
            "It improves key entropy but makes redirects uncacheable",
            "It reduces coordination but still needs durable uniqueness enforcement",
            "It eliminates retries but increases analytics lag",
          ],
          answerIndex: 2,
          explanation:
            "Distributed IDs reduce coordination and collisions, but only a durable constraint proves that no duplicate key can be published.",
        },
        {
          kind: "scenario",
          question: "A Bloom filter says a candidate key may already exist, but the database has no row. What should creation do?",
          choices: [
            "Reject permanently because Bloom filters are exact",
            "Perform the authoritative uniqueness check and insert if free",
            "Skip the constraint and publish the mapping",
            "Treat the Bloom filter as the authoritative index and drop the database check",
          ],
          answerIndex: 1,
          explanation:
            "A Bloom false positive means extra work at the authoritative store, not a reason to reject or bypass uniqueness.",
        },
        {
          kind: "security",
          question: "A private link's short key leaks in a support screenshot. Which response best protects the tenant boundary?",
          choices: [
            "Allow public redirects but expose owner details for debugging",
            "Require a longer key after the leak",
            "Treat key possession as edit permission",
            "Authorize management separately and keep missing, expired, and denied responses uniform",
          ],
          answerIndex: 3,
          explanation:
            "Public resolution and private management are separate permissions; uniform responses avoid leaking tenant state.",
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
            "A switchboard operator can keep many lines open while speaking on only a few at once. Chat traffic looks similar: hundreds of thousands of clients may maintain sockets, but the number of messages crossing the building each second is a different measurement. Counting only messages makes the socket tier disappear from the plan; counting only sockets makes the storage tier look far too small. A city-sized chat service needs both counts on the whiteboard. During a stadium announcement, every line stays open even though only a few people speak; a reconnect storm then arrives when the network resets.",
          engineer:
            "Assume, for example, a million concurrent connections, ten messages per active user per day, and fan-out to a typical channel of one hundred online members. Connection memory and file descriptors shape gateway sizing, while channel membership and message size shape persistence and delivery. A single socket server can multiplex many connections with an event loop, but heartbeats, TLS state, and backpressure still consume resources. Partition channels across gateway nodes and keep a directory mapping channel to owner. Capacity reviews should test connection churn separately from message bursts because reconnecting a million clients can create a second traffic spike.",
          visualId: "realtime-channels",
          visualCaption: "Polling, SSE, and WebSocket columns compare event cadence and connection cost. Read left to right: persistent sockets reduce repeated handshakes but still require capacity for millions of open connections.",
        },
        {
          title: "Persist messages before acknowledging them",
          story:
            "A post office does not promise delivery because a letter entered the sorting room; it promises after the letter is recorded and assigned a route. In chat, the little green check should mean the message has a durable home. If the server acknowledges first and crashes before writing, a user sees a sent message that disappears for everyone else. Trust is much harder to repair than the lost row is to retransmit. The sorter stamps each letter with a route number and files it before the sender leaves; a later delivery attempt refers to that same stamped copy.",
          engineer:
            "Write each message to a durable log keyed by channel and assign a per-channel sequence number. The acknowledgement can follow a replicated commit, not merely an in-memory enqueue. Partition by channel so all messages for one conversation retain order without forcing unrelated channels through one writer. Store message bodies in a system optimized for append and range reads, with indexes for author, mentions, and moderation state added only where query patterns justify their write cost. Client-generated message IDs make retries idempotent, and sequence gaps let clients detect missing events instead of silently displaying an incomplete history.",
          visualId: "kafka-partitions",
          visualCaption: "Three topic partitions show different lag values feeding a consumer group. Read each horizontal backlog bar as work waiting between durable append and downstream consumption.",
        },
        {
          title: "Fan out delivery without blocking persistence",
          story:
            "A newspaper prints one edition and then distributes copies through many routes. It should not wait for every reader to finish reading before printing the next edition. Chat persistence is the printing press; delivery is the distribution network. Once a message is safely stored, separate workers can push it to gateways, update unread counts, and run moderation. Each route can slow down without stopping the press. If one carrier van breaks down, the other routes continue, and the undelivered bundles remain on the loading dock for the next shift with their route numbers intact.",
          engineer:
            "Consume the durable channel log with delivery workers that maintain subscription state for each online gateway. Send only to channels with subscribers, and coalesce presence changes rather than broadcasting every heartbeat. Per-connection outbound buffers need high and low water marks: when a slow client fills its buffer, disconnect or resync instead of consuming unbounded memory. Offline clients fetch history by sequence cursor when they reconnect. Delivery is at least once at the transport boundary, so consumers deduplicate on message ID. Workers can scale by partition count, but hot celebrity channels require careful placement because a single partition is an ordering boundary, not an unlimited throughput promise.",
          visualId: "queue-workers",
          visualCaption: "A queue fills as producers outpace three workers, then exposes a dead-letter route. Follow the arrows to distinguish accepted message work from delivery that needs retry or isolation.",
        },
        {
          title: "Make ordering and recovery explicit",
          story:
            "Two people talking over walkie-talkies can both press transmit at once, and the radio does not magically decide whose thought came first. Chat has the same problem: messages from different users may arrive at different times, while messages from one client should not leapfrog their own earlier send. Users need a simple, stable order, not the impossible dream of recreating a perfectly synchronized global conversation. After a radio battery dies, the operator asks for the last number heard and retrieves only the missing transmissions from the recorder before the conversation resumes.",
          engineer:
            "Use channel sequence numbers assigned by the channel writer as the canonical order. Clients may show optimistic pending messages, then reconcile them when the server returns the durable ID. Typing indicators and presence are ephemeral and may be dropped; message content is not. On gateway failure, clients reconnect with their last acknowledged sequence and fetch any gap from history. Replicas must preserve sequence or use a consensus-backed writer before advertising failover. Avoid global ordering across channels because it adds coordination and latency without improving the user experience. A bounded replay window and pagination keep recovery cheap even when a client was offline for days.",
          visualId: "replication",
          visualCaption: "A primary replicates to two followers while one replica shows lag. Read the lag label and warning color to see why sequence-preserving failover cannot treat every replica as interchangeable.",
        },
        {
          title: "Protect membership, content, and metadata",
          story:
            "A private club needs a guest list at the door, not merely a locked front gate. If the bouncer checks only that someone has an account, strangers can still walk into a members-only room. Chat systems have the same layered boundary: the connection is authenticated, the channel has its own authorization policy, and the message delivery path must enforce both. The bouncer should also avoid announcing the names of every private room in the building. A member's invitation expires at midnight, so the bouncer crosses out the name and the usher stops that room's microphone feed immediately.",
          engineer:
            "Authenticate the socket once, then authorize channel subscribe, history fetch, and message send against current membership on every relevant operation. Revoked members must be removed from live subscriptions, not only blocked on the next page load. Use capability-free random channel IDs, but do not treat them as authorization. Protect against message enumeration with uniform errors and bounded history pagination. Scan attachments asynchronously, apply moderation before wide fan-out where possible, and redact tokens from message logs. Verify with membership changes during active connections, cross-channel replay attempts, and a test that deleted messages are removed from search and caches according to retention policy.",
          visualId: "threat-defense",
          visualCaption: "Untrusted requests are inspected and blocked before the trusted chat service. Read the shield as current-membership checks applied to subscribe, history, send, and attachment paths.",
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
          kind: "scenario",
          question: "A gateway crashes after buffering a message but before it reaches durable storage. What should the client observe?",
          choices: [
            "A sent acknowledgement because memory is sufficient",
            "No durable sent acknowledgement; retry with the same client message ID",
            "A delivered state for every channel member",
            "A moderation decision before persistence",
          ],
          answerIndex: 1,
          explanation:
            "A sent state is a durability promise; an in-memory buffer cannot satisfy it, so the client retries idempotently.",
        },
        {
          kind: "story-match",
          question: "In the sorting-room story, what does the stamped route number represent?",
          choices: [
            "The socket connection lifetime",
            "The gateway that displayed the message",
            "The moderation queue position",
            "The durable per-channel sequence used for replay",
          ],
          answerIndex: 3,
          explanation:
            "The route number is the stable position in the channel log that lets clients fetch exactly the messages they missed.",
        },
        {
          kind: "security",
          question: "A user is removed from a private channel while their socket remains open. What is required?",
          choices: [
            "Remove the live subscription and deny subsequent history fetches using current membership",
            "Wait for the socket to disconnect naturally",
            "Keep delivery until the next daily authorization sync",
            "Rename the channel so old clients cannot find it",
          ],
          answerIndex: 0,
          explanation:
            "Revocation must affect both live delivery and replay; checking only the next page load leaves the old socket exposed.",
        },
        {
          kind: "tradeoff",
          question: "Why avoid one global ordering log for all channels?",
          choices: [
            "Global order improves every user latency",
            "Global order removes the need for deduplication",
            "It coordinates unrelated channels and creates a hot throughput boundary",
            "It simplifies client cursors by giving every channel one shared offset",
          ],
          answerIndex: 2,
          explanation:
            "Per-channel ordering matches the user contract while avoiding coordination between conversations that do not need it.",
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
            "A movie theater does not measure success by counting the posters on the wall; it measures how many people watch how many minutes. Streaming capacity begins with viewing hours and bitrate. A million short phone clips and a million two-hour films can produce the same request count while differing by orders of magnitude in network traffic. The projection booth must be sized for the film, not the ticket stub. For a championship final, the ticket office still sells the same number of seats, yet every screen streams a different camera angle for two hours.",
          engineer:
            "Assume a catalog of one hundred thousand hours of video, a viewing mix concentrated in popular titles, and an average adaptive bitrate of a few megabits per second. One million concurrent viewers at two megabits per second imply roughly two hundred fifty gigabytes per second of egress before protocol overhead, so origin servers cannot directly serve the audience. Storage depends on renditions: transcoding one source into several bitrates can multiply bytes by several times. Estimate cache hit ratio and regional viewer distribution before choosing CDN commitments, and treat peak events separately from monthly averages because sports and launches create geographically concentrated bursts.",
          visualId: "traffic-flow",
          visualCaption: "Client traffic passes through a load balancer, two API lanes, and a database. Here the diagram is conceptual: read the growing flow as viewer demand that must be served mostly from CDN bytes, not API database calls.",
        },
        {
          title: "Turn uploads into asynchronous media jobs",
          story:
            "A bakery does not ask the customer to wait beside the oven while every loaf is mixed, proved, and baked. The customer hands over ingredients, receives a receipt, and returns when the product is ready. Video upload works the same way: accepting the file is quick, but scanning, transcoding, captioning, and packaging can take minutes. A queue keeps the counter moving while the kitchen handles each order at a sustainable pace. The receipt carries an order number, and a baker who drops a tray marks that attempt failed instead of mixing the same dough again.",
          engineer:
            "Upload large files directly to object storage using short-lived signed upload URLs, then enqueue a media job containing the object key and expected checksum. Workers validate codecs, scan content, extract metadata, generate thumbnails and captions, and transcode into a bitrate ladder. Make each stage idempotent and record attempt state so retries do not create duplicate publications. Separate queues for quick previews and expensive high-resolution renditions prevent a backlog of small uploads from starving long films. The source object should be immutable; a replacement upload gets a new object version so an in-flight job cannot read changing bytes.",
          visualId: "queue-workers",
          visualCaption: "Uploads enter a queue and fan out to processing workers, with failed jobs diverted to dead letter. Follow one media object through the workers to see acceptance separated from scanning, captioning, and transcoding.",
        },
        {
          title: "Package adaptive streams and authorize playback",
          story:
            "A cinema gives each viewer a ticket tied to a seat and a time, not a master key to the projector room. Adaptive video needs many small segments, and granting open access to the manifest often grants access to the whole ladder. A sound design signs the playback request at the edge and lets authorized viewers fetch only the media they are entitled to watch. The projector still runs at full speed; the ticket office simply becomes part of the projection path. At the door, a usher checks the ticket's date and auditorium before pointing to a corridor; the projector itself never asks who is watching.",
          engineer:
            "Produce HLS or DASH manifests that reference short media segments. Use signed playback tokens or cookies scoped to the asset, permitted resource path, and expiry; the CDN verifies signatures before serving from cache. Keep private manifests off public object storage, and rotate signing keys with overlapping validity during rollout. Segment URLs should be stable and cacheable across viewers when the entitlement is the same, avoiding a cache key per token. Measure startup time, rebuffer ratio, and bitrate distribution because a technically correct pipeline can still feel broken. Signed upload URLs must remain separate from playback authorization so an uploader does not automatically gain publishing rights.",
          visualId: "threat-defense",
          visualCaption: "An untrusted playback request reaches a shield before the trusted media service. Read the shield as edge signature verification: only a valid asset-scoped ticket lets the CDN serve cached bytes.",
        },
        {
          title: "Use the CDN as a capacity system",
          story:
            "A chain of local warehouses stocks popular goods close to customers. The central factory still matters, but it no longer ships every parcel across the country. A CDN is that warehouse network for video. The hardest question is not whether caching works, but whether each region has enough of the right segments before a crowd presses play. A cold cache during a global launch is an empty shelf with an excellent supply chain behind it. Before a global premiere, regional managers stock the opening scenes in local warehouses, then watch which aisles run empty during the first rush.",
          engineer:
            "Set cache keys around immutable segment paths, normalized manifests, and only entitlement-relevant variation. Pre-warm popular new releases in expected viewer regions, and use origin shielding so a regional miss does not become a global origin stampede. Configure tiered expiry: long-lived immutable segments, shorter-lived manifests, and explicit invalidation for rights changes. Track byte hit ratio, origin egress, and regional rebuffering rather than relying on request hit ratio alone. Protect origin credentials with least-privilege CDN access, and verify that a revoked entitlement stops new playback within the token validity window without making every segment request depend on a slow entitlement database.",
          visualId: "cache-ring",
          visualCaption: "The cache ring marks warm segments and a miss that falls through to disk. Read the warm count and cold-read arrow as regional CDN coverage; a miss at a launch can still hurt viewers even when the origin is healthy.",
        },
        {
          title: "Operate metadata, recommendations, and failure recovery",
          story:
            "The projection booth is only half the theater; the other half is the catalog that tells viewers what exists and whether it is ready. A player can show a green thumbnail while the first segment is still missing, which feels worse than an honest processing state. Streaming reliability therefore joins media state to user-facing metadata, with clear transitions from uploaded to publishable to unavailable. Operators need to see the whole journey, not just the CDN's green dashboard. When one projector fails, the booth switches to the previous approved cut and marks the title as processing again until the replacement reels arrive.",
          engineer:
            "Keep metadata in a replicated database keyed by video ID, with processing state, owner, visibility, rendition readiness, and publication version. Update metadata atomically only after required renditions and manifests are durable. Index search and recommendations asynchronously so publication is not coupled to an analytics pipeline. Monitor job age, queue depth, transcode failure rate, manifest errors, startup latency, and CDN origin load with actionable alerts. If a rendition is corrupt, roll back to the last published manifest version and serve a lower bitrate while reprocessing. Encrypt source and private segments, audit administrative changes, and verify restore procedures for both the media objects and the metadata that makes them discoverable.",
          visualId: "deploy-strategies",
          visualCaption: "The rollout bar moves from stable to new, then rolls back when errors rise. Read the percentages as publication versions: a corrupt rendition should return viewers to the last approved manifest while reprocessing continues.",
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
          kind: "tradeoff",
          question: "Why separate quick-preview and high-resolution transcode queues?",
          choices: [
            "So previews can bypass malware scanning",
            "So all renditions share one predictable worker pool",
            "So small jobs are not starved by long films while each queue gets appropriate capacity",
            "So source objects can be reused across upload attempts",
          ],
          answerIndex: 2,
          explanation:
            "Separate queues give different job durations appropriate backpressure and prevent a long transcode backlog from blocking previews.",
        },
        {
          kind: "scenario",
          question: "A player requests an expired signed segment URL. What should the CDN do?",
          choices: [
            "Deny before serving bytes, even if the segment is cached",
            "Serve from cache because authorization already happened",
            "Redirect to an unsigned manifest",
            "Check the token asynchronously after streaming begins",
          ],
          answerIndex: 0,
          explanation:
            "Cache presence does not extend an entitlement; signature and expiry checks happen before the cached object is released.",
        },
        {
          kind: "security",
          question: "Which control prevents an uploader from overwriting bytes used by an active transcode?",
          choices: [
            "Use mutable public object keys",
            "Give upload and publish roles identical permissions",
            "Rely on object versioning without separating write permissions",
            "Use isolated immutable upload prefixes and publish only validated versions",
          ],
          answerIndex: 3,
          explanation:
            "Immutable source versions and separate publish permissions keep in-flight jobs stable and prevent direct writes to serving paths.",
        },
        {
          kind: "story-match",
          question: "In the cinema story, what corresponds to a signed playback token?",
          choices: [
            "The projector's lamp",
            "A ticket scoped to an asset and time",
            "The number of seats in the theater",
            "The film's source reel",
          ],
          answerIndex: 1,
          explanation:
            "The ticket grants a scoped, temporary right to view the media without handing the viewer control of the projector room.",
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
            "A neighborhood newsletter can hand a copy to every house because the editor has only a few hundred readers. A national newspaper cannot personally deliver a copy to everyone who follows a famous columnist; it prints once and lets readers pull the page. Social feeds contain both neighborhoods and celebrities. Picking one delivery strategy for both either wastes enormous storage or makes ordinary posts feel slow. The architecture needs a decision about who follows whom. The editor keeps a neighborhood delivery route for familiar names, while a columnist's single article appears as a link on every reader's board.",
          engineer:
            "Estimate average followers per author, daily posts, active readers, and feed-read frequency. Assume ordinary accounts have tens to hundreds of followers while a small number of creators have millions. Write-time fan-out copies a post into follower timeline lists and gives fast reads, but multiplies storage by follower count. Read-time fan-out merges followed authors at request time and saves write amplification, but makes freshness and latency depend on fan-in size. A hybrid approach writes for ordinary accounts and merges celebrity posts at read time, with the threshold tuned from measured distributions rather than copied from another product.",
          visualId: "traffic-flow",
          visualCaption: "Client requests fan through a load balancer to two API lanes before reaching storage. Read the split as distinct feed workloads: ordinary precomputed timeline reads and celebrity merge traffic can scale independently.",
        },
        {
          title: "Build fan-out workers that can catch up",
          story:
            "A restaurant kitchen prepares ingredients once, then passes them to several stations for plating. It does not cook a separate meal for every waiter. Feed fan-out should similarly create one durable post, then distribute references to follower timelines through workers. If the plating station falls behind, the kitchen keeps a clear queue of unfinished plates instead of losing orders or slowing every new dish to the speed of the weakest station. If a waiter drops one plate, the kitchen still has the order ticket and can send a replacement without starting the whole dinner again.",
          engineer:
            "Persist the post, then publish an event keyed by author to a durable queue. Fan-out workers read the follower list in bounded batches, insert lightweight timeline entries keyed by recipient and timestamp, and checkpoint progress. Make inserts idempotent because queue delivery can repeat. Partition work by recipient hash or author shard depending on the dominant bottleneck, and cap batch sizes so one celebrity does not monopolize a worker. Timeline storage should evict old entries by policy while the canonical post remains durable. Measure fan-out lag, queue depth, duplicate rate, and per-recipient write rate; a falling-behind worker turns a fresh feed into a stale feed even when reads remain fast.",
          visualId: "queue-workers",
          visualCaption: "A durable queue feeds fan-out workers and eventually a dead-letter path. Follow an entry from post creation to recipient timelines; idempotent retries should not multiply the same feed card.",
        },
        {
          title: "Read hybrid timelines with predictable ranking",
          story:
            "A personal bulletin board contains pinned notes from close friends and a few linked pages from famous publishers. You do not need a physical copy of every famous page on your wall; you can fetch those pages when you look. A hybrid feed works like that board. Most notes are pre-placed for speed, while a bounded set of high-fan-out sources is merged at reading time. The challenge is making the mixture feel like one coherent page rather than two systems arguing. A reader pins local notices at home but walks to the library for the columnist's latest page, then arranges both on one desk.",
          engineer:
            "Store precomputed entries with post ID, author, creation time, and minimal ranking features in a recipient-partitioned timeline. At read time, fetch a candidate window from that timeline and merge candidates from followed celebrity authors using their recent-post indexes. Deduplicate by post ID, apply visibility rules before ranking, and paginate with a stable cursor. Ranking should be bounded in candidate count so a long session cannot trigger unlimited work. Cache computed pages briefly keyed by viewer cohort and feed cursor, but never cache a private feed under a shared key without enforcing authorization. Keep freshness visible in telemetry and bound celebrity merge latency so one slow source cannot hold the whole response.",
          visualId: "sharding",
          visualCaption: "Four shards highlight a hot partition and later split it into two. Read this as a reminder to isolate recipient timeline storage; the hybrid celebrity merge itself needs a bespoke diagram.",
        },
        {
          title: "Enforce privacy before fan-out and after deletion",
          story:
            "A clerk should not copy a private letter into a hundred public mailboxes and then hope nobody reads it. Once a feed entry is distributed, a privacy mistake becomes a cleanup problem across many stores. Authorization belongs at the source and at every read, while deletion needs a deliberate propagation path. The safest envelope is the one that never leaves the sender's desk when it was marked private. A sealed letter marked private stays in the sender's drawer, and any copies already mailed are recalled with the same tracking number.",
          engineer:
            "Evaluate audience, blocks, muted keywords, and author visibility before writing timeline entries. Store a policy version with cached feed pages and invalidate them when a relevant relationship or visibility policy changes. Deletion should remove the canonical post, fan out tombstones, expire cached pages, and eventually remove search and recommendation copies. For urgent privacy incidents, a synchronous deny-list checked at read time can stop exposure before physical cleanup finishes. Avoid treating possession of a post ID as permission. Verify with cross-account reads, follower removal during fan-out, blocked-author searches, and deleted-post replay through every timeline and cache layer.",
          visualId: "threat-defense",
          visualCaption: "Untrusted requests meet a shield before trusted feed storage. Read the shield as audience and block-policy checks applied before fan-out and again when cached timelines are read.",
        },
        {
          title: "Plan for hot keys, failures, and growth",
          story:
            "A relay race fails if every runner must wait for the slowest person's watch. Feed systems fail when one enormous account, one stale cache, or one lagging worker forces unrelated readers to wait. Good feed design isolates the celebrity, contains the cache outage, and makes lag visible. It is better to show a slightly older private feed than to mix in someone else's post while trying to look fresh. During a printer breakdown, the editor assembles a small front page from fresh links, while the missing bulk deliveries remain visible as delayed bundles.",
          engineer:
            "Shard timelines by recipient so popular authors do not create a single storage partition. Rate-limit extreme publishers and break very large fan-outs into resumable batches. Apply backpressure when the fan-out queue grows, prioritizing recent posts and time-sensitive events. Degrade gracefully to on-demand merging if timeline writes are unavailable, while preserving authorization. Track p95 feed latency, fan-out age, timeline write failures, cache hit ratio, and privacy-policy invalidation lag. Load tests should include a celebrity post, a broad reconnect event, and cache loss. Capacity planning should state assumptions about follower skew, active readers, and acceptable freshness, then revisit them when product behavior changes.",
          visualId: "consistent-hash",
          visualCaption: "The consistent-hash ring assigns keys to four nodes, then localizes remapping when one node leaves. Read moved keys as recipient-shard redistribution that should not rewrite every timeline entry.",
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
          kind: "security",
          question: "A public post becomes private after fan-out. What is the safest immediate protection?",
          choices: [
            "Delete only the canonical post",
            "Wait for all timeline partitions to compact",
            "Rely on the post ID being hard to guess",
            "Use a read-time deny path while tombstones and cache invalidations propagate",
          ],
          answerIndex: 3,
          explanation:
            "A deny path stops new exposure immediately while asynchronous cleanup removes the many derived copies.",
        },
        {
          kind: "story-match",
          question: "Why does the newsletter deliver copies locally but let readers pull the national columnist's page?",
          choices: [
            "Celebrity pages cannot be cached",
            "It mirrors hybrid fan-out: precompute ordinary timelines and merge high-fan-out authors at read time",
            "It guarantees a single global post order",
            "It lets ordinary authors skip follower indexes entirely",
          ],
          answerIndex: 1,
          explanation:
            "The two delivery scenes map directly to write-time fan-out for ordinary authors and bounded read-time merging for celebrities.",
        },
        {
          kind: "scenario",
          question: "A fan-out worker redelivers an event after its checkpoint. What should timeline insertion do?",
          choices: [
            "Insert a new card with a new timestamp",
            "Discard the post because workers must be exactly once",
            "Upsert by recipient and post ID so retries remain idempotent",
            "Recompute every follower list from scratch",
          ],
          answerIndex: 2,
          explanation:
            "At-least-once queues repeat work, so recipient-and-post identity prevents duplicate cards without assuming exactly-once delivery.",
        },
        {
          kind: "tradeoff",
          question: "What is the main cost of read-time fan-out for very large follow sets?",
          choices: [
            "Read latency and candidate merge work grow with fan-in",
            "Write amplification grows with follower count",
            "Canonical posts can no longer be durable",
            "It requires every follower relationship to be stored in one global partition",
          ],
          answerIndex: 0,
          explanation:
            "Read-time merging saves writes but moves work into the request path, so candidate windows and merge latency must be bounded.",
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
            "A busy airport display updates departure boards every few seconds, but it does not rewrite the airport's master map for each plane movement. Driver locations are the same kind of fast-changing signal: valuable for matching, dangerous as a hot database row. If every heartbeat updates the permanent trip record, the database spends its life tracking cars instead of recording decisions. The architecture needs a live map layer and a calm system of record. During a terminal closure, the departure board keeps changing while the permanent airport map remains posted, each serving a different decision.",
          engineer:
            "Assume tens of thousands of active drivers in a metro, location updates every few seconds, and rider requests arriving in bursts around events. That is thousands of updates per second per large city, with much higher write counts than trip creations. Push updates through a regional ingest service into an in-memory geospatial index, then retain a bounded recent trail for matching and dispute resolution. Store only necessary coarse history according to retention policy. Partition by city or geohash tile so local load does not contend globally, and measure update lag separately from request latency because a matching decision based on a minute-old location can be technically successful and operationally wrong.",
          visualId: "realtime-channels",
          visualCaption: "Polling, SSE, and WebSocket lanes compare update cadence and connection cost. Read the continuous WebSocket lane as a model for frequent driver location updates feeding a live regional read model.",
        },
        {
          title: "Search nearby drivers with spatial indexes",
          story:
            "Finding a nearby taxi should not mean checking every taxi in the country. A city map divides the area into neighborhoods, and the dispatcher checks adjacent neighborhoods around the rider. If the radius crosses a neighborhood border, the dispatcher peeks over the fence. Geospatial indexing is that disciplined local search: reduce the candidates first, then apply distance and availability rules. The naive version asks every driver, which is both slow and expensive. The dispatcher starts with the rider's neighborhood, checks the two adjoining blocks, then measures the actual road distance before calling a car.",
          engineer:
            "Use geohash, H3, or a quadtree to bucket drivers into cells, then query the cells intersecting the search radius. Maintain a per-cell set or sorted index of available drivers and apply exact distance only to candidates. Choose cell size from driver density and typical pickup radius; overly large cells create hot partitions, while tiny cells multiply neighbor lookups. Keep availability changes separate from raw location updates so a driver's cell membership changes are bounded. Use a local read model for matching with replication and failover by region. A consistent-hash assignment of city shards can reduce remapping, but the spatial index must still detect cell crossings.",
          visualId: "consistent-hash",
          visualCaption: "Keys sit around a consistent-hash ring and shift locally when a node disappears. Use it only for city-shard ownership; a bespoke geohash or H3 grid is still required to show neighbor-cell lookup.",
        },
        {
          title: "Match fairly with bounded candidate work",
          story:
            "A dispatcher assigning airport taxis should not stare at the entire queue while the passenger waits. The dispatcher checks a small set of eligible nearby drivers, applies fare and vehicle rules, and makes an offer with a deadline. If nobody accepts, the search expands carefully. Matching is not simply drawing the shortest line; it is a race between rider wait time, driver travel, fairness, and the danger of sending duplicate offers to everyone. The attendant offers the nearest available cab with a two-minute timer, then moves to the next car when the first radio stays silent.",
          engineer:
            "Fetch a bounded candidate set from the spatial index, filter by service eligibility, and score using expected pickup time, fairness, cancellation history, and destination constraints where appropriate. Reserve a driver atomically for a short offer lease so concurrent requests cannot claim the same car. Send offers with expiries and retry the next candidate on rejection or timeout. Use idempotency keys on request creation and deterministic offer IDs so network retries do not create multiple trips. Cap expansion and total matching time; if supply is scarce, return an honest unavailable or queued state rather than holding the rider request indefinitely. Record why a match failed so operators can distinguish no drivers from index lag.",
          visualId: "queue-workers",
          visualCaption: "Trip offers enter a queue and fan out to workers, with rejected work routed to dead letter. Follow an offer through expiry and retry to see bounded matching instead of an open-ended dispatcher loop.",
        },
        {
          title: "Model trip transitions as a guarded state machine",
          story:
            "A boarding pass moves through printed, checked, scanned, and boarded states; it cannot jump directly from printed to landed. A ride has equally meaningful transitions. Treating the trip as one freely editable database row invites double assignment, refund confusion, and impossible states. The state machine is the set of doors through which a trip may move, with a named guard on each door and a receipt for every transition. A gate scans the boarding pass only if its stage is still valid, and a second scan at the next desk returns the same recorded result.",
          engineer:
            "Model requested, matched, accepted, arriving, in-progress, completed, and cancelled states with allowed transitions and versioned conditional writes. A driver accepts an offer only if its lease and trip version still match. Payment authorization and trip completion may span services, so use a saga with compensating actions rather than pretending one distributed transaction exists. Emit durable events through an outbox so the state change and notification intent commit together. Keep the relational trip record authoritative while projections update rider and driver views. Retries must be idempotent, and reconciliation jobs should detect trips stuck in a state beyond their timeout.",
          visualId: "saga-outbox",
          visualCaption: "A service writes an outbox atomically, a relay forwards events, and a retry loop recovers failures. Read the path as trip state plus notification intent committing together before downstream payment or rider updates.",
        },
        {
          title: "Minimize location exposure and survive region failure",
          story:
            "A taxi dispatcher needs to know which car is close, not where that driver parked at home last night. Precision is useful during a trip and unnecessary after it ends. A privacy-conscious design shares the minimum location with the minimum audience for the minimum time. It also needs a backup map: if the regional location service fails, the dispatcher should degrade to an older nearby result, not reveal exact history or strand every rider. If the regional map goes dark, the dispatcher shows a ten-second-old nearby dot with a warning instead of opening the driver's full route history.",
          engineer:
            "Authorize driver location reads by trip relationship and purpose, encrypt transport and storage, and expire precise trails quickly. Return coarse locations outside active matching and suppress driver home-cluster inference from analytics. Rate-limit location and trip lookups, redact logs, and audit administrative access. Replicate metadata across regions but keep live location regional to contain latency and cost. During failure, use stale-but-bounded locations with an explicit confidence marker and disable new assignments if freshness exceeds policy. Test failover with a complete regional index outage, verify that old trails expire, and ensure support tools cannot query arbitrary driver history without approval.",
          visualId: "threat-defense",
          visualCaption: "Untrusted location and trip requests meet a shield before trusted services. Read the shield as purpose-based authorization, precision limits, and retention checks on every location read.",
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
          kind: "story-match",
          question: "In the airport-board story, why keep live locations separate from the permanent trip record?",
          choices: [
            "The board changes rapidly while the durable record preserves slower business decisions",
            "The board must preserve every historical ping for dispute resolution",
            "The trip record should be the authoritative source for real-time matching",
            "Location updates are lower volume than trip creation",
          ],
          answerIndex: 0,
          explanation:
            "The departure board models high-churn telemetry; the permanent airport record models durable trip transitions and evidence.",
        },
        {
          kind: "scenario",
          question: "Two riders receive offers for the same driver at the same moment. Which mechanism prevents double assignment?",
          choices: [
            "A longer matching timeout",
            "A cached list of nearby drivers",
            "A global ordering of all location updates",
            "An atomic expiring offer lease plus conditional trip update",
          ],
          answerIndex: 3,
          explanation:
            "The lease reserves one driver briefly, and the version check ensures acceptance still applies to the current trip state.",
        },
        {
          kind: "tradeoff",
          question: "Why cap candidate expansion during matching?",
          choices: [
            "It guarantees the closest driver is always selected",
            "It bounds rider wait and dispatcher work when supply is scarce",
            "It reduces the need for exact distance checks on every candidate",
            "It allows offer leases to remain valid until the rider responds",
          ],
          answerIndex: 1,
          explanation:
            "Unbounded expansion can turn a supply shortage into an availability outage; a cap returns an honest queued or unavailable state.",
        },
        {
          kind: "security",
          question: "A support user requests a driver's exact route from last week. What should happen?",
          choices: [
            "Return it because support accounts are trusted",
            "Return a coarse route because coarse history needs no authorization",
            "Deny or minimize it under purpose-based authorization and retention policy",
            "Return current live location instead, without checking trip relationship",
          ],
          answerIndex: 2,
          explanation:
            "Historical precision is rarely needed after a trip and must be constrained by purpose, role, audit, and retention.",
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
            "A giant library needs two very different rooms: one for receiving new books and one for answering readers. If every new delivery interrupts every search, the catalogue never settles. A search engine likewise separates ingestion from serving. Capacity planning must account for both the number of documents and the way popular queries repeat. Ten thousand unique searches and ten thousand copies of one query are not the same workload for a ranking service. New donations enter through the loading dock while readers continue at the catalogue desks, and a popular textbook can generate the same question all afternoon.",
          engineer:
            "Assume a corpus of hundreds of millions of documents, a daily change fraction from small updates to substantial recrawls, and query traffic with a heavy head of repeated terms. Storage includes raw documents, postings, positions, and ranking features; posting lists may exceed the original text. Estimate crawl bandwidth, parser throughput, index build cost, and replica count independently. Query QPS should be segmented by cheap term lookups and expensive multi-clause or aggregating queries. Use order-of-magnitude arithmetic to decide whether one search cluster is plausible, then state peak-to-average ratios and the acceptable indexing lag rather than inventing exact machine counts.",
          visualId: "traffic-flow",
          visualCaption: "Traffic flows through a load balancer and two API lanes to storage. Read the split as crawl/index workload separated from latency-sensitive query serving, with popular query terms forming the heavier lane.",
        },
        {
          title: "Crawl and parse without losing source identity",
          story:
            "A museum accepts a donated box only after checking that it belongs in the collection. Search ingestion needs the same discipline: fetch a document, identify its canonical source, parse it safely, and record the version that was actually read. If the crawler silently replaces the catalogue entry with a login page or malformed response, the index becomes confidently wrong. Every document deserves a provenance label, not just a URL. The registrar writes the donor, edition, and checksum on the box, then rejects a water-damaged replacement rather than silently swapping it into the catalogue.",
          engineer:
            "Schedule URLs by freshness, importance, and prior failure, with per-host politeness and bounded concurrency. Fetch into a staging object store carrying final URL, response metadata, checksum, and fetch time. Parse in sandboxed workers with strict size and time limits, extract canonical links and structured metadata, and discard documents that fail validation. Deduplicate by content hash and canonical URL while preserving redirect lineage. Handle retries with conditional updates so a slow old fetch cannot overwrite a newer version. Parser and crawler metrics should distinguish unavailable, changed, duplicate, and rejected content because those categories require different operational responses.",
          visualId: "queue-workers",
          visualCaption: "Crawl fetches enter a queue and move through sandboxed workers; failures go to dead letter. Follow a fetched document to see provenance, validation, deduplication, and conditional publication as separate stages.",
        },
        {
          title: "Build an inverted index for selective retrieval",
          story:
            "The index at the back of a textbook lists the pages containing a word so you do not read every page again. An inverted index does this at industrial scale. It maps terms to postings, and postings may include positions, fields, and ranking signals. Building it is like reorganizing a warehouse by label: retrieval becomes fast, but every new box must be placed on several shelves. The write cost is the price of making reading selective. A warehouse worker labels each arriving box with several index cards, then later merges new cards into sorted drawers without tearing up the old ones.",
          engineer:
            "Tokenize and normalize documents, then emit postings containing document ID, term frequency, positions, field weights, and optional freshness signals. Segment immutable index files and merge them in the background, a log-structured approach that favors sustained ingestion. Use document-ID compression, posting-list compression, and columnar feature storage to reduce I/O. At query time, intersect postings for required clauses, rank a bounded candidate set, and fetch display data only for winners. Choose segment size from merge cost and query latency, and monitor deleted-document overhead. Rebuilding from a canonical store should be a rehearsed capability, not an emergency improvisation.",
          visualId: "search-ranking",
          visualCaption: "The left B-tree rewrites leaf pages while the right LSM appends to memory and flushes sorted runs. Compare the layouts to choose append-friendly immutable segments for sustained indexing.",
        },
        {
          title: "Rank with controlled query execution",
          story:
            "A librarian with excellent taste can still make a bad recommendation if the request is misunderstood. Search quality depends on parsing the reader's intent before touching the shelves. Ranking should combine lexical relevance, freshness, authority, and personalization only where it improves the task. Every extra clause costs CPU, and every clever personalization rule creates another chance to leak one user's context into another's results. Simpler, measurable ranking wins until evidence says otherwise. The librarian asks whether river means a place or a book title before searching, then rejects an impossibly broad request for every word ever written.",
          engineer:
            "Parse queries into an allowlisted structure with explicit term, field, and filter operators; never execute raw user text as a database or engine command. Bound clause count, result depth, aggregation cardinality, and execution time before dispatch. Score candidates in stages: cheap lexical filters first, then more expensive learned or freshness features, with a final bounded rerank. Cache only results whose inputs and authorization context are represented in the key. Log normalized query classes and latency histograms rather than storing raw sensitive searches indefinitely. Evaluate ranking with offline relevance sets and online outcome metrics, and roll back changes gradually when quality or tail latency regresses.",
          visualId: "search-ranking",
          visualCaption: "A query marker selects three nearby points and rejects a distant one in vector space. This is only a candidate-selection analogy; a bespoke query-plan visual is required for lexical filters, staged ranking, and permission pushdown.",
        },
        {
          title: "Operate freshness, availability, and query safety together",
          story:
            "A library can be open, well indexed, and still unsafe if anyone can scribble instructions into the catalogue. Search reliability therefore has three clocks: how quickly new documents appear, how quickly queries return, and how quickly dangerous or private content is removed. Operators need dashboards for all three. A fast index full of stale or exposed documents is not a successful search engine; it is merely an efficient way to distribute the wrong information. A redacted edition replaces the old catalogue card, the public terminals refresh together, and the archived snapshots follow a documented removal schedule.",
          engineer:
            "Maintain separate blue-green index versions so a failed build never replaces the serving index. Replicate shards across failure domains and route around unhealthy nodes with a bounded timeout. Track indexing lag, merge backlog, shard saturation, query p95 and p99, empty-result rate, and removal propagation. Enforce document-level access before ranking or filter the result set with a permission-aware query. Reject overly broad or expensive queries before they consume a whole shard, and redact secrets from crawler and query logs. Verify deletion across live indexes, caches, and snapshots, and rehearse rebuild and failover under realistic query load.",
          visualId: "deploy-strategies",
          visualCaption: "The deployment bar ramps from stable to new and can roll back on rising errors. Read it as blue-green index publication: switch serving versions atomically and revert without mutating the previous index.",
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
          kind: "scenario",
          question: "A slow old crawl fetch finishes after a newer version was indexed. How should ingestion avoid regression?",
          choices: [
            "Overwrite because completion order is simplest",
            "Use conditional version checks so the stale fetch cannot replace the newer document",
            "Delete both versions and wait for a full recrawl",
            "Index the response without canonical URL metadata",
          ],
          answerIndex: 1,
          explanation:
            "Fetch completion time is not document freshness; conditional publication keeps an older response from replacing a newer version.",
        },
        {
          kind: "tradeoff",
          question: "Why accept the write cost of posting lists with positions and field weights?",
          choices: [
            "They eliminate the need to retain the original document text",
            "They make every query a full corpus scan",
            "They make retrieval selective enough to offset indexing work",
            "They allow ranking without fetching document display fields",
          ],
          answerIndex: 2,
          explanation:
            "Richer postings spend more work at ingestion so common queries can intersect and rank a small candidate set instead of scanning everything.",
        },
        {
          kind: "security",
          question: "Why apply document ACL filters inside retrieval rather than only after ranking?",
          choices: [
            "Ranking requires unrestricted candidate sets",
            "Post-filtering is always faster",
            "It lets all shards use the same permission cache",
            "Post-filtering can leak existence through counts and facets or waste candidate capacity",
          ],
          answerIndex: 3,
          explanation:
            "Permission-aware retrieval keeps restricted documents out of results, snippets, counts, and expensive candidate selection.",
        },
        {
          kind: "story-match",
          question: "In the textbook-index story, what does a posting list represent?",
          choices: [
            "The pages and positions where a term appears",
            "The reader's permission to borrow the book",
            "The donor's identity",
            "The order in which books arrived",
          ],
          answerIndex: 0,
          explanation:
            "A posting list is the index-card equivalent: it points from a term to the documents and locations that contain it.",
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
            "A weather station with one thermometer produces a simple diary. A station that measures temperature, pressure, wind, and humidity for every sensor in every city produces a library of overlapping diaries. Metrics systems fail because teams count samples but forget dimensions. One million samples sounds manageable until each sample carries ten labels and the label combinations multiply. The first design question is how many distinct series exist, because that number determines memory, indexing, and cost. A single weather station adds one new thermometer each month, while a sensor grid adds thousands every hour; the dashboard looks similar but the label catalog explodes.",
          engineer:
            "Assume a fleet of one hundred thousand instances reporting common host metrics every fifteen seconds, plus selective application metrics. Four base series per instance already means four hundred thousand active series, and adding region, service, and deployment labels can multiply that count. Estimate ingestion as active series times samples per second, then account for replication and retention separately. High-cardinality labels such as user ID do not belong in a metric name; they are better handled as logs or traces. Use order-of-magnitude reasoning to choose between a managed time-series backend and a partitioned cluster, and state assumptions about churn and label cardinality before selecting a schema.",
          visualId: "traffic-flow",
          visualCaption: "Client samples pass through a load balancer and API lanes to storage. Read the incoming dots as sample throughput, while remembering that series cardinality, not just dots, determines the number of timelines and partitions.",
        },
        {
          title: "Write samples through a buffered ingestion path",
          story:
            "A turnstile counts people entering, but it does not stop each person to write a paragraph in a ledger. Metrics collectors can batch samples, validate them, and pass them through a narrow gate. The gate protects storage from malformed data and bursts while keeping the write path predictable. If every collector negotiates with every storage node, the system spends more time coordinating doors than counting visitors. The turnstile attendant counts in groups of ten, stamps the batch, and refuses a damaged ticket rather than passing bad numbers down the corridor to storage.",
          engineer:
            "Collectors scrape or push through a regional ingestion tier that authenticates tenants, enforces series and sample limits, and batches writes. Use a durable queue or write-ahead buffer to absorb backend slowdowns, but bound queue age so stale data is dropped rather than silently arriving hours late. Partition time-series data by metric name and a bounded hash of labels, with time-based buckets for retention. Apply exemplars to connect metrics with traces without embedding high-cardinality identifiers in every series. Monitor dropped samples, ingestion lag, and per-tenant quota consumption. Backpressure should protect critical infrastructure metrics before shedding less important dashboard series.",
          visualId: "queue-workers",
          visualCaption: "A producer fills a queue drained by three workers, with dead-letter handling available. Follow a batch to see authenticated ingestion, batching, and bounded buffering ahead of time-series storage.",
        },
        {
          title: "Store and query time series efficiently",
          story:
            "A fitness diary stores a value for each minute, but a chart only needs some of those minutes. A time-series engine can compress repeated timestamps, delta-encode values, and downsample older data. It should not scan every raw sample to answer a six-hour question. The storage layout must balance precise recent detail with cheap historical trends, and retention should be a first-class policy rather than a surprise disk bill. A six-month chart uses daily averages, while this morning's incident uses five-minute values; both remain readable because the storage policy keeps different detail windows.",
          engineer:
            "Use column-oriented time-series blocks with compression for timestamps and values, plus inverted metadata for label selection. Downsample older data into rollups while retaining raw high-resolution data for a shorter window. Queries should select bounded time ranges and use pushdown on metric and labels before scanning blocks. Cache repeated dashboard queries with a short freshness window, but avoid caching tenant-specific results under shared keys. Shard by a stable hash of the series identity and use time buckets for retention deletion. Measure query scan volume and series evaluated, not just query count, because one broad query can cost as much as thousands of narrow ones.",
          visualId: "btree-lsm",
          visualCaption: "The B-tree and LSM layouts contrast in-place page updates with append-and-flush runs. Read the right side as a model for immutable time blocks and background compaction, not as a literal time-series schema.",
        },
        {
          title: "Evaluate alerts with state and hysteresis",
          story:
            "A smoke alarm should not page the fire department because a piece of toast browned for three seconds, but it also must not stay silent during a real fire. Alert rules need patience on the way into firing and explicit conditions on the way out. Evaluation must be durable because the rule may be retried, the evaluator may restart, and the same sample window may be processed twice. A dashboard color is not enough; the system needs a small, reliable state machine for each alert instance. The alarm stays in pending while smoke persists, enters firing only after the configured delay, and resets separately when the room clears.",
          engineer:
            "Evaluate rules in partitions and persist pending, firing, and resolved states with the evaluation timestamp and rule version. Use a for-duration condition before paging and a separate recovery threshold to prevent flapping. Deduplicate notifications with a stable alert fingerprint and group related instances into one incident when they share a root cause. Route notifications through a durable delivery outbox so evaluation success does not depend on email or chat availability. Record the exact query window and data completeness behind a decision. Missing data should be distinguishable from zero, and stale evaluators must not fire alerts from incomplete recent windows.",
          visualId: "observability-sli",
          visualCaption: "The Raft panel shows terms, leader changes, and a node stepping down. Use it only to motivate durable evaluator failover; a bespoke pending, firing, and resolved alert-state diagram is required for hysteresis.",
        },
        {
          title: "Balance alert fatigue, missed pages, and data privacy",
          story:
            "A control room with one siren for every blinking light trains engineers to ignore the whole panel. Yet removing sirens until the room is quiet can hide the one light that matters. Trusted alerting pages on user-visible risk, groups symptoms into incidents, and sends lesser signals to tickets or dashboards. The goal is not the fewest alerts; it is the shortest path from a real problem to a prepared responder. Privacy matters too, because operational labels and notification payloads often contain customer or internal system details. The control room sends one incident page for a building-wide smoke condition, routes a single flickering bulb to a maintenance ticket, and prints the owner's runbook on each page.",
          engineer:
            "Define service-level indicators first, then alert on sustained error-budget burn or imminent user harm rather than raw resource spikes alone. Use severity, ownership, runbook links, and deduplication keys in every page, and route low-severity signals to non-paging channels. Track precision, missed incidents, time to acknowledge, and pages per on-call shift, reviewing noisy rules regularly. Protect metric ingestion with authentication and tenant quotas, strip secrets from labels, and restrict query and notification access. Verify alert behavior with replay tests for spikes, missing data, evaluator restart, and notification failure, and conduct a periodic test that a genuine critical condition still reaches the responder.",
          visualId: "observability-sli",
          visualCaption: "A rollout advances from stable to new, then rolls back when errors rise. This deployment metaphor fits controlled alert-rule changes; a bespoke severity-routing diagram is needed to show paging, tickets, and deduplication.",
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
          kind: "tradeoff",
          question: "What is the main tradeoff when downsampling older metrics?",
          choices: [
            "It preserves every raw sample while reducing scan work",
            "It allows recent and historical data to use one fixed retention window",
            "It lowers storage and scan cost but loses detail needed for fine-grained historical analysis",
            "It reduces the number of active series rather than samples per series",
          ],
          answerIndex: 2,
          explanation:
            "Rollups make historical scans cheaper, but retention policy must accept that short spikes may no longer be recoverable from old data.",
        },
        {
          kind: "scenario",
          question: "An evaluator restarts after seeing three minutes of a five-minute firing condition. What should it do?",
          choices: [
            "Fire immediately because the condition was once true",
            "Resume the pending state using persisted evaluation timestamp and data completeness",
            "Reset every alert instance to resolved",
            "Skip persistence and wait for a new sample",
          ],
          answerIndex: 1,
          explanation:
            "Durable pending state preserves the for-duration clock and prevents restart from causing premature or duplicate pages.",
        },
        {
          kind: "story-match",
          question: "Which lesson from the smoke-alarm scene best explains why missing samples must differ from zero?",
          choices: [
            "No samples may mean the sensor or ingestion path failed, not that the measured value is healthy zero",
            "Zero always indicates a fire",
            "Missing samples should be filled with the last value indefinitely",
            "Alert evaluators should ignore both states",
          ],
          answerIndex: 0,
          explanation:
            "A silent smoke detector is not proof of clean air; missing telemetry can itself be an incident that needs explicit handling.",
        },
        {
          kind: "security",
          question: "A tenant adds user IDs as metric labels. What is the best control?",
          choices: [
            "Allow it because encryption prevents cardinality growth",
            "Keep user IDs only in dashboard queries",
            "Cap labels after ingestion instead of at admission",
            "Reject or throttle excessive cardinality and use bounded labels, logs, or traces instead",
          ],
          answerIndex: 3,
          explanation:
            "Per-user labels can explode series count and expose identifiers; admission control protects both capacity and privacy.",
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
            "A desk drawer keeps the tools used today within reach and pushes last season's gloves to the back. The drawer is not a permanent warehouse; it is a small promise about fast access. Before choosing LRU or LFU, decide what a hit means, whether reads update recency, how expiration works, and what happens when capacity is zero. A cache with an unclear contract is like a helpful assistant who hides things according to a rule nobody explained. At the start of a shift, the attendant writes the drawer's rules on a card: reads move tools forward, oversized kits stay in the warehouse, and an empty drawer still reports a miss.",
          engineer:
            "Specify get, put, optional delete, capacity, maximum entry weight, and expiration semantics. LRU evicts the least recently used key; LFU evicts the least frequently used key, usually breaking ties by recency. Both should provide expected O(1) lookup and update, with O(1) eviction rather than scanning entries. Decide whether get changes LFU frequency and whether failed gets create negative entries. Bound memory by bytes as well as entry count because one oversized value can defeat a nominally correct capacity. State explicitly that cached values are disposable copies, so callers must not treat cache contents as the only durable record.",
          visualId: "lru-lfu",
          visualCaption: "The cache ring marks warm slots, a hit, and a miss that falls through to disk. Read it as the bounded cache contract before implementation: capacity, expiry, and fallback determine what the ring can promise.",
        },
        {
          title: "Build LRU from a hash map and doubly linked list",
          story:
            "A librarian uses a catalogue card to find a book and a physical shelf order to show which book has gathered the most dust. The card gives instant lookup; the shelf gives instant removal from either end. An LRU cache needs exactly these two views. The map answers whether a key exists, and the doubly linked list keeps usage order. A plain list would force a search every time a book moved, which turns a tidy system into a slow scavenger hunt. When a reader asks for the book on the catalogue card, the librarian pulls it from its shelf position and slides it to the front without searching the whole room.",
          engineer:
            "Maintain a hash map from key to a linked-list node and a doubly linked list ordered from most recently used at the head to least recently used at the tail. On get, look up the node, detach it, and prepend it. On put of an existing key, update its value and weight bookkeeping, then move it to the head. On a new key, create and prepend a node; if weighted capacity is exceeded, repeatedly remove tail nodes until the size is within bounds. Sentinel head and tail nodes eliminate null-edge cases. Always remove a node's map entry when evicting, and never leave a map pointing at a detached node.",
          visualId: "lru-lfu",
          visualCaption: "The current notation panel decodes arrival rate divided by service rate, which does not model LRU. A bespoke visual must show the key-to-node hash map beside the MRU-to-LRU doubly linked list.",
        },
        {
          title: "Implement LFU with frequency buckets",
          story:
            "A coffee shop remembers which mugs its regulars use, not merely which mug was touched last. LFU keeps those regulars warm even if a tourist picks up every other cup once. The implementation resembles a staircase of popularity levels. Each step contains recently used items at that frequency, and the lowest occupied step is where eviction begins. The data structure must promote an item to the next step without searching the whole café. A regular's mug reaches the second stair after several visits, while a tourist's mug remains on the first; both stair landings preserve the order of recent use.",
          engineer:
            "Use a map from key to node containing value, frequency, weight, and expiry, plus a map from frequency to an ordered set of keys or a doubly linked bucket list. On access, remove the key from its current frequency bucket, increment frequency, and insert it into the next bucket with recency ordering. On eviction, select the minimum frequency bucket and remove its least recently used entry. A min-heap of frequencies avoids scanning for the minimum, while an ordered bucket map can expose the first key directly. If evicting one low-frequency oversized value is insufficient, continue across buckets. Delete empty buckets so stale frequencies do not accumulate or distort the minimum.",
          visualId: "lru-lfu",
          visualCaption: "The cache ring distinguishes warm slots from a cold miss. Use it only as a memory-capacity analogy; a bespoke LFU staircase with ordered buckets is required to show frequency promotion and tie-breaking.",
        },
        {
          title: "Handle expiration and concurrency without broken invariants",
          story:
            "Two assistants using the same drawer can both decide the expired snacks should be thrown away and reach for the same box. One ends up holding an empty hand while the other wonders where the snacks went. Cache operations need a single serialization boundary, or carefully coordinated removal, because eviction and expiration mutate several structures at once. Locks are not glamorous, but they are the difference between a fast cache and a mysterious missing-value bug. One assistant locks the drawer, removes an expired box, and updates the card before the second assistant reaches for it; both then see the same contents.",
          engineer:
            "Guard each compound mutation with a lock, striped lock, or a single-owner event loop. A read that returns a mutable object must either copy it or document the sharing contract; otherwise a caller can change cached data without updating weights or size. Use a monotonic clock for expiry, check it on access, and remove expired entries before admitting new ones. Lazy expiration avoids a sweeping thread but can retain dead values until pressure arrives; active cleanup bounds stale memory. Instrument hits, misses, evictions, expirations, and bytes rejected. Test races between get, put, expire, and evict by asserting that the map and list or buckets contain identical live keys after every operation.",
          visualId: "lru-lfu",
          visualCaption: "The realtime panel compares polling, SSE, and WebSocket cadence, not cache concurrency. A bespoke operation timeline is required to show lock acquisition, lazy expiry, eviction, and invariant repair under races.",
        },
        {
          title: "Protect cache side channels and failure behavior",
          story:
            "A cache should behave like a quick note, not a loose-lipped witness. If timing reveals whether a secret key exists, or if one tenant can fill the drawer and evict everyone else's notes, speed becomes a security problem. Defensive caching limits entry size, isolates namespaces, and avoids returning internal details to callers. When the cache fails, the application should fetch from the authoritative source within a bounded budget rather than exposing stack traces or hammering a database. A stranger asks whether a locked drawer contains a named document, receives the same polite miss as for a random label, and cannot fill it with oversized envelopes.",
          engineer:
            "Namespace keys by tenant and purpose, authorize cache administration separately, and avoid using attacker-controlled keys without length and entry-count limits. Return the same miss latency for absent and unauthorized entries where authorization is evaluated outside the cache, and never cache sensitive responses under a shared key. Add request coalescing and jittered fallback so a cold or unavailable cache does not create a database stampede. On corruption or restart, clear the cache and rebuild lazily from the source of truth. Verify tenant isolation, oversized-value rejection, expiration accuracy, concurrent invariant checks, and bounded behavior during a forced cache flush.",
          visualId: "lru-lfu",
          visualCaption: "Untrusted requests meet a shield before the trusted cache service. Read the shield as namespace isolation, size quotas, authorization, and uniform misses that prevent cache-based side channels.",
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
          kind: "security",
          question: "One tenant fills a shared cache with oversized values. Which control best preserves other tenants?",
          choices: [
            "Increase global capacity until the attack stops",
            "Return detailed cache diagnostics to the caller",
            "Use a single shared namespace with no quotas",
            "Enforce weighted per-tenant quotas and entry-size limits with namespace isolation",
          ],
          answerIndex: 3,
          explanation:
            "Weighted quotas and isolated namespaces prevent one caller from converting a shared speed optimization into an eviction weapon.",
        },
        {
          kind: "story-match",
          question: "In the librarian story, which part corresponds to the hash map and which to the linked list?",
          choices: [
            "The catalogue card locates the book; shelf order tracks recency",
            "The shelf order locates the book; the catalogue card tracks frequency",
            "Both are represented by one sorted array",
            "The catalogue card stores values while shelf order handles expiration only",
          ],
          answerIndex: 0,
          explanation:
            "The map gives direct lookup and the ordered list gives constant-time movement and tail eviction, matching the two librarian tools.",
        },
        {
          kind: "tradeoff",
          question: "For this lesson's LFU-with-LRU implementation, why break equal-frequency ties by recency?",
          choices: [
            "LFU requires every key to have a unique frequency",
            "Recency alone is sufficient to choose the eviction victim",
            "It gives deterministic eviction among equally popular keys without scanning the cache",
            "It makes LFU identical to LRU for all workloads",
          ],
          answerIndex: 2,
          explanation:
            "LFU alone leaves ties unspecified; this implementation orders keys inside each frequency bucket so the least-recent equally popular key is evicted.",
        },
        {
          kind: "scenario",
          question: "A cache flush occurs during a traffic spike. What should the application do?",
          choices: [
            "Serve the last cached snapshot even if it exceeds the freshness contract",
            "Use bounded, coalesced reads from the authoritative source with jittered fallback",
            "Disable all writes until the cache is full",
            "Let each request retry independently until the source responds",
          ],
          answerIndex: 1,
          explanation:
            "A cold cache is disposable state, so correctness comes from the source while coalescing and jitter prevent a database stampede.",
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
            "A bakery hands each customer a small stack of tokens. One cookie costs one token, and the baker adds fresh tokens at a steady rate. The stack allows a short burst without letting one hungry customer empty the counter. Before coding the jar, the bakery must decide its refill rate, stack size, who receives a jar, and what happens when the baker's ledger is unavailable. A rate limiter without those decisions is just a number that occasionally rejects people. The baker posts the refill rate and stack size beside the jar, then decides whether a broken ledger closes cookie sales or allows only local, clearly counted purchases.",
          engineer:
            "Define the protected operation, caller identity, refill rate, burst capacity, cost per operation, and decision semantics. A token bucket stores a token count and last-refill timestamp; on each request, compute refill using elapsed time, cap at capacity, and consume cost if enough tokens remain. Choose whether requests are admitted atomically or evaluated with a later reconciliation. Specify behavior for clock skew, concurrent calls, and partial failures. The limiter protects availability, so its own latency and dependency health need budgets. Keep policy configuration versioned and observable so a deployment can change limits without deploying application code.",
          visualId: "rate-limiter",
          visualCaption: "A bucket refills from above while four token circles empty and a request changes from allowed to denied. Read filled circles as available burst capacity and the dashed refill arrow as recovery over time.",
        },
        {
          title: "Make token state transitions atomic",
          story:
            "Two cashiers reaching into the same cash drawer can both see one bill and both hand it out. Distributed rate limiting has the same double-spend problem. Every replica may read a bucket that currently has one token, then both approve a request. A local counter per server is fast but useless against a caller spread across servers. The fix is a single atomic transition at a shared authority, or an algorithm that deliberately accounts for approximate counting. Both cashiers lock the drawer before reading the single remaining token, so the first approved sale removes it and the second sees an empty drawer.",
          engineer:
            "Store each bucket in a shared key-value service and use an atomic script or compare-and-swap loop that reads state, computes refill, consumes tokens, and writes the result as one transition. Include the policy version and expiry in the stored record. The transition must be idempotent for a request ID if retries are allowed, otherwise a network retry may consume tokens twice. If exact enforcement matters, route a caller's operations to a stable shard or use a strongly consistent store. Measure contention on hot identities. A leaky-bucket or approximate local limiter can reduce dependency load, but the design must state the allowed overshoot and how it is monitored.",
          visualId: "consistent-hash",
          visualCaption: "The hash ring maps caller keys to stable owners and remaps only a local segment after failure. Read it as one way to reduce double-spend races; a bespoke atomic read-modify-write diagram is still needed.",
        },
        {
          title: "Key decisions on authenticated identity",
          story:
            "A doorman who trusts a handwritten name tag lets a crowd enter as the same honored guest. Client-supplied headers are those name tags: easy to change and impossible to trust on their own. A limiter must ask who the caller really is according to a verified session, tenant, or API credential. It can combine dimensions, such as tenant plus route, but the root identity should come from the authorization layer rather than a field the caller controls. The doorman checks a photo ID behind the counter instead of accepting the visitor's handwritten badge, then uses that verified identity to find the correct allowance card.",
          engineer:
            "Derive the primary limit key from a verified principal, such as an authenticated user ID, tenant ID, or hashed API credential, and optionally add route and cost class. Use a keyed hash for stored identifiers so raw secrets do not enter logs or cache keys. Do not use forwarded IP, user-agent, or custom identity headers as the sole basis because they can be absent or spoofed. Network limits may be an additional layer at a trusted ingress, not a replacement for application authorization. Return a consistent rejection response with a safe retry hint, and audit limit-policy changes. Verify that changing a client header cannot change the authenticated limit key.",
          visualId: "threat-defense",
          visualCaption: "Untrusted identity headers meet a shield before the trusted limiter. Read the shield as authentication-derived limit keys; changing a caller-controlled header must not select a new bucket.",
        },
        {
          title: "Handle bursts, costs, and fairness deliberately",
          story:
            "A buffet allows everyone to take a plate now, but a guest carrying twenty stacked plates is using the future allowance of the whole table. Rate limits need both speed and size: tokens control how often, while a cost function controls how expensive. A bulk export may consume more than a profile read even if both are one API call. Fairness means the tenant next door should not wait behind one customer's giant batch. A guest taking one cookie spends one token, while a caterer ordering twenty boxes pays twenty times as many and waits for the next refill before collecting more.",
          engineer:
            "Assign each operation a cost based on CPU, downstream work, data volume, or scarcity, and require enough tokens for that cost. Keep burst capacity bounded so recovery does not unleash a delayed flood. Consider weighted fairness or per-tenant concurrency limits alongside request-rate limits when expensive operations dominate. Avoid penalizing legitimate retries twice by honoring a request idempotency key within a small retry window. Partition hot keys or introduce hierarchical limits when a single tenant saturates a shard, while preserving a global account ceiling where required. Expose accepted, rejected, remaining, and refill-window metrics without leaking other tenants' usage.",
          visualId: "rate-limiter",
          visualCaption: "The same token bucket can now be read as a cost budget: filled circles represent remaining allowance, and a costly operation needs more than one token. Read the denied state as bounded rejection until refill.",
        },
        {
          title: "Fail safely and prove the limiter works",
          story:
            "If the limiter's shared ledger disappears, the bakery must choose between selling cookies freely and closing the shop. Neither answer is always right. A signup endpoint may need strict availability protection, while a read-only status page might safely degrade. The important point is that failure behavior is an explicit policy per operation, not an accident hidden in a timeout. Operators should see when enforcement is approximate before protected systems melt. When the central ledger fails, the bakery posts a local ration card, records the reduced accuracy on the board, and restores central counting as soon as the ledger returns.",
          engineer:
            "Define fail-open, fail-closed, or local-degraded behavior for each operation class, with a short dependency timeout and circuit breaker. During degraded mode, apply a conservative local limiter and emit a high-severity signal when global accuracy is lost. Store buckets with expiration to reclaim inactive identities, and load-test hot keys to expose contention. Tests should cover exact burst boundaries, refill across idle periods, concurrent requests, retries, clock movement, policy changes, and store outages. Confirm that rejection protects the downstream dependency without denying unrelated tenants, and keep an independent view of downstream saturation so a broken limiter cannot silently remove all protection.",
          visualId: "rate-limiter",
          visualCaption: "The rollout bar advances and then rolls back as errors rise. Treat this as a cautious degraded-mode rollout; a bespoke failure-policy matrix is required to distinguish fail-open, fail-closed, and local fallback.",
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
          kind: "story-match",
          question: "In the bakery story, what does the token jar's maximum height represent?",
          choices: [
            "The number of concurrent bakers",
            "The bounded burst capacity allowed above steady refill",
            "The caller's authenticated identity",
            "The retry window for failed payments",
          ],
          answerIndex: 1,
          explanation:
            "The jar can hold only so many tokens, which maps directly to burst capacity rather than an unlimited request allowance.",
        },
        {
          kind: "scenario",
          question: "Two replicas read one remaining token simultaneously. What prevents both requests from being admitted?",
          choices: [
            "An atomic read-modify-write or stable strongly consistent owner",
            "A larger local burst setting on each replica",
            "A caller-supplied request timestamp",
            "Cache each replica's last token count for faster reads",
          ],
          answerIndex: 0,
          explanation:
            "The decision must serialize the shared token transition; independent local reads recreate the double-spend race.",
        },
        {
          kind: "security",
          question: "Which primary limit key is safest for an authenticated API?",
          choices: [
            "A username header supplied by the client",
            "The raw user-agent string",
            "A random value generated per request",
            "A verified principal or tenant identifier from the authorization layer",
          ],
          answerIndex: 3,
          explanation:
            "A trusted identity prevents callers from selecting a fresh bucket by changing a header, agent, or request identifier.",
        },
        {
          kind: "tradeoff",
          question: "During a shared-store outage, why define per-operation fail-open or fail-closed policies?",
          choices: [
            "Every endpoint has identical availability risk",
            "Fail-open always protects downstream capacity",
            "A read-only status page and a costly write may justify different bounded degradation",
            "Fail-closed eliminates the need for a local fallback limiter",
          ],
          answerIndex: 2,
          explanation:
            "Failure policy balances user availability against downstream protection, and the right choice depends on the operation cost and risk.",
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
            "A conference venue has rooms for different talks and a list of people waiting outside each room. The announcer speaks once, and ushers deliver the message to the relevant lists. A pub/sub broker is the venue, topics are the rooms, and subscriptions are the waiting lists. Before building ushers, decide whether missing a listener loses the message or leaves it for later. That one choice changes the entire building. If an audience member misses a talk, the venue either closes that room's list or keeps a numbered transcript; the waiting-list sign tells attendees which promise applies.",
          engineer:
            "Define topic names, message envelopes, retention, subscriber types, delivery guarantee, acknowledgement, retry, and ordering scope. At-least-once delivery is common because it favors not losing messages, so consumers must deduplicate. A subscription can be ephemeral, durable, or a push endpoint with its own retry policy. Bound topic and subscription counts per tenant, message size, and queue depth. Decide whether ordering is global, per topic, or per producer key; claiming global ordering usually adds a costly coordination point. Document redelivery and expiry so clients can reason about gaps without assuming exactly-once transport.",
          visualId: "pubsub-routing",
          visualCaption: "The realtime panel compares polling, SSE, and WebSocket cadence. It is only a delivery-transport analogy; a bespoke broker diagram must add topics, subscriptions, retention, acknowledgements, and ordering scope.",
        },
        {
          title: "Route with a subscription trie or map of sets",
          story:
            "A building directory groups offices by floor so the courier can walk straight to the right hallway. A subscription trie does the same for topic segments, while a map of sets is simpler for exact topic names. Neither structure should require scanning every subscriber to publish one message. The broker can afford a direct lookup and a set of waiting connections; it cannot afford a city-wide search for every announcement. The courier reads one room number, walks directly to that waiting list, and crosses off the same person only once even if two wildcard signs pointed there.",
          engineer:
            "For exact topics, keep a map from topic to a set of subscription IDs and a reverse map from subscription to its topics. For wildcard routing, store topic segments in a trie and collect matching subscription IDs at the terminal nodes, with explicit rules for single-segment and multi-segment wildcards. Protect publication and subscription mutation with the same lock or actor boundary so a publish cannot observe half-updated membership. Topic names should be bounded, normalized, and tenant-scoped. Deduplicate matching IDs when several wildcard branches match the same topic, and avoid recursive traversal without depth and node limits.",
          visualId: "pubsub-routing",
          visualCaption: "The notation panel currently decodes a queueing equation and does not show topic routing. A bespoke trie or topic-to-set map is required, including wildcard overlap and reverse unsubscribe indexes.",
        },
        {
          title: "Decouple routing from durable delivery",
          story:
            "The announcer should not have to stand at every listener's door waiting for someone to answer. The broker accepts the message, stores it in the appropriate durable queues, and lets delivery workers handle slow subscribers. One sleeping listener must not block the microphone. This separation also gives the system a place to retry, dead-letter, and measure backlog without complicating the publish request. The announcer hands a recorded tape to the archive, and a separate usher knocks on each door; a sleeping listener leaves the tape in the room's tray with its room number intact.",
          engineer:
            "Append the message to a durable log, record retention and producer sequence, then enqueue or advance each matching subscription. Workers deliver to connected clients or external endpoints and require acknowledgement before removing the queue entry. Use exponential backoff with jitter and move repeatedly failing messages to a bounded dead-letter path with metadata for replay. Make subscription offsets idempotent so redelivery cannot advance past an unprocessed message. Separate queues by subscriber fairness class so one slow tenant does not monopolize workers. Publish should fail or explicitly degrade if durability is not achieved, and metrics must include oldest unacknowledged age, not just queue length.",
          visualId: "pubsub-routing",
          visualCaption: "A producer appends to a queue, workers drain it, and failed items move to dead letter. Follow the arrows to see durable acceptance separated from subscriber delivery and acknowledgement.",
        },
        {
          title: "Control ordering, retries, and backpressure",
          story:
            "A waiter carrying too many plates will drop them all. A broker that buffers without limit eventually does the same, only with everyone's messages. Per-subscriber queues need high and low water marks, and publishers need a clear signal when the system cannot accept more work. Retries need jitter so a failed endpoint does not receive synchronized hammering. The broker should behave like a well-run restaurant: bounded stations, clear tickets, and no promise it cannot keep. When a guest stops answering, the usher pauses at the doorway instead of stacking plates indefinitely, while the other rooms continue receiving their announcements.",
          engineer:
            "Assign sequence numbers per topic partition and preserve that order for subscriptions that request it, while allowing different subscribers to progress independently. A slow consumer should pause its queue or disconnect rather than consuming unbounded memory. Set publisher quotas and return a retryable busy response when admission limits are reached. Retry transient failures with capped backoff, but treat permanent schema or authorization failures as non-retryable and dead-letter them. Consumer acknowledgements should be batched only after processing is safe. Test duplicate delivery, out-of-order redelivery, worker restart, poison messages, and recovery after a full queue drain.",
          visualId: "pubsub-routing",
          visualCaption: "Three partitions show uneven lag feeding a consumer group. Read the lag bars as per-subscription backlog; ordering and independent progress require a bespoke per-subscriber queue diagram beyond this partition view.",
        },
        {
          title: "Authorize topics and contain tenant failures",
          story:
            "A microphone in one meeting room should not broadcast into the boardroom next door. Pub/sub systems often expose powerful cross-service communication, so topic names and queue contents deserve strict boundaries. A subscriber allowed to listen to billing events should not automatically gain permission to publish refund instructions. The broker must separate publish, subscribe, replay, and administrative powers, and keep one tenant's backlog from becoming everyone's outage. A badge opens only the tenant's own corridor, and a usher checks it again before replaying yesterday's tape; the tenant's backlog is measured separately.",
          engineer:
            "Use tenant-scoped topic namespaces and authorize each publish, subscribe, replay, and delete operation against a verified principal. Wildcard subscriptions must be constrained to an authorized namespace rather than matching the entire broker. Encrypt messages in transit and at rest where required, redact secrets from operational logs, and audit administrative replay or deletion. Apply per-tenant message-rate, retention, queue, and connection quotas. Return uniform authorization failures that do not reveal other tenants' topic names. Verify with cross-tenant publish and wildcard-subscribe attempts, credential revocation, queue saturation, and replay authorization tests. Test cross-tenant wildcard matching and queue saturation, and monitor oldest-message age plus per-tenant backlog to prove isolation under load.",
          visualId: "pubsub-routing",
          visualCaption: "Untrusted publish, subscribe, replay, and delete requests meet a shield before trusted broker services. Read the shield as tenant-namespace authorization plus quotas and audit controls.",
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
          kind: "tradeoff",
          question: "Why is global ordering across every topic usually a poor default?",
          choices: [
            "It improves independent topic throughput",
            "It makes per-topic retention policies unnecessary",
            "It adds a coordination hot path unrelated to most subscriber needs",
            "It lets every subscriber share one committed offset",
          ],
          answerIndex: 2,
          explanation:
            "Most subscribers need order only within a topic or producer key; global order multiplies coordination without improving that contract.",
        },
        {
          kind: "story-match",
          question: "In the conference-venue story, what does a durable numbered transcript represent?",
          choices: [
            "A wildcard subscription",
            "A dead-letter queue",
            "A live WebSocket heartbeat",
            "Retained messages that an offline subscriber can replay",
          ],
          answerIndex: 3,
          explanation:
            "The transcript preserves what was said so a missed session can be recovered, just as a durable subscription retains unacknowledged messages.",
        },
        {
          kind: "scenario",
          question: "A subscriber stops acknowledging and its queue reaches the high-water mark. What should the broker do?",
          choices: [
            "Pause, throttle, or disconnect that subscriber while preserving healthy subscriptions",
            "Grow the queue without limit",
            "Pause every topic globally",
            "Delete all retained messages",
          ],
          answerIndex: 0,
          explanation:
            "Backpressure should contain the slow subscriber rather than exhausting shared memory or punishing unrelated topics.",
        },
        {
          kind: "security",
          question: "Why authorize replay separately from ordinary subscribe?",
          choices: [
            "Replay cannot expose historical data",
            "Replay can deliver retained sensitive messages at scale and needs explicit privilege and audit",
            "Subscribe is always an administrative action",
            "Replay needs no authenticated principal",
          ],
          answerIndex: 1,
          explanation:
            "Replay expands the data surface and delivery volume, so it deserves a distinct high-impact permission and audit trail.",
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
            "A parking lot is not simply a grid of empty squares. It has floors, vehicle types, entrance gates, payment systems, and tickets that move through issued, active, paid, and exited states. If every gate invents its own rules, two cars can receive the same space while both drivers trust their tickets. The object model is the shared rulebook that keeps the physical lot and the digital record in agreement. The rulebook names the gate, spot, ticket, and payment desk, and shows exactly which stamped form moves a car from entry to exit.",
          engineer:
            "Identify ParkingLot, Floor, ParkingSpot, Vehicle, Ticket, Reservation, Gate, and Payment as separate concepts. A spot should expose compatibility, occupancy, and reservation state rather than letting callers mutate an arbitrary boolean. Tickets carry entry time, assigned spot, vehicle identity reference, status, and version. Define invariants such as one active ticket per vehicle session and at most one active claim per spot. Use enums or sealed state types for status transitions. Keep domain rules independent of database and UI frameworks so they can be unit tested directly, including invalid transitions and concurrent claims.",
          visualId: "parking-allocation",
          visualCaption: "The notation panel currently decodes arrival and service rates, not a parking domain model. A bespoke class-and-lifecycle diagram is required for lots, floors, spots, tickets, gates, and payments.",
        },
        {
          title: "Assign spots with deterministic, bounded rules",
          story:
            "An attendant does not choose a space by wandering randomly through the garage. The attendant checks vehicle size, accessible requirements, floor availability, and a preference such as nearest entrance. The same simple policy applied consistently makes the lot predictable. If two attendants choose at once, however, the parking ticket becomes a promise the lot cannot keep. The assignment rule needs a lock or a database condition around the final claim. The attendant checks the accessible section first, reaches the final gate with a key, and locks the chosen bay before printing the ticket.",
          engineer:
            "Maintain compatible spots indexed by vehicle type and status, with optional floor or distance ordering. Find candidates through the index, filter by accessibility or charging requirements, and atomically claim the first eligible spot using a conditional update or lock. Record the assignment on the ticket in the same transaction. When a spot is released, clear its claim and make it available again. Reservations require a hold with expiry so unused spaces return to the pool. Avoid scanning every spot on each entry, and define tie-breaking deterministically for tests. Capacity counts should derive from actual spot state rather than a separately incremented counter that can drift.",
          visualId: "parking-allocation",
          visualCaption: "The consistent-hash ring shows key ownership and localized remapping, which does not model spot allocation. A bespoke garage map is required to show compatibility filtering and the final atomic bay claim.",
        },
        {
          title: "Make check-in, exit, and payment idempotent",
          story:
            "A driver whose phone loses signal at the exit gate should not be charged twice because the payment request was retried. Nor should a second tap of the same ticket create a second parking session. Real gates are unreliable networks, so the domain needs a receipt number for each logical operation. Idempotency turns an accidental repeat into the same answer, like asking the attendant to look up the original ticket instead of writing another one. The gate prints the same receipt number after a retry, looks up the original payment, and opens without asking the driver to tap again.",
          engineer:
            "Generate tickets with unique IDs and accept an idempotency key for entry, payment, and exit operations. Use versioned state transitions so a stale gate cannot complete an already-exited ticket. Calculate charges from durable entry and exit timestamps using a versioned pricing policy, and store the pricing version with the payment record. Payment authorization and gate release may cross services, so model them as a saga with explicit pending and failed states. If payment succeeds but exit acknowledgement is lost, reconciliation must find the completed ticket and safely reopen the gate without charging again.",
          visualId: "parking-allocation",
          visualCaption: "A service atomically writes an outbox, a relay forwards it, and retries recover downstream failure. Read the path as idempotent entry, payment, and exit commands surviving unreliable gate networks.",
        },
        {
          title: "Handle overbooking, failure, and concurrency",
          story:
            "A reservation system that sells the last accessible space twice has not created extra capacity; it has created two disappointed drivers. Overflow, broken gates, and expired reservations are normal operating conditions, not exotic exceptions. The lot needs honest capacity decisions and clear recovery paths. A full sign is more useful than a ticket for a space that another car already occupies. When the last accessible space is claimed, the full sign lights up; a crashed cleanup worker is detected when the next reservation reconciles the expired hold instead of leaving it hidden.",
          engineer:
            "Serialize spot claims at the spot or partition boundary, using database uniqueness on active assignments as a final guard. Expire reservation holds through a scheduled job and reconcile them on access so a crashed cleanup worker does not permanently lose inventory. When full, reject new entry or offer a waitlist according to policy rather than assigning an invalid spot. If a gate fails after ticket creation, mark the ticket pending and let an operator resolve it; do not silently roll back durable payment records. Tests should race multiple vehicles for one spot, expire a reservation during check-in, retry payment, and restart the service mid-transition.",
          visualId: "parking-allocation",
          visualCaption: "A primary replicates to two followers while one lags. Use this only as a failover reminder for shared inventory; a bespoke reservation timeline is required for expiry, overbooking, and concurrent claims.",
        },
        {
          title: "Protect vehicle data and administrative controls",
          story:
            "A parking lot needs enough information to distinguish vehicles and calculate a fee, not a permanent scrapbook of everyone's movements. License plates and payment references are sensitive, and support staff should not have unlimited power to change tickets or open gates. The security model is a smaller version of the physical one: separate roles, short retention, and an audit trail for exceptional actions. A support clerk sees a masked plate and payment status, while only a supervisor can override the gate and every override records a reason beside the ticket number.",
          engineer:
            "Minimize stored vehicle identifiers, encrypt sensitive fields, and apply retention policies to plate images and location history. Authorize ticket lookup by session or staff role, because a ticket number alone should not expose payment or vehicle details. Separate ordinary exit, refund, manual override, and pricing administration permissions. Rate-limit lookup endpoints to reduce enumeration, redact payment tokens from logs, and record immutable audit events for overrides. Offline gate operation should use signed, expiring capability tokens with bounded local inventory rather than trusting arbitrary client data. Verify role boundaries, retention deletion, duplicate-ticket behavior, and gate release after payment-service failure.",
          visualId: "parking-allocation",
          visualCaption: "Untrusted ticket and administrative requests meet a shield before trusted garage services. Read the shield as session authorization, role separation, signed gate capabilities, and audited overrides.",
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
          kind: "story-match",
          question: "In the garage rulebook story, what enforces the promise that one physical spot cannot have two active tickets?",
          choices: [
            "A larger capacity counter in the UI",
            "A deterministic nearest-entrance preference",
            "An asynchronous cleanup job alone",
            "An atomic spot claim backed by a unique active-assignment invariant",
          ],
          answerIndex: 3,
          explanation:
            "The rulebook corresponds to the domain invariant, and the final guarded claim makes that invariant hold under concurrent arrivals.",
        },
        {
          kind: "scenario",
          question: "A payment succeeds but the exit acknowledgement is lost. What should reconciliation do?",
          choices: [
            "Charge the driver again",
            "Create a second parking session",
            "Find the completed ticket and safely reopen the gate without duplicate payment",
            "Delete the payment record",
          ],
          answerIndex: 2,
          explanation:
            "The logical payment and exit already have durable evidence; reconciliation repairs the physical gate action without repeating the charge.",
        },
        {
          kind: "tradeoff",
          question: "Why reconcile expired reservation holds on access as well as with a scheduled job?",
          choices: [
            "It removes the need for atomic assignment",
            "It prevents a crashed cleanup worker from stranding inventory indefinitely",
            "It makes spot availability eventually consistent without a uniqueness guard",
            "It lets expired holds remain visible to dispatchers without blocking new claims",
          ],
          answerIndex: 1,
          explanation:
            "The scheduled job provides timely cleanup, while on-access reconciliation closes the failure window when that job is delayed or down.",
        },
        {
          kind: "security",
          question: "Why separate manual override permission from ordinary exit?",
          choices: [
            "Overrides can bypass payment and inventory controls, so they need stronger authorization and audit",
            "Ordinary exit is an administrative function",
            "Separate roles simplify the ticket state machine",
            "Overrides never affect money or gate state",
          ],
          answerIndex: 0,
          explanation:
            "Overrides are exceptional capabilities with financial and physical effects, so routine exit rights should not imply them.",
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
            "An elevator is a small moving room with a strict etiquette: doors open only when stopped, requests are remembered, and emergency rules outrank convenience. Treating it as a simple up-or-down boolean hides the dangerous parts. The design needs separate states for motion, door position, direction, load, and safety interlocks. A polished control panel is useful only if the machine underneath respects those boundaries. A technician labels the car's floor, direction, door, load, and safety mode on a checklist, and refuses a move instruction until every required mark is present on the panel.",
          engineer:
            "Define ElevatorCar, Request, Door, Display, Dispatcher, and Sensor interfaces. Car state should include current floor, direction, target stops, door state, load, and operational mode such as normal, maintenance, or emergency. Requests can be hall calls with desired direction or cabin calls with a destination. Encode legal transitions explicitly: doors cannot open while moving, and motion cannot begin until doors are closed and locked. Keep safety-critical decisions in a deterministic controller, separate from scheduling heuristics and presentation. Sensors should report health explicitly so a stale reading is not mistaken for a safe one.",
          visualId: "elevator-dispatch",
          visualCaption: "The notation panel decodes a queueing equation and does not represent car states. A bespoke state diagram is required for floor, direction, doors, load, and safety interlocks.",
        },
        {
          title: "Implement SCAN and LOOK scheduling",
          story:
            "An elevator that sweeps from the top floor to the bottom after every request wastes everyone's time. SCAN goes to an endpoint and reverses; LOOK reverses after the last request in its current direction, which is usually more efficient in a quiet building. The controller keeps an ordered set of stops ahead and chooses a direction without reversing on every new request. Think of it as a bus route that finishes the useful stops before turning around, not a taxi that panics at each new passenger. At the eighth floor, the car finishes the remaining upward requests, turns after the last useful stop under LOOK, and only travels to the roof if SCAN policy demands it.",
          engineer:
            "Represent cabin and hall stops as ordered sets or balanced trees keyed by floor. While moving upward, serve requested floors at or above the current position; choose LOOK when no higher stop remains, and SCAN when policy requires continuing to the top. At a stop, open doors after arrival confirmation, service compatible hall calls in the current direction, then close and continue. New requests in the opposite direction wait until the car reverses unless safety or accessibility policy changes that rule. Use a monotonically advancing position source and dwell timeout rather than wall-clock-only estimates. Unit tests should assert the exact served sequence for mixed requests.",
          visualId: "elevator-dispatch",
          visualCaption: "The queue-and-workers panel treats pending stops as queued work and cars as workers. It does not encode floor direction, so a bespoke floor-strip animation is required to show LOOK reversing after the last useful stop.",
        },
        {
          title: "Dispatch multiple cars without starvation",
          story:
            "One elevator serving every button in a skyscraper becomes a moving bottleneck. Several cars help only if the dispatcher sends each one a sensible stream. If every request goes to the nearest door, a car near the lobby can be overwhelmed while another idles upstairs. A good dispatcher balances distance, current direction, existing stops, load, and fairness. The goal is not to win one request quickly; it is to keep the whole building moving. The dispatcher notices one lobby car overloaded with stops and sends the next request upstairs, then marks the disabled car unavailable before assigning any work.",
          engineer:
            "Score candidate cars using estimated arrival time, direction compatibility, number of pending stops, load, and maintenance status. Assign each hall call once, or make assignment idempotent so duplicate messages do not create conflicting ownership. Avoid assigning new work to a car already overloaded with intermediate stops, and reserve a car for accessibility or emergency policies when required. Rebalance idle cars toward demand zones during predictable peaks. Bound dispatch computation and provide a fallback to the least-loaded eligible car. Tests should cover simultaneous hall calls, a full car, a disabled car, stale position reports, and requests arriving during a direction reversal.",
          visualId: "elevator-dispatch",
          visualCaption: "Hall requests enter a dispatch point and split across available cars. Read the two lanes as candidate assignment; a bespoke multi-car scoring view should add direction, load, and pending stops.",
        },
        {
          title: "Design for edge cases, failure, and determinism",
          story:
            "Real elevators face stuck doors, overloaded cabins, power loss, and buttons pressed at awkward moments. Software tests love these cases because physical buildings do not. A deterministic simulator should advance sensors, requests, dwell timers, and door interlocks through legal sequences. If the same request stream always produces the same behavior, engineers can improve scheduling without fearing that a rare sequence leaves a passenger between floors. A test technician sends a stuck-door signal, advances the simulated clock, and verifies that dwell extends once before the car enters maintenance mode with a recorded reason.",
          engineer:
            "Inject a clock and sensor interfaces, then step the controller through arrival, door opening, boarding dwell, door closing, and movement. Handle overweight by preventing motion and keeping doors open or returning to a safe floor according to policy. A door obstruction should restart or extend dwell within a bounded limit; persistent faults move the car to maintenance mode. On communication loss between dispatcher and car, the local controller must continue safe service or stop at the next floor. Use explicit transition guards and reject impossible commands in tests. Log state changes with car ID, sequence, and reason so post-incident replay can reconstruct behavior.",
          visualId: "elevator-dispatch",
          visualCaption: "The realtime panel compares polling, SSE, and WebSocket cadence rather than controller steps. A bespoke deterministic simulator is required to show arrival, dwell, obstruction, failure, and interlock transitions.",
        },
        {
          title: "Protect control commands and operational access",
          story:
            "An elevator control network should not accept instructions from anyone who can reach the cable. Maintenance mode, remote recovery, and emergency overrides are powerful capabilities, so they need stronger proof than a hallway button. The security boundary combines local safety interlocks with authenticated command channels. No software permission should be able to open doors at speed or bypass an overweight interlock; authorization controls who may request an action, while the controller still decides whether it is safe. A replayed maintenance badge is rejected at the controller, while an authenticated request to move still fails because the door sensor reports open.",
          engineer:
            "Authenticate car and dispatcher channels, sign control messages with freshness and sequence checks, and separate maintenance roles from routine hall requests. Apply rate limits and bounded command queues to prevent control-channel flooding. Keep safety interlocks in the trusted controller, independent of remote scheduling. Audit maintenance, emergency, and configuration changes with actor and reason. Reject stale or replayed commands, and fail to a defined local safe state when communication is lost. Verify with simulated message replay, role-boundary tests, disabled network links, overweight interlocks, and door-obstruction scenarios that cannot produce unsafe motion.",
          visualId: "elevator-dispatch",
          visualCaption: "Untrusted control commands meet a shield before the trusted car controller. Read the shield as authenticated, fresh commands; the controller behind it must still reject unsafe door or load states.",
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
          kind: "scenario",
          question: "A car receives a hall call above it while other upward stops remain. Under LOOK, what should it do?",
          choices: [
            "Serve remaining upward stops before reversing after the last useful request",
            "Reverse immediately for the newest call",
            "Travel to the top floor regardless of pending stops",
            "Ignore all hall calls until the car is idle",
          ],
          answerIndex: 0,
          explanation:
            "LOOK continues in the current direction while useful stops remain, then reverses without an unnecessary trip to the endpoint.",
        },
        {
          kind: "tradeoff",
          question: "What is the main difference between SCAN and LOOK?",
          choices: [
            "LOOK serves only one floor per trip",
            "SCAN continues to an endpoint; LOOK reverses after the last request in its direction",
            "SCAN always uses a FIFO queue rather than floor order",
            "LOOK prioritizes reversing over servicing compatible hall calls",
          ],
          answerIndex: 1,
          explanation:
            "SCAN favors a full sweep to the endpoint, while LOOK avoids empty travel beyond the last requested floor.",
        },
        {
          kind: "story-match",
          question: "In the test-technician story, why inject a clock and deterministic sensors?",
          choices: [
            "So tests exercise the physical motor controller directly",
            "So random failures occur on every step",
            "So illegal transitions are skipped",
            "So the same awkward sequence can be replayed and asserted precisely",
          ],
          answerIndex: 3,
          explanation:
            "Deterministic inputs turn rare door, dwell, and failure sequences into repeatable software tests with exact expected states.",
        },
        {
          kind: "security",
          question: "What must remote authorization never override?",
          choices: [
            "Display brightness",
            "Idle-car parking preferences",
            "Local door-closed, load, and sensor safety interlocks",
            "Scheduling preferences",
          ],
          answerIndex: 2,
          explanation:
            "Authorization controls who may request an action; the trusted local controller still rejects any physically unsafe action.",
        },
      ]),
    },
  ],
};

type LessonSeed = (typeof trackCaseStudiesData.lessons)[number];

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
      return {
        id: `${seed.id}-step-${index + 1}`,
        title: entry.title,
        story: entry.story,
        engineer: entry.engineer,
        visualId: entry.visualId as LessonStep["visualId"],
        visualCaption: entry.visualCaption,
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

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
  "single-server": "A bicycle repair shop discovers that adding counters does not create another mechanic or a shared customer ledger.",
  "networking-protocols": "Follow a courier, a tray of numbered cafe orders, and a catering ticket through the protocols that move requests.",
  "load-balancing": "A coffee-shop host matches parties to tables, watches readiness lamps, and guards the entrance during a festival rush.",
  "caching-eviction": "A pre-brewed espresso counter becomes fast only when labels, freshness rules, and isolated preparation stations are trustworthy.",
  "sql-modeling": "A property office replaces duplicated paper records with linked cards, atomic transaction trays, and a useful library catalog.",
  "scaling-databases": "A library opens catalog branches but keeps urgent reservations on the authoritative central ledger.",
  "rate-limiting": "A club bouncer carries a handful of tokens and coordinates several entrances without closing the staff door.",
  "queues-jobs": "A kitchen ticket rail separates ordering from cooking and gives damaged tickets a controlled review basket.",
  realtime: "An airport board, a museum microphone, and a two-way design radio reveal three ways to deliver live updates.",
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

export const trackFoundations: Track = {
  id: "foundations",
  slug: "foundations",
  title: "System Design Foundations",
  accent: "emerald",
  summary:
    "Build a reliable service from one machine to a coordinated system. These lessons connect requests, data, caches, queues, and live connections to the capacity limits and failure modes that appear as traffic grows.",
  lessons: [
    lesson({
      id: "single-server",
      trackId: "foundations",
      title: "Single Server to Scale",
      summary:
        "Learn why one server works at first, how its resources become bottlenecks, and which state must move elsewhere before horizontal scaling is safe.",
      minutes: 9,
      prerequisites: [],
      steps: [
        step({
          title: "One counter serves the whole shop",
          story:
            "Mara opens a small bicycle repair shop with one counter, one mechanic, and one toolbox. At first, every customer can explain the problem, wait beside the workbench, and collect a repaired bicycle without confusion. When a dozen neighbors arrive on Saturday morning, the same arrangement still feels friendly. By summer, however, the mechanic is answering the phone while holding a wrench, the counter is buried in paper tickets, and paying customers wait behind a long conversation. Adding a second counter does not create another mechanic, so the shop discovers that capacity belongs to a whole chain of tasks, not just the busiest visible person.",
          engineer:
            "A single server combines application code, memory, disk, network sockets, and often the database. Vertical scaling adds CPU, RAM, or faster disks, but it eventually meets cost, hardware, and availability limits. Measure utilization and queueing at every tier before choosing a remedy. CPU saturation suggests compute work, memory pressure can cause swapping, and saturated disk bandwidth can make a simple lookup slow. A common failure is buying a larger machine while an uncached report or unbounded connection pool is the real constraint. Establish a baseline for throughput, p95 and p99 latency, error rate, and resource saturation under representative traffic.",
          visualId: visual("traffic-flow"),
          visualCaption:
            "A single application server and database share every incoming request and their local resources.",
        }),
        step({
          title: "Follow the request, not the machine",
          story:
            "At the repair counter, an order passes through several hands: reception records the customer's name, the mechanic inspects the bicycle, a parts runner checks the shelf, and the cashier closes the ticket. Mara times each stop and notices that most waiting happens when the parts runner visits the warehouse for one missing bolt. Speeding up the cashier barely helps. She places common bolts beside the workbench and gives inspection jobs to a second mechanic. The lesson is not that one worker is bad; it is that the slowest stage controls how quickly the whole shop can finish an order.",
          engineer:
            "Trace one request from the client through DNS, connection establishment, authentication, application work, database calls, and response serialization. Little's Law links concurrency, arrival rate, and time in the system, so rising latency often means queues are forming even when average utilization looks acceptable. Thread pools, database pools, and listen backlogs all impose limits. Tail latency deserves attention because a request that fans out to several dependencies waits for the slowest one. Avoid adding retries without deadlines; retries can multiply work precisely when the server is overloaded. Load shedding protects the work already admitted instead of letting every queue grow without bound.",
          visualId: visual("traffic-flow"),
          visualCaption:
            "A request crosses several processing stages and accumulates queueing delay at the slowest one.",
        }),
        step({
          title: "Local state is a suitcase with your name on it",
          story:
            "The shop keeps each customer's repair history in a notebook behind the counter. If Mara takes the notebook home, nobody at the counter can answer a question, and a second shop across town cannot use the same records. Uploaded photographs are stored on one camera's memory card. When that camera fails, the photographs disappear with the device. Moving the customer ledger to a shared office and sending photographs to a protected archive lets different employees use the same information. It also introduces new dependencies: the office needs its own access rules and a reliable connection.",
          engineer:
            "Stateful applications tie requests to a particular process through sessions, local files, in-memory caches, or scheduled jobs. Externalize durable state into managed storage and move sessions to a shared store or signed client tokens with careful validation. Local memory may still be useful for disposable caches, but losing it must not lose the source of truth. Backups address data loss, while replication and failover address availability; they solve different problems. A dangerous assumption is that an ordinary backup makes a single database highly available. Define recovery point and recovery time objectives, test restoration, and make application instances replaceable before relying on horizontal scaling.",
          visualId: visual("replication"),
          visualCaption:
            "Durable customer records move from one server's local storage to shared replicated storage.",
        }),
        step({
          title: "Add cashiers, keep one trusted ledger",
          story:
            "Mara hires two more cashiers and puts a host at the front door. Each cashier can answer questions and accept payment, while the central ledger still records every repair exactly once. During a lunch rush, one cashier calls in sick and the host simply stops sending new orders to that station. Customers still reach the shop, although the remaining staff have less spare capacity. The host must know which stations are open, avoid sending a customer to a closed register, and refuse new work when all stations are busy. The ledger becomes a shared dependency that needs its own protection.",
          engineer:
            "Horizontal scaling adds interchangeable application instances behind a load balancer. Instances should be stateless, health checked, and able to start without manual preparation. Keep enough spare capacity to lose an instance during peak traffic, and bound connection pools so many replicas do not overwhelm the database. The application tier can be redundant while the database remains a single point of failure, so redundancy must be evaluated across the complete request path. Capacity planning should use measured service time and target utilization, not a fixed requests-per-server estimate. Graceful draining lets an instance finish admitted requests before it stops receiving new ones.",
          visualId: visual("traffic-flow"),
          visualCaption:
            "A load balancer sends requests to interchangeable application instances sharing durable storage.",
        }),
      ],
      security: [
        practice({
          threat:
            "Secrets and customer records are exposed when credentials, session data, or uploaded files sit on a general-purpose server without clear protection.",
          control:
            "Use a secrets manager with short-lived credentials, TLS in transit, encryption at rest, and object storage with private defaults and narrowly scoped application access.",
          verify:
            "Review secret-access logs, confirm storage buckets reject anonymous access, and restore an encrypted backup into an isolated environment to prove recovery works.",
        }),
        practice({
          threat:
            "An unpatched operating system or an overprivileged application turns one vulnerable component into control of the entire host and its local data.",
          control:
            "Patch the base image, run the service as a non-root user, apply host hardening, and grant only the files, ports, and outbound destinations it needs.",
          verify:
            "Inspect the running container or process identity, scan the image, and test that the service cannot read unrelated host files or reach unused network services.",
        }),
        practice({
          threat:
            "A burst of public traffic exhausts connections or CPU and prevents legitimate customers from reaching the service.",
          control:
            "Place admission controls and connection limits at the edge, cap application and database pools, and return a clear busy response before resource queues grow without bound.",
          verify:
            "Use an authorized load test with a documented ceiling and confirm that rejected traffic is counted, latency for admitted work stays bounded, and the host remains reachable for health checks.",
        }),
      ],
      quiz: [
        question({
          topicId: "single-server",
          kind: "scenario",
          prompt:
            "A checkout service has low CPU usage but p99 latency rises sharply every evening. What is the best first investigation?",
          choices: [
            "Replace the server with a larger CPU immediately",
            "Trace dependency times and inspect database, thread, and connection pool queues",
            "Disable health checks so more requests can enter",
            "Store all sessions in local memory",
          ],
          answerIndex: 1,
          explanation:
            "Low CPU can coexist with queueing on a disk, downstream service, or bounded worker pool; tracing identifies the actual bottleneck.",
        }),
        question({
          topicId: "single-server",
          kind: "security",
          prompt:
            "Which design best protects customer uploads when application instances are replaced frequently?",
          choices: [
            "Write uploads to each instance's temporary folder",
            "Keep uploads in the server's root home directory",
            "Use private encrypted object storage with scoped service credentials",
            "Embed upload contents in session cookies",
          ],
          answerIndex: 2,
          explanation:
            "Private encrypted object storage survives instance replacement and can enforce least-privilege access independently of the application host.",
        }),
        question({
          topicId: "single-server",
          kind: "tradeoff",
          prompt:
            "Why might a team choose vertical scaling before splitting an application?",
          choices: [
            "It removes every possible failure mode",
            "It preserves a simple deployment and shared transactions while buying time",
            "It eliminates the need for backups",
            "It guarantees lower cost at every scale",
          ],
          answerIndex: 1,
          explanation:
            "A larger machine can delay architectural complexity, but it has cost, hardware, and availability limits and is usually a temporary strategy.",
        }),
        question({
          topicId: "single-server",
          kind: "story-match",
          prompt:
            "In the bicycle shop story, why is moving the customer ledger to a shared office important?",
          choices: [
            "It lets interchangeable cashiers use the same durable records",
            "It makes every repair twice as fast",
            "It removes the need for access rules",
            "It replaces the need for a backup",
          ],
          answerIndex: 0,
          explanation:
            "Externalizing durable state lets new application instances serve any request without depending on one machine's local notebook.",
        }),
      ],
    }),
    lesson({
      id: "networking-protocols",
      trackId: "foundations",
      title: "Networking and Protocols",
      summary:
        "Compare DNS, HTTP/2, HTTP/3, and gRPC by following how names become connections, requests share a link, and services define reliable contracts.",
      minutes: 12,
      prerequisites: ["single-server"],
      steps: [
        step({
          title: "A name is an address with directions",
          story:
            "A courier is handed a shop name, Maple Street Bakery, rather than a street number. The courier first asks a local address book, then a city directory, and finally the bakery's own registry. Each answer may be cached for a while because rebuilding the entire directory for every delivery would be wasteful. If the bakery moves, the registry changes, but old address books can keep sending couriers to the empty lot until their copies expire. A good delivery service records how long an answer may be reused and can try another address when a location is unavailable.",
          engineer:
            "DNS resolves names to records through recursive resolvers and authoritative servers. TTLs control caching, while low TTLs improve failover speed at the cost of more queries and operational exposure to resolver failures. Record types matter: address records identify hosts, aliases connect names, and certificate authorities may consult specialized records during certificate issuance. A common failure is changing a database endpoint without accounting for resolver caches, application connection pools, or long-lived sessions. Monitor resolution latency and errors, keep resolver capacity in mind, and use provider health checks rather than assuming that every DNS answer is currently reachable.",
          visualId: visual("traffic-flow"),
          visualCaption:
            "A client resolves a hostname through cached DNS answers before opening a connection to a server.",
        }),
        step({
          title: "One road, many labeled orders",
          story:
            "A cafe takes orders on numbered slips. In the old system, the barista finishes writing one complete slip before looking at the next, so a slow explanation blocks every customer behind it. The new system lets several slips travel together on one tray, each with its own number and size. If the milk shipment is delayed, only the latte order waits; the toast order can still arrive. The tray has a limited amount of space, and the kitchen must track how much each slip occupies so one enormous catering order does not crowd out everyone else.",
          engineer:
            "HTTP/2 multiplexes many request and response streams over one TCP connection, reducing connection setup overhead and avoiding application-level head-of-line blocking between streams. Header compression and flow control reduce repeated metadata and protect receivers, but TCP still delivers bytes in order, so a lost packet can delay every stream on that connection. HTTP/1.1 keep-alive saves setup work but serial handling or limited connections can create different bottlenecks. Configure connection and stream limits deliberately. A production failure is pooling only one HTTP/2 connection per service: packet loss can then stall all traffic for that service, while opening connections without bounds can exhaust sockets.",
          visualId: visual("traffic-flow"),
          visualCaption:
            "Multiple HTTP/2 streams share one connection while independent responses make progress.",
        }),
        step({
          title: "Separate packages can pass a blocked lane",
          story:
            "A delivery company discovers that one flooded road stops an entire convoy, even when many parcels were heading to different neighborhoods. It switches to individually numbered waterproof packages. If one package is lost, the driver can request that package again without holding all the others at the depot. The company also gives frequent customers a reusable dispatch token to skip familiar paperwork, but it carefully avoids promising that an old dispatch token can be reused after a delivery has already been accepted. Drivers must still check road signs because some older routes do not understand the new package system.",
          engineer:
            "HTTP/3 uses QUIC over UDP with integrated TLS 1.3 and independent streams. Because loss recovery and stream state are implemented above UDP, a lost packet does not block unrelated streams as it can with shared TCP. QUIC still performs congestion control and reliable delivery where needed; it is not permission for unbounded traffic. Connection migration can preserve sessions across network changes, useful on mobile devices. Early data can reduce latency, but servers must restrict it to operations safe to replay and must retain replay defenses. Some networks treat UDP unfavorably, so measure HTTP/3 reachability and maintain a controlled fallback instead of assuming universal support.",
          visualId: visual("traffic-flow"),
          visualCaption:
            "Independent QUIC streams continue past a lost packet while TLS protects the connection.",
        }),
        step({
          title: "A kitchen ticket is a contract",
          story:
            "Two restaurants share a catering kitchen. One sends handwritten notes saying 'the usual,' and the other interprets that differently whenever the menu changes. They replace the notes with a printed ticket that names every field: table number, dish code, quantity, allergy marker, and delivery window. Both kitchens keep a copy of the ticket format. A missing field is rejected before cooking starts, and a delivery deadline tells the kitchen when to stop waiting. When a new optional garnish is introduced, older ticket readers can ignore it without losing the core order.",
          engineer:
            "gRPC commonly uses HTTP/2 for transport and Protocol Buffers for compact, versioned messages. Services publish schemas so teams can generate clients and validate contracts. Unary calls fit request-response work, while server, client, and bidirectional streaming support ongoing exchanges. Deadlines bound waiting, cancellation releases upstream work, and metadata carries selected cross-cutting context. Schema compatibility is not automatic: removing or repurposing field numbers can break deployed clients. A frequent failure is omitting deadlines, which turns a slow dependency into threads and connections held indefinitely. Retries must be limited and safe for the specific method, especially when a response was lost after the server committed work.",
          visualId: visual("notation-decoder"),
          visualCaption:
            "A versioned message schema maps application fields into a compact gRPC request contract.",
        }),
      ],
      security: [
        practice({
          threat:
            "Forged or stale DNS answers direct clients to an impostor service or keep traffic on a retired endpoint.",
          control:
            "Use reputable recursive resolvers, enable DNSSEC for domains you control, validate all HTTPS certificates, and monitor authoritative record changes.",
          verify:
            "Confirm signed zones validate at independent resolvers and alert on unexpected record changes or certificate mismatches before they affect users.",
        }),
        practice({
          threat:
            "Traffic is read or modified on the path between a client, proxy, and origin service.",
          control:
            "Require modern TLS with certificate and hostname validation on every hop, use private authenticated transport between services, and rotate certificates automatically.",
          verify:
            "Test that invalid certificates are rejected, inspect expiration alerts, and verify that internal service calls fail when presented with an untrusted certificate.",
        }),
        practice({
          threat:
            "Early or repeated requests are accepted more than once, or a replayed message causes a sensitive operation to run again.",
          control:
            "Make safe methods replayable, require idempotency protection for sensitive gRPC operations, and restrict or disable early data where replay cannot be safely handled.",
          verify:
            "Run contract tests with duplicate delivery and expired client submissions, confirming that the service rejects unsafe repeats and returns the original safe result.",
        }),
      ],
      quiz: [
        question({
          topicId: "networking-protocols",
          kind: "scenario",
          prompt:
            "After changing a database hostname, some application instances still connect to the old address for an hour. What should the team examine first?",
          choices: [
            "The HTTP request body size",
            "DNS TTLs plus application resolver caches and existing connection pools",
            "The number of Kafka partitions",
            "The cache eviction algorithm",
          ],
          answerIndex: 1,
          explanation:
            "A changed DNS record does not update cached resolver answers or replace connections already held by an application.",
        }),
        question({
          topicId: "networking-protocols",
          kind: "security",
          prompt:
            "Which control most directly reduces the risk of a client trusting a fake HTTPS endpoint?",
          choices: [
            "Accepting any certificate during development and production",
            "Increasing DNS TTLs",
            "Validating the certificate chain and hostname and trusting only configured authorities",
            "Compressing response headers more aggressively",
          ],
          answerIndex: 2,
          explanation:
            "Certificate chain and hostname validation authenticate the endpoint when clients correctly enforce trust and identity checks.",
        }),
        question({
          topicId: "networking-protocols",
          kind: "tradeoff",
          prompt:
            "Why can HTTP/3 improve performance during packet loss while still requiring congestion control?",
          choices: [
            "It removes the need for reliable delivery",
            "Independent QUIC streams avoid shared packet-order blocking, but senders must still protect the network from overload",
            "It makes every UDP packet arrive exactly once",
            "It guarantees that all middleboxes support UDP",
          ],
          answerIndex: 1,
          explanation:
            "QUIC isolates stream loss recovery while retaining congestion control, retransmission, and flow-control responsibilities.",
        }),
        question({
          topicId: "networking-protocols",
          kind: "story-match",
          prompt:
            "What does the numbered catering ticket represent in the gRPC lesson?",
          choices: [
            "A shared database index",
            "A server load-balancing algorithm",
            "A versioned message schema with explicit fields and deadlines",
            "A cache expiration policy",
          ],
          answerIndex: 2,
          explanation:
            "The ticket's named fields and agreed format model gRPC schemas, while its delivery window models deadlines.",
        }),
      ],
    }),
    lesson({
      id: "load-balancing",
      trackId: "foundations",
      title: "Load Balancing",
      summary:
        "Design a traffic host that chooses healthy servers, preserves the right kind of session, and protects the service without becoming a fragile single point.",
      minutes: 10,
      prerequisites: ["single-server", "networking-protocols"],
      steps: [
        step({
          title: "The host seats the whole party",
          story:
            "At a busy coffee shop, a host stands between the door and the tables. Two friends who want to talk should sit at the same small table, while a family of six needs the long counter. The host knows which tables are clean, which servers are already carrying trays, and which area has room for a stroller. Simply sending every arrival to table one would create a crowd while other tables stayed empty. Sending a family to a tiny table would create a different problem, so the host matches party size to available space and keeps a short waiting list when the room is genuinely full.",
          engineer:
            "A load balancer distributes traffic across healthy application instances and presents one stable entry point. Layer 4 balancers route transport connections using network information, while layer 7 balancers can inspect HTTP paths, headers, and cookies. Choice depends on required routing, protocol support, TLS ownership, and observability. Least-connections and latency-aware policies can outperform round robin when request costs differ substantially. The main failure is balancing only by connection count: one connection may carry many cheap requests while another holds one expensive report. Measure backend service time and use weights or queue-aware routing where the platform supports them.",
          visualId: visual("traffic-flow"),
          visualCaption:
            "A load balancer matches incoming requests to healthy backends with different available capacity.",
        }),
        step({
          title: "Ask whether a station is really open",
          story:
            "The shop puts a small green lamp beside each serving station. The lamp turns on only when the cash drawer works, the coffee grinder is ready, and the station has an employee. A broken lamp is not enough: once every minute, the host asks a lightweight question and listens for the expected answer. During a software update, the station displays an amber light, finishes its current orders, and then turns off the green lamp. If the station stops answering entirely, the host stops seating new guests there after a small number of failed checks.",
          engineer:
            "Health checks should reflect readiness to serve useful work without creating heavy side effects. Separate liveness, which decides whether a process should restart, from readiness, which decides whether it should receive traffic. Thresholds, intervals, and timeouts determine detection speed and sensitivity to brief stalls. Slow-start or gradual traffic ramp prevents a recovered instance from being overwhelmed immediately. Common failures include checking only that a port is open, removing a backend after one transient timeout, and failing all backends together during a shared dependency outage. Log health transitions and alert on flapping rather than treating every change as routine.",
          visualId: visual("deploy-strategies"),
          visualCaption:
            "Readiness checks gradually return updated backends to service while unhealthy ones are removed.",
        }),
        step({
          title: "Remember the table, not the worker",
          story:
            "A guest leaves a coat at table twelve and returns after fetching a napkin. The host remembers the table assignment until the meal ends, but the restaurant does not promise that the same waiter will always stand nearby. When a waiter takes a break, another trained waiter can serve the table because the order lives on the shared ticket rail. The host also notices that one guest changes seats every few minutes, making the seating chart harder to maintain. The restaurant prefers shared tickets when possible and keeps table memory only for short interactions that truly require it.",
          engineer:
            "Sticky sessions bind a client to one backend and can preserve local state, but they complicate failover, create uneven load, and hide bad state design. Prefer stateless services with shared durable state. If affinity is necessary, use a bounded lifetime, balanced routing, and explicit behavior when the selected backend disappears. Layer 7 cookies may support safer affinity than source-address rules behind mobile networks or proxies. Capacity planning must assume that sticky distributions can be uneven, especially after an instance is removed. Never let the balancer's notion of affinity override a backend's readiness or draining state.",
          visualId: visual("traffic-flow"),
          visualCaption:
            "Session affinity keeps selected requests together while other traffic remains evenly distributed.",
        }),
        step({
          title: "The front door needs its own guards",
          story:
            "On a festival night, the coffee shop host also controls the entrance. Tickets are checked at the edge, visitors with invalid tickets are turned away politely, and a separate queue prevents one large group from blocking the doorway. The host watches both the door and the room, slowing admissions when every table is occupied. Behind the host, several doors lead into the same shop, so a broken outer door does not close the business. Staff verify that only trusted hosts can change table assignments, because an unverified instruction could send a guest into the kitchen.",
          engineer:
            "Deploy the load-balancing layer redundantly and make backend discovery independent of any single control node. Terminate TLS where it provides the clearest security and routing policy, then protect the origin network so traffic cannot bypass edge controls. Connection limits, request-size limits, rate limits, and timeouts bound the resources an individual client can consume. Ensure trusted-proxy headers are accepted only from known proxies; otherwise client-supplied routing metadata can distort security decisions. Test failover under real traffic and monitor the load balancer's own queue, error budget, and backend saturation, not just application metrics.",
          visualId: visual("threat-defense"),
          visualCaption:
            "Redundant edge balancers absorb traffic, enforce admission policy, and route only to private origins.",
        }),
      ],
      security: [
        practice({
          threat:
            "Volumetric or application-layer traffic saturates public links, connection tables, or every backend at once.",
          control:
            "Use provider edge DDoS protection, distribute entry points, enforce connection and request limits, and rate-limit before expensive application work begins.",
          verify:
            "Review edge mitigation logs during authorized tests and confirm that origin utilization stays within the tested ceiling while rejected requests receive consistent responses.",
        }),
        practice({
          threat:
            "Untrusted forwarding headers let callers spoof client identity, bypass per-client limits, or influence routing policy.",
          control:
            "Strip client-supplied forwarding headers at the edge and accept replacement values only from an explicit list of trusted proxies.",
          verify:
            "Send test requests through the documented trusted path and confirm that downstream applications see only verified proxy metadata and consistent client identity.",
        }),
        practice({
          threat:
            "An attacker bypasses the protected load balancer and reaches an origin directly, avoiding edge filtering and audit controls.",
          control:
            "Keep origins private, allow origin traffic only from the balancer or private service network, and authenticate that path with managed certificates or a mesh identity.",
          verify:
            "Test connectivity from outside the allowed path and confirm it is blocked, then inspect origin logs to ensure accepted traffic carries the expected authenticated route.",
        }),
      ],
      quiz: [
        question({
          topicId: "load-balancing",
          kind: "scenario",
          prompt:
            "Round robin sends equal request counts to two servers, but one still has high latency. What is the most plausible explanation?",
          choices: [
            "Equal request counts always mean equal load",
            "The slow server may receive more expensive requests or have fewer available workers",
            "The load balancer must be using sticky sessions",
            "DNS resolution is disabled",
          ],
          answerIndex: 1,
          explanation:
            "Request cost and worker availability vary, so equal counts do not guarantee balanced resource use or latency.",
        }),
        question({
          topicId: "load-balancing",
          kind: "security",
          prompt:
            "Why should origins remain private after a load balancer is deployed?",
          choices: [
            "Private origins prevent clients from bypassing edge rate limits, filtering, and audit controls",
            "Private origins remove the need for authentication",
            "Private origins make DNS optional",
            "Private origins guarantee zero latency",
          ],
          answerIndex: 0,
          explanation:
            "Restricting origin access preserves the load balancer as the enforced entry point rather than an optional path.",
        }),
        question({
          topicId: "load-balancing",
          kind: "tradeoff",
          prompt:
            "What is the main cost of using sticky sessions to preserve local application state?",
          choices: [
            "They make TLS impossible",
            "They remove health checks",
            "They reduce failover flexibility and can produce uneven backend load",
            "They prevent all connection reuse",
          ],
          answerIndex: 2,
          explanation:
            "Affinity ties clients to instances, so losing an instance disrupts its clients and traffic distributions can become imbalanced.",
        }),
        question({
          topicId: "load-balancing",
          kind: "story-match",
          prompt:
            "In the coffee-shop story, what does the host's green lamp represent?",
          choices: [
            "A database transaction log",
            "A backend readiness signal used for traffic admission",
            "A client session cookie",
            "A consistent-hashing ring",
          ],
          answerIndex: 1,
          explanation:
            "The lamp models readiness: a backend receives new work only when it can actually serve it.",
        }),
      ],
    }),
    lesson({
      id: "caching-eviction",
      trackId: "foundations",
      title: "Caching and Eviction",
      summary:
        "Use cached answers to reduce origin work while controlling freshness, key design, memory pressure, stampedes, and the security boundary around shared data.",
      minutes: 11,
      prerequisites: ["single-server", "sql-modeling"],
      steps: [
        step({
          title: "Espresso is prepared before the rush",
          story:
            "A small cafe keeps a row of pre-brewed espresso cups beside the register. Most customers want the same drink, so handing over a prepared cup saves the barista from grinding beans for every order. If nobody orders espresso for an hour, the old cups are discarded rather than filling the counter forever. On a cold morning, two baristas may discover the empty tray at the same moment and both start a new batch. One holds the preparation lock while the other waits, preventing duplicate work. The counter is fast, but it is not the source of truth: the beans and recipe still live in the back room.",
          engineer:
            "A cache stores a derived or replicated answer closer to the consumer to reduce latency and origin load. Cache-aside lets the application read the cache, load a miss from the origin, and write the result with an expiration policy. The hit ratio measures usefulness, but it must be considered with origin cost, memory use, and freshness requirements. A cache is not a durable database unless explicitly designed as one. Common failure modes include serving expired data indefinitely, caching errors, and allowing every instance to refill the same missing item simultaneously. Add request coalescing or a short-lived lock for expensive misses and define behavior when the cache is unavailable.",
          visualId: visual("cache-ring"),
          visualCaption:
            "Frequently requested values stay in a bounded cache while misses travel to the origin.",
        }),
        step({
          title: "The cup label must name the exact drink",
          story:
            "The prepared cups carry labels such as small oat latte, large regular latte, and decaf. A missing label causes the wrong drink to reach a customer, while a label that includes the barista's name makes the same drink look different to every worker. The cafe also separates cups prepared for a private office order from those on the public counter. When a recipe changes, staff update the recipe version in the label, so an old label cannot silently return a discontinued drink. Good labels are specific enough to prevent mistakes but stable enough that equivalent orders can share a cup.",
          engineer:
            "Cache keys must capture every input that changes the answer: tenant, resource, representation, authorization scope, locale, and relevant version. Normalize equivalent inputs consistently, but never collapse distinct security contexts. Include a version segment or explicit invalidation when data changes. Unbounded key variety can cause low hit ratios and excessive memory even when each value is small. A frequent production mistake is caching a personalized response under a key shared by all users. Use typed key builders, tests for collisions and scope separation, and metrics grouped by key pattern rather than raw user identifiers.",
          visualId: visual("cache-ring"),
          visualCaption:
            "Versioned cache keys separate public, tenant-scoped, and personalized entries.",
        }),
        step({
          title: "Make room without throwing away the wrong cups",
          story:
            "The counter has space for twelve prepared drinks. When it is full, the barista removes the cup that has sat untouched the longest, because it is unlikely to satisfy the next customer. A daily special may be prepared repeatedly and is cheap to remake, while an expensive rare brew can be allowed a larger reserved tray. The barista checks the clock before serving each cup and removes anything beyond its freshness window, even if it was touched moments ago by someone inspecting the label. Size and age are separate rules: a fresh cup still needs room, and an old cup cannot remain simply because it is popular.",
          engineer:
            "Eviction policies decide which entries leave when memory is full. LRU favors recency, LFU favors frequency, and TTL removes entries based on age. Weighted caches account for values with very different sizes. Choose a policy from observed reuse patterns and origin cost, then reserve memory for metadata, fragmentation, and replication overhead. TTL is a freshness bound, not a guarantee that the origin has not changed earlier. Event-driven invalidation can shorten staleness but introduces ordering and failure questions. Watch eviction rates and origin load: a high hit ratio can still collapse if the few remaining misses are the most expensive queries.",
          visualId: visual("cache-ring"),
          visualCaption:
            "TTL expiration and capacity eviction independently remove stale or low-value cache entries.",
        }),
        step({
          title: "Protect the counter and the back room",
          story:
            "A visitor once changed a public cup's label after watching a staff member prepare it. Other customers then received the wrong recipe, and nobody noticed because the cached cup looked official. The cafe now accepts labels only from authenticated preparation stations, checks the recipe version before serving, and keeps private-order cups behind a separate locked counter. It also avoids advertising exactly how long a rare cup takes to prepare, because that timing can reveal information about orders that are not public. The back room remains protected even when the front counter is fast.",
          engineer:
            "Treat cached content as a security-sensitive copy of its source. Validate and authenticate writes, separate namespaces for tenants and privilege levels, and ensure authorization is evaluated for the requesting context rather than inherited blindly from another request. Content delivered through a shared cache should be marked appropriately so intermediaries cannot recombine private and public responses. Cache poisoning is often an integrity or namespace problem, while timing differences can leak whether sensitive records exist. Limit key and value sizes, encrypt sensitive cached data at rest where required, and audit invalidation and administrative access. Measure the cache's behavior during origin and network failures.",
          visualId: visual("threat-defense"),
          visualCaption:
            "Isolated cache namespaces and authenticated invalidation protect shared and private entries.",
        }),
      ],
      security: [
        practice({
          threat:
            "Untrusted or inconsistent cache writes place incorrect content in a shared entry that many users later receive.",
          control:
            "Allow invalidation and cache population only through authenticated application paths, normalize keys centrally, and verify upstream content and version metadata before storage.",
          verify:
            "Test that unauthorized cache updates are rejected and that tenant, locale, and representation variants never resolve to the same stored entry.",
        }),
        practice({
          threat:
            "Observable differences in cache-hit and cache-miss timing reveal whether a private account, document, or entitlement exists.",
          control:
            "Keep authorization and tenant isolation outside the shared cache, standardize observable response timing where needed, and avoid exposing detailed cache diagnostics to clients.",
          verify:
            "Review authorization tests for private resources and compare externally visible responses across equivalent hit, miss, and denial cases without logging sensitive values.",
        }),
        practice({
          threat:
            "Shared cached responses leak personalized or privileged content between users.",
          control:
            "Partition entries by tenant and authorization scope, set appropriate cache-control directives, and keep private responses out of shared intermediary caches.",
          verify:
            "Run cross-user and cross-tenant tests against both application and intermediary caches, confirming that a second caller cannot retrieve the first caller's content.",
        }),
      ],
      quiz: [
        question({
          topicId: "caching-eviction",
          kind: "scenario",
          prompt:
            "A popular cache key expires and thousands of requests simultaneously reach the database. Which control best addresses this failure?",
          choices: [
            "Increase the key's value size",
            "Disable expiration for every key",
            "Coalesce concurrent misses so one loader refreshes the value while others wait",
            "Remove the cache entirely",
          ],
          answerIndex: 2,
          explanation:
            "Request coalescing or a short-lived refresh lock prevents a cache stampede from multiplying expensive origin work.",
        }),
        question({
          topicId: "caching-eviction",
          kind: "security",
          prompt:
            "Why must a cache key include tenant or authorization context for private content?",
          choices: [
            "To increase the number of hash collisions",
            "To prevent one caller from receiving an entry populated for another security scope",
            "To make TTLs unnecessary",
            "To guarantee that every request is a cache miss",
          ],
          answerIndex: 1,
          explanation:
            "Security-scoped keys preserve isolation and stop shared storage from reusing private data across unrelated callers.",
        }),
        question({
          topicId: "caching-eviction",
          kind: "tradeoff",
          prompt:
            "What is the central tradeoff when shortening a cache TTL?",
          choices: [
            "Lower staleness in exchange for more misses and origin load",
            "Higher memory use with no effect on freshness",
            "Fewer cache keys with guaranteed correctness",
            "Stronger transactions with no latency cost",
          ],
          answerIndex: 0,
          explanation:
            "Shorter TTLs bound staleness more tightly but cause values to expire sooner and require more origin work.",
        }),
        question({
          topicId: "caching-eviction",
          kind: "story-match",
          prompt:
            "Why does the cafe use both cup age and counter capacity rules?",
          choices: [
            "They are two names for the same policy",
            "Age controls freshness while capacity controls memory pressure",
            "Age removes all cache misses",
            "Capacity makes labels unnecessary",
          ],
          answerIndex: 1,
          explanation:
            "TTL and eviction solve different problems: freshness and bounded storage.",
        }),
      ],
    }),
    lesson({
      id: "sql-modeling",
      trackId: "foundations",
      title: "SQL Modeling and Indexing",
      summary:
        "Model durable business facts, enforce them with constraints and transactions, and choose indexes that make important queries fast without excessive write cost.",
      minutes: 12,
      prerequisites: ["single-server"],
      steps: [
        step({
          title: "Give each fact one clear home",
          story:
            "A city property office keeps records for owners, buildings, and inspections. Initially, every inspection sheet repeats the owner's phone number, the building's address, and the inspector's name. When an owner changes a phone number, staff must find dozens of sheets and hope they update every copy. A clerk redesigns the cabinet with one owner card, one building card, and separate inspection cards that refer to them. The office can now answer who owns a building without searching every inspection, and it can record many inspections without duplicating the building's address. The layout makes each relationship visible before anyone starts writing queries.",
          engineer:
            "Relational modeling represents entities as tables and relationships through keys. Normalization reduces duplicated facts and update anomalies, while deliberate denormalization can simplify important reads when consistency is managed explicitly. Choose grain first: define exactly what one row means before adding columns. Foreign keys express valid relationships, unique constraints protect business identifiers, and check constraints enforce valid ranges. Not-null and type constraints prevent ambiguous states. A common failure is modeling a many-to-many relationship as comma-separated identifiers in one cell, which prevents reliable joins and referential checks. Keep domain invariants close to the data so every writer follows them.",
          visualId: visual("btree-lsm"),
          visualCaption:
            "Normalized tables link owners, buildings, and inspections through explicit keys.",
        }),
        step({
          title: "Transfer the deed without a missing page",
          story:
            "Two clerks transfer a building from one owner to another. The ownership card is updated first, the payment ledger second, and the inspection folder third. If the power fails between steps, the records disagree. The office introduces a transaction tray: all three papers are placed in the tray, checked together, and either filed together or returned together. A second clerk cannot see half of the transfer while it is being filed. If a later step fails, the whole tray is removed, leaving the previous consistent record intact. The tray becomes a shared promise about what the records mean. Every clerk follows the same all-or-nothing rule.",
          engineer:
            "Transactions group operations into an atomic unit. Isolation determines what concurrent transactions can observe, while durability ensures committed work survives the failures covered by the storage configuration. SQL engines commonly use locking, multiversion concurrency control, or both. Stronger isolation can reduce anomalies but increase contention and retries. A frequent failure is performing a database write and an external side effect inside one transaction: the external effect cannot be rolled back when the database fails. Keep transactions short, acquire resources in a consistent order, and design retry handling for deadlocks or serialization failures. Test concurrent behavior rather than assuming the default isolation level matches the business requirement.",
          visualId: visual("btree-lsm"),
          visualCaption:
            "A transaction updates related tables as one durable, atomic unit.",
        }),
        step({
          title: "The catalog points to the right shelf",
          story:
            "A librarian can search every shelf for a book, but a customer usually wants it now. A catalog organized by author lets the librarian jump directly to one section instead of walking the entire building. A second catalog organized by shelf location helps restocking. Each catalog takes time to update when books arrive, so adding indexes for every possible search would make the storage room crowded and slow every delivery. The library chooses catalogs for frequent, important questions and accepts a full search for a rare annual report. The manager reviews catalog usefulness whenever a new search pattern appears.",
          engineer:
            "An index maps selected values to table rows, usually through a B-tree. Composite indexes are ordered by column sequence, so they serve queries whose predicates align with the leftmost useful columns. Covering indexes include enough columns to answer a query without repeated table visits. Selectivity matters: an index on a nearly unique identifier is often more useful than one on a low-cardinality flag, although filtering and ordering interact. Every index consumes storage and adds write, update, and maintenance cost. A common failure is adding indexes from intuition without reading execution plans. Use representative data and compare scans, row estimates, buffer reads, and actual latency before and after changes.",
          visualId: visual("btree-lsm"),
          visualCaption:
            "A B-tree index lets the database locate matching rows without scanning the full table.",
        }),
        step({
          title: "Invite data safely and give it limited permissions",
          story:
            "The property office accepts information from residents through a locked form, not by asking clerks to paste handwritten instructions into the cabinet system. The form has separate boxes for values, and the database receives those values without treating them as new filing instructions. A junior clerk can view inspection dates but cannot change ownership. When a suspicious entry is submitted, the office keeps an audit record of who changed the card and when. Encryption protects paper copies during transport and locked archives overnight, but it does not replace the need to decide who is allowed to open them.",
          engineer:
            "Parameterized queries keep user-supplied values separate from SQL structure, preventing input from changing the statement's meaning. Use a database role with only the required operations, and separate migration, reporting, and application privileges. Avoid constructing SQL through string concatenation, including identifiers that cannot be parameterized; validate identifiers against a strict allowlist. Encrypt connections and storage according to the data classification, and manage keys independently from database credentials. A subtle failure is granting a reporting account table-owner rights because a query was slow. Diagnose the query with plans and appropriate indexes instead. Log administrative changes and sensitive access without recording secret values or unnecessary personal data.",
          visualId: visual("threat-defense"),
          visualCaption:
            "Parameterized inputs, scoped database roles, encryption, and audit logs protect stored records.",
        }),
      ],
      security: [
        practice({
          threat:
            "Untrusted input changes the structure of a SQL statement and exposes or modifies data beyond the intended operation.",
          control:
            "Use parameterized queries for every value, validate dynamic identifiers against a fixed allowlist, and test database access through the application's actual data layer.",
          verify:
            "Review code for concatenated query construction and run integration tests showing that input remains data and cannot alter the authorized query structure.",
        }),
        practice({
          threat:
            "A compromised application or reporting job uses broad database privileges to read unrelated tables or destroy records.",
          control:
            "Grant separate least-privilege roles for application reads, application writes, migrations, and reporting, with administrative access available only through a controlled workflow.",
          verify:
            "Enumerate effective permissions for each role and test that the application role cannot perform migration, ownership, or unrelated-table operations.",
        }),
        practice({
          threat:
            "Database traffic, backups, or exported reports are intercepted or read by an unauthorized party.",
          control:
            "Require authenticated TLS, encrypt storage and backups with managed keys, restrict export destinations, and set retention and access policies for every copy.",
          verify:
            "Check certificate enforcement on live connections, confirm backup encryption and expiration settings, and audit every export and restore for approved identity and purpose.",
        }),
      ],
      quiz: [
        question({
          topicId: "sql-modeling",
          kind: "scenario",
          prompt:
            "A query filters by customer_id and orders by created_at on a very large orders table. Which index is the most natural starting point?",
          choices: [
            "An index on created_at alone for every table",
            "A composite index on customer_id followed by created_at",
            "An index containing every column in the table",
            "No index, because filters always require full scans",
          ],
          answerIndex: 1,
          explanation:
            "The composite order supports filtering by customer and then ordering that customer's results by time, subject to plan verification.",
        }),
        question({
          topicId: "sql-modeling",
          kind: "security",
          prompt:
            "What is the safest way to include a user-provided value in a database query?",
          choices: [
            "Concatenate it after checking that it looks friendly",
            "Place it in a comment for the database to ignore",
            "Bind it through a parameterized query",
            "URL-encode it before concatenation",
          ],
          answerIndex: 2,
          explanation:
            "Parameter binding keeps values separate from SQL structure; encoding or superficial checks do not provide that boundary.",
        }),
        question({
          topicId: "sql-modeling",
          kind: "tradeoff",
          prompt:
            "Why should a team avoid indexing every column by default?",
          choices: [
            "Indexes make all reads slower",
            "Indexes consume storage and increase write and maintenance work",
            "Indexes disable transactions",
            "Indexes prevent query planning",
          ],
          answerIndex: 1,
          explanation:
            "Each index must be maintained on writes and consumes memory and disk, so indexes should be justified by important query patterns.",
        }),
        question({
          topicId: "sql-modeling",
          kind: "story-match",
          prompt:
            "In the property office story, what does one building card linked to many inspection cards model?",
          choices: [
            "A one-to-many relationship with a foreign key",
            "A many-to-many comma-separated list",
            "A cache eviction policy",
            "A leader election term",
          ],
          answerIndex: 0,
          explanation:
            "A building can have multiple inspections, while each inspection refers to one building through a key.",
        }),
      ],
    }),
    lesson({
      id: "scaling-databases",
      trackId: "foundations",
      title: "Scaling Databases",
      summary:
        "Move beyond one database with read replicas, deliberate consistency choices, bounded connection growth, and clear recovery and isolation controls.",
      minutes: 12,
      prerequisites: ["sql-modeling", "load-balancing"],
      steps: [
        step({
          title: "Several copies of the library catalog",
          story:
            "A library opens branches in three neighborhoods. Each branch keeps a copy of the catalog so readers do not all call the central office. New books are first recorded at the central desk, then copies are sent to each branch. A reader who asks whether a book arrived five minutes ago may see an older branch copy. That delay is acceptable for browsing, but not for deciding whether the last copy has already been reserved. The library labels urgent reservations to check the central desk and gives each branch a way to report how far behind its copy is.",
          engineer:
            "Read replicas copy data from a primary and serve read traffic, increasing read capacity and providing candidates for failover. Replication can be synchronous, asynchronous, or semi-synchronous, each trading durability and availability against latency. Applications must route reads according to freshness needs. Read-your-writes behavior may require a session token, primary fallback, or waiting for a replica position. Replica lag is a product behavior, not merely an operations metric. A common failure is sending all reads to replicas, then showing users that a successful write disappeared. Measure lag in time and log position, and define which operations are allowed on stale data.",
          visualId: visual("replication"),
          visualCaption:
            "A primary streams changes to read replicas while applications choose the required freshness level.",
        }),
        step({
          title: "An urgent reservation cannot trust yesterday's copy",
          story:
            "A customer reserves the library's last copy at the central desk. Seconds later, a branch using an older catalog also approves a reservation because its copy still shows the book available. Both customers receive confirmation, but only one can collect the book. The library changes the rule: inventory decisions always use the authoritative central ledger, while branch copies are used only for discovery. It also shows the age of the catalog copy so staff know when a branch is too stale for a task. Availability of copies never overrides the truth of the reservation.",
          engineer:
            "Separate latency-sensitive reads from consistency-sensitive operations. Authorization, balance changes, uniqueness enforcement, and inventory claims often require the primary or a transaction that can detect conflicts. A replica may be physically current when queried by operations staff but stale for the user's just-completed write because replication position advances asynchronously. Use write result tokens, monotonic sequence numbers, or explicit consistency levels where supported. During failover, prevent the old primary from accepting writes after promotion through fencing and network policy. Test behavior during lag spikes and promotion rather than assuming normal replication is instantaneous.",
          visualId: visual("replication"),
          visualCaption:
            "Freshness-sensitive operations use the authoritative primary while stale replicas serve discovery reads.",
        }),
        step({
          title: "When every shelf is full, add another room",
          story:
            "Adding more catalog copies helps readers, but it does not create more shelf space at the central warehouse. If every new book must be filed through one clerk, the clerk becomes the limit. The library divides books by a stable region code and opens several filing rooms. A clerk routes a book to its assigned room instead of asking every room to search. Some regions grow faster than others, and one very popular title creates a queue at a single room, so the library monitors both total capacity and the busiest room. Those measurements guide the next room to open. The manager also measures how long each transfer takes.",
          engineer:
            "Replicas scale reads and improve availability; they do not automatically scale write throughput on one authoritative primary. Options include faster hardware, workload separation, application changes, and partitioning data across independent primaries. Partition by a key that distributes both data volume and traffic. Cross-partition transactions and joins become more expensive, and global uniqueness may require coordination. Connection growth is another hidden limit: ten application replicas with large pools can overwhelm a database sized for one. Use bounded pools, proxy connections where appropriate, and admission control. Avoid sharding before measurement shows that a simpler primary can no longer meet the write target.",
          visualId: visual("sharding"),
          visualCaption:
            "Read replicas handle discovery while partitioned primaries distribute write ownership.",
        }),
        step({
          title: "A copy helps only if you can recover it",
          story:
            "The library keeps nightly photographs of the central shelves and a live copy in another building. When a clerk accidentally deletes a whole section, the live copy reproduces the deletion within seconds. The nightly photographs are older, but they still contain the missing books. Staff practice restoring one shelf into a separate room, measure how long the whole process takes, and ensure that only the recovery lead can authorize a restore. Encryption protects the photographs during transport, and an access log records who opened each archive. The team repeats the exercise whenever the recovery process changes.",
          engineer:
            "High availability and disaster recovery require different mechanisms. Replication provides current copies but can propagate accidental or malicious changes; backups provide historical recovery points. Define recovery time and recovery point objectives, retention, and geographic scope. Test point-in-time restoration and application compatibility with the restored data. Promotion should be controlled, observed, and reversible only with a clear data-ownership plan to avoid two writable primaries. A common failure is treating a successful backup job as proof of recoverability. Validate checksums, permissions, encryption keys, and restore procedures, and alert when the newest usable recovery point falls outside the objective.",
          visualId: visual("replication"),
          visualCaption:
            "Live replication supports failover while protected point-in-time backups support historical recovery.",
        }),
      ],
      security: [
        practice({
          threat:
            "A network partition leaves an old primary writable after a replica has been promoted, allowing conflicting writes.",
          control:
            "Fence the old primary before promotion, require an external authority or quorum for leadership, and restrict database ingress so a demoted node cannot continue serving writes.",
          verify:
            "Run an authorized failover exercise and confirm the former primary rejects writes, emits a clear fencing event, and cannot rejoin as writable until explicitly synchronized.",
        }),
        practice({
          threat:
            "Replication traffic or stored replicas expose sensitive records to interception or unauthorized access.",
          control:
            "Use mutually authenticated TLS between database nodes, encrypt volumes and snapshots with managed keys, and restrict administrative access to replication and restore operations.",
          verify:
            "Inspect that replication rejects untrusted certificates and confirm snapshot, volume, and log destinations are private with narrowly scoped access policies.",
        }),
        practice({
          threat:
            "Stale read replicas make security-sensitive decisions using outdated permissions, revocations, or account state.",
          control:
            "Route authorization and other freshness-critical decisions to an authoritative source, propagate revocation signals promptly, and cap permitted replica lag for each operation class.",
          verify:
            "Test that a revoked permission or changed account state is enforced within the defined bound, including during replica lag and controlled failover.",
        }),
      ],
      quiz: [
        question({
          topicId: "scaling-databases",
          kind: "scenario",
          prompt:
            "A user saves a profile and immediately reads it from a lagging replica, seeing the old value. Which response best matches a deliberate design?",
          choices: [
            "Route that read-your-writes operation to the primary or wait for the required replication position",
            "Remove replicas permanently",
            "Increase every application connection pool",
            "Cache the stale value forever",
          ],
          answerIndex: 0,
          explanation:
            "Freshness-sensitive reads need an authoritative source or a known replication position rather than an arbitrary replica.",
        }),
        question({
          topicId: "scaling-databases",
          kind: "security",
          prompt:
            "Why fence an old primary during failover?",
          choices: [
            "To increase DNS resolution time",
            "To prevent it from accepting writes that conflict with the promoted primary",
            "To disable encryption",
            "To make backups unnecessary",
          ],
          answerIndex: 1,
          explanation:
            "Fencing establishes one write authority and prevents split-brain from producing divergent records.",
        }),
        question({
          topicId: "scaling-databases",
          kind: "tradeoff",
          prompt:
            "What does adding read replicas primarily improve?",
          choices: [
            "Unlimited write throughput on one primary",
            "Read capacity and failover options, with added consistency and operational complexity",
            "Automatic removal of all backups",
            "Guaranteed zero replication lag",
          ],
          answerIndex: 1,
          explanation:
            "Replicas offload reads and support availability, but writes still need an authority and asynchronous copies introduce lag.",
        }),
        question({
          topicId: "scaling-databases",
          kind: "story-match",
          prompt:
            "Why does the library use central-ledger reservations but branch catalogs for browsing?",
          choices: [
            "Reservations require authoritative uniqueness, while browsing tolerates delayed copies",
            "Branch catalogs are always more accurate",
            "The central ledger has no read load",
            "Copies eliminate the need for transactions",
          ],
          answerIndex: 0,
          explanation:
            "The example maps consistency-sensitive writes to the primary and stale-tolerant discovery reads to replicas.",
        }),
      ],
    }),
    lesson({
      id: "rate-limiting",
      trackId: "foundations",
      title: "Rate Limiting",
      summary:
        "Protect capacity and fairness with explicit policies, token buckets, distributed counters, clear client responses, and safe overload behavior.",
      minutes: 10,
      prerequisites: ["single-server", "load-balancing"],
      steps: [
        step({
          title: "The bouncer carries a handful of tokens",
          story:
            "A club bouncer keeps five tokens in a bowl. Each guest needs one token to enter, and the doorman returns one token every few seconds. When the bowl is empty, the next guest waits outside until a token appears. A brief group arrival can use the saved tokens, but a steady crowd cannot enter faster than tokens return. The bouncer does not judge whether a guest is good or bad; the rule controls pace. The club also gives staff a separate entrance so a long public line cannot prevent employees from opening the doors.",
          engineer:
            "Rate limiting constrains admitted work to protect latency, fairness, and downstream capacity. Start with a service-level policy: identify expensive operations, normal tenant behavior, acceptable bursts, and recovery time. A token bucket maintains capacity tokens replenished at a configured rate; each accepted request consumes a token, allowing bounded bursts while enforcing an average limit. Return a standard busy response such as HTTP 429 with retry guidance. A common failure is choosing limits from aggregate server capacity without reserving headroom for failover and background work. Limits should protect the actual constrained resource, which may be database calls rather than HTTP requests.",
          visualId: visual("rate-limiter"),
          visualCaption:
            "A token bucket admits bursts up to stored capacity and replenishes tokens at a steady rate.",
        }),
        step({
          title: "Choose the rule before the line arrives",
          story:
            "The club discovers that one rule cannot describe every door. A coat check may allow a small burst, a ticket scanner needs steady throughput, and the stage entrance must remain reserved for performers. The manager writes each rule on a board with its own token count and refill speed. A guest who arrives too quickly receives a clear message about when to try again instead of an unexplained closed door. The manager reviews the rules after concerts, increasing limits for legitimate patterns and lowering them where staff repeatedly fall behind.",
          engineer:
            "Fixed windows are simple but permit a burst at each boundary. Sliding windows track a moving time range and smooth that effect but cost more state or approximation. Token buckets provide natural burst control, while leak buckets produce a smoother outflow. Select by workload rather than fashion, and consider whether limiting concurrency is more useful than limiting request count. Weighted limits can charge expensive operations more than cheap ones. A frequent failure is copying one global limit across tenants with very different usage. Separate policies by endpoint, identity class, and cost, and expose enough metrics to tune them without storing unnecessary personal data.",
          visualId: visual("rate-limiter"),
          visualCaption:
            "Different doors apply endpoint-specific token capacities, refill rates, and weighted costs.",
        }),
        step({
          title: "Many bouncers share one count",
          story:
            "A festival adds a second entrance, each with its own token bowl. Guests simply divide between the doors, and the club accidentally admits twice the intended number. The manager replaces the bowls with one shared counter connected to both gates. The counter updates a guest's balance in one indivisible step, so two gates cannot spend the same token. Network delays occasionally prevent a gate from reading the counter, so the manager chooses whether the gate should admit conservatively or fail visibly. A small local allowance lets each gate keep working briefly without abandoning the shared policy. The manager records how often that fallback is used. That evidence helps set the next festival's limits.",
          engineer:
            "Distributed rate limiting needs a shared decision point or carefully bounded local shards. Atomic operations prevent concurrent requests from consuming the same token. Design for counter-service failure: strict local enforcement can be safe but less available, while fail-open behavior risks overload. Use short local windows plus periodic synchronization when exact global limits are unnecessary, and document the possible overshoot. Clock skew and request retries can distort consumption. Avoid a central counter on every request if its latency exceeds the saving; edge enforcement, hierarchical limits, and tenant sharding can spread work. Measure both accepted and rejected traffic by policy dimension.",
          visualId: visual("rate-limiter"),
          visualCaption:
            "All gateway instances atomically update a shared token count while retaining bounded local fallback.",
        }),
        step({
          title: "Keep the door open for essential work",
          story:
            "During a festival, the public line grows while the fire-safety team still needs to enter. The bouncer reserves tokens for staff, separates payment failures from entrance decisions, and gives rejected guests a time to return. Staff also avoid asking every waiting guest to retry immediately, because synchronized retries create another surge. The club publishes its rules, records aggregate arrival patterns, and does not keep a detailed dossier on every person merely to count tokens. A compromised gate credential is quickly revoked so it cannot consume another entrance's allowance. Guests see the same rule at every entrance.",
          engineer:
            "Combine rate limits with concurrency limits, timeouts, queue bounds, and load shedding. Prioritize health checks, administrative recovery paths, and critical business operations when capacity is scarce. Clients should honor retry guidance and use exponential backoff with jitter, but the server must remain safe when clients do not. Derive identity from verified credentials rather than unvalidated headers, and ensure proxy chains preserve the trusted client context. A common failure is allowing retries around a rate-limited endpoint to bypass accounting. Keep counters aggregate and short-lived, rotate administrative credentials, and monitor for policy changes and abnormal enforcement distribution.",
          visualId: visual("threat-defense"),
          visualCaption:
            "Verified identities, reserved capacity, jittered retries, and aggregate counters protect overloaded services.",
        }),
      ],
      security: [
        practice({
          threat:
            "Volumetric or application-layer traffic consumes edge connections, worker time, or downstream database capacity.",
          control:
            "Enforce rate and concurrency limits at the edge, reserve headroom for critical operations, and combine them with bounded queues, timeouts, and provider DDoS protection.",
          verify:
            "Use an authorized test to confirm rejection occurs before expensive downstream work, retry guidance is present, and admitted requests stay within the documented latency ceiling.",
        }),
        practice({
          threat:
            "Spoofed client metadata lets one caller impersonate many identities and evade per-account limits or poison another account's quota.",
          control:
            "Authenticate callers, derive identity from verified tokens, strip untrusted forwarding headers, and bind policy keys to the validated security context.",
          verify:
            "Test requests through each supported proxy path and confirm that changing supplied identity headers cannot alter the authenticated policy key.",
        }),
        practice({
          threat:
            "A compromised gateway or stolen administrative credential changes limits globally or disables enforcement during an incident.",
          control:
            "Require authenticated administrative access, separate policy-read from policy-write permissions, audit every change, and alert on broad or repeated limit modifications.",
          verify:
            "Review the policy audit trail and test that unauthorized identities cannot modify counters or enforcement rules while approved emergency changes are attributable.",
        }),
      ],
      quiz: [
        question({
          topicId: "rate-limiting",
          kind: "scenario",
          prompt:
            "An API allows a normal rate of 10 requests per second and a short burst of 20. Which model most directly represents that policy?",
          choices: [
            "A fixed window with no state",
            "A token bucket with capacity 20 and a refill rate of 10 per second",
            "An LRU cache with TTL 20 seconds",
            "A database read replica",
          ],
          answerIndex: 1,
          explanation:
            "Token-bucket capacity controls burst size while the refill rate controls sustained throughput.",
        }),
        question({
          topicId: "rate-limiting",
          kind: "security",
          prompt:
            "What should a gateway do with a client-supplied header that claims to identify the original caller?",
          choices: [
            "Trust it for every route",
            "Strip it unless it arrives through an explicitly trusted proxy",
            "Store it as the permanent user identity",
            "Ignore authentication entirely",
          ],
          answerIndex: 1,
          explanation:
            "Forwarding metadata must originate from a trusted proxy so clients cannot choose the identity used for security policy.",
        }),
        question({
          topicId: "rate-limiting",
          kind: "tradeoff",
          prompt:
            "What is a drawback of enforcing exact global limits through one remote counter on every request?",
          choices: [
            "It makes bursts mathematically impossible",
            "It adds latency and creates a dependency on the counter service",
            "It removes the need for endpoint policies",
            "It guarantees unlimited availability",
          ],
          answerIndex: 1,
          explanation:
            "Exact coordination costs a network round trip and makes the limiter itself part of the critical path.",
        }),
        question({
          topicId: "rate-limiting",
          kind: "story-match",
          prompt:
            "In the bouncer story, what does the bowl's capacity represent?",
          choices: [
            "The database's storage size",
            "The maximum immediate burst allowed before refill becomes the limit",
            "The number of application replicas",
            "The cache eviction interval",
          ],
          answerIndex: 1,
          explanation:
            "Stored tokens permit a bounded burst, while token replenishment sets the longer-term rate.",
        }),
      ],
    }),
    lesson({
      id: "queues-jobs",
      trackId: "foundations",
      title: "Queues and Background Jobs",
      summary:
        "Move slow and failure-prone work onto a durable ticket rail with idempotent consumers, controlled retries, dead-letter handling, and visible backpressure.",
      minutes: 11,
      prerequisites: ["single-server", "rate-limiting"],
      steps: [
        step({
          title: "The kitchen runs on a ticket rail",
          story:
            "A restaurant stops asking each waiter to cook. Instead, the waiter clips an order to a metal rail, and the kitchen pulls tickets in a controlled sequence. The waiter can seat another table while the grill handles earlier tickets. On a busy night, the rail shows exactly how much work is waiting, and the manager can slow new orders before the kitchen disappears behind the tickets. A broken printer no longer loses an order because the ticket remains attached to the rail until the cook marks it complete. The rail turns invisible waiting into work the team can manage.",
          engineer:
            "A queue decouples request admission from work execution. Producers append durable messages, and consumers claim and process them independently. This smooths bursts, isolates slow tasks, and allows workers to scale separately from the web tier. It does not make work instantaneous; it moves waiting into a visible backlog that must be bounded and monitored. Choose queue technology by ordering, delivery, retention, throughput, and operational requirements. A common failure is enqueueing unbounded jobs faster than they drain, which increases user-visible delay until even newly submitted work misses its deadline. Track age of the oldest message, not only queue length.",
          visualId: visual("queue-workers"),
          visualCaption:
            "Producers place durable tickets on a queue while independent workers process and acknowledge them.",
        }),
        step({
          title: "A lost acknowledgment brings the ticket back",
          story:
            "A cook finishes a plate but the paper ticket sticks to the rail, so the next cook prepares the same meal again. The kitchen decides that repeating some work is safer than losing it, and therefore makes every recipe repeat-safe. Preparing a salad twice wastes food, so the recipe includes the order number and the cook checks a completed-order board before starting. When a ticket is claimed, a timer gives that cook a work window. If the cook does not finish in time, another cook may receive the ticket, which makes duplicate execution possible and repeat-safe recipes essential.",
          engineer:
            "Message systems commonly provide at-least-once delivery: a message can be processed more than once after a crash between the side effect and acknowledgment. Consumers should be idempotent using a stable operation identifier and durable deduplication where necessary. Visibility or lease timeouts let another worker recover abandoned work, but a timeout shorter than normal processing causes concurrent duplicates. Acknowledge only after the required durable effect succeeds. Exactly-once end-to-end behavior is difficult because external systems have their own transactions and failure boundaries. Design the business operation for safe repetition and test crashes at each stage rather than trusting a delivery label alone.",
          visualId: visual("queue-workers"),
          visualCaption:
            "An unacknowledged ticket returns after its lease expires and an idempotent consumer prevents duplicate effects.",
        }),
        step({
          title: "Some tickets need a separate review basket",
          story:
            "One ticket arrives with a damaged description that no cook can interpret. Returning it to the main rail would block the same station forever, while throwing it away would lose a customer's order. The manager moves it to a small review basket labeled for human inspection. The kitchen records why it was moved, limits how often ordinary failures are retried, and alerts when the review basket grows. Sensitive allergy notes stay on the ticket only as long as needed, and access to the basket is restricted so the information does not become a public noticeboard.",
          engineer:
            "Classify failures as transient, permanent, or unknown. Transient failures can use bounded retries with exponential backoff and jitter; permanent malformed work should move to a dead-letter queue after a small attempt limit. Dead letters need ownership, retention, access controls, and a documented replay process. A poison message that is retried indefinitely wastes capacity and hides other failures. Retry storms occur when many failed jobs become eligible simultaneously, so jitter and a global retry budget matter. Preserve enough metadata to diagnose the failure, but redact secrets and minimize personal data in both the main queue and dead-letter storage.",
          visualId: visual("queue-workers"),
          visualCaption:
            "Bounded retries separate transient failures while invalid or repeatedly failing tickets enter a dead-letter queue.",
        }),
        step({
          title: "Scale workers without losing control",
          story:
            "The manager adds cooks when the rail grows, but too many cooks crowd the same small grill. Each recipe is assigned to a station, and only one cook manages a station's tickets at a time. A popular cake order occupies one station even while other stations are idle, so the manager learns to split suitable work or reserve extra capacity. A whiteboard displays waiting tickets, completion rate, and the oldest order. When the board turns red, the host stops promising immediate service rather than allowing the rail to stretch through the kitchen door.",
          engineer:
            "Scale consumers according to the constrained downstream resource, not just backlog size. Partition ordering when independent keys can progress concurrently; strict global ordering reduces parallelism. Monitor arrival rate, completion rate, oldest-message age, retry rate, dead-letter depth, and per-worker failures. Apply backpressure to producers and shed or defer low-priority work when the backlog cannot meet its deadline. Graceful shutdown stops new claims and lets active leases finish or return safely. A frequent failure is scaling workers until the database or third-party API collapses. Bound consumer concurrency per dependency and coordinate autoscaling with the capacity of every downstream service.",
          visualId: visual("queue-workers"),
          visualCaption:
            "Ordered partitions and bounded worker pools scale with downstream capacity while backlog metrics drive backpressure.",
        }),
      ],
      security: [
        practice({
          threat:
            "An unauthenticated producer inserts forged, oversized, or malformed jobs that consume worker capacity or trigger unauthorized actions.",
          control:
            "Authenticate producers, authorize them by queue and operation, enforce schema and message-size validation at ingestion, and rate-limit enqueueing.",
          verify:
            "Test that unauthorized identities cannot publish, invalid messages are rejected before storage, and accepted messages retain a verifiable producer identity for audit.",
        }),
        practice({
          threat:
            "A repeatedly failing poison message blocks a partition or drives destructive retry behavior across the worker fleet.",
          control:
            "Validate messages before processing, apply bounded retries with jitter, and route permanent failures to an access-controlled dead-letter queue with an owner and replay procedure.",
          verify:
            "Exercise a controlled malformed message and confirm attempt limits, dead-letter routing, alerting, and continued progress for valid messages on the same queue.",
        }),
        practice({
          threat:
            "Sensitive job payloads or dead-letter contents remain readable to broad worker roles or longer than their business purpose requires.",
          control:
            "Minimize payload data, encrypt queues and dead letters, restrict read and replay permissions, and expire retained messages according to a documented policy.",
          verify:
            "Inspect retention and encryption settings, review replay audit logs, and test that ordinary workers cannot read unrelated dead letters or extend retention.",
        }),
      ],
      quiz: [
        question({
          topicId: "queues-jobs",
          kind: "scenario",
          prompt:
            "A worker charges a customer, then crashes before acknowledging the job. What design most safely handles redelivery?",
          choices: [
            "Assume delivery is exactly once",
            "Use a stable idempotency key and durable deduplication before applying the charge",
            "Remove acknowledgments from the protocol",
            "Charge every redelivery without checks",
          ],
          answerIndex: 1,
          explanation:
            "At-least-once redelivery can repeat work; idempotency makes the business effect safe across attempts.",
        }),
        question({
          topicId: "queues-jobs",
          kind: "security",
          prompt:
            "Why should a dead-letter queue have restricted replay access?",
          choices: [
            "Replay can execute privileged business operations and expose retained sensitive payloads",
            "Dead letters contain no useful information",
            "Restriction increases message duplication",
            "Replay always bypasses authentication",
          ],
          answerIndex: 0,
          explanation:
            "Dead-letter replay can cause real side effects and may expose sensitive data, so it needs narrow authorization and audit.",
        }),
        question({
          topicId: "queues-jobs",
          kind: "tradeoff",
          prompt:
            "What is the main benefit of a queue compared with doing slow work inside the user request?",
          choices: [
            "It guarantees every job finishes instantly",
            "It decouples admission from execution and makes backlog and scaling explicit",
            "It removes the need for idempotency",
            "It eliminates all downstream limits",
          ],
          answerIndex: 1,
          explanation:
            "A queue shifts waiting and scaling into a durable, observable workflow rather than hiding slow work in the request path.",
        }),
        question({
          topicId: "queues-jobs",
          kind: "story-match",
          prompt:
            "What does the kitchen's review basket model?",
          choices: [
            "A primary database",
            "A dead-letter queue for work requiring bounded handling and controlled replay",
            "A read replica",
            "A load-balancer health check",
          ],
          answerIndex: 1,
          explanation:
            "The review basket isolates problematic tickets so they do not block ordinary work or disappear silently.",
        }),
      ],
    }),
    lesson({
      id: "realtime",
      trackId: "foundations",
      title: "Real-Time: Polling, SSE, WebSockets",
      summary:
        "Choose the right live-update transport by comparing polling, server-sent events, and WebSockets, then design reconnection, authorization, and room-scale capacity.",
      minutes: 11,
      prerequisites: ["networking-protocols", "load-balancing"],
      steps: [
        step({
          title: "Ask the noticeboard again and again",
          story:
            "A traveler checks the airport departure board every ten seconds. Sometimes the board changes just after a check, so the traveler waits another interval before seeing a gate change. Checking more often gives fresher information but makes the traveler walk back and forth constantly, and hundreds of travelers doing that crowd the hallway. The airport could publish changes to a screen, but it still needs a way to reach each traveler and tell them when the connection has broken. Polling is simple because every check is a fresh question with a fresh answer.",
          engineer:
            "Short polling repeats independent requests at an interval. It is easy to operate, cache, and authorize, but latency is bounded by the interval and load grows with client count and polling frequency. Long polling holds a request open until data is available or a timeout occurs, reducing empty responses while retaining many HTTP behaviors. Use conditional requests or version tokens to avoid retransmitting unchanged data. A common failure is polling too aggressively during incidents, creating a feedback loop as clients refresh failed dashboards. Add jitter and backoff, and estimate total request load from active clients rather than testing with only one browser.",
          visualId: visual("realtime-channels"),
          visualCaption:
            "A polling client repeatedly asks a server for changes and receives either new data or no change.",
        }),
        step({
          title: "One announcement microphone",
          story:
            "A museum guide uses a microphone to announce room changes while visitors listen through receivers. The guide speaks, the transmitter sends the message, and each receiver displays the same announcement. If a visitor walks out of range, the receiver keeps the last message number and asks for announcements it missed when the signal returns. Visitors do not speak through this channel; questions use a separate desk. The guide periodically sends a small heartbeat so a silent receiver can tell the difference between no news and a broken connection. Visitors can trust the screen again after the signal returns.",
          engineer:
            "Server-sent events provide a long-lived HTTP response with a text event stream, usually server-to-client only. Browsers handle reconnection, and applications can use event IDs and the last-event-ID header to resume after a disconnect. SSE works through many standard HTTP proxies and fits notifications, progress feeds, and dashboards. The connection still consumes server and proxy resources, and browser connection limits can matter across origins. A common failure is assuming a stream guarantees exactly-once delivery; clients must deduplicate by event ID and tolerate overlaps. Send periodic comments or heartbeats and distinguish normal silence from a dead connection.",
          visualId: visual("realtime-channels"),
          visualCaption:
            "An SSE server streams ordered events while a reconnecting client resumes from its last event ID.",
        }),
        step({
          title: "A two-way radio for a shared canvas",
          story:
            "A design team gathers around a shared canvas. Each person can move a shape while seeing everyone else's changes, so the connection must carry messages in both directions. The team divides the canvas into rooms, and each member joins only the room they need. A radio check confirms that a connection is alive, while message numbers identify gaps that must be requested again. When someone leaves, the room closes their channel and reclaims capacity. A slow participant receives a clear instruction to reduce update frequency instead of being allowed to dominate the shared airtime.",
          engineer:
            "WebSockets provide a persistent, full-duplex channel after an HTTP upgrade. They suit collaborative editing, multiplayer state, and high-frequency bidirectional exchanges. However, every open connection has memory, file-descriptor, and routing costs, and a reverse proxy must support the upgrade with suitable timeouts. Applications need framing, message-size limits, heartbeat handling, and reconnection logic. A common failure is broadcasting every event to every connected client. Use rooms or topic subscriptions and server-side backpressure, and carry application sequence numbers when ordering and recovery matter. Consider whether ordinary HTTP requests can meet the interaction rate before choosing a persistent connection.",
          visualId: visual("realtime-channels"),
          visualCaption:
            "Authenticated WebSocket clients exchange bidirectional messages within separate topic rooms.",
        }),
        step({
          title: "Keep the right people in the right room",
          story:
            "The design team discovers that one radio was tuned to a private client meeting because the room number was guessed. Staff now issue a signed room pass at connection time and check it again before granting sensitive subscriptions. If a member loses access during the meeting, the host removes them from that room rather than waiting for the socket to close. The team also limits message size, records aggregate room counts, and redacts drawing titles from operational logs. When the connection drops, clients reconnect with backoff instead of creating a storm of immediate attempts.",
          engineer:
            "Authenticate the WebSocket handshake, authorize every subscription, and re-evaluate access when permissions change. Use TLS, strict origin checks where appropriate, and network policy so public users cannot reach internal realtime services directly. Bound connections per identity, messages per second, message size, and room fanout. A revoked token on an already-open socket does not automatically end access unless the application enforces revocation or connection lifetime. Store minimal diagnostic metadata and avoid logging message bodies by default. Test reconnect behavior under jitter and backoff, plus draining during deployments so clients migrate without a synchronized outage.",
          visualId: visual("realtime-channels"),
          visualCaption:
            "Signed room access, revocation, quotas, and jittered reconnection govern persistent client channels.",
        }),
      ],
      security: [
        practice({
          threat:
            "An unauthenticated or unauthorized client opens a persistent channel and receives private updates intended for another user or room.",
          control:
            "Authenticate the handshake, authorize every topic subscription, enforce revocation on active connections, and require TLS between clients and realtime services.",
          verify:
            "Test cross-user and cross-room access, including permission removal after connection establishment, and confirm unauthorized subscriptions produce no private data.",
        }),
        practice({
          threat:
            "Malicious clients hold excessive connections or send oversized, high-rate messages that exhaust realtime servers and proxies.",
          control:
            "Apply connection, message-size, message-rate, and room-fanout limits; require heartbeat timeouts; and combine admission control with edge DDoS protection.",
          verify:
            "Use authorized boundary tests to confirm excess connections and messages are rejected promptly while valid clients remain responsive.",
        }),
        practice({
          threat:
            "Sensitive message content, room names, or access tokens are exposed through verbose logs and retained diagnostics.",
          control:
            "Redact payloads and credentials, minimize room identifiers in telemetry, restrict log access, and set retention based on operational need.",
          verify:
            "Inspect logs and trace exports with representative sensitive messages and confirm that only approved metadata remains readable to operational roles.",
        }),
      ],
      quiz: [
        question({
          topicId: "realtime",
          kind: "scenario",
          prompt:
            "A dashboard needs frequent server-to-client updates but clients never send messages. Which transport is often the simplest fit?",
          choices: [
            "Server-sent events",
            "A bidirectional database transaction",
            "A raw UDP socket with no framing",
            "A daily batch export",
          ],
          answerIndex: 0,
          explanation:
            "SSE provides a long-lived server-to-client stream using standard HTTP infrastructure and built-in browser reconnection.",
        }),
        question({
          topicId: "realtime",
          kind: "security",
          prompt:
            "A user's room permission is revoked while their WebSocket remains open. What should happen?",
          choices: [
            "Nothing until the socket closes naturally",
            "The server should end the subscription or connection and reject future messages for that room",
            "The client should decide whether to continue",
            "The room should become public",
          ],
          answerIndex: 1,
          explanation:
            "Authorization must be enforced on active channels, not only at the initial handshake.",
        }),
        question({
          topicId: "realtime",
          kind: "tradeoff",
          prompt:
            "What is the main advantage of WebSockets over polling for a collaborative canvas?",
          choices: [
            "They remove the need for application-level ordering",
            "They support low-latency bidirectional messages over one persistent connection",
            "They guarantee exactly-once delivery",
            "They require no capacity planning",
          ],
          answerIndex: 1,
          explanation:
            "Full-duplex persistent channels reduce repeated request overhead and latency for frequent two-way updates.",
        }),
        question({
          topicId: "realtime",
          kind: "story-match",
          prompt:
            "In the museum-guide story, what does the last message number represent?",
          choices: [
            "The SSE event ID used to resume missed announcements",
            "A database shard key",
            "A token-bucket capacity",
            "A Raft election term",
          ],
          answerIndex: 0,
          explanation:
            "The message number models an event cursor that lets a reconnecting SSE client recover without silently missing updates.",
        }),
      ],
    }),
  ],
};

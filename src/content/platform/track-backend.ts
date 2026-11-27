import type { Track } from "@/learning/platform/types";

const backendTrack: Track & { trackId: string } = {
  id: "backend-cloud",
  slug: "backend-cloud",
  trackId: "backend-cloud",
  title: "Backend, Cloud and Production Security",
  summary:
    "Operate concurrent services, containers, Kubernetes, and safe release systems with backpressure, isolation, autoscaling, and defense-in-depth controls.",
  accent: "emerald",
  lessons: [
    {
      id: "concurrency-event-loops",
      slug: "concurrency-event-loops",
      trackId: "backend-cloud",
      title: "Concurrency and Event Loops",
      summary:
        "Distinguish concurrency from parallelism, protect event-loop responsiveness, and use bounded queues, backpressure, cancellation, and idempotency.",
      minutes: 11,
      storyHook:
        "An event loop is an attentive cashier who must never get stuck kneading dough while the checkout line grows.",
      prerequisites: [],
      steps: [
        {
          id: "concurrency-event-loop",
          title: "An event loop interleaves waiting work",
          story:
            "The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response. A single cashier can serve many customers by taking the next order while another customer searches for their wallet. The line moves because waiting is interleaved, not because the cashier becomes several people. An event loop follows the same pattern: it starts an operation, registers a callback, and handles other ready work while I/O completes. Concurrency means managing multiple in-progress tasks. Parallelism means doing work at the same instant on multiple cores. One event loop can provide excellent concurrency without offering parallel execution for CPU-heavy code.",
          engineer:
            "Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency. Node-style event loops run JavaScript callbacks on a main thread while libraries or the operating system complete network and file operations asynchronously. Long synchronous computations, unbounded JSON parsing, and blocking crypto can delay every request sharing that loop. Keep handlers short, move CPU-bound work to worker threads or separate services, and avoid synchronous filesystem calls in request paths. Measure event-loop lag alongside request latency; a healthy average response time can hide periodic stalls that create large tail latency and timeout cascades.",
          visualId: "queue-workers",
          visualCaption:
            "Ready callbacks and completed I/O events take turns on one event-loop thread.",
        },
        {
          id: "concurrency-threads",
          title: "Threads and async solve different problems",
          story:
            "The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response. A restaurant may add more cashiers for a busy checkout, but that does not help if every cashier must wait for the same slow oven. Threads add execution capacity, while asynchronous I/O avoids tying up execution capacity while waiting. Adding threads to a blocking workload can improve overlap, but too many threads increase context switching, memory use, and lock contention. The right design begins by identifying whether the bottleneck is waiting, computation, coordination, or an external dependency rather than choosing a concurrency primitive by fashion.",
          engineer:
            "Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency. Use asynchronous I/O for high fan-out network workloads, bounded thread pools for blocking or CPU tasks, and process isolation when fault or language boundaries matter. Shared mutable state introduces race conditions, so prefer message passing, immutable data, or well-scoped locks. Connection pools and worker pools both need explicit size limits tied to downstream capacity. A failure mode is unlimited concurrency: every incoming request receives a thread, socket, or promise, and the service collapses under its own resource appetite before the downstream system is genuinely overloaded.",
          visualId: "queue-workers",
          visualCaption:
            "Bounded worker pools separate asynchronous waiting from CPU execution and shared-resource contention.",
        },
        {
          id: "concurrency-backpressure",
          title: "Backpressure stops an infinite queue from forming",
          story:
            "The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response. A conveyor belt that keeps accepting packages faster than workers can unpack them does not become more efficient; it becomes a mountain. Backpressure is the belt's brake. It signals upstream producers to slow down when consumers reach a safe limit. A bounded queue can absorb short bursts, but it cannot be the permanent home for excess work. The system needs a clear policy: wait with a deadline, reject new work, shed low-priority traffic, or scale consumers within safe bounds.",
          engineer:
            "Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency. Bound queues at every stage and tie admission to actual downstream capacity, not merely available memory. Propagate backpressure through async iterators, streams, message brokers, and thread pools so producers observe saturation. Use deadlines, cancellation, and prioritization to keep old work from blocking fresh work indefinitely. Little's Law helps relate concurrency, arrival rate, and time in system, while queueing behavior makes tail latency rise near saturation. A failure mode is accepting work before capacity is known and relying on retries, which amplify the original overload.",
          visualId: "queue-workers",
          visualCaption:
            "A bounded queue applies admission control and sends backpressure toward overloaded producers.",
        },
        {
          id: "concurrency-recovery",
          title: "Every async path needs a termination story",
          story:
            "The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response. A relay race does not end when the starting gun fires; it ends when every runner finishes, withdraws, or is safely stopped. Concurrent requests also need explicit endings. A client may disconnect, a deadline may expire, a dependency may hang, or a worker may restart. Cancellation must travel through the call chain, pooled connections must be released, and partially completed writes must be safe to retry. Otherwise invisible abandoned work consumes resources and creates duplicate side effects long after the user has gone.",
          engineer:
            "Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency. Carry request deadlines and cancellation signals across HTTP calls, database queries, queues, and worker tasks. Release connections and permits in finally paths, and distinguish retryable failures from permanent ones. Make external writes idempotent with durable keys so retries cannot duplicate charges or messages. Emit structured spans for queue wait, execution, and cancellation without logging sensitive payloads. A failure mode is treating cancellation as a client-side concern while server work continues unchecked, turning disconnects into hidden load and orphaned transactions.",
          visualId: "traffic-flow",
          visualCaption:
            "Deadlines and cancellation propagate through the request while resources and side effects are safely closed.",
        },
      ],
      security: [
        {
          id: "concurrency-tenant-fairness",
          title: "Prevent one tenant from monopolizing workers",
          threat:
            "A tenant with high concurrency or long-running requests can starve other tenants of shared execution capacity.",
          control:
            "Apply tenant-aware admission, weighted fair scheduling, per-tenant concurrency limits, and deadline enforcement.",
          verify:
            "Run competing tenant workloads and confirm bounded waiting, resource release, and no permanent starvation.",
        },
        {
          id: "concurrency-cancellation-authz",
          title: "Preserve authorization across async work",
          threat:
            "Detached callbacks or background jobs may execute after the original identity or authorization context has expired.",
          control:
            "Propagate scoped identity explicitly, reauthorize long-running or privileged work, and expire permissions with the request.",
          verify:
            "Test expiry, cancellation, and retry paths and confirm detached work cannot reuse stale authority.",
        },
        {
          id: "concurrency-sensitive-logs",
          title: "Avoid leaking payloads through concurrency telemetry",
          threat:
            "High-volume tracing or debug logging may capture credentials, personal data, or cross-tenant request content.",
          control:
            "Log redacted correlation IDs, timings, and queue metadata, with strict sampling, access, and retention controls.",
          verify:
            "Inspect traces and dead-letter diagnostics using seeded sensitive fixtures before enabling production sampling.",
        },
      ],
      quiz: [
        {
          id: "concurrency-q1",
          topicId: "concurrency-event-loops",
          prompt: "What is the difference between concurrency and parallelism?",
          choices: [
            "They are identical terms",
            "Concurrency interleaves tasks; parallelism executes work simultaneously",
            "Parallelism only applies to databases",
            "Concurrency requires multiple machines",
          ],
          answerIndex: 1,
          explanation:
            "Concurrency is about managing multiple in-progress tasks, while parallelism is about simultaneous execution on multiple resources.",
          kind: "tradeoff",
        },
        {
          id: "concurrency-q2",
          topicId: "concurrency-event-loops",
          prompt: "Why can synchronous CPU work hurt an event-loop service?",
          choices: [
            "It increases the vocabulary",
            "It blocks the thread that must handle other ready callbacks",
            "It removes the need for queues",
            "It makes network I/O instantaneous",
          ],
          answerIndex: 1,
          explanation:
            "The event loop cannot interleave work while the main thread is occupied by a long synchronous operation.",
          kind: "scenario",
        },
        {
          id: "concurrency-q3",
          topicId: "concurrency-event-loops",
          prompt: "What is the purpose of backpressure?",
          choices: [
            "To make queues unlimited",
            "To slow or reject upstream work when consumers are saturated",
            "To disable deadlines",
            "To increase retries automatically",
          ],
          answerIndex: 1,
          explanation:
            "Backpressure protects capacity by preventing producers from overwhelming bounded consumers and accumulating unbounded work.",
          kind: "tradeoff",
        },
        {
          id: "concurrency-q4",
          topicId: "concurrency-event-loops",
          prompt: "Why make retried writes idempotent?",
          choices: [
            "To avoid duplicate side effects after cancellation or timeout",
            "To remove authorization checks",
            "To make every response identical",
            "To eliminate the need for a database",
          ],
          answerIndex: 0,
          explanation:
            "A retry may follow a write whose acknowledgement was lost, so idempotency prevents duplicate external effects.",
          kind: "security",
        },
      ],
    },
    {
      id: "linux-docker",
      slug: "linux-docker",
      trackId: "backend-cloud",
      title: "Linux and Docker Internals",
      summary:
        "Understand containers through namespaces, cgroups, images, capabilities, rootless execution, and observable resource limits.",
      minutes: 12,
      storyHook:
        "A container is a partitioned workshop with labeled tools and a fixed utility budget, not a tiny computer with perfect walls.",
      prerequisites: ["concurrency-event-loops"],
      steps: [
        {
          id: "linux-namespaces",
          title: "Namespaces change what a process can see",
          story:
            "The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response. Two workshops can share a building while seeing different doors, process lists, and network labels. Linux namespaces provide that partitioned view. A process can receive its own process table, hostname, mount layout, user mapping, or network interfaces. This makes an application feel isolated without running a separate physical machine. But a namespace is primarily a view boundary, not a complete security barrier by itself. Processes still share the host kernel, so capabilities, system-call policy, and careful configuration remain essential.",
          engineer:
            "Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency. Container runtimes assemble namespaces for process IDs, mounts, networking, inter-process communication, hostnames, users, and other kernel resources. Mount namespaces present a container filesystem, while user namespaces can map container identities to unprivileged host identities. Namespace isolation reduces visibility and naming collisions, but shared-kernel vulnerabilities and excessive privileges can still matter. Avoid running untrusted workloads with broad capabilities or sensitive host mounts. Inspect the actual runtime configuration rather than assuming every namespace or security option is enabled by default.",
          visualId: "realtime-channels",
          visualCaption:
            "Namespaces give each workload a partitioned view of processes, files, users, and networking.",
        },
        {
          id: "linux-cgroups",
          title: "Cgroups set resource budgets",
          story:
            "The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response. A workshop may share electricity but still have a meter that limits how much it can draw. Linux control groups provide that metering and enforcement for CPU, memory, I/O, and process counts. Namespaces decide what a container sees; cgroups decide how much shared resource it may consume. A process without a memory limit can pressure the whole host, while an overly tight CPU quota can throttle a service even when the machine appears idle. Useful limits are measured against real workloads and paired with alerts.",
          engineer:
            "Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency. Cgroups organize processes into hierarchical groups with controllers for CPU time, memory, process IDs, block I/O, and other resources. CPU quota and period limit aggregate use, while shares or weights influence relative allocation. Memory limits can trigger reclaim and, under pressure, termination of processes in the group. Requests and limits in orchestration systems eventually map to these mechanisms. A failure mode is setting limits from guesswork: too low causes throttling or OOM kills, while too high permits noisy neighbors and weakens capacity planning.",
          visualId: "k8s-autoscale",
          visualCaption:
            "Cgroup meters and limits bound each workload's draw from shared host resources.",
        },
        {
          id: "linux-images",
          title: "Images are layered filesystems, not security guarantees",
          story:
            "The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response. A shipping container can carry a carefully packed kit, but the seal matters more than the painted logo. Container images bundle application files, libraries, and configuration into layers. They improve reproducibility, yet a small image can still contain vulnerable packages, embedded credentials, or an unsafe default user. Layers also preserve history, so deleting a file in a later layer may not remove it from earlier data. Teams must scan content, verify provenance, and control what enters the registry.",
          engineer:
            "Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency. Images are immutable, content-addressed layers plus metadata consumed by a runtime. Use minimal maintained base images, pin dependencies, scan for vulnerabilities and secrets, generate software bills of materials, and sign artifacts. Multi-stage builds keep compilers and development tools out of the final image. Run as a non-root user where possible, drop unnecessary capabilities, mount filesystems read-only when practical, and avoid privileged mode. A failure mode is assuming a distroless or minimal image is automatically secure; dependency and configuration review still matter.",
          visualId: "deploy-strategies",
          visualCaption:
            "Signed image layers move through build, scan, provenance, and admission checks before deployment.",
        },
        {
          id: "linux-operations",
          title: "Debug containers through signals and evidence",
          story:
            "The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response. When a workshop machine jams, a good operator first checks the meter, alarm log, and current job before replacing the engine. Container diagnosis follows the same order. Inspect exit codes, OOM events, restart counts, CPU throttling, filesystem errors, and application logs. Signals should allow graceful shutdown, while health probes should reflect real readiness. Copying a host shell into every incident creates risk; prefer purpose-built, audited debug access with the narrowest permissions needed.",
          engineer:
            "Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency. Define graceful termination with a pre-stop hook, adequate termination grace period, and application signal handling. Separate liveness, readiness, and startup probes so a slow start is not killed and an unready pod does not receive traffic. Collect kernel and runtime events for OOM kills and throttling, and inspect resource metrics before changing limits. Use audited ephemeral debug containers or log access rather than shared administrative credentials. A failure mode is restarting repeatedly without reading evidence, which destroys the state needed to explain the incident.",
          visualId: "traffic-flow",
          visualCaption:
            "Resource metrics, exit events, probes, and signals explain container health and termination behavior.",
        },
      ],
      security: [
        {
          id: "linux-least-privilege",
          title: "Drop unnecessary container privileges",
          threat:
            "Root execution, privileged mode, broad capabilities, or host mounts can turn an application compromise into host impact.",
          control:
            "Run non-root, use rootless runtimes where supported, drop capabilities, restrict host access, and enforce admission policy.",
          verify:
            "Inspect deployed pod or container security contexts and test that prohibited privileges and mounts are rejected.",
        },
        {
          id: "linux-image-supply-chain",
          title: "Verify image provenance and contents",
          threat:
            "A tampered base image or dependency can introduce malware, secrets, or vulnerable code into production.",
          control:
            "Use trusted registries, signed immutable digests, vulnerability and secret scanning, and build provenance attestations.",
          verify:
            "Reconcile running image digests with approved build records and test rejection of unsigned or unapproved artifacts.",
        },
        {
          id: "linux-resource-isolation",
          title: "Enforce host resource isolation",
          threat:
            "A compromised or noisy container can exhaust memory, CPU, processes, or disk and disrupt neighboring workloads.",
          control:
            "Set tested cgroup limits, ephemeral-storage bounds, process limits, and monitoring with tenant-aware scheduling.",
          verify:
            "Run controlled resource-pressure tests and confirm limits contain the workload without host-wide failure.",
        },
      ],
      quiz: [
        {
          id: "linux-q1",
          topicId: "linux-docker",
          prompt: "What do namespaces primarily provide?",
          choices: [
            "Unlimited CPU",
            "A partitioned view of kernel resources",
            "A replacement for the host kernel",
            "Automatic vulnerability scanning",
          ],
          answerIndex: 1,
          explanation:
            "Namespaces isolate how resources are named and visible, while other mechanisms enforce privileges and budgets.",
          kind: "tradeoff",
        },
        {
          id: "linux-q2",
          topicId: "linux-docker",
          prompt: "What do cgroups primarily provide?",
          choices: [
            "Image signing",
            "Resource accounting and limits",
            "A new programming language",
            "Container registry storage",
          ],
          answerIndex: 1,
          explanation:
            "Cgroups account for and constrain CPU, memory, I/O, processes, and related resource use.",
          kind: "story-match",
        },
        {
          id: "linux-q3",
          topicId: "linux-docker",
          prompt: "Why can deleting a secret in a later image layer be insufficient?",
          choices: [
            "Because secrets cannot exist in images",
            "Because earlier layers may still contain the data",
            "Because layers disable compression",
            "Because the registry always shares credentials",
          ],
          answerIndex: 1,
          explanation:
            "Image layers retain history, so removing a file in a later layer does not necessarily erase it from the image content.",
          kind: "security",
        },
        {
          id: "linux-q4",
          topicId: "linux-docker",
          prompt: "Why separate readiness from liveness probes?",
          choices: [
            "To restart a pod merely because startup is slow",
            "To route traffic only when ready without killing a temporarily unready process",
            "To disable graceful shutdown",
            "To remove resource limits",
          ],
          answerIndex: 1,
          explanation:
            "Readiness controls traffic, while liveness detects a process that may need restart; conflating them can create restart loops.",
          kind: "scenario",
        },
      ],
    },
    {
      id: "kubernetes",
      slug: "kubernetes",
      trackId: "backend-cloud",
      title: "Kubernetes Architecture and Autoscaling",
      summary:
        "Understand the control plane, reconciliation, workload resources, HPA behavior, cluster autoscaling, and the guardrails around both.",
      minutes: 13,
      storyHook:
        "Kubernetes is a continuous workshop coordinator that compares desired inventory with observed reality and closes the gap.",
      prerequisites: ["linux-docker"],
      steps: [
        {
          id: "kubernetes-control-plane",
          title: "The control plane reconciles desired and observed state",
          story:
            "The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response. A warehouse manager keeps a desired inventory list while scanners report what is actually on the shelves. Controllers compare the two and place orders, replace missing items, or remove extras. Kubernetes works similarly. The API server stores desired state, controllers observe differences, and workers execute changes. Reconciliation is continuous, so the system does not merely perform a one-time deployment; it repeatedly repairs drift. This is powerful, but it means a mistaken desired state can be enforced just as persistently as a correct one.",
          engineer:
            "Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency. The API server is the front door for authenticated and authorized changes. etcd stores cluster state, the scheduler assigns pods to nodes, and controllers such as Deployments and ReplicaSets reconcile workload counts and templates. Kubelets on nodes report status and run containers through a runtime. Service networking routes traffic to eligible endpoints. Use declarative manifests, policy checks, audit logs, and reviewed changes because reconciliation will keep applying the declared intent. Understand ownership and finalizers when deleting resources to avoid orphaned storage or stuck termination.",
          visualId: "realtime-channels",
          visualCaption:
            "Desired state passes through the API server while controllers and kubelets continuously reconcile reality.",
        },
        {
          id: "kubernetes-resources",
          title: "Requests guide placement; limits constrain use",
          story:
            "The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response. A moving company asks how much truck space each crate needs before assigning routes, while a loading dock may also impose a hard maximum on what one truck can unload. Kubernetes requests and limits play those roles. Requests help scheduling and capacity planning; limits cap what a workload can consume under pressure. Setting both too low can cause throttling or eviction, while setting requests too high wastes capacity. Good values come from measurements, not from copying a template.",
          engineer:
            "Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency. CPU requests influence scheduling and relative shares, while CPU limits can throttle a container when it exceeds its quota. Memory requests support placement, and exceeding a memory limit can cause termination. Limit ranges and resource quotas can enforce namespace policy, but they must match real workloads. Quality-of-service classes affect eviction behavior. Combine requests with probes, disruption budgets, and topology spread. A failure mode is tuning limits during an incident without examining throttling, OOM events, and dependency latency, which can trade one symptom for another.",
          visualId: "k8s-autoscale",
          visualCaption:
            "Requests guide placement and sharing while limits bound runtime consumption and pressure.",
        },
        {
          id: "kubernetes-hpa",
          title: "HPA adds or removes workload replicas",
          story:
            "The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response. When the checkout line grows, a store opens another register. The Horizontal Pod Autoscaler watches a signal such as CPU use or an application metric and adjusts the number of pod replicas. It does not create new machines. If every existing node is already full, more replicas may remain pending. Scaling also takes time: metrics must be collected, a decision must stabilize, new pods must start, and applications must become ready. Autoscaling is a feedback loop with delay, not an instantaneous capacity switch.",
          engineer:
            "Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency. The HPA compares observed metrics with configured targets and applies scaling policy within minimum and maximum replica bounds. CPU and memory are common defaults, but queue depth, request rate, or custom latency metrics often better represent load. Configure scale-up and scale-down stabilization windows, behavior policies, and metric windows to avoid oscillation. Ensure metrics are representative and not saturated by downstream failure. A failure mode is scaling on an error rate caused by a broken dependency, which adds replicas that cannot repair the root problem and increases pressure.",
          visualId: "k8s-autoscale",
          visualCaption:
            "The HPA observes workload metrics and adjusts replica count within stabilization and capacity constraints.",
        },
        {
          id: "kubernetes-cluster-autoscale",
          title: "Cluster autoscaling adds or removes nodes",
          story:
            "The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response. Opening more registers does not help when the building has no floor space. The cluster autoscaler manages that floor space by adding nodes for pending workloads or removing underused capacity when provider policy allows. It works with node groups that may have different sizes, architectures, zones, and startup times. HPA and cluster autoscaling form a chain: one changes workload replicas, the other changes compute capacity. If either layer is misconfigured, the service can be simultaneously over-replicated and under-provisioned.",
          engineer:
            "Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency. Cluster autoscaler responds to unschedulable pods, node utilization, and provider-specific constraints, while respecting minimum and maximum node-group sizes. Scale-up latency depends on image pulls, node provisioning, and readiness, so capacity plans need headroom for bursts and failover. Scale-down must avoid evicting critical workloads, respect disruption budgets, and account for local storage or daemon workloads. Cluster autoscaler cannot fix an application that cannot schedule because of affinities, taints, or oversized pod requests. Compare HPA replica demand with node capacity in one dashboard.",
          visualId: "k8s-autoscale",
          visualCaption:
            "HPA changes replicas while cluster autoscaling changes node-group capacity beneath them.",
        },
      ],
      security: [
        {
          id: "kubernetes-rbac",
          title: "Limit control-plane privileges",
          threat:
            "Overbroad RBAC, shared administrator credentials, or unprotected etcd can allow cluster-wide changes and data exposure.",
          control:
            "Use least-privilege roles, short-lived identities, reviewed bindings, encryption, audit logs, and restricted API access.",
          verify:
            "Review effective permissions and test that ordinary workloads cannot read secrets, modify RBAC, or access other namespaces.",
        },
        {
          id: "kubernetes-network-policy",
          title: "Enforce workload network boundaries",
          threat:
            "A compromised pod may reach sensitive services, metadata endpoints, or other tenants unless network traffic is restricted.",
          control:
            "Default-deny traffic where supported, allow only required paths, restrict egress, and use a policy-enforcing network layer.",
          verify:
            "Run connectivity tests between namespaces and external destinations and confirm only documented flows succeed.",
        },
        {
          id: "kubernetes-autoscale-quota",
          title: "Bound autoscaling blast radius",
          threat:
            "Misconfigured metrics or maximum replica counts can trigger a scaling storm that exhausts capacity and spend.",
          control:
            "Set replica and node-group ceilings, tenant quotas, stabilization windows, budget alerts, and manual circuit breakers.",
          verify:
            "Simulate a sustained metric spike and confirm scaling stops at approved limits without starving other tenants.",
        },
      ],
      quiz: [
        {
          id: "kubernetes-q1",
          topicId: "kubernetes",
          prompt: "What is the Kubernetes control plane's core pattern?",
          choices: [
            "One-time deployment only",
            "Continuous reconciliation of desired and observed state",
            "Manual node replacement only",
            "Replacing application code with YAML",
          ],
          answerIndex: 1,
          explanation:
            "Controllers repeatedly compare declared intent with cluster reality and act to reduce drift.",
          kind: "story-match",
        },
        {
          id: "kubernetes-q2",
          topicId: "kubernetes",
          prompt: "What is the main difference between HPA and cluster autoscaler?",
          choices: [
            "HPA changes replica count; cluster autoscaler changes node capacity",
            "HPA signs images; cluster autoscaler scans secrets",
            "HPA stores logs; cluster autoscaler writes application code",
            "They are the same controller",
          ],
          answerIndex: 0,
          explanation:
            "HPA scales pods, while cluster autoscaler adds or removes nodes so those pods have somewhere to run.",
          kind: "tradeoff",
        },
        {
          id: "kubernetes-q3",
          topicId: "kubernetes",
          prompt: "Why configure scale-down stabilization?",
          choices: [
            "To make scaling instantaneous",
            "To avoid removing capacity too quickly during brief metric dips",
            "To disable readiness probes",
            "To increase node privileges",
          ],
          answerIndex: 1,
          explanation:
            "Stabilization windows dampen oscillation and prevent premature scale-down during short-lived fluctuations.",
          kind: "scenario",
        },
        {
          id: "kubernetes-q4",
          topicId: "kubernetes",
          prompt: "Why can more HPA replicas fail to improve capacity?",
          choices: [
            "Because replicas do not use images",
            "Because nodes may be full and cluster autoscaling has not added capacity yet",
            "Because Kubernetes forbids scaling",
            "Because metrics are always perfect",
          ],
          answerIndex: 1,
          explanation:
            "Replica scaling cannot overcome a node-capacity shortage; provisioning and scheduling latency still apply.",
          kind: "scenario",
        },
      ],
    },
    {
      id: "safe-deployments",
      slug: "safe-deployments",
      trackId: "backend-cloud",
      title: "Safe Deployments: Canary, Blue-Green, Feature Flags",
      summary:
        "Limit release blast radius with canaries, blue-green environments, flags, automated stop signals, and backward-compatible data changes.",
      minutes: 12,
      storyHook:
        "A safe release opens one lane first, watches the traffic, and keeps a proven route available until the new road earns trust.",
      prerequisites: ["kubernetes"],
      steps: [
        {
          id: "deploy-strategies",
          title: "Choose a rollout shape that limits blast radius",
          story:
            "The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response. A city can open a new bridge to one lane, switch all traffic between two fully built bridges, or hide the new route behind a controlled gate. Canary, blue-green, and feature-flag releases offer similar choices. A canary sends a small share of traffic to the new version. Blue-green keeps two complete environments and flips routing after validation. Feature flags separate code deployment from behavior exposure, allowing a dark launch without immediately showing the feature. Each strategy reduces risk in a different way and adds operational cost.",
          engineer:
            "Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency. Canaries expose a limited population and require representative traffic plus reliable comparison against a baseline. Blue-green offers fast rollback but doubles environment and data-management complexity, especially for stateful services. Feature flags enable staged exposure and emergency disablement, but stale flags and tangled conditional paths become technical debt. Choose based on rollback speed, statefulness, traffic volume, and compliance needs. A failure mode is a canary so small or short-lived that meaningful failures never appear before full promotion.",
          visualId: "deploy-strategies",
          visualCaption:
            "Canary traffic, environment switching, and feature gates offer different blast-radius and rollback trade-offs.",
        },
        {
          id: "deploy-signals",
          title: "Canary metrics must be able to stop the rollout",
          story:
            "The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response. A test pilot does not watch only engine temperature. They watch navigation, fuel, communication, and passenger safety together. A canary needs the same breadth. Error rate and latency show service health; saturation and restarts show capacity trouble; business signals show whether users can complete tasks; security checks show whether authorization or data handling changed. Every critical signal needs a threshold, a comparison window, and a named action. A dashboard without an automatic stop rule is merely decoration.",
          engineer:
            "Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency. Stop or pause a rollout when error rate exceeds its approved budget, p95 or p99 latency regresses beyond the service objective, saturation approaches unsafe limits, restart or OOM rates rise, or business completion and security invariants fail. Compare against a stable baseline with enough samples to avoid noise, and segment by tenant, region, and route. Use short evaluation windows during high-volume canaries and longer windows for rare events. A failure mode is watching averages while a severe regression affects only a small but important cohort.",
          visualId: "deploy-strategies",
          visualCaption:
            "Error, latency, saturation, business, and security gates share one automated promotion decision.",
        },
        {
          id: "deploy-automation",
          title: "Automate promotion and rollback",
          story:
            "The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response. A drawbridge operator needs a clear lever and a practiced return procedure, not a debate during every crossing. Deployment automation should encode the same discipline: advance only after checks pass, pause on uncertainty, and roll back when a stop condition fires. The rollback must be tested against real state, including queues, caches, sessions, and partially migrated data. A rollback button that changes the application version but leaves incompatible data behind can turn a small incident into a larger outage.",
          engineer:
            "Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency. Use progressive delivery controllers or CI/CD orchestration to analyze canary metrics, require approvals where policy demands, and execute rollback automatically. Make deployment state observable and auditable, and keep artifact versions immutable so rollback targets are known. Test rollback in staging under load, including dependency and data incompatibilities. Limit concurrent changes that can confound canary attribution. A failure mode is an automated promotion policy with no tested rollback path, or manual approval steps that delay containment beyond the error budget.",
          visualId: "deploy-strategies",
          visualCaption:
            "Versioned artifacts, metric gates, approvals, and rehearsed rollback form one release control loop.",
        },
        {
          id: "deploy-data-flags",
          title: "Data changes and flags need lifecycle discipline",
          story:
            "The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response. A new doorway cannot be used safely if the floor is removed before the frame is ready. Database changes should arrive in an expanding order: add compatible structures, deploy code that tolerates old and new states, migrate gradually, and remove old paths only after rollback is no longer needed. Feature flags also need owners, expiry dates, and cleanup. Otherwise every release leaves hidden branches that future engineers must understand, and a kill switch may disable only the interface while background work continues.",
          engineer:
            "Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency. Use expand-contract migrations, backward-compatible APIs, dual-write or shadow validation where appropriate, and idempotent backfills. Avoid long blocking locks and test mixed-version behavior during rollout. Feature flags should default safely, enforce permissions, cover asynchronous and background paths, and record changes in an audit trail. Remove flags after the rollout stabilizes and the rollback window closes. A failure mode is treating a flag as risk-free: it adds state complexity and can bypass the exact canary metrics intended to protect users.",
          visualId: "saga-outbox",
          visualCaption:
            "Expand-contract migrations and expiring flags keep mixed application versions compatible during rollout.",
        },
      ],
      security: [
        {
          id: "deploy-security-gates",
          title: "Include security invariants in promotion",
          threat:
            "A release may pass performance checks while weakening authorization, redaction, secret handling, or tenant isolation.",
          control:
            "Require security regression suites, policy checks, and provenance verification in the same promotion gate as reliability metrics.",
          verify:
            "Attempt promotion of an artifact that fails a security test and confirm rollout stops automatically.",
        },
        {
          id: "deploy-artifact-integrity",
          title: "Deploy only immutable approved artifacts",
          threat:
            "A mutable tag or altered artifact can change between validation and deployment, invalidating canary evidence.",
          control:
            "Pin immutable digests, sign artifacts, verify provenance, and enforce admission policy before scheduling.",
          verify:
            "Compare deployed digests with approved build records and confirm unapproved or unsigned artifacts are rejected.",
        },
        {
          id: "deploy-flag-access",
          title: "Control feature-flag changes",
          threat:
            "An unauthorized or accidental flag change can expose unfinished behavior or disable a security control.",
          control:
            "Apply least-privilege access, audit changes, require approval for sensitive flags, and keep security controls outside ordinary flags.",
          verify:
            "Test unauthorized flag updates and confirm security-critical behavior cannot be disabled through the flag system.",
        },
      ],
      quiz: [
        {
          id: "deploy-q1",
          topicId: "safe-deployments",
          prompt: "What is the main purpose of a canary release?",
          choices: [
            "To deploy without testing",
            "To expose a limited population before broad promotion",
            "To eliminate rollback",
            "To replace observability",
          ],
          answerIndex: 1,
          explanation:
            "A canary limits blast radius and provides early evidence from representative production traffic.",
          kind: "story-match",
        },
        {
          id: "deploy-q2",
          topicId: "safe-deployments",
          prompt: "Which signal should stop a canary rollout?",
          choices: [
            "Only a slightly higher build number",
            "A p99 latency regression beyond the service objective",
            "A new code comment",
            "A longer changelog",
          ],
          answerIndex: 1,
          explanation:
            "Latency regressions are a direct service-health signal and should trigger a defined pause or rollback action.",
          kind: "scenario",
        },
        {
          id: "deploy-q3",
          topicId: "safe-deployments",
          prompt: "Why use expand-contract database migrations?",
          choices: [
            "To guarantee zero locks",
            "To keep old and new application versions compatible during rollout",
            "To remove all constraints",
            "To avoid testing rollback",
          ],
          answerIndex: 1,
          explanation:
            "Adding compatible structures first and removing old paths later allows mixed versions to coexist safely.",
          kind: "tradeoff",
        },
        {
          id: "deploy-q4",
          topicId: "safe-deployments",
          prompt: "Why pin immutable artifact digests for canaries?",
          choices: [
            "To increase image size",
            "To ensure the validated artifact is the one deployed",
            "To skip security tests",
            "To make rollback impossible",
          ],
          answerIndex: 1,
          explanation:
            "Immutable digests prevent tags or artifacts from changing after validation and preserve trustworthy rollback targets.",
          kind: "security",
        },
      ],
    },
    {
      id: "appsec-zero-trust",
      slug: "appsec-zero-trust",
      trackId: "backend-cloud",
      title: "AppSec and Multi-Tenant Zero Trust",
      summary:
        "Authorize every object, use safe database access, validate tokens completely, control egress, and isolate tenants across identity and network layers.",
      minutes: 14,
      storyHook:
        "Zero trust means every request carries its own identity and must earn access to each object, tool, and network destination.",
      prerequisites: ["safe-deployments", "kubernetes"],
      steps: [
        {
          id: "appsec-identity",
          title: "Authenticate every request and authorize every object",
          story:
            "The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response. A badge identifies a visitor, but it does not open every room. Authentication establishes identity; authorization decides whether that identity may perform a specific action on a specific object. In a multi-tenant application, a valid user token is only the beginning. The server must derive tenant scope from trusted identity and check the requested object against that scope. Client-supplied tenant identifiers are hints at best, never authority. Background jobs and internal service calls need the same discipline as public requests.",
          engineer:
            "Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency. Validate identity at the edge and again at sensitive internal boundaries, then enforce object-level authorization using server-side tenant, owner, role, and resource state. Deny when scope is missing. Avoid shared administrator tokens for user-facing flows; use distinct audited service identities for automation. Scope database queries, cache keys, storage paths, and event consumers to the tenant. A failure mode is checking only whether a user is logged in, then accepting an object ID without verifying that the object belongs to the caller's tenant.",
          visualId: "threat-defense",
          visualCaption:
            "Trusted identity and object-level authorization guard each tenant-scoped request and data access.",
        },
        {
          id: "appsec-queries",
          title: "Parameterized queries separate code from data",
          story:
            "The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response. A form letter keeps its instructions fixed while names and addresses fill clearly marked blanks. Parameterized queries follow that principle: the database receives a fixed statement structure and separate values for the blanks. User input never becomes part of the SQL grammar. Dynamic identifiers such as sort columns need a different treatment because they cannot be bound as ordinary values; choose them from a strict allowlist. Input validation adds useful constraints, but it does not replace parameterization.",
          engineer:
            "Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency. Use prepared statements or the database driver's parameter binding for every value, including filters, pagination, and updates. Avoid concatenating untrusted text into query strings. When table names, column names, or sort directions must vary, map them through an explicit allowlist rather than accepting arbitrary identifiers. Apply least-privilege database roles so the application cannot perform unrelated administrative operations. Validate types and lengths for product correctness, then still parameterize. A failure mode is relying on escaping or filtering alone while the query remains dynamically assembled.",
          visualId: "threat-defense",
          visualCaption:
            "Bound values and allowlisted identifiers keep user data separate from database statement structure.",
        },
        {
          id: "appsec-jwt",
          title: "Validate the whole token contract",
          story:
            "The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response. A concert ticket is useful only when it is genuine, issued by the right organizer, intended for this event, and still valid. JSON Web Tokens need the same complete check. A valid-looking signature alone does not establish that the token belongs to this service or audience. Expired tickets should fail, issuer and audience must match policy, and the accepted algorithm must be pinned so verification cannot drift into a weaker scheme. Claims are then inputs to authorization, not a substitute for it.",
          engineer:
            "Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency. Validate the signature with trusted keys, pin the accepted algorithm, verify issuer, audience, expiry, and not-before where applicable, and enforce required claims and reasonable token lifetime. Handle key rotation with overlapping trusted keys and a defined retirement process. Reject malformed tokens and ambiguous algorithm metadata before claim processing. Keep signing keys in a secret manager or managed identity service, and never place them in client code. A failure mode is decoding a token without full verification or checking the signature while ignoring audience and expiry.",
          visualId: "threat-defense",
          visualCaption:
            "Signature, algorithm, issuer, audience, time, and required claims form one token-validation chain.",
        },
        {
          id: "appsec-egress-isolation",
          title: "Control egress and isolate tenants in depth",
          story:
            "The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response. A secure office does more than check visitors at the front door. It also controls which rooms they can enter, which cabinets they can open, and which packages leave the building. Multi-tenant applications need the same layered discipline. A service may be allowed to call a payment provider but should not reach an unrelated internal database or metadata endpoint. Network policy can restrict destinations, while application policy decides whether the current tenant may use them. Identity, egress rules, storage scope, and audit trails reinforce one another rather than replacing one another.",
          engineer:
            "Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency. For server-side requests influenced by users, validate the destination against an egress allowlist, resolve and check addresses, and block private or link-local ranges unless explicitly required. Enforce network policy so compromised workloads cannot bypass application rules, and use separate service identities and secrets per trust boundary. Scope queues, caches, object storage, and databases to the tenant. Prevent DNS rebinding and redirect bypasses through controlled resolution and revalidation. A failure mode is treating network segmentation as authorization; a reachable service still needs an identity and object-level permission check.",
          visualId: "threat-defense",
          visualCaption:
            "SSRF egress allowlists and tenant network policies restrict what each workload can reach.",
        },
      ],
      security: [
        {
          id: "appsec-practice-authz",
          title: "Enforce tenant and object authorization",
          threat:
            "A valid identity may request an object owned by another tenant if authorization checks only login status.",
          control:
            "Authorize every object ID against server-derived tenant and resource scope, including background and internal paths.",
          verify:
            "Run cross-tenant tests across reads, writes, exports, and asynchronous jobs with intentionally overlapping identifiers.",
        },
        {
          id: "appsec-practice-query",
          title: "Use parameterized database access",
          threat:
            "Untrusted values concatenated into query structure can alter database behavior or expose unrelated data.",
          control:
            "Use bound parameters for values, allowlist dynamic identifiers, validate input, and grant least-privilege database roles.",
          verify:
            "Run approved injection regression tests against every query builder and confirm bound values never become SQL syntax.",
        },
        {
          id: "appsec-practice-token",
          title: "Validate JWT trust and claims completely",
          threat:
            "A token with an unexpected issuer, audience, algorithm, or expired validity may be accepted by an incomplete verifier.",
          control:
            "Pin algorithms, verify signatures, issuer, audience, expiry, and required claims, and manage key rotation safely.",
          verify:
            "Test tokens that fail each validation dimension and confirm rejection before any protected operation executes.",
        },
      ],
      quiz: [
        {
          id: "appsec-q1",
          topicId: "appsec-zero-trust",
          prompt: "What does authentication establish?",
          choices: [
            "Access to every object",
            "A verified caller identity",
            "That an object ID is safe",
            "That a database query is parameterized",
          ],
          answerIndex: 1,
          explanation:
            "Authentication verifies identity; object-level authorization must still evaluate tenant, resource, and action scope.",
          kind: "tradeoff",
        },
        {
          id: "appsec-q2",
          topicId: "appsec-zero-trust",
          prompt: "Which approach safely handles user values in SQL?",
          choices: [
            "Concatenate them into the query",
            "Escape them manually and skip validation",
            "Use parameterized queries with bound values",
            "Ask the model to rewrite the SQL",
          ],
          answerIndex: 2,
          explanation:
            "Bound parameters keep values separate from statement structure; dynamic identifiers require a strict allowlist.",
          kind: "security",
        },
        {
          id: "appsec-q3",
          topicId: "appsec-zero-trust",
          prompt: "Which JWT checks are required?",
          choices: [
            "Only that the token has three segments",
            "Only the payload username",
            "Signature, pinned algorithm, issuer, audience, expiry, and required claims",
            "Only the token color",
          ],
          answerIndex: 2,
          explanation:
            "A token must satisfy the complete trust contract, not merely contain parseable claims or a signature.",
          kind: "security",
        },
        {
          id: "appsec-q4",
          topicId: "appsec-zero-trust",
          prompt: "What control reduces SSRF risk for server-side requests?",
          choices: [
            "Allow every destination",
            "Use an egress allowlist and restrict prohibited address ranges and network paths",
            "Trust user-supplied host names",
            "Disable authorization",
          ],
          answerIndex: 1,
          explanation:
            "Destination allowlists and network restrictions limit where the server can connect, including after DNS resolution.",
          kind: "security",
        },
      ],
    },
  ],
};

export const trackBackend: Track = backendTrack;

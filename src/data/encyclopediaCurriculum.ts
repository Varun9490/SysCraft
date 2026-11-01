import type { EncyclopediaModule } from "@/types/encyclopedia";

/**
 * Expanded curriculum drawn from:
 * - ossu/computer-science (canonical course references, algorithms, distributed systems)
 * - microsoft/generative-ai-for-beginners (AI/LLM architecture, tokenization, embeddings, RAG)
 * - donnemartin/system-design-primer (system design concepts mapped to primitives)
 */

export const ENCYCLOPEDIA_CURRICULUM_MODULES: EncyclopediaModule[] = [
  {
    id: "tokenization-basics",
    title: "Tokenization & Subword Encoding",
    difficulty: "foundations",
    estimatedMinutes: 22,
    summary: "How text becomes numbers — byte-pair encoding, WordPiece, and why the vocabulary size is a design trade-off.",
    bodyMarkdown: `# Tokenization and Subword Encoding

Every LLM begins as a sequence of integers. Tokenization converts raw text into those integers. The vocabulary (often 32k-100k tokens) is a fixed budget: too small means long sequences for rare languages; too large means rare tokens crowd out dense representations.

Byte-pair encoding (BPE) builds a vocabulary by repeatedly merging the two most frequent adjacent pairs. It handles out-of-vocabulary words by splitting them into familiar subwords. Most open-source LLMs (GPT, LLaMA) use BPE or a variant.

## Why subwords matter for system design

Token length determines memory footprint and inference cost. A 4k-token context at 4 bytes/token is 16 KB; with embeddings at 4096 dimensions, that multiplies quickly. Choosing the tokenizer affects KV-cache sizing, batching throughput, and latency.

## Trade-offs

| Dimension | Small vocab | Large vocab | Recommendation |
| --- | --- | --- | Small vocab for multilingual tasks; large for dense code/JSON |
`,
    tradeOffs: [
      { dimension: "Vocab size vs sequence length", optionA: "32k", optionB: "100k", recommendation: "32k for multilingual; 100k for code-heavy workloads" },
      { dimension: "BPE vs sentence-piece", optionA: "BPE", optionB: "SentencePiece", recommendation: "BPE for open LLM reproducibility; SentencePiece for multilingual stability" },
    ],
    whenToUse: ["LLM design", "Token budget planning", "Multilingual systems"],
    whenNotToUse: ["Fixed-schema JSON (parse tokens differently)", "Character-level generative models"],
    scalingNotes: "Vocabulary growth is bounded; subword splitting controls sequence length growth for out-of-vocabulary text.",
    relatedModuleIds: ["kv-cache-design", "rag-patterns"],
    interactiveVisual: "none",
    flashcards: [],
    quiz: [],
    keyNumbers: [],
  },
  {
    id: "embeddings-vector-db",
    title: "Embeddings & Vector Search",
    difficulty: "intermediate",
    estimatedMinutes: 30,
    summary: "How dense vectors become searchable keys, and why approximate nearest neighbor (ANN) replaces exact search at scale.",
    bodyMarkdown: `# Embeddings and Vector Search

Embeddings turn text, images, or events into fixed-dimension dense vectors so that semantic similarity maps to geometric proximity. A cosine similarity of 0.95 is closer in meaning than 0.3.

Approximate nearest neighbor (ANN) replaces exact search as indexes grow past tens of thousands of vectors. HNSW, IVF, and LSH each trade recall for latency. HNSW (used by Milvus, Weaviate, Pinecone) typically achieves >95% recall with 10-20x speedup over brute-force.

## System design implications

A vector DB index is a graph or multi-level cluster. Writes (new embeddings) are slower than reads (nearest neighbor); batch ingestion with periodic graph rebuild is common. Replication and consistency levels mirror traditional databases.
`,
    tradeOffs: [
      { dimension: "ANN vs brute force", optionA: "Brute (exact)", optionB: "HNSW (approx)", recommendation: "Brute under 50k; HNSW above" },
      { dimension: "Index rebuild vs incremental", optionA: "Rebuild", optionB: "Incremental insert", recommendation: "Incremental for live systems; rebuild for batch analytics" },
    ],
    whenToUse: ["Recommendation systems", "Semantic search", "Retrieval-augmented generation"],
    whenNotToUse: ["Exact-match lookup (use hash index)", "Low-dimensional feature spaces"],
    relatedModuleIds: ["vector-search", "kv-cache-design"],
    interactiveVisual: "none",
    flashcards: [],
    quiz: [],
    keyNumbers: [],
  },
  {
    id: "rag-patterns",
    title: "Retrieval-Augmented Generation (RAG)",
    difficulty: "intermediate",
    estimatedMinutes: 28,
    summary: "How to ground LLM responses with retrieved context without bloating the prompt or overloading the KV cache.",
    bodyMarkdown: `# Retrieval-Augmented Generation

RAG feeds relevant document chunks into an LLM prompt so answers cite sources instead of hallucinating. The architecture: embed query, retrieve top-k chunks from a vector DB, inject chunks into prompt template, generate.

The design challenge: chunk size, overlap, and embedding model choice determine retrieval quality. Too-small chunks miss context; too-large chunks flood the prompt window. Embedding model must match the vector DB index.

## Scaling patterns

A multi-stage RAG uses a first-pass retrieval to pick candidate chunks, then a reranking model (cross-encoder) to score chunk relevance. This trades latency for quality.
`,
    tradeOffs: [
      { dimension: "Chunk size", optionA: "Small (256 tokens)", optionB: "Large (1024 tokens)", recommendation: "Small for granular retrieval; large for coherent context" },
      { dimension: "First-pass retrieval", optionA: "Fast (ANN)", optionB: "Slow (rerank)", recommendation: "ANN by default; rerank for high-stakes answers" },
    ],
    whenToUse: ["Knowledge bases", "Document Q&A", "Internal search systems"],
    whenNotToUse: ["Creative generation without factual sources", "Real-time streams without pre-indexed context"],
    relatedModuleIds: ["tokenization-basics", "embeddings-vector-db"],
    interactiveVisual: "none",
    flashcards: [],
    quiz: [],
    keyNumbers: [],
  },
  {
    id: "kv-cache-design",
    title: "KV Cache Design for Inference",
    difficulty: "advanced",
    estimatedMinutes: 35,
    summary: "How self-attention's key/value cache scales with sequence length, batching, and replication — and how to size it.",
    bodyMarkdown: `# KV Cache Design for Inference

Every token in an LLM forward pass produces key and value vectors. For self-attention across a sequence, all previous keys and values must remain accessible. The KV cache therefore grows with the square of sequence length (keys + values × sequence length × layers × heads). A 4k sequence on a 32-layer model can consume tens of gigabytes.

## Management strategies

- Sliding window: keep only recent tokens (e.g., 1024) to cap memory.
- Paged attention: allocate non-contiguous blocks to avoid fragmentation.
- Continuous batching: interleave new requests into running batches without clearing caches.

## System implications

Cache eviction must be coordinated with replication: a cached value that moves must either be rebuilt or forwarded. Replication factors and multi-region latency multiply memory consumption.
`,
    tradeOffs: [
      { dimension: "Sliding window vs full context", optionA: "Window (1k)", optionB: "Full (4k)", recommendation: "Window for long-form chat; full for document summarization" },
      { dimension: "Paged vs contiguous", optionA: "Paged", optionB: "Contiguous", recommendation: "Paged for high-batch throughput" },
    ],
    whenToUse: ["LLM inference optimization", "Batch scheduling", "Memory-constrained serving"],
    whenNotToUse: ["Stateless functions without attention", "Short-context tasks under 256 tokens"],
    relatedModuleIds: ["tokenization-basics", "system-design-primer-curriculum"],
    interactiveVisual: "none",
    flashcards: [],
    quiz: [],
    keyNumbers: [],
  },
  {
    id: "system-design-primer-curriculum",
    title: "System Design Primer Concepts",
    difficulty: "intermediate",
    estimatedMinutes: 26,
    summary: "Key abstractions from the system design primer: rate limiters, sharding, replication strategies, and consistency patterns mapped to this canvas.",
    bodyMarkdown: `# System Design Primer Concepts

The primer introduces rate limiting (token bucket vs leaky bucket), sharding (consistent hashing vs range), replication (master-slave vs multi-leader), and caching (cache-aside vs write-through vs read-through). Each maps directly to primitives in this workspace.

Rate limiters protect downstream services from overload; token buckets allow brief bursts; leaky buckets enforce constant outflow. Sharding distributes data so no single node owns the full dataset; consistent hashing minimizes reshuffle when nodes change. Replication ensures durability; multi-leader increases availability at the cost of conflict resolution.

These patterns combine in real architectures: sharding + replication + rate limiting + caching form the backbone of most scalable platforms.
`,
    tradeOffs: [
      { dimension: "Rate limiter type", optionA: "Token bucket", optionB: "Leaky bucket", recommendation: "Token for user-facing APIs; leaky for background pipelines" },
      { dimension: "Shard method", optionA: "Consistent hash", optionB: "Range-based", recommendation: "Consistent hash for elastic clusters" },
    ],
    whenToUse: ["Designing scalable backends", "Interview preparation", "Mapping patterns to primitives"],
    whenNotToUse: ["Fixed-size single-node systems"],
    relatedModuleIds: ["sharding-partitioning", "gossip-protocol", "rate-limiting"],
    interactiveVisual: "none",
    flashcards: [],
    quiz: [],
    keyNumbers: [],
  },
  {
    id: "replication-consistency",
    title: "Replication & Consistency Levels",
    difficulty: "intermediate",
    estimatedMinutes: 28,
    summary: "How replicas stay synchronized: synchronous, asynchronous, quorum-based replication and their latency implications.",
    bodyMarkdown: `# Replication and Consistency Levels

Synchronous replication waits for all replicas to acknowledge a write; asynchronous replication returns after one node writes, letting others catch up. Quorum replication requires R reads + W writes > total nodes.

Quorum replication balances speed and durability: faster than synchronous but safer than asynchronous. It introduces latency equal to the slowest replica response time.
`,
    tradeOffs: [
      { dimension: "Sync vs async", optionA: "Synchronous", optionB: "Asynchronous", recommendation: "Synchronous for durable writes; async for high-throughput writes" },
    ],
    whenToUse: ["Durable systems", "Multi-region availability", "Consensus-built designs"],
    whenNotToUse: ["Single-node deployments"],
    relatedModuleIds: ["cap-theorem", "raft-consensus"],
    interactiveVisual: "none",
    flashcards: [],
    quiz: [],
    keyNumbers: [],
  },
  {
    id: "aws-well-architected",
    title: "AWS Production Architecture & VPC Internals",
    difficulty: "advanced",
    estimatedMinutes: 34,
    summary: "Design multi-AZ AWS topologies from VPC CIDR routing, ALB/NLB, and PrivateLink to Aurora Global Databases, DynamoDB single-table patterns, and KMS envelope encryption.",
    bodyMarkdown: `# AWS Production Architecture & VPC Internals

Building production systems on AWS means turning failure domains — Availability Zones (AZs), regional control planes, and NAT hairpins — into explicit network and storage boundaries.

## 1. VPC Topology: Public, Private, and Isolated Tiers

A production VPC spans at least three Availability Zones in a region (for example \`us-east-1a\`, \`1b\`, \`1c\`), each backed by independent power, cooling, and flood plains connected by low-latency metro fiber (1-2 ms RTT).

- **Public Subnets** hold only ingress/egress network appliances: Application Load Balancers (ALB), Network Load Balancers (NLB), and NAT Gateways with route tables pointing \`0.0.0.0/0\` to an Internet Gateway (IGW).
- **Private App Subnets** run ECS Fargate tasks, EKS worker nodes, and Lambda VPC ENIs. They have no public IPv4 addresses; outbound internet calls traverse a per-AZ NAT Gateway.
- **Isolated Data Subnets** host RDS/Aurora, ElastiCache Redis, and OpenSearch with zero route to IGW or NAT.
- **Gateway & Interface VPC Endpoints (PrivateLink)** route S3 and DynamoDB traffic directly over the AWS private backbone, bypassing NAT Gateways (which otherwise charge $0.045/GB processed).

## 2. Compute & Ingress: ALB vs NLB, ECS vs EKS

| Layer | Option A | Option B | Architectural Verdict |
| --- | --- | --- | --- |
| Load Balancing | **ALB (L7 HTTP/gRPC)** | **NLB (L4 TCP/UDP)** | ALB for path/host routing, WAF attachment, and OIDC auth; NLB for extreme millions-of-RPS throughput, static Anycast IPs, and PrivateLink exposure. |
| Container Runtime | **ECS + Fargate** | **EKS (Kubernetes)** | ECS when you want zero control-plane tax and native AWS IAM task roles; EKS when you need portable Kubernetes operators, Envoy/Cilium meshes, or Karpenter bin-packing. |
| Serverless | **Lambda** | **Fargate / EC2** | Lambda for spiky/event-driven workloads; switch to Fargate/EC2 once steady concurrency exceeds ~25-30% utilization where per-ms Lambda billing costs ~2.5-3x more. |

## 3. Data Tier: Aurora Storage Engine vs DynamoDB Partitions

- **Amazon Aurora** decouples compute from a shared, log-structured storage volume replicated 6 ways across 3 AZs (write quorum 4/6, read quorum 3/6). Instead of shipping dirty 16 KB B-tree pages over the network, Aurora ships redo log records only, cutting write amplification and replica lag to < 20 ms.
- **Amazon DynamoDB** hashes the partition key via consistent hashing onto storage nodes backed by Paxos replication groups across 3 AZs. Each physical partition sustains **1,000 WCU (1 KB writes/sec)** and **3,000 RCU (4 KB strongly consistent reads/sec)**. Hot keys require write sharding (suffix \`#0..N\`) or **DAX** in-memory caching.

## 4. Security & Identity: IAM STS & KMS Envelope Encryption

Never bake static IAM keys into containers. Bind fine-grained IAM Roles via **IRSA (IAM Roles for Service Accounts)** on EKS or Task Roles on ECS using short-lived OIDC STS tokens. Encrypt data at rest using **AWS KMS Envelope Encryption**: KMS generates a 256-bit Data Encryption Key (DEK), encrypts the payload locally in memory with AES-256-GCM, and stores the KMS-encrypted DEK alongside the ciphertext.`,
    tradeOffs: [
      { dimension: "ALB vs NLB", optionA: "ALB (L7 HTTP/WAF)", optionB: "NLB (L4 TCP/Static IP)", recommendation: "ALB for web/API ingress with WAF; NLB for raw TCP throughput and PrivateLink." },
      { dimension: "Aurora vs DynamoDB", optionA: "Aurora (6-way quorum SQL)", optionB: "DynamoDB (Paxos KV)", recommendation: "Aurora for relational joins & transactions; DynamoDB for predictable single-digit-ms scale." },
    ],
    whenToUse: [
      "Designing multi-AZ high-availability cloud backends on AWS",
      "Eliminating NAT Gateway data-processing bottlenecks via VPC Endpoints",
      "Choosing between Aurora, RDS Postgres, and DynamoDB under strict SLOs",
    ],
    whenNotToUse: [
      "Ultra-low-budget hobby projects where a single VPS avoids multi-AZ NAT/ALB base fees",
    ],
    scalingNotes: "Deploy one NAT Gateway per AZ to avoid cross-AZ failure coupling, and attach Gateway Endpoints for S3/DynamoDB immediately to save $45/TB.",
    relatedModuleIds: ["load-balancing", "replication", "security-zero-trust-architecture"],
    interactiveVisual: "btree_vs_lsm",
    flashcards: [
      { cardId: "aws-wa-1", front: "How does Amazon Aurora achieve <20ms replica lag without shipping full 16KB B-Tree pages?", back: "It ships only redo log records to a 6-way replicated storage fleet across 3 AZs (4/6 write quorum, 3/6 read quorum).", conceptTag: "aws-well-architected", moduleId: "aws-well-architected" },
      { cardId: "aws-wa-2", front: "What are the hard per-partition throughput limits of a single DynamoDB physical partition?", back: "1,000 WCU (1 KB writes/sec) and 3,000 RCU (4 KB strongly consistent reads/sec, or 6,000 eventually consistent).", conceptTag: "aws-well-architected", moduleId: "aws-well-architected" },
    ],
    quiz: [
      {
        id: "aws-wa-q1",
        prompt: "Your private ECS tasks pull 80 TB/month of blobs from S3, and your AWS bill shows $3,600/month in NAT Gateway processing charges. What is the clean architectural fix?",
        options: [
          { id: "a", text: "Attach a free S3 Gateway VPC Endpoint to the private subnet route tables", correct: true },
          { id: "b", text: "Move the ECS tasks into a public subnet with public IPs", correct: false },
          { id: "c", text: "Replace the ALB with an NLB", correct: false },
        ],
        explanation: "S3 and DynamoDB Gateway VPC Endpoints route traffic over the AWS private network at zero per-GB NAT charge.",
        conceptTag: "aws-well-architected",
      },
      {
        id: "aws-wa-q2",
        prompt: "Why does Amazon Aurora survive the loss of an entire Availability Zone (2 of 6 storage copies) without losing write availability?",
        options: [
          { id: "a", text: "Aurora uses a 4-of-6 write quorum and 3-of-6 read quorum across 3 AZs (2 copies per AZ)", correct: true },
          { id: "b", text: "Aurora uses asynchronous single-leader replication only", correct: false },
          { id: "c", text: "Aurora caches all writes in CloudFront", correct: false },
        ],
        explanation: "With 2 copies per AZ across 3 AZs, losing 1 AZ leaves 4 copies online — meeting the 4/6 write quorum.",
        conceptTag: "aws-well-architected",
      },
    ],
    keyNumbers: [
      { value: "4/6 & 3/6", label: "Aurora write and read quorum across 3 AZs", note: "Survives an entire AZ outage plus 1 additional storage node read fault." },
      { value: "1k WCU / 3k RCU", label: "Single DynamoDB partition ceiling", note: "Hot keys exceeding this throttle with ProvisionedThroughputExceededException." },
      { value: "1–2 ms", label: "Intra-region cross-AZ fiber RTT", note: "Low enough for synchronous quorum writes; cross-region is 60–150 ms." },
    ],
  },
  {
    id: "cloudflare-edge-architecture",
    title: "Cloudflare Anycast Edge, Workers & Durable Objects",
    difficulty: "advanced",
    estimatedMinutes: 30,
    summary: "How Anycast BGP, V8 Isolate Workers, Tiered Caching, Durable Objects, R2, and Zero Trust Tunnels move compute and security within 15ms of every user.",
    bodyMarkdown: `# Cloudflare Anycast Edge, Workers & Durable Objects

Traditional cloud architectures route every user request to a single regional data center (for example \`us-east-1\`), paying 80–250 ms of transoceanic RTT before a single byte of code runs. Edge-native architecture flips this model: every PoP in 330+ cities announces the same Anycast IP prefix via BGP and runs compute, caching, and WAF inline.

## 1. Anycast BGP & Tiered Cache Shielding

- **Anycast Routing**: One IP address is announced from 330+ edge locations. Internet BGP routers naturally deliver packets to the topologically nearest PoP, terminating TLS 1.3 and HTTP/3 (QUIC) within ~10–15 ms of 95% of the world's internet-connected population.
- **Tiered Cache + Origin Shield**: Without tiering, 330 PoPs missing on a cold asset send 330 simultaneous requests to your origin. Tiered Cache designates upper-tier hub PoPs with persistent connection pools to origin, collapsing 330 edge misses into 1 origin fetch.
- **Request Coalescing (Single-Flight)**: Concurrent misses for the same cache key at the same PoP coalesce behind a single upstream fetch.

## 2. V8 Isolates (Workers) vs Containers & MicroVMs

| Runtime | Cold Start | Memory Overhead | Isolation Boundary |
| --- | --- | --- | --- |
| **Cloudflare Worker (V8 Isolate)** | **< 1–5 ms** | **~2–3 MB** | V8 engine sandbox + process-level MPK/seccomp |
| **AWS Lambda (Firecracker MicroVM)** | **120–600 ms** | **128 MB+** | Hardware KVM virtualization |
| **Kubernetes Pod (Container)** | **1,500–8,000 ms** | **50–250 MB** | Linux namespaces + cgroups |

Instead of booting a whole container or OS kernel per tenant, a single Worker runtime process hosts thousands of lightweight **V8 Isolates**, eliminating cold-start latency spikes on the critical path.

## 3. Stateful Edge: KV, D1, R2, and Durable Objects

- **Workers KV**: Eventually consistent read-heavy store (~1 ms cached edge read, up to 60s global propagation on write). Ideal for feature flags, routing tables, and auth revocation lists.
- **Durable Objects**: Solving the hardest problem at the edge — **strong consistency**. Each Durable Object instance is globally unique, single-threaded, and backed by transactional local disk storage. All global Workers route requests for a given coordination room (chat room, collaborative doc, rate-limit bucket) to that single active Durable Object instance.
- **R2 Object Storage**: S3-compatible blob store with **zero egress fees**, eliminating the $90/TB cloud egress tax when paired with CDN caching.

## 4. Zero-Trust Edge Security: WAF, Bot Management & Cloudflare Tunnel

- **Cloudflare WAF & DDoS Protection**: Absorbs L3/L4 SYN floods via Anycast dispersion and blocks L7 HTTP/2 Rapid Reset, SQLi, XSS, and credential stuffing before packets ever leave the edge PoP.
- **Cloudflare Tunnel (\`cloudflared\`)**: Runs inside your private VPC or Kubernetes cluster and dials **outbound-only** QUIC/HTTP2 connections to the nearest Cloudflare PoPs. Your origin closes all inbound firewall ports (no public IP, no port 443 open to the internet), neutralizing direct-to-origin DDoS bypass attacks.`,
    tradeOffs: [
      { dimension: "Edge KV vs Durable Objects", optionA: "Workers KV (AP eventual)", optionB: "Durable Objects (CP single-leader)", recommendation: "KV for global high-read config; Durable Objects for real-time coordination, locks, and rate limits." },
      { dimension: "Public Origin vs Cloudflare Tunnel", optionA: "Public ALB IP + IP allowlist", optionB: "Outbound-only cloudflared Tunnel", recommendation: "Cloudflare Tunnel so origin has zero public inbound ports." },
    ],
    whenToUse: [
      "Global APIs needing sub-30ms response times via edge caching and V8 Isolates",
      "Collaborative real-time state (WebSockets, multiplayer rooms, distributed rate limiters) via Durable Objects",
      "Eliminating S3/CloudFront egress bills with R2 and Tiered Cache",
    ],
    whenNotToUse: [
      "Long-running CPU-bound batch jobs, video transcoding, or GPU LLM training (use regional compute/GPUs)",
    ],
    scalingNotes: "Enable Tiered Cache + Smart Routing first so edge PoP expansion never amplifies origin miss storms.",
    relatedModuleIds: ["load-balancing", "caching-strategies", "rate-limiting"],
    interactiveVisual: "token_bucket",
    flashcards: [
      { cardId: "cf-edge-1", front: "Why do Cloudflare Workers have ~1-5ms cold starts compared to 200ms+ for container serverless?", back: "Workers multiplex lightweight V8 Isolates inside an already-running process (~3MB overhead) instead of booting a new OS container or microVM per tenant.", conceptTag: "cloudflare-edge-architecture", moduleId: "cloudflare-edge-architecture" },
      { cardId: "cf-edge-2", front: "How do Durable Objects provide strong consistency across a 330-city Anycast edge?", back: "Each named Durable Object is a globally unique, single-threaded actor pinned to one point on earth with transactional local storage; all edge PoPs route messages for that ID to it.", conceptTag: "cloudflare-edge-architecture", moduleId: "cloudflare-edge-architecture" },
    ],
    quiz: [
      {
        id: "cf-edge-q1",
        prompt: "You deploy a global presence & collaborative cursor system on Cloudflare. Which primitive guarantees linearizable ordering per document room without race conditions?",
        options: [
          { id: "a", text: "Durable Objects (one single-threaded actor instance per document room with WebSocket hibernation)", correct: true },
          { id: "b", text: "Workers KV (eventual consistency with 60s global propagation)", correct: false },
          { id: "c", text: "Long-TTL CDN static cache", correct: false },
        ],
        explanation: "Durable Objects serialize all requests for a given ID through a single globally coordinated instance.",
        conceptTag: "cloudflare-edge-architecture",
      },
      {
        id: "cf-edge-q2",
        prompt: "How does Cloudflare Tunnel (cloudflared) prevent attackers from bypassing your WAF by scanning IPv4 space for your origin server?",
        options: [
          { id: "a", text: "The origin has zero open inbound ports; cloudflared establishes outbound-only encrypted QUIC tunnels to the edge", correct: true },
          { id: "b", text: "It changes the origin public IP every hour", correct: false },
          { id: "c", text: "It disables TLS on the origin", correct: false },
        ],
        explanation: "With outbound-only tunnels and zero public ingress rules on the VPC security group, internet scanners cannot connect to the origin.",
        conceptTag: "cloudflare-edge-architecture",
      },
    ],
    keyNumbers: [
      { value: "~1–5 ms", label: "V8 Isolate cold start latency", note: "Roughly 100x faster than booting a container or microVM." },
      { value: "330+ cities", label: "Anycast BGP edge footprint", note: "Places TLS termination within ~15 ms of 95% of internet users." },
      { value: "$0 / GB", label: "Cloudflare R2 egress fee", note: "Eliminates standard $0.09/GB cloud egress charges on media/blob workloads." },
    ],
  },
  {
    id: "kubernetes-architecture-deep-dive",
    title: "Kubernetes Control Plane & eBPF Data Plane",
    difficulty: "advanced",
    estimatedMinutes: 38,
    summary: "Inside Kubernetes: apiserver watch caches, etcd Raft quorums, scheduler filter/score plugins, controller reconciliation loops, Cilium eBPF vs iptables, and Envoy service meshes.",
    bodyMarkdown: `# Kubernetes Control Plane & eBPF Data Plane

Kubernetes is a declarative, level-triggered distributed operating system. Instead of executing imperative scripts ("start 3 servers"), you write a desired state document to **kube-apiserver**, and a fleet of autonomous control loops continuously drives observed cluster state toward desired state.

## 1. Control Plane Anatomy: apiserver, etcd, scheduler, controllers

1. **kube-apiserver**: The stateless front door. Every \`kubectl\`, operator, and \`kubelet\` talks HTTPS (port 6443) to the API server only — nothing else ever touches \`etcd\` directly. Every mutation passes **Authentication -> RBAC Authorization -> Mutating Admission Webhooks -> OpenAPI Schema Validation -> Validating Admission Webhooks -> etcd persistence**.
2. **etcd (Raft Key-Value Store)**: Stores all cluster objects under \`/registry/\`. Uses Raft consensus (N=3 or 5 members; quorum = \`floor(N/2) + 1\`). Because \`fsync\` latency on the Raft write-ahead log bounds every control-plane write, production \`etcd\` requires dedicated low-latency NVMe/SSD IOPS (< 10 ms p99 WAL fsync).
3. **The Watch Cache & Informer Pattern**: If 2,000 kubelets and 30 operators polled \`etcd\` every second, the cluster would melt. Instead, \`kube-apiserver\` maintains an in-memory **Watch Cache** ring buffer fed by a single \`etcd\` watch per resource type, fanning events out over long-lived HTTP/2 streams to client **SharedInformers**.
4. **kube-scheduler**: Watches for Pods with \`spec.nodeName == ""\`. Runs a two-phase pipeline:
   - **Filtering (Predicates)**: Eliminates nodes lacking CPU/memory, violating \`nodeSelector\`, Taints/Tolerations, or Pod Anti-Affinity.
   - **Scoring (Priorities)**: Ranks surviving nodes by image locality, bin-packing vs spreading, and topology spread constraints, then writes a \`Binding\` object back to \`kube-apiserver\`.
5. **kube-controller-manager & Operators**: Runs level-triggered reconciliation loops (\`Reconcile(key)\`): compare desired \`ReplicaSet\` spec against live Pods, and create/delete Pods to close the delta.

## 2. Data Plane & Networking: kube-proxy iptables vs Cilium eBPF

Every Pod gets its own routable IP address (no NAT between Pods). How does a \`ClusterIP\` virtual service IP route to fluctuating Pod IPs?

| Data Plane Mode | Lookup Complexity | Connection Overhead | Observability & Security |
| --- | --- | --- | --- |
| **kube-proxy (iptables)** | **O(N) sequential rule list** | Degrades sharply above 5,000 Services (~ms packet delay) | L3/L4 IP/port rules only |
| **kube-proxy (IPVS)** | **O(1) kernel hash table** | Fast L4 routing, still traverses full netfilter stack | L4 only |
| **Cilium (eBPF CNI)** | **O(1) BPF hash map in socket layer** | Bypasses TCP/IP netfilter stack via \`sockmap\` | Identity-aware L3–L7 NetworkPolicy + Hubble flow traces |

## 3. Ingress, Gateway API & Service Mesh (Envoy Sidecar vs Ambient)

- **Gateway API / Ingress Controller**: Terminates external North-South TLS traffic and routes HTTP/gRPC into cluster Services.
- **Service Mesh (Envoy / Istio / Linkerd)**: Handles East-West Pod-to-Pod traffic, providing automatic **mTLS with SPIFFE identities** (\`spiffe://cluster.local/ns/prod/sa/payments\`), latency-aware load balancing, circuit breaking, retries with per-try timeouts, and golden-signal OTel telemetry.`,
    tradeOffs: [
      { dimension: "CNI Data Plane", optionA: "Cilium eBPF", optionB: "iptables kube-proxy", recommendation: "Cilium eBPF for O(1) service routing, socket-level bypass, and L7 network policies." },
      { dimension: "Service Mesh topology", optionA: "Per-Pod Envoy Sidecar", optionB: "Ambient / Per-Node ztunnel", recommendation: "Ambient mesh to cut sidecar memory overhead by ~60% on large clusters; sidecar for strict per-pod L7 isolation." },
    ],
    whenToUse: [
      "Orchestrating tens to hundreds of microservices with automated bin-packing, self-healing, and declarative GitOps",
      "Enforcing zero-trust East-West mTLS and L7 NetworkPolicies between multi-tenant workloads",
    ],
    whenNotToUse: [
      "Simple 1-3 service CRUD apps with a small team where PaaS or ECS Fargate avoids cluster upgrade and operator overhead",
    ],
    scalingNotes: "Watch apiserver memory (driven by Informer LIST calls across large Secrets/ConfigMaps) and etcd WAL fsync p99 (<10ms). Use Karpenter + KEDA for sub-30s workload scaling.",
    relatedModuleIds: ["raft-consensus", "microservices-monolith", "observability-tracing"],
    interactiveVisual: "raft_election",
    flashcards: [
      { cardId: "k8s-arch-1", front: "Why does Cilium eBPF outperform iptables kube-proxy in clusters with 10,000+ Kubernetes Services?", back: "iptables evaluates rules sequentially in O(N) time per packet; eBPF rewrites destination sockets in O(1) using kernel BPF hash maps, bypassing netfilter.", conceptTag: "kubernetes-architecture-deep-dive", moduleId: "kubernetes-architecture-deep-dive" },
      { cardId: "k8s-arch-2", front: "What happens to running Pods if all 3 etcd nodes lose quorum in a Kubernetes cluster?", back: "Running Pods and data-plane traffic continue serving normally! Only control-plane mutations (scheduling, scaling, deployments) freeze until etcd quorum is restored.", conceptTag: "kubernetes-architecture-deep-dive", moduleId: "kubernetes-architecture-deep-dive" },
    ],
    quiz: [
      {
        id: "k8s-arch-q1",
        prompt: "Which Kubernetes component is the ONLY one permitted to read or write directly to etcd?",
        options: [
          { id: "a", text: "kube-apiserver", correct: true },
          { id: "b", text: "kube-scheduler and kubelet", correct: false },
          { id: "c", text: "CoreDNS and Ingress Controller", correct: false },
        ],
        explanation: "All controllers, schedulers, and kubelets communicate exclusively through kube-apiserver so authn, RBAC, admission webhooks, and watch caching are never bypassed.",
        conceptTag: "kubernetes-architecture-deep-dive",
      },
      {
        id: "k8s-arch-q2",
        prompt: "A staging cluster's kube-apiserver OOMs repeatedly even though request RPS is low. What is the most common culprit?",
        options: [
          { id: "a", text: "Operators performing unpaginated LIST calls on thousands of large Secrets/ConfigMaps, blowing up serialization memory", correct: true },
          { id: "b", text: "CoreDNS caching DNS A records", correct: false },
          { id: "c", text: "Pods sending HTTP traffic to each other over Envoy", correct: false },
        ],
        explanation: "Unfiltered LISTs of large cluster objects force kube-apiserver to deserialize and buffer gigabytes of etcd state per watcher.",
        conceptTag: "kubernetes-architecture-deep-dive",
      },
    ],
    keyNumbers: [
      { value: "< 10 ms", label: "etcd WAL fsync p99 budget", note: "Above 25 ms, Raft leader heartbeats flap and control-plane writes stall." },
      { value: "O(1) vs O(N)", label: "Cilium eBPF BPF map vs iptables service lookup", note: "At 10k Services, iptables adds milliseconds per packet; eBPF stays sub-microsecond." },
      { value: "Port 6443", label: "kube-apiserver HTTPS control-plane port", note: "Never expose without OIDC + RBAC + private endpoint restrictions." },
    ],
  },
  {
    id: "security-zero-trust-architecture",
    title: "Security Architecture, Zero-Trust & STRIDE Threat Modeling",
    difficulty: "advanced",
    estimatedMinutes: 35,
    summary: "Align system design with Zero-Trust security: STRIDE threat modeling, WAF/DDoS absorption, SPIFFE mTLS, OAuth2/OIDC token binding, KMS encryption, and CVE blast-radius containment.",
    bodyMarkdown: `# Security Architecture, Zero-Trust & STRIDE Threat Modeling

Security architecture is not a checklist bolted onto a finished diagram — it is a set of structural invariants that bound the **blast radius** when any single layer (WAF, container runtime, dependency CVE, or credential) is compromised.

## 1. Zero-Trust Architecture (Never Trust, Always Verify)

Castle-and-moat networking assumed that any packet inside the VPC (` + "`10.0.0.0/16`" + `) was trustworthy. **Zero-Trust** assumes the internal network is already hostile:
1. **Perimeter Edge**: Terminate TLS 1.3 at an Anycast WAF (` + "`cloudflare_waf`" + ` / ` + "`web_application_firewall`" + `), enforce L7 rate limits (` + "`rate_limiter`" + `), and connect origins via outbound-only tunnels or mTLS Authenticated Origin Pulls.
2. **North-South Identity**: Authenticate users and API clients at the ` + "`api_gateway`" + ` via ` + "`identity_provider`" + ` (OIDC / OAuth 2.1 PKCE, short-lived 5–15 min JWTs verified via cached JWKS).
3. **East-West Service Identity**: Every service-to-service call uses mutual TLS (**mTLS**) with cryptographic **SPIFFE X.509 SVIDs** rotated hourly by a service mesh (` + "`envoy_mesh`" + ` / ` + "`service_mesh`" + `), plus explicit L7 authorization policies (for example: *only \`checkout-service\` may call \`POST /payments/charge\`*).
4. **Data & Secret Isolation**: Credentials never sit in environment variables or Git; services fetch dynamic, short-lived database leases from ` + "`secrets_manager`" + ` (Vault / AWS Secrets Manager) and encrypt data at rest with KMS envelope keys.

## 2. STRIDE Threat Modeling Mapped to System Primitives

| Threat | What Breaks | Architectural Mitigation on Canvas |
| --- | --- | --- |
| **S — Spoofing** | Attacker forges identity or calls internal microservice directly | ` + "`identity_provider`" + ` (OIDC) at edge + ` + "`envoy_mesh`" + ` SPIFFE mTLS east-west |
| **T — Tampering** | Man-in-the-middle alters payload or poisoning CI/CD image | TLS 1.3 everywhere + Cosign signed images in ` + "`container_registry`" + ` |
| **R — Repudiation** | Actor performs fraudulent transfer or admin action with no trail | Immutable append-only audit stream (` + "`kafka_stream`" + ` / ` + "`loki_logs`" + `) |
| **I — Information Disclosure** | SQLi / SSRF dumps database or steals cloud metadata credentials | ` + "`cloudflare_waf`" + ` + IMDSv2 hop-limit=1 + KMS encryption + ` + "`secrets_manager`" + ` |
| **D — Denial of Service** | HTTP/2 Rapid Reset (` + "`CVE-2023-44487`" + `) or cache-bypass flood | ` + "`cdn_edge`" + ` + ` + "`rate_limiter`" + ` token bucket + circuit breakers + queue leveling |
| **E — Elevation of Privilege** | Container escape (` + "`CVE-2024-21626`" + `) or RCE on Ingress controller | Rootless containers, read-only rootfs, Seccomp, and strict CNI NetworkPolicy |

## 3. Designing for Live CVE Blast-Radius Containment

When a critical 0-day lands (such as **CVE-2025-1974 IngressNightmare** on Kubernetes Ingress-NGINX or **CVE-2024-21626 Leaky Vessels** in \`runc\`), architecture determines whether it is a minor patch or a company-ending breach:
- **Virtual Patching at the Edge WAF**: Managed WAF rules block exploit payloads at the CDN edge within minutes, buying engineering teams hours to roll nodes.
- **Control-Plane / Data-Plane Segmentation**: Never expose admission webhook ports (8443) to untrusted Pod networks (` + "`cni_overlay`" + ` NetworkPolicy default-deny).
- **Egress Filtering**: Block arbitrary outbound connections from compute/DB tiers so reverse shells and supply-chain backdoors (` + "`CVE-2024-3094`" + `) cannot phone home to C2 servers.`,
    tradeOffs: [
      { dimension: "Auth token format", optionA: "Stateless short-lived JWT (5m)", optionB: "Opaque session token in Redis", recommendation: "Short-lived JWT (5m) verified at edge + Redis revocation bloom filter for instant logout." },
      { dimension: "East-West encryption", optionA: "Service Mesh mTLS (SPIFFE)", optionB: "VPC network isolation only", recommendation: "mTLS everywhere for regulated/production tiers to prevent lateral movement." },
    ],
    whenToUse: [
      "Every production system handling user PII, financial transactions, multi-tenant data, or AI prompts",
      "Evaluating how a live CVE (NVD / CISA KEV) impacts your topology's blast radius",
    ],
    whenNotToUse: [
      "Never skip baseline threat modeling — even internal tools need OIDC and network segmentation",
    ],
    scalingNotes: "Offload JWT signature verification (EdDSA/ES256) and WAF regex inspection to the CDN/API Gateway tier using cached JWKS so backend services spend zero CPU on unauthenticated noise.",
    relatedModuleIds: ["cloudflare-edge-architecture", "kubernetes-architecture-deep-dive", "rate-limiting"],
    interactiveVisual: "token_bucket",
    flashcards: [
      { cardId: "sec-zt-1", front: "What do the 6 letters of the STRIDE threat modeling framework stand for?", back: "Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege.", conceptTag: "security-zero-trust-architecture", moduleId: "security-zero-trust-architecture" },
      { cardId: "sec-zt-2", front: "How does Zero-Trust architecture contain lateral movement if an attacker achieves RCE inside one microservice Pod?", back: "Default-deny CNI NetworkPolicies, SPIFFE mTLS L7 authorization (preventing unauthorized east-west calls), IMDSv2 hop-limit=1, and dynamic short-lived DB credentials.", conceptTag: "security-zero-trust-architecture", moduleId: "security-zero-trust-architecture" },
    ],
    quiz: [
      {
        id: "sec-zt-q1",
        prompt: "A critical RCE vulnerability (like CVE-2025-1974) is disclosed in your Kubernetes Ingress Admission Controller. Which architectural control prevents any compromised application Pod from exploiting it?",
        options: [
          { id: "a", text: "Default-deny East-West CNI NetworkPolicy allowing only kube-apiserver to reach the admission webhook port 8443", correct: true },
          { id: "b", text: "Increasing Redis cache TTL to 1 hour", correct: false },
          { id: "c", text: "Adding more read replicas to Postgres", correct: false },
        ],
        explanation: "Admission webhooks should only ever accept connections from kube-apiserver; CNI NetworkPolicies block lateral Pod-to-Webhook exploitation.",
        conceptTag: "security-zero-trust-architecture",
      },
      {
        id: "sec-zt-q2",
        prompt: "How do you achieve both stateless edge JWT performance AND instant session revocation when a user's device is stolen?",
        options: [
          { id: "a", text: "Issue short-lived (5-min) access JWTs paired with rotated refresh tokens and push revoked JTI/session IDs to an edge KV/Bloom filter", correct: true },
          { id: "b", text: "Issue 30-day JWTs with no server state", correct: false },
          { id: "c", text: "Query the primary Postgres database on every static asset request", correct: false },
        ],
        explanation: "Short-lived JWTs bound the window to 5 minutes, while an edge KV/Redis deny-list of revoked token IDs gives immediate revocation without DB hits.",
        conceptTag: "security-zero-trust-architecture",
      },
    ],
    keyNumbers: [
      { value: "5–15 min", label: "Recommended OAuth2/OIDC access JWT TTL", note: "Short lifetime bounds stolen-token exposure; refresh tokens rotate with reuse detection." },
      { value: "6 Threats", label: "STRIDE threat model categories", note: "Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation of Privilege." },
      { value: "< 1 hr", label: "SPIFFE X.509 mTLS certificate rotation", note: "Automated by cert-manager / Spire so static keys never exist on disk." },
    ],
  },
  {
    id: "plugin-extensible-architecture",
    title: "Plugin Architectures, Envoy WASM Filters & K8s Operators",
    difficulty: "advanced",
    estimatedMinutes: 29,
    summary: "Design extensible platforms without forks: Microkernel & Hook pipelines, Envoy Proxy-Wasm filters, Kubernetes CRDs + Operators, and sandboxed WebAssembly plugins.",
    bodyMarkdown: `# Plugin Architectures, Envoy WASM Filters & K8s Operators

Every successful platform — from Kubernetes, Envoy, and Cloudflare Workers to VS Code, Terraform, and SysCraft itself — hits the same inflection point: **how do teams add custom behavior, policies, and integrations without forking the core engine?**

## 1. The Four Canonical Plugin Architecture Patterns

| Pattern | Mechanism | Real-World Examples | Latency & Isolation Trade-off |
| --- | --- | --- | --- |
| **1. In-Process Pipeline / Tap Hooks** | Synchronous interceptor chain (\`beforeRequest -> handler -> afterResponse\`) | Express/Fastify middleware, Design Doctor lint plugins, Webpack taps | **~0.01 ms** overhead; a crash or infinite loop blocks the host unless guarded. |
| **2. Sandboxed Bytecode (WASM / eBPF / V8)** | Untrusted plugin compiled to WebAssembly or eBPF bytecode inside a memory-safe VM | Envoy **Proxy-Wasm** filters, Cilium eBPF programs, Shopify Functions, Cloudflare Workers | **~0.05–0.5 ms**; strong memory & CPU instruction-count sandboxing. |
| **3. Out-of-Process RPC / Webhook Plugins** | Host calls external plugin over gRPC/HTTPS with a strict timeout | Kubernetes **Admission Webhooks**, Terraform Providers, Stripe Webhooks | **2–50 ms** network RTT; full process isolation, but requires circuit breakers & fail-open/closed policy. |
| **4. Declarative CRD + Reconciler Loop** | Users register custom schemas (**CRDs**) and external **Operators** watch & reconcile state | Kubernetes Operators (Argo CD, Cert-Manager, Prometheus Operator) | **Async / eventual**; zero impact on data-plane latency. |

## 2. Envoy Proxy-Wasm & API Gateway Filter Chains

In high-throughput data planes (Envoy, Kong, APISIX), calling an external HTTP microservice for every auth or header transformation adds 5–15 ms of tail latency. **Proxy-Wasm** compiles Rust/Go/C++ plugins into WebAssembly modules loaded directly inside Envoy worker threads:
- Each worker thread instantiates an isolated WASM VM with a deterministic memory ceiling.
- Filters intercept \`onRequestHeaders\`, \`onRequestBody\`, and \`onResponseHeaders\` in microseconds without network hops.

## 3. Kubernetes Webhooks: Fail-Open vs Fail-Closed Trap

When you register a \`ValidatingWebhookConfiguration\` in Kubernetes, \`kube-apiserver\` makes a synchronous HTTPS call to your webhook Pod on every matching resource write:
- If \`failurePolicy: Fail\` (fail-closed) and your webhook Pod crashes — and the webhook also intercepts Pod creations in its own namespace — **the webhook prevents Kubernetes from starting the replacement webhook Pod**, deadlocking the entire cluster!
- **Architectural Rule**: Always exclude \`kube-system\` and the webhook's own namespace via \`namespaceSelector\`, keep webhook p99 < 100 ms, and run >= 3 replicas across AZs.`,
    tradeOffs: [
      { dimension: "WASM In-Proxy vs External Webhook", optionA: "Proxy-Wasm (in-process sandbox)", optionB: "gRPC External Authz service", recommendation: "Proxy-Wasm for sub-millisecond data-plane filters; External gRPC when plugin needs large DB state." },
      { dimension: "Webhook failurePolicy", optionA: "Fail (fail-closed security)", optionB: "Ignore (fail-open availability)", recommendation: "Fail-closed for security policies WITH namespace exemptions for control-plane & webhook namespaces." },
    ],
    whenToUse: [
      "Building extensible SaaS platforms, API gateways, CI/CD pipelines, or architecture linters",
      "Adding custom auth, DLP redaction, or tenant rate-limiting at the Envoy/Gateway layer",
    ],
    whenNotToUse: [
      "Over-abstracting a brand-new product before you have at least 3 concrete plugin use cases",
    ],
    scalingNotes: "Enforce strict CPU instruction fuel limits on WASM/JS plugins and aggressive 100-500ms circuit-breaker timeouts on out-of-process RPC webhooks.",
    relatedModuleIds: ["kubernetes-architecture-deep-dive", "microservices-monolith", "cloudflare-edge-architecture"],
    interactiveVisual: "consistent_hash_ring",
    flashcards: [
      { cardId: "plug-arch-1", front: "How can a Kubernetes ValidatingAdmissionWebhook with failurePolicy: Fail deadlock an entire cluster?", back: "If the webhook Pods crash and the webhook rule intercepts Pod creation in its own namespace, kube-apiserver rejects scheduling the replacement webhook Pods.", conceptTag: "plugin-extensible-architecture", moduleId: "plugin-extensible-architecture" },
      { cardId: "plug-arch-2", front: "Why do modern service meshes use Proxy-Wasm instead of external HTTP sidecars for custom L7 filters?", back: "Proxy-Wasm runs memory-safe WebAssembly inside Envoy worker threads in microseconds, avoiding extra TCP/HTTP serialization hops.", conceptTag: "plugin-extensible-architecture", moduleId: "plugin-extensible-architecture" },
    ],
    quiz: [
      {
        id: "plug-arch-q1",
        prompt: "You want customers to run custom discount-calculation code inside your checkout path in <1ms with zero risk of reading other tenants' memory. Which plugin model fits best?",
        options: [
          { id: "a", text: "Sandboxed WebAssembly (WASM) or V8 Isolate with strict CPU fuel and memory caps", correct: true },
          { id: "b", text: "Running eval() inside your main Node.js process", correct: false },
          { id: "c", text: "Spinning up a fresh EC2 VM per checkout request", correct: false },
        ],
        explanation: "WASM and V8 Isolates provide sub-millisecond startup with deterministic memory sandboxing and CPU instruction limits.",
        conceptTag: "plugin-extensible-architecture",
      },
      {
        id: "plug-arch-q2",
        prompt: "How does the Kubernetes Operator pattern extend the cluster without modifying kube-apiserver's binary?",
        options: [
          { id: "a", text: "By registering a CustomResourceDefinition (CRD) schema and running a controller loop that watches the CRD and reconciles underlying resources", correct: true },
          { id: "b", text: "By recompiling etcd with custom SQL tables", correct: false },
          { id: "c", text: "By SSHing into worker nodes on a cron schedule", correct: false },
        ],
        explanation: "CRDs extend the declarative API schema stored in etcd, and Operators watch those endpoints via standard Informers.",
        conceptTag: "plugin-extensible-architecture",
      },
    ],
    keyNumbers: [
      { value: "< 0.5 ms", label: "Proxy-Wasm in-thread filter overhead", note: "Roughly 20x faster than an out-of-process gRPC call." },
      { value: "100–250 ms", label: "Max safe timeout for synchronous admission webhooks", note: "Longer timeouts stall control-plane or API gateway worker pools." },
      { value: "4 Patterns", label: "In-process hooks, Sandboxed WASM/Isolates, Out-of-process RPC, Declarative CRD/Operator", note: "Choose based on latency budget vs blast-radius isolation." },
    ],
  },
  {
    id: "enterprise-architecture-governance",
    title: "Principal Architect Playbook: ADRs, SLO Math & FinOps",
    difficulty: "advanced",
    estimatedMinutes: 32,
    summary: "Everything a Staff/Principal Architect needs: writing high-leverage ADRs/RFCs, serial vs active-active composite SLA math, error budgets, and cloud FinOps unit economics.",
    bodyMarkdown: `# Principal Architect Playbook: ADRs, SLO Math & FinOps

At Staff, Principal, and Enterprise Architect levels, your output is not just boxes on a whiteboard — it is **defensible trade-off governance**: Architecture Decision Records (ADRs), composite availability arithmetic, error-budget policies, and FinOps unit economics.

## 1. Composite Availability Math: Serial Chains vs Active-Active Parallel

Every synchronous dependency on your critical path **multiplies** availability downward; every independent redundant path increases it:

- **Serial Dependency Chain** ($N$ components in series, all must succeed):
  $$A_{\\text{serial}} = \\prod_{i=1}^{N} A_i$$
  Example: API Gateway ($99.95\\%$) $\\to$ Auth Service ($99.9\\%$) $\\to$ Order Service ($99.9\\%$) $\\to$ Primary DB ($99.95\\%$) = **$99.70\\%$ composite SLA** (2 hours 11 minutes of downtime per month!).
- **Parallel Redundant Tier** ($k$ independent active-active zones or regions where any 1 surviving handles traffic):
  $$A_{\\text{parallel}} = 1 - \\prod_{j=1}^{k} (1 - A_j)$$
  Example: Two independent regions each at $99.9\\%$ availability ($0.1\\%$ failure probability):
  $$A_{\\text{parallel}} = 1 - (0.001 \\times 0.001) = 99.9999\\%$$ ( assuming zero correlated control-plane failure!).

| Target SLA | Allowed Monthly Downtime | Allowed Annual Downtime | Architectural Requirement |
| --- | --- | --- | --- |
| **99.9% (Three Nines)** | **43m 49s** | **8h 45m** | Multi-AZ stateless services + automated DB failover |
| **99.95%** | **21m 55s** | **4h 22m** | Multi-AZ active-active compute + read replicas + async queues |
| **99.99% (Four Nines)** | **4m 23s** | **52m 35s** | Zero-downtime deploys + cellular bulkheads + automated sub-30s failover |
| **99.999% (Five Nines)** | **26.3s** | **5m 15s** | Multi-region active-active + Anycast edge + zero human-in-the-loop recovery |

## 2. Writing High-Leverage Architecture Decision Records (ADRs)

An ADR (in MADR format) is an immutable, 1-2 page record stored in Git (\`docs/adr/0012-use-kafka-outbox.md\`) that captures **why** a decision was made under the constraints known at the time:
1. **Context & Problem Statement**: Concrete scale numbers (RPS, payload size, p99 SLO, team count, budget ceiling).
2. **Considered Options**: Always list at least 2–3 viable designs (including "Do nothing / keep monolith").
3. **Trade-Off Matrix**: Explicit pros, cons, operational burden, and failure modes of each option.
4. **Decision & Consequences**: What we chose, what new risks we accept, and what metric triggers revisiting this ADR.

## 3. Cloud FinOps & Unit Economics

Enterprise architecture fails if a system meets its p99 SLO by burning 10x the margin of the business. Track **Cost per 1 Million Requests** and apply the FinOps hierarchy:
1. **Architectural Elimination**: Cache at the edge (\`cdn_edge\`), use VPC Gateway Endpoints to kill NAT Gateway fees, and move cold blobs to zero-egress storage (\`R2\` / S3 Glacier).
2. **Right-Sizing & Autoscaling**: Size fleets from Little's Law ($L = \\lambda W$) keeping target utilization around 60–70% so Kingman's queuing knee doesn't spike p99 while avoiding 90% idle waste.
3. **Commitment & Spot Discounts**: Run stateless baseline capacity on 1–3 year **Reserved Instances / Savings Plans** (35–55% off) and burst/batch worker pools on **Spot / Preemptible** instances (65–80% off).`,
    tradeOffs: [
      { dimension: "Multi-Region Active-Active vs Multi-AZ", optionA: "Multi-Region Active-Active (99.99%+)", optionB: "Single-Region Multi-AZ (99.95%)", recommendation: "Multi-AZ for 95% of workloads; Multi-Region only when 4+ nines justify 2.2x cost and cross-region data conflict complexity." },
      { dimension: "Compute Purchasing", optionA: "On-Demand (100% price, flexible)", optionB: "Reserved Baseline + Spot Burst", recommendation: "Commit 60% baseline to Savings Plans and burst stateless queues on Spot." },
    ],
    whenToUse: [
      "Leading Staff/Principal architecture reviews, writing RFCs/ADRs, and defending SLA/FinOps budgets",
      "Calculating whether a proposed microservice chain can mathematically meet a customer SLA",
    ],
    whenNotToUse: [
      "Never write 40-page ivory-tower PDFs that nobody reads — keep ADRs under 2 pages in Git next to the code",
    ],
    scalingNotes: "To raise composite SLA without paying for multi-region databases, decouple synchronous chains with durable queues (SQS/Kafka) and serve degraded read paths from CDN/Redis caches.",
    relatedModuleIds: ["observability-tracing", "aws-well-architected", "microservices-monolith"],
    interactiveVisual: "token_bucket",
    flashcards: [
      { cardId: "arch-gov-1", front: "If 4 services are called synchronously in series and each has 99.9% availability, what is the composite availability?", back: "0.999^4 ≈ 99.6% (roughly 2 hours 52 minutes of downtime per month).", conceptTag: "enterprise-architecture-governance", moduleId: "enterprise-architecture-governance" },
      { cardId: "arch-gov-2", front: "How much monthly downtime does a 99.99% (Four Nines) SLA allow?", back: "4 minutes 23 seconds per month (52 minutes 35 seconds per year).", conceptTag: "enterprise-architecture-governance", moduleId: "enterprise-architecture-governance" },
    ],
    quiz: [
      {
        id: "arch-gov-q1",
        prompt: "Your checkout path calls 5 microservices synchronously in series, each with a 99.9% SLA. Your VP of Product promises enterprise customers a 99.95% SLA. What does composite availability math say?",
        options: [
          { id: "a", text: "It is mathematically impossible as wired (0.999^5 ≈ 99.50%); you must decouple non-critical hops asynchronously or raise per-service SLAs", correct: true },
          { id: "b", text: "The composite SLA is the average (99.9%), which is close enough", correct: false },
          { id: "c", text: "Adding a 6th microservice will increase availability", correct: false },
        ],
        explanation: "Serial dependencies multiply availability: 0.999^5 = 99.501%, which burns 3.6 hours/month — 10x worse than 99.95%.",
        conceptTag: "enterprise-architecture-governance",
      },
      {
        id: "arch-gov-q2",
        prompt: "Which FinOps optimization delivers the highest immediate ROI before buying Reserved Instances?",
        options: [
          { id: "a", text: "Architectural elimination: edge caching, VPC endpoints to bypass NAT fees, and right-sizing over-provisioned <15% CPU tiers", correct: true },
          { id: "b", text: "Locking in a 3-year Reserved Instance commitment on an unoptimized, oversized fleet", correct: false },
          { id: "c", text: "Disabling all production logging and backups", correct: false },
        ],
        explanation: "Never commit to 3-year reservations on waste; eliminate architectural egress/NAT tax and right-size first, then reserve baseline compute.",
        conceptTag: "enterprise-architecture-governance",
      },
    ],
    keyNumbers: [
      { value: "4m 23s / mo", label: "99.99% (Four Nines) monthly downtime budget", note: "Requires automated failover; human pager response takes >5 minutes." },
      { value: "43m 49s / mo", label: "99.9% (Three Nines) monthly downtime budget", note: "Standard multi-AZ production target for most business APIs." },
      { value: "38–65%", label: "Reserved + Spot compute FinOps savings", note: "Combine with edge cache offload and VPC endpoints for maximum TCO reduction." },
    ],
  },
];

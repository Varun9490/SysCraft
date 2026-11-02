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
  {
    id: "security-by-design-zero-trust",
    title: "Security by Design & Zero Trust Architecture",
    difficulty: "advanced",
    estimatedMinutes: 28,
    summary: "Secure-by-design principles, zero trust (never trust, always verify), defence in depth, least privilege, trust boundaries, and how to bake security into the system design instead of bolting it on later.",
    bodyMarkdown: `# Security by Design & Zero Trust Architecture

Security is not a feature you add at the end — it is a property of the architecture. Secure-by-design treats the system as hostile from day one: trust boundaries are explicit, every request is authenticated and authorised, and a single control failure does not compromise the whole system.

## Core principles

- **Trust boundaries & threat modelling.** Define where data, identities, and execution contexts cross from a more-trusted to a less-trusted domain. Treat every input as untrusted at the boundary. Model threats (STRIDE) before code is written.
- **Least privilege.** Grant the minimum feasible access for the shortest duration. Apply consistently across users, services, APIs, and admins. Elevate only when needed.
- **Strong identity & authentication.** Authoritative identity sources, MFA, mTLS between services, short-lived tokens, and rotation. Resist credential stuffing, replay, and session hijacking.
- **Attack-surface minimisation.** Remove unused features, default accounts, and non-essential ports. Hardened baselines scale better than ad-hoc hardening.
- **Defence in depth.** Layered preventive, detective, and corrective controls. Diverse controls (not all on the same trust assumption). Degrade gracefully.
- **Open design.** Security rests on protected keys and robust implementation, not on hiding the mechanism.

## Zero trust architecture (ZTA)

Zero trust moves defence from a static network perimeter to per-request decisions over users, devices, services, and data:

1. **Know your architecture** — users, devices, services, data, and the flows between them.
2. **Know identities** — every user, service, and device uniquely identifiable.
3. **Assess health** — user behaviour, device posture, service health as policy signals.
4. **Policy-based authorisation** — every request authorised against policy; the policy engine is the key component.
5. **Authenticate & authorise everywhere** — assume the network is hostile; mTLS + short tokens on every hop.
6. **Monitor users, devices, services** — focus telemetry on identities and resources, not just network segments.
7. **Trust no network** — including your own; secure transport (TLS 1.3) end to end.

## Applying it in a system design

- Put an **identity-aware proxy / API gateway** at every entry point; verify JWT/mTLS before any upstream call.
- **Segment** by blast radius: separate network zones per tier; restrict east-west traffic via service mesh.
- **Encrypt in transit (TLS everywhere) and at rest** (KMS-managed keys, envelope encryption).
- **Audit log** every access decision with identity, resource, policy, and outcome.
- **Rotate secrets** via a secrets manager; never bake credentials into images.
- **Scan** dependencies (SBOM, SCA) and images (CVE scanning) in CI.

## Trade-offs

| Dimension | Perimeter model | Zero trust | Recommendation |
| --- | --- | --- | --- |
| Complexity | Low initially | Higher (identity + policy infra) | Zero trust for anything internet-facing or multi-tenant |
| Latency | Low (single chokepoint) | +1-3ms per hop for auth | Acceptable; cache auth decisions at the gateway |
| Failure mode | Breach = full lateral movement | Breach = single resource | Zero trust limits blast radius |

## When to use

- Any internet-facing or multi-tenant system
- Regulated data (PII, PCI, HIPAA, CUI)
- Microservice architectures with east-west traffic
- Systems with third-party or partner access

## When not to use

- Single-tenant, air-gapped, low-risk internal tools (still apply least privilege + MFA)
- Legacy monoliths where retrofitting identity is impractical (use a strangler pattern)

## Scaling notes

Security scales with automation: policy-as-code (OPA/Rego), IaC scanning (Checkov/tfsec), runtime admission control (OPA Gatekeeper/Kyverno), and continuous posture management. Manual security reviews do not scale past a few services.
`,
    tradeOffs: [
      { dimension: "Perimeter vs zero trust", optionA: "Network firewall perimeter", optionB: "Identity-aware per-request policy", recommendation: "Zero trust for internet-facing/multi-tenant; perimeter + least privilege for internal-only." },
      { dimension: "Auth granularity", optionA: "Coarse roles", optionB: "Fine-grained ABAC/RBAC per resource", recommendation: "Coarse roles to start; ABAC once you have >5 resource types." },
    ],
    whenToUse: ["Internet-facing services", "Multi-tenant SaaS", "Regulated data (PII/PCI/HIPAA)", "Microservice east-west traffic"],
    whenNotToUse: ["Air-gapped single-tenant internal tools", "Legacy monoliths without identity retrofit (strangler first)"],
    scalingNotes: "Automate with policy-as-code, IaC scanning, admission control, and continuous posture management.",
    relatedModuleIds: ["microservices-monolith", "llm-systems"],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "sbd-zt-1", front: "What is a trust boundary?", back: "A point where data, identity, or execution context crosses from a more-trusted to a less-trusted domain; inputs must be treated as untrusted there.", conceptTag: "security-by-design-zero-trust", moduleId: "security-by-design-zero-trust" },
      { cardId: "sbd-zt-2", front: "Zero trust's three core tenets?", back: "Never trust, always verify; assume breach; verify explicitly — per-request auth over users, devices, services, and data.", conceptTag: "security-by-design-zero-trust", moduleId: "security-by-design-zero-trust" },
    ],
    quiz: [
      {
        id: "sbd-zt-q1",
        prompt: "Which control most directly limits blast radius after a single service is compromised?",
        options: [
          { id: "a", text: "Zero-trust segmentation + least-privilege service accounts so the compromised service can only reach what it needs", correct: true },
          { id: "b", text: "A single shared admin password stored in code", correct: false },
          { id: "c", text: "Disabling all logging to reduce attack surface", correct: false },
        ],
        explanation: "Least privilege + segmentation contain compromise to one service; shared creds and disabled logging make breaches worse.",
        conceptTag: "security-by-design-zero-trust",
      },
      {
        id: "sbd-zt-q2",
        prompt: "In zero trust, where does authorisation happen?",
        options: [
          { id: "a", text: "On every request, via a policy engine using identity + device health + context signals", correct: true },
          { id: "b", text: "Once at login, then trust the session forever", correct: false },
          { id: "c", text: "Only at the network firewall", correct: false },
        ],
        explanation: "Zero trust re-evaluates every request; session-only or network-only auth is the perimeter model it replaces.",
        conceptTag: "security-by-design-zero-trust",
      },
    ],
    keyNumbers: [
      { value: "1-3 ms", label: "Auth overhead per hop (JWT/mTLS)", note: "Cache auth decisions at the gateway to keep p99 flat." },
      { value: "TLS 1.3", label: "Minimum transport protocol", note: "0-RTT resumption; mandatory for zero trust east-west traffic." },
      { value: "90 days", label: "Typical secret rotation cadence", note: "Automate via secrets manager; manual rotation drifts." },
    ],
  },
  {
    id: "ai-inference-serving-2026",
    title: "AI Inference Serving at Scale (2026)",
    difficulty: "advanced",
    estimatedMinutes: 30,
    summary: "Modern LLM serving: PagedAttention, continuous batching, prefill/decode disaggregation, KV-cache hierarchies, MoE routing, speculative decoding, and multimodal encoders — the inference factory.",
    bodyMarkdown: `# AI Inference Serving at Scale (2026)

The serving unit is no longer one process behind an HTTP endpoint. It is a topology of encoder, prefill, and decode workers, tensor/expert-parallel groups, KV-cache tiers, request routers, and policy gateways. "The model" is only one piece; the real system is an inference factory.

## Core mechanisms

- **PagedAttention.** KV cache stored in non-contiguous pages (like OS virtual memory) eliminates fragmentation and enables sharing across requests with common prefixes.
- **Continuous batching.** New requests join an in-flight batch at token boundaries instead of waiting for the whole batch to finish — keeps GPUs saturated.
- **Prefill/decode disaggregation.** Prefill is compute-bound (long prompt, one pass); decode is memory-bandwidth-bound (one token at a time). Splitting them onto separate GPU pools cuts cost 25-40% on RAG/chat traffic.
- **KV-cache hierarchy.** Hot pages in HBM, warm in host RAM, cold on local SSD/remote store. Treat KV cache as shared infrastructure, not ephemeral GPU state. Cache-aware routing sends requests to the replica that already holds the prefix.
- **MoE routing.** Mixture-of-experts activates a subset of experts per token (e.g. 16 of 896), so a 2.8T-param model runs like a much smaller one. Requires expert parallelism + load balancing.
- **Speculative decoding.** A small draft model proposes tokens; the big model verifies in parallel — 2-3x throughput on decode-heavy traffic.
- **Hybrid/linear attention (KDA).** Linear-attention layers keep a fixed-size recurrent state instead of a growing KV cache, making 1M-token context affordable; periodic full-attention layers preserve exact global recall.

## Multimodal & agentic serving

Inputs are no longer just token IDs — they include images, audio, tool schemas, retrieval context. Multimodal adds an **encode stage** (ViT pass) before prefill, plus an **encoder cache** (keyed by media hash) that can skip the ViT pass entirely. Agentic workloads amplify prefix reuse across turns and tool traces, and need structured-decoding constraints in the hot path.

## Capacity planning

- Size GPU memory as: weights (FP8/FP4) + KV cache (pages * bytes/token * seq_len * batch) + activations.
- Prefill throughput ≈ FLOPs/s / (2 * params * prompt_tokens). Decode throughput ≈ memory_bandwidth / (params * bytes).
- For long-context RAG: prefill dominates; disaggregate and cache prefixes aggressively.
- For chat: decode dominates; speculative decoding + continuous batching.

## Trade-offs

| Dimension | Monolithic serving | Disaggregated | Recommendation |
| --- | --- | --- | --- |
| Complexity | Low | High (routing, transfer, failure modes) | Disaggregate once fleet > ~8 GPUs or p99 variance hurts |
| Cost | Baseline | -25 to -40% on RAG/chat | Worth it at scale |
| Latency | Single queue | Prefill and decode scale independently | Better tail latency under mixed load |

## When to use

- Any LLM-backed product with >100 RPS
- Long-context RAG (>8k tokens prompt)
- Agentic workflows with tool traces
- Multimodal (vision/audio) inputs

## When not to use

- Single-GPU, low-traffic prototypes (vLLM default is fine)
- Batch offline inference (use simpler throughput-optimised paths)

## Scaling notes

Scale encoder/prefill/decode independently; add KV-cache tiers (HBM -> RAM -> SSD -> remote) as context grows; use cache-aware routing; monitor TTFT, ITL, and goodput (not just tokens/s).
`,
    tradeOffs: [
      { dimension: "Monolithic vs disaggregated", optionA: "One process, one queue", optionB: "Separate prefill/decode workers", recommendation: "Disaggregate once fleet > ~8 GPUs or p99 variance hurts." },
      { dimension: "KV cache placement", optionA: "GPU-only", optionB: "Hierarchical HBM/RAM/SSD/remote", recommendation: "Hierarchical once context > 32k tokens or agentic reuse is high." },
    ],
    whenToUse: ["LLM products >100 RPS", "Long-context RAG", "Agentic tool loops", "Multimodal inputs"],
    whenNotToUse: ["Single-GPU prototypes", "Offline batch inference"],
    scalingNotes: "Scale encoder/prefill/decode independently; add KV tiers as context grows; monitor TTFT/ITL/goodput.",
    relatedModuleIds: ["llm-systems", "vector-search"],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "ai-inf-1", front: "What does PagedAttention solve?", back: "KV-cache fragmentation and sharing: pages are non-contiguous and shareable across requests with common prefixes, like OS virtual memory.", conceptTag: "ai-inference-serving-2026", moduleId: "ai-inference-serving-2026" },
      { cardId: "ai-inf-2", front: "Why disaggregate prefill and decode?", back: "Prefill is compute-bound, decode is memory-bandwidth-bound; splitting them cuts cost 25-40% and improves tail latency under mixed load.", conceptTag: "ai-inference-serving-2026", moduleId: "ai-inference-serving-2026" },
    ],
    quiz: [
      {
        id: "ai-inf-q1",
        prompt: "Which optimisation most directly reduces cost on a RAG workload with 16k-token prompts and short answers?",
        options: [
          { id: "a", text: "Prefill/decode disaggregation + prefix caching of the shared document context", correct: true },
          { id: "b", text: "Increasing batch size on a single monolithic instance", correct: false },
          { id: "c", text: "Speculative decoding alone", correct: false },
        ],
        explanation: "Long prompts are prefill-bound; disaggregation + prefix cache reuse of shared docs cuts prefill cost most.",
        conceptTag: "ai-inference-serving-2026",
      },
      {
        id: "ai-inf-q2",
        prompt: "In a multimodal request, which cache can skip the entire ViT encode pass?",
        options: [
          { id: "a", text: "The encoder cache, keyed by media hash", correct: true },
          { id: "b", text: "The KV cache alone", correct: false },
          { id: "c", text: "The prompt cache only", correct: false },
        ],
        explanation: "The encoder cache holds output embeddings keyed by media hash, so a hit skips the ViT pass regardless of text.",
        conceptTag: "ai-inference-serving-2026",
      },
    ],
    keyNumbers: [
      { value: "25-40%", label: "Cost reduction from P/D disaggregation", note: "On chat- and RAG-shaped traffic vs monolithic." },
      { value: "2-3x", label: "Speculative decoding throughput gain", note: "Decode-heavy traffic with a good draft model." },
      { value: "1M tokens", label: "Kimi K3 context window", note: "Linear attention (KDA) keeps state constant-size." },
    ],
  },
  {
    id: "ai-agents-rag-architecture",
    title: "AI Agents, RAG & Knowledge Architecture",
    difficulty: "advanced",
    estimatedMinutes: 26,
    summary: "Retrieval-augmented generation, cache-augmented (CAG) knowledge, hybrid retrieval, agentic tool loops, MCP/A2A protocols, context discipline (CDAD), and how to build AI systems that stay accurate and cheap at scale.",
    bodyMarkdown: `# AI Agents, RAG & Knowledge Architecture

Scaled AI platforms are multi-plane systems: model-adaptation, distributed inference, KV-cache/memory, knowledge, agentic execution, security/policy, observability, and value-governance. The most successful designs separate these concerns so they scale, fail, and are governed independently.

## Retrieval vs cache-augmented knowledge

- **RAG** (retrieval-augmented generation): retrieve relevant external documents at query time. Best for unbounded or frequently changing corpora.
- **CAG / prompt-cached context**: pre-compute or cache context. Best for bounded, stable, frequently reused "golden knowledge".
- **Hybrid**: RAG for volatile/large corpora; CAG/prompt-caching for stable, hot knowledge. Long context windows do not remove the need for context discipline.

| Dimension | RAG | CAG / prompt-cached |
| --- | --- | --- |
| Corpus volatility | Changing data | Stable data |
| Corpus size | Very large | Bounded by context/cache |
| Latency | Retrieval + prefill | Lower with cache reuse |
| Complexity | Higher (indexing, reranking) | Lower if stable |
| Refresh | Incremental index updates | Cache rebuild/invalidation |

## Retrieval pipeline (production)

1. **Ingestion**: extract text/tables/charts/images/audio/video; chunk with overlap; enrich metadata.
2. **Indexing**: dense embeddings + sparse (BM25) for hybrid retrieval; GPU-accelerated indexing.
3. **Retrieval**: hybrid dense+sparse, reranking, multi-collection search, metadata filtering.
4. **Generation**: grounded answer with citations; guardrails for safety.

## Agentic execution

Agents are goal-directed loops: plan -> tool call -> observe -> repeat. Key engineering concerns:

- **Context discipline (CDAD)**: durable knowledge lives outside the active prompt; build a minimal task packet per step; compact traces after each tool boundary. More context != better answers.
- **Tool protocols**: MCP (Model Context Protocol) connects agents to tools/data; A2A connects agent-to-agent. Both now governed by a neutral foundation.
- **Durability**: long-running tasks must survive crashes — use a durable execution engine (Temporal/Restate) underneath.
- **Verification**: AI increases throughput but also verification pressure; weak platforms become unstable. Add evals (RAGAS), guardrails, and human-in-the-loop for high-stakes actions.

## Security & governance plane

- Policy engine (OPA) gates tool calls and data access.
- Sandboxed tool execution; least-privilege service accounts.
- PII redaction, prompt-injection defences, output filtering.
- OpenTelemetry GenAI conventions for traces; cost/latency/quality dashboards.

## Trade-offs

| Dimension | Single-shot LLM | Agentic RAG | Recommendation |
| --- | --- | --- | --- |
| Accuracy on fresh data | Poor (stale weights) | High (live retrieval) | RAG for any factual/enterprise data |
| Cost | Low | Higher (retrieval + multi-step) | Cache hot knowledge; limit agent steps |
| Latency | Low | Higher (tool round-trips) | Stream; parallelise independent tool calls |
| Risk | Hallucination | Tool misuse, runaway loops | Guardrails, step limits, human approval |

## When to use

- Enterprise search / knowledge assistants / copilots
- Any task needing current or proprietary data
- Multi-step workflows (research, coding, ops)

## When not to use

- Pure creative generation with no factual grounding
- Latency-critical paths where a single fast call suffices

## Scaling notes

Scale retrieval (vector DB sharding, GPU indexing), inference (P/D disaggregation), and the agent loop (durable execution) independently. Treat KV cache and the vector index as shared infrastructure. Monitor accuracy (RAGAS), cost per query, and p99 latency.
`,
    tradeOffs: [
      { dimension: "Single-shot vs agentic", optionA: "One LLM call", optionB: "Multi-step tool loop", recommendation: "Agentic for tasks needing tools/data; single-shot for latency-critical generation." },
      { dimension: "RAG vs CAG", optionA: "Retrieve at query time", optionB: "Pre-cached context", recommendation: "Hybrid: RAG for volatile/large, CAG for stable/hot." },
    ],
    whenToUse: ["Enterprise search", "Knowledge assistants/copilots", "Multi-step workflows", "Current/proprietary data"],
    whenNotToUse: ["Pure creative generation", "Ultra-low-latency single calls"],
    scalingNotes: "Scale retrieval, inference, and agent loop independently; monitor accuracy/cost/p99.",
    relatedModuleIds: ["llm-systems", "vector-search"],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "ai-rag-1", front: "When is CAG better than RAG?", back: "When the corpus is bounded, stable, and reused frequently — pre-cached context lowers latency and cost.", conceptTag: "ai-agents-rag-architecture", moduleId: "ai-agents-rag-architecture" },
      { cardId: "ai-rag-2", front: "What is CDAD?", back: "Context Discipline for Agentic Design: keep durable knowledge outside the active prompt, build a minimal task packet per step, compact traces after each tool boundary.", conceptTag: "ai-agents-rag-architecture", moduleId: "ai-agents-rag-architecture" },
    ],
    quiz: [
      {
        id: "ai-rag-q1",
        prompt: "Which knowledge strategy fits a 50k-doc corpus that changes daily?",
        options: [
          { id: "a", text: "RAG with incremental index updates", correct: true },
          { id: "b", text: "CAG with a single cached prompt", correct: false },
          { id: "c", text: "Stuffing everything into the context window", correct: false },
        ],
        explanation: "Volatile, large corpora need RAG; CAG is for stable/bounded knowledge.",
        conceptTag: "ai-agents-rag-architecture",
      },
      {
        id: "ai-rag-q2",
        prompt: "What is the main risk of carrying the full conversation history in every agent step?",
        options: [
          { id: "a", text: "Context bloat degrades attention quality and inflates cost; compact after each tool boundary", correct: true },
          { id: "b", text: "It always improves accuracy", correct: false },
          { id: "c", text: "It has no effect", correct: false },
        ],
        explanation: "Long context hurts attention and cost; CDAD compacts traces after each tool boundary.",
        conceptTag: "ai-agents-rag-architecture",
      },
    ],
    keyNumbers: [
      { value: "50k+ docs", label: "RAG sweet spot", note: "Hybrid retrieval + reranking keeps precision high." },
      { value: "8k tokens", label: "Context discipline target", note: "Minimal task packet; compact traces per step." },
      { value: "MCP / A2A", label: "Agent protocols (2026)", note: "MCP for tools/data, A2A for agent-to-agent." },
    ],
  },
  {
    id: "llm-architecture-transformers",
    title: "LLM Architecture: Transformers & Attention",
    difficulty: "advanced",
    estimatedMinutes: 24,
    summary: "How transformers work: self-attention, multi-head attention, positional encoding, feed-forward layers, and why the architecture scales to trillion-parameter models.",
    bodyMarkdown: `# LLM Architecture: Transformers & Attention

The transformer is the foundation of every modern LLM. It replaced recurrence (RNNs/LSTMs) with attention, enabling parallel training and scaling to trillion-parameter models.

## Core components

- **Token embedding + positional encoding.** Converts token IDs to vectors; positional encoding injects sequence order (sinusoidal or learned RoPE).
- **Multi-head self-attention.** Each token attends to all others, computing Q/K/V projections. Multiple heads capture different relation types (syntax, coreference, etc.).
- **Feed-forward network (FFN).** Per-token MLP (usually 4x hidden dim). In MoE models, this becomes a router + expert subset.
- **Layer norm + residual connections.** Stabilise deep training; residuals let gradients flow.
- **Stack N layers.** Each layer refines representations; deeper = more abstract reasoning.

## Attention variants

- **MHA (multi-head attention):** full K/V per head — memory-heavy at scale.
- **GQA (grouped-query attention):** share K/V across heads — cuts KV cache 4-8x with minimal quality loss (LLaMA-2/3, Mistral).
- **MLA (multi-head latent attention):** compress K/V into a low-rank latent — extreme compression (DeepSeek).
- **Linear attention (KDA/Mamba):** O(n) instead of O(n^2); constant-size state; enables 1M-token context.

## Training at scale

- **Pre-training:** next-token prediction on trillions of tokens; compute = 6 * params * tokens (FLOPs).
- **Scaling laws:** loss decreases predictably with compute, data, and params (Chinchilla: ~20 tokens/param optimal).
- **Alignment:** SFT + RLHF/DPO to follow instructions and reduce harm.
- **Quantization:** FP8/FP4/INT4 weights cut memory 2-4x with small quality loss.

## System design implications

- **Memory:** weights (params * bytes) + KV cache (seq_len * layers * heads * dim * bytes) + activations. A 70B model at FP16 = 140 GB; at FP8 = 70 GB.
- **Compute:** training needs thousands of GPUs for weeks; inference needs 1-8 GPUs per replica.
- **Latency:** TTFT = prefill time (compute-bound); ITL = decode time (memory-bandwidth-bound).
- **Throughput:** tokens/s = memory_bandwidth / (params * bytes_per_param) for decode.

## Trade-offs

| Dimension | Dense attention | Sparse/MoE | Recommendation |
| --- | --- | --- | --- |
| Quality per param | High | Higher (more params, same compute) | MoE for large models; dense for small/edge |
| Memory | Linear in params | Same (all experts stored) | Quantize (FP8/INT4) to fit |
| Routing overhead | None | Router + load balancing | Use proven MoE (Mixtral, DeepSeek) |

## When to use

- Any LLM-based product
- Understanding model limits (context, latency, cost)
- Capacity planning for inference

## When not to use

- You don't need to know internals for simple API consumption
- Edge/mobile (use small distilled models)

## Scaling notes

Scale via tensor/pipeline/expert parallelism; quantize weights; use KV-cache compression (GQA/MLA); monitor TTFT/ITL/goodput.
`,
    tradeOffs: [
      { dimension: "MHA vs GQA", optionA: "Full K/V per head (higher quality)", optionB: "Shared K/V (4-8x smaller KV cache)", recommendation: "GQA for production; MHA only for research/small models." },
      { dimension: "Dense vs MoE", optionA: "All params active", optionB: "Subset active (more params, same compute)", recommendation: "MoE for >30B params; dense for edge/small." },
    ],
    whenToUse: ["LLM products", "Capacity planning", "Model selection"],
    whenNotToUse: ["Simple API consumption", "Edge/mobile (use distilled)"],
    scalingNotes: "Scale via TP/PP/EP; quantize; compress KV cache; monitor TTFT/ITL.",
    relatedModuleIds: ["llm-systems", "ai-inference-serving-2026"],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "llm-arch-1", front: "What does GQA (grouped-query attention) reduce?", back: "KV cache size by 4-8x by sharing K/V across heads, with minimal quality loss.", conceptTag: "llm-architecture-transformers", moduleId: "llm-architecture-transformers" },
      { cardId: "llm-arch-2", front: "Chinchilla scaling law (tokens per param)?", back: "Roughly 20 tokens per parameter is compute-optimal for training.", conceptTag: "llm-architecture-transformers", moduleId: "llm-architecture-transformers" },
    ],
    quiz: [
      {
        id: "llm-arch-q1",
        prompt: "Which attention variant most reduces KV-cache memory at scale?",
        options: [
          { id: "a", text: "MLA (multi-head latent attention) — compresses K/V into a low-rank latent", correct: true },
          { id: "b", text: "MHA (multi-head attention) — full K/V per head", correct: false },
          { id: "c", text: "Increasing the number of heads", correct: false },
        ],
        explanation: "MLA (DeepSeek) compresses K/V into a latent vector, achieving extreme compression vs MHA/GQA.",
        conceptTag: "llm-architecture-transformers",
      },
      {
        id: "llm-arch-q2",
        prompt: "For a 70B model at FP16, approximate weight memory?",
        options: [
          { id: "a", text: "140 GB", correct: true },
          { id: "b", text: "70 GB", correct: false },
          { id: "c", text: "14 GB", correct: false },
        ],
        explanation: "70B params * 2 bytes (FP16) = 140 GB. FP8 halves it to 70 GB.",
        conceptTag: "llm-architecture-transformers",
      },
    ],
    keyNumbers: [
      { value: "2 bytes", label: "FP16 per param", note: "FP8 = 1 byte; INT4 = 0.5 byte." },
      { value: "4x", label: "FFN expansion ratio", note: "Hidden dim * 4 in standard transformer FFN." },
      { value: "20:1", label: "Chinchilla tokens:param ratio", note: "Compute-optimal training data size." },
    ],
  },
  {
    id: "ai-safety-guardrails-evals",
    title: "AI Safety, Guardrails & Evaluation",
    difficulty: "advanced",
    estimatedMinutes: 22,
    summary: "How to keep AI systems safe and accurate: guardrails, prompt-injection defence, PII redaction, evals (RAGAS), human-in-the-loop, and continuous quality monitoring.",
    bodyMarkdown: `# AI Safety, Guardrails & Evaluation

Shipping an LLM feature is easy; keeping it safe and accurate in production is the hard part. AI safety is a system property, not a model property — it spans input, model, output, and the surrounding platform.

## Threat model

- **Prompt injection.** Malicious content in retrieved docs or user input overrides instructions. Defence: separate trusted (system) from untrusted (user/retrieved) channels; validate tool calls; sandbox execution.
- **Hallucination.** Model invents facts. Defence: ground answers in retrieved sources with citations; RAG; reduce temperature; require evidence.
- **Data leakage.** PII/secrets in prompts or outputs. Defence: PII redaction in input/output; least-privilege data access; audit logs.
- **Jailbreaks.** Users bypass safety filters. Defence: layered guardrails (input classifier, output filter, policy engine); red-team continuously.
- **Runaway agents.** Tool loops consume resources or take harmful actions. Defence: step limits, budget caps, human approval for high-stakes actions.

## Guardrail layers

1. **Input guardrails:** PII redaction, toxicity classifier, prompt-injection detector, rate limiting.
2. **Model guardrails:** system prompt hardening, tool allow-lists, structured output (JSON schema), temperature/top-p tuning.
3. **Output guardrails:** factuality check vs retrieved sources, toxicity filter, PII scan, format validation.
4. **Policy engine (OPA/Rego):** gate tool calls and data access based on user/role/context.
5. **Sandboxed execution:** run tool code in isolated containers with resource limits.

## Evaluation (evals)

- **Offline evals:** golden datasets, RAGAS (faithfulness, answer relevance, context precision/recall), LLM-as-judge.
- **Online evals:** A/B tests, user feedback (thumbs up/down), implicit signals (regeneration rate, session length).
- **Continuous:** re-run evals on every model/prompt change; track regressions; alert on metric drops.
- **Red-teaming:** adversarial prompts; jailbreak attempts; bias/fairness probes.

## Human-in-the-loop

- Require approval for high-stakes actions (payments, deletions, external comms).
- Escalate low-confidence answers to humans.
- Log all decisions for audit and improvement.

## Trade-offs

| Dimension | Strict guardrails | Loose guardrails | Recommendation |
| --- | --- | --- | --- |
| Safety | High | Lower | Strict for regulated/PII; loose for creative |
| Latency | +50-200ms per guardrail | Low | Cache guardrail results; parallelise |
| False positives | Higher | Lower | Tune thresholds; monitor override rate |

## When to use

- Any user-facing LLM feature
- Regulated domains (healthcare, finance, legal)
- Agentic systems with tool access
- Multi-tenant platforms

## When not to use

- Internal prototypes (still add basic PII redaction)
- Fully offline, non-user-facing batch jobs

## Scaling notes

Scale guardrails as separate services (input/output classifiers); cache results; use async eval pipelines; monitor cost per query and quality metrics (faithfulness, relevance) alongside latency.
`,
    tradeOffs: [
      { dimension: "Strict vs loose guardrails", optionA: "Block aggressively (safer, more false positives)", optionB: "Allow with monitoring (faster, riskier)", recommendation: "Strict for regulated/PII; tune thresholds with real traffic." },
      { dimension: "Offline vs online evals", optionA: "Golden datasets (reproducible)", optionB: "Live user feedback (realistic)", recommendation: "Both: offline for CI, online for production truth." },
    ],
    whenToUse: ["User-facing LLM features", "Regulated domains", "Agentic tool access", "Multi-tenant"],
    whenNotToUse: ["Internal prototypes (basic PII redaction still)", "Offline batch jobs"],
    scalingNotes: "Scale guardrails as services; cache; async evals; monitor quality + cost + latency.",
    relatedModuleIds: ["ai-agents-rag-architecture", "ai-inference-serving-2026"],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "ai-safe-1", front: "What is prompt injection?", back: "Malicious content in user input or retrieved docs that overrides the model's instructions.", conceptTag: "ai-safety-guardrails-evals", moduleId: "ai-safety-guardrails-evals" },
      { cardId: "ai-safe-2", front: "What does RAGAS measure?", back: "Faithfulness, answer relevance, context precision, and context recall for RAG systems.", conceptTag: "ai-safety-guardrails-evals", moduleId: "ai-safety-guardrails-evals" },
    ],
    quiz: [
      {
        id: "ai-safe-q1",
        prompt: "Which defence most directly prevents a retrieved document from hijacking the model's instructions?",
        options: [
          { id: "a", text: "Separate trusted (system) from untrusted (retrieved) channels; validate all tool calls", correct: true },
          { id: "b", text: "Increase model temperature", correct: false },
          { id: "c", text: "Disable all logging", correct: false },
        ],
        explanation: "Channel separation + tool-call validation prevents prompt injection from retrieved content.",
        conceptTag: "ai-safety-guardrails-evals",
      },
      {
        id: "ai-safe-q2",
        prompt: "When should a human approve an agent action?",
        options: [
          { id: "a", text: "For high-stakes actions (payments, deletions, external comms) and low-confidence answers", correct: true },
          { id: "b", text: "Never — fully autonomous is always better", correct: false },
          { id: "c", text: "Only on the first request ever", correct: false },
        ],
        explanation: "Human-in-the-loop for high-stakes and low-confidence; fully autonomous risks runaway harm.",
        conceptTag: "ai-safety-guardrails-evals",
      },
    ],
    keyNumbers: [
      { value: "50-200 ms", label: "Guardrail latency overhead", note: "Cache results; parallelise layers." },
      { value: "4 metrics", label: "RAGAS core metrics", note: "Faithfulness, answer relevance, context precision/recall." },
      { value: "5 layers", label: "Guardrail stack", note: "Input, model, output, policy, sandbox." },
    ],
  },
  {
    id: "prompt-engineering-context-management",
    title: "Prompt Engineering & Context Management",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    summary: "How to craft effective prompts: system vs user messages, few-shot examples, chain-of-thought, structured output (JSON schema), context window management, and prompt versioning.",
    bodyMarkdown: `# Prompt Engineering & Context Management

The prompt is the program. In 2026, prompt engineering is less about clever wording and more about structured context assembly: system instructions, few-shot examples, retrieved context, conversation history, and the user query — all packed into a finite token budget.

## Prompt structure

- **System message:** role, constraints, output format, safety rules. Keep it stable and versioned.
- **Few-shot examples:** 2-5 input/output pairs that demonstrate the desired behaviour. More examples = better adherence but more tokens.
- **Retrieved context (RAG):** document chunks with source citations. Place near the query.
- **Conversation history:** recent turns; summarise older turns to save tokens.
- **User query:** the actual question.

## Techniques

- **Chain-of-thought (CoT):** "Think step by step" — improves reasoning on math/logic tasks. Costs more tokens.
- **Structured output:** JSON schema / function calling — forces parseable responses. Essential for pipelines.
- **Role prompting:** "You are an expert X" — sets tone and expertise level.
- **Decomposition:** break complex tasks into sub-tasks; each gets its own prompt.
- **Self-consistency:** sample multiple outputs, take majority vote — improves accuracy on reasoning.

## Context window management

- **Token budgeting:** system (500) + examples (1000) + RAG (4000) + history (2000) + query (200) = ~7700 of 8192.
- **Sliding window:** keep last N turns; summarise older turns into a "memory" block.
- **Priority ordering:** most important context closest to the query (recency bias in attention).
- **Truncation strategy:** truncate retrieved docs first, then history, never the system message.

## Prompt versioning & testing

- Store prompts in version control (Git) with semantic versions.
- A/B test prompt variants; track quality metrics (accuracy, latency, cost).
- Use prompt templates with variables; never string-concatenate user input.
- Guard against prompt injection: delimit untrusted content (XML tags, triple backticks).

## Trade-offs

| Dimension | Long prompt (more context) | Short prompt (less context) | Recommendation |
| --- | --- | --- | --- |
| Accuracy | Higher (more info) | Lower | Long for complex tasks; short for simple |
| Cost | Higher (more input tokens) | Lower | Cache stable prefixes; truncate retrieval |
| Latency | Higher (prefill) | Lower | Disaggregate prefill for long prompts |

## When to use

- Any LLM-backed feature
- Agentic systems with tool calls
- Multi-turn conversations

## When not to use

- Simple classification (use a small model with minimal prompt)
- Latency-critical paths (minimise tokens)

## Scaling notes

Cache stable prompt prefixes (system + examples) across requests; version prompts in Git; A/B test; monitor token usage and cost per query.
`,
    tradeOffs: [
      { dimension: "Long vs short prompt", optionA: "More context, higher accuracy", optionB: "Fewer tokens, lower cost/latency", recommendation: "Long for complex; short for simple. Cache stable prefixes." },
      { dimension: "Few-shot count", optionA: "More examples (better adherence)", optionB: "Fewer (lower token cost)", recommendation: "2-5 examples; more rarely helps beyond 5." },
    ],
    whenToUse: ["Any LLM feature", "Agentic tool loops", "Multi-turn chat"],
    whenNotToUse: ["Simple classification (small model)", "Ultra-low-latency paths"],
    scalingNotes: "Cache stable prefixes; version in Git; A/B test; monitor tokens/cost.",
    relatedModuleIds: ["llm-architecture-transformers", "ai-agents-rag-architecture"],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "prompt-1", front: "Where should the most important context go in a prompt?", back: "Closest to the query — attention has recency bias.", conceptTag: "prompt-engineering-context-management", moduleId: "prompt-engineering-context-management" },
      { cardId: "prompt-2", front: "What is chain-of-thought prompting?", back: "Instructing the model to 'think step by step' — improves reasoning on math/logic at the cost of more tokens.", conceptTag: "prompt-engineering-context-management", moduleId: "prompt-engineering-context-management" },
    ],
    quiz: [
      {
        id: "prompt-q1",
        prompt: "Which prompt component should NEVER be truncated when the context window is full?",
        options: [
          { id: "a", text: "The system message (role, constraints, output format)", correct: true },
          { id: "b", text: "Retrieved document chunks", correct: false },
          { id: "c", text: "Old conversation history", correct: false },
        ],
        explanation: "Truncate retrieved docs and old history first; never the system message.",
        conceptTag: "prompt-engineering-context-management",
      },
      {
        id: "prompt-q2",
        prompt: "What is the main benefit of structured output (JSON schema) in LLM pipelines?",
        options: [
          { id: "a", text: "Guarantees parseable, machine-readable responses for downstream code", correct: true },
          { id: "b", text: "Reduces model latency", correct: false },
          { id: "c", text: "Eliminates hallucinations", correct: false },
        ],
        explanation: "JSON schema forces parseable output; it does not reduce latency or eliminate hallucinations.",
        conceptTag: "prompt-engineering-context-management",
      },
    ],
    keyNumbers: [
      { value: "2-5", label: "Few-shot examples (sweet spot)", note: "More rarely helps beyond 5." },
      { value: "8k-128k", label: "Typical context windows (2026)", note: "Larger != better; attention degrades at extremes." },
      { value: "500 tokens", label: "Typical system message size", note: "Keep stable and versioned." },
    ],
  },
  {
    id: "fine-tuning-training-alignment",
    title: "Fine-Tuning, Training & Alignment",
    difficulty: "advanced",
    estimatedMinutes: 26,
    summary: "When and how to fine-tune: SFT, RLHF, DPO, LoRA/QLoRA, data preparation, evaluation, and the decision framework for fine-tuning vs RAG vs prompt engineering.",
    bodyMarkdown: `# Fine-Tuning, Training & Alignment

Fine-tuning adapts a pre-trained model to a specific task, domain, or style. In 2026, the default is to NOT fine-tune — RAG and prompt engineering solve most problems cheaper and faster. Fine-tune only when you need consistent style, domain vocabulary, or latency/cost wins at scale.

## Training stages

1. **Pre-training:** next-token prediction on trillions of tokens (web, code, books). Produces a base model with general knowledge. Cost: millions of GPU-hours.
2. **Supervised fine-tuning (SFT):** train on high-quality (prompt, response) pairs. Teaches instruction-following and task format.
3. **Alignment (RLHF/DPO):** optimize for human preferences (helpful, harmless, honest). RLHF uses a reward model + PPO; DPO skips the reward model and trains directly on preference pairs.
4. **Domain adaptation:** continue pre-training on domain data (medical, legal, code) before SFT.

## Parameter-efficient fine-tuning (PEFT)

- **LoRA:** train low-rank adapter matrices (A, B) instead of full weights. 0.1-1% of params; merges at inference with zero overhead.
- **QLoRA:** LoRA on a 4-bit quantized base model — fine-tune a 70B model on a single 48GB GPU.
- **Prefix tuning / adapters:** prepend learnable tokens or small MLP layers; less common in 2026.

## Decision framework: prompt vs RAG vs fine-tune

| Need | Prompt engineering | RAG | Fine-tuning |
| --- | --- | --- | --- |
| New knowledge (facts) | No | Yes | No (stale after training) |
| Consistent style/format | Partial | No | Yes |
| Domain vocabulary | Partial | Partial | Yes |
| Latency/cost at scale | No | Adds retrieval latency | Yes (smaller model) |
| Rapid iteration | Yes | Yes | No (retrain needed) |

**Rule of thumb:** Try prompt engineering first (hours), then RAG (days), then fine-tuning (weeks) only if the above fail.

## Data preparation

- **Quality > quantity.** 1,000 high-quality examples beat 100,000 noisy ones.
- **Deduplication:** remove near-duplicates (MinHash, SimHash).
- **Diversity:** cover edge cases, not just happy paths.
- **Format consistency:** same template for all examples.
- **Evaluation split:** hold out 10-20% for eval; never train on eval data.

## Evaluation

- **Offline:** task-specific metrics (accuracy, F1, BLEU), LLM-as-judge, human eval.
- **Online:** A/B test vs baseline; track user satisfaction, task completion, escalation rate.
- **Regression:** re-run full eval suite on every model/prompt change.

## Trade-offs

| Dimension | Full fine-tune | LoRA/QLoRA | Prompt + RAG | Recommendation |
| --- | --- | --- | --- | --- |
| Cost | Very high | Low | Lowest | LoRA for domain; prompt+RAG for knowledge |
| Iteration speed | Slow (retrain) | Medium | Fast | Prompt+RAG for rapid iteration |
| Quality ceiling | Highest | Near-full | Limited by base model | Full fine-tune only for frontier needs |

## When to use

- Consistent style/brand voice at scale
- Domain-specific vocabulary (medical, legal, code)
- Latency/cost reduction (distill to smaller model)
- Safety alignment (reduce harmful outputs)

## When not to use

- Factual knowledge (use RAG — facts change)
- Rapid iteration (use prompt engineering)
- Small datasets (<500 examples)
- When RAG + good prompting already works

## Scaling notes

Use LoRA/QLoRA for most cases; full fine-tune only for frontier quality. Automate data pipelines (labeling, dedup, versioning). Run evals in CI. Monitor for regression after deployment.
`,
    tradeOffs: [
      { dimension: "Fine-tune vs RAG", optionA: "Fine-tune (style/latency)", optionB: "RAG (facts/freshness)", recommendation: "RAG for facts; fine-tune for style/latency. Combine both for best results." },
      { dimension: "Full vs LoRA", optionA: "Full fine-tune (max quality)", optionB: "LoRA (1% params, same quality)", recommendation: "LoRA default; full only for frontier needs." },
    ],
    whenToUse: ["Consistent style at scale", "Domain vocabulary", "Latency/cost reduction", "Safety alignment"],
    whenNotToUse: ["Factual knowledge (use RAG)", "Rapid iteration (use prompts)", "Small datasets (<500)"],
    scalingNotes: "LoRA default; automate data pipelines; evals in CI; monitor regression.",
    relatedModuleIds: ["llm-architecture-transformers", "ai-agents-rag-architecture"],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "ft-1", front: "What does LoRA train instead of full weights?", back: "Low-rank adapter matrices (A, B) — 0.1-1% of params, merges at inference with zero overhead.", conceptTag: "fine-tuning-training-alignment", moduleId: "fine-tuning-training-alignment" },
      { cardId: "ft-2", front: "When should you NOT fine-tune?", back: "When RAG + prompt engineering already works; fine-tuning is for style/latency, not facts (facts change).", conceptTag: "fine-tuning-training-alignment", moduleId: "fine-tuning-training-alignment" },
    ],
    quiz: [
      {
        id: "ft-q1",
        prompt: "You need your LLM to answer questions about a 10,000-page product manual that updates weekly. Best approach?",
        options: [
          { id: "a", text: "RAG with incremental index updates", correct: true },
          { id: "b", text: "Fine-tune on the entire manual", correct: false },
          { id: "c", text: "Stuff the manual into the system prompt", correct: false },
        ],
        explanation: "Weekly-updating facts need RAG; fine-tuning would be stale immediately.",
        conceptTag: "fine-tuning-training-alignment",
      },
      {
        id: "ft-q2",
        prompt: "What is QLoRA?",
        options: [
          { id: "a", text: "LoRA on a 4-bit quantized base model — fine-tune 70B on a single 48GB GPU", correct: true },
          { id: "b", text: "A quantization-aware training method for all params", correct: false },
          { id: "c", text: "A prompt compression technique", correct: false },
        ],
        explanation: "QLoRA = LoRA on 4-bit quantized base; enables fine-tuning large models on consumer GPUs.",
        conceptTag: "fine-tuning-training-alignment",
      },
    ],
    keyNumbers: [
      { value: "0.1-1%", label: "LoRA params vs full model", note: "Same quality, fraction of compute." },
      { value: "4-bit", label: "QLoRA base quantization", note: "Fine-tune 70B on 48GB GPU." },
      { value: "500+", label: "Minimum examples for fine-tuning", note: "Below this, prompt engineering is better." },
    ],
  },
  {
    id: "ai-observability-monitoring",
    title: "AI Observability & Monitoring",
    difficulty: "advanced",
    estimatedMinutes: 22,
    summary: "How to observe AI systems: LLM tracing (OpenTelemetry GenAI), quality metrics (faithfulness, relevance), cost tracking, latency (TTFT/ITL), drift detection, and alerting.",
    bodyMarkdown: `# AI Observability & Monitoring

Traditional observability (up, fast, error-free) is necessary but not sufficient for AI systems. AI observability must additionally measure whether outputs are semantically correct, factually grounded, and policy-compliant — because infrastructure can be healthy while outputs are degraded.

## Three layers of AI observability

1. **Infrastructure:** GPU utilisation, memory, request queue depth, error rates, latency (TTFT, ITL, p99).
2. **Behavioural:** output quality (faithfulness, relevance, toxicity), hallucination rate, refusal rate, user satisfaction.
3. **Cost:** tokens per request, cost per query, cost per user, model routing efficiency.

## Key metrics

- **TTFT (time to first token):** prefill latency; dominates user-perceived responsiveness.
- **ITL (inter-token latency):** decode speed; affects streaming UX.
- **Goodput:** requests meeting SLO (latency + quality) / total requests.
- **Faithfulness:** is the answer grounded in retrieved sources? (RAGAS)
- **Answer relevance:** does the answer address the query?
- **Context precision/recall:** are the retrieved chunks relevant and complete?
- **Cost per query:** input + output tokens * price per token.
- **Drift:** distribution shift in inputs/outputs over time (new topics, new failure modes).

## Tracing

- **OpenTelemetry GenAI conventions:** standard spans for LLM calls (model, tokens, latency, cost). Still "Development" status but widely emitted.
- **Trace structure:** request → retrieval → prompt assembly → LLM call → guardrails → response. Each step is a span with attributes.
- **Sampling:** tail-based sampling for errors and slow traces; probabilistic for the rest.

## Alerting

- Alert on: p99 TTFT > SLO, error rate > 1%, faithfulness < threshold, cost per query > budget, drift detected.
- Dashboards: per-model, per-route, per-tenant cost and quality.

## Tools (2026)

- **Langfuse, Helicone, LangSmith:** LLM-specific observability (traces, evals, cost).
- **OpenTelemetry + Grafana/Jaeger:** infra-level tracing.
- **RAGAS, DeepEval:** automated quality evaluation.

## Trade-offs

| Dimension | Full tracing (100%) | Sampled tracing | Recommendation |
| --- | --- | --- | --- |
| Visibility | Complete | Gaps in rare failures | Tail-based: 100% errors/slow, sample rest |
| Cost | High (storage) | Low | Sample at 1-10% for healthy traffic |
| Latency overhead | +5-10ms | +1-2ms | Async export to avoid blocking |

## When to use

- Any production LLM feature
- Multi-model routing (need per-model metrics)
- Regulated domains (audit trail)

## When not to use

- Prototypes (add before production)
- Offline batch jobs (log summaries only)

## Scaling notes

Export traces async (OTLP); use tail-based sampling; store evals in a separate pipeline; alert on SLO breaches; track cost per tenant for FinOps.
`,
    tradeOffs: [
      { dimension: "Full vs sampled tracing", optionA: "100% visibility, high cost", optionB: "Sampled, lower cost, gaps", recommendation: "Tail-based: 100% errors/slow, sample healthy traffic." },
      { dimension: "Infra vs behavioural metrics", optionA: "CPU/GPU/latency only", optionB: "Quality/faithfulness/cost", recommendation: "Both: infra healthy != outputs good." },
    ],
    whenToUse: ["Production LLM features", "Multi-model routing", "Regulated domains"],
    whenNotToUse: ["Prototypes", "Offline batch jobs"],
    scalingNotes: "Async export; tail-based sampling; separate eval pipeline; SLO alerts.",
    relatedModuleIds: ["ai-inference-serving-2026", "ai-safety-guardrails-evals"],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "ai-obs-1", front: "What is TTFT?", back: "Time to first token — prefill latency, dominates user-perceived responsiveness.", conceptTag: "ai-observability-monitoring", moduleId: "ai-observability-monitoring" },
      { cardId: "ai-obs-2", front: "Why is infrastructure health not enough for AI?", back: "Infra can be healthy while outputs are degraded (hallucinations, drift). Need behavioural observability.", conceptTag: "ai-observability-monitoring", moduleId: "ai-observability-monitoring" },
    ],
    quiz: [
      {
        id: "ai-obs-q1",
        prompt: "Which sampling strategy captures all errors while keeping cost low?",
        options: [
          { id: "a", text: "Tail-based: 100% of errors and slow traces, probabilistic for healthy traffic", correct: true },
          { id: "b", text: "100% of all traces", correct: false },
          { id: "c", text: "Random 1% of everything", correct: false },
        ],
        explanation: "Tail-based captures all failures; random sampling misses rare but critical errors.",
        conceptTag: "ai-observability-monitoring",
      },
      {
        id: "ai-obs-q2",
        prompt: "Which metric best indicates whether RAG answers are factually grounded?",
        options: [
          { id: "a", text: "Faithfulness (RAGAS) — is the answer supported by retrieved sources?", correct: true },
          { id: "b", text: "TTFT (time to first token)", correct: false },
          { id: "c", text: "GPU utilisation", correct: false },
        ],
        explanation: "Faithfulness measures grounding; TTFT and GPU util are infra metrics.",
        conceptTag: "ai-observability-monitoring",
      },
    ],
    keyNumbers: [
      { value: "TTFT", label: "Time to first token", note: "Prefill latency; dominates perceived speed." },
      { value: "ITL", label: "Inter-token latency", note: "Decode speed; affects streaming UX." },
      { value: "1-10%", label: "Healthy-traffic sample rate", note: "Tail-based keeps all errors." },
    ],
  },
  {
    id: "multimodal-ai-systems",
    title: "Multimodal AI Systems",
    difficulty: "advanced",
    estimatedMinutes: 22,
    summary: "Systems that process text, images, audio, and video: vision-language models (VLMs), multimodal RAG, encoder caches, and serving multimodal at scale.",
    bodyMarkdown: `# Multimodal AI Systems

Multimodal AI processes and generates across modalities — text, images, audio, video. In 2026, multimodal is the default for new AI products: document understanding (tables, charts, images), visual Q&A, audio transcription + reasoning, and video analysis.

## Architecture

A multimodal request has three stages (vs two for text):
1. **Encode:** vision/audio encoder (ViT, Whisper) processes raw media into embeddings.
2. **Prefill:** language model processes text + media embeddings.
3. **Decode:** generate response.

## Key components

- **Vision-language models (VLMs):** LLaVA, GPT-4V, Gemini — fuse vision encoder + LLM. Image understanding, captioning, OCR, chart/table extraction.
- **Audio models:** Whisper (transcription), audio-language models (reasoning over audio).
- **Video models:** frame sampling + temporal reasoning; expensive (many frames).
- **Multimodal RAG:** retrieve across text + images + tables; embed images with CLIP-style encoders.
- **Encoder cache:** cache encoder output keyed by media hash — skips the ViT pass on repeat media (huge win for shared images).

## Serving multimodal at scale

- **Encoder disaggregation:** run encoders on separate workers; pass embeddings to prefill. Avoids tying expensive LLM capacity to image preprocessing.
- **Two caches:** KV cache (text) + encoder cache (media embeddings). A request can miss KV but hit encoder cache and skip the ViT pass.
- **Cache-aware routing:** route by media hash affinity, not just text prefix.
- **Batching:** encode stage is compute-bound and parallelisable across items; prefill/decode as usual.

## Trade-offs

| Dimension | Text-only | Multimodal | Recommendation |
| --- | --- | --- | --- |
| Complexity | Low | High (encoders, caches, routing) | Multimodal only when media is core to the task |
| Cost | Baseline | 2-5x (encoder compute) | Cache encoder output aggressively |
| Latency | Low | Higher (encode stage) | Disaggregate encoders; stream response |

## When to use

- Document understanding (PDFs with tables/charts/images)
- Visual Q&A, image search
- Audio transcription + reasoning
- Video analysis/summarisation

## When not to use

- Pure text tasks (unnecessary cost)
- Ultra-low-latency (encode adds latency)

## Scaling notes

Disaggregate encoders; cache by media hash; monitor encode/prefill/decode separately; use smaller vision encoders for edge.
`,
    tradeOffs: [
      { dimension: "Text-only vs multimodal", optionA: "Lower cost/latency", optionB: "Richer understanding of media", recommendation: "Multimodal when media is core to the task; text-only otherwise." },
      { dimension: "Encoder placement", optionA: "Co-located with LLM", optionB: "Disaggregated encoder workers", recommendation: "Disaggregate at scale to avoid tying LLM capacity to preprocessing." },
    ],
    whenToUse: ["Document understanding", "Visual Q&A", "Audio/video analysis"],
    whenNotToUse: ["Pure text tasks", "Ultra-low-latency paths"],
    scalingNotes: "Disaggregate encoders; cache by media hash; monitor stages separately.",
    relatedModuleIds: ["ai-inference-serving-2026", "ai-agents-rag-architecture"],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "mm-1", front: "What are the 3 stages of a multimodal request?", back: "Encode (ViT/Whisper) → Prefill (LLM with media embeddings) → Decode (generate response).", conceptTag: "multimodal-ai-systems", moduleId: "multimodal-ai-systems" },
      { cardId: "mm-2", front: "What does the encoder cache skip?", back: "The entire ViT encode pass, when the media hash is already cached.", conceptTag: "multimodal-ai-systems", moduleId: "multimodal-ai-systems" },
    ],
    quiz: [
      {
        id: "mm-q1",
        prompt: "Which cache hit skips the ViT encode pass regardless of the surrounding text?",
        options: [
          { id: "a", text: "The encoder cache, keyed by media hash", correct: true },
          { id: "b", text: "The KV cache", correct: false },
          { id: "c", text: "The prompt cache", correct: false },
        ],
        explanation: "Encoder cache is keyed by media hash alone; a hit skips ViT regardless of text.",
        conceptTag: "multimodal-ai-systems",
      },
      {
        id: "mm-q2",
        prompt: "Why disaggregate encoders from the LLM?",
        options: [
          { id: "a", text: "To avoid tying expensive LLM capacity to image/audio preprocessing", correct: true },
          { id: "b", text: "To reduce model accuracy", correct: false },
          { id: "c", text: "To increase latency", correct: false },
        ],
        explanation: "Encoders are compute-bound preprocessing; disaggregation frees LLM GPUs for generation.",
        conceptTag: "multimodal-ai-systems",
      },
    ],
    keyNumbers: [
      { value: "2-5x", label: "Multimodal cost vs text-only", note: "Encoder compute; cache to reduce." },
      { value: "2 caches", label: "KV + encoder cache", note: "Encoder cache can skip ViT even on KV miss." },
      { value: "ViT", label: "Standard vision encoder", note: "Vision Transformer; runs per image." },
    ],
  },
  {
    id: "ai-gateway-model-routing",
    title: "AI Gateway & Model Routing",
    difficulty: "intermediate",
    estimatedMinutes: 18,
    summary: "The AI gateway: unified entry point for auth, rate limiting, model routing, fallback, cost tracking, and guardrails across multiple LLM providers.",
    bodyMarkdown: `# AI Gateway & Model Routing

The AI gateway is the control plane for all LLM traffic. It sits between applications and model providers (OpenAI, Anthropic, self-hosted vLLM), providing a single OpenAI-compatible API with auth, rate limiting, routing, fallback, cost tracking, and guardrails.

## Core functions

- **Auth & rate limiting:** API keys, per-user/per-tenant token budgets, RPM/TPM limits.
- **Model routing:** route by task type, cost, latency, or capability. Cheap model for simple tasks; expensive model for complex.
- **Fallback & retries:** if primary provider fails, route to backup (e.g., OpenAI → Anthropic → self-hosted).
- **Cost tracking:** per-request token counts and cost; per-tenant budgets and alerts.
- **Guardrails:** input/output filtering, PII redaction, toxicity checks.
- **Caching:** semantic cache (similar queries → cached response) and prompt cache (shared prefixes).
- **Observability:** traces, logs, metrics (TTFT, ITL, tokens, cost).

## Routing strategies

- **Capability-based:** route complex reasoning to large models; simple classification to small models.
- **Cost-based:** try cheapest model first; escalate if quality is low (cascade).
- **Latency-based:** route to the fastest available provider.
- **A/B testing:** split traffic between model versions; compare quality/cost.
- **Canary/shadow:** deploy new model to 5% traffic; monitor before full rollout.

## Tools (2026)

- **LiteLLM:** open-source proxy, 100+ providers, OpenAI-compatible.
- **Envoy AI Gateway:** Kubernetes-native, Gateway API Inference Extension.
- **Kong AI Gateway:** enterprise, plugin ecosystem.
- **Cloud gateways:** AWS Bedrock, Azure OpenAI, GCP Vertex AI.

## Trade-offs

| Dimension | Single provider | Multi-provider gateway | Recommendation |
| --- | --- | --- | --- |
| Complexity | Low | Higher (routing, fallback, cost tracking) | Gateway once you have >1 provider or >$1k/mo spend |
| Cost | Baseline | -20-40% (smart routing) | Worth it at scale |
| Reliability | Single point of failure | Fallback across providers | Gateway for production |

## When to use

- Multi-provider or multi-model setups
- Cost optimisation at scale
- Compliance (data residency, PII)
- Production AI features

## When not to use

- Single-model prototypes
- Very low traffic (<100 RPS)

## Scaling notes

Scale gateway horizontally; cache auth decisions; use connection pooling; monitor per-provider latency/cost; set per-tenant budgets.
`,
    tradeOffs: [
      { dimension: "Single vs multi-provider", optionA: "Simpler, single vendor", optionB: "Resilient, cost-optimised", recommendation: "Gateway once >1 provider or >$1k/mo spend." },
      { dimension: "Smart routing vs fixed", optionA: "Fixed model per task", optionB: "Dynamic routing by cost/quality/latency", recommendation: "Dynamic routing at scale; fixed for simplicity." },
    ],
    whenToUse: ["Multi-provider", "Cost optimisation", "Compliance", "Production AI"],
    whenNotToUse: ["Single-model prototypes", "Very low traffic"],
    scalingNotes: "Scale horizontally; cache auth; connection pooling; per-tenant budgets.",
    relatedModuleIds: ["ai-inference-serving-2026", "ai-observability-monitoring"],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "ai-gw-1", front: "What is an AI gateway?", back: "A unified entry point for auth, rate limiting, model routing, fallback, cost tracking, and guardrails across LLM providers.", conceptTag: "ai-gateway-model-routing", moduleId: "ai-gateway-model-routing" },
      { cardId: "ai-gw-2", front: "What is semantic caching?", back: "Caching responses for semantically similar queries (not just exact matches) to reduce cost and latency.", conceptTag: "ai-gateway-model-routing", moduleId: "ai-gateway-model-routing" },
    ],
    quiz: [
      {
        id: "ai-gw-q1",
        prompt: "Which routing strategy tries the cheapest model first and escalates if quality is low?",
        options: [
          { id: "a", text: "Cascade routing", correct: true },
          { id: "b", text: "Fixed routing", correct: false },
          { id: "c", text: "Random routing", correct: false },
        ],
        explanation: "Cascade tries cheapest first, escalates on low quality — balances cost and accuracy.",
        conceptTag: "ai-gateway-model-routing",
      },
      {
        id: "ai-gw-q2",
        prompt: "When should you add an AI gateway?",
        options: [
          { id: "a", text: "When you have >1 provider or >$1k/mo LLM spend", correct: true },
          { id: "b", text: "For every single-model prototype", correct: false },
          { id: "c", text: "Only for on-premise models", correct: false },
        ],
        explanation: "Gateway overhead isn't worth it for single-model prototypes; adds value at scale.",
        conceptTag: "ai-gateway-model-routing",
      },
    ],
    keyNumbers: [
      { value: "20-40%", label: "Cost reduction from smart routing", note: "Cascade + capability-based routing." },
      { value: "100+", label: "Providers supported by LiteLLM", note: "Open-source OpenAI-compatible proxy." },
      { value: "$1k/mo", label: "Gateway ROI threshold", note: "Above this, routing savings exceed gateway cost." },
    ],
  },
  {
    id: "mlops-llmops-lifecycle",
    title: "MLOps & LLMOps Lifecycle",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    summary: "The end-to-end AI lifecycle: data collection, training, evaluation, deployment, monitoring, and continuous improvement — adapted for LLMs.",
    bodyMarkdown: `# MLOps & LLMOps Lifecycle

LLMOps is MLOps adapted for large language models. The core difference: LLMs are pre-trained (you don't train from scratch), so the lifecycle focuses on adaptation (prompting, RAG, fine-tuning), evaluation, and continuous improvement rather than training infrastructure.

## Lifecycle stages

1. **Data collection & preparation:** gather domain data, clean, deduplicate, version (DVC, LakeFS).
2. **Adaptation:** prompt engineering → RAG → fine-tuning (in that order of effort).
3. **Evaluation:** offline evals (golden datasets, RAGAS, LLM-as-judge), human eval, red-teaming.
4. **Deployment:** canary/shadow/A-B; gradual rollout; rollback plan.
5. **Monitoring:** infra (latency, errors, cost) + behavioural (quality, drift, safety).
6. **Feedback loop:** collect user feedback; update prompts/RAG/fine-tuning data; re-evaluate.

## Key differences from traditional MLOps

- **No training infra needed** (for API models) — but fine-tuning needs GPUs.
- **Prompt versioning** replaces model versioning as the primary artifact.
- **Evaluation is harder** — no single ground truth; use LLM-as-judge + human eval.
- **Data drift is semantic** — new topics, not just distribution shift.
- **Cost is per-token** — FinOps is a first-class concern.

## Tools (2026)

- **Experiment tracking:** MLflow, Weights & Biases, Comet.
- **Data versioning:** DVC, LakeFS, Delta Lake.
- **Pipeline orchestration:** Airflow, Dagster, Prefect, Temporal.
- **Model registry:** MLflow, Hugging Face Hub, W&B Artifacts.
- **LLM observability:** Langfuse, Helicone, LangSmith.
- **Eval frameworks:** RAGAS, DeepEval, Promptfoo.

## Trade-offs

| Dimension | Heavy MLOps (full platform) | Lightweight (scripts + Git) | Recommendation |
| --- | --- | --- | --- |
| Complexity | High | Low | Lightweight for <5 use cases; platform for >10 |
| Iteration speed | Slower (pipelines) | Faster | Start lightweight; add platform when pain hits |
| Governance | Strong (audit, lineage) | Weak | Platform for regulated domains |

## When to use

- Production AI features with >1 model
- Regulated domains (audit trail, lineage)
- Teams with >3 AI engineers

## When not to use

- Single prototype or hackathon
- Single-model, single-prompt features

## Scaling notes

Start with Git + scripts; add experiment tracking when iterating on prompts; add data versioning when RAG corpus grows; add full platform only when pain demands it.
`,
    tradeOffs: [
      { dimension: "Heavy vs lightweight MLOps", optionA: "Full platform (governance, lineage)", optionB: "Git + scripts (fast, simple)", recommendation: "Start lightweight; add platform when pain demands." },
      { dimension: "Prompt vs model versioning", optionA: "Version the model", optionB: "Version the prompt (primary artifact)", recommendation: "Version both; prompt is the primary artifact for LLMs." },
    ],
    whenToUse: ["Production AI >1 model", "Regulated domains", "Teams >3 AI engineers"],
    whenNotToUse: ["Single prototype", "Single model/prompt features"],
    scalingNotes: "Start lightweight; add tracking/versioning/platform as pain demands.",
    relatedModuleIds: ["ai-observability-monitoring", "fine-tuning-training-alignment"],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "mlops-1", front: "What is the primary artifact in LLMOps (vs traditional MLOps)?", back: "The prompt (and RAG corpus), not the model — models are pre-trained, prompts are what you version and iterate.", conceptTag: "mlops-llmops-lifecycle", moduleId: "mlops-llmops-lifecycle" },
      { cardId: "mlops-2", front: "What order of adaptation effort?", back: "Prompt engineering → RAG → fine-tuning (increasing effort and cost).", conceptTag: "mlops-llmops-lifecycle", moduleId: "mlops-llmops-lifecycle" },
    ],
    quiz: [
      {
        id: "mlops-q1",
        prompt: "Which adaptation approach should you try first for a new AI feature?",
        options: [
          { id: "a", text: "Prompt engineering (hours, cheapest, fastest iteration)", correct: true },
          { id: "b", text: "Fine-tuning (weeks, most expensive)", correct: false },
          { id: "c", text: "Training from scratch", correct: false },
        ],
        explanation: "Start with prompt engineering; escalate to RAG then fine-tuning only if needed.",
        conceptTag: "mlops-llmops-lifecycle",
      },
      {
        id: "mlops-q2",
        prompt: "What makes LLM data drift different from traditional ML drift?",
        options: [
          { id: "a", text: "It's semantic — new topics and failure modes, not just distribution shift", correct: true },
          { id: "b", text: "It doesn't exist for LLMs", correct: false },
          { id: "c", text: "It's identical to traditional ML drift", correct: false },
        ],
        explanation: "LLM drift is semantic (new topics/failures); traditional ML drift is distributional.",
        conceptTag: "mlops-llmops-lifecycle",
      },
    ],
    keyNumbers: [
      { value: "3 stages", label: "Adaptation ladder", note: "Prompt → RAG → fine-tune." },
      { value: "Prompt", label: "Primary LLMOps artifact", note: "Version in Git; iterate fast." },
      { value: "10%", label: "Eval holdout split", note: "Never train on eval data." },
    ],
  },
  {
    id: "agent-memory-systems",
    title: "Agent Memory Systems",
    difficulty: "advanced",
    estimatedMinutes: 20,
    summary: "How AI agents remember: short-term (context window), long-term (vector DB), episodic (past interactions), and semantic (knowledge base) memory — and how to manage context across sessions.",
    bodyMarkdown: `# Agent Memory Systems

An agent without memory is stateless — each request starts fresh. Production agents need memory to maintain context across turns, sessions, and tasks. Memory is the hardest part of agent design.

## Memory types

1. **Short-term (working memory):** the context window. Current conversation, tool results, intermediate reasoning. Limited by token budget (8k-128k).
2. **Long-term (semantic memory):** vector database of facts, preferences, past decisions. Retrieved via similarity search.
3. **Episodic memory:** past interactions/conversations summarised and stored. "Last time we discussed X, you preferred Y."
4. **Procedural memory:** skills/tools the agent can use (function definitions, workflows).

## Memory management patterns

- **Sliding window + summarisation:** keep last N turns verbatim; summarise older turns into a "memory" block.
- **Retrieval-augmented memory:** store all past turns as embeddings; retrieve relevant ones per query.
- **Structured memory:** extract entities/facts/preferences into a structured store (JSON/KG) rather than raw text.
- **Memory consolidation:** periodically merge episodic memories into semantic facts ("user prefers concise answers").

## Challenges

- **Context limits:** even 128k tokens isn't enough for long-running agents. Need summarisation + retrieval.
- **Staleness:** old memories may be wrong. Add timestamps and confidence scores; expire stale entries.
- **Privacy:** memory contains PII. Encrypt at rest; allow deletion (GDPR right to be forgotten).
- **Consistency:** multiple agents sharing memory need conflict resolution.

## Trade-offs

| Dimension | Full context (all history) | Summarised + retrieved | Recommendation |
| --- | --- | --- | --- |
| Accuracy | High (nothing lost) | Lower (summarisation loss) | Full for short sessions; summarised for long |
| Cost | High (many tokens) | Low | Summarise + retrieve for >20 turns |
| Latency | Higher (prefill) | Lower | Summarise to reduce prefill |

## When to use

- Multi-turn chat agents
- Personal assistants (remember preferences)
- Long-running task agents (research, coding)

## When not to use

- Stateless Q&A (no memory needed)
- Single-turn classification

## Scaling notes

Use vector DB for long-term memory; summarise episodic memory periodically; encrypt PII; implement deletion APIs; monitor memory size and retrieval quality.
`,
    tradeOffs: [
      { dimension: "Full context vs summarised", optionA: "Nothing lost, high cost", optionB: "Lower cost, summarisation loss", recommendation: "Full for short sessions; summarised+retrieved for long." },
      { dimension: "Raw text vs structured memory", optionA: "Simple, lossless", optionB: "Queryable, compact", recommendation: "Structured for preferences/facts; raw for conversation history." },
    ],
    whenToUse: ["Multi-turn agents", "Personal assistants", "Long-running tasks"],
    whenNotToUse: ["Stateless Q&A", "Single-turn classification"],
    scalingNotes: "Vector DB for long-term; summarise episodic; encrypt PII; deletion APIs.",
    relatedModuleIds: ["ai-agents-rag-architecture", "ai-safety-guardrails-evals"],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "mem-1", front: "What are the 4 types of agent memory?", back: "Short-term (context window), long-term (vector DB), episodic (past interactions), procedural (skills/tools).", conceptTag: "agent-memory-systems", moduleId: "agent-memory-systems" },
      { cardId: "mem-2", front: "When should you summarise instead of keeping full context?", back: "When conversation exceeds ~20 turns or token budget is tight; summarise older turns, keep recent ones verbatim.", conceptTag: "agent-memory-systems", moduleId: "agent-memory-systems" },
    ],
    quiz: [
      {
        id: "mem-q1",
        prompt: "Which memory type stores facts and preferences for retrieval across sessions?",
        options: [
          { id: "a", text: "Long-term (semantic) memory in a vector database", correct: true },
          { id: "b", text: "Short-term (context window)", correct: false },
          { id: "c", text: "Procedural memory", correct: false },
        ],
        explanation: "Long-term semantic memory persists facts/preferences in a vector DB for cross-session retrieval.",
        conceptTag: "agent-memory-systems",
      },
      {
        id: "mem-q2",
        prompt: "What is a key privacy requirement for agent memory?",
        options: [
          { id: "a", text: "Encrypt at rest and support deletion (GDPR right to be forgotten)", correct: true },
          { id: "b", text: "Store everything in plaintext for speed", correct: false },
          { id: "c", text: "Never delete any memory", correct: false },
        ],
        explanation: "Memory contains PII; encrypt at rest and support deletion for compliance.",
        conceptTag: "agent-memory-systems",
      },
    ],
    keyNumbers: [
      { value: "8k-128k", label: "Context window (tokens)", note: "Short-term memory limit." },
      { value: "20 turns", label: "Summarisation threshold", note: "Beyond this, summarise older turns." },
      { value: "4 types", label: "Memory categories", note: "Short-term, long-term, episodic, procedural." },
    ],
  },
];

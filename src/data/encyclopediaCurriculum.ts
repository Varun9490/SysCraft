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
];

import type { Track } from "@/learning/platform/types";

const inferenceTrack: Track & { trackId: string } = {
  id: "llm-inference",
  slug: "llm-inference",
  trackId: "llm-inference",
  title: "LLM Inference Engineering and Training Systems",
  summary:
    "Reason about transformer memory, KV-cache growth, prefill and decode behavior, quantization, serving budgets, and the training stages behind a model.",
  accent: "rose",
  lessons: [
    {
      id: "transformer-bottlenecks",
      slug: "transformer-bottlenecks",
      trackId: "llm-inference",
      title: "Transformer Bottlenecks",
      summary:
        "Trace the work inside a transformer layer and identify whether attention matrices, projections, MLP compute, or memory movement limits the request.",
      minutes: 12,
      storyHook:
        "A transformer layer is an assembly line with projection benches, a roundtable discussion, and a large mixing room.",
      prerequisites: ["linear-algebra", "attention-scaling-laws"],
      steps: [
        {
          id: "transformer-projections",
          title: "Q, K, and V are three views of the same tokens",
          story:
            "At the library table, three researchers read the same paragraph: one marks questions, one writes matchable labels, and one extracts facts worth carrying into later discussion. One marks questions the paragraph might answer, one writes labels that other passages can match, and one extracts the facts worth carrying forward. A transformer creates analogous query, key, and value projections from token representations. These are not three different models; they are learned linear views of the same hidden states. Their dimensions determine how much information each token can express and how much work the layer must perform for every batch and sequence position.",
          engineer:
            "Q, K, and V projections are learned matrix multiplications whose cost scales with tokens, batch, and dimensions. Weight memory scales with parameter count and bytes per element, while small-batch inference can be dominated by weight reads. Matrix multiplication scales with tokens, batch size, and projection dimensions, while the stored weights scale with parameter count and bytes per element. Large projections improve representational capacity but increase weight memory and arithmetic. During inference, weight reads can dominate when the batch is small. Grouped-query and multi-query attention reduce key and value heads, but query computation and output projection still matter, so profile the whole layer rather than optimizing one matrix.",
          visualId: "transformer-architecture",
          visualCaption:
            "Token states branch into learned query, key, and value projections before attention compares them.",
        },
        {
          id: "transformer-attention-matrix",
          title: "Attention compares every token with earlier tokens",
          story:
            "Around the decoder's table, each new speaker must review the earlier remarks permitted by the meeting rules before choosing a response, creating one relationship for every allowed pair of positions and a quadratic number of pairwise comparisons. A causal decoder builds a score matrix that records those relationships. With a sequence of n tokens, there are roughly n squared pairwise opportunities, although a causal mask prevents looking forward. Doubling the sequence therefore does much more than double the pairwise attention work. Efficient kernels reduce memory traffic and avoid storing every intermediate score, but they do not erase the underlying growth in useful comparisons.",
          engineer:
            "Attention forms QK scores, applies scaling and a causal mask, normalizes with softmax, then aggregates values. For head dimension d, divide QK scores by the square root of d before masking and softmax, then multiply normalized weights by V for each allowed position. The score matrix has batch-by-head-by-sequence-by-sequence entries, so naive storage grows quadratically. FlashAttention-style kernels tile the computation and reduce reads and writes of intermediate matrices without changing the mathematical operation. Long prompts also increase prefill latency and KV-cache size. Measure sequence-length scaling separately from batch scaling because they stress different resources.",
          visualId: "transformer-architecture",
          visualCaption:
            "A causal score matrix compares each token with allowed earlier tokens and routes weighted values forward.",
        },
        {
          id: "transformer-mlp",
          title: "MLP blocks mix features after attention",
          story:
            "After the discussion, mixing benches expand and gate the selected remarks before compressing them back to model width, while a side corridor preserves the original signal through the layer. One bench expands the representation, another applies a nonlinear gate, and a final projection compresses it back to the model width. This feed-forward block does most of its work independently at each token, which makes it a natural target for parallel hardware. Residual connections act like a side corridor, preserving a route for the original signal even when the transformed path is difficult to train or noisy.",
          engineer:
            "Gated MLPs expand token states, apply nonlinear mixing, and project back to model width between residual connections. SwiGLU and related gated variants use an intermediate size larger than d_model, increasing parameter and activation memory in exchange for richer nonlinear feature mixing. They increase parameter count and activation memory but provide nonlinear feature mixing. Residual additions and normalization stabilize information flow, while placement and precision of normalization affect training stability and kernel fusion. During decode, MLP weights must be read for each small batch, contributing to memory-bandwidth pressure. During prefill, the same matrices process many tokens at once, creating higher arithmetic intensity and better hardware utilization.",
          visualId: "transformer-architecture",
          visualCaption:
            "Attention output passes through gated feed-forward mixing while a residual path preserves the original signal.",
        },
        {
          id: "transformer-roofline",
          title: "Find the bottleneck before tuning",
          story:
            "In the restaurant kitchen, ovens, counters, and delivery vans compete for space, so adding capacity to the wrong resource leaves the queue untouched until staff measures the actual constraint on a busy service with representative orders and sudden bursts. Buying more of the wrong resource leaves the real queue untouched. Transformer inference is similar: some phases need arithmetic throughput, some need memory bandwidth, and some need capacity for weights and cached tokens. The useful first question is not which optimization sounds impressive, but which resource is saturated on the actual model, hardware, sequence lengths, and batch sizes in production.",
          engineer:
            "Arithmetic intensity, calculated as operations per byte moved, identifies whether compute or bandwidth limits a kernel. Prefill usually exposes high arithmetic intensity, whereas low-batch decode often exposes low intensity because weights and KV values are read for few tokens. Prefill usually exposes high arithmetic intensity because many tokens are processed together; single-stream decode often exposes low intensity because weights and KV values are read for few tokens. Attention-head layout, sequence length, precision, and batch size all shift the balance. Profile layer time, memory allocation, kernel utilization, and queue delay. A failure mode is extrapolating from one shape that does not represent real traffic.",
          visualId: "queue-workers",
          visualCaption:
            "Compute demand, memory traffic, and capacity compete across prefill, decode, and queueing phases.",
        },
      ],
      security: [
        {
          id: "transformer-model-provenance",
          title: "Verify model artifact provenance",
          threat:
            "An unverified model file or tokenizer can contain malicious behavior, incompatible artifacts, or hidden data-handling differences.",
          control:
            "Use signed artifacts from approved sources, verify hashes and licenses, and scan dependencies before deployment.",
          verify:
            "Rebuild the runtime manifest and confirm each model, tokenizer, and config resolves to an approved immutable digest.",
        },
        {
          id: "transformer-memory-limits",
          title: "Bound memory-driven denial of service",
          threat:
            "Oversized prompts or excessive concurrency can exhaust accelerator memory and interrupt other tenants.",
          control:
            "Enforce input and output token limits, admission control, per-tenant quotas, and isolated worker pools.",
          verify:
            "Load-test rejected and admitted request paths and confirm one tenant cannot evict another tenant's active cache.",
        },
        {
          id: "transformer-sensitive-telemetry",
          title: "Minimize inference telemetry",
          threat:
            "Prompt samples, generated text, or cache keys may expose personal data, secrets, or proprietary content through traces.",
          control:
            "Record aggregate shapes, timings, and redacted identifiers instead of raw text, with strict sampling and retention rules.",
          verify:
            "Inspect profiler exports and tracing backends using seeded sensitive fixtures before enabling production collection.",
        },
      ],
      quiz: [
        {
          id: "transformer-q1",
          topicId: "transformer-bottlenecks",
          prompt: "In the roundtable analogy, why does naive attention storage grow roughly with sequence length squared?",
          choices: [
            "Because every layer doubles the vocabulary",
            "Because it stores a score for each pair of sequence positions",
            "Because the model must load the entire training corpus",
            "Because Q, K, and V always have different token counts",
          ],
          answerIndex: 1,
          explanation:
            "The attention score matrix has sequence-by-sequence entries per head and batch, even though a causal mask limits which comparisons are used.",
          kind: "story-match",
        },
        {
          id: "transformer-q2",
          topicId: "transformer-bottlenecks",
          prompt: "What is a primary benefit of FlashAttention-style kernels?",
          choices: [
            "They remove the need for softmax",
            "They make sequence length irrelevant",
            "They reduce intermediate memory traffic while preserving attention math",
            "They eliminate model weights",
          ],
          answerIndex: 2,
          explanation:
            "Tiled kernels avoid materializing the full score matrix in high-bandwidth memory, reducing IO without changing the underlying operation.",
          kind: "tradeoff",
        },
        {
          id: "transformer-q3",
          topicId: "transformer-bottlenecks",
          prompt: "Which phase is most likely to saturate arithmetic throughput?",
          choices: [
            "Prefill processing a long prompt as a large matrix operation",
            "Single-token decode with a tiny batch",
            "An idle worker with no requests",
            "Loading a static model card",
          ],
          answerIndex: 0,
          explanation:
            "Prefill processes many token positions together, producing matrix operations with much higher arithmetic intensity than one-token decode.",
          kind: "scenario",
        },
        {
          id: "transformer-q4",
          topicId: "transformer-bottlenecks",
          prompt: "A faster transformer checkpoint arrives from an unapproved source without a signed manifest. What should deployment do?",
          choices: [
            "Load it into a canary because benchmark latency is the only risk",
            "Scan only the tokenizer and trust the model weights",
            "Record its hash after loading so provenance can be reconstructed later",
            "Quarantine it until signed provenance, immutable digest, dependencies, and licenses are verified",
          ],
          answerIndex: 3,
          explanation:
            "Transformer artifacts can embed malicious behavior or incompatible configuration, so provenance and integrity checks must precede execution; a speed benchmark cannot establish trust.",
          kind: "security",
        },
      ],
    },
    {
      id: "kv-cache-paged-attention",
      slug: "kv-cache-paged-attention",
      trackId: "llm-inference",
      title: "KV Cache Math and PagedAttention",
      summary:
        "Calculate KV-cache memory exactly, understand request lifetime and sharing, and see how paged allocation reduces fragmentation.",
      minutes: 13,
      storyHook:
        "A decoder reuses yesterday's notes instead of rereading the whole conversation; those notes still occupy shelves.",
      prerequisites: ["transformer-bottlenecks"],
      steps: [
        {
          id: "kv-formula",
          title: "KV bytes follow a simple multiplication",
          story:
            "On the decoder's shelves, every token leaves separate key and value bookmarks in every layer, so shelf space multiplies across layers, heads, width, tokens, batch size, and bytes per number before runtime overhead. The shelf space depends on how many bookmarks exist, how wide each bookmark is, and whether each number occupies two or four bytes. Add another conversation and the same shelves are needed again. The formula is less mysterious than it looks: count layers, key and value heads, head width, tokens, batch, and bytes per element, then remember the factor of two for keys and values.",
          engineer:
            "KV-cache bytes equal two times layers, KV heads, head dimension, tokens, batch, and bytes per element. The leading factor represents separate key and value tensors, and architecture values must come from the deployed model configuration rather than marketing shorthand. For 32 layers, 8 KV heads, headDim 128, 4096 cached tokens, batch 1, and FP16 at 2 bytes, the result is 536,870,912 bytes, or 512 MiB. This excludes weights, activations, allocator overhead, and other runtime state. Keep units explicit: bytes per element distinguishes FP16, FP8, and other stored formats, while sequence and batch counts must describe the actual cache footprint.",
          visualId: "attention-kv",
          visualCaption:
            "Layer, head, width, token, batch, and element-size factors multiply into the KV-cache footprint.",
        },
        {
          id: "kv-lifetime",
          title: "The cache lives as long as the sequence",
          story:
            "On the decoder's shelves, written bookmarks remain attached to a sequence while later tokens still need them, occupying memory through thinking and waiting until completion, cancellation, timeout, or disconnect releases every reference. They remain attached to the sequence until the request finishes, is cancelled, or reaches its limit. A long-running conversation therefore reserves memory even while the model is thinking. Sending two requests does not automatically let them share bookmarks unless their prefixes and cache policy match. Capacity planning must consider active requests, maximum outputs, scheduler reservations, and the fact that freeing memory after completion is not instantaneous.",
          engineer:
            "KV allocations grow with generated tokens and remain reserved until every completion and cancellation path releases them. Admission control should estimate prompt tokens plus a realistic maximum output allowance before scheduling the request. Admission control should estimate prompt tokens plus a realistic maximum output allowance before scheduling. Free cache blocks on completion, cancellation, timeout, and client disconnect, and alert on reserved versus allocated memory. Reserve headroom for fragmentation and transient copies. A failure mode is budgeting only the prompt length, then discovering that concurrent long generations exhaust memory before their output limits.",
          visualId: "attention-kv",
          visualCaption:
            "A sequence's KV footprint grows during decoding and remains reserved until the request releases it.",
        },
        {
          id: "kv-head-sharing",
          title: "GQA and MQA trade head diversity for capacity",
          story:
            "At the meeting, some participants share notebooks while others keep private copies, changing shelf demand and decode bandwidth without changing the number of questions or requiring a quality assumption about attention. Multi-head attention gives each query group its own key and value heads. Grouped-query attention lets several query heads share a smaller set of KV heads, while multi-query attention shares one set across all queries. Sharing saves shelf space and bandwidth, but gives the model fewer independent key-value views. The right choice depends on the quality target and the memory envelope, not on memory savings alone.",
          engineer:
            "KV-cache memory scales linearly with the number of key and value heads rather than query heads. Query heads can remain numerous while sharing fewer cached KV heads, preserving some attention diversity with less decode traffic. Query heads can remain numerous, preserving attention pattern diversity while sharing cached keys and values. However, reduced KV diversity may affect quality, especially on some tasks, so evaluate the exact model and data distribution. Fewer KV heads also reduce decode memory traffic. Do not compare models using head count alone; include headDim, layers, precision, and architecture when calculating total bytes.",
          visualId: "attention-kv",
          visualCaption:
            "Multiple query heads can share fewer key-value heads to reduce cache bytes and decode bandwidth.",
        },
        {
          id: "kv-paging",
          title: "Paging replaces giant reservations with blocks",
          story:
            "At the decoder's storage desk, growing conversations receive fixed-size blocks on demand instead of one oversized contiguous shelf, and a block table records where each logical page resides. Paged storage gives each sequence a table of fixed-size blocks, adding blocks as needed and releasing them when finished. It resembles virtual memory in an operating system: logical pages need not sit in one contiguous physical region. Blocks can also be shared for identical prefixes when the runtime supports copy-on-write semantics. The gain is less fragmentation and finer-grained capacity control, not free memory.",
          engineer:
            "PagedAttention maps logical token positions to fixed-size physical blocks through per-sequence block tables to reduce fragmentation. Block size trades internal fragmentation against metadata and kernel overhead, so measure utilization on the target accelerator. Block tables add metadata and some indirection, but avoid requiring a contiguous cache sized for the maximum output. Allocation and freeing occur in block units, and block size trades internal fragmentation against metadata and kernel overhead. Prefix caching can share immutable blocks across requests, subject to tenant isolation and eviction policy. Measure cache hit rate, block utilization, eviction behavior, and any kernel cost on the target accelerator.",
          visualId: "attention-kv",
          visualCaption:
            "Block tables map growing sequences onto reusable fixed-size KV pages instead of one contiguous reservation.",
        },
      ],
      security: [
        {
          id: "kv-prefix-isolation",
          title: "Never share cached prefixes across tenants",
          threat:
            "A prefix-cache lookup could reuse KV blocks derived from another tenant's prompt or private system context.",
          control:
            "Include tenant and authorization scope in cache keys, isolate pools where required, and purge blocks on policy changes.",
          verify:
            "Use overlapping prompts across test tenants and confirm no cross-tenant cache hit or retrievable state occurs.",
        },
        {
          id: "kv-memory-quotas",
          title: "Prevent cache exhaustion",
          threat:
            "One tenant's long or numerous generations can reserve accelerator memory needed by other requests.",
          control:
            "Apply admission control, token and concurrency quotas, per-tenant scheduling limits, and bounded cache reservations.",
          verify:
            "Drive one tenant beyond its quota and confirm rejection or queuing occurs before other tenants are evicted.",
        },
        {
          id: "kv-cancellation",
          title: "Release memory on every termination path",
          threat:
            "Disconnected or timed-out requests may retain KV blocks indefinitely, creating a slow denial-of-service condition.",
          control:
            "Propagate cancellation to workers, enforce deadlines, and reconcile allocated blocks with scheduler state.",
          verify:
            "Exercise completion, timeout, client disconnect, and worker failure paths and confirm reserved memory returns to baseline.",
        },
      ],
      quiz: [
        {
          id: "kv-q1",
          topicId: "kv-cache-paged-attention",
          prompt: "In the bookmark analogy, why does the KV-cache formula include a factor of two?",
          choices: [
            "Two model replicas",
            "Separate key and value tensors",
            "Two bytes per FP16 element",
            "Query heads and output tokens",
          ],
          answerIndex: 1,
          explanation:
            "Attention caches both keys and values; bytes per element is a separate factor in the formula.",
          kind: "story-match",
        },
        {
          id: "kv-q2",
          topicId: "kv-cache-paged-attention",
          prompt: "What is the main benefit of paged KV allocation?",
          choices: [
            "It removes attention computation",
            "It makes all sequences share one cache",
            "It reduces fragmentation by allocating fixed-size blocks on demand",
            "It eliminates the need for output limits",
          ],
          answerIndex: 2,
          explanation:
            "Paging trades large contiguous reservations for block-level allocation and mapping, improving capacity utilization.",
          kind: "tradeoff",
        },
        {
          id: "kv-q3",
          topicId: "kv-cache-paged-attention",
          prompt: "Why can prefix caching be dangerous in a multi-tenant service?",
          choices: [
            "It increases vocabulary size",
            "It always changes model weights",
            "It prevents token generation",
            "It can expose or reuse another tenant's private prompt state without scoped keys",
          ],
          answerIndex: 3,
          explanation:
            "Cache reuse must include tenant and authorization scope; otherwise similar prefixes can cross isolation boundaries.",
          kind: "security",
        },
        {
          id: "kv-q4",
          topicId: "kv-cache-paged-attention",
          prompt: "Which change directly reduces KV-cache bytes?",
          choices: [
            "Reducing kvHeads",
            "Increasing the user interface width",
            "Adding more logging",
            "Increasing output length",
          ],
          answerIndex: 0,
          explanation:
            "kvHeads is a multiplicative factor in cache size; fewer heads reduce stored keys and values, subject to quality trade-offs.",
          kind: "scenario",
        },
      ],
    },
    {
      id: "prefill-decode-batching",
      slug: "prefill-decode-batching",
      trackId: "llm-inference",
      title: "Prefill vs Decode and Continuous Batching",
      summary:
        "Understand why prompt processing is compute-bound, token generation is memory-bandwidth-bound, and iteration-level batching improves serving utilization.",
      minutes: 12,
      storyHook:
        "Reading a manuscript and writing one word at a time stress a workshop in very different ways.",
      prerequisites: ["kv-cache-paged-attention"],
      steps: [
        {
          id: "prefill-compute",
          title: "Prefill reads the whole prompt in parallel",
          story:
            "At the scholar's desk, the entire manuscript is read in one pass, relationships are marked across pages, and notes are prepared before the first sentence of a new draft appears. Prefill does the model equivalent: it processes all prompt tokens together through the layers, computes attention over their representations, and creates the initial KV cache. Because many token positions move through large matrices in one operation, the hardware can stay busy with arithmetic. This phase usually determines time to first token. A longer prompt means more work and more cache to build, even if the eventual answer is short.",
          engineer:
            "Prefill processes prompt positions in parallel, builds the initial KV cache, and exposes high arithmetic intensity. Chunked prefill can interleave long prompts with decode work to reduce latency spikes, but scheduling must preserve causal correctness. Attention also has sequence-dependent work, and the phase writes the initial KV cache. Chunked prefill can split a long prompt into pieces to interleave decode work and reduce latency spikes, but it adds scheduling complexity and must preserve causal correctness. Cache hits can shorten prefill by reusing approved prefix blocks. Measure time to first token separately from output throughput because optimizing one can harm the other.",
          visualId: "attention-kv",
          visualCaption:
            "Prefill processes the prompt in parallel, builds KV state, and hands the first token to decode.",
        },
        {
          id: "prefill-decode-bandwidth",
          title: "Decode reads weights for one small step",
          story:
            "At the writing desk, each new word requires another trip to the reference shelves before the next sentence can continue. For each token, the model must revisit its prepared notes and consult a huge set of learned reference volumes. When only one token is ready, much of the hardware waits for data rather than performing enough arithmetic to hide the delay. Decode is therefore memory-bandwidth-bound in the common low-batch case. The output grows one token at a time, and each step depends on the previous one, so simply adding more prompt-reading capacity does not make every subsequent word appear faster.",
          engineer:
            "Autoregressive decode produces one position per sequence per iteration while repeatedly reading weights and KV state. With a small batch, each layer moves substantial weights and cache state for relatively little arithmetic, making bandwidth the likely constraint. With a small batch, each layer reads model weights and a growing KV cache to produce relatively little arithmetic, giving low arithmetic intensity and high sensitivity to memory bandwidth. Larger batches reuse those reads across more sequences, improving utilization until compute, memory capacity, or latency constraints bind. Quantization can reduce bytes moved, while paged KV access and efficient kernels reduce cache traffic. Measure per-token latency and aggregate tokens per second because they can move in opposite directions.",
          visualId: "queue-workers",
          visualCaption:
            "Decode repeatedly reads weights and KV state to produce one dependent token per sequence.",
        },
        {
          id: "prefill-continuous-batching",
          title: "Continuous batching fills seats every iteration",
          story:
            "At the shuttle stop, the dispatcher replaces departed riders with waiting passengers at every departure instead of holding a fixed group, letting short trips free capacity for new work. Continuous batching schedules at each generation iteration instead of holding a fixed group until everyone finishes. A completed sequence vacates its slot, a waiting request joins, and the next token step proceeds with the new mix. Short answers therefore stop consuming resources, while long answers coexist with fresh work. The scheduler becomes the traffic controller, balancing fairness, cache reuse, memory reservations, and the latency promises made to different users.",
          engineer:
            "Iteration-level scheduling adds and removes sequences as their states change instead of waiting for static batches. The scheduler weighs queued prompts, running decodes, available KV blocks, prefix-cache opportunities, and fairness rules at each iteration. The scheduler considers queued prompts, running decodes, available KV blocks, prefix-cache opportunities, and priority or fairness rules. Prefill-decode disaggregation can place the two phases on separate pools with distinct scaling policies, but it introduces transfer and scheduling overhead. A failure mode is admitting too many requests: throughput may rise while time to first token and per-token latency exceed the service objective.",
          visualId: "queue-workers",
          visualCaption:
            "An iteration-level scheduler replaces finished sequences with waiting work inside the active batch.",
        },
        {
          id: "prefill-queueing",
          title: "Scheduling latency is part of inference latency",
          story:
            "At the checkout entrance, customers can wait before the clerk starts, so the service records entrance delay separately from transaction time. The same is true for inference workers: excellent kernel time does not erase queue delay. Requests may wait for a GPU slot, a KV block, a prefill turn, or admission approval. Good systems measure the wait separately from execution so teams know whether to add capacity, reduce prompt size, change batching policy, or fix a slow dependency. Fairness matters too, because one long generation should not starve a steady stream of shorter requests.",
          engineer:
            "User-visible latency decomposes into queue delay, prefill, decode, and delivery spans that require separate instrumentation. Little's Law links concurrency, arrival rate, and time in system, while queueing makes tail latency rise sharply near saturation. Instrument client-visible timestamps and carry one correlation ID across gateway, scheduler, and worker. Use bounded queues, admission control, deadlines, cancellation, and tenant fairness. Reserve capacity for interactive traffic when batch workloads share the pool, and avoid retries that amplify overload. A failure mode is reporting only model execution time, hiding the delay that users actually experience before the first token arrives.",
          visualId: "queue-workers",
          visualCaption:
            "Queue wait, prefill execution, decode steps, and response delivery form the user-visible latency path.",
        },
      ],
      security: [
        {
          id: "prefill-admission-control",
          title: "Bound overload before it reaches workers",
          threat:
            "A traffic spike or retry storm can fill request queues and exhaust memory for every tenant.",
          control:
            "Use bounded queues, rate limits, admission control, deadline propagation, and tenant-aware fairness.",
          verify:
            "Apply a controlled overload and confirm requests are shed or queued within policy while healthy tenants retain service.",
        },
        {
          id: "prefill-cache-isolation",
          title: "Scope prefix reuse to authorized tenants",
          threat:
            "A scheduler may reuse prompt KV state across users to improve performance without an isolation boundary.",
          control:
            "Include tenant and access scope in prefix-cache keys and prohibit reuse when authorization differs.",
          verify:
            "Submit identical test prompts from separate tenants and confirm no cross-tenant prefix hit is recorded.",
        },
        {
          id: "prefill-priority-abuse",
          title: "Prevent priority inversion and starvation",
          threat:
            "An abusive client may repeatedly claim high priority or submit long jobs that delay ordinary users.",
          control:
            "Derive priority from trusted policy, enforce per-tenant quotas, and use weighted fair scheduling with aging.",
          verify:
            "Run competing high- and normal-priority workloads and confirm bounded waiting and no permanent starvation.",
        },
      ],
      quiz: [
        {
          id: "prefill-q1",
          topicId: "prefill-decode-batching",
          prompt: "In the manuscript analogy, why does prefill usually expose high arithmetic intensity?",
          choices: [
            "It processes many prompt tokens through large matrix operations",
            "It generates one token at a time",
            "It performs no attention",
            "It never writes a KV cache",
          ],
          answerIndex: 0,
          explanation:
            "Parallel prompt processing exposes arithmetic-heavy matrix operations with high weight reuse across tokens.",
          kind: "story-match",
        },
        {
          id: "prefill-q2",
          topicId: "prefill-decode-batching",
          prompt: "Why is low-batch decode usually memory-bandwidth-bound?",
          choices: [
            "It downloads the entire training set",
            "It reads weights and KV state for relatively little arithmetic",
            "It cannot use an accelerator",
            "It ignores previously generated tokens",
          ],
          answerIndex: 1,
          explanation:
            "Each decode step must move substantial model and cache state while producing only a small amount of computation.",
          kind: "tradeoff",
        },
        {
          id: "prefill-q3",
          topicId: "prefill-decode-batching",
          prompt: "What does continuous batching change?",
          choices: [
            "It removes causal decoding",
            "It makes all sequences the same length",
            "It adjusts batch membership at iteration boundaries as requests finish or arrive",
            "It eliminates queueing",
          ],
          answerIndex: 2,
          explanation:
            "Iteration-level scheduling fills newly available slots without waiting for an entire static batch to complete.",
          kind: "scenario",
        },
        {
          id: "prefill-q4",
          topicId: "prefill-decode-batching",
          prompt: "One tenant submits a burst of long prompts and repeated retries, filling queues and KV reservations while other tenants wait. Which mitigation best preserves service isolation?",
          choices: [
            "Remove per-tenant quotas so every request has equal queue access",
            "Let clients mark their retries as high priority",
            "Disable output limits whenever prefill latency rises",
            "Enforce tenant-aware admission control, token and concurrency quotas, bounded queues, deadlines, and fair scheduling before worker admission",
          ],
          answerIndex: 3,
          explanation:
            "Without trusted per-tenant limits, one client can monopolize scheduler and KV capacity; admission control and fairness bound resource consumption while protecting other tenants' latency and isolation.",
          kind: "security",
        },
      ],
    },
    {
      id: "quantization",
      slug: "quantization",
      trackId: "llm-inference",
      title: "Quantization: FP16, FP8, INT8, INT4",
      summary:
        "Trade numeric precision for memory and bandwidth savings while managing calibration, outliers, kernel support, and quality regressions.",
      minutes: 12,
      storyHook:
        "Packing more supplies into a smaller crate helps only if the labels remain precise enough to use them.",
      prerequisites: ["kv-cache-paged-attention"],
      steps: [
        {
          id: "quantization-formats",
          title: "Formats choose precision and exponent range",
          story:
            "At the packing bench, finely labeled containers preserve small quantities but occupy more space than compact containers with coarser markings, forcing a choice between precision, range, and supported handling on real hardware. A coarser cup is compact but may lose tiny measurements. Floating-point formats spend bits on a sign, exponent, and mantissa; integer formats store scaled values without that exponent structure. FP16 offers a broad practical baseline, while FP8, INT8, and INT4 reduce storage and bandwidth. The smallest format is not automatically the best choice, because dynamic range, hardware support, and the sensitivity of each tensor all matter.",
          engineer:
            "Numeric formats allocate bits differently among sign, exponent, mantissa, scaling metadata, and supported matrix kernels. FP16 remains a broad baseline, INT8 stores scaled integers, and INT4 packs two values per byte with efficient unpacking kernels. FP8 formats vary in exponent and mantissa allocation and often require scaling. INT8 represents scaled integer values, while INT4 packs two values per byte but needs appropriate unpacking kernels. Weight-only quantization can reduce memory traffic without quantizing every activation. Compare bytes per element, supported matrix kernels, dequantization cost, and accumulation precision. Do not assume a nominal bit width maps directly to end-to-end speed or quality.",
          visualId: "quantization",
          visualCaption:
            "Numeric formats trade bit width, dynamic range, scaling needs, and supported kernel behavior.",
        },
        {
          id: "quantization-granularity",
          title: "Scale precision per tensor, channel, or group",
          story:
            "At the shoe rack, different foot sizes need different fits, so smaller groups receive their own scales instead of one compromise, accepting extra bookkeeping to represent local ranges faithfully. Quantization scales work the same way: one scale for an entire tensor may be simple but poorly represent values with different ranges. A scale per output channel respects more local variation, while a scale per small group captures outliers more closely. Finer scales improve fidelity but add metadata and kernel complexity. The best granularity is the one that protects important values without turning savings into bookkeeping overhead.",
          engineer:
            "Quantization granularity trades metadata and kernel complexity for scales that better represent local activation or weight ranges. Per-tensor schemes minimize metadata, per-channel schemes adapt to output dimensions, and per-group schemes handle local outliers more effectively. Per-tensor schemes minimize metadata, per-channel schemes adapt to output dimensions, and per-group schemes handle local variation and outliers more effectively. Symmetric schemes use a scale around zero, while asymmetric schemes add a zero point; activation ranges also vary by input. Mixed precision often keeps sensitive layers or normalization operations in higher precision. Evaluate calibration data representativeness and test each supported kernel path for numerical consistency.",
          visualId: "quantization",
          visualCaption:
            "Quantization scales move from whole tensors to channels and groups as representation fidelity increases.",
        },
        {
          id: "quantization-calibration",
          title: "Calibration learns how to compress",
          story:
            "Before sealing the shipment, the mover inspects representative boxes for fragile contents and unusually heavy items, using those observations to choose packing rules that protect the values most likely to matter in production. Quantization calibration similarly observes representative activations or weight distributions before choosing scales. A tiny sample may miss the rare large value that matters most, while an unrepresentative sample can optimize for the wrong traffic. Post-training quantization applies these choices without full retraining, whereas quantization-aware training exposes the model to simulated precision effects during learning. Both approaches require quality evidence, not just a smaller file.",
          engineer:
            "Calibration estimates quantization scales from representative weights or activations before lower-precision kernels are evaluated against a full-precision baseline. Min-max, clipping, and learned rounding make different trade-offs between range coverage and resolution. Methods such as min-max, clipping, and learned rounding make different trade-offs between range coverage and resolution. Quantization-aware training inserts fake-quantization operations during training so the model can adapt, at higher computational and data cost. Watch for outlier channels, degraded tool formatting, reduced multilingual quality, and changes in refusal behavior. Keep an unquantized reference for comparison and evaluate the full pipeline, because retrieval and prompt changes can mask or amplify numeric errors.",
          visualId: "quantization",
          visualCaption:
            "Calibration data and granularity determine how faithfully a lower-precision representation preserves behavior.",
        },
        {
          id: "quantization-serving",
          title: "Measure the whole serving path",
          story:
            "At the loading dock, a smaller crate saves transport space but adds unpacking work, so the crew measures resident memory, latency, throughput, and task quality across the entire delivery path. Quantization can reduce bytes moved yet add scaling, packing, and conversion work that offsets part of the gain. The useful comparison includes memory capacity, time to first token, per-token latency, aggregate throughput, and task quality on the real hardware. A format that fits more models on one GPU may still disappoint if its kernels are immature. Production decisions therefore need both a performance experiment and a quality gate.",
          engineer:
            "A quantization release must benchmark resident memory, prefill, decode, queueing, and quality on the exact serving stack. Report model, hardware, batch shapes, sequence lengths, and software versions so another team can reproduce the comparison. Measure resident memory, KV-cache compatibility, prefill, decode, and queue delay. Quantized weights may leave KV cache or activations in another format, so total savings differ from the headline weight reduction. Require task evaluations and safety regressions to pass before rollout, then monitor canaries. Avoid universal claims: the benefit is model- and workload-dependent, and any broad speed estimate should be described only as an order-of-magnitude expectation until measured.",
          visualId: "quantization",
          visualCaption:
            "A quantization release gates memory, latency, throughput, and task quality on the actual serving stack.",
        },
      ],
      security: [
        {
          id: "quantization-model-integrity",
          title: "Verify quantized artifact integrity",
          threat:
            "A modified quantized model can change behavior while appearing to be a routine size optimization.",
          control:
            "Use signed artifacts, immutable digests, approved conversion tooling, and reproducible build records.",
          verify:
            "Compare source and converted artifact manifests and rerun integrity and behavior checks before deployment.",
        },
        {
          id: "quantization-safety-regression",
          title: "Gate safety behavior after compression",
          threat:
            "Lower precision may increase harmful outputs, weaken refusal behavior, or corrupt structured safety controls.",
          control:
            "Run the full security and guardrail evaluation suite on the exact quantized artifact, not only on its source model.",
          verify:
            "Require held-out security cases and red-team-approved scenarios to meet the same release thresholds as the baseline.",
        },
        {
          id: "quantization-calibration-privacy",
          title: "Protect calibration data",
          threat:
            "Calibration samples may contain private prompts or proprietary activations copied into build systems and caches.",
          control:
            "Use approved synthetic or redacted data, restrict build access, and expire intermediate activation artifacts.",
          verify:
            "Scan calibration stores and CI logs for sensitive fixtures and confirm retention jobs remove temporary tensors.",
        },
      ],
      quiz: [
        {
          id: "quantization-q1",
          topicId: "quantization",
          prompt: "What is the main benefit of lower-bit quantization?",
          choices: [
            "It removes the need for evaluation",
            "It reduces storage and often memory traffic",
            "It guarantees better quality",
            "It eliminates all kernel overhead",
          ],
          answerIndex: 1,
          explanation:
            "Lower-bit representations use fewer bytes, but speed and quality depend on kernels, granularity, and the workload.",
          kind: "tradeoff",
        },
        {
          id: "quantization-q2",
          topicId: "quantization",
          prompt: "Why use per-group scales instead of one scale per tensor?",
          choices: [
            "To eliminate metadata",
            "To make all values identical",
            "To represent local ranges and outliers more faithfully",
            "To increase the bit width",
          ],
          answerIndex: 2,
          explanation:
            "Finer granularity adapts scales to local value distributions, improving fidelity at the cost of extra metadata and complexity.",
          kind: "tradeoff",
        },
        {
          id: "quantization-q3",
          topicId: "quantization",
          prompt: "What must happen before shipping a quantized model?",
          choices: [
            "Only check the file size",
            "Assume the source model's results transfer unchanged",
            "Disable structured output validation",
            "Benchmark and evaluate the exact artifact on representative tasks and security cases",
          ],
          answerIndex: 3,
          explanation:
            "Quantization can change performance and behavior, so the exact artifact needs both performance and quality gates.",
          kind: "security",
        },
        {
          id: "quantization-q4",
          topicId: "quantization",
          prompt: "In the packing analogy, why might a four-bit crate not shrink the whole shipment fourfold?",
          choices: [
            "Because activations, KV cache, scales, and other tensors may remain higher precision",
            "Because integers cannot be stored",
            "Because the vocabulary doubles",
            "Because attention disappears",
          ],
          answerIndex: 0,
          explanation:
            "Only selected tensors may be quantized, and metadata plus higher-precision runtime state reduce the end-to-end savings.",
          kind: "story-match",
        },
      ],
    },
    {
      id: "latency-cost-budgets",
      slug: "latency-cost-budgets",
      trackId: "llm-inference",
      title: "Latency, Throughput, and Cost Budgets",
      summary:
        "Build service budgets from time to first token, per-token latency, queueing, utilization, and cost per successful task.",
      minutes: 11,
      storyHook:
        "A delivery promise covers the wait, preparation, journey, and handoff, not merely the engine's horsepower.",
      prerequisites: ["prefill-decode-batching", "quantization"],
      steps: [
        {
          id: "latency-metrics",
          title: "Name the latency the user feels",
          story:
            "At the restaurant entrance, the host records waiting separately from kitchen preparation and delivery because the diner experiences every span from arrival to the completed meal. Reporting only cooking time would miss most of the experience. LLM serving has a similar chain: admission wait, prefill, first-token delay, inter-token generation, and network delivery. Time to first token describes how quickly the response begins, while total completion time describes when the full answer arrives. A streaming interface can feel responsive before the answer is complete, but it does not eliminate the underlying work or cost.",
          engineer:
            "Time to first token, inter-token latency, total completion time, and queue delay are distinct measurements. Track p50, p95, and p99 by model, route, input length, output length, and tenant class. Track p50, p95, and p99 by model, route, input length, output length, and tenant class. Percentiles matter because averages hide the slow requests that dominate user frustration. Use client-visible timestamps where possible and carry a request ID across gateway, scheduler, and worker. A failure mode is optimizing time to first token with tiny output reservations while long completions queue behind an unsafe level of admitted concurrency.",
          visualId: "traffic-flow",
          visualCaption:
            "Admission, queue, prefill, token generation, and delivery spans combine into user-visible latency.",
        },
        {
          id: "latency-throughput",
          title: "Throughput grows until latency bends",
          story:
            "On the workshop floor, keeping every bench busy raises output until crowding slows individual jobs and the service loses its latency margin, so capacity plans reserve headroom for bursts and failures rather than chasing peak throughput. Inference throughput rises with batching and utilization, yet queue delay and contention increase sharply near saturation. The best operating point is not always the point with the highest tokens per second. It is the point that meets latency objectives with enough headroom for bursts, failures, and uneven prompt lengths. Capacity plans need both a rate and a concurrency envelope, not a single optimistic average.",
          engineer:
            "Little's Law links arrival rate, concurrency, and time in system, while tail latency grows near saturation. Measure arrival patterns, prompt-length distributions, output limits, and burstiness instead of sizing from aggregate token throughput alone. Two systems can share aggregate token throughput while only one meets p99 latency under small bursts. Measure arrival patterns, prompt-length distributions, output-length limits, and burstiness. Keep headroom for failover and avoid running interactive pools at their theoretical maximum. A failure mode is sizing from aggregate token throughput alone; two systems can share that number while one delivers acceptable p99 latency and the other collapses under small bursts.",
          visualId: "queue-workers",
          visualCaption:
            "Batching raises token throughput until queueing and resource contention bend the latency curve.",
        },
        {
          id: "latency-cost",
          title: "Count cost per successful task",
          story:
            "At the tool crib, a cheap device that fails twice costs more than a reliable device that finishes the job once, so total spending is divided by successfully completed goals. LLM cost should include input tokens, output tokens, retrieval, tool calls, retries, abandoned streams, and the infrastructure kept warm for latency. Dividing that total by successfully completed user goals reveals the real unit economics. A workflow can look efficient per token while wasting money on repeated agent loops or oversized context. Cost optimization must preserve the product outcome, not merely shrink the largest line on the invoice.",
          engineer:
            "Cost per successful task divides all token, retrieval, tool, retry, observability, and capacity spending by completed goals. Include failed and retried attempts, because reliability problems create hidden demand that token-price dashboards often miss. Measure cost per successful task and cost per accepted request as complementary metrics. Include failed and retried attempts, because reliability problems create hidden demand. Use routing or smaller models only when task evaluations support the change, and compare quality-adjusted outcomes. A failure mode is reporting accelerator utilization as a cost measure without connecting it to useful completed work.",
          visualId: "token-math",
          visualCaption:
            "Token, retry, retrieval, tool, and capacity costs roll up into cost per successful task.",
        },
        {
          id: "latency-budget",
          title: "Turn objectives into testable budgets",
          story:
            "Before construction begins, the project manager assigns each team an allowance so expensive surprises cannot silently consume the total budget, and proposed changes must fit the remaining headroom. An inference budget does the same for latency and money. The team chooses target percentiles, reserves a share for queueing and network overhead, and sets maximum input and output envelopes. Experiments then test whether a proposed model, cache policy, or batching change fits the remaining allowance. When two options trade first-token speed against completion speed, the budget makes that trade explicit instead of leaving it to benchmark folklore.",
          engineer:
            "A service budget subtracts fixed overhead and allocates the remainder across admission, prefill, decode, and safety checks. Set quality floors and cost ceilings, then run representative load tests with mixed sequence lengths and failures. Set explicit quality floors and cost ceilings, then run representative load tests with mixed sequence lengths and failures. Record model versions, hardware, kernels, batch policy, and cache settings so results can be reproduced. Use staged rollout to validate production assumptions. Avoid fake precision: when evidence is limited, describe expected effects as an order of magnitude and replace them with measured values before committing capacity.",
          visualId: "deploy-strategies",
          visualCaption:
            "Latency, quality, and cost ceilings become reproducible load-test gates and staged rollout criteria.",
        },
      ],
      security: [
        {
          id: "latency-tenant-quotas",
          title: "Budget resources per tenant",
          threat:
            "One tenant can consume the shared latency and cost budget through excessive concurrency, long outputs, or retries.",
          control:
            "Apply per-tenant rate, token, concurrency, and spend limits with trusted identity and fair scheduling.",
          verify:
            "Exercise quota boundaries and confirm excess demand is rejected or queued without degrading other tenants.",
        },
        {
          id: "latency-safe-degradation",
          title: "Degrade without bypassing safety",
          threat:
            "Pressure to reduce latency may disable authorization, redaction, or approval checks on a fallback path.",
          control:
            "Keep security controls mandatory across primary, cached, routed, and degraded serving paths.",
          verify:
            "Trigger each fallback mode and confirm the same tenant checks, tool approvals, and output protections execute.",
        },
        {
          id: "latency-trace-privacy",
          title: "Keep budget telemetry free of sensitive payloads",
          threat:
            "Latency traces may capture prompts, outputs, retrieval text, or tool arguments that exceed their operational purpose.",
          control:
            "Collect timing and shape metadata, redact identifiers, and enforce sampling and retention policies.",
          verify:
            "Inspect exported traces and dashboards with seeded sensitive data and confirm only approved metadata remains.",
        },
      ],
      quiz: [
        {
          id: "latency-q1",
          topicId: "latency-cost-budgets",
          prompt: "In the restaurant analogy, what does time to first token measure?",
          choices: [
            "Total training time",
            "How long the complete answer takes",
            "Delay before the first generated token becomes visible",
            "Only database lookup time",
          ],
          answerIndex: 2,
          explanation:
            "Time to first token captures responsiveness up to the start of generation, not completion of the full answer.",
          kind: "story-match",
        },
        {
          id: "latency-q2",
          topicId: "latency-cost-budgets",
          prompt: "Why can aggregate tokens per second be misleading?",
          choices: [
            "Because tokens have no cost",
            "Because high throughput may coexist with unacceptable p99 latency or queue delay",
            "Because it ignores model architecture entirely",
            "Because output length never matters",
          ],
          answerIndex: 1,
          explanation:
            "Batching can raise aggregate throughput while individual requests slow down, especially near saturation.",
          kind: "tradeoff",
        },
        {
          id: "latency-q3",
          topicId: "latency-cost-budgets",
          prompt: "Which metric best captures economic efficiency?",
          choices: [
            "Cost per successful task",
            "GPU count alone",
            "Vocabulary size",
            "Average prompt length alone",
          ],
          answerIndex: 0,
          explanation:
            "Cost per successful task includes failures and retries and connects spending to useful user outcomes.",
          kind: "tradeoff",
        },
        {
          id: "latency-q4",
          topicId: "latency-cost-budgets",
          prompt: "What should a degraded serving path preserve?",
          choices: [
            "Only token metering",
            "Unbounded context",
            "Shared administrator credentials",
            "The same authorization, redaction, and approval controls",
          ],
          answerIndex: 3,
          explanation:
            "Performance fallbacks must not become security bypasses; mandatory controls apply on every route.",
          kind: "security",
        },
      ],
    },
    {
      id: "pretraining-posttraining",
      slug: "pretraining-posttraining",
      trackId: "llm-inference",
      title: "Pre-training vs Post-training: SFT, RLHF, DPO",
      summary:
        "Distinguish next-token pretraining from supervised fine-tuning and preference optimization, and evaluate each stage with appropriate data discipline.",
      minutes: 14,
      storyHook:
        "A model first learns language from a library, then practices tasks with examples, and finally learns preferences from comparisons.",
      prerequisites: ["backprop-optimizers", "probability-information"],
      steps: [
        {
          id: "pretraining-next-token",
          title: "Pretraining learns statistical structure",
          story:
            "Inside the vast library, every passage becomes a prediction exercise as the reader continually guesses which word arrives next, learning broad patterns without completing a formal worksheet or receiving product policy for each task. Next-token pretraining works in that spirit: the model sees a sequence and learns to predict what comes next. Repeating this objective across varied data builds broad representations and capabilities. It does not guarantee that every learned statement is true or that the model will follow a product's instructions, which is why pretraining alone is not a complete alignment or deployment strategy.",
          engineer:
            "Next-token pretraining minimizes cross-entropy between the model's predicted distribution and the following token target across packed sequences. Tokenization, data mixture, sequence packing, optimizer settings, compute budget, and checkpoint selection all shape the learned result. Tokenization, data mixture, sequence packing, optimizer settings, compute budget, and checkpoint selection all shape the result. Training scales approximately with model size, dataset size, and compute, but useful scaling laws are empirical rather than universal. Data quality and contamination matter as much as volume. Keep evaluation data separate, document provenance and licenses, and monitor loss by domain so an average score cannot hide poor performance on a critical language or task.",
          visualId: "training-stages",
          visualCaption:
            "A pretraining corpus supplies next-token targets whose prediction loss shapes broad model representations.",
        },
        {
          id: "pretraining-sft",
          title: "SFT teaches task behavior with demonstrations",
          story:
            "At the support desk, a new employee studies accurate replies, structured reports, careful refusals, and difficult exceptions, using guided examples to practice the formats, tone, and judgment required before handling live cases with real users. Supervised fine-tuning provides that guided practice. Each example pairs an input with the desired output, teaching format, tone, and task conventions that the base model did not prioritize. The examples must be accurate, diverse, and consistent with the product's policy. Too many narrow demonstrations can make the model imitate a template while losing flexibility; too few leave behavior inconsistent.",
          engineer:
            "Supervised fine-tuning minimizes loss on curated prompt-response pairs to shape task behavior and output format. Initialize from a pretrained model and mask prompt tokens where appropriate so updates focus on the desired response. Data design should cover intended tasks, edge cases, tool-use formats, languages, and refusal or clarification behavior. Evaluate generalization to unseen task variants rather than rewarding memorized demonstrations. Split data to detect memorization and distribution shift, and evaluate generalization to unseen task variants. A failure mode is treating demonstration quality as a labeling chore; contradictory or insecure examples teach contradictory and insecure behavior.",
          visualId: "training-stages",
          visualCaption:
            "Curated input-output demonstrations shape task format, behavior, and policy-consistent responses.",
        },
        {
          id: "pretraining-rlhf",
          title: "RLHF learns from human preferences",
          story:
            "At the review table, two grammatical drafts are compared for helpfulness, accuracy, and appropriateness, providing a preference signal that can guide later choices while inheriting the reviewers' biases, inconsistencies, and blind spots. Reinforcement learning from human feedback uses those comparisons to shape behavior beyond a single demonstration. A reward model learns to predict preferences, then an optimizer adjusts the policy while a reference model helps prevent excessive drift. The process can improve nuanced qualities, but it also inherits biases and inconsistencies from the people, instructions, and examples used to create the preference data.",
          engineer:
            "A common RLHF pipeline trains a reward model, then optimizes policy against that proxy with a KL constraint to a reference policy. Pairwise or ranked outputs provide preference labels, while annotator guidance and agreement checks determine whether those labels are trustworthy. Reward models are imperfect proxies and can be gamed or overfit, so monitor reward alongside independent task and safety evaluations. Preference data needs annotator guidance, inter-annotator agreement checks, and privacy controls. Avoid optimizing a proxy score without measuring real outcomes, because high reward can coexist with verbosity, bias, or confident errors.",
          visualId: "training-stages",
          visualCaption:
            "Human comparisons train a reward proxy that guides policy updates while independent evaluations check real behavior.",
        },
        {
          id: "pretraining-dpo",
          title: "DPO optimizes preferences without a separate reward loop",
          story:
            "In the kitchen, a coach compares two dishes and identifies the preferred one directly, without building a separate machine to score every future meal, though the chef still needs clear standards, representative practice, regularization, and held-out review before service with diners. Direct preference optimization follows a similar simplification. It uses preferred and rejected response pairs to adjust the model directly through a classification-style objective relative to a reference policy. This removes parts of the classic RLHF training loop, but it does not remove the need for good preference data, regularization, held-out evaluation, or monitoring for regressions.",
          engineer:
            "DPO derives an implicit reward from policy and reference log-probability ratios to prefer selected responses. The objective increases the preferred response's log-probability margin relative to the rejected response under a frozen reference policy. Compared with a full RLHF pipeline, it can reduce training complexity and infrastructure, but it remains sensitive to data quality, preference strength, and reference-policy choice. Evaluate helpfulness, factuality, safety, calibration, and diversity on held-out tasks. A failure mode is assuming a simpler optimizer produces automatically safer behavior; post-training is not a substitute for access controls and runtime guardrails.",
          visualId: "training-stages",
          visualCaption:
            "Preferred and rejected pairs adjust policy likelihood relative to a frozen reference model.",
        },
      ],
      security: [
        {
          id: "pretraining-data-provenance",
          title: "Govern training-data provenance",
          threat:
            "Unlicensed, poisoned, or privacy-sensitive data can enter a model and remain difficult to remove after training.",
          control:
            "Track source and consent, deduplicate, screen for sensitive material, and maintain approved dataset versions and licenses.",
          verify:
            "Audit a sample from source to training manifest and confirm provenance, retention, and access records are complete.",
        },
        {
          id: "pretraining-contamination",
          title: "Keep evaluation data out of training",
          threat:
            "Evaluation examples leaked into training can inflate results and hide security or capability regressions.",
          control:
            "Use contamination checks, access-separated held-out sets, and versioned data lineage across every training stage.",
          verify:
            "Run near-duplicate and membership-style checks against held-out benchmarks before publishing results.",
        },
        {
          id: "pretraining-preference-privacy",
          title: "Protect preference and demonstration data",
          threat:
            "Human labels, rejected outputs, and support conversations may contain personal, confidential, or tenant-specific information.",
          control:
            "Redact sensitive fields, restrict annotator access, minimize retained examples, and enforce tenant separation.",
          verify:
            "Inspect labeling tools and exports with seeded sensitive fixtures and confirm unauthorized annotators cannot view them.",
        },
      ],
      quiz: [
        {
          id: "pretraining-q1",
          topicId: "pretraining-posttraining",
          prompt: "In the library analogy, what learning objective drives next-token pretraining?",
          choices: [
            "Predict the next token from preceding context",
            "Rank every deployment platform",
            "Enforce user permissions",
            "Optimize Kubernetes scheduling",
          ],
          answerIndex: 0,
          explanation:
            "Next-token prediction builds broad sequence representations and capabilities, but it does not itself enforce product policy.",
          kind: "story-match",
        },
        {
          id: "pretraining-q2",
          topicId: "pretraining-posttraining",
          prompt: "What does SFT primarily learn from?",
          choices: [
            "Unlabeled infrastructure logs",
            "Preferred and rejected pairs only",
            "Curated input-output demonstrations",
            "Database authorization rules",
          ],
          answerIndex: 2,
          explanation:
            "Supervised fine-tuning trains on desired prompt-response demonstrations to shape task behavior and format.",
          kind: "scenario",
        },
        {
          id: "pretraining-q3",
          topicId: "pretraining-posttraining",
          prompt: "Why monitor independent evaluations during RLHF?",
          choices: [
            "Because reward models are perfect",
            "Because the learned reward proxy can be gamed or diverge from real quality and safety",
            "Because preferences are always objective",
            "Because training data cannot affect behavior",
          ],
          answerIndex: 1,
          explanation:
            "A reward model is an imperfect proxy, so reward improvements must be checked against task and safety outcomes.",
          kind: "security",
        },
        {
          id: "pretraining-q4",
          topicId: "pretraining-posttraining",
          prompt: "What does DPO simplify relative to a common RLHF pipeline?",
          choices: [
            "It removes the need for preference data",
            "It replaces runtime authorization",
            "It eliminates all evaluation",
            "It optimizes preferences directly without a separate reward-model training loop",
          ],
          answerIndex: 3,
          explanation:
            "DPO uses preference pairs directly with a reference policy, reducing pipeline complexity while retaining data and evaluation requirements.",
          kind: "tradeoff",
        },
      ],
    },
  ],
};

export const trackInference: Track = inferenceTrack;

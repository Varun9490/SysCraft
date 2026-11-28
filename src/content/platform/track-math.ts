import type { Track } from "@/learning/platform/types";

const mathTrack: Track & { trackId: string } = {
  id: "ml-math",
  slug: "ml-math",
  trackId: "ml-math",
  title: "ML Mathematics and the Paper Decoder",
  summary:
    "Build geometric, probabilistic, optimization, and attention intuition, then learn to unpack unfamiliar paper equations one symbol at a time.",
  accent: "indigo",
  lessons: [
    {
      id: "linear-algebra",
      slug: "linear-algebra",
      trackId: "ml-math",
      title: "Linear Algebra Intuition",
      summary:
        "Read vectors as coordinates, dot products as weighted agreement, matrices as transformations, and decompositions as useful changes of viewpoint.",
      minutes: 11,
      storyHook:
        "Linear algebra is the geometry of labeled jars, mixing tables, and maps between spaces.",
      prerequisites: [],
      steps: [
        {
          id: "linear-vectors",
          title: "A vector is a list with a coordinate system",
          story:
            "A recipe card might list flour, sugar, and butter in fixed positions. The numbers are meaningful only because everyone agrees which jar each position represents. A vector works the same way: its entries belong to named dimensions, and its coordinate system gives them meaning. An embedding vector may have hundreds of dimensions that are not directly interpretable, but each position is still a coordinate. Reordering dimensions without reordering the corresponding weights changes the represented object, just as swapping flour and salt labels ruins a recipe. A shape check catches the mistake before a downstream layer silently interprets the wrong feature.",
          engineer:
            "Model an n-dimensional vector as x ∈ ℝⁿ, an ordered array whose declared shape and coordinate basis give each entry meaning. Tensor axes extend this idea to batches and sequences. Adding vectors combines coordinates componentwise, while scalar multiplication rescales them. In ML, vectors can represent token states, embeddings, gradients, or model updates. Keep shapes and conventions explicit, because silent broadcasting or a transposed batch dimension can produce valid arithmetic with invalid meaning. Normalization changes magnitude but may preserve direction, which is often the useful signal for similarity. Test zero vectors and singleton batches because these limiting cases expose unsafe division and accidental axis removal.",
          visualId: "notation-decoder",
          visualCaption:
            "Each vector entry occupies a named coordinate position within an agreed dimensional space.",
        },
        {
          id: "linear-dot-products",
          title: "Dot products measure weighted agreement",
          story:
            "Imagine two people rating the same features of a house. If they both value a quiet street and a short commute, multiplying their ratings and summing gives a high agreement score. If one values space while the other values nightlife, their priorities may point in different directions. A dot product combines two vectors coordinate by coordinate. Its sign and magnitude reflect alignment, but magnitude also depends on vector length. Normalizing the vectors turns cosine similarity into a measure of direction that is easier to compare across documents. The analogy also explains why two vectors with identical directions can still receive different raw scores when their lengths differ.",
          engineer:
            "The dot product xᵀy = Σᵢ xᵢyᵢ measures coordinatewise agreement and satisfies xᵀy = ||x|| ||y|| cos θ. This identity connects algebra to geometry. Cosine similarity normalizes by the norms and is common for embeddings, but only when the chosen representation makes direction meaningful. Large norms can dominate unnormalized scores, and a high score does not prove semantic correctness. In attention, query-key dot products are scaled before softmax so their magnitude does not grow excessively with head dimension and destabilize the distribution. For zero-norm inputs, define an explicit fallback rather than allowing division by zero to propagate.",
          visualId: "rag-space",
          visualCaption:
            "Coordinatewise products accumulate into a dot product whose normalized form measures directional alignment.",
        },
        {
          id: "linear-matrix-shapes",
          title: "Matrix multiplication chains compatible shapes",
          story:
            "A mixing table takes ingredients from one set of jars and produces a new set of blended jars. Each output jar receives a weighted contribution from every input jar. A matrix stores those weights, and matrix multiplication applies the table to a vector. If a table expects three ingredients, handing it four creates no meaningful recipe unless the interface is changed. The same shape discipline governs neural-network layers, attention projections, and batches: the inner dimensions must agree before the operation has a useful interpretation. A quick paper shape table catches these mismatches before a single expensive tensor is allocated.",
          engineer:
            "Matrix multiplication requires A ∈ ℝ^{m×k} and B ∈ ℝ^{k×n}, producing C ∈ ℝ^{m×n}; each entry sums over k. The contraction dimension must match. In transformers, a batch of token states may have shape batch by sequence by d_model; projection weights have shape d_model by projection width. Broadcasting can simplify batch handling, but it must preserve axis semantics. Matrix multiplication cost scales with the output dimensions and contraction length, which is why large projection matrices and long sequences create compute and memory bottlenecks. Profile both arithmetic intensity and memory traffic, because a shape-valid multiplication can still exceed the serving latency budget.",
          visualId: "notation-decoder",
          visualCaption:
            "Compatible matrices transform vectors by contracting matching dimensions and producing a new output shape.",
        },
        {
          id: "linear-decomposition",
          title: "Decompositions reveal structure and numerical risk",
          story:
            "A complicated shadow can become easier to understand when you rotate the object and view it from a different angle. Matrix decompositions provide similar changes of viewpoint. They can expose dominant directions, compress a representation, solve a system, or reveal that two inputs are nearly indistinguishable. But a transformation that looks elegant on paper may amplify tiny numerical errors when its directions are badly scaled. Good engineers treat decomposition as both an explanatory tool and a warning label about conditioning. Rotating the viewpoint does not remove the underlying sensitivity; it makes that sensitivity easier to inspect and control.",
          engineer:
            "Eigen decomposition writes A = QΛQ⁻¹ for a diagonalizable square matrix, while singular value decomposition writes A = UΣVᵀ for a general matrix. These tools support dimensionality reduction, least squares, and stability analysis. A high condition number means small input perturbations can cause large output changes. Floating-point rounding, poor scaling, and nearly dependent features can therefore destabilize training or inference. Normalize inputs where appropriate, use stable numerical routines, and inspect condition numbers when solving systems rather than assuming an exact inverse is safe. Compare reconstructed outputs with the original matrix and test perturbations when numerical correctness matters.",
          visualId: "notation-decoder",
          visualCaption:
            "Decompositions rotate and scale a matrix to expose dominant directions and conditioning risks.",
        },
      ],
      security: [
        {
          id: "linear-shape-validation",
          title: "Validate tensor shapes at trust boundaries",
          threat:
            "Unvalidated user-controlled dimensions or model outputs can trigger excessive allocations or malformed downstream operations.",
          control:
            "Enforce explicit shape, rank, size, and numeric-type limits before allocation or matrix operations.",
          verify:
            "Submit boundary-sized and malformed tensors and confirm rejection occurs before expensive computation.",
        },
        {
          id: "linear-numeric-stability",
          title: "Prevent numerical denial of service",
          threat:
            "Extreme values, NaN inputs, or ill-conditioned matrices can crash a service or consume disproportionate debugging resources.",
          control:
            "Reject non-finite values, bound input ranges, use stable normalization, and monitor numerical-health metrics.",
          verify:
            "Test extreme and non-finite fixtures and confirm safe rejection without worker-wide failure.",
        },
        {
          id: "linear-embedding-isolation",
          title: "Protect sensitive embedding stores",
          threat:
            "Embedding vectors and their metadata can reveal private documents or enable cross-tenant similarity searches.",
          control:
            "Encrypt vector stores, attach tenant scope, authorize every query, and minimize retained metadata.",
          verify:
            "Run cross-tenant nearest-neighbor tests and inspect exports for unauthorized vectors or source identifiers.",
        },
      ],
      quiz: [
        {
          id: "linear-q1",
          topicId: "linear-algebra",
          prompt: "What makes vector coordinates meaningful?",
          choices: [
            "Their color in a diagram",
            "An agreed coordinate system and dimension order",
            "Their sum always being one",
            "Using only two dimensions",
          ],
          answerIndex: 1,
          explanation:
            "A vector's entries are interpreted through a shared basis and axis ordering; without that convention, arithmetic can be valid but meaningless.",
          kind: "story-match",
        },
        {
          id: "linear-q2",
          topicId: "linear-algebra",
          prompt: "Why normalize vectors for cosine similarity?",
          choices: [
            "To remove magnitude and compare direction",
            "To eliminate all dimensions",
            "To make every vector identical",
            "To avoid storing any values",
          ],
          answerIndex: 0,
          explanation:
            "Cosine similarity divides the dot product by both norms, measuring directional alignment rather than raw magnitude.",
          kind: "tradeoff",
        },
        {
          id: "linear-q3",
          topicId: "linear-algebra",
          prompt: "If A is m by k, what shape must B have for A times B to be valid?",
          choices: [
            "m by n",
            "n by k",
            "k by n",
            "Any shape because broadcasting fixes it",
          ],
          answerIndex: 2,
          explanation:
            "The inner dimensions must match: A's k columns contract with B's k rows, producing an m by n result.",
          kind: "scenario",
        },
        {
          id: "linear-q4",
          topicId: "linear-algebra",
          prompt: "Which control protects an inference service from malicious tensor dimensions?",
          choices: [
            "Allocate first and validate the result afterward",
            "Trust client-supplied shape hints",
            "Log the request only after multiplication completes",
            "Reject invalid shapes, ranks, sizes, and non-finite values before allocation",
          ],
          answerIndex: 3,
          explanation:
            "Validating shape, rank, size, and numeric values at the trust boundary prevents excessive allocation and malformed computation.",
          kind: "security",
        },
      ],
    },
    {
      id: "probability-information",
      slug: "probability-information",
      trackId: "ml-math",
      title: "Probability and Information Theory",
      summary:
        "Use distributions, expectation, conditional probability, entropy, cross-entropy, and KL divergence to reason about uncertainty and learning signals.",
      minutes: 12,
      storyHook:
        "Probability is a weather forecast for uncertainty; information theory measures how surprising an outcome was.",
      prerequisites: ["linear-algebra"],
      steps: [
        {
          id: "probability-distributions",
          title: "A distribution assigns belief to outcomes",
          story:
            "A weather forecast does not claim that rain is simply true or false. It assigns weight to several futures and updates those weights as clouds arrive. A probability distribution does the same for a set of outcomes. The weights must be nonnegative and sum to one for a discrete variable. Expected value summarizes the center of those possibilities, while variance describes their spread. A confident forecast and a cautious forecast can share the same average yet carry very different operational risk. That is why two forecasts with the same expected temperature can imply very different decisions about closing an outdoor venue.",
          engineer:
            "For a discrete random variable X with probabilities pᵢ, expectation is E[X] = Σᵢ xᵢpᵢ and variance is Var(X) = Σᵢ pᵢ(xᵢ − E[X])². Probabilities must remain normalized, and numerical implementations need stable summation. In ML, distributions describe targets, predictions, sampling, and uncertainty. A model can output plausible marginals while missing correlations between outcomes, so calibration and joint behavior matter. Never interpret an uncalibrated softmax score as a guaranteed real-world probability without evaluating it against representative labels. Check normalization after every transformation and use compensated or stable summation when many small probabilities contribute.",
          visualId: "notation-decoder",
          visualCaption:
            "A normalized distribution distributes belief across outcomes, with expectation and variance summarizing its behavior.",
        },
        {
          id: "probability-conditional",
          title: "Conditional probability updates with evidence",
          story:
            "Suppose a wet sidewalk makes rain more likely, but rain is not the only way the sidewalk became wet. Conditional probability keeps the alternative explanations visible instead of jumping to a single cause. Bayes' rule connects the likelihood of evidence under a hypothesis with the prior probability of that hypothesis. In a classifier, the evidence might be a document and the hypothesis might be a label. The rule gives a disciplined way to update belief, provided the likelihood model and prior are appropriate for the actual data. A useful check is to ask which alternative causes could produce the same evidence and whether the model represents them.",
          engineer:
            "Bayes' rule states p(h | e) = p(e | h)p(h) / p(e), so the posterior is proportional to likelihood times prior and normalized across hypotheses. The denominator is the total evidence probability. Common mistakes include treating likelihood as posterior, ignoring base rates, and assuming independent evidence when features are correlated. Naive Bayes illustrates the intuition but often underestimates dependence. Neural classifiers learn complex likelihood-like mappings, yet calibration still needs measurement because optimization loss does not automatically produce reliable probabilities. Test base-rate changes and correlated features, because both can overturn an apparently strong posterior.",
          visualId: "notation-decoder",
          visualCaption:
            "Evidence multiplies a prior likelihood before normalization produces an updated posterior belief.",
        },
        {
          id: "probability-entropy",
          title: "Entropy measures uncertainty; cross-entropy scores predictions",
          story:
            "A coin that always lands heads carries little surprise. A fair coin carries more because each result is uncertain. Entropy summarizes that expected surprise across outcomes. Cross-entropy compares a true distribution with a predicted distribution and grows when the prediction assigns low probability to what actually happens. Language-model training turns this idea into a practical objective: the correct next token should receive higher probability than incorrect alternatives. The logarithm makes tiny probabilities manageable and connects surprise to the number of bits needed for efficient coding. A rarer outcome contributes more surprise, which is why assigning it tiny probability can sharply increase the penalty.",
          engineer:
            "Shannon entropy is H(p) = −Σᵢ pᵢ log pᵢ, and cross-entropy is H(p,q) = −Σᵢ pᵢ log qᵢ, with the log base determining the unit. Cross-entropy measures the average code length or penalty under true distribution p and predicted q. For one-hot language targets, it reduces to negative log-probability of the target token. Use log-softmax and numerically stable loss implementations to avoid underflow. Lower training loss indicates better fit to the training distribution, not guaranteed truth, generalization, calibration, or safety. Evaluate held-out data and task behavior separately. Include perfectly predictable and highly uncertain fixtures to verify both zero-loss limits and smooth finite gradients.",
          visualId: "notation-decoder",
          visualCaption:
            "Entropy summarizes uncertainty while cross-entropy penalizes low probability assigned to observed outcomes.",
        },
        {
          id: "probability-kl-sampling",
          title: "KL divergence compares distributions",
          story:
            "Two maps can guide the same traveler yet disagree about how likely each route is. KL divergence measures how one distribution differs from a reference, but it is directional: comparing the traveler's map with the official map is not identical to reversing the roles. In language-model post-training, a KL penalty discourages the updated policy from moving too far from a reference. Sampling temperature changes the sharpness of the output distribution, affecting diversity and predictability without changing the underlying model's knowledge. The map analogy also warns that reversing the comparison can overweight outcomes the first distribution considered unlikely.",
          engineer:
            "KL(p || q) = Σ p log(p/q) is nonnegative and equals zero when the distributions match, with conventions for zero probabilities. It is not symmetric and should not be treated as a geometric distance. Temperature-scaled softmax divides logits by a positive temperature before normalization: lower values sharpen the distribution, higher values flatten it. This can change repetition, diversity, and tool-format reliability. Calibration, top-p filtering, and deterministic decoding are separate controls. Evaluate sampling settings on the actual task rather than assuming lower temperature always improves correctness. Test zero-probability supports explicitly so the implementation's limiting conventions remain deliberate and reproducible.",
          visualId: "notation-decoder",
          visualCaption:
            "Directional KL compares a policy with a reference while temperature reshapes the sampling distribution.",
        },
      ],
      security: [
        {
          id: "probability-calibration",
          title: "Do not present uncalibrated confidence as certainty",
          threat:
            "Users may authorize consequential actions based on model scores that are not calibrated to real event frequencies.",
          control:
            "Measure calibration, label uncertainty clearly, and require independent policy or human approval for high-impact decisions.",
          verify:
            "Compare predicted confidence with observed outcomes on held-out segments and inspect decision thresholds for overconfidence.",
        },
        {
          id: "probability-privacy",
          title: "Control membership and leakage signals",
          threat:
            "Overconfident or memorized predictions can reveal that sensitive examples appeared in training data.",
          control:
            "Use approved data governance, deduplication, access controls, and membership-style evaluation with redacted fixtures.",
          verify:
            "Run privacy review and contamination checks before release and investigate suspiciously exact outputs.",
        },
        {
          id: "probability-sampling-limits",
          title: "Bound stochastic behavior",
          threat:
            "High-variance sampling can produce inconsistent tool arguments, unsafe format choices, or unpredictable tenant behavior.",
          control:
            "Constrain decoding parameters, validate structured outputs, and use deterministic settings for security-sensitive paths.",
          verify:
            "Repeat controlled task trials and confirm tool schemas, authorization decisions, and redaction remain stable.",
        },
      ],
      quiz: [
        {
          id: "probability-q1",
          topicId: "probability-information",
          prompt: "What does variance describe?",
          choices: [
            "The average outcome",
            "How spread out outcomes are around expectation",
            "The number of labels",
            "The slope of a matrix",
          ],
          answerIndex: 1,
          explanation:
            "Variance measures expected squared deviation from the mean, summarizing spread rather than central location.",
          kind: "story-match",
        },
        {
          id: "probability-q2",
          topicId: "probability-information",
          prompt: "How should a high-impact service treat an uncalibrated softmax score?",
          choices: [
            "Present it as a guaranteed probability",
            "Increase temperature until every score looks reliable",
            "Measure calibration and require independent approval for consequential actions",
            "Remove uncertainty labels to simplify the interface",
          ],
          answerIndex: 2,
          explanation:
            "Uncalibrated confidence can mislead users, so high-impact decisions need measured reliability and an independent policy or human check.",
          kind: "security",
        },
        {
          id: "probability-q3",
          topicId: "probability-information",
          prompt: "What does lower temperature do to a softmax distribution?",
          choices: [
            "Sharpens it toward higher-logit tokens",
            "Flattens it uniformly",
            "Removes the vocabulary",
            "Changes the model weights",
          ],
          answerIndex: 0,
          explanation:
            "Dividing logits by a smaller positive temperature increases relative differences and concentrates probability.",
          kind: "scenario",
        },
        {
          id: "probability-q4",
          topicId: "probability-information",
          prompt: "Why is KL divergence not an ordinary symmetric distance?",
          choices: [
            "It is always negative",
            "It only works for integers",
            "It cannot compare normalized distributions",
            "It depends on the direction of the comparison",
          ],
          answerIndex: 3,
          explanation:
            "KL(p || q) generally differs from KL(q || p), so direction and reference distribution must be stated.",
          kind: "tradeoff",
        },
      ],
    },
    {
      id: "backprop-optimizers",
      slug: "backprop-optimizers",
      trackId: "ml-math",
      title: "Backprop and Optimizers: SGD and AdamW",
      summary:
        "Follow gradients through a computation graph and compare SGD, momentum, AdamW, learning-rate behavior, and numerical stability controls.",
      minutes: 13,
      storyHook:
        "Backprop sends responsibility backward through a chain of workshops, and optimizers decide how to act on that feedback.",
      prerequisites: ["linear-algebra", "probability-information"],
      steps: [
        {
          id: "backprop-graph",
          title: "Backprop applies the chain rule backward",
          story:
            "A finished pastry passes through mixing, shaping, and baking. If the result is too salty, each stage needs to know how its local choices contributed to the final error. A computation graph records those dependencies. Backpropagation starts at the loss and walks backward, multiplying local derivatives along each path. This is the chain rule organized as an algorithm. The graph must reflect the actual computation, including branches, shared weights, and nonlinearities, or the assigned responsibility will be wrong. Branches make this especially important: one shared tensor can feed several downstream paths, and every contribution must be accumulated.",
          engineer:
            "Reverse-mode automatic differentiation records a forward computation graph, then propagates adjoints from scalar loss back toward inputs and parameters. Each operation implements a local vector-Jacobian product, and gradients accumulate when a tensor feeds multiple paths. This is efficient for models with many parameters and relatively few outputs. Detach tensors that should not receive gradients and check that in-place operations do not invalidate saved values. A failure mode is differentiating a stale or modified graph, producing plausible-looking gradients that do not match the executed function. A small finite-difference check on selected parameters provides independent evidence before a costly training run.",
          visualId: "notation-decoder",
          visualCaption:
            "A loss signal travels backward through recorded operations and accumulates parameter gradients.",
        },
        {
          id: "backprop-sgd",
          title: "SGD takes small steps along negative gradients",
          story:
            "A hiker descending a foggy hill estimates the local slope and takes a short step downhill. Stochastic gradient descent uses a noisy estimate of that slope from a mini-batch. The gradient points toward increasing loss, so the update moves in the opposite direction. The learning rate controls step size: too large and the hiker overshoots the valley, too small and progress becomes painfully slow. Mini-batch noise can help exploration, but it also makes the path jittery near the end. The useful question is not whether noise exists, but whether its size matches the progress still needed.",
          engineer:
            "The SGD update is θₜ₊₁ = θₜ − η∇L(θₜ), where η is the learning rate and the gradient is estimated from a mini-batch. Mini-batch gradients approximate the full-data gradient with lower computational cost and beneficial noise. Momentum maintains a velocity that smooths successive gradients and can accelerate consistent directions while dampening oscillation. Learning-rate schedules, gradient clipping, and batch size interact with stability. A failure mode is increasing batch size to reduce noise without adjusting optimization settings; the resulting fewer updates can under-train the model even when each gradient estimate is cleaner.",
          visualId: "notation-decoder",
          visualCaption:
            "SGD and momentum convert noisy gradient estimates into controlled parameter updates.",
        },
        {
          id: "backprop-adamw",
          title: "AdamW adapts step size and separates weight decay",
          story:
            "Two trails may have different widths and textures, so a hiker benefits from a stride that adapts to each direction. AdamW maintains running estimates of gradient mean and squared magnitude, then scales updates per parameter. It also applies decoupled weight decay rather than folding regularization directly into the adaptive gradient. This distinction matters because adaptive scaling can otherwise distort the intended penalty. The optimizer is powerful, but its settings still need validation; an adaptive method cannot rescue bad data or an inappropriate learning rate. A fair comparison holds data, architecture, and evaluation fixed so optimizer differences are not confused with unrelated changes.",
          engineer:
            "AdamW updates each parameter using bias-corrected first and second gradient moments, then applies decoupled weight decay separately from the adaptive step. Beta settings control memory length, epsilon stabilizes the denominator, and learning-rate warmup can reduce early instability. Weight decay is not the same as simply shrinking all activations, and it does not replace data quality or early stopping. Watch for loss spikes, stale second moments after distribution shifts, and interactions with mixed precision or gradient clipping. Compare update norms across parameter groups, since a single healthy average can hide a failing layer.",
          visualId: "notation-decoder",
          visualCaption:
            "AdamW combines bias-corrected gradient moments with separately applied parameter decay.",
        },
        {
          id: "backprop-stability",
          title: "Stable training is an engineering property",
          story:
            "A bicycle can be fast only if its wheels, bearings, and brakes are maintained. Training stability also depends on many small supports: scaled initialization, normalization layers, gradient clipping, finite-value checks, checkpointing, and careful precision choices. When one support fails, the loss may explode or silently become NaN. Mixed precision can improve speed and memory use, but it requires dynamic scaling or equivalent safeguards so tiny gradients do not disappear and large values do not overflow. Each safeguard should have an observable signal and a defined response, such as skipping a non-finite update and preserving the last valid checkpoint.",
          engineer:
            "Treat numerical health as a release gate: monitor loss, gradient norms, parameter norms, update norms, learning rate, and non-finite rates at each stage. Use appropriate initialization and normalization, and keep sensitive reductions in higher precision when needed. Gradient clipping limits extreme updates but can hide upstream data or architecture problems if used as the only response. Loss scaling protects small values in low-precision training. Checkpoint validation and rollback protect long runs. A failure mode is ignoring a gradual gradient-norm rise until the run fails many expensive steps later. Record those signals with the exact data and code version so a later incident can be reproduced.",
          visualId: "notation-decoder",
          visualCaption:
            "Initialization, normalization, clipping, precision safeguards, and checkpoints keep long training runs stable.",
        },
      ],
      security: [
        {
          id: "backprop-checkpoint-integrity",
          title: "Protect training checkpoints",
          threat:
            "A tampered checkpoint can contain altered behavior, unsafe serialization structures, or unexpected executable content.",
          control:
            "Use signed immutable artifacts, safe loaders, dependency controls, and isolated training environments.",
          verify:
            "Verify checkpoint digests and provenance before loading, and test that malformed files are rejected safely.",
        },
        {
          id: "backprop-gradient-privacy",
          title: "Treat gradients and logs as sensitive",
          threat:
            "Gradient statistics, sample-level logs, or memorized checkpoints can leak information about training examples.",
          control:
            "Restrict access, minimize sample-level telemetry, use approved privacy controls, and follow data retention policy.",
          verify:
            "Audit training logs and checkpoint access, and run approved membership-style privacy checks on representative data.",
        },
        {
          id: "backprop-resource-limits",
          title: "Bound unstable or malicious training jobs",
          threat:
            "Extreme inputs, malformed batches, or runaway updates can exhaust compute, memory, or storage for other workloads.",
          control:
            "Validate batches, enforce job quotas and deadlines, monitor numerical health, and stop failed runs automatically.",
          verify:
            "Inject non-finite and oversized fixtures and confirm the job fails safely without exhausting shared resources.",
        },
      ],
      quiz: [
        {
          id: "backprop-q1",
          topicId: "backprop-optimizers",
          prompt: "What mathematical rule powers backpropagation?",
          choices: [
            "The chain rule",
            "The Pythagorean theorem only",
            "Bayes' rule only",
            "The law of cosines",
          ],
          answerIndex: 0,
          explanation:
            "Reverse-mode differentiation multiplies local derivatives along dependency paths using the chain rule.",
          kind: "story-match",
        },
        {
          id: "backprop-q2",
          topicId: "backprop-optimizers",
          prompt: "What does gradient clipping control?",
          choices: [
            "Vocabulary size",
            "The magnitude of parameter updates",
            "Dataset licensing",
            "Attention-head count",
          ],
          answerIndex: 1,
          explanation:
            "Clipping limits gradient or update norms to reduce instability, though the underlying cause may still need investigation.",
          kind: "scenario",
        },
        {
          id: "backprop-q3",
          topicId: "backprop-optimizers",
          prompt: "What distinguishes AdamW's weight decay?",
          choices: [
            "It changes the tokenizer",
            "It removes the need for a learning rate",
            "It is applied separately from the adaptive gradient update",
            "It only works with integer gradients",
          ],
          answerIndex: 2,
          explanation:
            "AdamW decouples weight decay from adaptive moment scaling, preserving the intended regularization behavior more directly.",
          kind: "tradeoff",
        },
        {
          id: "backprop-q4",
          topicId: "backprop-optimizers",
          prompt: "What should happen before a training checkpoint is loaded?",
          choices: [
            "Load any checkpoint that deserializes successfully",
            "Trust a mutable filename in the training log",
            "Disable verification to speed up restarts",
            "Verify its signed digest and provenance with a safe loader",
          ],
          answerIndex: 3,
          explanation:
            "Checkpoint signature and provenance checks prevent tampered or unsafe artifacts from executing in a training environment.",
          kind: "security",
        },
      ],
    },
    {
      id: "attention-scaling-laws",
      slug: "attention-scaling-laws",
      trackId: "ml-math",
      title: "Attention and Scaling Laws",
      summary:
        "Connect scaled dot-product attention to quadratic prefill work, KV growth, and empirical model-data-compute scaling trade-offs.",
      minutes: 13,
      storyHook:
        "Attention is a weighted conversation, and scaling laws are maps drawn from experiments rather than universal promises.",
      prerequisites: ["linear-algebra", "probability-information", "backprop-optimizers"],
      steps: [
        {
          id: "attention-equation",
          title: "Scaled dot-product attention is weighted routing",
          story:
            "In a meeting, each speaker asks a question, every earlier remark advertises how well it answers, and the speaker carries away a weighted mixture of the relevant facts. Scaled dot-product attention formalizes that process. Queries and keys generate scores, scaling keeps their magnitude manageable, softmax turns scores into weights, and values are combined. A causal mask prevents future positions from influencing earlier ones. The result is not a database lookup; it is a learned, input-dependent mixture whose weights can change for every token. The mask is part of the contract, not a cosmetic detail, because it determines which remarks are eligible to influence the answer.",
          engineer:
            "Attention(Q,K,V) = softmax(QKᵀ / √d_k + M)V, where M is the mask and each head has its own Q, K, and V projections. Q has shape sequence by head dimension, K and V follow compatible dimensions, and batch and head axes are handled independently. Scaling by √d_k prevents dot-product variance from growing with dimension and pushing softmax into saturated regions. The output has the value dimension. Implementations must preserve mask semantics, numerical stability, and dtype behavior while using efficient tiled kernels where available. Test one-token, fully masked, and mixed-precision cases to confirm shape preservation and the documented safe-mask behavior.",
          visualId: "attention-kv",
          visualCaption:
            "Queries and keys form scaled scores, softmax creates weights, and those weights mix value vectors.",
        },
        {
          id: "attention-complexity",
          title: "Sequence length stresses compute and cache differently",
          story:
            "A meeting with twice as many speakers creates roughly four times as many pairwise relationships, but the notes each speaker leaves may only grow linearly. Attention shows a similar split. Prefill must compute pairwise scores across the prompt, producing quadratic work in sequence length for standard dense attention. The KV cache stores key and value states per token and layer, producing linear growth in stored sequence length. Efficient kernels reduce memory traffic, while sparse or linear attention variants change the approximation or structure rather than making dense work disappear for free.",
          engineer:
            "Dense attention score work is O(n²), while KV storage is O(2 × layers × kvHeads × headDim × tokens × batch × bytesPerElement). Optimized kernels can avoid materializing the full score matrix. Linear KV growth means longer contexts increase prefill latency, cache capacity, and decode reads. Prefix caching can reuse immutable prompt state, and grouped-query attention reduces KV heads. Evaluate quality and tail latency when changing attention structure; theoretical savings alone do not establish that a variant fits the task. Measure cache bytes per token and prefill time separately, since reducing one bottleneck can expose the other.",
          visualId: "attention-kv",
          visualCaption:
            "Dense prefill comparisons grow quadratically while stored KV state grows linearly with sequence length.",
        },
        {
          id: "attention-scaling-laws",
          title: "Scaling laws are empirical relationships",
          story:
            "A cartographer can draw a coastline more accurately after measuring many points, but the map is never the territory. Scaling-law experiments train models at different sizes and data budgets, then fit how validation loss changes. The resulting curve helps forecast the benefit of additional compute, parameters, or tokens. It does not guarantee that every architecture, dataset, or objective will follow the same line. Distribution shift, data quality, and optimization choices can bend the curve, so extrapolation should always be checked with a real run. Record the data mixture and tokenizer with each curve so an extrapolation is never mistaken for architecture-independent evidence.",
          engineer:
            "Empirical scaling studies often fit L(N,D,C) = aN^{-α} + bD^{-β} + cC^{-γ} + L∞ to validation loss versus model size N, data D, or compute C. These relationships support budget allocation and experiment planning, but coefficients are specific to the model family, data mixture, tokenizer, and training setup. Compute-optimal analysis balances parameter growth against token growth; it is not a universal recommendation for inference cost or latency. Use held-out evaluation and cost-sensitive objectives when choosing a deployment model rather than minimizing training loss alone. Keep an extrapolation uncertainty range and validate it with an intermediate run before committing the full budget.",
          visualId: "notation-decoder",
          visualCaption:
            "Measured validation-loss curves extrapolate model, data, and compute trade-offs within a stated regime.",
        },
        {
          id: "attention-compute-budget",
          title: "Training compute is not serving economics",
          story:
            "A larger engine may win a long race yet cost too much for daily commuting. Training-compute-optimal models emphasize capability gained during pretraining, while production systems also care about time to first token, per-token latency, memory footprint, and cost per request. A smaller model with better retrieval, fine-tuning, or routing can be the right product choice. Conversely, quantization or batching may improve serving efficiency without changing the training-compute story. The correct budget depends on the user objective. A useful comparison reports quality, tail latency, and cost together, so a cheaper request is not mistaken for a cheaper successful task.",
          engineer:
            "Choose a serving model by quality floor, time to first token, per-token latency, throughput, resident memory, and cost per successful task—not by training FLOPs alone. Prefill processes prompt tokens in parallel, while decode repeatedly reads weights and KV state for small batches, so inference economics depend strongly on traffic shape. Avoid treating a training scaling-law coefficient as a latency prediction. A failure mode is selecting the largest model that fits the training budget while ignoring the recurring serving bill and tail-latency constraints. Include cold-start, cache-hit, and burst traffic scenarios because each changes the dominant serving cost.",
          visualId: "queue-workers",
          visualCaption:
            "Training-loss gains are weighed against prefill, decode, memory, latency, and recurring serving costs.",
        },
      ],
      security: [
        {
          id: "attention-long-context-limits",
          title: "Bound long-context resource use",
          threat:
            "Very long prompts can consume disproportionate attention compute and KV memory, affecting other tenants.",
          control:
            "Enforce token limits, admission control, per-tenant quotas, and workload-specific context budgets.",
          verify:
            "Test maximum-length requests and confirm rejection or safe routing occurs before shared resources are exhausted.",
        },
        {
          id: "attention-mask-integrity",
          title: "Verify causal and permission masks",
          threat:
            "Incorrect masks can expose future positions or unauthorized context in custom attention implementations.",
          control:
            "Use tested kernels, explicit mask tests, and authorization filters outside attention for tenant and object boundaries.",
          verify:
            "Run unit tests for mask shapes and causality, plus integration tests confirming unauthorized context never enters the model.",
        },
        {
          id: "attention-scaling-claims",
          title: "Require reproducible scaling evidence",
          threat:
            "Unverified benchmark or scaling claims can drive unsafe capacity purchases or misleading product assurances.",
          control:
            "Publish model, data, hardware, software, and evaluation versions, and reproduce key measurements before commitment.",
          verify:
            "Re-run representative experiments from recorded manifests and compare measured results with documented claims.",
        },
      ],
      quiz: [
        {
          id: "attention-q1",
          topicId: "attention-scaling-laws",
          prompt: "Why divide query-key scores by the square root of head dimension?",
          choices: [
            "To reduce vocabulary size",
            "To keep score variance from growing excessively with dimension",
            "To remove the need for softmax",
            "To make attention linear",
          ],
          answerIndex: 1,
          explanation:
            "Scaling controls dot-product magnitude as dimension grows, preventing softmax saturation and unstable gradients.",
          kind: "tradeoff",
        },
        {
          id: "attention-q2",
          topicId: "attention-scaling-laws",
          prompt: "How does standard dense attention prefill work grow with sequence length?",
          choices: [
            "Linearly",
            "Not at all",
            "Approximately quadratically",
            "Only with vocabulary size",
          ],
          answerIndex: 2,
          explanation:
            "Pairwise score computation creates sequence-by-sequence work, producing approximately quadratic growth.",
          kind: "scenario",
        },
        {
          id: "attention-q3",
          topicId: "attention-scaling-laws",
          prompt: "What is a scaling law?",
          choices: [
            "An empirical relationship fitted from controlled experiments",
            "A universal guarantee for every model",
            "A security authorization rule",
            "A tokenizer vocabulary table",
          ],
          answerIndex: 0,
          explanation:
            "Scaling laws summarize measured behavior within a regime and require validation when architecture, data, or objectives change.",
          kind: "story-match",
        },
        {
          id: "attention-q4",
          topicId: "attention-scaling-laws",
          prompt: "Which control prevents one tenant from exhausting shared KV memory?",
          choices: [
            "Allow unlimited context because attention is linear",
            "Cache prompts without tenant quotas",
            "Let any tenant consume all available KV memory",
            "Enforce token limits, admission control, and per-tenant context budgets",
          ],
          answerIndex: 3,
          explanation:
            "Context and admission limits bound attention compute and KV memory before a long prompt can exhaust shared capacity.",
          kind: "security",
        },
      ],
    },
    {
      id: "notation-decoder",
      slug: "notation-decoder",
      trackId: "ml-math",
      title: "Interactive Math Notation Decoder",
      summary:
        "Unpack unfamiliar equations by finding the operation, naming each index, stating shapes, and translating the result into plain language.",
      minutes: 12,
      storyHook:
        "Treat every equation like a recipe with labeled jars, mixing verbs, and a final serving shape.",
      prerequisites: ["linear-algebra", "probability-information"],
      steps: [
        {
          id: "notation-verb",
          title: "Find the verb before reading symbols",
          story:
            "A recipe can look intimidating when the jars are lined up before you notice the verbs: whisk, divide, sprinkle, bake. Mathematical notation works the same way. The equals sign says that the expression on the left is produced by the operations on the right. Large sigma signs mean add, products mean multiply, norms mean measure size, and softmax means normalize into weights. Start by circling the operation and saying it aloud. Once the verb is clear, the surrounding symbols stop looking like an unexplained wall. Naming the operation first also gives you a checklist for the inputs, outputs, and edge cases that the implementation must preserve.",
          engineer:
            "Parse an equation at the operation level before assigning meaning to individual letters. Identify assignments, equalities, contractions, normalizations, and outer functions. A sigma or product implies an index range; a fraction implies division and may encode a normalization constant; a function name usually signals a standard transform with known input and output shapes. Write a one-sentence translation such as 'this output is the normalized weighted mixture of values.' This translation is a testable contract: if it cannot be stated plainly, the notation has not yet been understood. Check that the translation predicts a concrete output for a tiny input, not merely that it sounds plausible.",
          visualId: "notation-decoder",
          visualCaption:
            "The decoder highlights the operation verb before tracing inputs through the equation.",
        },
        {
          id: "notation-indices",
          title: "Name every index and its range",
          story:
            "Labeled jars become useful when you know which shelf they came from and how many jars are on that shelf. Indices play that role in tensor equations. A subscript may identify a token position, a batch example, a layer, or a feature dimension. The same letter appearing twice can mean contraction, while a new letter usually means a free output dimension. Missing the range or confusing a row with a column can produce a plausible-looking implementation of the wrong operation. Always make a small shape table beside the equation. This prevents a correct contraction from being applied to the wrong semantic axis.",
          engineer:
            "For each symbol, record its rank, each axis meaning, and the size of each axis. When an index appears twice on one side, it is often summed according to Einstein notation; otherwise state the reduction explicitly. In QKᵀ, query and key sequence axes contract with head dimension, producing a sequence-by-sequence score matrix. In matrix products, check that contracted dimensions match. Include batch and head axes even when a paper suppresses them for clarity. Shapes are the bridge from mathematical intent to correct tensor code. Suppressed batch and head axes still need explicit positions in code, even when the paper omits them for readability.",
          visualId: "notation-decoder",
          visualCaption:
            "An index ledger maps each tensor axis and contraction to a concrete dimension and range.",
        },
        {
          id: "notation-constants",
          title: "Decode constants, reductions, and norms",
          story:
            "A recipe's 'for one cup' note explains why the ingredient amount is divided by a particular number. Mathematical constants often play the same role. A square root may normalize variance, a denominator may average over examples, and a norm may measure length. The symbol epsilon added to a denominator is usually a small stabilizer that prevents division by zero. Recognizing these roles lets you explain not only what the equation computes, but why the author chose that form and where numerical trouble might appear. A denominator audit is especially valuable when an equation combines averaging, normalization, and a small stabilizer.",
          engineer:
            "Translate Σ into a sum with an explicit range, Π into a product, and fractions into numerator and denominator operations. A norm such as ||x||₂ computes Euclidean length; adding epsilon to its square can stabilize gradients near zero. Cross-entropy with one-hot targets reduces to negative log-probability. Identify whether normalization happens before or after a nonlinearity because the order changes behavior. Check units and limiting cases, such as identical distributions producing zero divergence or a one-token sequence removing pairwise complexity. Test zero, one, and identical inputs to confirm that stabilizers preserve the intended limit instead of changing the result.",
          visualId: "notation-decoder",
          visualCaption:
            "Sums, products, norms, denominators, and stabilizers resolve into concrete operations with numerical roles.",
        },
        {
          id: "notation-worked",
          title: "Read left to right, then run a tiny example",
          story:
            "Imagine unpacking a recipe by placing each labeled jar on the counter in the order the instructions use it. First you name the finished dish, then the main ingredients, then each mixing step. Finally, you try the recipe with one small portion so any confusion becomes visible. For attention, the finished dish is an output matrix. Queries and keys become scores, the square root scales them, the mask blocks forbidden positions, softmax produces weights, and values become the output. A two-token example turns the symbols into numbers you can check.",
          engineer:
            "For Attention(Q,K,V) = softmax(QKᵀ / √d_k + M)V, state shapes first: Q is n_q by d_k, K is n_k by d_k, and V is n_k by d_v. QKᵀ is n_q by n_k, scaling and masking preserve that shape, and multiplying by V produces n_q by d_v. For causal self-attention, n_q and n_k align and the mask blocks future keys. Compute a tiny manual example, compare it with code, and test edge cases such as one token or fully masked rows using the implementation's documented safe behavior. Document how fully masked rows behave so the manual example and production kernel agree on the edge case.",
          visualId: "notation-decoder",
          visualCaption:
            "The attention equation is decoded into shape transformations and checked with a tiny numerical example.",
        },
      ],
      security: [
        {
          id: "notation-parser-bounds",
          title: "Bound interactive equation inputs",
          threat:
            "Untrusted notation or tensor dimensions could trigger expensive symbolic expansion, excessive allocations, or parser failure.",
          control:
            "Validate a restricted notation grammar, cap expression length and dimensions, and evaluate inside resource-limited workers.",
          verify:
            "Submit oversized and malformed equations and confirm safe rejection without freezing the interface or worker.",
        },
        {
          id: "notation-output-safety",
          title: "Render mathematical content safely",
          threat:
            "Equation labels or annotations may contain untrusted markup that executes in the learning interface.",
          control:
            "Treat labels as plain text or sanitize markup, escape rendered content, and disallow executable formula extensions.",
          verify:
            "Test benign markup-like labels and confirm they render as text without script or event-handler execution.",
        },
        {
          id: "notation-example-privacy",
          title: "Keep user examples free of secrets",
          threat:
            "A learner may paste private data or credentials into an equation decoder that stores or shares examples.",
          control:
            "Process examples locally where possible, warn against sensitive input, avoid persistent storage, and redact telemetry.",
          verify:
            "Inspect local storage, network requests, and analytics with seeded test secrets before enabling sharing features.",
        },
      ],
      quiz: [
        {
          id: "notation-q1",
          topicId: "notation-decoder",
          prompt: "What should you identify first in an unfamiliar equation?",
          choices: [
            "The font family",
            "The operation verb or main function",
            "The paper's page number",
            "The color of the diagram",
          ],
          answerIndex: 1,
          explanation:
            "Finding the operation gives the equation a plain-language structure before individual symbols are interpreted.",
          kind: "story-match",
        },
        {
          id: "notation-q2",
          topicId: "notation-decoder",
          prompt: "What is the output shape of QKᵀ when Q is n_q by d_k and K is n_k by d_k?",
          choices: [
            "n_q by n_k",
            "d_k by d_k",
            "n_k by d_v",
            "n_q by d_v",
          ],
          answerIndex: 0,
          explanation:
            "The head dimension contracts, leaving the query sequence and key sequence axes as the score matrix dimensions.",
          kind: "scenario",
        },
        {
          id: "notation-q3",
          topicId: "notation-decoder",
          prompt: "Which design keeps an interactive equation decoder safe from resource exhaustion?",
          choices: [
            "Expand every submitted expression without a budget",
            "Execute formula extensions supplied by the learner",
            "Use a restricted grammar with expression and dimension limits in an isolated worker",
            "Store private examples in analytics for later review",
          ],
          answerIndex: 2,
          explanation:
            "A restricted grammar, bounded dimensions, and isolated execution prevent untrusted equations from freezing the interface or exhausting memory.",
          kind: "security",
        },
        {
          id: "notation-q4",
          topicId: "notation-decoder",
          prompt: "What is the output shape of softmax(QKᵀ / √d_k + M)V when V is n_k by d_v?",
          choices: [
            "n_k by n_k",
            "n_q by n_k",
            "d_k by d_v",
            "n_q by d_v",
          ],
          answerIndex: 3,
          explanation:
            "The score weights have shape n_q by n_k and contract with V's key axis, leaving query positions and value dimension.",
          kind: "scenario",
        },
      ],
    },
  ],
};

export const trackMath: Track = mathTrack;

# SysCraft Content Audit

**Audit date:** 2026-11-27  
**Scope:** the active platform registry — 7 tracks, 53 lessons, 8 blogs, 264 lesson/blog steps, 244 quiz questions, and 183 topic-level security practices — plus `src/data/securityPractices.ts` and the 21 platform visual components.  
**Method:** read every active lesson/blog field, inspected every visual implementation, ran the curriculum contract tests, and used read-only scripts to count repeated sentences, visual usage, quiz kinds/answer positions, prerequisite order, captions, and reading-time load. Legacy `lessonBlogs.ts` and encyclopedia data were treated as reference-only and were not rewritten. No source code was changed.

## Executive summary

The curriculum has a **strong technical core** but an uneven presentation layer. Foundations, distributed systems, case studies, and blogs generally contain concrete mechanisms, real failure modes, useful tradeoffs, and defensive verification steps. The biggest quality problem is not missing content; it is **template contamination and visual mismatch**:

- **88 steps across AI Engineering, LLM Inference, ML Math, and Backend/Cloud repeat one of four identical Story openers and one of four identical Engineer openers.** The underlying analogies and technical explanations are often worth keeping.
- Several visual IDs are semantically wrong, not merely generic. `notation-decoder` always renders `λ / μ = ρ`, even for vectors, LRU, pub/sub, parking lots, and elevators. `token-math` renders a GPU memory bar, even for tokenization and entropy. `realtime-channels` renders polling/SSE/WebSockets, even for Linux namespaces and the Kubernetes control plane.
- All 12 case studies and 8 blogs have five steps, but every visual wraps `stepIndex` modulo four; **step 5 visually repeats step 1**.
- Case-study and blog quizzes have **no story-match questions**, use a fixed kind sequence, and place **27 of 32 blog answers at index 1**. Many distractors are jokes rather than plausible near-misses.
- All 100 case-study/blog captions are generated from the first story sentence rather than written as visual captions.
- Prerequisite IDs and blog-to-lesson links all resolve and there are no cycles, but the registry order has five forward prerequisites, including placing LLM Inference before its required ML Math track.
- The 13 curriculum tests pass, but they enforce shape, not depth, uniqueness, answer quality, visual semantics, or ordering.
- **No unsafe offensive exploit instructions were found in the audited files.** Attack language is defensive, contextual, and generally paired with controls and verification. The agent-injection blog explicitly calls for “adversarial but safe fixtures” and says not to embed exploit prompts in production documentation.

**Bottom line:** preserve most Foundations/Distributed/Case Study/Blog prose. Prioritize de-templating the four affected tracks, replacing misleading visuals, and rebuilding quiz banks before adding more lessons.

## Scoring rubric

Scores are editorial judgments on a 0–5 scale:

- **Story:** vivid real-world analogy, clear mapping, variety, no meta-commentary or repeated scaffold.
- **Engineer:** concrete mechanics, formulas/algorithms where useful, tradeoffs, failure modes, operational specifics.
- **Security:** system-specific threat, control, and verification; defensive rather than generic.
- **Quiz:** scenario/tradeoff/security/story-match variety, unambiguous wording, plausible distractors, strong explanations, balanced answer positions.
- **Visual fit:** the selected visual actually depicts the step's mechanism and changes meaningfully across steps.

## Summary scores per track

| Track | Story | Engineer | Security | Quiz | Visual fit | Justification |
|---|---:|---:|---:|---:|---:|---|
| Foundations | 4.5 | 4.5 | 4.5 | 4.0 | 3.0 | Distinct shop/cafe/library/airport analogies and concrete queueing, cache, SQL, and transport mechanics. Security includes cache poisoning, trusted-proxy spoofing, fencing, and dead-letter replay. Quiz variety is good, but 21/36 answers are index 1 and several distractors are absurd. `traffic-flow` is overused for basic request paths, DNS, HTTP/2, and HTTP/3; `btree-lsm` is also a coarse fit for relational modeling. |
| Distributed Systems | 5.0 | 5.0 | 4.5 | 4.0 | 3.5 | Courthouse, warehouse, ship, workshop, library, mail-slot, travel, club, and hospital stories are vivid and well mapped. Engineer mode is exceptionally specific on quorums, Raft safety, fencing, WAL/MVCC, Kafka offsets, 2PC/sagas/outbox, and sketches. Security is strong but repeats fencing and poison-message patterns from adjacent lessons. Quiz answer bias remains 24/40 at index 1. |
| Case Studies | 3.5 | 4.5 | 4.5 | 2.5 | 2.0 | Production-shaped assumptions and domain-specific hardening are strong. Base stories are vivid, but all 60 stories receive an abstract appended extension. No story-match questions exist; question 3 is mechanically labeled security even when it is not. Multiple LLD visuals are actively misleading. |
| AI Engineering | 2.5 | 4.0 | 4.0 | 3.5 | 2.5 | Good analogies and solid RAG/agent/eval/security substance, but all 24 stories and engineer notes start with identical boilerplate. Security is relevant yet overlaps heavily across agent, memory, eval, and AI-security lessons. `attention-kv` is misused for agent memory; `token-math` is wrong for tokenization. |
| LLM Inference | 2.5 | 4.5 | 3.5 | 3.0 | 2.0 | Strong KV formula, prefill/decode, batching, quantization, and training-stage mechanics. All 24 steps repeat the same story and engineer preface. Security clusters around artifact provenance, memory DoS, and telemetry privacy. No story-match questions; two lessons have no security question. Visuals do not show roofline, quantization scales, or most training mechanics. |
| ML Math | 3.0 | 4.5 | 3.0 | 3.0 | 1.0 | The jar/recipe/weather/hiker/cartographer analogies have real teaching value, and the formulas and numerical failure modes are strong. However, all 20 stories and engineer notes repeat the same preface. No quiz question is labeled security. `notation-decoder` is a fixed queueing equation and is wrong for almost every use. |
| Backend/Cloud | 2.5 | 4.0 | 4.0 | 3.5 | 1.5 | Event loops, namespaces/cgroups, reconciliation, HPA, canaries, JWT validation, and SSRF controls are concrete and useful. All 20 steps repeat the same story and engineer preface. Visual choices include WebSocket diagrams for namespaces/control planes and a canary bar for image layers. Kubernetes has no security quiz question. |
| Blogs | 4.0 | 4.5 | 4.5 | 2.5 | 2.5 | All eight blogs have strong base analogies, production mechanics, and specific security verification. All 40 stories receive abstract extensions and all 40 captions merely repeat the first story sentence. No story-match questions; 27/32 answers are index 1. Several visual IDs do not match the blog step. |

## Cross-cutting evidence

### 1. Repeated Story and Engineer scaffolding

The following sentences are exact duplicates, not merely similar phrasing:

| Track | Affected lesson slugs | Steps | Repeated Story opener | Repeated Engineer opener |
|---|---|---:|---|---|
| AI Engineering | `tokenization`, `embeddings-rag`, `agent-loop`, `memory-architectures`, `evals-guardrails`, `ai-security` | 24 | “The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path.” | “Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely.” |
| LLM Inference | `transformer-bottlenecks`, `kv-cache-paged-attention`, `prefill-decode-batching`, `quantization`, `latency-cost-budgets`, `pretraining-posttraining` | 24 | “The workshop comparison becomes useful when each part is mapped to measured compute, memory traffic, latency, or quality behavior.” | “Engineering decisions require measured arithmetic intensity, memory traffic, latency distributions, quality evidence, and explicit capacity limits rather than unsupported universal claims.” |
| ML Math | `linear-algebra`, `probability-information`, `backprop-optimizers`, `attention-scaling-laws`, `notation-decoder` | 20 | “The labeled-jar view keeps attention on order, shape, and meaning instead of letting unfamiliar symbols intimidate the reader.” | “Correct implementation depends on explicit shapes, stable numerical operations, testable limiting cases, and evidence that the mathematical contract matches the executed code.” |
| Backend/Cloud | `concurrency-event-loops`, `linux-docker`, `kubernetes`, `safe-deployments`, `appsec-zero-trust` | 20 | “The operational scene matters because every boundary must become a measurable signal, an enforceable limit, and a rehearsed response.” | “Production operation requires bounded queues, explicit ownership, measurable health signals, least-privilege access, and a rehearsed recovery path for every dependency.” |

This is **88 Story openers and 88 Engineer openers**. The problem is structural: Story Mode should begin in a scene, not with an editorial claim that the scene “works.” Engineer Mode should begin with the mechanism or decision, not a reusable mission statement.

Additional duplication:

- `observability-slos`, step 1 repeats “The director reviews both the target and its measurement every quarter.” in both `story` and `engineer`.
- A generated Engineer filler sentence appears in `lld-pubsub` step 5, `discord-trillions-of-messages` step 1, `what-happens-during-token-generation` step 2, and `zero-downtime-schema-migrations` step 1: “This boundary should be visible in tests and operational telemetry, not only in the design document.”
- Engineer notes use formulaic failure framing 96 times: “A common failure” (34), “A frequent failure” (17), “A failure mode” (41), and “The failure mode” (4). This is less severe than the exact openers and often introduces useful content, but the sentence shape is repetitive.

### 2. Generated story extensions and captions

All 12 case studies and all 8 blogs append a prewritten `STORY_EXTENSIONS` sentence to every step. These extensions are usually abstract editorial commentary rather than continued real-world action. Examples:

- `lld-elevator`, step 1: “The controller's job is to make the exciting behavior boring: every movement follows a guarded sequence that can be explained, tested, and safely interrupted…”
- `discord-trillions-of-messages`, step 1: “The model should make recent conversation cheap and old conversation deliberate…”
- `database-melts-at-10k-rps`, step 5: “The safest scaling path is the one that preserves an understandable source of truth…”

All **100 case-study/blog captions** equal the first sentence of the generated story. For example:

- `url-shortener`, step 1 caption: “Imagine a coat-check counter at a stadium.”
- `database-melts-at-10k-rps`, step 1 caption: “A checkout counter can serve ten thousand customers smoothly if each needs a preprinted ticket.”

These are story hooks, not captions. They do not explain what the visual shows or how to read it.

### 3. Quiz-bank shape and quality

| Track | Questions | Kind distribution | Topics without story-match | Topics without security | Correct answer positions `[0,1,2,3]` |
|---|---:|---|---|---|---|
| Foundations | 36 | 9 each: scenario/security/tradeoff/story-match | None | None | `[9,21,6,0]` |
| Distributed | 40 | 10 each | None | None | `[15,24,1,0]` |
| Case Studies | 48 | 24 scenario, 12 tradeoff, 12 security | All 12 | None | `[5,37,6,0]` |
| AI Engineering | 24 | 9 tradeoff, 6 scenario, 7 security, 2 story-match | 4 | None | `[2,9,5,8]` |
| LLM Inference | 24 | 12 tradeoff, 8 scenario, 4 security | All 6 | `transformer-bottlenecks`, `prefill-decode-batching` | `[4,12,7,1]` |
| ML Math | 20 | 8 tradeoff, 8 scenario, 4 story-match | `attention-scaling-laws` | All 5 | `[3,11,5,1]` |
| Backend/Cloud | 20 | 6 tradeoff, 5 scenario, 6 security, 3 story-match | `concurrency-event-loops`, `appsec-zero-trust` | `kubernetes` | `[2,16,2,0]` |
| Blogs | 32 | 16 scenario, 8 tradeoff, 8 security | All 8 | None | `[5,27,0,0]` |

Across all 244 questions, **157 answers (64%) are at index 1**. Index 3 is never correct in Foundations, Distributed, Case Studies, Backend/Cloud, or Blogs.

The fixed `QUIZ_KINDS = ["scenario", "tradeoff", "security", "scenario"]` in both `track-case-studies.ts` and `blogs.ts` also mislabels content. Examples:

- `url-shortener`, quiz[2], Bloom-filter role is tagged `security` but is primarily probabilistic-correctness.
- `chat-system`, quiz[2], reconnect cursor is tagged `security` but is recovery/efficiency.
- `metrics-alerting`, quiz[2], alert fatigue is tagged `security` but is operational policy.
- `consistent-hashing-in-production`, quiz[2], data handoff is tagged `security` but is distributed-state correctness.

Many explanations are strong and most prompts are unambiguous. The main weaknesses are variety, answer-position predictability, and distractor plausibility.

### 4. Visual fit

Five broad visuals account for **125 of 264 steps (47%)**: `threat-defense` 34, `queue-workers` 27, `notation-decoder` 26, `traffic-flow` 20, and `deploy-strategies` 18.

| Visual | Actual implementation | Fit assessment |
|---|---|---|
| `notation-decoder` | Fixed `λ / μ = ρ` queueing equation with labels `arrival`, `service`, `utilization` | **Severe mismatch.** Used for vectors, matrices, Bayes, backprop, scaling laws, gRPC contracts, LRU, pub/sub, parking, elevators, Discord storage, approval hashes, virtual nodes, and error budgets. |
| `token-math` | Stacked memory bar labeled `weights`, `kv cache`, `activations`; context grows 4k→32k | Good only for memory/context growth. Wrong for token IDs, numeric formats, calibration, entropy, pretraining, and cost accounting. |
| `realtime-channels` | Three columns comparing polling, SSE, and WebSocket timing | Strong for `realtime`; wrong for Linux namespaces, Kubernetes reconciliation, HLS packaging, location ingest, LRU concurrency, and elevator determinism. |
| `threat-defense` | `untrusted text` → optional shield → `service` | Useful as a generic security motif, but too coarse for cache isolation, JWT validation, fencing, alert state, training-data governance, or tenant authorization. |
| `traffic-flow` | Client → load balancer → two APIs → database; only dot count/latency label changes | Reasonable for basic request paths; does not visualize DNS, HTTP/2 streams, QUIC loss, SQL normalization, SLI/SLO measurement, or error-budget policy. |
| `queue-workers` | Producer → queue → three workers → optional dead letter | Good for queues/jobs and fan-out. Wrong for roofline analysis, SCAN/LOOK, training-vs-serving economics, and several fairness/control steps. |
| `deploy-strategies` | Stable/new traffic percentage with rollback arrow | Good for canary lessons. Wrong for image layers, alert fatigue, limiter outage policy, and Kafka incident response. |
| `attention-kv` | Grid of KV blocks with one token attending to rows | Good for KV cache/paging. Does not show Q/K/V projections, MLP blocks, the attention equation, or durable agent memory. |
| `rag-space` | Query point and three nearest document points | Good for embeddings/RAG. Wrong for lexical inverted-index ranking in `search-engine` step 4. |
| `raft-election` | Five nodes, terms, leader/candidate/follower states | Good for Raft. Wrong for durable alert evaluation state in `metrics-alerting` step 4. |
| `saga-outbox` | Service → outbox → relay → sink with retry | Good for outbox/saga. Wrong for expand-contract migrations in `safe-deployments` step 4. |

A further structural issue: `Frame.tsx` defines `useStep` as `((stepIndex % 4) + 4) % 4`. Every five-step case study and blog therefore renders the same visual state for step 5 as step 1, despite different captions and prose.

### 5. Security specificity and duplication

The platform security fields are generally strong. Every topic has three practices with `threat`, `control`, and `verify`. Standouts include:

- `replication-consistency`: fencing a demoted replica, authenticating replication peers, rejecting stale term/log positions.
- `caching-eviction`: cache poisoning, hit/miss existence leaks, cross-user cached responses.
- `video-streaming`: signed playback scope, immutable upload prefixes, sandboxed decoders.
- `ai-security`: instruction/data authority, tool sandboxing, exfiltration through tool arguments/logs/caches.
- `appsec-zero-trust`: complete JWT validation, parameterized identifiers, SSRF egress controls.
- `lld-elevator`: replay-resistant control messages, local safety interlocks, expiring queued commands.

However, several security sets are near copies:

- `queues-jobs` security[1] and `kafka-streaming` security[1] both describe a poison message blocking a partition, bounded jittered retries, controlled dead-letter routing, and continued progress for valid messages.
- `queues-jobs` security[2] and `kafka-streaming` security[2] both require payload minimization, encryption, replay restrictions, and retention verification.
- `replication-consistency` security[0] and `scaling-databases` security[0] both require fencing an old primary and verifying it rejects writes after failover.
- `agent-loop`, `ai-security`, and `securing-agents-against-indirect-injection` repeat the same instruction/data boundary, tool allowlist, scoped credentials, and adversarial verification pattern.

These are relevant repetitions, but they reduce perceived depth in the later lessons. Each recurrence should add a distinct system mechanic or attack surface rather than restating the same control triad.

#### Legacy `src/data/securityPractices.ts`

The ten legacy practices are defensive and include useful AWS/Cloudflare/Kubernetes specifics. All referenced canvas primitive IDs resolve. Two issues remain:

1. The interface has no `threat`, `control`, and `verify` triad; it has `plainEnglish`, `doThis`, `neverDoThis`, cloud notes, and `tryOnCanvas`.
2. `evaluateSecurityPractice` determines “coverage” solely from primitive presence: `tryOnCanvas.every(id => present.has(id))`. For `rate_limit_public`, the presence of `rate_limiter`, `api_gateway`, and `cloudflare_waf` marks the practice covered even if no 429/Retry-After policy exists. This is a configuration-evidence gap, not proof of hardening.

### 6. Prerequisites, links, ordering, and reading time

**What works:**

- Every prerequisite resolves to a real lesson.
- Every blog `relatedLessonIds` entry resolves and is topically relevant.
- There are no prerequisite cycles.
- Every lesson has a custom `storyHook`; none falls back to its summary.
- Declared time is plausible for an interactive lesson. Main Story+Engineer prose ranges from 753–1,018 words; including security and quiz text, topics contain roughly 1,085–1,367 words over 9–16 minutes, or 81–141 words/minute plus interaction and visual inspection.

**Ordering defects:**

| Lesson | Prerequisite | Registry positions | Issue |
|---|---|---|---|
| `caching-eviction` | `sql-modeling` | caching 4th, SQL 5th in Foundations | The required SQL lesson appears after the caching lesson. |
| `transformer-bottlenecks` | `linear-algebra`, `attention-scaling-laws` | Inference appears before ML Math | The first inference lesson is gated behind a later track. |
| `pretraining-posttraining` | `backprop-optimizers`, `probability-information` | Inference appears before ML Math | Same cross-track inversion. |

`probabilistic-sketches` also requires `consistent-hashing`, but Bloom/HLL concepts depend more directly on hashing and probability than on ring membership. The link is valid but pedagogically weak.

Lessons have no reciprocal `relatedBlogIds` field. Blogs link to lessons, but a learner in a lesson cannot follow a content link to the relevant blog.

## Prioritized content issues

### P0 — actively undermines learning or misleads

#### P0-1 — Story Mode is templated across 22 lessons

**Affected:** all lessons in `ai-engineering`, `llm-inference`, `ml-math`, and `backend-cloud`; `steps[0..3].story`.  
**Evidence:** “The scene works because it exposes a boundary…” (24 times); “The workshop comparison becomes useful…” (24); “The labeled-jar view keeps attention…” (20); “The operational scene matters…” (20).  
**Why it matters:** the opening is meta-commentary, not a vivid scene, and the repetition makes Story Mode feel generated.  
**Rewrite direction:** delete the shared opener and begin with the concrete analogy. Keep the useful scene that follows; do not rewrite the whole technical lesson.

#### P0-2 — Engineer Mode repeats the same preface in 88 steps

**Affected:** the same 22 lessons; `steps[0..3].engineer`.  
**Evidence:** “Production implementation requires measurable invariants…” and its three track-specific equivalents.  
**Why it matters:** the preface consumes space without adding mechanics and makes distinct lessons sound identical.  
**Rewrite direction:** lead with the formula, algorithm, state transition, resource model, or design decision. Move generic advice into a track-level primer if needed.

#### P0-3 — Multiple visual IDs depict the wrong concept

**Affected examples:**

- `linear-algebra` steps 1–4, `probability-information` steps 1, 2, 4, `backprop-optimizers` steps 1–4, and `notation-decoder` steps 1–4 use `visualId: "notation-decoder"` while the component renders only `λ / μ = ρ`.
- `lld-lru-cache` step 2 says “hash map … doubly linked list” but uses that same queueing-equation visual.
- `lld-pubsub` step 2, `lld-parking-lot` step 1, and `lld-elevator` step 1 also use it for unrelated data structures.
- `tokenization` steps 1–4 use `token-math`, which depicts weights/KV/activations rather than text becoming token IDs.
- `linux-docker` step 1 and `kubernetes` step 1 use `realtime-channels`, which depicts polling/SSE/WebSockets rather than namespaces or reconciliation.

**Why it matters:** the visual contradicts the lesson and can teach the wrong mental model.  
**Rewrite direction:** replace the broad registry with concept-specific visuals. At minimum, make notation topic-aware and add bespoke visuals for tokenization, LRU/LFU, pub/sub routing, parking allocation, elevator state, namespaces, and Kubernetes reconciliation.

#### P0-4 — Step 5 of every case study and blog repeats step 1 visually

**Affected:** `steps[4]` of all 12 case-study lessons and all 8 blogs.  
**Evidence:** `Frame.tsx` uses `stepIndex % 4`; all five-step topics therefore wrap.  
**Why it matters:** the final synthesis/security step is visually identical to the opening step.  
**Rewrite direction:** support five meaningful states or assign a distinct final-state visual. Do not solve this only by changing the caption.

### P1 — substantial depth, assessment, or coherence problem

#### P1-1 — Abstract story extensions dilute 100 otherwise useful stories

**Affected:** every step of all case studies and blogs.  
**Evidence:** `lld-elevator` step 1 appends “The controller's job is to make the exciting behavior boring…”; `discord-trillions-of-messages` step 1 appends “The model should make recent conversation cheap…”.  
**Rewrite direction:** continue the real-world scene with a concrete event, decision, or consequence. Remove the extension if the base story is already complete.

#### P1-2 — Captions are story hooks, not visual captions

**Affected:** all 60 case-study steps and 40 blog steps.  
**Evidence:** `url-shortener` step 1 caption is “Imagine a coat-check counter at a stadium.”  
**Rewrite direction:** author captions that identify the visual's mechanism, state change, and relevant labels. Treat captions as accessibility text, not duplicated narrative.

#### P1-3 — Quiz kinds are mechanically assigned and story-match coverage is missing

**Affected:** all case studies and blogs (no story-match); all six inference lessons (no story-match); all five ML Math lessons plus `transformer-bottlenecks`, `prefill-decode-batching`, and `kubernetes` (no security question).  
**Evidence:** fixed `QUIZ_KINDS` array; `url-shortener` quiz[2] Bloom-filter correctness is tagged `security`; `chat-system` quiz[2] reconnect recovery is tagged `security`.  
**Rewrite direction:** assign kinds from the actual cognitive task. Add at least one story-match question to every case study, blog, and inference lesson; add security questions to ML Math and the missing inference/backend topics.

#### P1-4 — Answer positions and distractors are predictable

**Affected:** curriculum-wide, worst in blogs and case studies.  
**Evidence:** 157/244 answers are index 1; 27/32 blog answers are index 1. Examples: `database-melts-at-10k-rps` quiz[0] includes “The color of the architecture diagram”; `single-server` quiz[0] includes “Disable health checks so more requests can enter”; `appsec-zero-trust` quiz[1] includes “Ask the model to rewrite the SQL.”  
**Rewrite direction:** use plausible near-misses that reflect common misconceptions, and deliberately balance answer positions.

#### P1-5 — LFU tie-breaking question is ambiguous

**Affected:** `lld-lru-cache`, quiz[1].  
**Evidence:** “In LFU, what breaks ties among items at the minimum frequency?” The answer is “The least recently used item,” while the lesson itself says LFU evicts the least frequent key “usually” breaking ties by recency.  
**Why it matters:** LFU does not inherently require LRU tie-breaking; another deterministic policy can be valid.  
**Rewrite direction:** ask about “this lesson's LFU-with-LRU implementation” or make the tie policy explicit in the prompt.

#### P1-6 — Prerequisite order contradicts the registry sequence

**Affected:** `caching-eviction`, `transformer-bottlenecks`, `pretraining-posttraining`.  
**Evidence:** caching requires a later SQL lesson; inference requires later ML Math lessons.  
**Rewrite direction:** move ML Math before LLM Inference and SQL before caching, or change the gating/path so learners are not sent forward to unlock earlier content.

#### P1-7 — Security practices repeat near-verbatim across adjacent topics

**Affected:** `queues-jobs`/`kafka-streaming` security[1–2]; `replication-consistency`/`scaling-databases` security[0]; `agent-loop`/`ai-security`/agent-injection blog.  
**Evidence:** both queue lessons require “bounded retries with jitter” and an access-controlled dead-letter path; both replication lessons require fencing and a controlled failover test.  
**Rewrite direction:** keep the shared principle but differentiate the mechanic: queue visibility timeout vs Kafka offset commit, replica election vs database promotion, retrieved-text influence vs tool-argument exfiltration, etc.

#### P1-8 — Legacy security “coverage” is presence-only

**Affected:** `src/data/securityPractices.ts`, `evaluateSecurityPractice`.  
**Evidence:** `return (practice?.tryOnCanvas ?? []).every((id) => present.has(id));`.  
**Why it matters:** resource presence is not control configuration or verification.  
**Rewrite direction:** rename the helper to describe primitive availability, and add explicit verification evidence before calling a practice covered.

#### P1-9 — Curriculum tests enforce shape but not quality

**Affected:** `src/content/platform/__tests__/curriculum.test.ts`.  
**Evidence:** Story/Engineer checks only require 90 words; quiz checks only require four choices, a valid answer index, and a non-empty explanation; visual checks only validate registry membership.  
**Rewrite direction:** add regression tests for repeated openers, caption duplication, five-step visual state reuse, quiz kind coverage, answer-position balance, prerequisite order, and a semantic visual allowlist.

### P2 — polish, clarity, or maintainability

#### P2-1 — Exact sentence duplicated inside one step

**Affected:** `observability-slos`, step 1.  
**Evidence:** “The director reviews both the target and its measurement every quarter.” appears in both `story` and `engineer`.  
**Rewrite direction:** keep it in the story; replace the engineer sentence with measurement governance specifics.

#### P2-2 — Generated Engineer filler appears four times

**Affected:** `lld-pubsub` step 5, `discord-trillions-of-messages` step 1, `what-happens-during-token-generation` step 2, `zero-downtime-schema-migrations` step 1.  
**Evidence:** “This boundary should be visible in tests and operational telemetry, not only in the design document.”  
**Rewrite direction:** replace with a topic-specific test or metric.

#### P2-3 — Mixed or mismatched analogies

- `what-happens-during-token-generation` step 2 starts with “Reading a long briefing…” and then switches to “A theater analogy helps: prefill is the cast assembling on stage…” Two unrelated scenes compete in one paragraph.
- `probability-information` stories all open with “The labeled-jar view…” even when the actual scene is weather, coins, or maps.

**Rewrite direction:** use one sustained scene per step and name the mapping explicitly.

#### P2-4 — Copy and precision edits

- `url-shortener` step 4 `engineer`: “wait for a analytics pipeline” → “an analytics pipeline.”
- `metrics-alerting` step 5 `story`: “removing sireers” → “removing sirens.”
- `networking-protocols` step 2 `engineer`: “Header compression and flow control reduce repeated metadata and protect receivers” conflates two effects; header compression reduces metadata, flow control protects receivers.

#### P2-5 — No reciprocal lesson-to-blog links

**Affected:** the `Lesson` schema and all 53 lessons.  
**Evidence:** blogs have `relatedLessonIds`; lessons have no related-blog field.  
**Rewrite direction:** add reciprocal links for the eight existing blogs and surface them at the end of relevant lessons.

#### P2-6 — LLD lessons stop short of interview-ready artifacts

**Affected:** `lld-lru-cache`, `lld-pubsub`, `lld-parking-lot`, `lld-elevator`.  
**Evidence:** the lessons describe structures and invariants, but do not show concrete class/method contracts or compact pseudocode. For example, `lld-lru-cache` says “Specify get, put, optional delete…” without rendering the contract.  
**Rewrite direction:** add a small interface block, complexity table, invariant list, and 3–5 high-value test cases. Keep the existing prose.

## Highest-impact 20 upgrades

1. **De-template AI stories:** remove the shared opener from all 24 AI Engineering steps and lead with the translator, stage, key, workshop, notebook, theater, building, memo, apprentice, loading-bay, or badge scene.
2. **De-template inference stories:** remove the shared workshop preface from all 24 inference steps; retain the bookmarks, notebooks, measuring-cup, scholar, shuttle, and delivery analogies.
3. **De-template ML Math stories:** remove the repeated jar preface and use one coherent recipe/weather/hiker/map scene per step.
4. **De-template Backend stories:** remove the repeated operational preface and lead with the cashier, conveyor, relay, workshop, shipping container, warehouse, bridge, or office scene.
5. **De-template Engineer mode:** replace all 88 repeated openers with the actual formula, mechanism, state machine, or resource tradeoff.
6. **Rebuild `notation-decoder`:** make it equation/topic-aware or replace it with separate vector, matrix, probability, optimization, and notation visuals; remove all current false matches.
7. **Add bespoke LLD visuals:** LRU/LFU structures, pub/sub trie and queues, parking-spot claim state, and elevator dispatch/safety state.
8. **Add a networking visual set:** DNS resolution/cache, HTTP/2 multiplexing, QUIC independent loss recovery, and gRPC schema/deadline.
9. **Add an observability visual set:** SLI/SLO rollup, metrics/logs/traces correlation, burn-rate windows, and alert pending/firing/resolved state.
10. **Add inference-specific visuals:** roofline, prefill vs decode, continuous batching, quantization scales, and training-stage data flow.
11. **Add backend-specific visuals:** namespaces/cgroups, image layers/provenance, Kubernetes reconciliation/HPA/node scaling, and expand-contract migration.
12. **Fix five-step visual wrapping:** give every case study/blog a distinct fifth visual state.
13. **Rewrite 100 generated story extensions:** continue the scene with concrete action or delete the extension.
14. **Replace 100 generated captions:** write visual-specific captions and accessibility text.
15. **Rebuild case-study/blog quizzes:** add story-match questions and relabel questions by actual cognitive task.
16. **Fill quiz coverage gaps:** add security questions to all ML Math lessons, `transformer-bottlenecks`, `prefill-decode-batching`, and `kubernetes`; add story-match to inference and missing AI/backend topics.
17. **Rebalance answer positions and distractors:** reduce index-1 concentration and replace jokes with plausible misconceptions.
18. **Differentiate repeated security practices:** add unique mechanics and verification for queues vs Kafka, database vs replica failover, and agent-loop vs AI-security vs the injection blog.
19. **Fix learning order and links:** place SQL before caching and ML Math before inference; add reciprocal lesson/blog links and reconsider `probabilistic-sketches` prerequisites.
20. **Upgrade curriculum tests and legacy security coverage:** test repetition, semantic visuals, five-step behavior, quiz diversity, answer balance, and prerequisite order; require configuration evidence before marking a security practice covered.

## Per-topic audit matrix

Scores: **S**tory / **E**ngineer / **Sec**urity / **Q**uiz / **V**isual. “Keep” means the prose/security substance should not be rewritten wholesale.

### Foundations

| Lesson | S/E/Sec/Q/V | Audit note |
|---|---|---|
| `single-server` | 4.5/4.5/4.5/3.5/3.0 | Keep. Strong suitcase/shared-ledger story and resource diagnosis; quiz distractor “Disable health checks…” is implausible. |
| `networking-protocols` | 4.5/4.5/4.5/4.0/2.5 | Keep prose. DNS/HTTP2/HTTP3/gRPC mechanics are specific; three `traffic-flow` visuals do not show the protocols. |
| `load-balancing` | 4.5/4.5/4.5/4.0/3.0 | Keep. Readiness, affinity, trusted-proxy headers, and private origins are well covered. |
| `caching-eviction` | 4.5/4.5/4.5/4.0/3.0 | Keep. Labels, TTL vs eviction, stampedes, poisoning, and timing leaks are strong. Fix prerequisite order. |
| `sql-modeling` | 4.5/4.5/4.5/4.0/2.5 | Keep. Normalization, transactions, indexes, parameterization, and role separation are concrete. |
| `scaling-databases` | 4.5/4.5/4.5/4.0/3.5 | Keep. Read-your-writes, fencing, replica lag, and restore drills are strong. |
| `rate-limiting` | 4.5/4.5/4.5/4.0/3.5 | Keep. Token buckets, distributed counters, fail-open/closed policy, and retry accounting are useful. |
| `queues-jobs` | 4.5/4.5/4.5/4.0/4.5 | Keep. Ticket rail, lease redelivery, poison messages, and downstream-aware scaling are excellent. |
| `realtime` | 4.5/4.5/4.5/4.0/4.5 | Keep. Polling/SSE/WebSocket comparison and active-connection revocation are strong. |

### Distributed Systems

| Lesson | S/E/Sec/Q/V | Audit note |
|---|---|---|
| `replication-consistency` | 5/5/4.5/4/4 | Keep. Sync/async, quorum caveats, CAP/PACELC, fencing, and replay protection are standout content. |
| `sharding-hot-keys` | 5/5/4.5/4/4 | Keep. Range/hash/directory routing, hot-key relief, migration state, and tenant isolation are strong. |
| `consistent-hashing` | 5/5/4.5/4/4.5 | Keep. Ring/virtual nodes/handoff/failure domains are well explained. |
| `raft-consensus` | 5/5/4.5/4/4.5 | Keep. Election restriction, current-term commit, learners, and joint consensus are accurate and specific. |
| `locks-circuit-breakers` | 5/5/4.5/4/2.5 | Keep prose. Fencing and breaker states are excellent; generic threat/limiter visuals underserve them. |
| `storage-engines` | 5/5/4.5/4/4 | Keep. WAL, B-tree, LSM compaction, MVCC, corruption, and retention are strong. |
| `kafka-streaming` | 5/5/4.5/4/4 | Keep. Partition order, offsets, rebalances, idempotency, and poison events are concrete. Differentiate security from `queues-jobs`. |
| `distributed-transactions` | 5/5/4.5/4/4.5 | Keep. 2PC blocking, saga compensation, outbox intent, and replay safety are strong. |
| `probabilistic-sketches` | 5/5/4.5/4/4.5 | Keep. False positives, sizing, HLL merging, privacy, and exact-check boundaries are strong. Reconsider prerequisite. |
| `observability-slos` | 4.5/4.5/4.5/4/2.5 | Keep after removing duplicated sentence. Strong SLI/burn-rate/error-budget content; visuals are generic. |

### Case Studies

All 12 have strong Engineer and Security content. Story scores reflect the appended abstract extension; Quiz scores reflect missing story-match and weak distractors.

| Lesson | S/E/Sec/Q/V | Audit note |
|---|---|---|
| `url-shortener` | 3.5/4.5/4.5/2.5/2.5 | Keep base story/engineer/security. Fix “a analytics,” caption generation, and quiz kinds. |
| `chat-system` | 3.5/4.5/4.5/2.5/3.0 | Keep. Durable ack, sequence recovery, slow-consumer buffers, and membership revocation are strong. |
| `video-streaming` | 3.5/4.5/4.5/2.5/2.5 | Keep. Bandwidth math, signed playback, immutable uploads, and decoder sandboxing are strong. HLS visual is mismatched. |
| `news-feed` | 3.5/4.5/4.5/2.5/3.0 | Keep. Hybrid fan-out, bounded celebrity merge, tombstones, and read-time deny paths are strong. |
| `ride-hailing` | 3.5/4.5/4.5/2.5/2.5 | Keep. Geospatial candidate reduction, offer leases, trip state, and location privacy are strong. |
| `search-engine` | 3.5/4.5/4.5/2.5/2.0 | Keep. Crawl provenance, inverted index, permission-aware retrieval, and blue-green indexes are strong. `rag-space` is wrong for lexical ranking. |
| `metrics-alerting` | 3.5/4.5/4.5/2.5/1.5 | Keep. Cardinality, ingestion lag, durable alert state, and paging policy are strong. Raft visual is wrong for alert state. |
| `lld-lru-cache` | 3.5/4.5/4.5/2.5/1.0 | Keep prose. Fix LFU question ambiguity and replace notation/realtime visuals. Add interface/pseudocode. |
| `lld-rate-limiter` | 3.5/4.5/4.5/2.5/2.5 | Keep. Atomic transitions, authenticated keys, costs, and degraded mode are strong. |
| `lld-pubsub` | 3.5/4.5/4.5/2.5/2.0 | Keep. Trie/map routing, durable delivery, backpressure, and wildcard authorization are strong. Notation visual is wrong. |
| `lld-parking-lot` | 3.5/4.5/4.5/2.5/1.5 | Keep. Atomic spot claims, idempotent gates, reservation expiry, and override audit are strong. Hash/replication visuals are wrong. |
| `lld-elevator` | 3.5/4.5/4.5/2.5/1.5 | Keep. SCAN/LOOK, dispatch scoring, deterministic simulation, and local safety authority are strong. Hash/realtime visuals are wrong. |

### AI Engineering

| Lesson | S/E/Sec/Q/V | Audit note |
|---|---|---|
| `tokenization` | 2.5/4/4/3.5/1.5 | Keep technical substance after removing boilerplate. Tokenizer/model contract and truncation policy are useful; visual is wrong. |
| `embeddings-rag` | 2.5/4.5/4.5/3.5/4.0 | Keep. Hybrid retrieval, pre-ranking ACLs, provenance, citations, and poisoning controls are strong. |
| `agent-loop` | 2.5/4.5/4.5/4/4.5 | Keep. Deterministic orchestration, structured observations, bounded loops, and per-action permissions are strong. |
| `memory-architectures` | 2.5/4/4/3.5/2.0 | Keep. Working vs durable memory, write policy, conflict handling, and deletion are useful; KV visuals are wrong. |
| `evals-guardrails` | 2.5/4/4/3.5/2.0 | Keep. Stage-specific metrics, layered controls, fail-closed behavior, and canary feedback are strong; visuals are generic. |
| `ai-security` | 2.5/4.5/4/3.5/3.0 | Keep. Trust boundaries, sandboxing, exfiltration channels, and object-level authorization are strong but overlap earlier lessons. |

### LLM Inference

| Lesson | S/E/Sec/Q/V | Audit note |
|---|---|---|
| `transformer-bottlenecks` | 2.5/4.5/3.5/3/2.5 | Keep technical core. Add security/story-match quiz coverage and a roofline/QKV/MLP visual. |
| `kv-cache-paged-attention` | 2.5/5/4/3.5/4.0 | Keep. Exact 512 MiB worked example, cache lifetime, GQA/MQA, paging, and tenant isolation are standout content. |
| `prefill-decode-batching` | 2.5/4.5/3.5/3/3.0 | Keep. Compute vs bandwidth, continuous batching, disaggregation, and queue spans are strong. Add security/story-match questions. |
| `quantization` | 2.5/4.5/3.5/3.5/2.0 | Keep. Formats, granularity, calibration, QAT, and whole-path measurement are strong; visual does not show numeric precision. |
| `latency-cost-budgets` | 2.5/4.5/3.5/3.5/2.5 | Keep. TTFT/inter-token/queue decomposition and cost per successful task are strong. |
| `pretraining-posttraining` | 2.5/4.5/3.5/3.5/2.0 | Keep. Next-token objective, SFT, RLHF proxy risk, and DPO mechanics are strong; visuals are mostly wrong. |

### ML Math

| Lesson | S/E/Sec/Q/V | Audit note |
|---|---|---|
| `linear-algebra` | 3/4.5/3.5/3/1.0 | Keep formulas and numerical-risk prose. Add security quiz and replace queueing-equation visual. |
| `probability-information` | 2.5/4.5/3.5/3/1.0 | Keep Bayes/entropy/KL/temperature mechanics. Fix jar framing, entropy visual, and missing security quiz. |
| `backprop-optimizers` | 3/4.5/3.5/3/1.0 | Keep chain rule, AdamW, clipping, and stability monitoring. Replace notation visual and add security quiz. |
| `attention-scaling-laws` | 3/4.5/3.5/3/2.0 | Keep attention equation, quadratic/linear split, and empirical-scaling caveats. Add security/story-match questions. |
| `notation-decoder` | 3/4.5/4/3/1.0 | Keep shape-led decoding method. The visual does not display the attention equation the lesson teaches. Add security quiz. |

### Backend/Cloud

| Lesson | S/E/Sec/Q/V | Audit note |
|---|---|---|
| `concurrency-event-loops` | 2.5/4/4/3.5/2.5 | Keep. Event-loop lag, bounded pools, cancellation, and idempotency are useful. Add story-match question. |
| `linux-docker` | 2.5/4.5/4.5/3.5/1.5 | Keep. Namespaces/cgroups, image layers, capabilities, probes, and provenance are strong. Replace namespace/image visuals. |
| `kubernetes` | 2.5/4.5/4.5/3/1.5 | Keep. Reconciliation, requests/limits, HPA, and cluster autoscaling are strong. Replace control-plane visual and add security quiz. |
| `safe-deployments` | 2.5/4.5/4.5/3.5/2.5 | Keep. Canary gates, rollback, artifact digests, and expand-contract are strong. Migration visual is wrong. |
| `appsec-zero-trust` | 2.5/4.5/4.5/3.5/2.0 | Keep. Object authorization, parameterization, JWT validation, and SSRF egress are strong. Add story-match/scenario variety. |

### Blogs

| Blog | S/E/Sec/Q/V | Audit note |
|---|---|---|
| `database-melts-at-10k-rps` | 4/4.5/4.5/2.5/2.5 | Keep. QPS→concurrency math, lock/I/O diagnosis, cache discipline, outbox, and staged scaling are strong. |
| `discord-trillions-of-messages` | 4/4.5/4.5/2.5/2.0 | Keep. Channel/time partitioning, derived views, deletion propagation, and export quotas are strong. Notation visual is wrong. |
| `securing-agents-against-indirect-injection` | 4/4.5/4.5/2.5/3.0 | Keep. Trust boundary, typed evidence, scoped tools, action-bound approval, and kill switches are strong. |
| `what-happens-during-token-generation` | 3.5/4.5/4.5/2.5/3.0 | Keep. Autoregressive loop, prefill/decode, KV, batching, and cancellation are strong. Fix mixed theater analogy. |
| `zero-downtime-schema-migrations` | 4/4.5/4.5/2.5/2.5 | Keep. Expand-contract, keyset backfill, shadow writes, rollback, and migration credentials are strong. |
| `consistent-hashing-in-production` | 4.5/4.5/4.5/2.5/3.5 | Keep. Ring remapping, virtual nodes, handoff, hot keys, and controlled membership changes are strong. |
| `kafka-consumer-lag` | 4.5/4.5/4.5/2.5/2.0 | Keep. Event age, throughput vs parallelism, downstream backpressure, rebalances, and incident playbook are strong. |
| `error-budgets-that-engineers-trust` | 4.5/4.5/4.5/2.5/2.0 | Keep. User-visible SLI, multi-window burn, release policy, telemetry completeness, and budget tampering are strong. |

## Content that is already strong and should not be rewritten

- **All Foundations and Distributed `story`, `engineer`, and `security` prose** is worth preserving. Make targeted quiz/visual/order edits, not wholesale rewrites.
- **All case-study `engineer` and `security` fields** are production-oriented and specific. The base stories are also useful before the generated extension is appended.
- **All blog `engineer` and `securityTakeaways` fields** are strong. The base stories are also worth keeping.
- **AI Engineering technical substance after the repeated opener** is strong, especially `embeddings-rag`, `agent-loop`, and `ai-security`.
- **Inference technical substance after the repeated opener** is strong, especially the exact KV-cache calculation, prefill/decode distinction, quantization calibration, and RLHF/DPO caveats.
- **ML Math formulas, shape reasoning, and numerical-stability warnings** are strong. Preserve them while replacing visuals and boilerplate.
- **Backend operational mechanics** are strong: event-loop lag, namespace/cgroup distinctions, HPA vs node autoscaling, canary stop signals, JWT validation, and SSRF egress controls.
- **Specific standout steps:** `caching-eviction` “The cup label must name the exact drink”; `raft-consensus` “The oldest promise still matters”; `locks-circuit-breakers` fencing-token explanation; `queues-jobs` lost-acknowledgment story; `video-streaming` signed playback; `search-engine` permission-aware retrieval; `ai-security` exfiltration-channel analysis; `kv-cache-paged-attention` worked memory formula; `notation-decoder` shape-table method; `appsec-zero-trust` complete token contract.
- **Metadata foundations are sound:** unique IDs, valid prerequisites, valid blog links, no cycles, custom story hooks, no placeholder text, and plausible reading times.
- **Security posture is defensive:** no offensive commands, payload recipes, exploit walkthroughs, or unsafe target instructions were found in the audited platform content or legacy security-practice file.

## Validation performed

- `npx vitest run src/content/platform/__tests__/curriculum.test.ts` — **13/13 tests passed**.
- Read-only registry analysis confirmed 7 tracks, 53 lessons, 8 blogs, 264 steps, 244 quiz questions, and 183 security practices.
- No prerequisite cycles or unresolved prerequisite/blog lesson IDs were found.
- No source files were edited; this report is the only audit artifact.

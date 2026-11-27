import type { Track } from "@/learning/platform/types";

const aiTrack: Track & { trackId: string } = {
  id: "ai-engineering",
  slug: "ai-engineering",
  trackId: "ai-engineering",
  title: "AI Engineering",
  summary:
    "Build reliable model-powered products by budgeting context, grounding answers, controlling agent tools, and evaluating security behavior before release.",
  accent: "cyan",
  lessons: [
    {
      id: "tokenization",
      slug: "tokenization",
      trackId: "ai-engineering",
      title: "Tokenization and Context Windows",
      summary:
        "See how text becomes token IDs, why context is a shared budget, and how to prevent silent truncation and surprise usage.",
      minutes: 10,
      storyHook:
        "A translator packs meaning into labeled parcels before a model can reason about it.",
      prerequisites: [],
      steps: [
        {
          id: "tokenization-parcels",
          title: "Text becomes numbered parcels",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. Imagine a translator packing a long letter into numbered parcels. Common phrases travel in one parcel, while an unusual name may need several. The recipient never sees the original letter directly; they see parcel numbers arranged in a precise order. A tokenizer does something similar for a language model. It turns text into integer IDs from a fixed vocabulary, usually using byte-pair encoding or a related subword method. This is why a short-looking sentence can occupy more room than expected and why punctuation, whitespace, and non-English text can change the count.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Tokenization maps text to token IDs with the exact tokenizer used during model training. Subword vocabularies balance vocabulary size against sequence length: smaller pieces cover more text but produce longer sequences. Token boundaries need not align with words, syllables, or characters, and byte fallback allows unusual Unicode input. Engineers should count tokens with the serving tokenizer rather than estimating from characters. A mismatch between tokenizer and model corrupts the input representation, while inconsistent preprocessing changes cost, latency, and sometimes model behavior.",
          visualId: "token-math",
          visualCaption:
            "The token counter turns text into numbered pieces and totals the context they occupy.",
        },
        {
          id: "tokenization-budget",
          title: "The context window is a shared stage",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. Picture a theater stage that must hold the script, stage directions, previous scenes, and space for the actor's next speech. Every item uses the same floor, even if the actor has not spoken yet. A context window works like that stage: instructions, conversation history, retrieved documents, tool definitions, tool results, and the reserved answer all consume capacity. Adding one useful manual does not make the stage larger. Good engineering means deciding what belongs under the lights now, what can stay in the wings, and what must be summarized before the next scene begins.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. The context limit is a maximum sequence capacity, not a promise that all information will be remembered equally well. Build an explicit budget for system instructions, user input, history, retrieved passages, tool schemas, prior tool outputs, and a reserved generation allowance. Reject or safely summarize inputs that exceed the budget rather than silently dropping their beginning or end. Long-context models still face attention cost, latency growth, and attention dilution. Track utilization and retrieval quality together; a request that fits technically can still fail because important evidence is buried.",
          visualId: "token-math",
          visualCaption:
            "A context budget reserves space for instructions, evidence, tool traffic, and the answer.",
        },
        {
          id: "tokenization-contract",
          title: "Tokenizer and model are one contract",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. A key only opens the lock it was cut for, and a tokenizer is the key to a model's vocabulary. Handing a model IDs from another tokenizer is like delivering perfectly organized luggage with labels from a different railway. The pieces may look plausible, but their meanings no longer match. Special tokens add another layer: they mark system boundaries, conversation turns, or the beginning of an answer. Treating those markers as ordinary text can erase the structure the model was trained to recognize. Production teams therefore version the tokenizer beside the model.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Model artifacts, tokenizer files, chat templates, and special-token definitions must be deployed as one versioned unit. Use the provider's documented counting endpoint or the matching local tokenizer, and test every supported language plus long identifiers, URLs, code, and emoji. Chat templates may add invisible control tokens that plain token counting misses, so count the fully rendered request. Pin preprocessing behavior in evaluations and log only safe aggregate usage. A rollout that changes the template without rechecking tool formats can produce parse failures even when the model weights remain unchanged.",
          visualId: "token-math",
          visualCaption:
            "The model and tokenizer form a versioned pair with matching IDs and boundary markers.",
        },
        {
          id: "tokenization-cost",
          title: "Count before sending, meter after serving",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. A careful caterer estimates portions before opening the kitchen, then records what was actually eaten. Token engineering follows the same rhythm. Preflight counting prevents requests that cannot fit, while post-response metering reveals the real input and output totals. Output often has a different price and latency profile from input, so treating every token as equal gives a misleading bill. Dashboards should distinguish prompt tokens, generated tokens, cached prefixes where supported, and failed attempts. The goal is not merely a cheaper invoice; it is predictable behavior under a fixed product budget.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Calculate the complete request token count before dispatch and compare it with the model's input and output limits. After serving, reconcile provider usage with internal request records so anomalous consumers and repeated retries are visible. Set per-user, per-tenant, and per-workflow token budgets, and choose a deterministic policy for overflow: reject, summarize, retrieve a smaller passage, or ask the user to narrow the request. Include system prompts and tool schemas in cost accounting. A failure mode is estimating from response text alone, which hides retrieval and tool overhead that may dominate agent traffic.",
          visualId: "token-math",
          visualCaption:
            "Preflight counting and post-response metering expose the real token cost of a workflow.",
        },
      ],
      security: [
        {
          id: "tokenization-sensitive-logs",
          title: "Keep sensitive text out of token logs",
          threat:
            "Raw prompts and retrieved documents may contain credentials, personal data, or tenant information that leaks through debug logs.",
          control:
            "Log token counts, request IDs, and redacted metadata instead of message bodies, and apply retention limits to diagnostic traces.",
          verify:
            "Inspect representative logs and trace exports for known test secrets and personal fields before enabling production sampling.",
        },
        {
          id: "tokenization-data-boundary",
          title: "Separate instructions from retrieved data",
          threat:
            "Untrusted text inside a document may be mistaken for directions that override the application's intended task.",
          control:
            "Delimit retrieved content as data, keep trusted policy in a separate instruction channel, and require tool calls to pass an independent permission check.",
          verify:
            "Run benign adversarial document tests and confirm the model cannot change policy, permissions, or tool scope by wording alone.",
        },
        {
          id: "tokenization-safe-truncation",
          title: "Make truncation explicit",
          threat:
            "Silent truncation can remove consent text, authorization conditions, or the user's actual question while still returning a confident answer.",
          control:
            "Reserve answer capacity, summarize only permitted sections, and reject inputs whose essential content cannot fit safely.",
          verify:
            "Test oversized requests and confirm the response or telemetry clearly records what was omitted without exposing its contents.",
        },
      ],
      quiz: [
        {
          id: "tokenization-q1",
          topicId: "tokenization",
          prompt: "Why should token counting use the model's exact tokenizer?",
          choices: [
            "Because every token has the same price",
            "Because token IDs and boundaries depend on the tokenizer vocabulary",
            "Because character counting cannot handle English",
            "Because tokenizers remove the need for a context limit",
          ],
          answerIndex: 1,
          explanation:
            "Token IDs and boundaries are vocabulary-specific, so a different tokenizer produces a different model input and an unreliable budget estimate.",
          kind: "tradeoff",
        },
        {
          id: "tokenization-q2",
          topicId: "tokenization",
          prompt: "Which item belongs in a complete context budget?",
          choices: [
            "Only the latest user message",
            "Only the generated answer",
            "Instructions, history, retrieved text, tool traffic, and reserved output",
            "Only text visible to the end user",
          ],
          answerIndex: 2,
          explanation:
            "All rendered components share the model's sequence capacity, including hidden instructions, tool schemas, and reserved generation space.",
          kind: "scenario",
        },
        {
          id: "tokenization-q3",
          topicId: "tokenization",
          prompt: "What is the safest response to an oversized request?",
          choices: [
            "Silently remove its opening paragraph",
            "Apply an explicit reject, summarize, or narrowing policy",
            "Ignore the model's output limit",
            "Convert every character into one token",
          ],
          answerIndex: 1,
          explanation:
            "An explicit overflow policy preserves important content and makes omissions visible instead of hiding destructive truncation.",
          kind: "security",
        },
        {
          id: "tokenization-q4",
          topicId: "tokenization",
          prompt: "Why version the tokenizer with the model?",
          choices: [
            "To increase the vocabulary automatically",
            "To make all languages share one token",
            "To avoid metering output tokens",
            "To preserve matching IDs, templates, and special-token behavior",
          ],
          answerIndex: 3,
          explanation:
            "The model was trained against a specific tokenizer and template; deploying a mismatched pair changes the represented input.",
          kind: "tradeoff",
        },
      ],
    },
    {
      id: "embeddings-rag",
      slug: "embeddings-rag",
      trackId: "ai-engineering",
      title: "Embeddings and Hybrid RAG",
      summary:
        "Retrieve relevant, authorized evidence by combining vector similarity with lexical search, metadata filters, and grounded citations.",
      minutes: 12,
      storyHook:
        "A research librarian finds the right shelf, checks the index card, and returns only pages the reader is allowed to open.",
      prerequisites: ["tokenization"],
      steps: [
        {
          id: "embeddings-map",
          title: "Embeddings place meaning on a map",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. Imagine a vast library where books about refunds sit near other books about refunds, even when one says 'money back' and another uses 'return policy.' An embedding model creates that map by turning text into a vector of numbers. Nearby vectors often express related meaning, while distance reflects semantic difference. The map is useful but not infallible: a book can be close because it shares vocabulary rather than because it answers the question. Engineers therefore treat similarity as a retrieval signal, never as proof of truth, freshness, or permission to read.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. An embedding model maps text into a fixed-dimensional vector space. Cosine similarity or normalized dot product compares query and document vectors, and an approximate nearest-neighbor index such as HNSW makes search practical at scale. Chunk and query embeddings must come from compatible models and preprocessing pipelines. Similarity scores are not calibrated probabilities, and thresholds can shift when the model changes. Store the original text and metadata beside each vector so results remain inspectable, re-embeddable, and filterable. Evaluate retrieval independently with labeled queries and relevant document IDs.",
          visualId: "rag-space",
          visualCaption:
            "Query and document vectors meet in a semantic space while source metadata remains attached.",
        },
        {
          id: "embeddings-chunks",
          title: "Chunking decides what can be found",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. A librarian does not tear every book into random confetti. They preserve a coherent paragraph, its heading, and the page reference so a reader can judge the evidence. Retrieval chunks deserve the same care. A chunk that is too small may lose the condition that gives a sentence meaning; one that is too large may dilute the relevant passage with unrelated material. Overlap can rescue a fact split across a boundary, but it also duplicates storage and search results. Good chunking begins with the document's structure, not a universal character count.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Choose chunk boundaries using headings, sections, tables, and semantic continuity, then tune chunk size and overlap against retrieval metrics. Preserve source ID, title, section, version, access labels, and timestamps as metadata. For tables, serialize rows with their headers, and for code retain enough surrounding context to interpret symbols. Indexing should be incremental and idempotent so updates do not create duplicate evidence. The main failure mode is semantically clean chunks that omit essential qualifiers; the opposite failure is broad chunks that rank well but waste context with irrelevant text.",
          visualId: "rag-space",
          visualCaption:
            "Coherent document chunks carry their headings, version, and access labels into the index.",
        },
        {
          id: "embeddings-hybrid",
          title: "Hybrid search balances words and meaning",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. One librarian knows synonyms and concepts; another knows exact names, error codes, and unusual spellings. Asking both is often better than trusting either alone. Vector search can find a policy about returning goods when the user asks for a refund, while lexical search can pinpoint a specific product code that an embedding might blur. The team merges the two ranked lists instead of assuming their raw scores are comparable. Metadata filters run before ranking so unauthorized or obsolete documents never enter the candidate set.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Hybrid retrieval combines dense vector search with sparse lexical ranking such as BM25, then fuses results using a method such as reciprocal rank fusion. This reduces dependence on one representation's blind spots. Apply authorization, tenant, language, and freshness filters inside the retrieval query, not after results are returned to the model. Consider query rewriting for conversational shorthand, but log its effect and avoid inventing facts. Tune candidate counts and fusion weights on a representative evaluation set; excessive rewriting can drift away from the user's actual intent.",
          visualId: "rag-space",
          visualCaption:
            "Authorized lexical and semantic candidate lists are fused into one ranked evidence set.",
        },
        {
          id: "embeddings-grounding",
          title: "Ground answers in inspectable evidence",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. A careful researcher returns an answer with bookmarks. If a claim lacks a bookmark, the reader can challenge it. Retrieval-augmented generation should work the same way: the model receives selected passages, produces an answer, and attaches citations that point back to the source. The interface should let a reviewer open the exact passage, not merely the document's cover page. When evidence conflicts or is missing, the honest response is to state the limitation and ask for clarification rather than filling the gap with fluent speculation.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Construct the final prompt from bounded evidence blocks with stable citation IDs, then validate that cited IDs exist and support the associated claim where automated checks are feasible. Measure retrieval recall, answer faithfulness, citation precision, and abstention behavior separately; a fluent answer can still be unsupported. Keep generation temperature and decoding settings consistent with the task, and route low-confidence cases to a narrower retrieval query or a human. Re-index on source updates and test stale-version behavior so the system does not confidently quote a superseded policy.",
          visualId: "rag-space",
          visualCaption:
            "Evidence blocks flow into a grounded answer whose citations resolve to exact source passages.",
        },
      ],
      security: [
        {
          id: "embeddings-acl-filter",
          title: "Enforce document access before ranking",
          threat:
            "A semantically relevant document may belong to another tenant or carry a stricter access label than the requesting user.",
          control:
            "Partition the index by tenant and apply authorization filters during candidate retrieval, with server-side policy as the authority.",
          verify:
            "Use two test tenants with overlapping topics and confirm restricted passages never appear in candidates, prompts, traces, or citations.",
        },
        {
          id: "embeddings-poisoning",
          title: "Treat indexed content as untrusted",
          threat:
            "A malicious or compromised source can place misleading instructions or fabricated facts into the retrieval corpus.",
          control:
            "Require source provenance, approval status, and version checks, and keep retrieved text separated from trusted instructions.",
          verify:
            "Quarantine a test document with misleading directions and confirm it cannot alter policy, permissions, or tool behavior.",
        },
        {
          id: "embeddings-citation-leak",
          title: "Prevent citations from leaking hidden data",
          threat:
            "Generated citations or debug panels may reveal document titles, snippets, or identifiers that the user is not authorized to see.",
          control:
            "Authorize again at citation rendering and return only the minimum source label and permitted excerpt for each evidence item.",
          verify:
            "Attempt cross-tenant retrieval through normal UI and API paths and inspect responses for hidden filenames or metadata.",
        },
      ],
      quiz: [
        {
          id: "embeddings-q1",
          topicId: "embeddings-rag",
          prompt: "What does a high cosine similarity prove?",
          choices: [
            "That the document is factually correct",
            "That the user has permission to read it",
            "That the document is the newest version",
            "That the vectors are semantically close under the chosen model",
          ],
          answerIndex: 3,
          explanation:
            "Similarity measures vector proximity, not truth, recency, or authorization; those require separate controls and checks.",
          kind: "tradeoff",
        },
        {
          id: "embeddings-q2",
          topicId: "embeddings-rag",
          prompt: "Why combine BM25 with vector search?",
          choices: [
            "To eliminate the need for evaluation",
            "To balance exact lexical matches with semantic similarity",
            "To make every result identical",
            "To remove metadata filters",
          ],
          answerIndex: 1,
          explanation:
            "Lexical and dense retrieval fail differently, so fusion can improve coverage for names, codes, and paraphrased concepts.",
          kind: "tradeoff",
        },
        {
          id: "embeddings-q3",
          topicId: "embeddings-rag",
          prompt: "Where should tenant authorization filters run?",
          choices: [
            "Only when rendering citations",
            "Only in the browser interface",
            "Inside the retrieval query before candidates reach the model",
            "After the answer has been generated",
          ],
          answerIndex: 2,
          explanation:
            "Filtering before ranking and generation prevents unauthorized evidence from entering the model context at all.",
          kind: "security",
        },
        {
          id: "embeddings-q4",
          topicId: "embeddings-rag",
          prompt: "Which practice best preserves evidence quality during chunking?",
          choices: [
            "Split every document into equal random fragments",
            "Use one large chunk for the entire corpus",
            "Discard headings and page references",
            "Respect document structure and preserve provenance metadata",
          ],
          answerIndex: 3,
          explanation:
            "Structural boundaries and provenance keep passages interpretable, filterable, and traceable to their source.",
          kind: "scenario",
        },
      ],
    },
    {
      id: "agent-loop",
      slug: "agent-loop",
      trackId: "ai-engineering",
      title: "The Agent Loop: Planning, Tools, State, Permissions",
      summary:
        "Turn a model into a bounded state machine with explicit observations, validated tool calls, durable state, and least-privilege permissions.",
      minutes: 13,
      storyHook:
        "A workshop assistant may inspect, propose, and act, but only through named tools and within a checked set of permissions.",
      prerequisites: ["embeddings-rag"],
      steps: [
        {
          id: "agent-loop-cycle",
          title: "The loop is a state machine, not a vibe",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. Picture a workshop assistant moving between three stations: think, act, and inspect. At the thinking station it chooses a next action from the current evidence. At the acting station a tool performs one defined operation. At the inspection station the assistant reads the result and updates its plan. Repeating this cycle can solve problems no single prompt could finish, but it also compounds mistakes. The loop needs explicit states, a maximum number of iterations, and a stop condition so the assistant cannot wander forever.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Model each iteration as a transition from a known state: receive a goal, select an allowed action, validate arguments, execute the tool, record the observation, and decide whether to continue or finish. Persist enough state to resume safely after a timeout, including the goal, completed actions, observations, and pending approvals. Put limits around iterations, elapsed time, tool calls, and token spend. The central failure mode is an agent that treats a plausible plan as progress without verifying observations; deterministic orchestration should own completion, retries, and budget enforcement.",
          visualId: "agent-loop",
          visualCaption:
            "Plan, tool call, observation, and state update repeat inside explicit termination and budget checks.",
        },
        {
          id: "agent-loop-tools",
          title: "Tools need contracts and observations",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. A tool is like a well-labeled machine control, not a magic wand. The button's name should explain its purpose, the schema should say which arguments it accepts, and the returned light should report what actually happened. An agent that presses a vaguely named control may misunderstand the result or repeat the action. Good tools return structured observations with status, relevant data, and a safe error description. They also make repeated calls idempotent when the operation could otherwise charge, send, or create something twice.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Define tool names, descriptions, JSON schemas, examples, and error semantics, then validate every call before execution. Separate read-only tools from mutating tools and require an idempotency key for retryable writes. Return bounded observations rather than raw database dumps or unbounded files, and record a correlation ID for tracing. Avoid exposing internal stack traces that leak implementation details. A common failure mode is an ambiguous success response: the model retries because it cannot tell whether the write occurred. Normalize results into explicit success, failure, and needs-approval states.",
          visualId: "agent-loop",
          visualCaption:
            "Validated tool arguments produce bounded, structured observations that the next planning step can inspect.",
        },
        {
          id: "agent-loop-planning",
          title: "Plan lightly, verify constantly",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. A seasoned guide does not memorize a hundred-step route before leaving the trailhead. They keep a short plan, check the next landmark, and revise when the path changes. Agents benefit from the same humility. A detailed plan can organize work, but rigid plans become fiction when a search returns nothing or a tool rejects an argument. Useful agents keep the goal stable, decompose it into checkpoints, and choose the next action from fresh observations. They also know when the honest next action is to ask a person.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Use planning to expose checkpoints and dependencies, not to replace runtime reasoning. After each observation, verify whether the expected state change occurred and whether the next action is still justified. Limit speculative parallelism when actions depend on one another, and use durable workflow state rather than an ever-growing transcript as the source of truth. Recovery paths should include retry with changed arguments, an alternative tool, clarification, and graceful termination. A failure mode is plan drift, where the agent keeps pursuing its original checklist despite evidence that the goal changed.",
          visualId: "agent-loop",
          visualCaption:
            "A lightweight plan is revised after each verified checkpoint rather than followed blindly.",
        },
        {
          id: "agent-loop-permissions",
          title: "Permissions bound every action",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. Giving a workshop assistant access to the whole building is simpler than handing out the right keys, but far more dangerous. Agent permissions should be scoped like those keys: read this catalog, draft this message, or propose this change, but do not send funds or alter access rules without approval. Each request carries the user's identity and the tenant boundary. A friendly-sounding tool description is not an authorization policy. When the task crosses a sensitive boundary, the system pauses and asks a person with the right authority.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Evaluate permissions server-side for every tool invocation using the authenticated user, tenant, resource, action, and current state. Use allowlisted tools, narrow argument schemas, resource-scoped credentials, network egress controls, and human confirmation for consequential writes. Prefer read-only defaults and ephemeral sandbox credentials. Redact secrets from observations and audit tool calls without storing sensitive payloads. A critical failure mode is trusting a model-generated permission claim; authorization must come from the application's identity and policy layer, not from the conversation.",
          visualId: "agent-loop",
          visualCaption:
            "Every tool call passes through identity, tenant scope, resource permissions, and approval policy.",
        },
      ],
      security: [
        {
          id: "agent-loop-injection",
          title: "Do not promote retrieved text into instructions",
          threat:
            "Untrusted search results, documents, or tool output may be mistaken for directions that redirect the agent's task.",
          control:
            "Separate trusted instructions from data, label observations, and require every proposed action to pass the independent policy engine.",
          verify:
            "Test with benign adversarial observations and confirm the agent cannot expand its goal, permissions, or allowed tool set.",
        },
        {
          id: "agent-loop-overreach",
          title: "Allowlist tools and require approval for writes",
          threat:
            "A malformed or misdirected model decision could send messages, spend money, delete resources, or modify access controls.",
          control:
            "Expose only necessary tools, validate schemas, require human confirmation for consequential actions, and make writes idempotent.",
          verify:
            "Run approval-path tests and confirm unapproved writes are rejected before any external side effect occurs.",
        },
        {
          id: "agent-loop-secrets",
          title: "Keep credentials outside model context",
          threat:
            "Broad tool responses may return credentials or private tenant data that then leaks into transcripts, logs, or later answers.",
          control:
            "Use scoped service credentials, redact sensitive output, bound observations, and separate secret storage from model-visible state.",
          verify:
            "Seed test credentials in a tool response and confirm they are absent from model context, logs, traces, and final output.",
        },
      ],
      quiz: [
        {
          id: "agent-loop-q1",
          topicId: "agent-loop",
          prompt: "What should own retries and completion checks?",
          choices: [
            "The model's narrative confidence",
            "Deterministic orchestration around the model",
            "The user reading the full transcript",
            "An unlimited loop",
          ],
          answerIndex: 1,
          explanation:
            "Orchestration provides reliable state transitions, limits, retries, and verifiable completion criteria outside probabilistic generation.",
          kind: "tradeoff",
        },
        {
          id: "agent-loop-q2",
          topicId: "agent-loop",
          prompt: "Why should tool results be structured and bounded?",
          choices: [
            "To make the agent less observable",
            "To eliminate authorization checks",
            "To make every tool result identical",
            "To give the model reliable status without leaking or flooding context",
          ],
          answerIndex: 3,
          explanation:
            "Bounded structured observations clarify success and failure while limiting context growth and sensitive-data exposure.",
          kind: "scenario",
        },
        {
          id: "agent-loop-q3",
          topicId: "agent-loop",
          prompt: "What is the correct source of tool authorization?",
          choices: [
            "The model's stated intention",
            "The tool description alone",
            "Server-side policy using authenticated identity and resource scope",
            "The wording of a retrieved document",
          ],
          answerIndex: 2,
          explanation:
            "Authorization must be derived from trusted identity and policy context, never from generated text or retrieved data.",
          kind: "security",
        },
        {
          id: "agent-loop-q4",
          topicId: "agent-loop",
          prompt: "When should an agent revise its plan?",
          choices: [
            "Only after completing every original step",
            "Never, because plans are deterministic",
            "Only when a human rewrites the prompt",
            "After observations show a checkpoint failed or the goal changed",
          ],
          answerIndex: 3,
          explanation:
            "Fresh observations should drive replanning; otherwise the agent follows an outdated checklist despite contradictory evidence.",
          kind: "story-match",
        },
      ],
    },
    {
      id: "memory-architectures",
      slug: "memory-architectures",
      trackId: "ai-engineering",
      title: "Memory Architectures",
      summary:
        "Distinguish working context from durable memory, govern writes and retrieval, and make tenant isolation and forgetting explicit.",
      minutes: 11,
      storyHook:
        "A good assistant remembers useful preferences without turning every passing remark into permanent policy.",
      prerequisites: ["agent-loop"],
      steps: [
        {
          id: "memory-working",
          title: "Working memory is the current workbench",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. A craftsperson keeps the current sketch, measurements, and open questions on the workbench. Those items are easy to reach, but the bench is small and cleared when the job ends. An AI system's working memory plays the same role: recent messages, active tool results, the current plan, and essential constraints live in the context window. This memory is fast and direct, yet it competes with every other token and disappears when the session resets. Copying the whole workbench into long-term storage usually creates clutter rather than knowledge.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Keep working state explicit and bounded: the active goal, recent turns, validated observations, pending approvals, and a compact task summary. Move large artifacts to external storage and retrieve them on demand. Context compression should preserve decisions, constraints, and unresolved questions rather than merely shortening text. Persist workflow state separately from conversational memory so a process can resume without replaying the entire transcript. A failure mode is treating context-window contents as durable memory; retries, compaction, or a new session can then erase essential state.",
          visualId: "attention-kv",
          visualCaption:
            "The active workbench holds a bounded set of current messages, observations, and task constraints.",
        },
        {
          id: "memory-durable",
          title: "Long-term memory needs a write policy",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. A notebook is not a landfill. Useful entries have a date, a source, and a reason for being kept. An assistant might remember that a user prefers concise answers, but it should not permanently store a frustrated sentence said in passing. Durable memory therefore needs a gatekeeper: decide whether a fact is stable, relevant, permitted, and attributable. Each entry should carry its scope, confidence, and review or expiry information. Without that gatekeeper, a memory system slowly accumulates contradictions and sensitive details that no one can safely interpret.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Classify memory candidates before writing: user profile, task fact, preference, summary, or rejected noise. Require provenance, tenant and user scope, creation time, confidence, and a retention rule. Let users inspect, correct, export, and delete entries, and propagate deletion to derived indexes and caches. Prefer structured records over an undifferentiated transcript, but preserve enough evidence to audit why the memory exists. A failure mode is saving model-generated inferences as established facts; separate user-confirmed facts from tentative hypotheses and avoid using stale memories as authority.",
          visualId: "attention-kv",
          visualCaption:
            "A write gate turns selected facts into scoped, attributable memory records with retention rules.",
        },
        {
          id: "memory-retrieval",
          title: "Retrieval chooses which memories matter",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. Opening every old notebook before answering one question would bury the assistant in paper. A useful memory system searches for a few relevant pages, checks their dates, and ignores entries that no longer apply. Recent conversations may deserve more weight than old preferences, while a confirmed account constraint may outrank a casual remark. The retrieved set should be small enough to reason over and diverse enough to expose conflicts. If two memories disagree, the assistant should surface the conflict or ask for confirmation instead of silently choosing one.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Combine structured filters with semantic retrieval over approved memory records. Rank using relevance, recency, scope, confidence, and task type, then apply a strict token budget. Include memory provenance in the model context so the system can distinguish a user-confirmed fact from an inference. Version or supersede contradictory entries and invalidate dependent summaries when a source changes. Measure retrieval precision, stale-memory rate, and user correction rate. A failure mode is relevance-only ranking, which can resurrect an expired preference or mix memory from another project.",
          visualId: "attention-kv",
          visualCaption:
            "Scoped retrieval ranks current, relevant memories and exposes conflicts before they enter the prompt.",
        },
        {
          id: "memory-isolation",
          title: "Isolation and forgetting are architecture features",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. A shared apartment may have one kitchen, but each resident still needs a locked drawer. Multi-user memory should feel personal without becoming a shared suggestion box. Every read and write must carry tenant, user, and project scope, and background jobs must obey the same boundary as interactive requests. Forgetting is equally important: when a person asks to erase a memory, the system should remove the source record and every searchable derivative. A memory that cannot be located or deleted is a liability, not a convenience.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Include tenant and subject identifiers in every memory key, retrieval filter, cache entry, and asynchronous job. Deny by default when scope is missing, and test isolation with overlapping facts across users. Treat memory content as data, not trusted instructions, so a stored phrase cannot grant permissions or change policy. Implement deletion workflows that cover primary storage, vector indexes, summaries, backups under a defined retention schedule, and audit records with sensitive values removed. Verify deletion and access controls continuously rather than relying on application conventions.",
          visualId: "threat-defense",
          visualCaption:
            "Tenant-scoped storage, retrieval filters, and deletion workflows protect personal memory boundaries.",
        },
      ],
      security: [
        {
          id: "memory-instruction-boundary",
          title: "Keep memory below the trust boundary",
          threat:
            "A stored sentence may be interpreted as a standing instruction that changes future tool behavior or policy.",
          control:
            "Label memories as user data, retrieve only relevant records, and enforce permissions independently of their wording.",
          verify:
            "Store a benign instruction-like preference and confirm it cannot authorize tools or override application policy.",
        },
        {
          id: "memory-tenant-leak",
          title: "Partition every memory path",
          threat:
            "A missing tenant filter can expose one user's preferences, history, or project facts to another user.",
          control:
            "Use tenant-scoped keys and server-side filters on writes, reads, background jobs, caches, and exports.",
          verify:
            "Run cross-tenant tests across all memory APIs and confirm no record or derived summary crosses the boundary.",
        },
        {
          id: "memory-sensitive-retention",
          title: "Minimize and expire sensitive memories",
          threat:
            "Durable memory can retain personal data, credentials, or obsolete facts long after their purpose has ended.",
          control:
            "Block secret-like content, require provenance and retention rules, and provide tested correction and deletion workflows.",
          verify:
            "Check expired and user-deleted entries against primary storage, vector indexes, caches, and retrieval results.",
        },
      ],
      quiz: [
        {
          id: "memory-q1",
          topicId: "memory-architectures",
          prompt: "What belongs in working memory?",
          choices: [
            "Every fact learned since account creation",
            "The active goal, recent observations, and current constraints",
            "All memories belonging to every tenant",
            "Only generated answers",
          ],
          answerIndex: 1,
          explanation:
            "Working memory is bounded session state needed for the current task, not the entire durable history.",
          kind: "story-match",
        },
        {
          id: "memory-q2",
          topicId: "memory-architectures",
          prompt: "What should a durable memory record include?",
          choices: [
            "Provenance, scope, confidence, and retention information",
            "Only a model-generated sentence",
            "A shared global identifier",
            "No timestamp or source",
          ],
          answerIndex: 0,
          explanation:
            "Attribution and lifecycle metadata make memory inspectable, scoped, correctable, and safe to expire.",
          kind: "scenario",
        },
        {
          id: "memory-q3",
          topicId: "memory-architectures",
          prompt: "How should conflicting memories be handled?",
          choices: [
            "Always choose the longest entry",
            "Use the first entry forever",
            "Silently merge them into a new fact",
            "Surface the conflict, check provenance, and request confirmation when needed",
          ],
          answerIndex: 3,
          explanation:
            "Conflicts should remain visible and resolvable rather than being hidden by an arbitrary ranking rule.",
          kind: "tradeoff",
        },
        {
          id: "memory-q4",
          topicId: "memory-architectures",
          prompt: "Why must memory content never grant permissions?",
          choices: [
            "Because memory reduces token cost",
            "Because memory is untrusted data and authorization must come from identity and policy",
            "Because all memory is public",
            "Because models cannot retrieve memory",
          ],
          answerIndex: 1,
          explanation:
            "Stored text may be wrong or manipulated; permission decisions must remain in the trusted authorization layer.",
          kind: "security",
        },
      ],
    },
    {
      id: "evals-guardrails",
      slug: "evals-guardrails",
      trackId: "ai-engineering",
      title: "Evals and Guardrails",
      summary:
        "Measure task quality and safety with representative datasets, layered controls, calibrated judges, and production feedback.",
      minutes: 12,
      storyHook:
        "A release is a flight test: rehearsals reveal failure modes, instruments watch the real flight, and clear limits trigger a safe return.",
      prerequisites: ["agent-loop", "embeddings-rag"],
      steps: [
        {
          id: "evals-dataset",
          title: "An evaluation set is a rehearsal script",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. A theater troupe does not judge a play from one opening-night smile. They rehearse difficult scenes: a missing prop, an unexpected line, and a crowded exit. AI evaluation sets should be equally deliberate. Include ordinary tasks, ambiguous requests, missing evidence, multiple languages, long inputs, tool failures, and sensitive-data cases. Every example needs an expected behavior, not just an attractive sample answer. A rehearsal built only from happy-path demonstrations will applaud a system that has never practiced recovering from trouble.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Build versioned datasets from real task distributions and known failure modes, with clear expected outputs, acceptable alternatives, and rubric criteria. Separate development, validation, and held-out test sets to reduce overfitting, and assign owners for dataset quality. Include refusal and clarification behavior when the correct action is not to answer. Protect evaluation data with the same tenant and privacy rules as production data. A failure mode is a small handpicked set whose scores improve while real users experience more edge-case failures.",
          visualId: "threat-defense",
          visualCaption:
            "A versioned rehearsal suite covers normal, ambiguous, failure, and security-sensitive cases.",
        },
        {
          id: "evals-metrics",
          title: "Separate retrieval, generation, and task success",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. A meal can fail because the wrong ingredients arrived, because the recipe was misunderstood, or because the plate reached the wrong table. One overall score cannot explain which stage broke. Retrieval evaluation asks whether the right evidence was found. Generation evaluation asks whether the answer stayed faithful to that evidence. Task evaluation asks whether the user's actual goal was completed safely. Measuring each stage gives the team a repair path instead of a vague instruction to make the model better.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Track retrieval recall and ranking quality, answer faithfulness, citation correctness, tool-call validity, task completion, latency, and cost as separate dimensions. Use deterministic checks wherever possible, such as schema validation or exact structured fields, and reserve model-based judging for open-ended qualities. Segment results by language, tenant configuration, document type, and failure category so averages do not hide harm. A failure mode is optimizing a single composite score that allows a safety regression to hide behind better wording or lower cost.",
          visualId: "threat-defense",
          visualCaption:
            "A scorecard separates retrieval, grounded generation, tool execution, and user-task outcomes.",
        },
        {
          id: "evals-guardrails",
          title: "Guardrails are layers, not one magic filter",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. A building uses locks, a front desk, badges, and an alarm rather than trusting one very strict door. AI guardrails should work in layers too. Input controls validate size, schema, and obvious unsafe structure. Policy checks decide which tools and resources are allowed. Output checks catch disallowed formats, sensitive data, or unsupported claims. Human review handles consequential ambiguity. No single layer is perfect, so defense in depth reduces the chance that one model mistake becomes a real-world action.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Implement deterministic controls around the probabilistic model: schema validation, authorization, egress restrictions, output redaction, and approval gates. Keep failure behavior explicit, such as block, sanitize, ask for clarification, or route to review, and measure both false positives and false negatives. Avoid relying solely on a second model as a security boundary. Guardrail services need their own latency and availability budgets, with safe defaults if they fail. A failure mode is fail-open behavior that permits an action because a classifier timed out.",
          visualId: "threat-defense",
          visualCaption:
            "Input validation, policy enforcement, output checks, and human approval form layered defenses.",
        },
        {
          id: "evals-release",
          title: "Production feedback closes the loop",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. Even a thorough rehearsal cannot reproduce every live gust of wind. Production systems therefore need instruments and a return route. Sample requests with privacy-preserving methods, watch failure categories, compare canary results with the stable version, and feed confirmed issues back into the dataset. When a guardrail or quality threshold crosses its limit, the release pauses or rolls back. The team should learn from the event without exposing customer content or turning every user correction into an automatic policy change.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Define release gates using task-specific baselines for quality, security tests, p95 latency, error rate, tool failure, and cost per successful task. Use staged rollout and version every prompt, model, tool schema, retrieval index, and guardrail together. Calibrate model-based judges against human labels and monitor judge drift. Collect explicit user feedback and incident reviews, then add redacted regression cases. A failure mode is watching only averages; a severe regression affecting a small tenant or language can disappear inside a healthy global dashboard.",
          visualId: "deploy-strategies",
          visualCaption:
            "Canary measurements and privacy-safe feedback feed confirmed failures back into the next release gate.",
        },
      ],
      security: [
        {
          id: "evals-sensitive-data",
          title: "Protect evaluation data",
          threat:
            "Evaluation datasets may copy production prompts, credentials, or personal information into less controlled test environments.",
          control:
            "Use synthetic or approved redacted cases, apply tenant and retention rules, and restrict access to labeled evaluation stores.",
          verify:
            "Scan dataset samples and exports for seeded test secrets and personal fields before each release cycle.",
        },
        {
          id: "evals-adversarial-tests",
          title: "Test policy boundaries with approved scenarios",
          threat:
            "A release may handle ordinary examples yet fail when untrusted content conflicts with instructions or requests excessive tool access.",
          control:
            "Maintain approved adversarial scenarios that test instruction separation, allowlists, approval gates, redaction, and tenant isolation.",
          verify:
            "Require security suites to pass and inspect failures for policy bypass, secret leakage, and unauthorized side effects.",
        },
        {
          id: "evals-fail-closed",
          title: "Choose safe guardrail failure behavior",
          threat:
            "A timeout or outage in a safety check may allow sensitive output or consequential tool execution.",
          control:
            "Define fail-closed policies for high-risk actions, bounded fallbacks for low-risk tasks, and explicit health monitoring.",
          verify:
            "Inject guardrail timeouts in staging and confirm high-risk operations stop while safe degraded behavior is logged.",
        },
      ],
      quiz: [
        {
          id: "evals-q1",
          topicId: "evals-guardrails",
          prompt: "Why separate retrieval and generation metrics?",
          choices: [
            "To make dashboards harder to read",
            "To identify which stage failed and choose the right repair",
            "To eliminate held-out tests",
            "To avoid measuring task completion",
          ],
          answerIndex: 1,
          explanation:
            "Different stages have different failure modes and fixes, so separate metrics provide actionable diagnosis.",
          kind: "tradeoff",
        },
        {
          id: "evals-q2",
          topicId: "evals-guardrails",
          prompt: "What is the best use of a model-based judge?",
          choices: [
            "Replace every deterministic check",
            "Act as the only authorization boundary",
            "Evaluate open-ended qualities after calibration against human labels",
            "Hide segmented results",
          ],
          answerIndex: 2,
          explanation:
            "Judges can assess nuanced qualities, but they need calibration and should not replace deterministic security controls.",
          kind: "scenario",
        },
        {
          id: "evals-q3",
          topicId: "evals-guardrails",
          prompt: "What should happen when a high-risk guardrail times out?",
          choices: [
            "Always permit the action",
            "Always ignore the request silently",
            "Ask the model to approve itself",
            "Block the high-risk action and use a defined safe fallback or review path",
          ],
          answerIndex: 3,
          explanation:
            "High-risk workflows need fail-closed behavior so an unavailable safety control cannot authorize side effects.",
          kind: "security",
        },
        {
          id: "evals-q4",
          topicId: "evals-guardrails",
          prompt: "Why segment evaluation results?",
          choices: [
            "Because averages can hide severe failures in smaller groups",
            "Because only English users matter",
            "Because held-out data should be ignored",
            "Because every tenant needs identical behavior",
          ],
          answerIndex: 0,
          explanation:
            "Segmentation exposes regressions by language, tenant configuration, and task type that aggregate averages can conceal.",
          kind: "tradeoff",
        },
      ],
    },
    {
      id: "ai-security",
      slug: "ai-security",
      trackId: "ai-engineering",
      title: "AI Security: Prompt Injection, Exfiltration, Tool Sandboxing",
      summary:
        "Threat-model AI data boundaries, constrain tools, prevent secret leakage, and enforce per-tenant authorization outside the model.",
      minutes: 14,
      storyHook:
        "Treat model output as an untrusted proposal, and let trusted policy decide what may happen next.",
      prerequisites: ["agent-loop", "memory-architectures", "evals-guardrails"],
      steps: [
        {
          id: "ai-security-boundaries",
          title: "Instructions and data have different authority",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. A signed memo may ask an assistant to summarize a stack of letters, but the letters do not become new managers. Their wording cannot change the memo's purpose or grant access to a filing cabinet. AI systems face the same boundary problem when retrieved documents, web pages, emails, or tool outputs contain directions. The model processes all of it as text, so the application must preserve authority through structure and policy. Separating channels helps, but only independent checks can reliably stop untrusted content from becoming an instruction.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Define trust levels for system policy, user requests, retrieved evidence, and tool observations. Render each with explicit role and provenance, and never concatenate untrusted text into privileged instructions. More importantly, evaluate every proposed action against a deterministic policy using authenticated identity, tenant, resource, and operation. Do not assume a model can reliably distinguish all malicious wording. Test the boundary with approved adversarial scenarios and monitor attempted policy changes. The failure mode is treating instruction-data separation as sufficient while tool execution trusts the model's interpretation.",
          visualId: "threat-defense",
          visualCaption:
            "Trusted instructions, user requests, retrieved evidence, and tool observations remain separate authority levels.",
        },
        {
          id: "ai-security-tools",
          title: "Tool sandboxing contains overreach",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. A kitchen apprentice may be trusted with a knife but not the warehouse keys. AI tools need similarly concrete boundaries. A search tool should read approved sources, a drafting tool should not send, and a sandbox should have limited files, network access, time, and compute. Human confirmation belongs before consequential actions such as purchases, external messages, or permission changes. The model can propose an action, but the surrounding system decides whether the environment allows it and whether a person must approve it.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Use an allowlist of tools with narrow schemas, resource-scoped credentials, read-only defaults, and isolated execution environments. Restrict network egress, filesystem paths, environment variables, and runtime budgets. Require explicit approval for irreversible or high-impact operations, bind approvals to a specific action fingerprint, and expire them when inputs change. Make mutating calls idempotent and record an audit trail with safe metadata. A failure mode is a broad shell or database tool presented as a convenience; its reach can exceed the user's intent even without malicious prompting.",
          visualId: "agent-loop",
          visualCaption:
            "A policy gate checks allowlisted tools, scoped credentials, sandbox limits, and human approval.",
        },
        {
          id: "ai-security-exfiltration",
          title: "Prevent secrets from crossing boundaries",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. A careful office sends packages through one inspected loading bay, not through every open window. AI systems can expose data through answers, URLs, tool arguments, logs, embeddings, traces, and browser links. Preventing exfiltration therefore requires more than redacting the final sentence. Secrets should stay in a vault, model-visible output should be minimized, and external destinations should be checked against an allowlist. Sensitive-data detectors add another layer, but they cannot replace architectural separation and narrow permissions.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Keep credentials in a secret manager and inject short-lived, least-privilege tokens only into trusted tool execution. Redact sensitive fields from model context, observations, traces, analytics, and caches. Validate outbound destinations and block unapproved network egress, including indirect requests made by tools. Classify data and apply tenant-specific redaction or denial policies before storage and generation. A failure mode is scanning only the final response while a secret has already left through a tool argument, debug event, or retrieved document citation.",
          visualId: "threat-defense",
          visualCaption:
            "Vaulted secrets, redaction, egress allowlists, and data classification guard every output channel.",
        },
        {
          id: "ai-security-rbac",
          title: "Authorization is per request and per object",
          story:
            "The scene works because it exposes a boundary that engineers must turn into an explicit policy, a measurable invariant, and a tested recovery path. A building pass does not open every room, and knowing a door number does not grant entry. In a multi-tenant AI product, authentication proves who is calling, while authorization decides which tenant, object, action, and tool they may use. Those checks belong on every request, including background jobs and retrieval queries. A shared administrator token blurs accountability and can turn one tenant's mistake into a system-wide exposure. The safe design carries identity through the workflow and verifies it again at each sensitive boundary.",
          engineer:
            "Production implementation requires measurable invariants, bounded resource use, observable failure modes, and a recovery procedure that can be exercised safely. Use short-lived user or workload identity, deny requests without tenant scope, and enforce object-level authorization on retrieval, memory, tool execution, and exports. Avoid shared admin tokens for user-facing flows; separate privileged automation into audited service identities. Bind logs and traces to a correlation ID without copying sensitive content. Apply network policy and storage isolation as supporting layers, not substitutes for authorization. A failure mode is checking access only at the API edge while internal services accept an unchecked tenant ID supplied by the caller.",
          visualId: "threat-defense",
          visualCaption:
            "Identity and object-level authorization follow each request through retrieval, tools, storage, and export.",
        },
      ],
      security: [
        {
          id: "ai-security-practice-injection",
          title: "Contain untrusted instruction attempts",
          threat:
            "Untrusted text may be mistaken for instructions and redirect the model's goal or proposed actions.",
          control:
            "Use instruction-data separation, provenance labels, deterministic action policy, allowlisted tools, and human confirmation for sensitive writes.",
          verify:
            "Run approved adversarial tests and confirm retrieved content cannot alter permissions, tool scope, or policy decisions.",
        },
        {
          id: "ai-security-practice-exfiltration",
          title: "Close secret and data leakage paths",
          threat:
            "Sensitive information may leave through generated text, tool arguments, URLs, logs, embeddings, or traces.",
          control:
            "Keep secrets vaulted, redact model-visible data, restrict egress destinations, and minimize telemetry payloads.",
          verify:
            "Place seeded test secrets in controlled fixtures and scan every output channel for leakage during release tests.",
        },
        {
          id: "ai-security-practice-rbac",
          title: "Enforce tenant isolation end to end",
          threat:
            "Missing object-level authorization or shared credentials can expose one tenant's data and tools to another.",
          control:
            "Authenticate every request, carry tenant scope, authorize every object and action, and use separate audited service identities.",
          verify:
            "Test cross-tenant reads, memory retrieval, tool calls, exports, and asynchronous jobs with intentionally overlapping IDs.",
        },
      ],
      quiz: [
        {
          id: "ai-security-q1",
          topicId: "ai-security",
          prompt: "Why is instruction-data separation not a complete defense?",
          choices: [
            "Because models cannot read retrieved text",
            "Because a deterministic policy layer is still required for action authorization",
            "Because it increases context length",
            "Because all tool calls are harmless",
          ],
          answerIndex: 1,
          explanation:
            "Prompt structure reduces confusion, but trusted policy must independently authorize every consequential action.",
          kind: "security",
        },
        {
          id: "ai-security-q2",
          topicId: "ai-security",
          prompt: "Which control best limits tool overreach?",
          choices: [
            "Give the agent every available tool",
            "Let the model approve its own requests",
            "Use allowlisted tools, scoped credentials, sandbox limits, and human confirmation",
            "Return raw stack traces for transparency",
          ],
          answerIndex: 2,
          explanation:
            "Least-privilege tool access and execution boundaries contain mistakes even when the model proposes an unsafe action.",
          kind: "security",
        },
        {
          id: "ai-security-q3",
          topicId: "ai-security",
          prompt: "Where should secret leakage be checked?",
          choices: [
            "Only in the final visible answer",
            "Only in database records",
            "Only in user feedback",
            "Across model context, tool arguments, logs, traces, caches, and outbound destinations",
          ],
          answerIndex: 3,
          explanation:
            "Secrets can leave through many channels, so redaction and egress controls must cover the entire workflow.",
          kind: "scenario",
        },
        {
          id: "ai-security-q4",
          topicId: "ai-security",
          prompt: "What does authentication establish in a multi-tenant AI system?",
          choices: [
            "That every object is authorized",
            "That the caller has a verified identity, while object-level authorization is still required",
            "That prompts are safe",
            "That a shared admin token is acceptable",
          ],
          answerIndex: 1,
          explanation:
            "Authentication identifies the caller; authorization must still evaluate tenant, object, action, and resource scope.",
          kind: "tradeoff",
        },
      ],
    },
  ],
};

export const trackAi: Track = aiTrack;

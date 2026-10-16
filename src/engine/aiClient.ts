import type { InterviewLevel } from "@/types/workbench";
import type { AiTier } from "@/types/resource";

/**
 * Three-tier AI engine (Milestone 6). Never fails by construction:
 *
 * Tier 1 — Cloud BYOK: direct browser REST calls to Gemini / OpenAI /
 *   Anthropic with structured JSON enforcement. Keys live only in
 *   localStorage (`syscanvas.byok`) and are never logged or transmitted
 *   anywhere except the selected provider endpoint.
 * Tier 2 — Browser-local WebGPU via WebLLM (`@mlc-ai/web-llm`, dynamically
 *   imported only after an explicit user gesture + WebGPU capability check).
 * Tier 3 — Zero-dependency deterministic heuristic architect (default
 *   active): SPOF / cache / throttle / DLQ / single-AZ / cross-region
 *   analysis, Socratic question generation, and keyword-to-schema custom
 *   resource synthesis. Instant, offline, fully testable.
 *
 * No browser globals are touched at module scope; every capability check is
 * guarded so Vitest and SSR prerendering stay green.
 */

export type AiFindingSeverity = "info" | "warn" | "critical";

export interface AiFinding {
  id: string;
  severity: AiFindingSeverity;
  area: string;
  message: string;
  recommendation: string;
}

export interface TopologyBriefNode {
  id: string;
  resourceId: string;
  category: string;
  replicationFactor: number;
  region: string;
  multiAz: boolean;
  cacheHitRate: number;
  rateLimitRps: number;
  clientRps: number;
  writeRatio: number;
}

export interface TopologyBrief {
  nodes: TopologyBriefNode[];
  edgeCount: number;
  regions: string[];
}

export interface SocraticTurn {
  question: string;
  followUps: string[];
  level: InterviewLevel;
  focusArea: string;
}

export interface ByokConfig {
  provider: "gemini" | "openai" | "anthropic";
  apiKey: string;
  model?: string;
}

export interface ReviewResult {
  tier: AiTier;
  findings: AiFinding[];
  summary: string;
}

const BYOK_STORAGE_KEY = "syscanvas.byok";

function findingId(area: string, index: number): string {
  return `f_${area}_${index}`;
}

/* ---------------- Tier 3: deterministic offline architect ---------------- */

const CACHEABLE_DB = ["postgres", "cockroach", "cassandra", "document", "mongo", "dynamo", "search", "blob", "cdn", "rest_service", "rest"];

function isCacheableReadPath(resourceId: string, category: string): boolean {
  const id = resourceId.toLowerCase();
  if (category === "database" || category === "search" || category === "storage") return true;
  return CACHEABLE_DB.some((token) => id.includes(token));
}

function isPublicIngress(resourceId: string, category: string): boolean {
  const id = resourceId.toLowerCase();
  return (
    category === "api" ||
    category === "edge" ||
    id.includes("gateway") ||
    id.includes("waf") ||
    id.includes("load_balancer") ||
    id.includes("cdn")
  );
}

/** Pure heuristic topology review — the always-on default tier. */
export function analyzeTopologyOffline(brief: TopologyBrief): AiFinding[] {
  const findings: AiFinding[] = [];
  let idx = 0;

  if (brief.nodes.length === 0) {
    return [
      {
        id: findingId("empty", idx++),
        severity: "info",
        area: "Getting started",
        message: "The canvas is empty — nothing to review yet.",
        recommendation: "Load the checkout starter template, then re-run the review for SPOF, cache, and cost analysis.",
      },
    ];
  }

  for (const node of brief.nodes) {
    const label = node.resourceId;
    if (node.replicationFactor <= 1 && (node.category === "compute" || node.category === "database" || node.category === "api")) {
      findings.push({
        id: findingId("spof", idx++),
        severity: "critical",
        area: "Single point of failure",
        message: `${label} runs a single replica (c=1). One host failure or deploy takes the whole path down.`,
        recommendation: `Raise ${label} to 3 replicas across AZs and prove failover with a zone_outage chaos drill.`,
      });
    }
    if (!node.multiAz && (node.category === "database" || node.category === "cache")) {
      findings.push({
        id: findingId("az", idx++),
        severity: "warn",
        area: "Single-AZ deployment",
        message: `${label} is pinned to one availability zone. A zone event removes ${node.replicationFactor} replica(s) at once.`,
        recommendation: `Enable multi-AZ on ${label} and re-run the simulation with 34% capacity penalty to validate headroom.`,
      });
    }
    if (isPublicIngress(node.resourceId, node.category) && node.rateLimitRps > 20000) {
      findings.push({
        id: findingId("throttle", idx++),
        severity: "warn",
        area: "Unthrottled ingress",
        message: `${label} allows ${node.rateLimitRps.toLocaleString()} RPS with no per-client budget — a retry storm multiplies ingress 3× in seconds.`,
        recommendation: `Cap ${label} with per-client token buckets (see the token-bucket simulator), return 429 + Retry-After, and add a gateway retry budget.`,
      });
    }
  }

  const hasCache = brief.nodes.some((n) => n.category === "cache" || n.category === "edge");
  const readHeavyDb = brief.nodes.filter(
    (n) => isCacheableReadPath(n.resourceId, n.category) && n.writeRatio < 0.5,
  );
  if (!hasCache && readHeavyDb.length > 0) {
    findings.push({
      id: findingId("cache", idx++),
      severity: "warn",
      area: "Missing cache tier",
      message: `${readHeavyDb.map((n) => n.resourceId).join(", ")} serve(s) reads directly with no cache in front — every spike hits disk.`,
      recommendation: "Insert Redis/CDN with 80%+ hit ratio and stale-while-revalidate; watch DB p99 collapse in the telemetry drawer.",
    });
  }

  const hasQueue = brief.nodes.some((n) => n.category === "messaging" || n.category === "streaming");
  const hasWorker = brief.nodes.some(
    (n) => n.resourceId.toLowerCase().includes("worker") || n.resourceId.toLowerCase().includes("processor") || n.category === "serverless",
  );
  if (hasQueue && !hasWorker) {
    findings.push({
      id: findingId("dlq", idx++),
      severity: "warn",
      area: "Queue without consumer / DLQ",
      message: "A queue/stream has no visible consumer group or dead-letter queue — poison pills will redeliver forever.",
      recommendation: "Attach a worker pool with idempotent handlers plus a DLQ, and alert on oldest-message age.",
    });
  }

  if (brief.regions.length > 1) {
    findings.push({
      id: findingId("xregion", idx++),
      severity: "info",
      area: "Cross-region chatter",
      message: `Topology spans ${brief.regions.join(", ")} — every cross-region hop adds 60–300ms RTT on the critical path.`,
      recommendation: "Keep writes in one region with async replicas; serve reads from the nearest region and pin session state to the edge.",
    });
  }

  const llmNodes = brief.nodes.filter((n) => n.category === "ai_llm" || n.category === "vector_db");
  for (const node of llmNodes) {
    findings.push({
      id: findingId("llm", idx++),
      severity: "info",
      area: "Inference capacity",
      message: `${node.resourceId} prompt-heavy traffic saturates KV-cache VRAM fast — past 95% the engine preempts and TTFT triples.`,
      recommendation: "Split short/long prompts into separate pools, cap context length, and autoscale on kvCachePct rather than RPS.",
    });
  }

  if (findings.length === 0) {
    findings.push({
      id: findingId("healthy", idx++),
      severity: "info",
      area: "Baseline healthy",
      message: "No SPOFs, open ingress, or missing-cache smells detected in this topology.",
      recommendation: "Stress it: inject traffic_surge + zone_outage together and confirm p99 stays inside SLO in the telemetry drawer.",
    });
  }
  return findings;
}

const SOCRATIC_BANK: Array<{ match: RegExp; questions: string[]; area: string }> = [
  {
    match: /cache|hit ratio|redis|cdn/i,
    area: "Caching",
    questions: [
      "What is your cache invalidation strategy when the underlying row changes — TTL expiry, write-through, or explicit purge?",
      "A viral key hammers one shard at 10× the average. How does your design avoid a hot-key meltdown?",
      "Walk me through a thundering-herd scenario after a full purge. What absorbs it — single-flight, SWR, or origin autoscale?",
    ],
  },
  {
    match: /single point|spof|replica|failover|leader/i,
    area: "Fault tolerance",
    questions: [
      "Your primary dies mid-write. Exactly which writes can you lose, and how does the client observe the cutover?",
      "How do you fence the old primary so a zombie cannot accept writes after promotion?",
      "What is your measured RTO/RPO, and which chaos drill proves it quarterly?",
    ],
  },
  {
    match: /queue|stream|kafka|consumer|dlq/i,
    area: "Async processing",
    questions: [
      "How do you guarantee at-least-once delivery without double-charging the customer?",
      "A poison message crashes every consumer on deserialize. What quarantines it, and what pages you first?",
      "Consumer lag grows 50k messages/min. Do you shed load, scale out, or degrade — and what breaks first?",
    ],
  },
  {
    match: /partition|shard|consistent hash|hot/i,
    area: "Partitioning",
    questions: [
      "How did you choose the partition key, and what query pattern becomes a scatter-gather because of it?",
      "One tenant outgrows its shard 100×. Do you split, re-hash, or isolate — and how much data moves?",
      "Compare range vs hash partitioning for your two hottest access patterns.",
    ],
  },
  {
    match: /consisten|quorum|raft|cap/i,
    area: "Consistency",
    questions: [
      "Under a network partition, do you stay available or stay consistent — and which user-visible behavior changes?",
      "What consistency level do your reads actually need, and what did you sacrifice to get the p99 you promised?",
      "Show me the write path quorum math: W + R vs N for your replication factor.",
    ],
  },
  {
    match: /rate|throttle|429|gateway/i,
    area: "Traffic control",
    questions: [
      "Where do you enforce backpressure — client, edge, or deep inside — and what signal propagates upstream?",
      "A buggy SDK retries with no backoff. Which budget breaks the retry storm before it triples your RPS?",
      "How do you distinguish abusive traffic from a legitimate flash crowd at the edge?",
    ],
  },
  {
    match: /llm|rag|token|embedding|vector/i,
    area: "AI systems",
    questions: [
      "How do you keep retrieval recall above 88% when the embedding model changes under you?",
      "Prompt length doubles overnight. What saturates first — KV-cache, TTFT SLO, or cost budget?",
      "How do you evaluate hallucination rate before a prompt change reaches production?",
    ],
  },
];

const GENERIC_DEEP_DIVES = [
  "What is the single bottleneck at 10× this load, and what metric tells you first?",
  "Draw the failure domain map: which single event takes down the most capacity?",
  "Where does backpressure live in this design, and what happens when every buffer is full?",
];

/** Next adversarial interview question from answer keywords + open findings. */
export function socraticNextQuestionOffline(
  history: Array<{ question: string; answer: string }>,
  findings: AiFinding[],
  level: InterviewLevel = "L5",
): SocraticTurn {
  const lastAnswer = history.length > 0 ? (history[history.length - 1]?.answer ?? "") : "";
  for (const bank of SOCRATIC_BANK) {
    if (bank.match.test(lastAnswer)) {
      const asked = new Set(history.map((h) => h.question));
      const fresh = bank.questions.find((q) => !asked.has(q)) ?? bank.questions[0] ?? GENERIC_DEEP_DIVES[0] ?? "";
      return {
        question: fresh,
        followUps: (bank.questions.filter((q) => q !== fresh) ?? []).slice(0, 2),
        level,
        focusArea: bank.area,
      };
    }
  }
  const openFinding = findings.find((f) => f.severity !== "info");
  if (openFinding) {
    return {
      question: `You flagged ${openFinding.area.toLowerCase()}: “${openFinding.message}” How would you defend this choice to a staff reviewer who wants it fixed before launch?`,
      followUps: [
        "What data would change your mind?",
        "What is the cheapest experiment that validates your position?",
      ],
      level,
      focusArea: openFinding.area,
    };
  }
  const asked = new Set(history.map((h) => h.question));
  const fresh = GENERIC_DEEP_DIVES.find((q) => !asked.has(q)) ?? GENERIC_DEEP_DIVES[0] ?? "Defend your bottleneck analysis at 10× load.";
  return { question: fresh, followUps: [], level, focusArea: "Architecture" };
}

/** Keyword-to-schema custom resource synthesizer (offline tier). */
export function synthesizeResourceOffline(description: string): {
  id: string;
  name: string;
  category: string;
  baseThroughputRps: number;
  baseP50Ms: number;
  writeRatio: number;
  cacheHitRate: number;
} {
  const text = description.toLowerCase();
  const pick = (tokens: string[], value: string, fallback: string): string =>
    tokens.some((t) => text.includes(t)) ? value : fallback;
  const category = pick(["cache", "redis", "cdn", "memcached"], "cache",
    pick(["queue", "kafka", "stream", "pubsub", "topic"], "messaging",
    pick(["llm", "gpt", "embedding", "rag", "agent", "vector"], "ai_llm",
    pick(["waf", "firewall", "auth", "ratelimit", "gateway"], "security",
    pick(["postgres", "sql", "cassandra", "mongo", "dynamo", "store", "db"], "database", "compute")))));
  const hot = /hot|viral|flash|spike|burst/.test(text);
  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || "custom_resource";
  return {
    id: `custom_${slug}`,
    name: description.trim().slice(0, 48) || "Custom resource",
    category,
    baseThroughputRps: hot ? 20000 : 5000,
    baseP50Ms: category === "cache" ? 2 : 8,
    writeRatio: /read|cache|cdn|search/.test(text) ? 0.05 : 0.3,
    cacheHitRate: category === "cache" ? 0.9 : 0,
  };
}

/* ---------------- Tier 1: BYOK cloud ---------------- */

export function getByokConfig(): ByokConfig | null {
  try {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") return null;
    const raw = window.localStorage.getItem(BYOK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ByokConfig>;
    if (!parsed.provider || !parsed.apiKey) return null;
    if (parsed.provider !== "gemini" && parsed.provider !== "openai" && parsed.provider !== "anthropic") return null;
    return { provider: parsed.provider, apiKey: parsed.apiKey, model: parsed.model };
  } catch {
    return null;
  }
}

export function saveByokConfig(config: ByokConfig | null): void {
  try {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") return;
    if (!config) {
      window.localStorage.removeItem(BYOK_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(BYOK_STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* storage unavailable (private mode) — session continues on Tier 3 */
  }
}

function briefToPrompt(brief: TopologyBrief): string {
  const lines = brief.nodes.map(
    (n) => `- ${n.resourceId} [${n.category}] c=${n.replicationFactor} region=${n.region} multiAz=${n.multiAz} clientRps=${n.clientRps}`,
  );
  return [
    "You are a staff systems reviewer. Respond with a JSON array of findings.",
    "Each finding: {severity: 'info'|'warn'|'critical', area: string, message: string, recommendation: string}.",
    `Topology (${brief.nodes.length} nodes, ${brief.edgeCount} edges, regions: ${brief.regions.join(", ") || "none"}):`,
    ...lines,
  ].join("\n");
}

function coerceFindings(input: unknown): AiFinding[] | null {
  if (!Array.isArray(input)) return null;
  const findings: AiFinding[] = [];
  input.forEach((entry, i) => {
    if (typeof entry !== "object" || entry === null) return;
    const row = entry as Record<string, unknown>;
    const severity = row["severity"];
    if (severity !== "info" && severity !== "warn" && severity !== "critical") return;
    findings.push({
      id: `byok_${i}`,
      severity,
      area: typeof row["area"] === "string" ? (row["area"] as string).slice(0, 80) : "Review",
      message: typeof row["message"] === "string" ? (row["message"] as string).slice(0, 500) : "",
      recommendation: typeof row["recommendation"] === "string" ? (row["recommendation"] as string).slice(0, 500) : "",
    });
  });
  return findings.length > 0 ? findings : null;
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 20000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function reviewWithGemini(brief: TopologyBrief, config: ByokConfig): Promise<AiFinding[] | null> {
  const model = config.model ?? "gemini-2.0-flash";
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: briefToPrompt(brief) }] }],
        generationConfig: { response_mime_type: "application/json", maxOutputTokens: 2048 },
      }),
    },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  try {
    return coerceFindings(JSON.parse(text));
  } catch {
    return null;
  }
}

async function reviewWithOpenAI(brief: TopologyBrief, config: ByokConfig): Promise<AiFinding[] | null> {
  const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_tokens: 2048,
      messages: [
        { role: "system", content: "You are a staff systems reviewer. Always respond with a JSON array of findings." },
        { role: "user", content: briefToPrompt(brief) },
      ],
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content ?? "";
  try {
    const parsed: unknown = JSON.parse(text);
    if (Array.isArray(parsed)) return coerceFindings(parsed);
    if (typeof parsed === "object" && parsed !== null && Array.isArray((parsed as Record<string, unknown>)["findings"])) {
      return coerceFindings((parsed as Record<string, unknown>)["findings"]);
    }
    return null;
  } catch {
    return null;
  }
}

async function reviewWithAnthropic(brief: TopologyBrief, config: ByokConfig): Promise<AiFinding[] | null> {
  const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: config.model ?? "claude-3-5-haiku-latest",
      max_tokens: 2048,
      messages: [{ role: "user", content: `${briefToPrompt(brief)}\nRespond with ONLY the JSON array.` }],
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { content?: Array<{ text?: string }> };
  const text = json.content?.map((b) => b.text ?? "").join("") ?? "";
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try {
    return coerceFindings(JSON.parse(text.slice(start, end + 1)));
  } catch {
    return null;
  }
}

/* ---------------- Tier 2: WebGPU local ---------------- */

export const WEBLLM_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

export function isWebGpuAvailable(): boolean {
  try {
    if (typeof navigator === "undefined") return false;
    return "gpu" in navigator;
  } catch {
    return false;
  }
}

let webllmEngine: { chat: { completions: { create(r: { messages: Array<{ role: "system" | "user" | "assistant"; content: string }>; temperature?: number; max_tokens?: number }): Promise<{ choices: Array<{ message?: { content?: string } }> }> } } } | null = null;

export async function loadWebLlmEngine(onProgress?: (text: string) => void): Promise<boolean> {
  if (!isWebGpuAvailable()) return false;
  try {
    const { MLCEngine } = await import("@mlc-ai/web-llm");
    onProgress?.("Loading local model…");
    const engine = new MLCEngine({});
    await engine.reload(WEBLLM_MODEL);
    webllmEngine = engine;
    onProgress?.("Local model ready.");
    return true;
  } catch {
    webllmEngine = null;
    return false;
  }
}

async function reviewWithWebLlm(brief: TopologyBrief): Promise<AiFinding[] | null> {
  if (!webllmEngine) return null;
  try {
    const completion = await webllmEngine.chat.completions.create({
      messages: [
        { role: "system", content: "You are a staff systems reviewer. Respond with ONLY a JSON array of {severity, area, message, recommendation}." },
        { role: "user", content: briefToPrompt(brief) },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    });
    const text = completion.choices[0]?.message?.content ?? "";
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start < 0 || end <= start) return null;
    return coerceFindings(JSON.parse(text.slice(start, end + 1)));
  } catch {
    return null;
  }
}

/* ---------------- Tier router ---------------- */

export interface ReviewOptions {
  byok?: ByokConfig | null;
  preferLocal?: boolean;
}

/** Review a topology, degrading BYOK → WebLLM → offline heuristic. Never throws. */
export async function reviewTopology(brief: TopologyBrief, options: ReviewOptions = {}): Promise<ReviewResult> {
  const offline = () => ({
    tier: "offline_heuristic" as AiTier,
    findings: analyzeTopologyOffline(brief),
    summary: `Heuristic pass over ${brief.nodes.length} nodes found structural risks with zero network dependency.`,
  });
  try {
    if (options.byok?.apiKey) {
      let findings: AiFinding[] | null = null;
      if (options.byok.provider === "gemini") findings = await reviewWithGemini(brief, options.byok);
      else if (options.byok.provider === "openai") findings = await reviewWithOpenAI(brief, options.byok);
      else findings = await reviewWithAnthropic(brief, options.byok);
      if (findings) {
        const tier: AiTier = "byok_cloud";
        return { tier, findings, summary: `Cloud review via ${options.byok.provider} returned ${findings.length} findings.` };
      }
    }
    if (options.preferLocal && webllmEngine) {
      const local = await reviewWithWebLlm(brief);
      if (local) {
        const tier: AiTier = "webgpu_local";
        return { tier, findings: local, summary: `Local WebGPU review (${WEBLLM_MODEL}) returned ${local.length} findings.` };
      }
    }
  } catch {
    /* fall through to the deterministic tier */
  }
  return offline();
}

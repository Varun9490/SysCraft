import { z } from "zod";

/**
 * Universal Resource Definition Schema (URDS).
 * Every canvas primitive (all 28 in seedResources.ts) conforms to this shape.
 * All numeric fields use realistic production defaults so the 20Hz simulation
 * worker can run queuing physics without NaN / Infinity guards at call sites.
 */

export const ResourceCategorySchema = z.enum([
  "edge",
  "compute",
  "api",
  "storage",
  "cache",
  "messaging",
  "streaming",
  "database",
  "search",
  "security",
  "observability",
  "network",
  "ai_llm",
  "vector_db",
  "serverless",
]);

export type ResourceCategory = z.infer<typeof ResourceCategorySchema>;

export const StorageEngineSchema = z.enum([
  "none",
  "b_tree",
  "lsm_tree",
  "in_memory",
  "append_log",
  "columnar",
]);

export type StorageEngine = z.infer<typeof StorageEngineSchema>;

export const ConsistencyModelSchema = z.enum([
  "strong",
  "eventual",
  "causal",
  "read_your_writes",
  "bounded_staleness",
  "single_leader",
]);

export type ConsistencyModel = z.infer<typeof ConsistencyModelSchema>;

export const FillStyleSchema = z.enum(["solid", "hachure", "cross_hatch", "dots"]);

export type FillStyle = z.infer<typeof FillStyleSchema>;

export const ResourceDefaultsSchema = z.object({
  /** Per-replica sustainable throughput in requests/sec (mu). */
  baseThroughputRps: z.number().min(1),
  /** Active replica count (c). */
  replicationFactor: z.number().int().min(1),
  /** Max concurrent in-flight requests per replica (K = maxConcurrency * c). */
  maxConcurrency: z.number().int().min(1),
  /** vCPUs per replica — the instance shape the throughput profile assumes. */
  vcpu: z.number().min(0.25).default(2),
  /** Memory GiB per replica — the instance shape the buffering profile assumes. */
  memoryGb: z.number().min(0.25).default(4),
  /** Baseline service latencies in ms at zero load. */
  baseP50Ms: z.number().min(0),
  baseP95Ms: z.number().min(0),
  baseP99Ms: z.number().min(0),
  /** Sustained cost in USD per replica-hour. */
  costPerHourUsd: z.number().min(0),
  /** 0-100 hardened-security score shown in the inspector. */
  securityScore: z.number().min(0).max(100),
  /** Steady-state availability, e.g. 0.999. */
  availability: z.number().min(0).max(1),
  /** Fraction of requests that are writes (0-1). Drives write amplification. */
  writeRatio: z.number().min(0).max(1).default(0.2),
  storageEngine: StorageEngineSchema.default("none"),
  consistency: ConsistencyModelSchema.default("eventual"),
  /** Cache hit ratio 0-1 (cache nodes only). */
  cacheHitRate: z.number().min(0).max(1).default(0),
  /** Ingress throttle in RPS (rate limiter / WAF / API gateway). */
  rateLimitRps: z.number().min(1).default(10000),
  /** VRAM GiB per replica for LLM nodes (KV-cache math). */
  vramGbPerReplica: z.number().min(0).default(0),
  avgPromptTokens: z.number().int().min(1).default(1024),
  avgOutputTokens: z.number().int().min(1).default(256),
  /** Cross-AZ / cross-region deployment flag for SPOF analysis. */
  multiAz: z.boolean().default(false),
  region: z.string().default("us-east-1"),
});

export type ResourceDefaults = z.infer<typeof ResourceDefaultsSchema>;

export const TradeOffRowSchema = z.object({
  dimension: z.string(),
  optionA: z.string(),
  optionB: z.string(),
  recommendation: z.string(),
});

export type TradeOffRow = z.infer<typeof TradeOffRowSchema>;

/**
 * One network surface of a primitive: the port it listens on, what protocol
 * speaks there, the in-container port mapping, and how it is exposed.
 * Rendered by the node inspector ("Service ports & mapping"), node chrome,
 * and the K8s/Docker IaC compilers.
 */
export const ServicePortSchema = z.object({
  /** Human label, e.g. "Client HTTPS", "gRPC API", "etcd peer traffic". */
  label: z.string().min(1),
  /** The port other services dial into. */
  port: z.number().int().min(1).max(65535),
  protocol: z.enum(["tcp", "udp", "http", "https", "grpc", "kafka", "quic"]),
  /** The port the container/pod actually listens on (defaults to `port`). */
  containerPort: z.number().int().min(1).max(65535).optional(),
  /** How the port is exposed to callers. */
  expose: z
    .enum(["cluster", "node", "loadbalancer", "internet"])
    .default("cluster"),
});

export type ServicePort = z.infer<typeof ServicePortSchema>;

export const ResourceDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: ResourceCategorySchema,
  description: z.string().min(1),
  /** Lucide icon name rendered by ResourceNode. */
  icon: z.string().min(1),
  defaults: ResourceDefaultsSchema,
  /** Excalidraw-mode stroke/fill used by the memoized Rough.js renderer. */
  strokeColor: z.string().default("#CDA86A"),
  fillStyle: FillStyleSchema.default("hachure"),
  encyclopediaMarkdown: z.string().min(1),
  tradeOffs: z.array(TradeOffRowSchema).default([]),
  whenToUse: z.array(z.string()).default([]),
  whenNotToUse: z.array(z.string()).default([]),
  scalingNotes: z.string().default(""),
  /** Network surfaces: which port each service exposes and how it maps. */
  servicePorts: z.array(ServicePortSchema).optional(),
});

export type ResourceDefinition = z.infer<typeof ResourceDefinitionSchema>;

/** Per-node configuration overrides stored on the canvas node data. */
export const ResourceOverridesSchema = z.object({
  replicationFactor: z.number().int().min(1).optional(),
  baseThroughputRps: z.number().min(1).optional(),
  maxConcurrency: z.number().int().min(1).optional(),
  /** Per-replica vCPUs; scales sustainable throughput vs. the primitive's baseline. */
  vcpu: z.number().min(0.25).optional(),
  /** Per-replica memory GiB; scales the queue buffering profile. */
  memoryGb: z.number().min(0.25).optional(),
  cacheHitRate: z.number().min(0).max(1).optional(),
  rateLimitRps: z.number().min(1).optional(),
  writeRatio: z.number().min(0).max(1).optional(),
  vramGbPerReplica: z.number().min(0).optional(),
  avgPromptTokens: z.number().int().min(1).optional(),
  avgOutputTokens: z.number().int().min(1).optional(),
  region: z.string().optional(),
  multiAz: z.boolean().optional(),
  clientRps: z.number().min(0).optional(),
  /** User-decided per-replica hourly cost (USD); overrides the primitive default. */
  costPerHourUsd: z.number().min(0).optional(),
});

export type ResourceOverrides = z.infer<typeof ResourceOverridesSchema>;

/** Canvas block metrics shared by the store (defaults, tiers) and the node renderer. */
export const NODE_DEFAULT_WIDTH = 216;
export const NODE_TIER_HEIGHTS: Record<1 | 2 | 3, number> = { 1: 76, 2: 104, 3: 140 };
export const NODE_MIN_WIDTH = 140;
export const NODE_MAX_WIDTH = 520;
export const NODE_MIN_HEIGHT = 56;
export const NODE_MAX_HEIGHT = 320;

/** Data payload carried by every @xyflow/react custom node. */
export interface ResourceNodeData extends Record<string, unknown> {
  resourceId: string;
  label: string;
  overrides: ResourceOverrides;
  semanticZoomLevel: 1 | 2 | 3;
  /** User-resized node width in px (drag handle / inspector presets). */
  width?: number;
  /** User-resized node height in px (drag handle / inspector presets). */
  height?: number;
  /** True once the learner manually resized — disables auto tier heights. */
  manualSize?: boolean;
  /** Optional accent override that recolours the block chrome. */
  accentColor?: string;
  /** Pinned creator comment shown as a chip on the block. */
  comment?: string;
}

export const ResourceNodeDataSchema = z.object({
  resourceId: z.string().min(1),
  label: z.string().min(1),
  overrides: ResourceOverridesSchema.default({}),
  semanticZoomLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  width: z.number().min(140).max(520).optional(),
  height: z.number().min(56).max(320).optional(),
  manualSize: z.boolean().optional(),
  accentColor: z.string().optional(),
  comment: z.string().max(2000).optional(),
});

/** AI / LLM provider + local model types used by aiClient.ts (Milestone 6). */
export const AiProviderSchema = z.enum([
  "offline_heuristic",
  "gemini",
  "openai",
  "anthropic",
  "webllm_local",
]);

export type AiProvider = z.infer<typeof AiProviderSchema>;

export const AiTierSchema = z.enum(["byok_cloud", "webgpu_local", "offline_heuristic"]);

export type AiTier = z.infer<typeof AiTierSchema>;

export interface LlmNodePhysics {
  avgPromptTokens: number;
  avgOutputTokens: number;
  vramGbPerReplica: number;
  ttftMs: number;
  kvCacheSaturationPct: number;
  preempted: boolean;
}

export function validateResourceDefinition(
  input: unknown,
): ResourceDefinition {
  return ResourceDefinitionSchema.parse(input);
}

export function validateResourceOverrides(
  input: unknown,
): ResourceOverrides {
  return ResourceOverridesSchema.parse(input ?? {});
}

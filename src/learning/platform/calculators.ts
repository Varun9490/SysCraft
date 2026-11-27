export interface CapacityInput {
  dau: number;
  requestsPerUserPerDay: number;
  readWriteRatio: number;
  peakFactor: number;
  payloadKb: number;
  retentionDays: number;
}

export interface CapacityEstimate {
  avgQps: number;
  peakQps: number;
  storageGb: number;
  bandwidthMbps: number;
  notes: string[];
}

export interface KvCacheInput {
  paramsBillion: number;
  precisionBits: number;
  layers: number;
  kvHeads: number;
  headDim: number;
  contextTokens: number;
  batch: number;
}

export interface KvCacheEstimate {
  weightGb: number;
  kvCacheGb: number;
  activationGb: number;
  totalVramGb: number;
  notes: string[];
}

export interface ErrorBudgetEstimate {
  allowedDowntimeMinutes: number;
  monthlyMinutes: number;
  burnPerHourAt1x: number;
  burnPerHourAt2x: number;
  burnPerHourAt10x: number;
  hoursToExhaustAt2x: number;
  hoursToExhaustAt10x: number;
  ninesLabel: string;
}

export type NotationCategory =
  | "queueing"
  | "performance"
  | "distributed"
  | "reliability"
  | "security"
  | "machine-learning";

export interface NotationEntry {
  symbol: string;
  plain: string;
  category: NotationCategory;
}

const GIB = 1024 ** 3;
const GB = 1_000_000_000;

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/**
 * Back-of-envelope sizing using decimal KB/GB/Mbps. readWriteRatio is the
 * fraction of requests that read, so 0.9 means 90% reads and 10% writes.
 */
export function estimateCapacity(input: CapacityInput): CapacityEstimate {
  const dau = clampNumber(input.dau, 0, 1e12, 0);
  const requestsPerUserPerDay = clampNumber(input.requestsPerUserPerDay, 0, 1e7, 0);
  const readWriteRatio = clampNumber(input.readWriteRatio, 0, 1, 0.8);
  const peakFactor = clampNumber(input.peakFactor, 1, 100, 1);
  const payloadKb = clampNumber(input.payloadKb, 0, 1e7, 0);
  const retentionDays = clampNumber(input.retentionDays, 0, 36_500, 0);

  const requestsPerDay = dau * requestsPerUserPerDay;
  const avgQps = requestsPerDay / 86_400;
  const peakQps = avgQps * peakFactor;
  const writesPerDay = requestsPerDay * (1 - readWriteRatio);
  const storageGb = (writesPerDay * retentionDays * payloadKb * 1_000 * 3) / GB;
  const bandwidthMbps = (avgQps * payloadKb * 1_000 * 8) / 1_000_000;

  return {
    avgQps,
    peakQps,
    storageGb,
    bandwidthMbps,
    notes: [
      "Average QPS is daily active users × requests per user per day ÷ 86,400; peak QPS multiplies that average by the peak factor.",
      "Storage includes 3× replication of retained write payload in decimal GB; indexes, logs, backups, and object-store overhead are excluded.",
      `Bandwidth is average response egress at average QPS; multiply it by ${peakFactor.toFixed(2)} for a peak-payload estimate.`,
      `readWriteRatio is the read fraction (${(readWriteRatio * 100).toFixed(1)}% reads); storage counts only the write share.`,
    ],
  };
}

/**
 * Inference memory heuristic. GB-named fields are GiB, matching the explicit
 * 1024³ conversion. Activations use 5% of weights plus KV as a planning proxy.
 */
export function estimateKvCache(input: KvCacheInput): KvCacheEstimate {
  const paramsBillion = clampNumber(input.paramsBillion, 0, 1e6, 0);
  const precisionBits = clampNumber(input.precisionBits, 1, 64, 16);
  const layers = clampNumber(input.layers, 1, 1_000, 1);
  const kvHeads = clampNumber(input.kvHeads, 1, 1_024, 1);
  const headDim = clampNumber(input.headDim, 1, 1_024, 1);
  const contextTokens = clampNumber(input.contextTokens, 0, 10_000_000, 0);
  const batch = clampNumber(input.batch, 0, 100_000, 0);
  const bytesPerValue = precisionBits / 8;

  const weightGb = (paramsBillion * 1e9 * bytesPerValue) / GIB;
  const kvCacheGb = (2 * layers * kvHeads * headDim * contextTokens * batch * bytesPerValue) / GIB;
  const activationGb = (weightGb + kvCacheGb) * 0.05;
  const totalVramGb = weightGb + kvCacheGb + activationGb;

  return {
    weightGb,
    kvCacheGb,
    activationGb,
    totalVramGb,
    notes: [
      "All memory fields are GiB (bytes ÷ 1024³), even where the field name ends in Gb.",
      "KV cache includes both keys and values: 2 × layers × KV heads × head dimension × context tokens × batch × bytes per value.",
      "Activation memory is a documented planning heuristic of 5% of weight memory plus KV cache memory.",
      "The total excludes CUDA context, framework workspaces, allocator fragmentation, kernels, and runtime headroom; profile the real serving stack before sizing GPUs.",
    ],
  };
}

export function estimateErrorBudget(input: {
  slaPercent: number;
  windowDays: number;
}): ErrorBudgetEstimate {
  const slaPercent = clampNumber(input.slaPercent, 99, 99.999, 99.9);
  const windowDays = clampNumber(input.windowDays, 1, 3_650, 30);
  const errorFraction = 1 - slaPercent / 100;
  const allowedDowntimeMinutes = windowDays * 24 * 60 * errorFraction;
  const monthlyMinutes = 30 * 24 * 60 * errorFraction;
  // Multiples of the 30-day budget consumed by one hour of complete outage.
  const burnPerHourAt1x = 60 / monthlyMinutes;
  const burnPerHourAt2x = burnPerHourAt1x * 2;
  const burnPerHourAt10x = burnPerHourAt1x * 10;
  const hoursToExhaustAt2x = monthlyMinutes / 60 / 2;
  const hoursToExhaustAt10x = monthlyMinutes / 60 / 10;
  const nines = Math.min(5, Math.max(2, Math.round(-Math.log10(errorFraction))));
  const decimalPlaces = slaPercent >= 99.999 ? 3 : slaPercent >= 99.99 ? 2 : slaPercent >= 99.9 ? 1 : 0;

  return {
    allowedDowntimeMinutes,
    monthlyMinutes,
    burnPerHourAt1x,
    burnPerHourAt2x,
    burnPerHourAt10x,
    hoursToExhaustAt2x,
    hoursToExhaustAt10x,
    ninesLabel: `${slaPercent.toFixed(decimalPlaces)}% (${nines} nines)`,
  };
}

export const notationEntries: NotationEntry[] = [
  { symbol: "λ", plain: "Lambda: the average arrival rate of requests or jobs per unit of time.", category: "queueing" },
  { symbol: "μ", plain: "Mu: the average service rate of one server per unit of time.", category: "queueing" },
  { symbol: "ρ", plain: "Rho: server utilization, usually arrival rate divided by service rate.", category: "queueing" },
  { symbol: "L", plain: "The average number of requests or jobs in a queueing system.", category: "queueing" },
  { symbol: "Lq", plain: "The average number of requests waiting in a queue, excluding requests in service.", category: "queueing" },
  { symbol: "W", plain: "The average total time a request spends waiting plus being served.", category: "queueing" },
  { symbol: "Wq", plain: "The average time a request waits before service begins.", category: "queueing" },
  { symbol: "Little's Law", plain: "L equals lambda times W: concurrency equals throughput times latency.", category: "queueing" },
  { symbol: "p50", plain: "The median latency: half of requests are faster and half are slower.", category: "performance" },
  { symbol: "p95", plain: "The latency below which 95 percent of requests complete.", category: "performance" },
  { symbol: "p99", plain: "The latency below which 99 percent of requests complete; it exposes the slow tail.", category: "performance" },
  { symbol: "p99.9", plain: "The latency below which 99.9 percent of requests complete.", category: "performance" },
  { symbol: "QPS", plain: "Queries per second, a common measure of request throughput.", category: "performance" },
  { symbol: "RPS", plain: "Requests per second, including reads, writes, or a mixed workload.", category: "performance" },
  { symbol: "O(1)", plain: "Constant-time work that does not grow with input size.", category: "performance" },
  { symbol: "O(log n)", plain: "Logarithmic-time work, common for balanced tree and binary-search operations.", category: "performance" },
  { symbol: "O(n)", plain: "Linear-time work that grows in proportion to input size.", category: "performance" },
  { symbol: "O(n²)", plain: "Quadratic-time work that grows with the square of input size.", category: "performance" },
  { symbol: "CAP", plain: "During a network partition, a distributed system must choose consistency or availability.", category: "distributed" },
  { symbol: "PACELC", plain: "Extends CAP with the normal-operation trade-off between latency and consistency.", category: "distributed" },
  { symbol: "N + R > W", plain: "A common quorum overlap rule where replicas, reads, and writes must intersect.", category: "distributed" },
  { symbol: "2PC", plain: "Two-phase commit coordinates atomic commit across participants, at the cost of blocking failure modes.", category: "distributed" },
  { symbol: "Raft", plain: "A consensus protocol that elects a leader and replicates an ordered log.", category: "distributed" },
  { symbol: "SLA", plain: "A service-level agreement: the availability or performance promise made to users.", category: "reliability" },
  { symbol: "SLO", plain: "A service-level objective: the internal target used to manage a service.", category: "reliability" },
  { symbol: "SLI", plain: "A service-level indicator: the measured signal used to evaluate an SLO.", category: "reliability" },
  { symbol: "Error budget", plain: "The allowed amount of unreliability derived from one minus the SLO.", category: "reliability" },
  { symbol: "Burn rate", plain: "How quickly a service consumes its error budget compared with the intended rate.", category: "reliability" },
  { symbol: "RPO", plain: "Recovery point objective: the maximum acceptable age of recovered data.", category: "reliability" },
  { symbol: "RTO", plain: "Recovery time objective: the maximum acceptable time to restore service.", category: "reliability" },
  { symbol: "MTTR", plain: "Mean time to repair or restore a service after a failure.", category: "reliability" },
  { symbol: "MTBF", plain: "Mean time between failures, averaged over repeated incidents.", category: "reliability" },
  { symbol: "TLS", plain: "Transport Layer Security encrypts data in transit and authenticates servers.", category: "security" },
  { symbol: "mTLS", plain: "Mutual TLS authenticates both client and server for service-to-service traffic.", category: "security" },
  { symbol: "RBAC", plain: "Role-based access control grants permissions through assigned roles.", category: "security" },
  { symbol: "JWT", plain: "JSON Web Token: a signed or encrypted token format for claims; it is not encryption by default.", category: "security" },
  { symbol: "softmax", plain: "Converts a vector of logits into a probability distribution that sums to one.", category: "machine-learning" },
  { symbol: "logits", plain: "Raw model scores before a probability transform such as softmax.", category: "machine-learning" },
  { symbol: "KL", plain: "Kullback-Leibler divergence measures how one probability distribution differs from another.", category: "machine-learning" },
  { symbol: "Perplexity", plain: "An exponentiated average negative log-likelihood; lower values indicate more confident predictions.", category: "machine-learning" },
  { symbol: "Temperature", plain: "A sampling control that sharpens or flattens a model's output distribution.", category: "machine-learning" },
  { symbol: "KV", plain: "Key-value cache memory that stores attention keys and values during generation.", category: "machine-learning" },
  { symbol: "TTFT", plain: "Time to first token: latency from request arrival to the first generated token.", category: "machine-learning" },
  { symbol: "tokens/s", plain: "Token generation or processing throughput per second.", category: "machine-learning" },
  { symbol: "Context window", plain: "The maximum number of input and output tokens a model can consider at once.", category: "machine-learning" },
  { symbol: "RAG", plain: "Retrieval-augmented generation grounds model answers in retrieved source material.", category: "machine-learning" },
  { symbol: "Embedding", plain: "A dense numeric vector representing the meaning or features of text, images, or other data.", category: "machine-learning" },
  { symbol: "Cosine similarity", plain: "A vector similarity measure based on the angle between two embeddings.", category: "machine-learning" },
];

export function decodeNotation(query: string): NotationEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...notationEntries];
  return notationEntries.filter((entry) =>
    entry.symbol.toLowerCase().includes(normalized) ||
    entry.plain.toLowerCase().includes(normalized),
  );
}

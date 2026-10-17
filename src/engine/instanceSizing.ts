/**
 * Instance sizing — turns the vCPU / memory shape a learner picks in the
 * inspector into the throughput and buffering the simulator actually uses.
 *
 * Model (simple, monotonic, and explainable):
 * - vCPU is the throughput knob:    throughput = seedThroughput * (vcpu / seedVcpu)
 * - memory is the buffering knob:   maxConcurrency = seedConcurrency * (memoryGb / seedMemoryGb)
 *
 * Explicit overrides always win over derived values, and every scale is
 * clamped to [0.1x, 16x] so a single node can never absorb the whole planet.
 *
 * Pure module: no browser APIs, safe to unit test in Node and to run inside
 * the simulation worker.
 */

export const SIZING_MIN_SCALE = 0.1;
export const SIZING_MAX_SCALE = 16;

/** Fallback shape when a primitive (e.g. a user-authored custom resource)
 *  does not declare vCPU/memory of its own. */
export const DEFAULT_SEED_VCPU = 2;
export const DEFAULT_SEED_MEMORY_GB = 4;

export interface InstanceSizingInput {
  /** Per-node override chosen in the inspector. */
  overrideVcpu?: number;
  overrideMemoryGb?: number;
  /** The primitive's declared baseline shape. */
  seedVcpu?: number;
  seedMemoryGb?: number;
  /** The primitive's declared baseline throughput / concurrency. */
  seedThroughputRps: number;
  seedMaxConcurrency: number;
  /** Hard overrides set directly on the node (win over everything). */
  explicitThroughputRps?: number;
  explicitMaxConcurrency?: number;
}

export interface InstanceSizing {
  /** Effective vCPU per replica. */
  vcpu: number;
  /** Effective memory GiB per replica. */
  memoryGb: number;
  /** Effective per-replica sustainable throughput (mu). */
  baseThroughputRps: number;
  /** Effective per-replica in-flight buffering capacity (K/c). */
  maxConcurrency: number;
  /** Multiplier applied to the seed throughput (1 = stock). */
  throughputScale: number;
  /** Multiplier applied to the seed concurrency (1 = stock). */
  concurrencyScale: number;
  /** True when the shape differs from the primitive's declared baseline. */
  customized: boolean;
}

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale) || scale <= 0) return SIZING_MIN_SCALE;
  return Math.min(SIZING_MAX_SCALE, Math.max(SIZING_MIN_SCALE, scale));
}

/** Positive-number guard used all over this module. */
function positive(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

export function resolveInstanceSizing(input: InstanceSizingInput): InstanceSizing {
  const seedVcpu = positive(input.seedVcpu, DEFAULT_SEED_VCPU);
  const seedMemoryGb = positive(input.seedMemoryGb, DEFAULT_SEED_MEMORY_GB);
  const vcpu = positive(input.overrideVcpu, seedVcpu);
  const memoryGb = positive(input.overrideMemoryGb, seedMemoryGb);

  const throughputScale = clampScale(vcpu / seedVcpu);
  const concurrencyScale = clampScale(memoryGb / seedMemoryGb);

  const derivedThroughput = input.seedThroughputRps * throughputScale;
  const derivedConcurrency = input.seedMaxConcurrency * concurrencyScale;

  const baseThroughputRps = positive(input.explicitThroughputRps, derivedThroughput);
  const maxConcurrency = Math.max(1, Math.round(positive(input.explicitMaxConcurrency, derivedConcurrency)));

  return {
    vcpu,
    memoryGb,
    baseThroughputRps: Math.max(1, baseThroughputRps),
    maxConcurrency,
    throughputScale,
    concurrencyScale,
    customized: vcpu !== seedVcpu || memoryGb !== seedMemoryGb,
  };
}

/** Preset instance shapes surfaced in the inspector picker. */
export const INSTANCE_PRESETS: ReadonlyArray<{ id: string; label: string; vcpu: number; memoryGb: number }> = [
  { id: "nano", label: "Nano", vcpu: 0.5, memoryGb: 1 },
  { id: "small", label: "Small", vcpu: 2, memoryGb: 4 },
  { id: "medium", label: "Medium", vcpu: 4, memoryGb: 16 },
  { id: "large", label: "Large", vcpu: 8, memoryGb: 32 },
  { id: "xlarge", label: "X-Large", vcpu: 16, memoryGb: 64 },
];

/** Human-readable "+3.2× capacity" style label for the inspector. */
export function formatScale(scale: number): string {
  if (scale >= 1) return `${scale.toFixed(scale >= 10 ? 0 : 1)}×`;
  return `${scale.toFixed(2)}×`;
}

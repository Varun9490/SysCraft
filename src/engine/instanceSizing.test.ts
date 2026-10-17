import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEED_MEMORY_GB,
  DEFAULT_SEED_VCPU,
  INSTANCE_PRESETS,
  SIZING_MAX_SCALE,
  SIZING_MIN_SCALE,
  clampScale,
  formatScale,
  resolveInstanceSizing,
} from "@/engine/instanceSizing";

describe("clampScale", () => {
  it("keeps sane scales untouched", () => {
    expect(clampScale(1)).toBe(1);
    expect(clampScale(2.5)).toBe(2.5);
  });

  it("clamps to the documented band", () => {
    expect(clampScale(0)).toBe(SIZING_MIN_SCALE);
    expect(clampScale(-4)).toBe(SIZING_MIN_SCALE);
    expect(clampScale(999)).toBe(SIZING_MAX_SCALE);
    expect(clampScale(Number.NaN)).toBe(SIZING_MIN_SCALE);
  });
});

describe("resolveInstanceSizing", () => {
  const base = {
    seedVcpu: 2,
    seedMemoryGb: 4,
    seedThroughputRps: 1000,
    seedMaxConcurrency: 500,
  };

  it("returns the seed shape when nothing is overridden", () => {
    const result = resolveInstanceSizing(base);
    expect(result.vcpu).toBe(2);
    expect(result.memoryGb).toBe(4);
    expect(result.baseThroughputRps).toBe(1000);
    expect(result.maxConcurrency).toBe(500);
    expect(result.throughputScale).toBe(1);
    expect(result.concurrencyScale).toBe(1);
    expect(result.customized).toBe(false);
  });

  it("scales throughput linearly with vCPU", () => {
    const doubled = resolveInstanceSizing({ ...base, overrideVcpu: 4 });
    expect(doubled.throughputScale).toBe(2);
    expect(doubled.baseThroughputRps).toBe(2000);
    expect(doubled.customized).toBe(true);

    const halved = resolveInstanceSizing({ ...base, overrideVcpu: 1 });
    expect(halved.throughputScale).toBe(0.5);
    expect(halved.baseThroughputRps).toBe(500);
  });

  it("scales buffering linearly with memory", () => {
    const result = resolveInstanceSizing({ ...base, overrideMemoryGb: 16 });
    expect(result.concurrencyScale).toBe(4);
    expect(result.maxConcurrency).toBe(2000);
  });

  it("keeps memory and CPU knobs independent", () => {
    const result = resolveInstanceSizing({ ...base, overrideVcpu: 8, overrideMemoryGb: 4 });
    expect(result.throughputScale).toBe(4);
    expect(result.concurrencyScale).toBe(1);
  });

  it("lets explicit overrides win over derived values", () => {
    const result = resolveInstanceSizing({
      ...base,
      overrideVcpu: 8,
      explicitThroughputRps: 123,
      explicitMaxConcurrency: 77,
    });
    expect(result.baseThroughputRps).toBe(123);
    expect(result.maxConcurrency).toBe(77);
  });

  it("clamps extreme shapes to the documented band", () => {
    const tiny = resolveInstanceSizing({ ...base, overrideVcpu: 0.1 });
    expect(tiny.throughputScale).toBe(SIZING_MIN_SCALE);
    const huge = resolveInstanceSizing({ ...base, overrideVcpu: 128 });
    expect(huge.throughputScale).toBe(SIZING_MAX_SCALE);
  });

  it("falls back to default shape constants when the primitive has no declared shape", () => {
    const result = resolveInstanceSizing({
      seedThroughputRps: 800,
      seedMaxConcurrency: 200,
      overrideVcpu: DEFAULT_SEED_VCPU,
      overrideMemoryGb: DEFAULT_SEED_MEMORY_GB,
    });
    expect(result.throughputScale).toBe(1);
    expect(result.concurrencyScale).toBe(1);
    expect(result.baseThroughputRps).toBe(800);
  });

  it("ignores non-positive garbage from number inputs", () => {
    const result = resolveInstanceSizing({ ...base, overrideVcpu: 0, overrideMemoryGb: Number.NaN });
    expect(result.vcpu).toBe(2);
    expect(result.memoryGb).toBe(4);
    expect(result.throughputScale).toBe(1);
  });

  it("ships ascending presets ending at the documented extremes", () => {
    const vcpus = INSTANCE_PRESETS.map((p) => p.vcpu);
    expect(vcpus).toEqual([...vcpus].sort((a, b) => a - b));
    expect(INSTANCE_PRESETS[0].vcpu).toBe(0.5);
    expect(INSTANCE_PRESETS[INSTANCE_PRESETS.length - 1].vcpu).toBe(16);
  });
});

describe("formatScale", () => {
  it("formats with a single decimal below 10x and none above", () => {
    expect(formatScale(1)).toBe("1.0×");
    expect(formatScale(2.5)).toBe("2.5×");
    expect(formatScale(12)).toBe("12×");
  });

  it("formats sub-1x scales with two decimals", () => {
    expect(formatScale(0.25)).toBe("0.25×");
  });
});

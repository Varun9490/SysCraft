import { SIM_KERNEL_WASM_BASE64 } from "./simKernelBytes";

export const PHYSICS_STRIDE = 16;
const FALLBACK_MAX_NODES = 96;

interface Kernel {
  input: Float64Array;
  output: Float64Array;
  batch: (count: number) => number;
}

let kernel: Kernel | null | undefined;
let bytes: Uint8Array<ArrayBuffer> | null = null;

function decodeKernel(): Uint8Array<ArrayBuffer> {
  if (bytes) return bytes;
  const binary = atob(SIM_KERNEL_WASM_BASE64);
  const result = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    result[index] = binary.charCodeAt(index);
  }
  bytes = result;
  return result;
}

/** Returns null in Node, on old browsers, or if the embedded module is invalid. */
function tryLoadKernel(): Kernel | null {
  if (kernel !== undefined) return kernel;
  kernel = null;
  if (typeof atob !== "function" || typeof WebAssembly === "undefined") return null;
  try {
    const module = new WebAssembly.Module(decodeKernel());
    const instance = new WebAssembly.Instance(module, {});
    const exports = instance.exports as unknown as {
      input_ptr: () => number;
      output_ptr: () => number;
      physics_batch: (count: number) => number;
      memory: WebAssembly.Memory;
    };
    if (
      typeof exports.input_ptr !== "function" ||
      typeof exports.output_ptr !== "function" ||
      typeof exports.physics_batch !== "function" ||
      !(exports.memory instanceof WebAssembly.Memory)
    ) {
      return null;
    }
    const buffer = exports.memory.buffer;
    kernel = {
      input: new Float64Array(buffer, exports.input_ptr(), PHYSICS_STRIDE * FALLBACK_MAX_NODES),
      output: new Float64Array(buffer, exports.output_ptr(), PHYSICS_STRIDE * FALLBACK_MAX_NODES),
      batch: exports.physics_batch,
    };
    return kernel;
  } catch {
    return null;
  }
}

export function maxPhysicsNodes(): number {
  return tryLoadKernel() ? FALLBACK_MAX_NODES : 0;
}

/** Writes one node into the borrowed WASM input workspace. */
export function writePhysicsNode(
  index: number,
  capacityRps: number,
  arrivalRps: number,
  baseP50Ms: number,
  baseP95Ms: number,
  baseP99Ms: number,
  engineCode: number,
  writeRatio: number,
  elapsedSeconds: number,
  prevDepth: number,
  maxConcurrency: number,
  replicationFactor: number,
  avgPromptTokens: number,
  avgOutputTokens: number,
  vramGbPerReplica: number,
  isLlm: boolean,
): void {
  const input = tryLoadKernel()?.input;
  if (!input || !Number.isInteger(index) || index < 0 || index >= FALLBACK_MAX_NODES) return;
  const offset = index * PHYSICS_STRIDE;
  input[offset] = capacityRps;
  input[offset + 1] = arrivalRps;
  input[offset + 2] = baseP50Ms;
  input[offset + 3] = baseP95Ms;
  input[offset + 4] = baseP99Ms;
  input[offset + 5] = engineCode;
  input[offset + 6] = writeRatio;
  input[offset + 7] = elapsedSeconds;
  input[offset + 8] = prevDepth;
  input[offset + 9] = maxConcurrency;
  input[offset + 10] = replicationFactor;
  input[offset + 11] = avgPromptTokens;
  input[offset + 12] = avgOutputTokens;
  input[offset + 13] = vramGbPerReplica;
  input[offset + 14] = isLlm ? 1 : 0;
  input[offset + 15] = 0;
}

/**
 * Opens the reusable input workspace. The view is borrowed by one simulation
 * tick and must not outlive `commitPhysicsBatch`; no copy or JS allocation is
 * made for the numeric workspace itself.
 */
export function beginPhysicsBatch(): Float64Array | null {
  const ready = tryLoadKernel();
  return ready ? ready.input : null;
}

export function commitPhysicsBatch(count: number): Float64Array | null {
  const ready = tryLoadKernel();
  if (!ready || !Number.isInteger(count) || count <= 0 || count > FALLBACK_MAX_NODES) return null;
  return ready.batch(count) === count ? ready.output : null;
}

export function simKernelStatus(): "wasm" | "javascript" {
  return tryLoadKernel() ? "wasm" : "javascript";
}

export function simKernelMemoryBytes(): number {
  const ready = tryLoadKernel();
  if (!ready) return 0;
  // The fixed-memory linker contract caps this at 64 KiB.
  return ready.input.buffer.byteLength;
}

export function warmSimKernel(): boolean {
  return beginPhysicsBatch() !== null;
}

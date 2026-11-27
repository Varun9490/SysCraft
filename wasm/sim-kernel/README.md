# WebAssembly simulation kernel

The 20 Hz simulation worker runs its per-node queue, latency, CPU, and LLM
physics through a small WebAssembly module. The module has no allocator and the
linker caps its linear memory at 64 KiB. The host borrows fixed input/output
`Float64Array` views for each tick instead of allocating separate queue,
latency, and LLM result objects per node.

`src/engine/wasm/simKernel.ts` lazily instantiates the embedded module. If
WebAssembly is unavailable or the module fails validation, the original pure
TypeScript functions in `src/engine/queuingMath.ts` remain the exact fallback.
Graph solving, resource metadata, circuit breakers, cache warming, and snapshot
assembly stay in TypeScript so the architecture remains testable in Node.

## Rebuild

Requires the Rust `wasm32-unknown-unknown` target:

```powershell
rustup target add wasm32-unknown-unknown
npm run wasm:build
```

The generated `src/engine/wasm/simKernelBytes.ts` is committed so normal
Next.js and Vitest runs do not require Rust.

## Verification

```powershell
npm run wasm:test
npx vitest run src/engine/__tests__/simKernel.test.ts src/engine/__tests__/simulationCore.test.ts
```

The parity test compares WASM output against the TypeScript formulas for idle,
overloaded, storage-write, LLM, and degenerate inputs. It also asserts that the
real module loaded and that its memory is exactly one 64 KiB page.

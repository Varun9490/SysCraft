You are building **SysCanvas** in 100% Autonomous Mode. Obey these strict technical invariants on every file edit:

## 1. NEXT.JS STATIC EXPORT & SSR SAFETY (CRITICAL)
- `next.config.ts` MUST configure `output: 'export'` and `images: { unoptimized: true }`.
- Every component under `src/components/**` MUST begin with `'use client';` on line 1.
- In `src/app/page.tsx`, load the main workspace via `next/dynamic` with `{ ssr: false }` so `@xyflow/react`, `roughjs`, `dexie`, `y-webrtc`, and `AudioContext` NEVER execute during Node.js build-time prerendering.
- Never reference `window`, `document`, `localStorage`, `navigator`, or `AudioContext` at module top-level scope. Always guard inside `useEffect` or `if (typeof window !== 'undefined')`.

## 2. @XYFLOW/REACT v12 STRICT RULES
- Always import from `'@xyflow/react'` (NEVER from legacy `'reactflow'`).
- Import `'@xyflow/react/dist/style.css'` in `src/app/layout.tsx`.
- Define `const nodeTypes = { resource: ResourceNode, region: RegionGroupNode };` at **module scope outside the component** (or memoized with `useMemo` with empty deps `[]`). Defining `nodeTypes` inside the render function causes catastrophic infinite remounting.
- In `@xyflow/react` v12, custom node props use `NodeProps<Node<ResourceNodeData>>`. Access custom data via `data.*`.

## 3. 60 FPS RENDERING & TELEMETRY SEPARATION
- **DO NOT** update `@xyflow/react` `nodes` state array on every 50ms simulation tick! Mutating React Flow's `nodes` array 20 times/sec destroys drag performance and causes stuttering.
- **Correct Pattern:**
  1. `useCanvasStore` holds the **structural topology** (`nodes`, `edges`, positions, configuration overrides).
  2. `useSimStore` holds a dictionary of **live telemetry** keyed by `nodeId` (`Record<string, NodeTelemetry>`) updated at 10Hz for UI badges, PLUS a mutable `simSnapshotRef` updated at 20Hz read directly by `TrafficParticleLayer.tsx`'s `requestAnimationFrame` loop.
  3. Inside `ResourceNode.tsx`, subscribe selectively to that single node's telemetry:
     `const telemetry = useSimStore((s) => s.nodeTelemetry[id]);`
- **Rough.js Memoization:** Inside `ResourceNode.tsx`, memoize the Rough.js SVG path string with `useMemo` keyed ONLY on `[width, height, strokeColor, fillStyle, roughEnabled]`. Never regenerate Rough.js paths when RPS or CPU% changes.

## 4. WEB WORKER RESILIENCE PATTERN
- Instantiate the simulation worker inside a `useEffect` with a clean fallback:
  ```ts
  const worker = new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), { type: 'module' });
Also export the core stepSimulationTick(topology, chaosState, prevTick) pure function from src/engine/simulationCore.ts so:

simulation.worker.ts simply wraps stepSimulationTick.

Vitest unit tests can test stepSimulationTick directly in Node.js without needing a browser Worker environment.

If Worker instantiation ever fails in a restricted iframe, the main thread can fall back to calling stepSimulationTick inside a setInterval(..., 50) seamlessly.

5. COMPLETE IMPLEMENTATION — NO STUBS
Never write // TODO, // Add remaining items here, or placeholder empty arrays.

seedResources.ts MUST contain all 28 complete primitives with realistic latency, throughput, cost, security, and encyclopedia Markdown content.

guidedLabs.ts MUST contain all 16 complete multi-stage system design labs with automated topology grading rules.

After creating or modifying files in each milestone, always run npx tsc --noEmit to verify zero TypeScript errors before proceeding

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

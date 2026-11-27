# PROGRESS.md — SysCanvas Autonomous Build Tracker

## Execution Status
- [x] **Milestone 1: Core Schemas & Mathematical Engines**
  - [x] `src/types/resource.ts`, `simulation.ts`, `workbench.ts`, `encyclopedia.ts`, `challenges.ts`
  - [x] `src/engine/queuingMath.ts` (Clamped M/M/c/K, Kingman equation, LLM TTFT/KV-cache math)
  - [x] `src/engine/fsrsScheduler.ts` (FSRS v4 spaced repetition algorithm)
  - [x] `src/data/regionLatency.ts` (Cross-region submarine fiber latency matrix)
  - [x] Verification: `npx tsc --noEmit` passes.

- [x] **Milestone 2: Seed Databases (28 Primitives, 19 Encyclopedia Modules, 16 Guided Labs, 20 Chaos Drills)**
  - [x] `src/data/seedResources.ts` (All 28 Web, Storage, Messaging, Security & Agentic AI primitives)
  - [x] `src/data/encyclopediaData.ts` (19 deep-dive modules + trade-off matrices + quizzes)
  - [x] `src/data/guidedLabs.ts` (16 multi-stage labs: Bitly, YouTube, WhatsApp, BookMyShow, Razorpay, DynamoDB, Agentic RAG, etc.)
  - [x] `src/data/chaosScenarios.ts` (20 timed outage scenarios with budgets & SLAs)
  - [x] Verification: `npx tsc --noEmit` passes.

- [x] **Milestone 3: Simulation Core, Web Worker, OpenTelemetry Traces & Local Stores**
  - [x] `src/engine/simulationCore.ts` (8-Pass Damped Gauss-Seidel cyclic solver + node physics)
  - [x] `src/workers/simulation.worker.ts` (20Hz worker loop with fallback)
  - [x] `src/engine/traceGenerator.ts` (OpenTelemetry hop-by-hop waterfall span generator)
  - [x] `src/store/db.ts`, `useCanvasStore.ts`, `useSimStore.ts`, `useWorkbenchStore.ts`, `useLearningStore.ts`
  - [x] Verification: `npx tsc --noEmit` passes.

- [x] **Milestone 4: Interactive Excalidraw-Style Canvas, Semantic Zoom & 60 FPS Particle Engine**
  - [x] `src/components/canvas/ResourceNode.tsx` (Rough.js memoized sketchy mode + Semantic Zoom levels 1/2/3)
  - [x] `src/components/canvas/RegionGroupNode.tsx` (AWS/GCP/Azure multi-region zones)
  - [x] `src/components/canvas/TrafficParticleLayer.tsx` (Decoupled 60 FPS HTML5 Canvas packet renderer)
  - [x] `src/components/canvas/FloatingToolbar.tsx` (Single-key shortcuts, Chaos Monkey bar, Auto-Layout)
  - [x] `src/components/canvas/SystemCanvas.tsx`
  - [x] Verification: `npx tsc --noEmit` passes.

- [x] **Milestone 5: Internal Algorithm Micro-Simulators & Visual Almanac**
  - [x] `src/components/canvas/InternalSimModal.tsx` (Interactive B-Tree vs LSM-Tree, Raft Consensus election, Consistent Hashing ring, Token Bucket)
  - [x] `src/components/encyclopedia/VisualAlmanac.tsx`, `SkillConstellation.tsx`, `ContextualQuizCard.tsx`
  - [x] Verification: `npx tsc --noEmit` passes.

- [x] **Milestone 6: 6-Step Interview Workbench & Adversarial Staff AI Interviewer**
  - [x] `src/engine/aiClient.ts` (3-Tier AI: BYOK Cloud + WebGPU WebLLM + Deterministic Offline Heuristic Architect)
  - [x] `src/components/workbench/BoECalculator.tsx` (Back-of-the-Envelope capacity calculator synced to canvas)
  - [x] `src/components/workbench/ApiContractBuilder.tsx` & `DataModelDesigner.tsx`
  - [x] `src/components/workbench/SocraticInterviewer.tsx` (Voice mode + 45-min rubric grading L4-L7)
  - [x] `src/components/workbench/DesignWorkbench.tsx`
  - [x] Verification: `npx tsc --noEmit` passes.

- [x] **Milestone 7: Observability Drawer, Time-Travel DVR, Post-Mortem RCA & IaC Compilers**
  - [x] `src/engine/iacCompiler.ts` & `dslParser.ts` (Terraform, Docker Compose, K8s, Mermaid & RFC Markdown export)
  - [x] `src/components/telemetry/TelemetryDrawer.tsx`, `TraceWaterfallModal.tsx`, `TimeTravelScrubber.tsx`, `PostMortemModal.tsx`
  - [x] `src/components/studio/CustomResourceStudio.tsx` & `IaCExportModal.tsx`
  - [x] `src/components/games/GuidedLabRunner.tsx` & `IncidentArena.tsx`
  - [x] Verification: `npx tsc --noEmit` passes.

- [x] **Milestone 8: Unified Workspace, Procedural Audio, Unit Tests & Production Static Build**
  - [x] `src/engine/soundEngine.ts` (Web Audio API tactile clicks, harmonic load hum, error alerts)
  - [x] `src/app/page.tsx` & `src/app/layout.tsx` (Client-only dynamic shell + `Cmd+K` Command Palette)
  - [x] `src/engine/__tests__/queuingMath.test.ts` & `simulationCore.test.ts`
  - [x] Final Verification: `npm run typecheck && npm run test && npm run build` exits with code `0`.

---

# SysCraft Learning Platform Redesign

## Phase 1 — Audit and blueprint
- [x] Audited 36 routes, 234 legacy lessons, 16 labs, 24 topics, 43 encyclopedia articles, and 48 primitives.
- [x] Wrote `docs/redesign-blueprint.md`.
- [x] Preserved the simulation core, worker split, React Flow telemetry separation, and static export.

## Phase 2 — Shell, motion, and local learner state
- [x] Added dark/light/system themes, responsive navigation, command palette, utility dock, custom cursor, ambient field, and break reminder.
- [x] Added versioned `syscraft.learner.v1` persistence, notes, bookmarks, resume pointers, preferences, quiz history, and JSON import/export.
- [x] Removed Supabase auth surfaces and Vercel Analytics; rewrote pricing as a free-product explanation.

## Phase 3 — Scrollytelling and visual library
- [x] Added Story / Engineer / Both lesson and blog readers with scroll and click/keyboard stepping.
- [x] Added 21 code-generated visualizers and defensive security panels.
- [x] Restored saved reading steps and automatic blog read tracking.

## Phase 4 — Curriculum
- [x] Added 7 complete tracks with 53 lessons and 8 engineering blogs.
- [x] Every lesson/blog has 4–5 dual-mode steps, at least 3 security practices, and at least 4 quiz questions.
- [x] Added curriculum contract tests for depth, IDs, visuals, prerequisites, security, and quiz shape.

## Phase 5 — Hero, labs, map, tools, and recall
- [x] Added the interactive hero mini-canvas with traffic spike, node failure, and defensive attack toggle.
- [x] Surfaced challenge goals and hardening focus across all 16 existing labs.
- [x] Added the knowledge map with track, blog, and lab navigation.
- [x] Added capacity, KV-cache, SLA/error-budget, notation, and security-checklist tools.
- [x] Added read-topic-only randomized recall with FSRS-weighted review history.

## WebAssembly acceleration
- [x] Added a fixed-memory Rust/WASM physics kernel with a 64 KiB memory cap.
- [x] Batched per-node queue, latency, CPU, error-rate, and LLM physics without per-node JS result objects.
- [x] Kept the pure TypeScript fallback and added formula-parity tests.
- [x] Throttled ambient drawing to 12fps at a 1x backing store and stopped the custom cursor loop when settled.

## Production polish pass
- [x] Rebuilt the hero as a complete request/response flow with animated beams, node halos, lifecycle state, and defensive attack controls.
- [x] Added reusable magnetic links, tilt cards, scroll/text reveals, spotlight grids, bento cards, animated beams, and counters.
- [x] Redesigned the landing narrative, track showcase, quick links, and lesson-anatomy walkthrough.
- [x] Compacted the utility dock to a 44–48px animated launcher with a focused popover.
- [x] Made Story/Engineer/Both progressive: Story first, Engineer on demand, one text layer at a time.
- [x] Fixed reader mode step stability, canonical lesson/lab bookmark URLs, and stable dock launcher targeting.
- [x] Made reader mode controls sticky so switching Story/Engineer/Both never requires leaving the current step.
- [x] Optimized ambient rendering to 6fps with a single batched grid path and 1x backing store.
- [x] Added a 36-check weighted production QA scorecard.

## Verification
- [x] `npx tsc --noEmit`
- [x] `npm test` — 271 tests passing
- [x] `npm run wasm:test`
- [x] `npm run lint` — 0 errors, 0 warnings
- [x] `npm run build` — 513 static pages generated
- [x] Desktop/mobile Playwright QA — all checks passed with no console errors
- [x] Production QA scorecard — 100/100 across 36 checks
- [x] Steady-state browser frame timing — 22.59ms average, 33.40ms p95 in isolated headless Chromium

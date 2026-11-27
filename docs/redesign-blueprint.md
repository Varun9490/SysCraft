# SysCraft redesign blueprint

**Audit date:** 2026-11-27  
**Repository:** `C:\Users\varun\Desktop\sysDesign`  
**Product names in current code:** SysCraft; SysCanvas appears in architecture notes and legacy storage.  
**Target:** a free, zero-login, local-first visual engineering learning platform with seven complete tracks, stories and engineering explanations side by side, live architecture simulation, blogs, labs, a knowledge map, tools, and spaced review.

This is a file-level plan, not an implementation. No application source was changed during the audit. Counts below come from the checked files and tests, not from marketing copy.

---

## 1. Current-state audit

### 1.1 Repository and framework facts

- `package.json` pins Next.js **16.4.6**, React **19**, Tailwind **3.4**, TypeScript **5.7**, Vitest **2.1**, and Playwright **1.64**.
- `next.config.ts` already has the required `output: "export"` and `images.unoptimized: true`. Preserve both.
- `src/app/layout.tsx` imports `@xyflow/react/dist/style.css`, uses `next/font/google` with Outfit, and mounts `BootRunner`, `ThemeBridge`, and Vercel Analytics.
- All **109** current `.tsx` files under `src/components/**` already begin with `'use client';`. Preserve that invariant for every new component.
- `src/app/page.tsx` is currently a **static marketing page**, not the canvas. It imports landing components directly. This is a useful property and should be kept.
- The existing canvas and labs already use the correct client-only loader pattern:
  - `src/app/canvas/page.tsx` → `src/components/workspace/CleanWorkspaceLoader.tsx` → `dynamic(..., { ssr: false })`.
  - `src/app/labs/[id]/page.tsx` → `LabBrief` → `src/components/labs/LabWorkspaceLoader.tsx` → `dynamic(..., { ssr: false })`.
- Next.js 16 documentation was checked in `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` and `static-exports.md`. Two facts govern the redesign:
  1. `ssr: false` is **not allowed directly in a Server Component**. It must live in a Client Component loader.
  2. Dynamic import paths passed to `next/dynamic` must be explicit literals at module scope, not template strings or variables.
- Therefore, keep `/` as a Server Component and add a small Client Component loader for the interactive hero canvas. Do **not** make the whole landing page client-side just to use `ssr: false`.

### 1.2 Route inventory

There are **36 `page.tsx` routes** under `src/app` (metadata routes such as `sitemap.ts`, `robots.ts`, and `opengraph-image.tsx` are not included in that count).

| Route | Current role | Redesign disposition |
|---|---|---|
| `/` | Static marketing landing | Keep static shell; replace hero illustration with live mini-canvas; add resume pill and seven-track showcase. |
| `/canvas` | Full interactive architecture workspace | Keep. Continue loading through `CleanWorkspaceLoader` with `ssr: false`. |
| `/workspace` | Legacy client redirect to `/canvas` | Keep as compatibility redirect; retain `vercel.json` 301. |
| `/learn` | Existing curriculum index with 9 parts and 36 modules | Redirect to `/paths`; preserve old module/lesson URLs through aliases. |
| `/learn/[moduleId]/[lessonSlug]` | 234 authored lesson-blog pages | Keep as generated legacy aliases to canonical `/paths/...` lessons where mapped; never 404. |
| `/roadmap` | Existing full curriculum/progress view | Redirect to `/paths`; progress remains at `/progress`. |
| `/path` | Legacy redirect to `/learn` | Retarget to `/paths`. |
| `/topics` | Index of 24 interactive/concept topics | Redirect to `/map/topics`. |
| `/topics/[slug]` | 24 topic pages, 12 with live simulators | Redirect to `/map/topics/[slug]`; reuse `TopicPageContent` and `TopicSimulator`. |
| `/wiki` | Encyclopedia index and skill constellation | Redirect to `/map`. |
| `/wiki/[concept]` | 43 substantive concept articles | Redirect to `/map/concepts/[concept]`; reuse `ConceptReader`. |
| `/wiki/graph` | Existing SVG knowledge graph | Redirect to `/map`; reuse graph rendering and mastery coloring. |
| `/wiki/primitives` | 48-primitive reference library | Redirect to `/map/primitives`; reuse `PrimitivesBrowser`. |
| `/encyclopedia` | Legacy redirect to `/wiki` | Retarget to `/map`. |
| `/labs` | 16-lab gallery | Keep as canonical lab index; add challenge metadata and track filters. |
| `/labs/[id]` | Static lab brief plus client-only canvas | Keep exact route and loader architecture. |
| `/case-studies` | 33 runnable blueprint case studies | Redirect to `/paths/real-world-hld-lld`; keep blueprint gallery as a section/tool inside the track or `/map`. |
| `/practice` | Existing FSRS review runner | Keep as compatibility alias to `/quiz?mode=spaced`, or render the same runner with its legacy all-cards pool. |
| `/play` | Nine game modes plus live-workspace links | Keep as secondary practice surface; link from `/quiz` and `/labs`. |
| `/interview` | Client-side interview timer/rubric | Keep; link from case-study track. |
| `/flowchart` | Architecture pattern picker | Keep as an auxiliary tool. |
| `/cloud` | AWS/Azure/GCP/Cloudflare networking drills | Keep as a reference/tool deep link from track 7. |
| `/security` | Security practices, STRIDE, CVE triage | Keep as a defensive security reference; link from track 7 and `/tools/security-checklist`. |
| `/plugins` | Architecture plugin/rule studio | Keep as an advanced canvas tool. |
| `/enterprise` | Role tracks, SLA/TCO, ADR studio, cohort tools | Keep only as a free “architect toolkit”; remove commercial framing and link relevant pieces from tracks/tools. |
| `/room` | Zero-login P2P collaboration lobby | Keep. `yjs`/`y-webrtc` are already dynamically imported inside `RoomSession` effects. |
| `/s` | Link-carried shared design viewer | Keep. |
| `/resources/new` | Custom primitive studio | Keep as an advanced canvas tool. |
| `/progress` | Local FSRS/lab/prediction/play dashboard | Keep and extend with new learner-state reading/quiz data. |
| `/settings` | AI, practice, canvas, data backup/import | Keep; add theme, cursor, ambient, break, export/import controls. |
| `/privacy` | Data inventory | Keep; update after removing auth/analytics and adding learner storage. |
| `/reference/numbers` | Latency ladder and sourced claims | Keep; link from notation decoder and engineering lessons. |
| `/start` | Eight-step guided onboarding | Keep as an optional on-ramp; update destinations to `/paths`, `/map`, `/quiz`. |
| `/signin` | Real Supabase email/password sign-in | Replace with static `RedirectTo href="/"`; remove Supabase import. |
| `/signup` | Real Supabase account creation | Replace with static `RedirectTo href="/"`; remove Supabase import. |
| `/pricing` | Three plan cards: Free, Team “Talk to us”, Enterprise “Talk to us” | Replace plan copy with a single “Everything is free” local-first explanation. No checkout, sales CTA, gated feature, or account prompt. Keeping the URL avoids breaking old links and the current sitemap contract. |

**Auth/commercial finding:** `/signin` and `/signup` call `supabase.auth` through `src/lib/supabaseClient.ts`. That module contains a hard-coded fallback Supabase URL and anon key. `/pricing` is not a functioning checkout, but it still presents Team/Enterprise “Talk to us” plans. Both contradict the target product and must be removed as product surfaces.

**Analytics finding:** `layout.tsx` mounts `@vercel/analytics/next`, while `SettingsPanel` says “no telemetry.” Remove Analytics in Phase 6 unless the privacy copy and product decision explicitly change. The target should not phone home for progress.

### 1.3 Content inventory and depth

| Content | Verified count | Approximate size | Evidence / depth |
|---|---:|---:|---|
| Curriculum parts | **9** | `pathData.ts` 31.5 KB / 739 lines | Networking, Approach, Foundations, Distributed Systems, Under the Hood, AI Systems, Cloud/K8s/Edge, Security/Enterprise, Data/Search. |
| Curriculum modules | **36** | same | Module numbers run 0–35. |
| Authored lesson routes | **234** | same | `src/lib/lessonRoutes.ts` derives stable `/learn/<module>/<nn-slug>` URLs. |
| Lesson blogs | **234** | `lessonBlogs.ts` 893.6 KB / 7,966 lines | One complete blog per lesson; each has three stages, diagram flow, case study, sandbox, and quiz. |
| Lesson teaching stages | **702** | same | 234 blogs × 3 stages; enforced by `lessonBlogs.test.ts`. |
| Guided labs | **16** | `guidedLabs.ts` 126.0 KB / 870 lines | Every lab has a brief, multiple stages, automated grading rules, and a reference solution. |
| Guided grading-rule arrays | **86** | same | Existing `gradeRules` checks primitives, node count, multi-AZ, p99, errors, and cost. |
| Interactive/concept topics | **24** | `topics.ts` 57.2 KB / 1,057 lines | 12 declare a simulator `kind`; 12 are concept/reference topics. |
| Encyclopedia articles | **43** | `encyclopediaData.ts` 99.2 KB + `encyclopediaCurriculum.ts` 134.1 KB | 19 base deep dives + 24 curriculum modules; every body is substantive and starts with an H1. |
| Encyclopedia recall gaps | **6 modules** | `encyclopediaCurriculum.ts` | `tokenization-basics`, `embeddings-vector-db`, `rag-patterns`, `kv-cache-design`, `system-design-primer-curriculum`, and `replication-consistency` have real article bodies but empty quiz/flashcard/key-number arrays. These are recall-scaffolding gaps, not missing articles. |
| Canvas primitives | **48** | `seedResources.ts` 70.1 KB / 1,308 lines | 32 core + 16 Kubernetes/edge/observability primitives; all have realistic defaults and encyclopedia Markdown. |
| Blueprints | **33** | `blueprints.ts` 52.2 KB / 984 lines | Complete runnable topologies; tests verify every node/edge and entry traffic. |
| Chaos scenarios | **21** | `chaosScenarios.ts` 12.5 KB / 267 lines | Deterministic failure-injection scenarios mapped to engine chaos kinds. |
| Play modes | **9** | `playContent.ts` 21.8 KB / 453 lines | Deterministic question banks and live-lab links. |
| Glossary terms | **166** | `glossary.ts` 28.0 KB / 202 lines | Dense one-line entries; many link to existing wiki/lesson routes. |
| Security practices | **10** | `securityPractices.ts` 8.3 KB / 151 lines | Defensive controls, cloud/K8s guidance, and canvas checks. |
| Enterprise role tracks | **4** | `enterpriseTracks.ts` 17.2 KB / 368 lines | Production Engineer, Distributed Systems Owner, Principal Architect, SecOps/Cloud-Native Defender. |
| Onboarding steps | **8** | `startHere.ts` 3.6 KB / 96 lines | Every link currently resolves. |

**Do not claim the lesson content is missing.** The existing 234 lesson blogs and 16 labs are substantial. The missing work is the *new product schema, seven-track curation, dual story/engineer presentation, blogs surface, map/tools/quiz surfaces, and unified learner state*. Six encyclopedia modules need quiz/flashcard/key-number completion, and the new AI training/research-math curriculum needs net-new material.

### 1.4 Existing engines and visualizers to reuse

| Asset | Why it stays |
|---|---|
| `src/engine/simulationCore.ts` | Pure deterministic `stepSimulationTick(topology, chaosState, prevTick)` with flow solving, queues, circuit breakers, cache behavior, LLM physics, and aggregate snapshots. |
| `src/engine/queuingMath.ts` | Clamped M/M/c/K, Kingman latency, Little’s Law, replica sizing, LLM KV/TTFT math, serial/parallel availability. |
| `src/workers/simulation.worker.ts` | Thin 50 ms worker wrapper around `stepSimulationTick`; already supports start/stop/topology/chaos/reset/tick-once. |
| `src/store/useSimStore.ts` | Worker creation in browser code, main-thread fallback, 20 Hz mutable `simSnapshotRef`, 10 Hz Zustand telemetry, chaos controls. |
| `src/store/useCanvasStore.ts` | Structural topology only: nodes, edges, positions, overrides, undo/redo, blueprint loading, graph conversion. |
| `src/components/canvas/SysCraftCanvas.tsx` | React Flow v12 canvas; module-scope `nodeTypes`; correct topology/telemetry separation. |
| `src/components/canvas/ResourceNode.tsx` | Selective `useSimStore((s) => s.nodeTelemetry[id])`; Rough.js memo keyed only by geometry/stroke/fill/sketchy state. |
| `src/components/canvas/TrafficParticleLayer.tsx` | 60 fps canvas overlay reads `simSnapshotRef`; no per-tick React subscription. |
| `src/engine/fsrsScheduler.ts` | Pure FSRS-style scheduler used by IndexedDB-backed `useLearningStore`. |
| `src/engine/threatModel.ts` | Defensive STRIDE findings and remediation for canvas topologies. |
| `src/components/games/GuidedLabRunner.tsx` | Existing `gradeRules` implementation; do not replace it with a new physics/grader stack. |
| `src/components/canvas/InternalSimModal.tsx` | Existing B-tree/LSM, Raft, hash-ring, token-bucket, K8s reconcile, and edge/origin micro-simulators. |
| `src/components/topics/TopicSimulator.tsx` + `simCore.ts` | Existing interactive hash ring, load balancing, cache, rate limit, sharding, and CDN models. |
| `src/components/wiki/KnowledgeGraph.tsx` | Deterministic SVG graph with FSRS mastery coloring. |
| `src/components/encyclopedia/SkillConstellation.tsx` | Skill DAG and due-count visualization. |
| `src/components/wiki/ConceptReader.tsx` | Structured concept reader with quizzes, flashcards, key numbers, flow, and micro-sims. |
| `src/components/path/LessonBlogViewer.tsx` | Existing analogy, animated flow, three-stage progression, slider sandbox, case study, and quiz UI. Wrap/adapt rather than rewrite. |
| `src/data/lessonBlogs.ts`, `pathData.ts`, `encyclopediaData.ts`, `guidedLabs.ts`, `topics.ts` | Content sources of truth for adapters and legacy aliases. |
| `src/store/db.ts` | Dexie persistence for blueprints, custom resources, FSRS cards, lab progress, and sim recordings; backup/import/wipe already exist. |

### 1.5 Persistence audit

- `src/store/useLearningStore.ts` persists FSRS cards and lab progress to IndexedDB, not localStorage.
- `src/store/db.ts` uses database `syscraft_db_v1` and migrates legacy `syscanvas`.
- Canvas topology uses `syscraft-canvas-v1`, with lab scopes such as `syscraft-canvas-v1:lab:bitly-url-shortener`.
- Completed lessons currently use `syscraft.completedLessons.v1` in three components.
- Other local keys are listed in section 12.
- **Backup gap:** `db.ts` exports/imports/wipes only localStorage keys beginning `syscraft.`. The canvas key begins `syscraft-canvas-`, so canvas autosaves are currently outside that backup/wipe contract. Fix this in Phase 2.
- **SSR risk:** `db.ts` constructs `new SysCraftDatabase()` at module scope, and `layout.tsx` imports `BootRunner`, which imports `db.ts`. Several prerendered client component graphs also import `useLearningStore` → `db.ts`. Split the Dexie implementation into a browser-only dynamically imported module so importing the facade never constructs Dexie during prerender.
- **Bundle risk:** landing components import `contentManifest`, `guidedLabs`, and `pathData`. Because `contentManifest` imports most large registries, the current landing graph pulls in far more content data than the page needs. The new landing must use a lightweight catalog only.

### 1.6 Test surface

There are **25 Vitest files** and approximately **224 declared test cases**. The suite runs in Node (`vitest.config.ts`, `environment: "node"`), so new core logic must remain pure and browser-independent.

Must keep passing without weakening coverage:

- `src/engine/__tests__/simulationCore.test.ts`
- `src/engine/__tests__/queuingMath.test.ts`
- `src/engine/__tests__/threatModel.test.ts`
- `src/engine/__tests__/instanceSizing.test.ts`
- `src/data/__tests__/contentCounts.test.ts`
- `src/data/__tests__/lessonBlogs.test.ts`
- `src/data/__tests__/guidedLabs.test.ts`
- `src/data/__tests__/encyclopedia.test.ts`
- `src/data/__tests__/conceptFlows.test.ts`
- `src/data/__tests__/playContent.test.ts`
- `src/data/__tests__/blueprints.test.ts`
- `src/lib/__tests__/lessonRoutes.test.ts`
- `src/store/__tests__/canvasPersistence.test.ts`
- `src/store/__tests__/canvasPlacement.test.ts`
- `src/store/__tests__/canvasEdgeStyle.test.ts`
- `src/store/__tests__/canvasDeepLink.test.ts`
- `src/components/topics/__tests__/simCoreLab.test.ts`
- `src/app/sitemap.test.ts` — update only route expectations when canonical URLs change; retain uniqueness, omission, and canonical-origin assertions.

### 1.7 Current risks

1. **Static export vs SSR-unsafe transitive imports.** Client Components are still prerendered unless wrapped in a client-side `dynamic(ssr: false)` loader. A `'use client'` directive alone does not keep a library out of Node.
2. **Dexie module construction.** See the persistence risk above.
3. **Landing bundle weight.** Heavy registries are imported for counts and lab cards.
4. **Global simulation store ownership.** `useSimStore` is a singleton. A hero, lab, and canvas must never run competing topology providers on the same route.
5. **Legacy route fragmentation.** Learn, wiki, topics, roadmap, case studies, and practice split the same conceptual material across multiple IA trees.
6. **Progress fragmentation.** Lesson completion, FSRS, lab progress, predictions, play scores, and practice history live in different stores.
7. **Light mode is absent.** `globals.css` defines only dark root variables; `ThemeBridge` changes accent, not color scheme.
8. **Canonical URL mismatch.** `src/data/contentManifest.ts` uses `https://sys-craft-3vzz.vercel.app`; the supplied live URL is `https://sys-craft.vercel.app`. Confirm and align in Phase 6.
9. **AGENTS primitive count is stale.** `AGENTS.md` says 28 primitives, but `seedResources.ts` and tests contain 48. Do not truncate the catalog to satisfy stale prose.
10. **Privacy copy mismatch.** Auth and Analytics exist despite zero-login/no-telemetry language in some surfaces.
11. **Security tone.** Existing security material is mostly defensive, but new copy needs an explicit review gate: threat, impact, detection, hardening, and what to block only. No exploit procedures, payloads, or attack reproduction steps.

---

## 2. What to keep vs replace vs wrap

### Keep unchanged in behavior

- `next.config.ts` static export and unoptimized images.
- `@xyflow/react/dist/style.css` import in `src/app/layout.tsx`.
- `simulationCore.ts`, `queuingMath.ts`, `fsrsScheduler.ts`, `threatModel.ts`, and `simulation.worker.ts`.
- `useCanvasStore` as the only structural topology store.
- `useSimStore` telemetry/ref split and worker fallback.
- `SysCraftCanvas`, `ResourceNode`, `RegionGroupNode`, `TrafficParticleLayer`, module-scope `nodeTypes`, and Rough.js memoization.
- `GUIDED_LABS`, `gradeRules`, `LabBrief`, `LabWorkspaceLoader`, and per-lab canvas storage scopes.
- All 234 existing lesson blogs, 43 concept articles, 24 topics, 48 primitives, 33 blueprints, 21 chaos scenarios, and 166 glossary terms as source material.
- Existing Vitest engine/data/canvas tests.

### Replace

- The landing hero’s static `IsometricArchitecture` as the primary visual. It can remain as a lightweight decorative fallback, but the hero’s main visual becomes a live Client → LB → API → DB mini-canvas.
- Primary navigation and footer IA around `/paths`, `/blogs`, `/labs`, `/map`, `/tools`, `/quiz`.
- Plan/pricing copy, sign-in, and sign-up product surfaces.
- The warm-brass-only dark theme with a semantic dark/light token system.
- Fragmented lesson completion writes with one versioned learner store.

### Wrap or adapt

- `LessonBlogViewer` inside the new lesson player; do not delete its sandbox or flow logic.
- `ConceptReader`, `TopicPageContent`, `TopicSimulator`, `PrimitivesBrowser`, and `KnowledgeGraph` inside the new `/map` routes.
- `PracticeRunner` inside `/quiz` for spaced review, with an eligibility filter for read topics.
- `EnterpriseHubContent`’s SLA/TCO/ADR ideas inside free tools and track 7; avoid importing its 2,500-line component into the landing page.
- `SecurityPractices` and `SECURITY_PRACTICES` inside lesson security panels and the security checklist tool.
- `InternalSimModal` and `TopicSimulator` as registries of reusable visual stages.
- Existing `/learn`, `/wiki`, `/topics`, `/roadmap`, and `/case-studies` URLs as redirects/aliases, not deleted routes.

### Explicit non-rewrites

- Do not create a second queuing engine.
- Do not put RPS/CPU/P99 into React Flow node `data` or update `nodes` on simulation ticks.
- Do not move `nodeTypes` into render scope.
- Do not regenerate Rough.js paths from telemetry.
- Do not replace FSRS with a new scheduler.
- Do not replace guided-lab grading with an unrelated rubric engine.

---

## 3. Target information architecture and route map

### 3.1 Canonical routes

| Surface | Route | Notes |
|---|---|---|
| Landing | `/` | Static server-rendered shell; client-only hero simulation; resume pill; seven tracks. |
| Track index | `/paths` | Seven tracks, prerequisites, progress, estimated time. |
| Track detail | `/paths/[trackSlug]` | Static params for all seven tracks. |
| Lesson | `/paths/[trackSlug]/[lessonSlug]` | 72 lessons in the outline below; Story, Engineer, Side-by-Side, visual navigation, security, quiz bank. |
| Blog index | `/blogs` | Ten launch blogs; filters by track/topic. |
| Blog | `/blogs/[slug]` | Ambient background, story toggle, scrollytelling, security takeaways, read tracking. |
| Labs | `/labs`, `/labs/[id]` | Existing 16 labs plus challenge metadata; same canvas and engine. |
| Knowledge map | `/map` | Unified searchable map of tracks, lessons, concepts, topics, labs, and blogs. |
| Topic index | `/map/topics` | Existing 24 topics. |
| Topic detail | `/map/topics/[slug]` | Existing topic reader/simulator. |
| Concept detail | `/map/concepts/[concept]` | Existing 43 encyclopedia modules. |
| Primitive library | `/map/primitives` | Existing 48 primitives. |
| Tools | `/tools` | Five working tools. |
| Tool detail | `/tools/[toolSlug]` | `capacity`, `kv-cache`, `sla`, `notation`, `security-checklist`. |
| Quiz | `/quiz` | Read-topic-only randomized quiz and FSRS review. |
| Canvas | `/canvas` | Existing full workspace. |
| Progress | `/progress` | Unified local progress view. |
| Settings | `/settings` | Preferences and data controls. |
| Privacy | `/privacy` | Updated exact data inventory. |
| Free explanation | `/pricing` | No plans; explains that all learning surfaces are free and local-first. |

The 72 lesson URLs plus 10 blog URLs and all dynamic map/tool routes must be emitted by `generateStaticParams()`. Do not use `dynamicParams: true`, server actions, route handlers that read requests, or Next config redirects; those are unsupported or unsuitable for this static export.

### 3.2 Legacy redirects and aliases

Use two layers:

1. `vercel.json` permanent redirects for Vercel traffic.
2. Static App Router compatibility pages using `src/components/nav/RedirectTo.tsx` for static hosts and no-JS visitors.

Do **not** add redirects to `next.config.ts`; the Next 16 static-export guide lists Next config redirects as unsupported.

| Old route | New destination |
|---|---|
| `/path` | `/paths` |
| `/workspace` | `/canvas` (already present) |
| `/encyclopedia` | `/map` |
| `/learn` | `/paths` |
| `/roadmap` | `/paths` |
| `/case-studies` | `/paths/real-world-hld-lld` |
| `/wiki` | `/map` |
| `/wiki/graph` | `/map` |
| `/wiki/primitives` | `/map/primitives` |
| `/wiki/[concept]` | `/map/concepts/[concept]` |
| `/topics` | `/map/topics` |
| `/topics/[slug]` | `/map/topics/[slug]` |
| `/practice` | `/quiz?mode=spaced` |
| `/signin`, `/signup` | `/` |
| `/learn/[moduleId]/[lessonSlug]` | Canonical lesson from `src/learning/legacyRoutes.ts`; if no canonical mapping exists, render a legacy reader with a visible “moved” link rather than 404. |
| `/labs`, `/labs/[id]`, `/canvas` | Unchanged. |

Keep `src/lib/lessonRoutes.ts` and all 234 legacy slugs intact. Tests and glossary links depend on them. Add a separate canonical route registry rather than mutating the old one.

---

## 4. TypeScript schemas

Create `src/learning/types.ts`. These interfaces are serializable so Server Components can pass one lesson/blog to a Client Component without functions or browser objects. Runtime Zod validators should live in `src/learning/schema.ts` and `src/learning/storage/learnerSchema.ts`.

```ts
export type TrackSlug =
  | "system-design-foundations"
  | "distributed-systems-storage"
  | "real-world-hld-lld"
  | "ai-engineering-agents"
  | "llm-inference-training"
  | "ml-math-paper-decoder"
  | "backend-cloud-security";

export type ContentKind =
  | "track"
  | "lesson"
  | "blog"
  | "topic"
  | "concept"
  | "lab"
  | "tool";

export type LearningMode = "story" | "engineer" | "side-by-side";
export type VisualNavigation = "scroll" | "click";
export type Difficulty = "foundations" | "intermediate" | "advanced" | "staff";
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface ContentRef {
  kind: ContentKind;
  slug: string;
  trackSlug?: TrackSlug;
  href: string;
  title: string;
}

export interface SourceRef {
  label: string;
  url: string;
  note: string;
}

export interface Tradeoff {
  dimension: string;
  optionA: string;
  optionB: string;
  recommendation: string;
}

export interface VisualControlRange {
  id: string;
  kind: "range";
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
}

export interface VisualControlToggle {
  id: string;
  kind: "toggle";
  label: string;
  defaultValue: boolean;
}

export interface VisualControlChoice {
  id: string;
  kind: "choice";
  label: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
}

export type VisualControl =
  | VisualControlRange
  | VisualControlToggle
  | VisualControlChoice;

export interface VisualMetric {
  id: string;
  label: string;
  value: number | string;
  format: "number" | "percent" | "ms" | "rps" | "currency" | "tokens" | "text";
  tone?: "healthy" | "warning" | "danger" | "focus";
}

export interface VisualAnnotation {
  id: string;
  targetNodeId?: string;
  text: string;
  tone?: "healthy" | "warning" | "danger" | "focus";
}

export interface VisualEvaluator {
  id: string;
  config: Record<string, JsonValue>;
}

export interface VisualStage {
  id: string;
  visualId:
    | "request-flow"
    | "queueing"
    | "cache"
    | "load-balancing"
    | "partitioning"
    | "replication"
    | "consensus"
    | "storage-engine"
    | "stream-processing"
    | "agent-harness"
    | "kv-cache"
    | "paper-formula"
    | "topic-simulator"
    | "internal-simulator";
  title: string;
  caption: string;
  altText: string;
  initialState: Record<string, JsonValue>;
  controls: VisualControl[];
  metrics: VisualMetric[];
  annotations: VisualAnnotation[];
  evaluator?: VisualEvaluator;
  reducedMotion: "static-final-state" | "manual-only" | "disable-particles";
}

export interface StoryBlock {
  id: string;
  title: string;
  analogy: string;
  narrativeMarkdown: string;
  scene: string;
  takeaway: string;
  estimatedSeconds: number;
  visualStageId?: string;
}

export interface EngineerBlock {
  id: string;
  title: string;
  problem: string;
  mechanismMarkdown: string;
  tradeoffs: Tradeoff[];
  invariants: string[];
  failureModes: string[];
  metrics: string[];
  sources: SourceRef[];
}

export type StrideCategory =
  | "Spoofing"
  | "Tampering"
  | "Repudiation"
  | "InformationDisclosure"
  | "DenialOfService"
  | "ElevationOfPrivilege";

export interface SecurityPractice {
  id: string;
  title: string;
  stride: StrideCategory[];
  plainEnglish: string;
  threats: string[];
  controls: string[];
  detectionSignals: string[];
  hardeningChecklist: string[];
  canvasPrimitiveIds: string[];
  defensiveOnly: true;
  sources: SourceRef[];
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
  difficulty: Difficulty;
  conceptTags: string[];
  sourceContentId: string;
  fsrsCardId: string;
}

export interface LessonStep {
  id: string;
  order: number;
  title: string;
  kicker: string;
  storyBlockId: string;
  engineerBlockId: string;
  visualStageId: string;
  checkpointQuestionIds: string[];
  securityPracticeId?: string;
  estimatedMinutes: number;
}

export interface LegacyLessonSource {
  moduleId: string;
  lessonIndex: number;
  href: string;
}

export interface Lesson {
  id: string;
  trackSlug: TrackSlug;
  slug: string;
  title: string;
  summary: string;
  order: number;
  difficulty: Difficulty;
  estimatedMinutes: number;
  prerequisites: string[];
  learningObjectives: string[];
  storyBlocks: StoryBlock[];
  engineerBlocks: EngineerBlock[];
  steps: LessonStep[];
  visualStages: VisualStage[];
  visualNavigation: VisualNavigation;
  securityPracticeIds: string[];
  quizBank: QuizQuestion[];
  relatedLessonSlugs: string[];
  relatedLabIds: string[];
  tags: string[];
  sources: SourceRef[];
  legacySource?: LegacyLessonSource;
  publicationStatus: "published";
}

export interface Track {
  id: TrackSlug;
  slug: TrackSlug;
  order: number;
  title: string;
  shortTitle: string;
  description: string;
  outcome: string;
  difficulty: Difficulty;
  estimatedHours: number;
  accent: "brass" | "emerald" | "amber" | "rose" | "indigo" | "cyan";
  prerequisiteTrackSlugs: TrackSlug[];
  learningOutcomes: string[];
  lessonSlugs: string[];
  blogSlugs: string[];
  labIds: string[];
  sourceModuleIds: string[];
  publicationStatus: "published";
}

export interface BlogStep {
  id: string;
  order: number;
  title: string;
  bodyMarkdown: string;
  storyBlockIds: string[];
  engineerBlockIds: string[];
  visualStageIds: string[];
  securityPracticeIds: string[];
  checkpointQuestionIds: string[];
  estimatedMinutes: number;
}

export interface Blog {
  id: string;
  slug: string;
  title: string;
  dek: string;
  trackSlugs: TrackSlug[];
  publishedAt: string;
  updatedAt: string;
  readMinutes: number;
  tags: string[];
  storyBlocks: StoryBlock[];
  engineerBlocks: EngineerBlock[];
  steps: BlogStep[];
  visualStages: VisualStage[];
  visualNavigation: VisualNavigation;
  securityPracticeIds: string[];
  quizQuestionIds: string[];
  relatedLessonSlugs: string[];
  relatedLabIds: string[];
  sources: SourceRef[];
  legacySource?: LegacyLessonSource;
  publicationStatus: "published";
}

export interface LabChallengeStage {
  id: string;
  kind: "brief" | "boe" | "topology" | "api" | "data_model" | "chaos" | "review";
  title: string;
  promptMarkdown: string;
  hints: string[];
  gradingRules: import("@/types/challenges").GradingRule[];
}

export interface LabChallenge {
  id: string;
  sourceGuidedLabId: string;
  title: string;
  trackSlugs: TrackSlug[];
  difficulty: "starter" | "standard" | "advanced" | "staff_plus";
  estimatedMinutes: number;
  summary: string;
  objectives: string[];
  targetRps: number;
  sloP99Ms: number;
  budgetUsdPerHour: number;
  stages: LabChallengeStage[];
  securityPracticeIds: string[];
  successCriteria: string[];
  publicationStatus: "published";
}

export interface LessonCompletion {
  completedAt: string;
  lastStepIndex: number;
  quizAccuracy: number | null;
}

export interface ReadRecord {
  firstReadAt: string;
  lastReadAt: string;
  progress: number;
  completed: boolean;
}

export interface TopicVisit {
  firstVisitedAt: string;
  lastVisitedAt: string;
  activeSeconds: number;
  progress: number;
}

export interface MasteryRecord {
  level: "untouched" | "learning" | "review" | "mastered";
  fsrsCardIds: string[];
  quizAttempts: number;
  correctAttempts: number;
  labBestScore: number | null;
  updatedAt: string;
}

export interface QuizAttempt {
  id: string;
  questionId: string;
  contentId: string;
  selectedOptionId: string;
  correct: boolean;
  fsrsRating?: 1 | 2 | 3 | 4;
  reviewedAt: string;
}

export interface LearnerNote {
  id: string;
  contentRef: ContentRef;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  contentRef: ContentRef;
  createdAt: string;
  label: string;
}

export interface LearnerPrefs {
  theme: "dark" | "light" | "system";
  defaultMode: LearningMode;
  ambientBackground: boolean;
  customCursor: boolean;
  reducedMotion: boolean;
  visualNavigation: VisualNavigation;
  sound: boolean;
  reviewDailyCap: number;
  catchUpMode: boolean;
}

export interface BreakSettings {
  enabled: boolean;
  intervalMinutes: number;
  idleTimeoutSeconds: number;
  pauseWhenHidden: boolean;
  snoozeMinutes: number;
  lastBreakAt: string | null;
}

export interface ResumePointer {
  contentRef: ContentRef;
  scrollProgress: number;
  stepIndex: number;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  contentRef: ContentRef;
  startedAt: string;
  endedAt: string | null;
  activeSeconds: number;
}

export interface Scratchpad {
  body: string;
  updatedAt: string;
}

export interface OnboardingState {
  completedStepIds: string[];
  bannerHidden: boolean;
}

export interface LearnerState {
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
  onboarding: OnboardingState;
  completedLessons: Record<string, LessonCompletion>;
  readBlogs: Record<string, ReadRecord>;
  visitedTopics: Record<string, TopicVisit>;
  mastery: Record<string, MasteryRecord>;
  quizHistory: QuizAttempt[];
  notes: Record<string, LearnerNote[]>;
  bookmarks: Bookmark[];
  prefs: LearnerPrefs;
  breakSettings: BreakSettings;
  resume: ResumePointer | null;
  studySessions: StudySession[];
  scratchpad: Scratchpad;
}
```

**Schema rules to enforce in tests:**

- Every public lesson has `publicationStatus: "published"`; no “coming soon” state is exposed.
- Every lesson has at least one story block, one engineer block, three steps, three visual stages, one security practice, and three quiz questions.
- Every quiz question has at least two options and exactly one `correctOptionId`.
- Every referenced track, lesson, lab, visual, security practice, and question ID resolves.
- Every blog has at least three steps, one visual stage, one security takeaway, and read tracking metadata.
- No serialized content contains functions, class instances, `Date` objects, DOM nodes, or browser globals.

---

## 5. File layout for new modules

Prefer additive modules. Do not move the canvas engine into `src/learning`.

### 5.1 Learning schemas, catalog, and content

| New file | Responsibility / imports |
|---|---|
| `src/learning/types.ts` | Interfaces from section 4. |
| `src/learning/schema.ts` | Zod validators for track/lesson/blog/lab content. |
| `src/learning/catalog.ts` | Lightweight track metadata, lesson/blog/lab summaries, slugs, and derived counts. No full lesson bodies. |
| `src/learning/routes.ts` | Canonical href builders and slug lookup. |
| `src/learning/legacyRoutes.ts` | Maps 234 old `moduleId::lessonIndex` records to canonical lessons or legacy fallback hrefs. |
| `src/learning/adapters/legacyLesson.ts` | Imports `getLessonBlog` and `evaluateLessonSandbox`; converts existing content into the new schema. |
| `src/learning/adapters/legacyConcept.ts` | Imports encyclopedia modules, flashcards, quizzes, and key numbers. |
| `src/learning/adapters/legacyTopic.ts` | Imports `TOPICS`, `topicExperiments`, and topic slugs. |
| `src/learning/adapters/legacyLab.ts` | Imports `GUIDED_LABS`; preserves existing stage and grading objects. |
| `src/learning/content/systemDesignFoundations.ts` | Full track 1 lessons. |
| `src/learning/content/distributedSystemsStorage.ts` | Full track 2 lessons. |
| `src/learning/content/realWorldHldLld.ts` | Full track 3 lessons. |
| `src/learning/content/aiEngineeringAgents.ts` | Full track 4 lessons. |
| `src/learning/content/llmInferenceTraining.ts` | Full track 5 lessons. |
| `src/learning/content/mlMathPaperDecoder.ts` | Full track 6 lessons. |
| `src/learning/content/backendCloudSecurity.ts` | Full track 7 lessons. |
| `src/learning/content/index.ts` | Explicit static imports of the seven content modules; server-side lookup functions. |
| `src/learning/content/blogs.ts` | Ten full blog records. |
| `src/learning/content/labChallenges.ts` | Challenge metadata for the 16 existing guided labs. |
| `src/learning/content/securityPractices.ts` | New defensive security practices; adapts `src/data/securityPractices.ts`. |
| `src/learning/content/quizBank.ts` | Supplemental questions for adapted legacy lessons. |
| `src/learning/visuals/registry.ts` | Maps `visualId` to client visual components/evaluator IDs. |
| `src/learning/tools/registry.ts` | Five tool definitions and static slugs. |
| `src/learning/tools/capacityMath.ts` | Thin wrappers around `computeBoE`, `requiredReplicas`, and `littlesLawConcurrent`. |
| `src/learning/tools/kvCacheMath.ts` | Transparent KV-cache formula; cross-checks `llmPhysics`. |
| `src/learning/tools/slaMath.ts` | Serial/parallel availability and error-budget helpers; extracts the useful pure logic from `EnterpriseHubContent`. |
| `src/learning/quiz/buildReviewIndex.ts` | Converts new and legacy questions/flashcards into FSRS review items. |
| `src/learning/quiz/eligibleQuestions.ts` | Pure read-topic eligibility and deterministic shuffle helper. |

### 5.2 Shell and motion

| New file | Responsibility |
|---|---|
| `src/components/shell/AppShell.tsx` | Wraps primary nav/footer, dock, palette, break reminder, and ambient layer. |
| `src/components/shell/ProductivityDock.tsx` | Search, scratchpad, bookmarks, mode, quiz, preferences, timer. |
| `src/components/shell/CommandPalette.tsx` | `cmdk` UI over lightweight catalog. |
| `src/components/shell/CommandPaletteLoader.tsx` | Client-side dynamic import of the palette. |
| `src/components/shell/Scratchpad.tsx` | Debounced local scratchpad. |
| `src/components/shell/BookmarksPanel.tsx` | Bookmark current page and list saved items. |
| `src/components/shell/ModeToggle.tsx` | Story/Engineer/Side-by-Side preference. |
| `src/components/shell/PreferencesPanel.tsx` | Theme, ambient, cursor, motion, navigation, sound. |
| `src/components/shell/StudyTimer.tsx` | Deadline-based active study timer. |
| `src/components/shell/BreakReminder.tsx` | Non-blocking 25-minute reminder with hidden/idle pause. |
| `src/components/shell/ResumePill.tsx` | Hydrates from learner state; links to last lesson/blog/step. |
| `src/components/shell/ThemeController.tsx` | Applies `data-theme`; no module-scope browser access. |
| `src/components/shell/ClientOnlyBootLoader.tsx` | Client loader for `BootRunner`; keeps Dexie facade out of server graph. |
| `src/components/motion/CustomCursor.tsx` | Desktop fine-pointer decorative cursor; rAF transforms; toggle and reduced-motion aware. |
| `src/components/motion/AmbientBackground.tsx` | Low-opacity GPU-friendly lesson/blog background. |
| `src/components/motion/useMotionPreference.ts` | Combines saved preference and `prefers-reduced-motion`. |

### 5.3 Learning readers and visualizers

| New file | Responsibility |
|---|---|
| `src/components/learning/LearningIndexContent.tsx` | `/paths` track cards. |
| `src/components/learning/TrackPageContent.tsx` | Track overview, prerequisites, lesson list, labs/blogs. |
| `src/components/learning/LessonPlayer.tsx` | Dual-mode lesson player and progress tracking. |
| `src/components/learning/LessonModeToggle.tsx` | Story / Engineer / Side-by-Side. |
| `src/components/learning/StoryMode.tsx` | Calm story blocks and narrative visuals. |
| `src/components/learning/EngineerMode.tsx` | Mechanisms, tradeoffs, failure modes, sources. |
| `src/components/learning/SideBySide.tsx` | Synchronized story/engineer columns. |
| `src/components/learning/StepNavigator.tsx` | Click-step controls and progress dots. |
| `src/components/learning/ScrollStory.tsx` | IntersectionObserver-driven scroll mode. |
| `src/components/learning/SecurityPanel.tsx` | Defensive hardening panel. |
| `src/components/learning/LessonQuiz.tsx` | Checkpoint questions and FSRS handoff. |
| `src/components/learning/BlogReader.tsx` | Blog story toggle, scrollytelling, read tracking. |
| `src/components/learning/BlogStep.tsx` | One blog step. |
| `src/components/learning/ReadingProgress.tsx` | rAF-throttled scroll progress and resume updates. |
| `src/components/visuals/VisualStageRenderer.tsx` | Renders a serializable `VisualStage`. |
| `src/components/visuals/VisualStageLoader.tsx` | Explicit module-scope `next/dynamic` declarations for heavy visualizers. |
| `src/components/visuals/RequestFlowVisual.tsx` | Adapts existing `LessonBlogViewer` flow behavior. |
| `src/components/visuals/QueueVisual.tsx` | Uses `queuingMath` and live snapshots. |
| `src/components/visuals/CacheVisual.tsx` | Wraps topic cache simulator. |
| `src/components/visuals/PartitionVisual.tsx` | Wraps hash-ring/sharding simulators. |
| `src/components/visuals/ReplicationVisual.tsx` | Quorum/replication stage. |
| `src/components/visuals/ConsensusVisual.tsx` | Wraps `InternalSimModal` Raft mode. |
| `src/components/visuals/StorageVisual.tsx` | Wraps B-tree/LSM mode. |
| `src/components/visuals/AgentHarnessVisual.tsx` | Plan/tool/observe/approval loop with budgets. |
| `src/components/visuals/KvCacheVisual.tsx` | Memory occupancy and batching stage. |
| `src/components/visuals/PaperFormulaVisual.tsx` | Formula, symbol decoder, and intuition panel. |

### 5.4 Map, tools, quiz, labs, and landing

| New file | Responsibility |
|---|---|
| `src/components/map/KnowledgeMap.tsx` | Unified map; adapts `KnowledgeGraph`. |
| `src/components/map/MapFilters.tsx` | Track/type/difficulty/mastery filters. |
| `src/components/map/TopicMapIndex.tsx` | Wraps `TopicsIndexContent`. |
| `src/components/map/TopicMapReader.tsx` | Wraps `TopicPageContent`. |
| `src/components/map/ConceptMapReader.tsx` | Wraps `ConceptReader`. |
| `src/components/map/PrimitivesMap.tsx` | Wraps `PrimitivesBrowser`. |
| `src/components/tools/ToolsPageContent.tsx` | Five-tool index. |
| `src/components/tools/CapacityEstimator.tsx` | Reuses `computeBoE` and queuing helpers. |
| `src/components/tools/KvCacheCalculator.tsx` | Uses `kvCacheMath` and `llmPhysics`. |
| `src/components/tools/SlaCalculator.tsx` | Uses `slaMath` and existing availability logic. |
| `src/components/tools/NotationDecoder.tsx` | Uses `GLOSSARY` and reference numbers. |
| `src/components/tools/SecurityChecklist.tsx` | Uses `SECURITY_PRACTICES` and `evaluateSecurityPractice`. |
| `src/components/quiz/QuizPageContent.tsx` | Read-topic eligibility and session setup. |
| `src/components/quiz/QuizRunner.tsx` | Multiple choice/free recall; writes quiz history and FSRS. |
| `src/components/quiz/ReadTopicFilter.tsx` | Shows eligible topics and links to unread material. |
| `src/components/labs/ChallengeCatalog.tsx` | Track/security metadata over `GUIDED_LABS`. |
| `src/components/landing/HeroMiniCanvas.tsx` | Client-only live four-node simulation. |
| `src/components/landing/HeroCanvasLoader.tsx` | `dynamic(() => import("./HeroMiniCanvas"), { ssr: false })`. |
| `src/components/landing/TrackShowcase.tsx` | Seven-track cards from `catalog.ts`. |
| `src/components/landing/LabPreviewCatalog.tsx` | Lightweight lab summaries; no full `guidedLabs.ts` import. |

### 5.5 New routes

Create:

- `src/app/paths/page.tsx`
- `src/app/paths/[trackSlug]/page.tsx`
- `src/app/paths/[trackSlug]/[lessonSlug]/page.tsx`
- `src/app/blogs/page.tsx`
- `src/app/blogs/[slug]/page.tsx`
- `src/app/map/page.tsx`
- `src/app/map/topics/page.tsx`
- `src/app/map/topics/[slug]/page.tsx`
- `src/app/map/concepts/[concept]/page.tsx`
- `src/app/map/primitives/page.tsx`
- `src/app/tools/page.tsx`
- `src/app/tools/[toolSlug]/page.tsx`
- `src/app/quiz/page.tsx`

Edit existing route files for redirects and wrappers; do not delete dynamic legacy routes.

---

## 6. Content module strategy

### 6.1 Keep the landing catalog lightweight

`src/learning/catalog.ts` contains only:

- seven track records;
- 72 lesson summaries and slugs;
- ten blog summaries;
- 16 lightweight lab summaries;
- derived counts.

It must not import `lessonBlogs.ts`, `guidedLabs.ts`, `encyclopediaData.ts`, `seedResources.ts`, or `contentManifest.ts`.

Update these landing/footer files to use the catalog instead of heavy registries:

- `src/components/landing/Hero.tsx`
- `src/components/landing/Features.tsx`
- `src/components/landing/PathPreview.tsx` → replace with `TrackShowcase`
- `src/components/landing/LabsPreview.tsx`
- `src/components/landing/CTASection.tsx`
- `src/components/nav/SiteFooter.tsx`

`src/data/contentManifest.ts` remains for legacy pages and existing tests. Do not force the new landing through it.

### 6.2 Exact static-export-compatible loading pattern

1. `catalog.ts` supplies every dynamic route param to `generateStaticParams()`.
2. Full content lives in the seven explicit `src/learning/content/*.ts` files.
3. `src/learning/content/index.ts` uses **literal static imports** and a lookup function. It is imported only by Server Component route files.
4. A lesson route resolves one lesson and passes that serializable object to `LessonPlayer`. Do not pass the whole track.
5. No Client Component imports `content/index.ts` or a full content module. Client components import `types.ts` with `import type`.
6. Heavy visual components are loaded in `VisualStageLoader.tsx` using explicit module-scope `next/dynamic(...)` calls. Use `ssr: false` only for visualizers that transitively load React Flow, Rough.js, Dexie, WebRTC, or audio.
7. Avoid `import(\`./content/${trackSlug}\`)`. Next’s lazy-loading guide requires explicit import paths for bundler matching.

This gives static HTML for every lesson/blog, route-level code splitting, and a small landing bundle. It does not rely on server-only dynamic imports or runtime server data.

### 6.3 Adapters prevent content duplication

- `legacyLesson.ts` maps:
  - `rookieAnalogy` → `StoryBlock`;
  - three `steps` → `LessonStep` + `EngineerBlock`;
  - `diagramFlow` → `VisualStage`;
  - `sandbox` → `VisualStage.evaluator` with a registry ID for `evaluateLessonSandbox`;
  - existing quiz → first `QuizQuestion`;
  - encyclopedia quiz/flashcards and new quiz bank → supplemental questions.
- `legacyConcept.ts` supplies deep-dive links and recall items.
- `legacyLab.ts` keeps all existing stages and grading rules intact.
- New AI training and ML math lessons are authored in the new content modules; do not pretend the existing 13 AI-system lessons cover the entire target curriculum.

---

## 7. Simulation reuse plan

### 7.1 Hero mini-canvas

Use the existing engine, but **not** React Flow for the four-node hero. A small SVG/CSS stage is faster, avoids a second canvas store, and prevents the hero from overwriting the learner’s main topology.

Create `src/components/landing/HeroMiniCanvas.tsx` with a fixed `GraphTopology`:

- `client` → `dns_load_balancer` → `api_gateway` → `postgres_db`.
- The conceptual `client` node may use a synthetic resource ID with explicit zero/low base latency; `simulationCore` already has a safe fallback for unknown resource IDs.
- Keep the topology in a `useRef`; never in React state on every tick.
- In `useEffect`, call `useSimStore.getState().startSimulation(() => topologyRef.current)`.
- Read `simSnapshotRef.current` in a `requestAnimationFrame` loop and update SVG attributes/CSS variables directly.
- If metric badges need React state, throttle them to 2–4 Hz. Do not render at 20 Hz.
- Stop the simulation on unmount and pause when the hero is offscreen or the tab is hidden.

Controls:

- **Spike Traffic:** update the client node’s `clientRps` in the ref, then call `syncTopology()`.
- **Kill Node:** apply `dependency_down` to the API node through `setChaos`; clear chaos to restore.
- **Simulate Attack:** apply an abstract `traffic_surge` plus `packet_loss`/error pressure to the ingress. This is a defensive load/failure demonstration only; show “rate limiting / admission control” mitigation copy, not attack instructions.
- **Resume Pill:** read `LearnerState.resume` after hydration and link to the stored href/step. No localStorage read at module scope.
- Respect reduced motion and ambient preferences. Provide a static four-node fallback when the simulation is paused or unavailable.

`HeroCanvasLoader.tsx` owns `dynamic(..., { ssr: false })`; `src/app/page.tsx` remains a static Server Component.

### 7.2 Labs

Keep the existing lab architecture exactly:

- `GUIDED_LABS` → `LabBrief` → `LabWorkspaceLoader` → `LabWorkspace` → `SysCraftCanvas`.
- `setCanvasScope("lab:<id>")` continues to isolate each lab autosave.
- `gradeRules` continues to read `useCanvasStore` structure and `simSnapshotRef` telemetry.
- `useSimStore` continues to own the worker/fallback loop.
- `LabChallenge` records add track tags, objectives, and security focus only; they reference `sourceGuidedLabId` rather than duplicating stages.

Do not add a second `startSimulation` call in a challenge wrapper. `SysCraftCanvas` already owns simulation startup.

### 7.3 Visualizer library

- Queue, cache, partition, replication, consensus, storage, and KV visuals use pure engine helpers or existing topic/micro-sim components.
- `TopicSimulator` stays a client component and is dynamically loaded when a topic visual is active.
- `InternalSimModal` stays client-only; extract/reuse its individual modes over time rather than copying the math.
- Any visual that imports `ResourceNode`, `SysCraftCanvas`, `roughjs`, or `@xyflow/react` must be behind a client-only dynamic loader.

### 7.4 Performance invariants to test

- Simulation ticks never call `useCanvasStore.setState` for nodes/edges.
- `ResourceNode` subscribes only to its own telemetry row.
- Rough.js dependencies remain geometry/stroke/fill/sketchy only.
- `TrafficParticleLayer` continues reading the mutable ref.
- Worker failure still falls back to a 50 ms main-thread interval.
- Only one simulation owner is active per route.

---

## 8. UI system tokens

Keep Tailwind and the existing CSS-variable architecture. Add semantic tokens instead of relying on remapped `zinc`/`sky`/`violet` utility colors in new components.

### 8.1 Color tokens

| Token | Dark | Light | Use |
|---|---|---|---|
| `--ink` | `9 11 14` | `247 248 250` | Page background. |
| `--surface` | `15 18 23` | `255 255 255` | Default surface. |
| `--surface-raised` | `22 27 34` | `248 250 252` | Cards, rails. |
| `--surface-overlay` | `30 37 46` | `241 245 249` | Popovers, dock. |
| `--line` | `39 47 58` | `226 232 240` | Default border. |
| `--line-strong` | `63 74 88` | `203 213 225` | Hover/emphasis border. |
| `--content` | `241 245 249` | `15 23 42` | Primary text. |
| `--content-secondary` | `203 213 225` | `51 65 85` | Body/secondary text. |
| `--content-tertiary` | `148 163 184` | `100 116 139` | Metadata. |
| `--accent` | `205 168 106` | `146 104 48` | Brand brass. |
| `--accent-bright` | `219 187 134` | `166 118 58` | Brand emphasis. |
| `--success` | `16 185 129` | `5 150 105` | Healthy. |
| `--warning` | `245 158 11` | `180 83 9` | Warning. |
| `--danger` | `244 63 94` | `225 29 72` | Danger/error. |
| `--focus` | `99 102 241` | `79 70 229` | Indigo focus/selection. |
| `--info` | `34 211 238` | `8 145 178` | Cyan information/flow. |

Add `html[data-theme="light"]` overrides and `color-scheme: dark/light`. Keep `--accent` theme overrides from `useCanvasPrefsStore`, but make dark/light independent of accent.

New Tailwind aliases:

- `bg-ink`, `bg-app`, `bg-app-raised`, `bg-app-overlay`
- `border-line`, `border-line-strong`
- `text-content`, `text-content-secondary`, `text-content-tertiary`
- `text-success`, `text-warning`, `text-danger`, `text-focus`, `text-info`

### 8.2 Typography

- Keep Outfit and `--font-outfit` from `layout.tsx`; do not add another network font dependency.
- UI/headings: Outfit, 600–700 weight, tight tracking.
- Story/reading mode: system serif stack (`Iowan Old Style`, `Palatino Linotype`, Georgia, serif) for narrative paragraphs; Engineer mode remains Outfit/system sans.
- Body reading: 17–18 px, line-height 1.75, measure 68–72ch.
- Code/math: existing system mono stack; 13–14 px; horizontal scroll only inside code blocks.
- Scale: 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72 px.
- Avoid six-line wrapped hero headings; use `text-balance` and a measured max width.

### 8.3 Spacing, shape, elevation, motion

- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96 px.
- Radius: controls 10 px, cards 14 px, panels 20 px, pills 999 px.
- Borders: 1 px semantic line; no heavy glow as the default.
- Shadows: one subtle raised shadow and one overlay shadow. Avoid nested card shadows.
- Motion: 160–240 ms for UI, 400–600 ms for section reveals. Use transform/opacity only.
- Ambient backgrounds: 4–10% opacity, static or very slow transform, `translateZ(0)`, paused when hidden/offscreen.
- Reduced motion: no autoplay, no parallax, no cursor follower, no animated particles; click-step remains available.

---

## 9. Phased implementation order

Every phase ends with `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build`. Do not proceed with TypeScript errors. Builds mutate `out/`; they were intentionally not run during this read-only audit.

### Phase 2 — shell, cursor, ambient, local store, command palette, break reminder

**Create**

- `src/learning/types.ts`
- `src/learning/storage/keys.ts`
- `src/learning/storage/learnerSchema.ts`
- `src/learning/storage/migrate.ts`
- `src/store/useLearnerStore.ts`
- `src/components/shell/AppShell.tsx`
- `src/components/shell/ProductivityDock.tsx`
- `src/components/shell/CommandPalette.tsx`
- `src/components/shell/CommandPaletteLoader.tsx`
- `src/components/shell/Scratchpad.tsx`
- `src/components/shell/BookmarksPanel.tsx`
- `src/components/shell/ModeToggle.tsx`
- `src/components/shell/PreferencesPanel.tsx`
- `src/components/shell/StudyTimer.tsx`
- `src/components/shell/BreakReminder.tsx`
- `src/components/shell/ResumePill.tsx`
- `src/components/shell/ThemeController.tsx`
- `src/components/shell/ClientOnlyBootLoader.tsx`
- `src/components/motion/CustomCursor.tsx`
- `src/components/motion/AmbientBackground.tsx`
- `src/components/motion/useMotionPreference.ts`
- `src/store/dbBrowser.ts`

**Edit**

- `src/store/db.ts`: turn it into a browser-safe facade; move the Dexie class/instance to `dbBrowser.ts` and dynamically import it only inside async browser operations.
- `src/app/layout.tsx`: keep React Flow CSS; use `ClientOnlyBootLoader`; mount theme controller; remove Analytics in Phase 6 or immediately if privacy copy remains unchanged.
- `src/components/nav/SiteChrome.tsx`: adopt `AppShell`.
- `src/components/nav/SiteHeader.tsx`, `SiteFooter.tsx`: new IA and no auth/pricing CTAs.
- `src/components/path/PathPageContent.tsx`, `src/components/learn/LessonPageContent.tsx`, `src/components/learn/RoadmapPageContent.tsx`: stop writing the old completion key directly; use `useLearnerStore`.
- `src/components/settings/SettingsPanel.tsx`: new preferences and learner export/import.
- `src/components/privacy/PrivacyPageContent.tsx`: exact new storage inventory.
- `src/app/globals.css`, `tailwind.config.ts`: semantic dark/light tokens.
- `src/components/shell/BootRunner.tsx`: run legacy rebrand migration first, then learner migration.

**Acceptance**

- No browser API is read at module scope.
- Importing `src/store/db.ts` in Node does not construct Dexie.
- Cmd/Ctrl+K opens a keyboard-accessible palette; Escape closes it.
- Scratchpad/bookmarks/prefs survive reload.
- Break reminder defaults to 25 minutes, pauses when hidden or idle, and never traps focus.
- Custom cursor is absent on touch/reduced-motion/toggle-off.
- Export/import includes learner state, canvas autosaves, and existing Dexie data.
- `tsc`, lint, Vitest, and static build pass.

### Phase 3 — scrollytelling player and visualizer library

**Create**

- `src/learning/schema.ts`
- `src/learning/visuals/registry.ts`
- All files under `src/components/learning/` listed in section 5.3.
- All files under `src/components/visuals/` listed in section 5.3.
- `src/learning/adapters/legacyLesson.ts`
- `src/learning/adapters/legacyConcept.ts`
- `src/learning/adapters/legacyTopic.ts`

**Edit**

- `src/components/path/LessonBlogViewer.tsx`: preserve behavior, but move the runtime `useCanvasStore` import into the click handler/dynamic import so lesson prerender does not pull in React Flow.
- `src/components/wiki/ConceptReader.tsx`: expose reusable concept sections for the map reader.
- `src/components/topics/TopicSimulator.tsx`: export/wrap existing simulator for `VisualStageRenderer`.
- `src/components/canvas/InternalSimModal.tsx`: expose reusable modes without duplicating math.

**Acceptance**

- One adapted legacy lesson renders in Story, Engineer, and Side-by-Side modes.
- Scroll and click-step navigation both work with keyboard controls.
- Visual stages are serializable and lazy-loaded by explicit paths.
- No lesson page imports React Flow/Rough.js in its initial server graph.
- Reduced motion produces a usable static/manual experience.
- Reading progress updates at most once per animation frame.
- `tsc`, lint, Vitest, and static build pass.

### Phase 4 — seven tracks and blog content

**Create**

- `src/learning/catalog.ts`
- `src/learning/routes.ts`
- `src/learning/legacyRoutes.ts`
- All seven `src/learning/content/*.ts` track modules.
- `src/learning/content/index.ts`
- `src/learning/content/blogs.ts`
- `src/learning/content/securityPractices.ts`
- `src/learning/content/quizBank.ts`
- `src/learning/content/labChallenges.ts`
- `src/learning/adapters/legacyLab.ts`
- `src/app/paths/page.tsx`
- `src/app/paths/[trackSlug]/page.tsx`
- `src/app/paths/[trackSlug]/[lessonSlug]/page.tsx`
- `src/app/blogs/page.tsx`
- `src/app/blogs/[slug]/page.tsx`
- `src/components/learning/LearningIndexContent.tsx`
- `src/components/learning/TrackPageContent.tsx`
- `src/components/learning/BlogReader.tsx`
- `src/components/learning/BlogStep.tsx`

**Edit**

- Legacy `/learn`, `/roadmap`, `/case-studies`, `/path` pages for canonical redirects/aliases.
- `src/data/contentManifest.ts` only if a lightweight legacy count helper is needed; do not make the new catalog depend on it.
- Complete the six encyclopedia recall gaps in `encyclopediaCurriculum.ts`.

**Acceptance**

- Exactly seven published tracks and 72 published lessons from section 11.
- Every lesson meets the story/engineer/visual/security/quiz schema rules.
- Ten published blogs; every blog has scrollytelling, security takeaways, and read tracking.
- No “coming soon”, draft, TODO, placeholder, or empty public content arrays.
- All slugs unique; all references resolve; all static params emitted.
- Existing 234 lesson routes still resolve.
- `tsc`, lint, Vitest, and static build pass.

### Phase 5 — hero canvas, labs, map, tools, quiz

**Create**

- `src/components/landing/HeroMiniCanvas.tsx`
- `src/components/landing/HeroCanvasLoader.tsx`
- `src/components/landing/TrackShowcase.tsx`
- `src/components/landing/LabPreviewCatalog.tsx`
- `src/components/labs/ChallengeCatalog.tsx`
- `src/components/map/*.tsx`
- `src/components/tools/*.tsx`
- `src/learning/tools/*.ts`
- `src/components/quiz/*.tsx`
- `src/learning/quiz/*.ts`
- `src/app/map/page.tsx`
- `src/app/map/topics/page.tsx`
- `src/app/map/topics/[slug]/page.tsx`
- `src/app/map/concepts/[concept]/page.tsx`
- `src/app/map/primitives/page.tsx`
- `src/app/tools/page.tsx`
- `src/app/tools/[toolSlug]/page.tsx`
- `src/app/quiz/page.tsx`

**Edit**

- `src/app/page.tsx`: static shell + `HeroCanvasLoader` + `TrackShowcase` + `ResumePill`.
- `src/components/landing/Hero.tsx`, `Features.tsx`, `LabsPreview.tsx`, `CTASection.tsx`, `PathPreview.tsx`: lightweight catalog and new visual.
- `src/app/labs/page.tsx`, `src/components/labs/LabsPageContent.tsx`: challenge filters; preserve existing lab routes.
- `src/components/practice/PracticeRunner.tsx`: accept an optional read-topic pool; keep legacy all-cards mode for `/practice`.
- `src/components/progress/ProgressDashboard.tsx`: add new reading/quiz/mastery data.
- Legacy `/topics`, `/wiki`, `/encyclopedia`, `/practice` pages for redirects/wrappers.

**Acceptance**

- Hero starts from the existing worker/fallback path; Spike/Kill/Attack controls change live telemetry; resume pill works after reload.
- Landing initial chunks do not include React Flow, Rough.js, Dexie, WebRTC, or WebLLM.
- All 16 labs still open, autosave independently, run, and grade.
- `/map` includes 72 lessons, 43 concepts, 24 topics, 16 labs, and 10 blogs with filters.
- All five tools produce correct results and have unit tests.
- `/quiz` is empty until the learner has actually read eligible content; randomization never samples unread topics.
- FSRS scheduling still comes from `fsrsScheduler.ts`/`useLearningStore`.
- `tsc`, lint, Vitest, and static build pass.

### Phase 6 — QA, privacy, canonicalization, and cleanup

**Create**

- `src/learning/__tests__/catalog.test.ts`
- `src/learning/__tests__/lessonSchema.test.ts`
- `src/learning/__tests__/blogSchema.test.ts`
- `src/learning/storage/__tests__/migrate.test.ts`
- `src/learning/tools/__tests__/toolsMath.test.ts`
- `src/learning/quiz/__tests__/eligibility.test.ts`
- `src/store/__tests__/telemetrySeparation.test.ts`
- `playwright.config.ts`
- `tests/redesign.spec.ts`

**Edit**

- `src/app/signin/page.tsx`, `src/app/signup/page.tsx`: static redirects to `/`.
- `src/app/pricing/page.tsx`, `src/components/pricing/PricingPageContent.tsx`: free/local-first explanation only.
- Delete `src/lib/supabaseClient.ts` after all imports are gone; remove `@supabase/supabase-js` from `package.json`.
- Remove `@vercel/analytics` import/component and dependency if adopting the no-telemetry contract.
- `src/app/sitemap.ts`, `src/app/sitemap.test.ts`: canonical new URLs, no redirect/auth/utility pages.
- `src/data/contentManifest.ts`: align `SITE_URL` to the confirmed production canonical (`https://sys-craft.vercel.app` per the brief).
- `vercel.json`: add permanent legacy redirects.
- `src/components/privacy/PrivacyPageContent.tsx`: final data/network inventory.
- `src/components/settings/SettingsPanel.tsx`: final export/import/wipe behavior.
- `README.md` or `Architecture.md` only if needed to document the new client-only boundaries; no engine rewrite.

**Acceptance**

- `npx tsc --noEmit` clean.
- `npm run lint` clean.
- `npm test` passes all existing and new tests.
- `npm run build` completes and `out/` contains every canonical static route.
- No auth, payment, account, plan, or gated-feature CTA remains.
- No new backend, server action, request-dependent route handler, or dynamic server import exists.
- Playwright smoke covers landing, Cmd/Ctrl+K, theme/cursor/ambient toggles, resume, lesson modes, blog read tracking, quiz gating, export/import, map filters, tools, and a lab.
- A simulated `Worker`-unavailable run still drives the hero/lab through fallback.
- Keyboard, focus, screen-reader labels, contrast, and reduced-motion checks pass.
- Security copy review confirms defensive education only.

---

## 10. Risks and non-goals

### Risks

- **SSR graph regressions:** adding one runtime import of `useCanvasStore`, `db.ts`, `roughjs`, or `@xyflow/react` to a shared reader can pull unsafe/heavy code into prerender. Keep loaders explicit and test the module graph.
- **Dexie facade mistakes:** every browser operation must await the dynamic `dbBrowser` import and gracefully no-op when IndexedDB is unavailable.
- **Singleton simulation conflicts:** never mount the hero and a full canvas simulation together; always stop on cleanup.
- **Storage quota:** cap quiz history, notes, bookmarks, and study sessions; validate with Zod; preserve in-memory state if writes fail.
- **Migration corruption:** never delete legacy keys during migration; map old lesson IDs through an explicit alias table.
- **FSRS duplication:** Dexie card memory remains authoritative. `LearnerState.mastery` is a derived index, not a second scheduler state.
- **Static redirects:** Next config redirects do not work for this export. Use `vercel.json` plus static `RedirectTo` pages.
- **Content volume:** 72 structured lessons and ten blogs are a real authoring workload. Reuse the 234 existing blogs heavily; do not satisfy the count with stubs.
- **Light-mode regressions:** existing hard-coded `zinc`, `sky`, and `violet` classes may look wrong in light mode. New components use semantic tokens; audit high-traffic legacy components incrementally.
- **Next font build dependency:** Outfit currently uses `next/font/google`, which requires build-time access. Keep it for now; self-hosting is optional later, not a redesign blocker.
- **Security tone drift:** chaos/failure simulation is allowed; cyber exploit instructions are not.

### Non-goals

- No login, account, payment, checkout, subscription, or backend.
- No rewrite of `simulationCore`, `queuingMath`, FSRS, guided-lab grading, or React Flow node architecture.
- No server-side personalization or progress sync.
- No new heavy dependency when existing Zustand, Dexie, Zod, cmdk, Framer Motion, React Flow, and Rough.js are sufficient.
- No “coming soon” tracks, lessons, tools, or labs.
- No exploit procedures, payloads, credential-stealing steps, or attack reproduction instructions.

---

## 11. Content outline

The following is the launch curriculum: **72 lessons across seven tracks**. It is intentionally specific enough for a content agent to write full lessons without inventing the scope. Existing source material should be adapted first.

Source abbreviations: **Path/LB** = `pathData.ts` + `lessonBlogs.ts`; **Wiki** = `encyclopediaData.ts` or `encyclopediaCurriculum.ts`; **Lab** = `guidedLabs.ts`.

### Track 1 — System Design Foundations (`system-design-foundations`)

| Lesson slug — title | One-line story hook | Engineer focus | Security angle | Reuse seed |
|---|---|---|---|---|
| `requirements-first-scope` — Requirements First: Scope the System | A birthday plan fails when nobody wrote down who is coming or what is out of scope. | Functional/non-functional requirements, SLOs, explicit exclusions. | Threat-model assets and abuse cases before drawing boxes. | Path/LB `how-to-approach-design` lesson 1. |
| `estimation-that-changes-design` — Estimation That Changes the Design | A food truck counts bowls, not grains of rice. | QPS, storage, bandwidth, peak factor, stop estimating when the decision is stable. | Size for hostile bursts and resource exhaustion, not only average users. | Path/LB `how-to-approach-design` lesson 2. |
| `one-server-is-an-architecture` — One Server Is an Architecture | A coffee shop with one counter is simple because it has one queue. | Full request path, deployment unit, single points of failure, deliberate simplicity. | Minimize public exposure and patch the whole box. | Path/LB `what-is-system-design`, `simple-system`. |
| `request-lifecycle-dns-to-database` — A Request’s Life: DNS to Database | Follow one order from a name typed into a browser to a committed row. | DNS, TCP/TLS, HTTP, connection pooling, service and DB latency budget. | TLS validation, secure cookies, certificate rotation, DNS change control. | Path/LB `simple-system`; `networking-fundamentals`. |
| `api-contracts-idempotency-pagination` — API Contracts, Idempotency, and Pagination | A retried food order must not arrive twice. | Verbs, status codes, schemas, idempotency keys, cursors, versioning. | Authn/authz per action, mass-assignment rejection, bounded pagination. | Path/LB `how-to-approach-design`, `background-jobs`. |
| `data-modeling-indexes-query-plans` — Data Modeling, Indexes, and Query Plans | A library needs shelves and a catalog, not one giant pile. | Entities, access patterns, B-tree indexes, query plans, migration safety. | Least-privilege data access, field minimization, safe query construction. | Path/LB `simple-system`; Wiki `btree-vs-lsm`. |
| `load-balancing-health-checks` — Load Balancing and Health Checks | A host seats the next guest at the counter with room. | L4/L7, algorithms, health checks, draining, sticky state, failover. | Only healthy, authenticated backends enter rotation; protect admin health endpoints. | Path/LB `one-server-not-enough`; Wiki `load-balancing`. |
| `caching-invalidation-hot-keys` — Caching, Invalidation, and Hot Keys | A remembered answer is fast until the recipe changes. | Cache layers, hit ratio, TTL, invalidation, stampedes, single-flight. | Cache-key isolation, poisoning defenses, private-data cache rules. | Path/LB `caching`; Wiki `caching-strategies`. |
| `queueing-capacity-autoscaling` — Queueing, Capacity, and Autoscaling | A checkout line grows nonlinearly when the cashier reaches full speed. | Little’s Law, Kingman delay, headroom, autoscaling signals, cost. | Admission control and load shedding prevent resource exhaustion. | Path/LB `one-server-not-enough`; `queuingMath.ts`. |
| `rate-limits-backpressure-overload` — Rate Limits, Backpressure, and Overload | A nightclub needs a door policy, not just a bigger dance floor. | Token bucket, distributed counters, fairness, retries, load shedding. | Per-identity quotas, 429 semantics, bot/abuse resistance, retry budgets. | Path/LB `rate-limiting`; Lab `distributed-rate-limiter`. |

### Track 2 — Distributed Systems & Storage Internals (`distributed-systems-storage`)

| Lesson slug — title | One-line story hook | Engineer focus | Security angle | Reuse seed |
|---|---|---|---|---|
| `replication-and-lag` — Replication, Failover, and Lag | Two librarians copy the same catalog while one is still shelving. | Leader/follower, multi-leader, lag, read-your-writes, failover fencing. | Replica trust, encrypted replication, split-brain prevention. | Path/LB `one-database-not-enough`, `replication-depth`. |
| `quorums-cap-pacelc` — Quorums, CAP, and PACELC | A committee needs a majority; a partition can leave two rooms voting. | R+W>N, quorum availability, linearizability vs availability vs latency. | Fencing and partition-safe authorization prevent two writers. | Path/LB `distributed-problems`, `replication-depth`; Wiki `cap-theorem`. |
| `raft-consensus-leader-election` — Raft and Leader Election | A ship elects one captain and records decisions in a shared log. | Terms, voting, log replication, commit rules, leases, membership change. | Authenticate voters, protect log integrity, audit leadership changes. | Path/LB `coordination-and-time`; Wiki `raft-consensus`. |
| `partitioning-consistent-hashing` — Partitioning and Consistent Hashing | Moving one desk in an office should not reshuffle every room. | Range/hash partitions, virtual nodes, rebalancing, hot partitions. | Tenant isolation, key entropy, cross-tenant query controls. | Path/LB `partitioning-depth`; Wiki `consistent-hashing`. |
| `btrees-lsm-wal` — B-Trees, LSM-Trees, and Write-Ahead Logs | One filing cabinet edits pages; another piles sorted folders for later merging. | Page splits, memtables, SSTables, compaction, WAL, read/write/space amplification. | Tamper-evident logs, backup integrity, encryption at rest. | Path/LB `storage-engines`; Wiki `btree-vs-lsm`. |
| `transactions-sagas-outbox` — Transactions, Sagas, and the Outbox | A group trip books flights and hotels with refunds when one step fails. | ACID isolation, 2PC cost, orchestration, compensation, outbox, idempotent consumers. | Authorize each saga step, audit compensations, protect ledger integrity. | Path/LB `cross-service-transactions`; Wiki `acid-vs-base`. |
| `kafka-logs-consumer-groups` — Kafka Logs and Consumer Groups | A shared notebook gives each reader a bookmark instead of passing pages around. | Topics, partitions, offsets, groups, rebalances, retention, compaction. | ACLs, schema validation, consumer isolation, replay access control. | Path/LB `messaging-kafka`; Wiki `event-streaming`. |
| `event-sourcing-streams` — Event Sourcing and Stream Processing | A bank statement records events; the balance is a projection. | Event logs, projections, watermarks, windows, exactly-once effects, schema evolution. | Append-only auditability, PII minimization, replay authorization. | Path/LB `events-streams`. |
| `crdts-vector-clocks-gossip` — CRDTs, Vector Clocks, and Gossip | Musicians in different rooms merge notes without a conductor. | Conflict-free types, causality, anti-entropy, membership, failure detection. | Authenticate gossip, validate state merges, limit malicious propagation. | Path/LB `coordination-and-time`; Wiki `gossip-protocol`, `merkle-trees`. |
| `bloom-merkle-probabilistic` — Bloom Filters, Merkle Trees, and Sketches | A bouncer’s quick “not on the list” is trustworthy; “maybe” needs a lookup. | False positives, HyperLogLog, count-min sketch, Merkle comparison, spatial indexes. | Do not leak membership through side channels; verify integrity before trust. | Path/LB `hashing-and-sketches`; Wiki `bloom-filters`, `merkle-trees`. |

### Track 3 — Real-World HLD & LLD Case Studies (`real-world-hld-lld`)

| Lesson slug — title | One-line story hook | Engineer focus | Security angle | Reuse seed |
|---|---|---|---|---|
| `url-shortener-hld-lld` — URL Shortener: HLD to LLD | A tiny link becomes a global redirect and analytics system. | Code allocation, redirect cache, 301/302 semantics, analytics pipeline, capacity. | Custom-alias races, disabled-link TTL, abuse throttling. | Path/LB `putting-it-together`; Lab `bitly-url-shortener`. |
| `whatsapp-chat-hld-lld` — Chat at Scale: HLD to LLD | A message must reach one device, a group, or an offline friend. | WebSocket connections, inbox storage, fan-out, presence, receipts, media. | End-to-end envelope privacy, abuse reporting, session identity. | Lab `whatsapp-chat`; Path/LB `live-updates`. |
| `twitter-timeline-hld-lld` — Timeline and Feed: HLD to LLD | One celebrity post cannot be copied into every follower’s inbox. | Hybrid fan-out, timeline cache, ranking, celebrity pull, pagination. | Block/mute enforcement, cache isolation, abusive-content controls. | Lab `twitter-timeline`; Path/LB `analytics-and-recommendations`. |
| `payments-hld-lld` — Payments: HLD to LLD | A retried charge must leave exactly one ledger entry. | Acceptance API, idempotency, ledger, PSP unknown states, reconciliation. | PCI scope minimization, signed webhooks, append-only audit, fraud gates. | Lab `razorpay-payments`; Path/LB `cross-service-transactions`. |
| `ticketing-flash-sale-hld-lld` — Ticketing Flash Sale: HLD to LLD | Ten thousand fans reach for the same seat at the same instant. | Virtual waiting room, reservation leases, inventory atomicity, payment expiry. | Bot resistance, per-user limits, anti-scalping controls, audit trails. | Lab `bookmyshow-ticketing`. |
| `youtube-upload-playback-hld-lld` — Video Upload and Playback: HLD to LLD | One upload becomes many renditions watched worldwide. | Direct upload, transcode queue, manifests, CDN ladder, view counters. | Signed uploads, content moderation, license enforcement, media isolation. | Lab `youtube-upload-playback`. |
| `netflix-streaming-hld-lld` — Streaming: HLD to LLD | A control plane chooses which edge should serve the next video segment. | Encoding, steering, CDN/OCA, congestion-aware playback, viewing state. | Signed manifests, device limits, entitlement checks, telemetry privacy. | Lab `netflix-streaming`. |
| `uber-matching-hld-lld` — Ride Matching: HLD to LLD | Nearby drivers and riders must meet without a global location hotspot. | Location stream, H3/geo cells, match radius, stale-driver expiry, trip state. | Precise-location minimization, driver identity, trip fencing. | Lab `uber-matching`. |
| `dropbox-file-sync-hld-lld` — File Sync: HLD to LLD | Two laptops edit the same document while the train has no signal. | Chunking, dedup, Merkle sync, metadata namespace, conflict UX. | Per-user keys, share-link revocation, dedup privacy, malware scanning. | Lab `dropbox-file-sync`. |
| `agentic-rag-support-hld-lld` — Agentic Support: HLD to LLD | A support agent can search, answer, and request a refund—if a harness allows it. | Retrieval, tools, memory, step/dollar budgets, citations, escalation. | Untrusted retrieval, tool allowlists, PII redaction, human approval for refunds. | Lab `agentic-rag-support`; Wiki `ai-agents-rag-architecture`. |

### Track 4 — AI Engineering, Agents & Harness (`ai-engineering-agents`)

| Lesson slug — title | One-line story hook | Engineer focus | Security angle | Reuse seed |
|---|---|---|---|---|
| `tokenization-embeddings` — Tokenization and Embedding Geometry | Words become numbered tiles, then points in a meaning map. | BPE, token budgets, embeddings, cosine similarity, normalization. | Token/log privacy, embedding inversion risk, tenant separation. | Path/LB `embeddings-retrieval`; Wiki `tokenization-basics`, `embeddings-vector-db`. |
| `vector-indexes-hnsw-ivf` — Vector Indexes: HNSW vs IVF | A library finds likely neighbors without reading every book. | ANN recall/latency tradeoff, HNSW, IVF, filtering, index updates. | Access-controlled retrieval, metadata filtering, index poisoning defenses. | Path/LB `embeddings-retrieval`; Wiki `vector-search`. |
| `rag-chunking-hybrid-reranking` — RAG Chunking, Hybrid Search, and Reranking | A good answer starts with the right pages, not the biggest prompt. | Chunking, BM25+dense fusion, reranking, citations, freshness. | Treat retrieved text as untrusted; enforce document ACLs. | Path/LB `embeddings-retrieval`; Wiki `rag-patterns`. |
| `prompt-injection-untrusted-context` — Prompt Injection and Untrusted Context | A note inside a retrieved manual must not become an instruction from the user. | Trust boundaries, instruction/data separation, tool validation, output constraints. | Defensive detection and isolation only; no payload examples or attack recipes. | Path/LB `embeddings-retrieval`; Wiki `ai-safety-guardrails-evals`. |
| `agent-loops-tools-budgets` — Agent Loops, Tools, and Budgets | An autonomous helper needs a checklist, a wallet limit, and a stop rule. | Plan/act/observe loops, tool schemas, retries, step/token/dollar caps. | Least-privilege tools, approval gates, audit logs, no implicit authority. | Wiki `ai-agents-rag-architecture`; seed `agent_orchestrator`. |
| `agent-memory-context-management` — Agent Memory and Context Management | A good assistant remembers preferences without hoarding every conversation. | Short-term scratchpad, long-term memory, compaction, consent, context windows. | Memory isolation, deletion, PII redaction, prompt/log access control. | Wiki `agent-memory-systems`, `prompt-engineering-context-management`. |
| `harness-sandbox-permissions-approvals` — Harness, Sandbox, Permissions, and Approvals | A workshop gives an apprentice tools only inside a marked workbench. | Harness architecture, filesystem/network sandbox, capability scopes, human approval. | Default deny, resource limits, secret isolation, irreversible-action gates. | Wiki `ai-safety-guardrails-evals`; new authored lesson. |
| `evals-guardrails-observability` — Evals, Guardrails, and AI Observability | A dashboard must show not only speed but whether the answer was grounded. | Golden datasets, faithfulness, tool evals, traces, online quality signals. | PII-safe telemetry, adversarial regression tests, anomaly alerts. | Wiki `ai-safety-guardrails-evals`, `ai-observability-monitoring`. |
| `ai-gateway-model-routing-caching` — AI Gateway, Model Routing, and Caching | A receptionist sends each request to the right specialist and reuses safe answers. | Routing, fallback, provider budgets, semantic caching, rate limits. | Tenant-aware cache keys, API-key isolation, data-residency routing. | Wiki `ai-gateway-model-routing`. |
| `multimodal-data-governance` — Multimodal Systems and Data Governance | A system that sees images and hears audio needs rules for every data type. | Encoders, media preprocessing, modality fusion, storage, evaluation. | Consent, retention, biometric/data sensitivity, access control. | Wiki `multimodal-ai-systems`. |

### Track 5 — LLM Inference Engineering & Training Systems (`llm-inference-training`)

| Lesson slug — title | One-line story hook | Engineer focus | Security angle | Reuse seed |
|---|---|---|---|---|
| `transformer-architecture-attention` — Transformer Architecture and Attention | Every token decides which earlier tokens matter most. | Q/K/V, multi-head attention, positional encoding, residual/MLP blocks. | Model/data provenance and extraction risk awareness. | Wiki `llm-architecture-transformers`. |
| `prefill-decode-token-streaming` — Prefill, Decode, and Token Streaming | Reading a paragraph is parallel; writing the next sentence is one token at a time. | Prefill/decode phases, TTFT, TPOT, streaming UX, cancellation. | Bound prompt/output sizes; prevent resource abuse. | Wiki `ai-inference-serving-2026`; Path/LB `llm-serving`. |
| `kv-cache-paged-attention` — KV Cache Math and Paged Attention | Each conversation rents memory from the GPU until its last token. | KV memory formula, fragmentation, paging, eviction, prefix reuse. | Session isolation, cache-key separation, memory exhaustion controls. | Path/LB `llm-serving`; Wiki `kv-cache-design`. |
| `continuous-batching-scheduling` — Continuous Batching and Scheduling | A restaurant seats new diners as soon as any table opens. | Continuous batching, variable lengths, priority queues, preemption, throughput. | Tenant fairness and noisy-neighbor limits. | Path/LB `llm-serving`. |
| `quantization-model-memory` — Quantization and Model Memory | Packing luggage more tightly saves space but changes what fits comfortably. | FP16/BF16/INT8/INT4, quality tradeoffs, memory calculation, calibration. | Verify model artifacts and prevent malicious model loading. | Wiki `llm-architecture-transformers`, `ai-inference-serving-2026`. |
| `speculative-decoding-prefix-caching` — Speculative Decoding and Prefix Caching | A fast draft writer proposes words; the main model checks them. | Draft/target verification, acceptance rate, prefix cache, shared system prompts. | Do not cache tenant-private prefixes across boundaries. | Wiki `ai-inference-serving-2026`. |
| `distributed-inference-parallelism` — Distributed Inference and Parallelism | A large engine is split across specialists that must communicate every step. | Tensor/pipeline/expert/data parallelism, collectives, topology, bottlenecks. | Isolate clusters and credentials; secure model distribution. | New authored lesson; seed `llm_inference`. |
| `fine-tuning-lora-alignment` — Fine-Tuning, LoRA, and Alignment | Teaching a general chef your restaurant’s recipes does not require rebuilding the chef. | SFT, LoRA/QLoRA, preference optimization, alignment tradeoffs, evaluation. | Training-data consent, poisoning defenses, license/provenance checks. | Wiki `fine-tuning-training-alignment`. |
| `pretraining-data-systems` — Pretraining and Training Data Systems | A model learns from a supply chain of datasets, tokens, labels, and checkpoints. | Data pipelines, sharding, tokenization, mixed precision, checkpointing, scaling. | Data governance, dedup/privacy, tamper-evident checkpoints. | New authored lesson; Wiki `mlops-llmops-lifecycle`. |
| `mlops-llmops-rollouts` — MLOps/LLMOps Lifecycle and Safe Rollouts | A model release is a production change with canaries and rollback. | Registry, eval gates, deployment, monitoring, drift, rollback, versioning. | Signed artifacts, access control, incident response, auditability. | Wiki `mlops-llmops-lifecycle`, `ai-observability-monitoring`. |

### Track 6 — ML Mathematics & Research Paper Decoder (`ml-math-paper-decoder`)

| Lesson slug — title | One-line story hook | Engineer focus | Security angle | Reuse seed |
|---|---|---|---|---|
| `vectors-matrices-embedding-geometry` — Vectors, Matrices, and Embedding Geometry | Every document becomes an address in a high-dimensional city. | Dot products, norms, cosine similarity, matrix multiplication, dimensionality. | Embedding privacy and adversarial-distance awareness. | New authored lesson; Wiki `embeddings-vector-db`. |
| `probability-likelihood-bayes` — Probability, Likelihood, and Bayes | A test result updates belief; it does not replace prior evidence. | Distributions, expectation, likelihood, Bayes, calibration. | Avoid privacy leaks through rare-event statistics. | New authored lesson. |
| `gradients-backprop-computation-graphs` — Gradients, Backprop, and Computation Graphs | A chain of decisions learns which earlier knob helped the outcome. | Derivatives, chain rule, autodiff, computation graphs, numerical stability. | Secure training infrastructure and artifact integrity. | New authored lesson. |
| `optimization-loss-landscapes` — Optimization and Loss Landscapes | A hiker follows slopes while avoiding ravines and plateaus. | SGD/Adam, learning rate, regularization, loss design, convergence. | Poisoning/overfitting awareness and evaluation robustness. | New authored lesson. |
| `attention-math-scaling-laws` — Attention Math and Scaling Laws | Bigger models need more memory and compute, but not in one simple straight line. | Scaled dot-product attention, FLOPs, context scaling, Chinchilla-style tradeoffs. | Cost/resource guardrails and model-evaluation governance. | Wiki `llm-architecture-transformers`; new math depth. |
| `evaluation-statistics-confidence` — Evaluation Statistics and Confidence | A benchmark score without error bars is a guess wearing a lab coat. | Sampling, confidence intervals, significance, leakage, benchmark design. | Defensive red-team datasets without publishing exploit procedures. | New authored lesson; Wiki `ai-safety-guardrails-evals`. |
| `information-theory-token-prediction` — Information Theory and Token Prediction | A surprise token carries more information than an expected one. | Entropy, cross-entropy, perplexity, KL divergence, compression. | Side-channel awareness for token/log metadata. | New authored lesson. |
| `paper-reading-method-ablations` — How to Read a Paper and Its Ablations | Read the claim, find the control, then ask what was actually removed. | Structured paper reading, ablations, baselines, limitations, reproducibility. | Check data/model provenance and responsible-disclosure boundaries. | New authored lesson; existing `conceptSources.ts` source discipline. |
| `reproducing-experiments-checklists` — Reproducing Experiments Safely | A recipe is not reproducible until someone else can follow it. | Experiment design, seeds, versioning, checklists, result comparison. | Isolate experiments, review dependencies, never execute unknown code unsandboxed. | New authored lesson. |
| `research-to-production-memos` — From Research Result to Production Decision | A paper suggests a direction; an ADR records whether it fits this system. | Evidence weighting, cost/latency/quality tradeoffs, ADR writing, rollback. | Document security/privacy constraints and rejected risky options. | New authored lesson; `enterpriseTracks.ts` ADR examples. |

### Track 7 — Backend, Cloud & Production Security Engineering (`backend-cloud-security`)

| Lesson slug — title | One-line story hook | Engineer focus | Security angle | Reuse seed |
|---|---|---|---|---|
| `http-grpc-api-contracts` — HTTP, gRPC, and API Contracts | Two services need a shared language and a versioning policy. | REST/gRPC/GraphQL, protobuf, deadlines, pagination, compatibility. | Schema validation, authz, rate limits, safe error responses. | Path/LB `web-protocols-and-edge`. |
| `authn-authz-oidc-jwt` — Authn, Authz, OIDC, and JWT | A badge proves identity; a permission list says which doors it opens. | Sessions vs tokens, OIDC/OAuth2/PKCE, JWKS, revocation, RBAC/ABAC. | Short-lived credentials, audience/issuer checks, per-resource authorization. | Path/LB `security-*`; Wiki `security-zero-trust-architecture`. |
| `sql-indexes-data-access` — SQL, Indexes, and Safe Data Access | The fastest query is often the one that reads only the right shelf. | Schema design, indexes, transactions, connection pools, migrations. | Parameterized access, least privilege, audit and encryption. | Path/LB `simple-system`, `one-database-not-enough`. |
| `caching-queues-reliable-work` — Caching, Queues, and Reliable Background Work | A kitchen survives a rush by separating ordering from cooking. | Cache coherence, queues, workers, retries, DLQs, idempotency. | Poison-message isolation, secret-safe logs, tenant-aware queues. | Path/LB `caching`, `background-jobs`. |
| `aws-vpc-identity` — AWS VPC, Compute, Data, and Identity | A building has public lobbies, private offices, and locked records rooms. | Subnets, routes, NAT/endpoints, ALB/NLB, ECS/EKS/Lambda, Aurora/DynamoDB, IAM. | Private subnets, IRSA, KMS, default-deny security groups. | Path/LB `aws-architecture-scratch-to-prod`; Wiki `aws-well-architected`. |
| `cloudflare-edge-zero-trust` — Cloudflare Edge and Zero Trust | The nearest receptionist handles the request without exposing the building. | Anycast, Workers/isolates, tiered cache, Durable Objects, R2, tunnels, Access. | Edge WAF, bot controls, origin lockdown, short-lived access. | Path/LB `cloudflare-edge-and-workers`; Wiki `cloudflare-edge-architecture`. |
| `kubernetes-control-plane-networking` — Kubernetes Control Plane and Networking | A cluster is a fleet of robots constantly comparing desired state to reality. | API server, etcd, scheduler, controllers, CNI, ingress, mesh, GitOps. | Admission policy, RBAC, workload identity, network policy, signed deployments. | Path/LB `kubernetes-control-and-data-plane`; Wiki `kubernetes-architecture-deep-dive`. |
| `observability-slos-incident-response` — Observability, SLOs, and Incident Response | A dashboard is a story told by metrics, logs, and traces. | Golden signals, SLO/error budget, burn alerts, tracing, runbooks, postmortems. | Tamper-evident audit logs, secure telemetry, incident containment. | Path/LB `growing-big`, `principal-architect-and-finops`; Wiki `observability-tracing`. |
| `threat-modeling-secure-defaults` — Threat Modeling and Secure Defaults | Walk the building before opening day and ask where each trust boundary breaks. | STRIDE, data flows, abuse cases, least privilege, defense in depth. | Defensive threat models and hardening only; no exploitation steps. | `securityPractices.ts`; `threatModel.ts`; Wiki `security-by-design-zero-trust`. |
| `supply-chain-cve-containment` — Supply Chain and CVE Containment | One vulnerable package can affect forty services; containment starts with a map. | SBOM, lockfiles, provenance, patch prioritization, virtual patches, rollout safety. | Block known-bad artifacts, segment blast radius, verify remediation. | Path/LB `security-*`; `cveIntelligence.ts`; `pluginsCatalog.ts`. |
| `finops-sla-governance` — FinOps, SLA, and Architecture Governance | A beautiful architecture that cannot be afforded or operated is not production-ready. | Composite SLA, error budgets, TCO, right-sizing, ADRs, review rubrics. | Cost-aware abuse controls, auditability, compliance constraints. | `enterpriseTracks.ts`; Path/LB `principal-architect-and-finops`; `queuingMath.ts`. |

### Launch blogs

All ten use the `Blog`/`BlogStep` schema, ambient background, story toggle, scrollytelling, security takeaways, and read tracking.

| Blog slug | Working title | Primary source |
|---|---|---|
| `one-server-is-an-architecture` | One Server Is an Architecture | Track 1 lesson; `simple-system` lesson blogs. |
| `why-p99-explodes` | Why p99 Explodes Before Average Latency Moves | Track 1 queueing lesson; `queuingMath.ts`. |
| `cache-invalidation-is-a-product-decision` | Cache Invalidation Is a Product Decision | Track 1 caching; `caching-strategies`. |
| `idempotency-before-retries` | Idempotency Comes Before Retries | Track 1/3; `background-jobs`, payments lab. |
| `raft-without-the-mystique` | Raft Without the Mystique | Track 2; `raft-consensus`. |
| `btrees-lsm-and-the-cost-of-a-write` | B-Trees, LSM-Trees, and the Cost of a Write | Track 2; `btree-vs-lsm`. |
| `kv-cache-is-a-memory-budget` | KV Cache Is a Memory Budget | Track 5; `kv-cache-design`, `llm-serving`. |
| `agents-need-a-harness` | Agents Need a Harness, Not Just a Prompt | Track 4; agent/RAG curriculum and lab. |
| `zero-trust-from-edge-to-database` | Zero Trust from Edge to Database | Track 7; `securityPractices.ts`, STRIDE engine. |
| `designing-for-a-region-loss` | Designing for a Region Loss | Track 2/7; availability lessons and chaos scenarios. |

### Challenge labs

Use all 16 existing guided labs. The challenge catalog adds tracks and defensive security focus; it does not replace the labs.

| Challenge / existing lab id | Title | Track mapping | Security / hardening focus |
|---|---|---|---|
| `bitly-url-shortener` | URL Shortener (Bitly) | 1, 3 | Alias abuse, kill-link TTL, per-key throttling. |
| `pastebin-service` | Pastebin & Expiring Shares | 3, 7 | Visibility classes, single-use atomic claim, no shared caching, quotas. |
| `youtube-upload-playback` | YouTube Upload & Playback | 3 | Signed uploads, moderation, license enforcement. |
| `whatsapp-chat` | WhatsApp-style Chat | 2, 3 | Workload identity, E2E envelope privacy, abuse controls. |
| `twitter-timeline` | Twitter-style Timeline | 3 | Block/mute enforcement, cache isolation, stampede defense. |
| `instagram-feed` | Instagram-style Feed | 3 | Signed media uploads, moderation hooks, story expiry. |
| `bookmyshow-ticketing` | BookMyShow Ticketing | 3 | Bot resistance, inventory integrity, per-user limits. |
| `razorpay-payments` | Razorpay-style Payments | 3, 7 | Idempotency, append-only ledger, signed webhooks, PCI scope. |
| `uber-matching` | Uber-style Matching | 3 | Location minimization, driver identity, stale-state fencing. |
| `netflix-streaming` | Netflix-style Streaming | 3 | Signed manifests, device limits, entitlement checks. |
| `search-autocomplete` | Search Autocomplete | 2, 4 | Query isolation, index integrity, bounded resource use. |
| `dynamodb-from-scratch` | DynamoDB from Scratch | 2 | Tenant partition isolation, quorum safety, ACLs. |
| `notification-platform` | Notification Platform | 1, 7 | Preference enforcement, provider isolation, retry budgets. |
| `dropbox-file-sync` | Dropbox-style File Sync | 2, 3 | Share revocation, per-user encryption keys, malware scanning. |
| `distributed-rate-limiter` | Distributed Rate Limiter | 1, 7 | Atomic admission, fair quotas, retry/429 semantics. |
| `agentic-rag-support` | Agentic RAG Support | 4 | Retrieval trust boundaries, tool allowlists, PII redaction, approval gates. |

---

## 12. Storage keys, schema version, and migration

### 12.1 New key

- **Primary learner key:** `syscraft.learner.v1`
- **Schema version:** `1`
- **Format marker for learner-only export:** `syscraft.learner/1`
- **Full backup format:** upgrade `syscraft.backup/1` to `syscraft.backup/2`, while retaining import support for version 1.
- **IndexedDB:** keep `syscraft_db_v1` and its existing tables. FSRS cards and lab progress remain there.
- **Canvas autosave:** keep `syscraft-canvas-v1` and scoped keys unchanged.

Writes to the learner key should be debounced, flushed on `pagehide`, validated by Zod, and capped:

- quiz history: 500 attempts;
- notes: 500 total;
- bookmarks: 1,000;
- study sessions: 200;
- scratchpad: 20,000 characters;
- resume pointer: one.

If storage is blocked or full, keep the in-memory store usable and surface a quiet “progress will not survive reload” notice.

### 12.2 Existing key map

| Existing key / database | Current owner | Migration / compatibility action |
|---|---|---|
| `syscraft.completedLessons.v1` | `PathPageContent`, `LessonPageContent`, `RoadmapPageContent` | Migrate array of `moduleId::lessonIndex` into `completedLessons`, converting IDs through `legacyRoutes.ts`. Keep a compatibility mirror until Phase 6. |
| `syscraft.start.steps` | `useStartStore` | Migrate to `onboarding.completedStepIds`. |
| `syscraft.start.banner` | `useStartStore` | Migrate `"hidden"` to `onboarding.bannerHidden`. |
| `syscraft.canvas.prefs` | `useCanvasPrefsStore` | Keep canvas-specific prefs here. Mirror theme/animation preferences into learner prefs during transition; make one source authoritative in Phase 6. |
| `syscraft.canvas.presets` | `useCanvasPresetStore` | Leave in place; include in backup/wipe. |
| `syscraft-canvas-v1` | `canvasPersistence` | Leave in place; add to backup/wipe. |
| `syscraft-canvas-v1:lab:<id>` | `canvasPersistence` | Leave in place; include all scoped keys in backup/wipe. |
| `syscraft.predictions` | `usePredictionStore` | Leave authoritative; progress dashboard reads it. Do not duplicate into learner state. |
| `syscraft.plugins.v1` | `usePluginStore` | Leave in place. |
| `syscraft.practice.history` | `practiceStats.ts` | Leave authoritative for session totals; do not fabricate per-question history from it. |
| `syscraft.practice.settings` | `practiceStats.ts` | Migrate daily cap/catch-up into learner prefs, then update settings writers to use the learner store or write through during transition. |
| `syscraft.play.scores` | `practiceStats.ts` | Leave in place. |
| `syscraft.incidentScores` | `IncidentArena` | Leave in place. |
| `syscraft.room.config`, `syscraft.room.name` | `roomSync.ts` | Leave in place. |
| `syscraft.byok` | `aiClient.ts` | Leave optional and local; exclude from public/share exports. |
| `syscraft.opencodeBridge` | `aiClient.ts` | Leave in place. |
| `syscraft.railWidth` | `CleanWorkspaceShell` | Leave in place. |
| `syscraft:resetCanvas`, `syscraft:pendingBlueprint` | sessionStorage handoff | Ephemeral; no migration. |
| `syscraft_db_v1` | Dexie | Keep. Tables: `blueprints`, `customResources`, `fsrsCards`, `labProgress`, `simRecordings`. |
| `syscanvas` | Legacy Dexie | Existing one-shot copy to `syscraft_db_v1`; never delete legacy data during migration. |
| `syscanvas.*`, `systemcanvas.*`, `syscanvas_*`, `systemcanvas_*` | Legacy localStorage | Existing rebrand migration runs first; learner migration runs second. |

### 12.3 Migration algorithm

1. On client boot only, run existing `runLocalStorageMigrations()` for pre-rebrand keys.
2. Read `syscraft.learner.v1`. If absent, construct defaults and migrate:
   - completed lesson IDs;
   - onboarding steps/banner;
   - compatible preference fields.
3. Resolve old lesson IDs through an explicit map. Unknown IDs remain in a `legacyUnmatchedIds` diagnostic list in development, not in the public schema.
4. Validate the migrated object with `LearnerStateSchema`. On a field-level failure, keep the valid default for that field rather than dropping all progress.
5. Persist the new object once. Keep old keys as compatibility mirrors until all readers/writers are migrated.
6. Never delete `syscraft-canvas-v1*`, Dexie data, or pre-rebrand data automatically.
7. For a future schema version, add a pure `migrateV1ToV2` function and test it with fixture objects in Node.
8. Export/import uses the full backup format and includes:
   - learner state;
   - every `syscraft.*` key;
   - every `syscraft-canvas-*` key;
   - all existing Dexie tables.
9. Wipe requires explicit confirmation and removes only SysCraft-owned keys/tables.

### 12.4 Read tracking and quiz eligibility

- Opening a page is not “reading.”
- Mark a topic visited only after 30 seconds of active time or 50% scroll progress.
- Mark a lesson complete explicitly or after all checkpoints are answered correctly.
- Mark a blog read at 90% progress or via the “finished reading” control.
- `/quiz` builds its eligible pool from `visitedTopics`, `completedLessons`, and `readBlogs`, mapped to question `conceptTags`/`sourceContentId`.
- If the eligible pool is empty, show a calm link to the first unread lesson; never fall back to the full question bank.
- Use due FSRS cards first, then unseen eligible questions, then a shuffled eligible remainder.
- Persist each answer in `quizHistory` and update the matching FSRS card through the existing scheduler.

---

## Implementation guardrail summary

The redesign should feel like a new product while remaining a conservative engineering migration:

1. Static marketing stays static; only interactive islands become client-only dynamic components.
2. The simulation, canvas, worker, FSRS, and guided labs are reused, not rewritten.
3. Content is additive and adapter-driven; 234 existing lesson blogs remain valuable source material.
4. Seven tracks, 72 structured lessons, ten blogs, 16 labs, five tools, a unified map, and read-topic-only quiz are all real launch surfaces—no stubs or “coming soon.”
5. All progress stays in the browser, with versioned migration, export/import, and no login, payments, backend, or paywall.

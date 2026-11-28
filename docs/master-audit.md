# SysCraft Step 1 master architecture/logic audit

- **Audit date:** 2026-11-27
- **Live target:** `https://sys-craft.vercel.app`
- **Source snapshot:** working tree at `303cc62`, with concurrent changes from the landing/content/canvas workstreams
- **Scope:** static export and routes; learner persistence; recall quiz; simulation/WASM; canvas/lab state architecture only; command palette; map/tools/settings logic; bundle/SSR; privacy/security
- **Method:** source inspection, emitted `out/` route and asset inventory, targeted live Playwright scenarios in isolated contexts, pure-engine probes through `vite-node`, `npx tsc --noEmit`, and the full Vitest suite. No server was started and no application source was edited.

## 1. Executive summary

**Production readiness judgment: NO-GO for a strict production launch until the P1 data-integrity, security, SSR, and assessment-validity items are fixed. No P0 was observed.** The product is live and its core learning loop works, but the current persistence layer can silently lose progress across tabs, the full backup/reset contract contradicts its own UI and privacy copy, the optional local AI bridge is cross-origin callable, and the simulation's “all inputs remain finite” contract fails at hostile boundaries.

Positive evidence is substantial: 271/271 tests pass, TypeScript reports no errors, all 158 component TSX files have the required client directive, 424 HTML routes are emitted with no missing static internal-link targets found, the WASM module is real and capped at 64 KiB, and the main canvas/lab loaders correctly use client-only dynamic imports. Live checks also confirmed the tools calculator, blog completion, quiz empty/answer/reload flow, and lesson-step resume behavior.

The most urgent findings are:

1. Two open tabs can overwrite each other's learner state; this was reproduced live.
2. Canvas autosaves are omitted from both full backup and “Delete all local data”; this was reproduced live.
3. The full backup importer accepts structurally invalid files and can replace valid learner JSON with corrupt JSON; this was reproduced live.
4. Full backups include the plaintext BYOK API key; this was reproduced live with a dummy key.
5. The optional OpenCode bridge reflects arbitrary origins and permits private-network requests, so any web origin can drive the user's local bridge when it is running.
6. Quiz answer positions are badly biased: 143/244 current questions place the answer at index 1.
7. Simulation probes produced `Infinity`, `NaN`, and misleading zero latency; WASM and JavaScript fallback disagree for non-finite LLM token inputs.
8. 184/424 emitted pages canonicalize to the site root, including canonical lessons, blogs, tools, and paths.
9. Representative routes ship 1.56–2.67 MB of uncompressed JavaScript; the cause is identifiable heavy client imports.
10. The command palette advertises lessons/labs/tools but returns no result for “single server,” “bitly,” or “capacity.”

## 2. Prioritized findings

Priorities: **P0** = launch-blocking broad failure; **P1** = major correctness, data, security, assessment, SSR, or performance defect; **P2** = narrower correctness, IA, or polish defect.

| ID | Priority | Area | Evidence | User impact | Recommended fix | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| PER-01 | P1 | Learner persistence / race | `src/store/useLearnerPlatformStore.ts:55-60,120-148` commits the tab's whole in-memory snapshot and has no `storage`/`BroadcastChannel` listener. Live two-tab test: quiz answer produced `history.length=1`; changing Ambient in the second tab reduced it to `0`. | Notes, answers, completion, and preferences can silently erase newer work from another tab. | Add revisioned commits and cross-tab synchronization; re-read/merge before write, or serialize through one leader tab. Include `updatedAt`/revision in schema and migrations. | Two-page race test; conflicting notes/answers/prefs; reload and merge assertions. |
| PER-02 | P1 | Backup / reset namespace | `src/store/db.ts:301,321-345,402-420` only includes/removes `syscraft.*`; canvas keys are `syscraft-canvas-v1` and `syscraft-canvas-v1:lab:*` in `src/store/canvasPersistence.ts:23-36`. Live export reported `includesCanvas=false`; live Delete-all left the canvas key intact. The gap is also explicitly recorded in `docs/redesign-blueprint.md:132,1451-1453,1481-1486`. | Users lose main/lab architectures when moving machines, and “Delete all local data” leaves design data behind. | Define one owned-key registry covering `syscraft.*`, `syscraft-canvas-*`, scoped canvas keys, and relevant session-independent keys; use it for export/import/wipe. | Export/import/wipe main plus two lab scopes; assert no owned key remains after confirmed wipe. |
| PER-03 | P1 | Full backup import validation | `src/store/db.ts:365-399` checks only the format marker and object shape, then `bulkPut`s arbitrary rows and writes arbitrary `syscraft.*` strings. Live import of a syntactically valid backup containing `syscraft.learner.v1:"{not-json"` wrote that corrupt value and reported success. | A malformed or hostile “backup” can corrupt learner state, overwrite settings, poison IndexedDB, or destroy recoverable progress. | Validate the complete backup with a strict schema, cap file/row/string sizes, stage all changes, and commit atomically. Validate learner JSON before writing it. Preserve v1 import support. | Malformed table rows, wrong value types, oversized files, invalid learner JSON, and interrupted imports leave prior state unchanged. |
| PER-04 | P1 | Secret handling / backup | `src/engine/aiClient.ts:70,388-395` stores the BYOK key at `syscraft.byok`; `src/store/db.ts:340-345` exports every `syscraft.*` value. Live backup contained the dummy key verbatim. `docs/redesign-blueprint.md:1461` says BYOK must be excluded from public/share exports. | Sharing a progress backup can disclose a live provider credential. | Exclude `syscraft.byok` by default; if secret export is offered, make it a separate explicit encrypted/redacted action with a strong warning. | Dummy-key export assertion; secret absent from learner-only and normal full backups. |
| PER-05 | P1 | Legacy learner migration | `src/learning/platform/storage.ts:9-18` reads only `syscraft.learner.v1`; no migration exists in `useLearnerPlatformStore`. Legacy readers still write `syscraft.completedLessons.v1` (`PathPageContent.tsx:52-75`, `LessonPageContent.tsx:12-31`, `RoadmapPageContent.tsx:10-22`). Live seed of the legacy key left `learner.completedLessons=[]`. Intended migration is specified in `docs/redesign-blueprint.md:1443-1479`. | Existing learners appear reset after the redesign; old completion state is stranded. | Add an idempotent client-boot migration with an explicit legacy-ID map, field-level fallback, diagnostics for unknown IDs, and compatibility mirrors. Run rebrand migration first, learner migration second. | Fixture tests for legacy completion/onboarding/preferences; unknown IDs; repeated boot; corrupt fields. |
| PER-06 | P1 | Persistence durability / bounds | `src/learning/platform/storage.ts:21-29` swallows quota/denial errors while UI copy says “Saved automatically.” `setNote` commits on every keystroke (`useLearnerPlatformStore.ts:102-107`). The v1 validator has no count/string caps, unlike the blueprint's caps and debounce contract (`docs/redesign-blueprint.md:1432-1441`). | Private mode/quota exhaustion causes silent loss; long notes and large imports can block the main thread or exhaust storage. | Return persistence status, surface a quiet non-persistent warning, debounce trailing writes with `pagehide` flush, and enforce schema caps at input/import boundaries. | Storage-throw test; quota test; long-note benchmark; max-size import tests. |
| QUIZ-01 | P1 | Quiz assessment validity | `QuizDeck` randomizes question selection/order, not answer positions. Pure registry probe over current source: 244 questions; correct indexes `[47,143,35,19]` = **58.6% index 1**. `src/content/platform/track-case-studies.ts` and `blogs.ts` also use fixed question-kind sequences. | A learner can improve scores by consistently choosing B; recall validity is compromised. | Deterministically shuffle choices per question/session while remapping `answerIndex`, and rebalance authored answer positions. Add distribution and mapping tests. | No answer position above an agreed threshold; shuffled sessions preserve correctness; live answer/history tests still pass. |
| SIM-01 | P1 | Simulation numeric contract / WASM parity | `src/engine/queuingMath.ts:45-55,153-164,237-255` permits overflow to collapse to zero; `simulationCore.ts:638` multiplies unsanitized replicas into cost. Probe: `effectiveCapacity(MAX_VALUE,MAX_VALUE)=Infinity`; one-node snapshot had `capacityRps=Infinity`, `concurrentInFlight=Infinity`, and `p99Ms=0`; 97-node hostile fallback produced `totalCostPerHourUsd=NaN`. For `NaN`/`Infinity` prompt tokens, JS TTFT/KV were `0/0` while WASM returned `51.02ms/0.268%` (`wasm/sim-kernel/src/lib.rs:137-141`). | Imported/extreme configurations can display false health, poison recordings/exports, and behave differently in worker versus fallback. | Sanitize and cap every numeric graph input; use overflow-safe multiplication; make JS/Rust token fallbacks identical; assert finite outputs before snapshot publication. | Hostile matrix for negative/NaN/Infinity/MAX values on both WASM and >96-node JS paths; parity and finite-output assertions. |
| SIM-02 | P1 | Worker fallback / lifecycle | `src/store/useSimStore.ts:74,157-163,219-239,247-250`: worker owns authoritative engine state, but main-thread `engineState` remains at its initial value. On worker error the fallback starts from that stale state, resetting tick/queues/cache/circuits. `stopSimulation` neither terminates nor detaches the worker; a later error can start a fallback after unmount. | Restricted iframe/CSP fallback jumps backward and loses simulated state; background intervals/workers can outlive their route. | Define an explicit state-handoff or visible reset on failover; guard callbacks by owner/generation; terminate or reference-count workers on last unmount; generate traces in fallback too. | Force constructor failure and runtime failure after many ticks; verify continuity/reset semantics, no post-unmount timers, and trace parity. |
| SEC-01 | P1 | Local AI bridge security | `server/opencode-ai-bridge.mjs:16-22` reflects any `Origin`, allows `POST`, and returns `Access-Control-Allow-Private-Network: true`; `/review` has no auth token (`:163-215`). Binding to `127.0.0.1` does not stop browser requests from arbitrary web origins. | When the optional bridge is running, a malicious site can trigger local model jobs, consume resources, and read responses; file-content prompt injection is also untrusted. | Require a random local session token, enforce a strict origin allowlist, reject untrusted preflights/private-network requests, and treat brief content as untrusted data. Consider a Unix socket/native messaging transport. | Cross-origin preflight/POST denied; wrong token denied; SysCraft origin still works; brief injection tests. |
| SSR-01 | P1 | Static-export SSR safety | `src/app/layout.tsx:5` imports `BootRunner`; `BootRunner.tsx:4` imports `db.ts`; `db.ts:71` constructs `new SysCraftDatabase()` at module scope. Next 16's static-export guide states Client Components are prerendered (`node_modules/next/dist/docs/01-app/02-guides/static-exports.md:69-109,257-260`). | A browser-only persistence library executes in the Node prerender graph, violating the project's critical invariant and making builds fragile across environments. | Move boot/migration behind a client-only dynamic loader or lazy Dexie facade; importing the module in Node must not construct Dexie. | Build-graph/import test proving no Dexie construction during prerender; browser boot still migrates. |
| PERF-01 | P1 | Bundle / lazy loading | Emitted `out/` HTML asset inventory: `/` 1,563,225 JS bytes; `/tools` 1,560,112; canonical lesson 1,591,233; `/paths` 2,138,136; `/map` 2,148,111; `/quiz` 2,150,966; blog 2,200,785; `/learn` 2,674,656. Heavy causes include `SiteFooter` → `contentManifest` (`SiteFooter.tsx:5`), legacy `getLessonBlog` imports (`LessonPageContent.tsx:9`), full `Track` objects (`TrackLessons.tsx:12-22`), and all 21 visualizers statically imported (`visuals/registry.tsx:5-26`). | Large parse/evaluate cost, especially mobile; route-level static HTML does not deliver its intended code-splitting benefit. | Introduce lightweight summary/catalog DTOs; keep full bodies server-side; split footer counts; pass only related summaries; lazy-load explicit visual modules; set route JS budgets. | Rebuild and compare route budgets; verify no full registry in landing/footer/track-index client chunks. |
| SEO-01 | P1 | Metadata / canonical routes | `src/app/layout.tsx:21-24` sets root `alternates.canonical=SITE_URL`; most child routes do not override it. Built audit: 184/424 pages canonicalize to root. Live `/tools`, `/paths`, canonical lesson, and blog all returned `https://sys-craft.vercel.app`. | Search engines may consolidate/drop deep pages; sitemap and canonical signals conflict. | Remove inherited root canonical or emit route-specific canonicals for every indexable route; retain metadataBase only. | Crawl all emitted HTML and assert canonical path equals route path (with intentional legacy mappings). |
| NAV-01 | P1 | Command palette coverage | `CommandPalette.tsx:79-95` renders only static destinations, 7 tracks, and 8 blogs. The complete lesson/lab maps in `platformRoutes.ts:44-142` are not rendered. Live searches: “single server,” “bitly,” and “capacity” returned no matches; “kafka” returned only a blog. | The advertised search cannot find most learning/building content; keyboard discovery is materially incomplete. | Build a lightweight index for 53 lessons, 16 labs, 5 tools, tracks, blogs, and optionally concepts/topics/notation; retain cmdk keyboard behavior. | Exact/fuzzy probes for representative content in every group; Enter navigation and Escape tests. |
| CAN-01 | P1 | Shared/imported topology validation | `useCanvasStore.ts:1018-1044` accepts raw/compressed JSON with only version/array checks, then maps it directly. It bypasses `sanitizePersistedCanvas` (`canvasPersistence.ts:89-225`), including node/edge caps, finite positions, duplicate checks, and override filtering. Room sync feeds peer payloads into the same path (`RoomSession.tsx:92-100`). | A crafted share link or peer can freeze/crash the canvas or feed invalid values into simulation. This is a canvas dependency for Hy4, not a duplicate runtime UI audit. | Route all external topology through one bounded sanitizer; cap encoded/decoded size, nodes, edges, IDs, strings, and numeric overrides before store insertion. | Fuzz/oversize/duplicate/non-finite-equivalent payload tests; malicious room/share cases; valid scene roundtrip. |
| LAB-01 | P1 | Lab autosave durability | `canvasPersistence.ts:258-296` debounces writes by 500 ms. Only `CleanWorkspaceShell.tsx:435-446` registers `pagehide`/`beforeunload` flush; `LabWorkspace.tsx:163-175` flushes on React cleanup but has no unload listener. | A lab edit followed immediately by refresh/tab close can lose the trailing autosave. Canvas/lab dependency for Hy4. | Register the flush globally in the persistence/boot layer so every canvas host is covered; keep scope-aware flushing. | Edit a lab and immediately reload/close at <500 ms; assert exact topology persistence. |
| PRIV-01 | P1 | Privacy/security copy accuracy | `PrivacyPageContent.tsx:15-35` says canvas topology lives in IndexedDB and FSRS state lives in localStorage; actual canvas autosave is localStorage (`canvasPersistence.ts:23`) and FSRS/lab progress are Dexie tables (`db.ts:36-67`). Optional-host inventory omits the OpenCode bridge (`aiClient.ts:72`) and arbitrary custom CVE feed URLs (`cveScanner.ts:659-683`). `SettingsPanel.tsx:214` says “no server round-trips” despite opt-in cloud/local bridge calls. | Users cannot accurately audit where data lives or what leaves the browser; this undermines the product's central privacy claim. | Rewrite the inventory from code, list every store and optional endpoint/condition, and distinguish learner export from full backup. | Automated key/host inventory compared with `/privacy`; live network checks for default and opt-in flows. |
| SIM-03 | P2 | Cycle detection | `simulationCore.ts:270-295` marks an edge whenever its target can reach its source. In A→B→C→A, every edge satisfies that test, so all cycle edges are damped rather than one deterministic back edge. | Cyclic designs still terminate, but flow is over-damped and not a faithful back-edge solver. | Use DFS gray/black back edges or deterministic cycle breaking per strongly connected component. | Three-node cycle expects one chosen back edge; nested/multi-cycle tests. |
| CAN-02 | P2 | Particle condition math | `TrafficParticleLayer.tsx:158-160` divides `sourceTelem.errorRate` by 100 even though engine error rate is already 0–1 (`simulationCore.ts:626`). | Error-condition particles are about 100× too sparse and misrepresent failures. | Use the 0–1 value directly; unit-test condition scaling. | Seed 0.5 error rate and assert particle count/opacity mapping. Canvas dependency for Hy4. |
| SIM-04 | P2 | DVR history duration | `useSimStore.ts:20-27` documents a 60 s ring, but `handleSnapshot` appends every 50 ms tick (`:114-125`) and `HISTORY_CAP=600`, yielding 30 s. | Time-travel covers half the promised duration. | Append at UI-sync cadence or raise cap to 1200; document actual units. | 61 s simulation retains at least 60 s of samples. |
| MAP-02 | P2 | Map IA / input | `KnowledgeMap.tsx:48-62` filters tracks/blogs/labs, but the selected sidebar stays on its previous track; `/map` contains no topic/concept/primitive index. `onWheel` (`:144-146`) zooms without preventing page scroll. | Search results and detail panel can disagree; “Topic map” copy promises more than the route exposes; zooming can also scroll the page. | Select the first matching track, add explicit empty states, decide whether to implement map sub-indexes, and make wheel zoom non-passive/intentional. | Search-to-selection tests; no page scroll during wheel zoom; documented route coverage. |
| ROUTE-02 | P2 | Redirects / route depth / 404 | `vercel.json:3-7` declares 301s, but manual live requests to `/path`, `/workspace`, and `/encyclopedia` returned 200 with no `Location`; compatibility pages still exist. `/map/topics`, `/map/concepts/consistent-hashing`, `/map/primitives`, and `/tools/capacity` return 404, although no emitted internal link points to them. No custom `not-found.tsx` exists. | Redirect strategy differs by host; expected deep links are absent; unknown routes get the default unbranded 404. | Choose one canonical redirect strategy per host, implement or stop promising deep routes, and add a branded 404 with recovery links. | HTTP status matrix on Vercel/static host/no-JS; internal-link crawl remains clean. |
| QUIZ-02 | P2 | Eligibility semantics / duplication | Lesson/blog readers call `visitTopic` immediately on mount (`LessonPlayer.tsx:156-159`, `BlogReader.tsx:158-161`), while copy says questions come from material “already read.” Blueprint §12.4 says opening is not reading. `QuizDeck.tsx:14-27` duplicates `findQuizBank` logic from `registry.ts:59-85`. | Merely opening a page unlocks recall; copy and behavior diverge; two bank builders can drift. | Track active time/scroll or rename the promise honestly; use one shared `findQuizBank` function. | Eligibility tests for open-only, 30 s active, 50% scroll, completed, and read-blog states. |
| SEC-02 | P2 | BYOK transport hygiene | Gemini sends the API key in the query string (`aiClient.ts:455-459`). | URLs are more likely to appear in logs/proxies/devtools than headers. | Use the provider-supported API-key header instead of `?key=`. | Request inspection asserts no key in URL; provider call still succeeds with a mock. |
| ROUTE-03 | P2 | Curriculum/sitemap fragmentation | Sitemap lists both 53 canonical path lessons and 234 legacy `/learn` pages; footer quotes “234 lessons” (`SiteFooter.tsx:46`) while primary paths expose 53. | Users and search engines see two competing curricula and duplicate content. | Make the seven-track curriculum primary, label legacy material explicitly, and define canonical/sitemap policy for legacy pages. | Count/canonical/sitemap tests; user-facing labels agree. |

## 3. Route/link inventory problems

### Verified inventory

- The emitted static export contains **424 HTML routes**.
- A crawl of every emitted `<a href>` found **zero internal links whose pathname was absent from the emitted route set**.
- Live unknown routes return HTTP 404, including a random path and the unimplemented `/map/...` and `/tools/...` deep paths.
- `/sitemap.xml`, `/robots.txt`, `/sw.js`, and `/opengraph-image` returned HTTP 200 in targeted live checks.
- Canonical lesson, track, blog, tools, paths, and lab pages are emitted by `generateStaticParams`; this is not a missing-static-params problem.

### Problems

1. **Canonical metadata is wrong at scale (SEO-01).** 184 pages inherit the root canonical. This is the largest route-level defect.
2. **Declared production redirects are not observable on the live deployment (ROUTE-02).** `/path`, `/workspace`, and `/encyclopedia` return 200 rather than the configured 301. Client compatibility pages mitigate the user-facing impact, but no-JS/crawler behavior differs from the source comment.
3. **Blueprint deep routes were not implemented (ROUTE-02).** `/map/topics`, `/map/concepts/[concept]`, `/map/primitives`, and `/tools/[toolSlug]` 404. They are not currently linked internally, so this is a product-depth/expectation gap rather than a discovered broken link.
4. **Curriculum IA remains split (ROUTE-03).** `/paths` has 53 lessons; `/learn` has 234 legacy lesson pages; footer and sitemap expose both without a clear primary/secondary label.
5. **No custom not-found route.** Unknown URLs use Next's default 404 rather than SysCraft navigation/recovery.

## 4. State, persistence, quiz, and simulation correctness

### Learner state

- **Hydration itself is SSR-safe:** `loadLearnerState()` returns a fresh default outside the browser and validates persisted JSON before use.
- **Resume restore works:** a live seeded lesson resume at `stepIndex=2` restored “Go to step 3.”
- **The failure is concurrency and migration, not basic parsing.** The store has no revision or cross-tab merge. The reproduced sequence was:
  1. Tab A answered a recall question; history length became 1.
  2. Tab B, hydrated earlier, toggled Ambient.
  3. Tab B committed its stale whole snapshot; history length became 0.
- **Legacy progress is not migrated.** A live seed of `syscraft.completedLessons.v1=["single-server"]` left the new store's completion list empty.
- **Learner-only import is validated**, but the separate full backup importer is not. These two paths must not be conflated.
- **Persistence errors are invisible.** The storage helper catches quota/denial failures while the UI continues to say data is saved.

### Quiz

- Fresh-context empty state works live.
- A seeded eligible topic produced exactly four choices; answering wrote one history entry, and the entry survived reload.
- `selectRecallQuestions` is deterministic for identical `(state, bank, count, nowMs)` inputs, deduplicates by topic/question, filters eligibility, caps history, and updates per-topic FSRS memory.
- The main assessment defect is **answer-position bias**, not selection determinism: current source has 143/244 answers at index 1.
- FSRS due state is only a tie-breaker inside mastery bands (`quizSelect.ts:119-123`); a due, previously correct question ranks below a non-due unseen question. If the intended contract is “due cards first” (`docs/redesign-blueprint.md:1496`), this needs an explicit policy decision/test.
- Eligibility currently means “opened,” because `visitTopic` runs on mount. The UI's “already read” wording and blueprint's active-time/scroll rule are not implemented.

### Simulation and WASM

- The embedded WASM module loads in Node, reports **65,536 bytes**, exposes 96 node slots, and passes existing JS/Rust formula-parity tests.
- The >96-node JavaScript path exists and produced 97 telemetry rows in the probe; the fallback itself is not stubbed.
- Determinism for valid inputs is covered by `simulationCore.test.ts`.
- Numeric totality is not true at hostile boundaries:
  - `MAX_VALUE` replicas/throughput overflow capacity and concurrency to `Infinity`.
  - Extreme latency arithmetic overflows and is sanitized back to `0`, falsely implying instant service.
  - A 97-node fallback with `NaN` replication produced `totalCostPerHourUsd=NaN`.
  - Non-finite LLM prompt/output tokens have different JS and Rust fallback semantics.
- Worker failover does not transfer the worker's queue/cache/circuit/tick state to the main-thread fallback.
- Cycle detection over-damps every edge in a simple directed cycle.
- The DVR ring stores 600 ticks at 20 Hz, or 30 seconds, despite its 60-second comment.

### Canvas/lab architecture dependencies only

- The inspected source preserves the intended structural/telemetry split: `nodeTypes` is module-scope, `ResourceNode` subscribes to one telemetry row, and Rough.js memoization excludes telemetry.
- Canvas and lab interactive workspaces use `dynamic(..., { ssr: false })`; WebRTC, WebLLM, and Mermaid are dynamically imported.
- External scene JSON and peer room payloads bypass the robust autosave sanitizer (CAN-01).
- Lab autosave lacks a global unload flush (LAB-01).
- Error-condition particle scaling is wrong by 100× (CAN-02).
- Runtime canvas UI, drag behavior, and lab grading are intentionally left to the separate Hy4 audit.

## 5. Performance, bundle, and SSR findings

### Measured emitted JavaScript

These are **uncompressed JS bytes referenced by each emitted HTML file**, not wire-transfer sizes. They come from the local `out/` build inspected during this audit; live HTML was checked separately for route behavior and metadata, but compressed transfer budgets were not measured.

| Route | JS bytes | CSS bytes |
| --- | ---: | ---: |
| `/` | 1,563,225 | 121,745 |
| `/tools` | 1,560,112 | 121,745 |
| `/paths/foundations/single-server` | 1,591,233 | 121,745 |
| `/paths` | 2,138,136 | 121,745 |
| `/map` | 2,148,111 | 121,745 |
| `/quiz` | 2,150,966 | 121,745 |
| `/blogs/database-melts-at-10k-rps` | 2,200,785 | 121,745 |
| `/learn` | 2,674,656 | 121,745 |

Primary causes:

- `SiteFooter` imports `CONTENT_COUNTS` from `contentManifest.ts`, pulling legacy registries into the shared client graph.
- `PathPageContent` and `LessonPageContent` import full legacy curriculum/blog registries.
- `PathsIndex`, `TrackLessons`, `KnowledgeMap`, and `QuizDeck` consume full content objects where summaries would suffice.
- Track pages serialize full `Track` objects, including every lesson's steps, security, and quiz bank, to client components that render only summaries.
- `visuals/registry.tsx` statically imports all 21 visualizers.

### SSR/static export

- `next.config.ts` correctly sets `output: "export"` and `images.unoptimized: true`.
- The canvas/lab `ssr: false` loaders are correctly placed in Client Components, matching the installed Next 16 guide.
- All 158 component TSX files begin with `'use client';`.
- The remaining SSR violation is root-level Dexie construction through `layout → BootRunner → db`.
- Default live home requests were same-origin only; no analytics host was observed.

## 6. Known non-issues verified working

These are explicitly **not** reported as bugs:

- `npx tsc --noEmit` passes.
- Full Vitest suite passes: **28 files, 271 tests**.
- `next.config.ts` has the required static-export and unoptimized-image settings.
- All 158 `src/components/**/*.tsx` files have the client directive on line 1.
- Canvas/lab heavy workspaces are client-only dynamically loaded; `nodeTypes` is module-scope; telemetry is not written into React Flow's structural node array; Rough.js memo keys exclude telemetry.
- 424 HTML routes are emitted, and the static internal-link crawl found no missing targets.
- Sitemap, robots, service worker, and Open Graph image return HTTP 200 live.
- The active registry contains 7 tracks, 53 lessons, 8 blogs, and 16 labs; curriculum contract tests pass.
- All current lesson/blog/lab IDs resolve through the bookmark slug map; no duplicate lesson slugs were found.
- Quiz fresh empty state, four-choice rendering, answer recording, and history persistence across reload work live.
- Lesson resume restores the saved step live.
- The capacity estimator updates live: DAU 100,000 → 200,000 changed Average QPS 13.89 → 27.78. The older QA scorecard failure is not reproducible on the current deployment.
- The blog final-step read marker works live for `database-melts-at-10k-rps`. The older QA scorecard failure is not reproducible on the current deployment.
- Calculator unit tests keep capacity, KV-cache, and error-budget outputs finite for negative, zero, huge, NaN, Infinity, and missing inputs.
- WASM is a real embedded module, capped at one 64 KiB page, with formula-parity tests and a real >96-node JS fallback path.
- No Supabase auth, Vercel Analytics, checkout, subscription gate, or paywall code was found. `/signin` and `/signup` are compatibility redirects; `/pricing` explains the free product.
- No product-facing TODO/“coming soon”/lorem stub was found; the curriculum placeholder-text test passes.
- Default live home network requests were only to `sys-craft.vercel.app` in the audited context.
- The targeted live scenarios in this audit produced no same-origin HTTP errors, console errors, hydration warnings, or uncaught page errors.

## 7. Recommended fix order and ownership split

### Fix order

1. **Secure and make data operations atomic:** SEC-01, PER-03, PER-04, PER-02.
2. **Stop progress loss:** PER-01, PER-05, PER-06, LAB-01.
3. **Harden the simulation contract:** SIM-01, SIM-02, then SIM-03/SIM-04.
4. **Fix assessment validity:** QUIZ-01, then QUIZ-02.
5. **Repair static-export and discovery:** SSR-01, SEO-01, NAV-01, ROUTE-02.
6. **Reduce route cost:** PERF-01, using summary DTOs and explicit lazy visual modules.
7. **Harden external topology and visual truth:** CAN-01, CAN-02.
8. **Align public claims and IA:** PRIV-01, MAP-02, ROUTE-03, SEC-02.
9. Re-run the full 271-test baseline plus the new regression tests above, rebuild, crawl every emitted route, and repeat the live Playwright matrix.

### Ownership split

| Owner | Primary work | Joint contracts |
| --- | --- | --- |
| **HungerG** | `db.ts` backup/import/wipe; learner storage/schema/migration; cross-tab merge; `quizSelect`/FSRS policy; `simulationCore`, `queuingMath`, WASM parity; `useSimStore` worker lifecycle; OpenCode bridge auth; Dexie SSR boundary; metadata/canonical generation; lightweight catalog and bundle budgets. | Export a single owned-key registry, a validated backup schema, a topology sanitizer, and a deterministic choice-shuffle helper for UI/content consumers. |
| **Hy4** | Command palette UI/index rendering; settings/learner-data/privacy copy; canvas shared-link and room ingestion UI; lab unload flush integration; particle condition rendering; map IA; branded 404; quiz/content answer-position rebalancing; footer/sitemap labels. | Consume HungerG's core validators/catalog instead of creating parallel implementations. Keep canvas/lab runtime findings in the separate canvas audit and reference CAN-01/LAB-01/CAN-02 as dependencies. |
| **Joint verification** | Two-tab persistence, full backup roundtrip/wipe, hostile simulation parity, worker failure injection, canonical crawl, route bundle budgets, palette coverage, quiz distribution, and privacy host/key inventory. | One shared regression script and one definition-of-done checklist; neither workstream should merge a partial fix that changes the contract without updating the other side. |

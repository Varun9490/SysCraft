# AUTONOMOUS AGENT EXECUTION DIRECTIVE — SYSCANVAS (ZERO-BACKEND SYSTEM DESIGN ENCYCLOPEDIA, SIMULATOR, INTERVIEW WORKBENCH & GAMIFIED SANDBOX)

## 0. AUTONOMOUS OPERATING PROTOCOL (STRICT — READ FIRST)
You are operating in **100% Fully Autonomous Principal Engineer Mode**. You must design, scaffold, implement, verify, test, and polish the entire **SysCanvas** platform from start to finish without pausing for human confirmation.

### Rules of Autonomy:
1. **ZERO HUMAN INTERVENTION:** Do NOT ask clarifying questions. Every architectural, mathematical, UI/UX, and content decision is pre-authorized in this specification. When encountering ambiguity, choose the most production-resilient, local-first, high-performance engineering solution and document it in `ARCHITECTURE.md`.
2. **NO PLACEHOLDERS OR STUBS:** Never write `// TODO`, `// implement later`, `mockData`, or truncated components. Every file you create must contain complete, working, production-ready TypeScript/React code.
3. **STATE MACHINE TRACKING (`PROGRESS.md`):** First, create a `PROGRESS.md` checklist tracking all 8 Execution Milestones. Update `PROGRESS.md` after completing and verifying each milestone so you maintain deterministic context across long execution runs.
4. **CONTINUOUS SELF-HEALING LOOP:** After completing each milestone, autonomously run:
   - `npm run typecheck` (or `npx tsc --noEmit`)
   - `npm run lint`
   - `npm run test` (Vitest unit & simulation math tests)
   - `npm run build`
   If any command fails, read the stack trace, fix the root cause immediately, and re-run until exit code is `0` before moving to the next milestone.
5. **100% BROWSER-NATIVE & ZERO-BACKEND:** The entire application must run client-side in the user's browser (Excalidraw execution model) using Web Workers, IndexedDB, WebAudio, WebRTC (Yjs), and URL-hash LZ compression (`#scene=...`), deployable as a static export.

---

## 1. TECH STACK & PACKAGE DEPENDENCIES
Initialize a clean **Next.js 15 (App Router, `output: 'export'`) + React 19 + TypeScript (Strict Mode)** project with:
- **Canvas & Diagramming:** `@xyflow/react` (v12), `roughjs` (for toggleable Excalidraw hand-drawn sketchy rendering vs. crisp modern engineering mode), `dagre` / `elkjs` (for 1-click Auto-Layout).
- **State & History:** `zustand`, `immer`, `zundo` (temporal undo/redo stack).
- **Local Storage & Sharing:** `dexie` (IndexedDB wrapper for blueprints, custom resources, FSRS flashcard state, and simulation recordings), `lz-string` (URL hash compression), browser `FileSystemAccess API` (`.syscanvas` JSON import/export).
- **Multiplayer Collaboration:** `yjs`, `y-webrtc` (serverless peer-to-peer collaborative rooms for live mock interviews).
- **UI, Styling & Charts:** Tailwind CSS, `lucide-react`, `framer-motion`, `cmdk` (`Cmd+K` command palette), custom lightweight HTML5 Canvas time-series sparklines & flamegraphs.
- **Validation & AI:** `zod` (strict runtime schema validation), client-side AI adapter supporting both `@mlc-ai/web-llm` (WebGPU browser-local LLM) and Bring-Your-Own-Key (BYOK) direct REST calls to Gemini / OpenAI / Anthropic APIs.
- **Testing:** `vitest` for testing queuing math, FSRS scheduling, capacity calculations, and IaC compilers.

---

## 2. COMPLETE REPOSITORY DIRECTORY STRUCTURE
Create and populate the exact modular structure below:

```text
syscanvas/
├── PROGRESS.md
├── ARCHITECTURE.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── src/
│   ├── types/
│   │   ├── resource.ts          # Universal Resource Definition Schema (URDS) + AI/LLM types
│   │   ├── simulation.ts        # DES tick state, M/M/c/K queue metrics, OpenTelemetry span types
│   │   ├── workbench.ts         # 6-Step Workbench (Requirements, BoE Calculator, API, ER Schema)
│   │   ├── encyclopedia.ts      # Visual Almanac articles, FSRS flashcard & quiz schemas
│   │   └── challenges.ts        # 16 Guided Labs, Chaos Scenarios, Post-Mortem & Rubric schemas
│   ├── data/
│   │   ├── seedResources.ts     # 28 complete primitives (Web, Data, Security, + Agentic AI/LLM nodes)
│   │   ├── regionLatency.ts     # Real submarine cable / cloud region ping matrix (ms)
│   │   ├── encyclopediaData.ts  # 19 structured modules + interactive internal algorithm visualizers
│   │   ├── guidedLabs.ts        # 16 step-by-step app labs (Bitly, YouTube, WhatsApp, Razorpay, RAG, etc.)
│   │   └── chaosScenarios.ts    # 20 chaos & incident response scenarios with budgets & SLAs
│   ├── workers/
│   │   └── simulation.worker.ts # 20Hz Discrete-Event Queuing & Token-Stream Simulator + Trace Generator
│   ├── engine/
│   │   ├── queuingMath.ts       # Little's Law, M/M/c/K latency, Kingman's equation, availability math
│   │   ├── traceGenerator.ts    # Generates OpenTelemetry hop-by-hop span waterfalls per request path
│   │   ├── fsrsScheduler.ts     # Free Spaced Repetition Scheduler (FSRS v4) math for quizzes
│   │   ├── iacCompiler.ts       # Compiles Canvas Graph -> Terraform, Docker Compose, K8s, Mermaid, RFC MD
│   │   ├── dslParser.ts         # Bidirectional text-to-diagram DSL parser & serializer
│   │   ├── soundEngine.ts       # Web Audio API procedural sonification (clicks, hums, Geiger error alerts)
│   │   └── aiClient.ts          # WebLLM + BYOK (Gemini/OpenAI/Anthropic) structured JSON & Socratic Reviewer
│   ├── store/
│   │   ├── useCanvasStore.ts    # Nodes, edges, semantic zoom level, Rough.js toggle, A/B diff state
│   │   ├── useSimStore.ts       # Live telemetry ring buffer (60s DVR history), chaos flags, traces
│   │   ├── useWorkbenchStore.ts # BoE capacity calculator, API contracts, ER schemas, interview timer
│   │   └── useLearningStore.ts  # FSRS deck progress, unlocked skill constellation DAG, lab progress
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── SystemCanvas.tsx         # Main infinite canvas with Semantic Zoom & Region Zones
│   │   │   ├── ResourceNode.tsx         # Custom node with live RPS/TPS, CPU%, P99, and Rough.js mode
│   │   │   ├── RegionGroupNode.tsx      # Cloud region boundary (us-east-1, ap-south-1, eu-central-1)
│   │   │   ├── TrafficParticleLayer.tsx # 60 FPS HTML5 Canvas overlay rendering 10k+ request packets
│   │   │   ├── InternalSimModal.tsx     # C4 Zoom-In: B-Tree vs LSM, Raft Consensus, Consistent Hash Ring
│   │   │   └── FloatingToolbar.tsx      # Excalidraw-style top island + single-key bindings + Chaos Bar
│   │   ├── workbench/
│   │   │   ├── DesignWorkbench.tsx      # 6-Step Interview & Engineering Workbench sidebar
│   │   │   ├── BoECalculator.tsx        # Back-of-the-Envelope QPS/Storage/Bandwidth/Token calculator
│   │   │   ├── ApiContractBuilder.tsx   # REST/gRPC/GraphQL/WebSocket endpoint designer
│   │   │   ├── DataModelDesigner.tsx    # SQL/NoSQL schema & partition key analyzer
│   │   │   └── SocraticInterviewer.tsx  # Adversarial Staff Engineer AI Interviewer + Voice Mode + Rubric
│   │   ├── telemetry/
│   │   │   ├── TelemetryDrawer.tsx      # Grafana-style P50/P95/P99, RPS, Error Burn & FinOps Cost charts
│   │   │   ├── TraceWaterfallModal.tsx  # Jaeger/OpenTelemetry hop-by-hop request latency flamegraph
│   │   │   ├── TimeTravelScrubber.tsx   # DVR replay bar to scrub/rewind traffic spikes frame-by-frame
│   │   │   └── PostMortemModal.tsx      # Auto-generated SRE Blameless Post-Mortem RCA report
│   │   ├── studio/
│   │   │   ├── CustomResourceStudio.tsx # Create/edit custom resource types + AI Text-to-Resource compiler
│   │   │   └── IaCExportModal.tsx       # Live Mermaid/DSL sync + Terraform, Docker, K8s & RFC export
│   │   ├── encyclopedia/
│   │   │   ├── VisualAlmanac.tsx        # 19-module encyclopedia browser with live interactive sandboxes
│   │   │   ├── SkillConstellation.tsx   # Visual DAG of system design concepts + FSRS review queue
│   │   │   └── ContextualQuizCard.tsx   # Scenario-based quiz widget with FSRS rating buttons
│   │   └── games/
│   │       ├── GuidedLabRunner.tsx      # Step-by-step interactive lab engine (16 real-world systems)
│   │       └── IncidentArena.tsx        # Timed outage response games with budget/SLA leaderboards
│   └── app/
│       ├── layout.tsx
│       └── page.tsx                     # Unified workspace with instant keyboard navigation & Cmd+K

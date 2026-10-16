import { create } from "zustand";
import type {
  ApiRoute,
  BoEParams,
  BoEResult,
  Entity,
  FunctionalRequirement,
  InterviewLevel,
  InterviewRubric,
  NonFunctionalRequirement,
  RubricDimension,
  WorkbenchStep,
} from "@/types/workbench";

/**
 * 6-step interview & engineering workbench store (Milestone 3).
 * Steps: requirements → back-of-envelope → API contracts → data model →
 * high-level design → deep dives + rubric. The BoE calculator is a pure
 * exported function so the canvas inspector and Vitest share one path.
 */

export const SECONDS_PER_DAY = 86400;
export const BYTES_PER_GB = 1024 ** 3;

function makeId(prefix: string): string {
  const rand = Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, "0");
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

/** Pure BoE capacity model shared by BoECalculator and canvas badges. */
export function computeBoE(params: BoEParams): BoEResult {
  const dau = Math.max(1, params.dailyActiveUsers);
  const readsPerUser = Math.max(0, params.readsPerUserPerDay);
  const writesPerUser = Math.max(0, params.writesPerUserPerDay);
  const readQpsAvg = (dau * readsPerUser) / SECONDS_PER_DAY;
  const writeQpsAvg = (dau * writesPerUser) / SECONDS_PER_DAY;
  const peak = Math.max(1, params.peakFactor);
  const readQpsPeak = readQpsAvg * peak;
  const writeQpsPeak = writeQpsAvg * peak;

  const readBytesPerDay = dau * readsPerUser * Math.max(0.01, params.avgReadSizeKb) * 1024;
  const writeBytesPerDay = dau * writesPerUser * Math.max(0.01, params.avgWriteSizeKb) * 1024;
  const retention = Math.max(1, Math.floor(params.retentionDays));
  const copies = Math.max(1, Math.floor(params.replicationCopies));
  const storageBytesTotal = writeBytesPerDay * retention * copies;
  const storageGbTotal = storageBytesTotal / BYTES_PER_GB;
  const storageTbPerDay = writeBytesPerDay * copies / BYTES_PER_GB / 1024;
  const bandwidthTbPerDay = (readBytesPerDay + writeBytesPerDay) * peak / BYTES_PER_GB / 1024;

  const peakQps = readQpsPeak + writeQpsPeak;
  const egressMbpsPeak = (readBytesPerDay * peak) / SECONDS_PER_DAY / (1024 * 1024) * 8;
  const ingressMbpsPeak = (writeBytesPerDay * peak) / SECONDS_PER_DAY / (1024 * 1024) * 8;
  const estimatedNodes = Math.max(1, Math.ceil(peakQps / 8000) + Math.ceil(storageGbTotal / 2000));
  const monthlyCostUsd = estimatedNodes * 730 * 0.096 + storageGbTotal * 0.023;

  return {
    readQpsAvg,
    writeQpsAvg,
    readQpsPeak,
    writeQpsPeak,
    ingressMbpsPeak,
    egressMbpsPeak,
    storageGbTotal,
    storageTbPerDay,
    bandwidthTbPerDay,
    estimatedNodes,
    monthlyCostUsd,
  };
}

export function defaultRubric(level: InterviewLevel = "L5"): InterviewRubric {
  const dimensions: RubricDimension[] = [
    { key: "requirements", label: "Requirements & scoping", score: 0, feedback: "" },
    { key: "estimation", label: "Back-of-envelope estimation", score: 0, feedback: "" },
    { key: "api_design", label: "API & interface design", score: 0, feedback: "" },
    { key: "data_model", label: "Data modeling & partitioning", score: 0, feedback: "" },
    { key: "high_level", label: "High-level architecture", score: 0, feedback: "" },
    { key: "deep_dive", label: "Deep dives & trade-offs", score: 0, feedback: "" },
  ];
  return { level, dimensions, overallScore: 0, hireSignal: "no", summary: "" };
}

interface WorkbenchActions {
  setStep: (step: WorkbenchStep) => void;
  addFunctional: (text: string) => void;
  toggleFunctional: (id: string) => void;
  removeFunctional: (id: string) => void;
  setNonFunctional: (partial: Partial<NonFunctionalRequirement>) => void;
  setBoeParams: (partial: Partial<BoEParams>) => void;
  recomputeBoE: () => void;
  addApiRoute: (route: Omit<ApiRoute, "id">) => string;
  updateApiRoute: (id: string, partial: Partial<ApiRoute>) => void;
  removeApiRoute: (id: string) => void;
  addEntity: (entity: Omit<Entity, "id">) => string;
  updateEntity: (id: string, partial: Partial<Entity>) => void;
  removeEntity: (id: string) => void;
  setHighLevelNotes: (notes: string) => void;
  setDeepDiveNotes: (notes: string) => void;
  setRubricScore: (key: string, score: number, feedback?: string) => void;
  setRubricLevel: (level: InterviewLevel) => void;
  setRubricSummary: (summary: string) => void;
  timerStart: () => void;
  timerPause: () => void;
  timerReset: (seconds?: number) => void;
  timerTick: () => void;
  resetAll: () => void;
}

interface WorkbenchStoreState extends WorkbenchActions {
  activeStep: WorkbenchStep;
  functional: FunctionalRequirement[];
  nonFunctional: NonFunctionalRequirement;
  boeParams: BoEParams;
  boeResult: BoEResult | null;
  apiRoutes: ApiRoute[];
  entities: Entity[];
  highLevelNotes: string;
  deepDiveNotes: string;
  rubric: InterviewRubric;
  timerSecondsRemaining: number;
  timerRunning: boolean;
}

const DEFAULT_BOE: BoEParams = {
  dailyActiveUsers: 10_000_000,
  readsPerUserPerDay: 20,
  writesPerUserPerDay: 2,
  avgReadSizeKb: 4,
  avgWriteSizeKb: 2,
  readWriteRatio: "10:1",
  retentionDays: 365,
  replicationCopies: 3,
  peakFactor: 3,
};

function initialState(): Omit<WorkbenchStoreState, keyof WorkbenchActions> {
  return {
    activeStep: "requirements",
    functional: [
      { id: makeId("fr"), text: "Users can create and share short links with custom aliases", priority: "must", done: false },
      { id: makeId("fr"), text: "Click analytics with per-link time series", priority: "should", done: false },
    ],
    nonFunctional: {
      availabilityTarget: 0.999,
      p99LatencyMs: 300,
      durabilityTarget: 0.99999999999,
      compliance: ["SOC2"],
    },
    boeParams: { ...DEFAULT_BOE },
    boeResult: computeBoE({ ...DEFAULT_BOE }),
    apiRoutes: [
      {
        id: makeId("api"),
        method: "POST",
        path: "/v1/links",
        description: "Create a short link",
        auth: "jwt",
        rateLimitRps: 1000,
        requestSchema: '{"url":"string","alias?":"string"}',
        responseSchema: '{"shortUrl":"string","createdAt":"string"}',
        p99BudgetMs: 250,
      },
      {
        id: makeId("api"),
        method: "GET",
        path: "/{alias}",
        description: "Resolve and redirect",
        auth: "none",
        rateLimitRps: 10000,
        requestSchema: "{}",
        responseSchema: "302 redirect",
        p99BudgetMs: 80,
      },
    ],
    entities: [
      {
        id: makeId("ent"),
        table: "links",
        engine: "cassandra",
        columns: [
          { name: "alias", type: "text", nullable: false, isPartitionKey: true, isSortKey: false },
          { name: "url", type: "text", nullable: false, isPartitionKey: false, isSortKey: false },
          { name: "created_at", type: "timestamp", nullable: false, isPartitionKey: false, isSortKey: true },
        ],
        estimatedRows: 1_000_000_000,
        readQps: 20000,
        writeQps: 2000,
        notes: "Alias is the partition key; wide-row time series live in a separate table.",
      },
    ],
    highLevelNotes: "## High-level design\n\nClient → CDN → API gateway → link service → (cache → store). Writes are async-replicated; reads prefer cache with stale-while-revalidate.",
    deepDiveNotes: "## Deep dives\n\n- Alias generator: base-62 counter + KGS range allocator.\n- Hot aliases: replicated cache shards + request coalescing.\n- Analytics: Kafka → ClickHouse rollups, 13-month retention.",
    rubric: defaultRubric("L5"),
    timerSecondsRemaining: 2700,
    timerRunning: false,
  };
}

export const useWorkbenchStore = create<WorkbenchStoreState>()((set, get) => ({
  ...initialState(),

  setStep: (step) => set({ activeStep: step }),

  addFunctional: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    set((state) => ({
      functional: [...state.functional, { id: makeId("fr"), text: trimmed, priority: "must" as const, done: false }],
    }));
  },

  toggleFunctional: (id) => {
    set((state) => ({
      functional: state.functional.map((req) => (req.id === id ? { ...req, done: !req.done } : req)),
    }));
  },

  removeFunctional: (id) => {
    set((state) => ({ functional: state.functional.filter((req) => req.id !== id) }));
  },

  setNonFunctional: (partial) => {
    set((state) => ({ nonFunctional: { ...state.nonFunctional, ...partial } }));
  },

  setBoeParams: (partial) => {
    set((state) => {
      const boeParams = { ...state.boeParams, ...partial };
      return { boeParams, boeResult: computeBoE(boeParams) };
    });
  },

  recomputeBoE: () => {
    set((state) => ({ boeResult: computeBoE(state.boeParams) }));
  },

  addApiRoute: (route) => {
    const id = makeId("api");
    set((state) => ({ apiRoutes: [...state.apiRoutes, { ...route, id }] }));
    return id;
  },

  updateApiRoute: (id, partial) => {
    set((state) => ({
      apiRoutes: state.apiRoutes.map((route) => (route.id === id ? { ...route, ...partial } : route)),
    }));
  },

  removeApiRoute: (id) => {
    set((state) => ({ apiRoutes: state.apiRoutes.filter((route) => route.id !== id) }));
  },

  addEntity: (entity) => {
    const id = makeId("ent");
    set((state) => ({ entities: [...state.entities, { ...entity, id }] }));
    return id;
  },

  updateEntity: (id, partial) => {
    set((state) => ({
      entities: state.entities.map((entity) => (entity.id === id ? { ...entity, ...partial } : entity)),
    }));
  },

  removeEntity: (id) => {
    set((state) => ({ entities: state.entities.filter((entity) => entity.id !== id) }));
  },

  setHighLevelNotes: (notes) => set({ highLevelNotes: notes }),
  setDeepDiveNotes: (notes) => set({ deepDiveNotes: notes }),

  setRubricScore: (key, score, feedback) => {
    set((state) => {
      const clamped = Math.max(0, Math.min(4, Math.floor(score)));
      const dimensions = state.rubric.dimensions.map((dim) =>
        dim.key === key ? { ...dim, score: clamped, feedback: feedback ?? dim.feedback } : dim,
      );
      const overallScore = dimensions.length > 0
        ? dimensions.reduce((sum, dim) => sum + dim.score, 0) / dimensions.length
        : 0;
      const hireSignal = overallScore >= 3.5 ? "strong_yes" : overallScore >= 2.75 ? "yes" : overallScore >= 2 ? "lean_yes" : overallScore >= 1 ? "no" : "strong_no";
      return { rubric: { ...state.rubric, dimensions, overallScore, hireSignal } };
    });
  },

  setRubricLevel: (level) => {
    set((state) => ({ rubric: { ...state.rubric, level } }));
  },

  setRubricSummary: (summary) => {
    set((state) => ({ rubric: { ...state.rubric, summary } }));
  },

  timerStart: () => set({ timerRunning: true }),
  timerPause: () => set({ timerRunning: false }),
  timerReset: (seconds = 2700) => set({ timerSecondsRemaining: Math.max(0, Math.floor(seconds)), timerRunning: false }),
  timerTick: () => {
    const { timerRunning, timerSecondsRemaining } = get();
    if (!timerRunning || timerSecondsRemaining <= 0) return;
    set({ timerSecondsRemaining: timerSecondsRemaining - 1, timerRunning: timerSecondsRemaining - 1 > 0 });
  },

  resetAll: () => set({ ...initialState() }),
}));

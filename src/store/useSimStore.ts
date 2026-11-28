import { create } from "zustand";
import type { ChaosState, EdgeFlow, GraphTopology, NodeTelemetry, SimTickSnapshot, TraceWaterfall } from "@/types/simulation";
import {
  createInitialEngineState,
  stepSimulationTick,
  type SimulationEngineState,
} from "@/engine/simulationCore";
import { generateTraceWaterfall } from "@/engine/traceGenerator";
import type { SimulationWorkerRequest, SimulationWorkerResponse } from "@/workers/simulation.worker";
import { saveSimRecording } from "./db";

/**
 * Live simulation telemetry store (Milestone 3).
 *
 * Telemetry separation contract (see agents.md §3):
 * - `simSnapshotRef` (module mutable) receives EVERY 20Hz worker/fallback tick
 *   and is read directly by `TrafficParticleLayer`'s requestAnimationFrame loop.
 * - Zustand telemetry syncs at most every 100ms (10Hz).
 * - `history` is sampled on that 10Hz UI cadence: 600 entries = 60 seconds.
 *
 * `stopSimulation` is also the workspace-unmount cleanup hook. A Worker does
 * not expose its private queue/cache/circuit state, so teardown terminates it
 * and explicitly resets the main-thread engine instead of handing off stale
 * state. Worker failure uses the same reset before starting the fallback.
 */

export const simSnapshotRef: { current: SimTickSnapshot | null } = { current: null };

export const UI_SYNC_MS = 100;
export const FALLBACK_TICK_MS = 50;
export const HISTORY_CAP = 600;
export const HISTORY_WINDOW_MS = 60_000;
// Must match TRACE_EVERY_TICKS in simulation.worker.ts without importing that
// Worker-only module into the main-thread bundle.
export const FALLBACK_TRACE_EVERY_TICKS = 20;

export const DEFAULT_CHAOS: ChaosState = {
  active: false,
  kind: "none",
  capacityPenalty: 0,
  latencyPenaltyMs: 0,
  targetNodeIds: [],
  targetRegion: null,
  startedAtTick: 0,
};

interface SimState {
  running: boolean;
  useWorker: boolean;
  workerReady: boolean;
  workerError: string | null;
  tick: number;
  nodeTelemetry: Record<string, NodeTelemetry>;
  edgeFlows: Record<string, EdgeFlow>;
  history: SimTickSnapshot[];
  chaos: ChaosState;
  globalRps: number;
  globalP99Ms: number;
  globalErrorRate: number;
  totalCostPerHourUsd: number;
  latestTrace: TraceWaterfall | null;
  recording: boolean;
  recordedCount: number;

  startSimulation: (getTopology: () => GraphTopology) => void;
  stopSimulation: () => void;
  syncTopology: () => void;
  setChaos: (partial: Partial<ChaosState>) => void;
  clearChaos: () => void;
  generateTrace: (topology: GraphTopology) => void;
  resetEngine: () => void;
  clearHistory: () => void;
  startRecording: () => void;
  stopRecordingAndSave: (name: string) => Promise<boolean>;
}

type TopologyProvider = () => GraphTopology;

let worker: Worker | null = null;
let fallbackTimer: ReturnType<typeof setInterval> | null = null;
let fallbackOwner: object | null = null;
let topologyProvider: TopologyProvider | null = null;
let engineState: SimulationEngineState = createInitialEngineState();
let lastUiSyncMs = 0;
let recordedTicks: SimTickSnapshot[] = [];
let currentChaos: ChaosState = { ...DEFAULT_CHAOS };
/** Invalidated on every start, stop, and failover to reject stale callbacks. */
let sessionGeneration = 0;

function createWorker(): Worker | null {
  if (typeof window === "undefined") return null;
  try {
    return new Worker(
      new URL("../workers/simulation.worker.ts", import.meta.url),
      { type: "module" },
    );
  } catch {
    return null;
  }
}

function detachWorker(candidate: Worker | null): void {
  if (!candidate) return;
  if (worker === candidate) worker = null;
  candidate.onmessage = null;
  candidate.onerror = null;
  candidate.onmessageerror = null;
  try {
    candidate.terminate();
  } catch {
    /* already torn down */
  }
}

function currentTopology(): GraphTopology {
  if (topologyProvider) {
    try {
      return topologyProvider();
    } catch {
      return { nodes: [], edges: [] };
    }
  }
  return { nodes: [], edges: [] };
}

export const useSimStore = create<SimState>()((set, get) => {
  function handleSnapshot(
    snapshot: SimTickSnapshot,
    trace: TraceWaterfall | null,
    generation: number,
  ): void {
    if (generation !== sessionGeneration || !get().running) return;
    simSnapshotRef.current = snapshot;
    if (get().recording) {
      recordedTicks.push(snapshot);
      if (recordedTicks.length > 3600) recordedTicks.shift();
    }

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (!trace && now - lastUiSyncMs < UI_SYNC_MS) return;
    lastUiSyncMs = now;

    const state = get();
    const nextHistory = [...state.history, snapshot];
    if (nextHistory.length > HISTORY_CAP) {
      nextHistory.splice(0, nextHistory.length - HISTORY_CAP);
    }
    set({
      tick: snapshot.tick,
      nodeTelemetry: snapshot.nodes,
      edgeFlows: snapshot.edges,
      history: nextHistory,
      globalRps: snapshot.globalRps,
      globalP99Ms: snapshot.globalP99Ms,
      globalErrorRate: snapshot.globalErrorRate,
      totalCostPerHourUsd: snapshot.totalCostPerHourUsd,
      latestTrace: trace ?? state.latestTrace,
      recordedCount: recordedTicks.length,
    });
  }

  function stopFallbackLoop(): void {
    fallbackOwner = null;
    if (fallbackTimer !== null) {
      clearInterval(fallbackTimer);
      fallbackTimer = null;
    }
  }

  function startFallbackLoop(): void {
    if (fallbackTimer !== null || !get().running || get().useWorker) return;
    const generation = sessionGeneration;
    const owner = {};
    fallbackOwner = owner;
    fallbackTimer = setInterval(() => {
      if (
        fallbackOwner !== owner ||
        generation !== sessionGeneration ||
        !get().running ||
        get().useWorker
      ) {
        return;
      }
      const topology = currentTopology();
      const result = stepSimulationTick(topology, currentChaos, engineState);
      engineState = result.nextState;
      const trace = result.snapshot.tick % FALLBACK_TRACE_EVERY_TICKS === 0
        ? generateTraceWaterfall(result.snapshot, topology)
        : null;
      handleSnapshot(result.snapshot, trace, generation);
    }, FALLBACK_TICK_MS);
  }

  function failoverWorker(candidate: Worker): void {
    if (worker !== candidate || !get().running || !get().useWorker) return;
    sessionGeneration += 1;
    detachWorker(candidate);
    stopFallbackLoop();
    // The worker's private engine state cannot be cloned. Reset explicitly so
    // fallback queues/cache/circuits never inherit an unknown tick state.
    engineState = createInitialEngineState();
    simSnapshotRef.current = null;
    lastUiSyncMs = 0;
    set({
      useWorker: false,
      workerReady: false,
      workerError: "Simulation worker failed; running on main-thread fallback.",
    });
    startFallbackLoop();
  }

  function postToWorker(message: SimulationWorkerRequest, candidate: Worker | null = worker): boolean {
    if (!candidate) return false;
    try {
      candidate.postMessage(message);
      return true;
    } catch {
      if (candidate === worker) failoverWorker(candidate);
      return false;
    }
  }

  return {
    running: false,
    useWorker: false,
    workerReady: false,
    workerError: null,
    tick: 0,
    nodeTelemetry: {},
    edgeFlows: {},
    history: [],
    chaos: { ...DEFAULT_CHAOS },
    globalRps: 0,
    globalP99Ms: 0,
    globalErrorRate: 0,
    totalCostPerHourUsd: 0,
    latestTrace: null,
    recording: false,
    recordedCount: 0,

    startSimulation: (getTopology) => {
      topologyProvider = getTopology;

      // A live session is idempotent: resume messages retain worker state.
      if (get().running) {
        if (worker && get().useWorker) {
          postToWorker({ type: "start", topology: currentTopology(), chaos: { ...currentChaos } });
          return;
        }
        if (fallbackTimer !== null && !get().useWorker) return;
      }

      lastUiSyncMs = 0;
      const generation = ++sessionGeneration;
      stopFallbackLoop();
      detachWorker(worker);
      engineState = createInitialEngineState();
      simSnapshotRef.current = null;
      // A new session starts at tick zero; keep active chaos anchored to it.
      currentChaos = { ...currentChaos, startedAtTick: 0 };
      set({
        running: true,
        workerError: null,
        workerReady: false,
        chaos: { ...currentChaos },
      });

      const candidate = createWorker();
      if (!candidate) {
        set({ useWorker: false });
        startFallbackLoop();
        return;
      }

      worker = candidate;
      set({ useWorker: true });
      candidate.onmessage = (event: MessageEvent<SimulationWorkerResponse>) => {
        if (worker !== candidate || generation !== sessionGeneration || !get().running) return;
        const message = event.data;
        if (message.type === "ready") {
          set({ workerReady: true, useWorker: true });
          postToWorker({ type: "start", topology: currentTopology(), chaos: { ...currentChaos } }, candidate);
          return;
        }
        if (message.type === "snapshot") {
          handleSnapshot(message.snapshot, message.trace, generation);
        }
      };
      candidate.onerror = () => failoverWorker(candidate);
      candidate.onmessageerror = () => failoverWorker(candidate);
      postToWorker({ type: "start", topology: currentTopology(), chaos: { ...currentChaos } }, candidate);
    },

    stopSimulation: () => {
      sessionGeneration += 1;
      detachWorker(worker);
      stopFallbackLoop();
      engineState = createInitialEngineState();
      simSnapshotRef.current = null;
      topologyProvider = null;
      lastUiSyncMs = 0;
      set({
        running: false,
        useWorker: false,
        workerReady: false,
        workerError: null,
      });
    },

    syncTopology: () => {
      postToWorker({ type: "topology", topology: currentTopology() });
    },

    setChaos: (partial) => {
      currentChaos = {
        ...currentChaos,
        ...partial,
        targetNodeIds: partial.targetNodeIds ?? currentChaos.targetNodeIds,
      };
      set({ chaos: { ...currentChaos } });
      postToWorker({ type: "chaos", chaos: { ...currentChaos } });
    },

    clearChaos: () => {
      currentChaos = { ...DEFAULT_CHAOS };
      set({ chaos: { ...DEFAULT_CHAOS } });
      postToWorker({ type: "chaos", chaos: { ...currentChaos } });
    },

    generateTrace: (topology) => {
      const snapshot = simSnapshotRef.current;
      if (!snapshot) return;
      set({ latestTrace: generateTraceWaterfall(snapshot, topology) });
    },

    resetEngine: () => {
      engineState = createInitialEngineState();
      postToWorker({ type: "reset" });
      simSnapshotRef.current = null;
      lastUiSyncMs = 0;
      set({
        tick: 0,
        nodeTelemetry: {},
        edgeFlows: {},
        history: [],
        globalRps: 0,
        globalP99Ms: 0,
        globalErrorRate: 0,
        totalCostPerHourUsd: 0,
        latestTrace: null,
      });
    },

    clearHistory: () => set({ history: [] }),

    startRecording: () => {
      recordedTicks = [];
      set({ recording: true, recordedCount: 0 });
    },

    stopRecordingAndSave: async (name) => {
      const ticks = [...recordedTicks];
      const payload = JSON.stringify({ version: 1, ticks });
      const ok = await saveSimRecording(name, payload, ticks.length);
      recordedTicks = [];
      set({ recording: false, recordedCount: 0 });
      return ok;
    },
  };
});

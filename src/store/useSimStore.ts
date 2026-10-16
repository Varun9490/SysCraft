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
 * - `simSnapshotRef` (module mutable) receives EVERY 20Hz worker tick and is
 *   read directly by `TrafficParticleLayer`'s requestAnimationFrame loop.
 * - Zustand state (`nodeTelemetry` / `edgeFlows`) syncs at most every 100ms
 *   (10Hz) so node chrome badges never churn React Flow's render path.
 * - `history` keeps a 60s DVR ring (600 entries at the 10Hz UI cadence).
 */

export const simSnapshotRef: { current: SimTickSnapshot | null } = { current: null };

export const UI_SYNC_MS = 100;
export const FALLBACK_TICK_MS = 50;
export const HISTORY_CAP = 600;

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
let topologyProvider: TopologyProvider | null = null;
let engineState: SimulationEngineState = createInitialEngineState();
let lastUiSyncMs = 0;
let recordedTicks: SimTickSnapshot[] = [];
let currentChaos: ChaosState = { ...DEFAULT_CHAOS };

function createWorker(): Worker | null {
  if (typeof window === "undefined") return null;
  try {
    const candidate = new Worker(
      new URL("../workers/simulation.worker.ts", import.meta.url),
      { type: "module" },
    );
    return candidate;
  } catch {
    return null;
  }
}

function postToWorker(message: SimulationWorkerRequest): void {
  if (worker) {
    try {
      worker.postMessage(message);
    } catch {
      /* worker channel broken; fallback loop keeps authoritative state */
    }
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
  function handleSnapshot(snapshot: SimTickSnapshot, trace: TraceWaterfall | null): void {
    simSnapshotRef.current = snapshot;
    if (get().recording) {
      recordedTicks.push(snapshot);
      if (recordedTicks.length > 3600) recordedTicks.shift();
    }
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const state = get();
    const nextHistory = [...state.history, snapshot];
    if (nextHistory.length > HISTORY_CAP) {
      nextHistory.splice(0, nextHistory.length - HISTORY_CAP);
    }
    if (trace) {
      set({
        tick: snapshot.tick,
        nodeTelemetry: snapshot.nodes,
        edgeFlows: snapshot.edges,
        history: nextHistory,
        globalRps: snapshot.globalRps,
        globalP99Ms: snapshot.globalP99Ms,
        globalErrorRate: snapshot.globalErrorRate,
        totalCostPerHourUsd: snapshot.totalCostPerHourUsd,
        latestTrace: trace,
        recordedCount: recordedTicks.length,
      });
      lastUiSyncMs = now;
      return;
    }
    if (now - lastUiSyncMs < UI_SYNC_MS) return;
    lastUiSyncMs = now;
    set({
      tick: snapshot.tick,
      nodeTelemetry: snapshot.nodes,
      edgeFlows: snapshot.edges,
      history: nextHistory,
      globalRps: snapshot.globalRps,
      globalP99Ms: snapshot.globalP99Ms,
      globalErrorRate: snapshot.globalErrorRate,
      totalCostPerHourUsd: snapshot.totalCostPerHourUsd,
      recordedCount: recordedTicks.length,
    });
  }

  function startFallbackLoop(): void {
    if (fallbackTimer !== null) return;
    fallbackTimer = setInterval(() => {
      const result = stepSimulationTick(currentTopology(), currentChaos, engineState);
      engineState = result.nextState;
      handleSnapshot(result.snapshot, null);
    }, FALLBACK_TICK_MS);
  }

  function stopFallbackLoop(): void {
    if (fallbackTimer !== null) {
      clearInterval(fallbackTimer);
      fallbackTimer = null;
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
      engineState = createInitialEngineState();
      lastUiSyncMs = 0;
      set({ running: true, workerError: null });

      const candidate = createWorker();
      if (candidate) {
        if (worker) {
          try {
            worker.terminate();
          } catch {
            /* already torn down */
          }
        }
        worker = candidate;
        stopFallbackLoop();
        worker.onmessage = (event: MessageEvent<SimulationWorkerResponse>) => {
          const message = event.data;
          if (message.type === "ready") {
            set({ workerReady: true, useWorker: true });
            postToWorker({ type: "start", topology: currentTopology(), chaos: currentChaos });
            return;
          }
          if (message.type === "snapshot") {
            handleSnapshot(message.snapshot, message.trace);
          }
        };
        worker.onerror = () => {
          set({ workerError: "Simulation worker failed; running on main-thread fallback.", useWorker: false });
          try {
            worker?.terminate();
          } catch {
            /* ignore */
          }
          worker = null;
          startFallbackLoop();
        };
        postToWorker({ type: "start", topology: currentTopology(), chaos: currentChaos });
      } else {
        set({ useWorker: false });
        startFallbackLoop();
      }
    },

    stopSimulation: () => {
      postToWorker({ type: "stop" });
      stopFallbackLoop();
      set({ running: false });
    },

    syncTopology: () => {
      const topology = currentTopology();
      postToWorker({ type: "topology", topology });
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
      postToWorker({ type: "chaos", chaos: { ...DEFAULT_CHAOS } });
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
      const payload = JSON.stringify({ version: 1, ticks: recordedTicks });
      const ok = await saveSimRecording(name, payload, recordedTicks.length);
      recordedTicks = [];
      set({ recording: false, recordedCount: 0 });
      return ok;
    },
  };
});

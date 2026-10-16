/// <reference lib="dom" />
import type {
  ChaosState,
  GraphTopology,
  SimTickSnapshot,
  TraceWaterfall,
} from "@/types/simulation";
import { createInitialEngineState, stepSimulationTick, type SimulationEngineState } from "@/engine/simulationCore";
import { generateTraceWaterfall } from "@/engine/traceGenerator";

/**
 * 20Hz discrete-event simulation Web Worker.
 *
 * Main thread protocol (all messages are plain structured-cloneable JSON):
 *   { type: "start", topology?, chaos? }  — begin the 50ms tick loop
 *   { type: "stop" }                      — halt the loop (state retained)
 *   { type: "topology", topology }        — hot-swap graph, keep engine state
 *   { type: "chaos", chaos }              — hot-swap chaos flags
 *   { type: "reset" }                     — zero engine state, keep topology
 *   { type: "tick-once" }                 — compute exactly one tick and post
 *
 * Outbound:
 *   { type: "ready" }
 *   { type: "snapshot", snapshot, trace? } — trace attached every 20th tick
 *
 * If `new Worker(...)` construction ever throws (restricted iframe), the
 * main-thread `useSimStore` falls back to calling `stepSimulationTick` on a
 * 50ms interval with identical semantics.
 */

export const WORKER_TICK_MS = 50;
export const TRACE_EVERY_TICKS = 20;

export interface SimulationWorkerStart {
  type: "start";
  topology?: GraphTopology;
  chaos?: ChaosState;
}

export interface SimulationWorkerStop {
  type: "stop";
}

export interface SimulationWorkerTopology {
  type: "topology";
  topology: GraphTopology;
}

export interface SimulationWorkerChaos {
  type: "chaos";
  chaos: ChaosState;
}

export interface SimulationWorkerReset {
  type: "reset";
}

export interface SimulationWorkerTickOnce {
  type: "tick-once";
}

export type SimulationWorkerRequest =
  | SimulationWorkerStart
  | SimulationWorkerStop
  | SimulationWorkerTopology
  | SimulationWorkerChaos
  | SimulationWorkerReset
  | SimulationWorkerTickOnce;

export interface SimulationWorkerSnapshot {
  type: "snapshot";
  snapshot: SimTickSnapshot;
  trace: TraceWaterfall | null;
}

export interface SimulationWorkerReady {
  type: "ready";
}

export type SimulationWorkerResponse = SimulationWorkerSnapshot | SimulationWorkerReady;

const scope = self as unknown as {
  postMessage(message: SimulationWorkerResponse): void;
  onmessage: ((event: MessageEvent<SimulationWorkerRequest>) => void) | null;
};

let topology: GraphTopology = { nodes: [], edges: [] };
let chaos: ChaosState = {
  active: false,
  kind: "none",
  capacityPenalty: 0,
  latencyPenaltyMs: 0,
  targetNodeIds: [],
  targetRegion: null,
  startedAtTick: 0,
};
let engineState: SimulationEngineState = createInitialEngineState();
let timer: ReturnType<typeof setInterval> | null = null;
let lastSnapshot: SimTickSnapshot | null = null;

function postSnapshot(attachTrace: boolean): void {
  if (!lastSnapshot) return;
  scope.postMessage({
    type: "snapshot",
    snapshot: lastSnapshot,
    trace: attachTrace ? generateTraceWaterfall(lastSnapshot, topology) : null,
  });
}

function doTick(): void {
  const result = stepSimulationTick(topology, chaos, engineState);
  engineState = result.nextState;
  lastSnapshot = result.snapshot;
  postSnapshot(result.snapshot.tick % TRACE_EVERY_TICKS === 0);
}

function startLoop(): void {
  if (timer !== null) return;
  timer = setInterval(doTick, WORKER_TICK_MS);
}

function stopLoop(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

scope.onmessage = (event: MessageEvent<SimulationWorkerRequest>): void => {
  const message = event.data;
  switch (message.type) {
    case "start":
      if (message.topology) topology = message.topology;
      if (message.chaos) chaos = message.chaos;
      startLoop();
      break;
    case "stop":
      stopLoop();
      break;
    case "topology":
      topology = message.topology;
      break;
    case "chaos":
      chaos = message.chaos;
      break;
    case "reset":
      engineState = createInitialEngineState();
      lastSnapshot = null;
      break;
    case "tick-once":
      doTick();
      break;
    default:
      break;
  }
};

scope.postMessage({ type: "ready" });

import type {
  GraphTopology,
  SimTickSnapshot,
  TraceSpan,
  TraceWaterfall,
} from "@/types/simulation";

/**
 * OpenTelemetry hop-by-hop waterfall span synthesizer.
 *
 * Builds a Jaeger-style trace by walking the highest-RPS path through the
 * latest simulation snapshot. Error sampling is deterministic (hash of
 * traceId + nodeId) so DVR replay renders identical waterfalls frame by
 * frame. No browser dependencies — safe in the Web Worker and Vitest.
 */

export const DEFAULT_MAX_TRACE_SPANS = 12;

export interface TraceGeneratorOptions {
  maxSpans?: number;
  entryNodeId?: string;
}

function randomHex(length: number): string {
  const chars = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function hashToUnitInterval(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

function serviceNameForNode(nodeId: string): string {
  return nodeId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "service";
}

function pickEntryNode(snapshot: SimTickSnapshot, topology: GraphTopology, hint?: string): string | null {
  if (hint && snapshot.nodes[hint]) return hint;
  const indegree = new Map<string, number>();
  for (const node of topology.nodes) indegree.set(node.id, 0);
  for (const edge of topology.edges) {
    if (indegree.has(edge.target)) indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestRps = -1;
  for (const node of topology.nodes) {
    if ((indegree.get(node.id) ?? 0) !== 0) continue;
    const tele = snapshot.nodes[node.id];
    const rps = tele ? tele.arrivalRps : node.clientRps;
    if (rps > bestRps) {
      bestRps = rps;
      best = node.id;
    }
  }
  if (best) return best;
  let fallback: string | null = null;
  let fallbackRps = -1;
  for (const [nodeId, tele] of Object.entries(snapshot.nodes)) {
    if (tele.arrivalRps > fallbackRps) {
      fallbackRps = tele.arrivalRps;
      fallback = nodeId;
    }
  }
  return fallback ?? topology.nodes[0]?.id ?? null;
}

/**
 * Generate one OpenTelemetry waterfall starting at the highest-RPS entry
 * node and following the hottest downstream edge at each hop.
 */
export function generateTraceWaterfall(
  snapshot: SimTickSnapshot,
  topology: GraphTopology,
  options: TraceGeneratorOptions = {},
): TraceWaterfall {
  const maxSpans = Math.max(1, Math.min(64, Math.floor(options.maxSpans ?? DEFAULT_MAX_TRACE_SPANS)));
  const traceId = randomHex(32);
  const entryId = pickEntryNode(snapshot, topology, options.entryNodeId);

  if (!entryId) {
    return {
      traceId,
      rootService: "empty-canvas",
      totalDurationMs: 0,
      spans: [],
      sampledAtTick: snapshot.tick,
    };
  }

  const outgoing = new Map<string, string[]>();
  for (const node of topology.nodes) outgoing.set(node.id, []);
  for (const edge of topology.edges) {
    if (outgoing.has(edge.source)) outgoing.get(edge.source)?.push(edge.id);
  }
  const edgeById = new Map(topology.edges.map((edge) => [edge.id, edge]));

  const spans: TraceSpan[] = [];
  const visited = new Set<string>();
  let current: string | null = entryId;
  let cursorMs = 0;
  let parentSpanId: string | null = null;
  let rootService = serviceNameForNode(entryId);

  for (let hop = 0; hop < maxSpans && current && !visited.has(current); hop += 1) {
    visited.add(current);
    const tele = snapshot.nodes[current];
    const durationMs = tele ? Math.max(0.1, tele.p50Ms) : 1;
    const spanId = randomHex(16);
    const draw = hashToUnitInterval(`${traceId}:${current}`);
    const isError = tele ? draw < tele.errorRate : false;
    if (hop === 0) rootService = serviceNameForNode(current);

    spans.push({
      traceId,
      spanId,
      parentSpanId,
      nodeId: current,
      serviceName: serviceNameForNode(current),
      operationName: `POST /${serviceNameForNode(current)}`,
      startTimeMs: cursorMs,
      durationMs,
      status: isError ? "error" : "ok",
      httpStatus: isError ? (draw < (tele?.errorRate ?? 0) / 2 ? 503 : 429) : 200,
      attributes: {
        "syscanvas.node_id": current,
        "syscanvas.p99_ms": String(tele?.p99Ms ?? 0),
        "syscanvas.utilization": String(tele?.utilization ?? 0),
        "syscanvas.queue_depth": String(tele?.queueDepth ?? 0),
      },
    });

    parentSpanId = spanId;
    cursorMs += durationMs;

    const candidates: Array<{ id: string; target: string }> = [];
    for (const edgeId of outgoing.get(current) ?? []) {
      const edge = edgeById.get(edgeId);
      if (edge && !visited.has(edge.target)) candidates.push({ id: edge.id, target: edge.target });
    }
    if (candidates.length === 0) break;
    candidates.sort((a, b) => {
      const rpsA = snapshot.edges[a.id]?.rps ?? 0;
      const rpsB = snapshot.edges[b.id]?.rps ?? 0;
      return rpsB - rpsA;
    });
    current = candidates[0]?.target ?? null;
  }

  return {
    traceId,
    rootService,
    totalDurationMs: cursorMs,
    spans,
    sampledAtTick: snapshot.tick,
  };
}

/** Generate a batch of waterfalls for the DVR strip / trace explorer. */
export function generateTraceBatch(
  snapshot: SimTickSnapshot,
  topology: GraphTopology,
  count: number,
): TraceWaterfall[] {
  const safeCount = Math.max(0, Math.min(25, Math.floor(count)));
  const batch: TraceWaterfall[] = [];
  for (let i = 0; i < safeCount; i += 1) {
    batch.push(generateTraceWaterfall(snapshot, topology));
  }
  return batch;
}

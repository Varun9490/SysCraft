/**
 * Design Doctor — deterministic, rule-based static architecture linter.
 *
 * Pure TypeScript over the canvas topology: no DOM, no stores, no AI. Every
 * finding carries a stable rule id, a severity, the affected node ids, a
 * concrete suggested fix, and a link into the encyclopedia so the learner can
 * read the underlying concept. The panel component maps React Flow nodes into
 * `DoctorNodeInput` and renders the report; Vitest exercises the rules here.
 */

import { SEED_RESOURCES } from "@/data/seedResources";
import type { ResourceCategory, ResourceDefaults, ResourceOverrides } from "@/types/resource";

export type DoctorSeverity = "critical" | "warning" | "info";

export interface DoctorNodeInput {
  id: string;
  resourceId: string;
  label: string;
  overrides: ResourceOverrides;
}

export interface DoctorEdgeInput {
  id: string;
  source: string;
  target: string;
}

export interface DoctorFinding {
  ruleId: string;
  severity: DoctorSeverity;
  title: string;
  detail: string;
  suggestion: string;
  nodeIds: string[];
  /** Encyclopedia module id (see /wiki/[concept]) that explains the fix. */
  conceptId: string | null;
}

export interface DoctorReport {
  score: number; // 0-100 architecture hygiene score
  findings: DoctorFinding[];
  checkedNodeCount: number;
  checkedEdgeCount: number;
}

const seedById = new Map(SEED_RESOURCES.map((r) => [r.id, r]));

const CRITICAL_CATEGORIES = new Set<ResourceCategory>([
  "compute",
  "database",
  "cache",
  "search",
  "messaging",
  "streaming",
  "api",
  "ai_llm",
  "vector_db",
]);

const DATASTORE_CATEGORIES = new Set<ResourceCategory>(["database", "storage", "search", "vector_db"]);

const QUEUE_CATEGORIES = new Set<ResourceCategory>(["messaging", "streaming"]);

const ENTRY_CATEGORIES = new Set<ResourceCategory>(["edge", "network", "security", "api"]);

function effectiveDefaults(resourceId: string): ResourceDefaults | null {
  const seed = seedById.get(resourceId);
  return seed ? seed.defaults : null;
}

function effectiveReplicas(node: DoctorNodeInput): number {
  const seed = effectiveDefaults(node.resourceId);
  return Math.max(1, node.overrides.replicationFactor ?? seed?.replicationFactor ?? 1);
}

function effectiveNumber(
  node: DoctorNodeInput,
  key: keyof ResourceOverrides,
  fallback: number,
): number {
  const override = node.overrides[key];
  if (typeof override === "number" && Number.isFinite(override)) return override;
  const seed = effectiveDefaults(node.resourceId);
  const seedValue = seed ? (seed as unknown as Record<string, unknown>)[key] : undefined;
  return typeof seedValue === "number" && Number.isFinite(seedValue) ? seedValue : fallback;
}

function effectiveBool(node: DoctorNodeInput, key: keyof ResourceOverrides, fallback: boolean): boolean {
  const override = node.overrides[key];
  if (typeof override === "boolean") return override;
  const seed = effectiveDefaults(node.resourceId);
  const seedValue = seed ? (seed as unknown as Record<string, unknown>)[key] : undefined;
  return typeof seedValue === "boolean" ? seedValue : fallback;
}

function categoryOf(node: DoctorNodeInput): ResourceCategory {
  return seedById.get(node.resourceId)?.category ?? "compute";
}

function nameOf(node: DoctorNodeInput): string {
  return node.label || seedById.get(node.resourceId)?.name || node.resourceId;
}

/** Simple orphaned/BFS helpers over the tiny adjacency maps. */
function buildAdjacency(nodes: DoctorNodeInput[], edges: DoctorEdgeInput[]) {
  const ids = new Set(nodes.map((n) => n.id));
  const validEdges = edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  const out = new Map<string, DoctorEdgeInput[]>();
  const incoming = new Map<string, DoctorEdgeInput[]>();
  for (const node of nodes) {
    out.set(node.id, []);
    incoming.set(node.id, []);
  }
  for (const edge of validEdges) {
    out.get(edge.source)?.push(edge);
    incoming.get(edge.target)?.push(edge);
  }
  return { validEdges, out, incoming };
}

/**
 * Returns the ids of every node that sits on a directed cycle (reachable from
 * itself). Used for the retry-loop rule — cycles in a request graph mean the
 * simulator's damped solver has to work and usually mean a design mistake.
 */
export function nodesOnCycles(nodes: DoctorNodeInput[], edges: DoctorEdgeInput[]): string[] {
  const { validEdges } = buildAdjacency(nodes, edges);
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node.id, []);
  for (const edge of validEdges) adjacency.get(edge.source)?.push(edge.target);

  const onCycle = new Set<string>();
  for (const start of nodes.map((n) => n.id)) {
    const seen = new Set<string>();
    const stack = [...(adjacency.get(start) ?? [])];
    while (stack.length > 0) {
      const current = stack.pop() as string;
      if (current === start) {
        onCycle.add(start);
        break;
      }
      if (seen.has(current)) continue;
      seen.add(current);
      stack.push(...(adjacency.get(current) ?? []));
    }
  }
  return [...onCycle];
}

function longestPathLength(nodes: DoctorNodeInput[], edges: DoctorEdgeInput[]): { length: number; endNodeId: string | null } {
  const { out, incoming } = buildAdjacency(nodes, edges);
  const indeg = new Map<string, number>();
  for (const node of nodes) indeg.set(node.id, incoming.get(node.id)?.length ?? 0);
  const memo = new Map<string, number>();
  const queue = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);
  if (queue.length === 0) return { length: 0, endNodeId: null };
  let best = 0;
  let bestEnd: string | null = null;
  const order: string[] = [];
  const indegCopy = new Map(indeg);
  const localQueue = [...queue];
  while (localQueue.length > 0) {
    const current = localQueue.shift() as string;
    order.push(current);
    for (const edge of out.get(current) ?? []) {
      indegCopy.set(edge.target, (indegCopy.get(edge.target) ?? 0) - 1);
      if ((indegCopy.get(edge.target) ?? 0) === 0) localQueue.push(edge.target);
    }
  }
  for (const id of order) {
    const depth = memo.get(id) ?? 0;
    if (depth > best) {
      best = depth;
      bestEnd = id;
    }
    for (const edge of out.get(id) ?? []) {
      memo.set(edge.target, Math.max(memo.get(edge.target) ?? 0, depth + 1));
    }
  }
  // Nodes on cycles are excluded from the DAG pass; still report the DAG depth.
  return { length: best, endNodeId: bestEnd };
}

export function runDesignDoctor(
  nodes: DoctorNodeInput[],
  edges: DoctorEdgeInput[],
  options: { multiAzSupport?: boolean } = {},
): DoctorReport {
  const findings: DoctorFinding[] = [];
  const { validEdges, out, incoming } = buildAdjacency(nodes, edges);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Rule 1 — single-replica SPOF on the critical path.
  for (const node of nodes) {
    const category = categoryOf(node);
    if (!CRITICAL_CATEGORIES.has(category)) continue;
    const hasTraffic = (incoming.get(node.id)?.length ?? 0) > 0;
    if (!hasTraffic) continue;
    if (effectiveReplicas(node) === 1) {
      findings.push({
        ruleId: "spof-single-replica",
        severity: "critical",
        title: `${nameOf(node)} is a single point of failure`,
        detail:
          "One replica serves every request on this hop. Kill the node (or its host) and the whole path returns 503s until it restarts.",
        suggestion: "Raise the replica count to at least 2 and put a load balancer (or K8s Service) in front.",
        nodeIds: [node.id],
        conceptId: "replication",
      });
    }
  }

  // Rule 2 — multi-replica but pinned to one availability zone.
  for (const node of nodes) {
    const category = categoryOf(node);
    if (!CRITICAL_CATEGORIES.has(category)) continue;
    if ((incoming.get(node.id)?.length ?? 0) === 0) continue;
    const replicas = effectiveReplicas(node);
    if (replicas >= 2 && !effectiveBool(node, "multiAz", false)) {
      findings.push({
        ruleId: "spof-single-az",
        severity: "warning",
        title: `${nameOf(node)} replicas share one failure domain`,
        detail:
          "All replicas live in a single availability zone. A zone-level outage (power, network, control-plane incident) takes the whole tier down together.",
        suggestion: "Spread replicas across at least two AZs (multi-AZ) so a zone outage only removes half the capacity.",
        nodeIds: [node.id],
        conceptId: "replication",
      });
    }
  }

  // Rule 3 — clients talking directly to a datastore.
  for (const edge of validEdges) {
    const from = nodeById.get(edge.source);
    const to = nodeById.get(edge.target);
    if (!from || !to) continue;
    const toCategory = categoryOf(to);
    if (!DATASTORE_CATEGORIES.has(toCategory)) continue;
    const fromCategory = categoryOf(from);
    const isClientEntry = fromCategory === "edge" || fromCategory === "network" || (from.resourceId.includes("client") && fromCategory !== "compute");
    if (isClientEntry) {
      findings.push({
        ruleId: "direct-datastore-from-client",
        severity: "critical",
        title: `${nameOf(from)} talks straight to ${nameOf(to)}`,
        detail:
          "Putting a database behind the public internet exposes credentials and lets unbounded client concurrency smash the connection pool.",
        suggestion: "Route client traffic through a stateless API tier (or gateway) that owns credentials, pooling and rate limits.",
        nodeIds: [from.id, to.id],
        conceptId: "microservices-monolith",
      });
    }
  }

  // Rule 4 — queues with no consumers.
  for (const node of nodes) {
    const category = categoryOf(node);
    if (!QUEUE_CATEGORIES.has(category)) continue;
    if ((out.get(node.id)?.length ?? 0) === 0) {
      findings.push({
        ruleId: "queue-without-consumer",
        severity: "warning",
        title: `${nameOf(node)} has no consumer attached`,
        detail:
          "Nothing drains this queue, so every produced message accumulates. Depth grows linearly with traffic until retention or disk limits trip.",
        suggestion: "Attach a worker pool (or stream processor) downstream and set a dead-letter destination for poison messages.",
        nodeIds: [node.id],
        conceptId: "message-queues",
      });
    }
  }

  // Rule 4b — entry tiers publishing straight into internal brokers.
  for (const edge of validEdges) {
    const from = nodeById.get(edge.source);
    const to = nodeById.get(edge.target);
    if (!from || !to) continue;
    if (!QUEUE_CATEGORIES.has(categoryOf(to))) continue;
    const fromCategory = categoryOf(from);
    const isClientEntry =
      fromCategory === "edge" || fromCategory === "network" || (from.resourceId.includes("client") && fromCategory !== "compute");
    if (!isClientEntry) continue;
    findings.push({
      ruleId: "client-to-queue-direct",
      severity: "warning",
      title: `${nameOf(from)} pushes straight into ${nameOf(to)}`,
      detail:
        "Internal brokers expect a trusted producer. A queue exposed to the entry tier accepts arbitrary payloads, unbounded fan-in, and nothing back-pressures the real client load.",
      suggestion:
        "Have the request-handling API tier publish validated, size-checked messages and return its own ack; the edge only sees the accepted response.",
      nodeIds: [from.id, to.id],
      conceptId: "message-queues",
    });
  }

  // Rule 5 — orphaned nodes.
  for (const node of nodes) {
    const degree = (incoming.get(node.id)?.length ?? 0) + (out.get(node.id)?.length ?? 0);
    if (degree === 0 && nodes.length > 1) {
      findings.push({
        ruleId: "orphaned-node",
        severity: "info",
        title: `${nameOf(node)} is disconnected`,
        detail: "The node is not wired into any request path, so it contributes nothing to the simulation.",
        suggestion: "Connect it to the flow or delete it to keep the diagram honest.",
        nodeIds: [node.id],
        conceptId: null,
      });
    }
  }

  // Rule 6 — cycles in the request graph.
  const cycleNodes = nodesOnCycles(nodes, validEdges);
  if (cycleNodes.length > 0) {
    for (const id of cycleNodes) {
      const node = nodeById.get(id);
      if (!node) continue;
      findings.push({
        ruleId: "request-cycle",
        severity: "critical",
        title: `${nameOf(node)} sits on a request cycle`,
        detail:
          "A request path that feeds back into itself multiplies traffic on every pass. Without a hop limit this is an infinite retry loop.",
        suggestion: "Break the loop: make the back-edge asynchronous (queue it) or cap retries at the caller.",
        nodeIds: [id],
        conceptId: "message-queues",
      });
    }
  }

  // Rule 7 — cache configured with a weak hit rate.
  for (const node of nodes) {
    if (categoryOf(node) !== "cache") continue;
    if ((incoming.get(node.id)?.length ?? 0) === 0) continue;
    const hitRate = effectiveNumber(node, "cacheHitRate", 0.9);
    if (hitRate < 0.5) {
      findings.push({
        ruleId: "cache-low-hit-rate",
        severity: "warning",
        title: `${nameOf(node)} is barely caching anything`,
        detail: `A ${(hitRate * 100).toFixed(0)}% hit rate means most requests still hit the backing store — you pay for a cache and get little back.`,
        suggestion: "Check key design, TTLs and capacity: a bigger cache or better key skew usually lifts the hit rate above 80%.",
        nodeIds: [node.id],
        conceptId: "caching-strategies",
      });
    }
  }

  // Rule 8 — hot datastore without a cache in front of the readers.
  for (const node of nodes) {
    if (!DATASTORE_CATEGORIES.has(categoryOf(node))) continue;
    const readers = (incoming.get(node.id) ?? []).map((e) => nodeById.get(e.source)).filter((n): n is DoctorNodeInput => !!n);
    const computeReaders = readers.filter((n) => {
      const c = categoryOf(n);
      return c === "compute" || c === "api" || c === "serverless";
    });
    if (computeReaders.length < 2) continue;
    const hasAdjacentCache = nodes.some((candidate) => {
      if (categoryOf(candidate) !== "cache") return false;
      if ((out.get(candidate.id) ?? []).some((e) => e.target === node.id)) return true;
      return readers.some((reader) => (out.get(reader.id) ?? []).some((e) => e.target === candidate.id));
    });
    if (!hasAdjacentCache) {
      findings.push({
        ruleId: "hot-datastore-no-cache",
        severity: "warning",
        title: `${computeReaders.length} services read ${nameOf(node)} with no cache tier`,
        detail: "Every read lands on the same datastore. Read replicas and caches are the two standard escape hatches.",
        suggestion: "Add a cache-aside tier (Redis) for hot keys, or read replicas for scale-out reads.",
        nodeIds: [node.id, ...computeReaders.map((n) => n.id)],
        conceptId: "caching-strategies",
      });
    }
  }

  // Rule 9 — write contention from many direct writers.
  for (const node of nodes) {
    if (!DATASTORE_CATEGORIES.has(categoryOf(node))) continue;
    const writers = (incoming.get(node.id) ?? [])
      .map((e) => nodeById.get(e.source))
      .filter((n): n is DoctorNodeInput => !!n)
      .filter((n) => effectiveNumber(n, "writeRatio", 0) > 0.05);
    if (writers.length >= 3) {
      findings.push({
        ruleId: "datastore-write-contention",
        severity: "warning",
        title: `${writers.length} writers contend for ${nameOf(node)}`,
        detail:
          "Multiple services write into the same store. Row/hot-key contention serializes writes and latency spikes well before CPU does.",
        suggestion: "Buffer writes through a queue (or partition the store) so bursts smooth out instead of colliding.",
        nodeIds: [node.id, ...writers.map((n) => n.id)],
        conceptId: "sharding-partitioning",
      });
    }
  }

  // Rule 10 — no edge protection for a real workload.
  const entryRps = nodes.reduce((sum, node) => sum + effectiveNumber(node, "clientRps", 0), 0);
  const PROTECTIVE_RESOURCES = new Set(["api_gateway", "rate_limiter", "web_application_firewall"]);
  const hasEdgeProtection = nodes.some((node) => {
    const c = categoryOf(node);
    if (c === "security") return true;
    return PROTECTIVE_RESOURCES.has(node.resourceId);
  });
  if (entryRps >= 10_000 && !hasEdgeProtection && nodes.length > 2) {
    findings.push({
      ruleId: "missing-edge-protection",
      severity: "warning",
      title: "No rate limiting or WAF in front of the workload",
      detail: `Clients push ${entryRps >= 1000 ? `${(entryRps / 1000).toFixed(0)}k` : entryRps.toFixed(0)} req/s with nothing between them and your compute tier. Cheap to add; painful to add during an abuse spike.`,
      suggestion: "Put a rate limiter or API gateway at the edge: token buckets absorb abuse without touching your services.",
      nodeIds: [],
      conceptId: "rate-limiting",
    });
  }

  // Rule 11 — long synchronous chains.
  if (nodes.length >= 4) {
    const { length, endNodeId } = longestPathLength(nodes, validEdges);
    if (length >= 6) {
      const endNode = endNodeId ? nodeById.get(endNodeId) : null;
      findings.push({
        ruleId: "deep-synchronous-chain",
        severity: "warning",
        title: `Request path is ${length} hops deep`,
        detail:
          "Each synchronous hop multiplies the tail: one slow dependency at hop 5 inflates the user-facing p99 along with every retry.",
        suggestion: "Collapse or parallelize hops, or move the slow segment off the critical path into an async flow.",
        nodeIds: endNode ? [endNode.id] : [],
        conceptId: "observability-tracing",
      });
    }
  }

  // Rule 12 — tail-latency giant on the path.
  for (const node of nodes) {
    if ((incoming.get(node.id)?.length ?? 0) === 0) continue;
    const p99 = effectiveP99(node);
    if (p99 >= 400) {
      findings.push({
        ruleId: "tail-latency-hop",
        severity: "info",
        title: `${nameOf(node)} p99 is ${p99.toFixed(0)} ms`,
        detail:
          "A single hop with a ~400 ms tail dominates the end-to-end p99 once you add even two more calls in series.",
        suggestion: "Cap it with a timeout + circuit breaker, hedge it, or cache responses so the tail stops leaking upstream.",
        nodeIds: [node.id],
        conceptId: "observability-tracing",
      });
    }
  }

  // Rule 13 — fan-in hotspot.
  for (const node of nodes) {
    const fanIn = incoming.get(node.id)?.length ?? 0;
    if (fanIn >= 5) {
      findings.push({
        ruleId: "fan-in-hotspot",
        severity: "info",
        title: `${nameOf(node)} receives ${fanIn} inbound dependencies`,
        detail: "Every upstream service shares the same capacity budget, so one noisy caller can starve the others.",
        suggestion: "Introduce per-caller rate limits or a queue in front so the hotspot stays available under contention.",
        nodeIds: [node.id],
        conceptId: "load-balancing",
      });
    }
  }

  // Rule 14 — observability blindness on larger designs.
  const hasObservability = nodes.some((node) => {
    const c = categoryOf(node);
    return c === "observability" || node.resourceId === "observability_stack";
  });
  if (nodes.length >= 8 && !hasObservability) {
    findings.push({
      ruleId: "missing-observability",
      severity: "info",
      title: "No observability tier in the design",
      detail: "Metrics, logs and traces are how you know which of these rules fired in production — before customers do.",
      suggestion: "Add a metrics/log/trace stack (Prometheus + OpenTelemetry) with the Four Golden Signals dashboards.",
      nodeIds: [],
      conceptId: "observability-tracing",
    });
  }

  // Rule 15 — scaled connection tier with per-replica state and no shared backplane.
  // The WebSocket lesson: once replicas >= 2, presence/room/session state that
  // lives in a replica's memory means every instance silently owns a slice of
  // the truth. Sticky routing hides it; a shared backplane fixes it.
  // Detection is label-driven because the canvas has no dedicated WS primitive:
  // learners name the connection tier ("WS / gateway", "Presence", "Rooms") the
  // same way the chat blueprint does, and the absence of a cache/messaging/
  // datastore neighbor within 2 hops is the structural half of the proof.
  const CONNECTION_PAT = /\b(ws|websocket|websockets|socket|sockets|room|rooms|presence|session|sessions|chat|live)\b/i;
  const BACKPLANE_CATEGORIES = new Set<ResourceCategory>([
    "cache",
    "messaging",
    "streaming",
    "database",
    "search",
    "vector_db",
  ]);
  const hasSharedBackplaneWithin = (startId: string, maxDepth: number): boolean => {
    let frontier = new Set<string>([startId]);
    const visited = new Set<string>([startId]);
    for (let depth = 0; depth < maxDepth; depth += 1) {
      const next = new Set<string>();
      for (const id of frontier) {
        const linked: string[] = [
          ...(out.get(id) ?? []).map((e) => e.target),
          ...(incoming.get(id) ?? []).map((e) => e.source),
        ];
        for (const neighborId of linked) {
          if (visited.has(neighborId)) continue;
          visited.add(neighborId);
          const neighbor = nodeById.get(neighborId);
          if (!neighbor) continue;
          if (BACKPLANE_CATEGORIES.has(categoryOf(neighbor))) return true;
          next.add(neighborId);
        }
      }
      frontier = next;
    }
    return false;
  };
  for (const node of nodes) {
    const category = categoryOf(node);
    if (category !== "compute" && category !== "api" && category !== "serverless" && category !== "network") continue;
    if (effectiveReplicas(node) < 2) continue;
    if (!CONNECTION_PAT.test(node.label)) continue;
    if (hasSharedBackplaneWithin(node.id, 2)) continue;
    findings.push({
      ruleId: "stateful-tier-no-backplane",
      severity: "warning",
      title: `${nameOf(node)} keeps connection state in replica memory`,
      detail:
        "A replicated tier whose name implies per-user state (sessions, rooms, presence, live sockets) with no shared backing store nearby: every replica owns its own slice of the truth, sticky routing becomes load-bearing, and a replica death loses state.",
      suggestion:
        "Externalize the state: a Redis presence/pub-sub (or a durable store) as the shared backplane, keep replicas identical, and treat sticky routing as a stopgap — never the fix.",
      nodeIds: [node.id],
      conceptId: "load-balancing",
    });
  }

  // Rule 16 — large objects proxying through the compute tier instead of
  // direct-to-storage. When an edge/client-facing tier reaches blob/file
  // storage THROUGH an upload-heavy service, every byte of media occupies an
  // app-tier connection and counts against its compute budget.
  const OBJECT_STORE_IDS = new Set(["blob_storage", "file_storage"]);
  for (const node of nodes) {
    const metaCategory = categoryOf(node);
    if (metaCategory !== "compute" && metaCategory !== "serverless" && metaCategory !== "api") continue;
    const toObjectStore = (out.get(node.id) ?? []).filter((e) => {
      const target = nodeById.get(e.target);
      return target ? OBJECT_STORE_IDS.has(target.resourceId) : false;
    });
    if (toObjectStore.length === 0) continue;
    const objectStore = nodeById.get(toObjectStore[0]?.target ?? "");
    if (!objectStore) continue;
    const entrySource = (incoming.get(node.id) ?? []).map((e) => nodeById.get(e.source)).find((n) => {
      if (!n) return false;
      const c = categoryOf(n);
      return c === "edge" || c === "network" || c === "security" || c === "api";
    });
    if (!entrySource) continue;
    const writeRatio = effectiveNumber(node, "writeRatio", 0.2);
    if (writeRatio < 0.35) continue;
    findings.push({
      ruleId: "blob-through-compute",
      severity: "warning",
      title: `${nameOf(node)} proxies uploads straight to ${nameOf(objectStore)}`,
      detail:
        "Object bytes traverse the app tier on their way to storage: each large upload holds a connection and a memory buffer on a replica you sized for requests, and egress doubles (client -> compute -> store).",
      suggestion:
        "Hand clients a pre-signed upload URL so bytes go direct to object storage; the API keeps only the metadata and the CDN serves reads.",
      nodeIds: [node.id, ...toObjectStore.map((e) => e.target)],
      conceptId: null,
    });
  }

  const severityWeight: Record<DoctorSeverity, number> = { critical: 14, warning: 6, info: 2 };
  const penalty = findings.reduce((sum, f) => sum + severityWeight[f.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));

  const severityRank: Record<DoctorSeverity, number> = { critical: 0, warning: 1, info: 2 };
  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return {
    score,
    findings,
    checkedNodeCount: nodes.length,
    checkedEdgeCount: validEdges.length,
  };
}

function effectiveP99(node: DoctorNodeInput): number {
  const seed = seedById.get(node.resourceId);
  return seed ? seed.defaults.baseP99Ms : 40;
}

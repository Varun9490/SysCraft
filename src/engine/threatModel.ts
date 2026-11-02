/**
 * STRIDE threat-model engine for SysCraft canvases.
 *
 * Operates on the structural topology (nodes + edges) and produces a
 * list of findings with severity, category, and remediation. Runs
 * entirely client-side so it works in the static export.
 */

export type StrideCategory =
  | "Spoofing"
  | "Tampering"
  | "Repudiation"
  | "InformationDisclosure"
  | "DenialOfService"
  | "ElevationOfPrivilege";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface ThreatFinding {
  id: string;
  category: StrideCategory;
  severity: Severity;
  title: string;
  detail: string;
  remediation: string;
  nodeId?: string;
  edgeId?: string;
}

export interface ThreatModelReport {
  findings: ThreatFinding[];
  score: number; // 0-100, higher is better
  generatedAt: string;
}

interface NodeLike {
  id: string;
  resourceId: string;
  position: { x: number; y: number };
}

interface EdgeLike {
  id: string;
  source: string;
  target: string;
  data?: { protocol?: string; auth?: string; pii?: boolean; async?: boolean };
}

interface TopologyLike {
  nodes: NodeLike[];
  edges: EdgeLike[];
}

const RESOURCE_LABELS: Record<string, string> = {
  "api-gateway": "API Gateway",
  "load-balancer": "Load Balancer",
  "cdn": "CDN",
  "waf": "WAF",
  "auth-service": "Auth Service",
  "database": "Database",
  "cache": "Cache",
  "queue": "Message Queue",
  "storage": "Object Storage",
  "search": "Search Engine",
  "compute": "Compute",
  "lambda": "Serverless Function",
  "kubernetes": "Kubernetes Cluster",
  "firewall": "Firewall",
  "vpn": "VPN Gateway",
};

function label(id: string): string {
  return RESOURCE_LABELS[id] ?? id;
}

function resourceIdOf(nodes: NodeLike[], id: string): string {
  return nodes.find((n) => n.id === id)?.resourceId ?? "";
}

export function analyzeThreats(topology: TopologyLike): ThreatModelReport {
  const findings: ThreatFinding[] = [];
  let nextId = 1;
  const push = (f: Omit<ThreatFinding, "id">) => {
    findings.push({ id: `T${nextId++}`, ...f });
  };

  const nodes = topology.nodes;
  const edges = topology.edges;

  // 1. Internet-facing entry without WAF
  const hasWaf = nodes.some((n) => n.resourceId === "waf");
  const entryNodes = nodes.filter(
    (n) => n.resourceId === "api-gateway" || n.resourceId === "load-balancer",
  );
  if (entryNodes.length > 0 && !hasWaf) {
    for (const n of entryNodes) {
      push({
        category: "InformationDisclosure",
        severity: "high",
        title: `No WAF in front of ${label(n.resourceId)}`,
        detail: `${label(n.resourceId)} is reachable without a Web Application Firewall. Direct exposure increases injection and bot risk.`,
        remediation: "Add a WAF primitive in front of the ingress and enable OWASP core rules.",
        nodeId: n.id,
      });
    }
  }

  // 2. Database without auth on inbound edge
  const dbNodes = nodes.filter((n) => n.resourceId === "database");
  for (const db of dbNodes) {
    const inbound = edges.filter((e) => e.target === db.id);
    for (const e of inbound) {
      const auth = e.data?.auth ?? "";
      if (!auth || auth === "none") {
        push({
          category: "ElevationOfPrivilege",
          severity: "critical",
          title: `Database ${db.id} reachable without auth`,
          detail: `Edge ${e.source} → ${db.id} carries no authentication. Any compromised upstream can read/write the database.`,
          remediation: "Enforce mTLS or service-account auth on the edge and rotate credentials.",
          edgeId: e.id,
          nodeId: db.id,
        });
      }
    }
  }

  // 3. PII crossing a region without encryption flag
  for (const e of edges) {
    if (e.data?.pii && e.data?.protocol && !e.data.protocol.includes("tls") && !e.data.protocol.includes("https")) {
      push({
        category: "InformationDisclosure",
        severity: "high",
        title: `PII on unencrypted edge ${e.source} → ${e.target}`,
        detail: "Edge is marked as carrying PII but the protocol is not TLS/HTTPS.",
        remediation: "Switch the edge protocol to HTTPS or mTLS and enable field-level encryption.",
        edgeId: e.id,
      });
    }
  }

  // 4. Storage without encryption at rest flag (heuristic: storage node present)
  const storageNodes = nodes.filter((n) => n.resourceId === "storage");
  for (const s of storageNodes) {
    push({
      category: "InformationDisclosure",
      severity: "medium",
      title: `Object storage ${s.id} — verify encryption at rest`,
      detail: "Confirm server-side encryption (SSE-KMS) and bucket policy are enabled.",
      remediation: "Enable SSE-KMS, block public access, and add a bucket policy denying unencrypted uploads.",
      nodeId: s.id,
    });
  }

  // 5. Single point of failure: a node with no replica and high in-degree
  for (const n of nodes) {
    const inDeg = edges.filter((e) => e.target === n.id).length;
    if (inDeg >= 3 && n.resourceId !== "load-balancer" && n.resourceId !== "api-gateway") {
      push({
        category: "DenialOfService",
        severity: "medium",
        title: `${label(n.resourceId)} ${n.id} is a single point of failure`,
        detail: `${inDeg} upstreams depend on one instance. Failure cascades to all callers.`,
        remediation: "Add a replica or place behind a load balancer; define an SLO and circuit breaker.",
        nodeId: n.id,
      });
    }
  }

  // 6. Async edges without DLQ (queue targets)
  const queueNodes = nodes.filter((n) => n.resourceId === "queue");
  for (const q of queueNodes) {
    const hasDlq = nodes.some((n) => n.resourceId === "queue" && n.id !== q.id && n.id.toLowerCase().includes("dlq"));
    if (!hasDlq) {
      push({
        category: "Repudiation",
        severity: "low",
        title: `Queue ${q.id} has no dead-letter queue`,
        detail: "Failed messages are retried forever or dropped silently.",
        remediation: "Add a DLQ primitive and route poison messages after N retries.",
        nodeId: q.id,
      });
    }
  }

  // 7. Missing auth service when API gateway present
  const hasApiGw = nodes.some((n) => n.resourceId === "api-gateway");
  const hasAuth = nodes.some((n) => n.resourceId === "auth-service");
  if (hasApiGw && !hasAuth) {
    push({
      category: "Spoofing",
      severity: "high",
      title: "API gateway without an auth service",
      detail: "Ingress exists but no auth primitive is modeled. Tokens are not validated anywhere in the diagram.",
      remediation: "Add an auth service (JWT/OIDC) behind the gateway and enforce on every route.",
    });
  }

  // 8. Sync chatty edges between services (latency risk)
  for (const e of edges) {
    const src = resourceIdOf(nodes, e.source);
    const tgt = resourceIdOf(nodes, e.target);
    if (src === "database" && tgt === "database") {
      push({
        category: "Tampering",
        severity: "low",
        title: "Direct DB-to-DB edge",
        detail: "Two databases talk directly. Schema coupling makes migrations and access control hard.",
        remediation: "Introduce a service boundary; databases should not call each other directly.",
        edgeId: e.id,
      });
    }
  }

  // Score: start 100, deduct by severity
  const weights: Record<Severity, number> = { critical: 25, high: 15, medium: 8, low: 3, info: 1 };
  let score = 100;
  for (const f of findings) score -= weights[f.severity];
  score = Math.max(0, Math.min(100, score));

  return {
    findings,
    score,
    generatedAt: new Date().toISOString(),
  };
}

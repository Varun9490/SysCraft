/**
 * Declarative architecture-plugin catalog.
 *
 * A "plugin" is a signed-off bundle of declarative rules an architect can
 * switch on per canvas. Unlike the imperative rules in `designDoctor.ts`, every
 * pack here is pure data: each rule states when it fires and what it wants to
 * see, which makes community packs importable as JSON and verifiable without
 * executing third-party code. `runDeclarativePluginRules` is the single
 * interpreter for that data, and it emits the same `DoctorFinding` shape the
 * Design Doctor panel already renders.
 */

import { SEED_RESOURCES } from "@/data/seedResources";
import type { DoctorEdgeInput, DoctorFinding, DoctorNodeInput, DoctorSeverity } from "@/engine/designDoctor";

export type PluginCategory =
  | "AWS"
  | "Cloudflare"
  | "Kubernetes"
  | "Security & Compliance"
  | "FinOps"
  | "AI & LLMs"
  | "Custom";

export const PLUGIN_CATEGORIES: PluginCategory[] = [
  "AWS",
  "Cloudflare",
  "Kubernetes",
  "Security & Compliance",
  "FinOps",
  "AI & LLMs",
  "Custom",
];

/**
 * The four rule primitives the interpreter understands. Every pack — builtin or
 * user-authored — composes only these, so a JSON manifest can never run code.
 *
 * - `require_primitive_when_present`: if any node in `whenResourceIds` exists
 *   (or the canvas is non-empty when the list is omitted), at least one node in
 *   `requiredResourceIds` must also exist.
 * - `forbid_direct_edge`: no edge may connect a node in `sourceResourceIds`
 *   straight to a node in `targetResourceIds`.
 * - `max_node_cost`: no node (optionally scoped to `whenResourceIds`) may cost
 *   more than `maxCostUsdPerHour` at its effective replica count.
 * - `require_multi_az_category`: every node in `whenResourceIds` must be
 *   deployed across availability zones (`multiAz` effective config).
 */
export type DeclarativeRuleKind =
  | "require_primitive_when_present"
  | "forbid_direct_edge"
  | "max_node_cost"
  | "require_multi_az_category";

export const DECLARATIVE_RULE_KINDS: Array<{ kind: DeclarativeRuleKind; label: string; hint: string }> = [
  {
    kind: "require_primitive_when_present",
    label: "Require companion block",
    hint: "When any trigger block is on the canvas, at least one required block must be present too.",
  },
  {
    kind: "forbid_direct_edge",
    label: "Forbid direct connection",
    hint: "Flag any edge that wires a source block straight into a target block.",
  },
  {
    kind: "max_node_cost",
    label: "Hourly cost ceiling",
    hint: "Flag every block whose effective hourly cost exceeds the ceiling.",
  },
  {
    kind: "require_multi_az_category",
    label: "Require multi-AZ",
    hint: "Flag any listed block that is pinned to a single availability zone.",
  },
];

export interface DeclarativePluginRule {
  id: string;
  title: string;
  severity: DoctorSeverity;
  kind: DeclarativeRuleKind;
  /** Trigger set: blocks whose presence activates the rule (also the cost scope). */
  whenResourceIds?: string[];
  /** Companion blocks: at least one must be present when the rule is active. */
  requiredResourceIds?: string[];
  /** Forbidden edge origins. */
  sourceResourceIds?: string[];
  /** Forbidden edge destinations. */
  targetResourceIds?: string[];
  /** USD/hour ceiling for `max_node_cost`. */
  maxCostUsdPerHour?: number;
  detail: string;
  suggestion: string;
  /** Encyclopedia module id that teaches the fix, or null. */
  conceptId: string | null;
}

export interface SysCraftPlugin {
  id: string;
  name: string;
  version: string;
  author: string;
  category: PluginCategory;
  summary: string;
  installedByDefault: boolean;
  tags: string[];
  rules: DeclarativePluginRule[];
  /** Primitive ids (must exist in SEED_RESOURCES) injected by "Add pack to canvas". */
  recommendedPrimitives: string[];
}

const DATASTORE_IDS = ["postgres_db", "cassandra_store", "document_store", "cockroach_db"];

export const BUILTIN_PLUGINS: SysCraftPlugin[] = [
  {
    id: "aws-well-architected-pack",
    name: "AWS Well-Architected Pillar Auditor",
    version: "2.4.0",
    author: "SysCraft Labs",
    category: "AWS",
    summary:
      "Audits a canvas against the AWS Well-Architected pillars: durable data tiers, origins shielded by a CDN, and no service exposed without a gateway in front of it.",
    installedByDefault: true,
    tags: ["aws", "well-architected", "availability", "backup"],
    recommendedPrimitives: [
      "dns_load_balancer",
      "api_gateway",
      "redis_cache",
      "postgres_db",
      "blob_storage",
      "cdn_edge",
    ],
    rules: [
      {
        id: "aws-datastore-multi-az",
        title: "Datastore is not spread across availability zones",
        severity: "critical",
        kind: "require_multi_az_category",
        whenResourceIds: ["postgres_db", "cassandra_store", "document_store", "cockroach_db"],
        detail:
          "The Reliable pillar treats a single-AZ datastore as a single failure domain: an AZ incident takes writes and reads down together, and a restored snapshot is minutes-to-hours behind the last committed transaction.",
        suggestion:
          "Enable multi-AZ (synchronous standby) or a 3-AZ quorum ring, and run nightly snapshot restores against a scratch cluster so the backup is proven, not assumed.",
        conceptId: "replication",
      },
      {
        id: "aws-datastore-read-offload",
        title: "Hot datastore has no cache or read replica in front of it",
        severity: "info",
        kind: "require_primitive_when_present",
        whenResourceIds: ["postgres_db", "cassandra_store", "document_store"],
        requiredResourceIds: ["redis_cache", "memcached_cluster"],
        detail:
          "Every read lands on the primary. Vertical scaling buys a few months at best; a cache tier or read replica is the only version of this that scales with traffic.",
        suggestion:
          "Add a cache-aside tier (Redis/Memcached) for hot keys, or read replicas for scale-out reads, and keep the primary for serialized writes.",
        conceptId: "caching-strategies",
      },
      {
        id: "aws-blob-behind-cdn",
        title: "Object storage is served without an edge cache",
        severity: "warning",
        kind: "require_primitive_when_present",
        whenResourceIds: ["blob_storage", "file_storage"],
        requiredResourceIds: ["cdn_edge"],
        detail:
          "Blob bytes leaving the region on every request pay full egress and pay full origin RTT. For media and static assets that is the single largest avoidable line item.",
        suggestion:
          "Front the bucket with a CDN (origin access control, immutable hashed keys) so repeated reads are served from a nearby PoP.",
        conceptId: "caching-strategies",
      },
      {
        id: "aws-api-behind-gateway",
        title: "Service tier is publicly reachable without a gateway",
        severity: "critical",
        kind: "require_primitive_when_present",
        whenResourceIds: ["rest_service", "background_worker"],
        requiredResourceIds: ["api_gateway", "dns_load_balancer"],
        detail:
          "Without a gateway or load balancer the service owns TLS, auth, throttling and connection draining itself — and every one of those is a shared concern the service will implement inconsistently.",
        suggestion:
          "Put an API Gateway (or an L7 load balancer) in front: it terminates TLS, enforces quotas, and gives you one place to rotate certificates.",
        conceptId: "load-balancing",
      },
      {
        id: "aws-cache-multi-az",
        title: "Cache tier is single-AZ",
        severity: "warning",
        kind: "require_multi_az_category",
        whenResourceIds: ["redis_cache", "memcached_cluster"],
        detail:
          "A cache is allowed to lose data, but it is not allowed to lose the whole tier: a single-AZ cache outage turns every miss into a database query and the primary sees a stampede.",
        suggestion:
          "Run the cache multi-AZ with automatic failover, and keep request coalescing so a cold cache cannot stampede the store.",
        conceptId: "caching-strategies",
      },
    ],
  },
  {
    id: "cloudflare-edge-zero-trust",
    name: "Cloudflare Edge & Zero-Trust Optimizer",
    version: "1.9.2",
    author: "SysCraft Labs",
    category: "Cloudflare",
    summary:
      "Wraps the public entry tier in Cloudflare WAF + Tunnel semantics: every edge surface is filtered, every origin is reached through an authenticated tunnel, and nothing on the internet can address a database.",
    installedByDefault: true,
    tags: ["cloudflare", "waf", "zero-trust", "tunnel"],
    recommendedPrimitives: [
      "cdn_edge",
      "dns_load_balancer",
      "cloudflare_waf",
      "cloudflare_tunnel",
      "api_gateway",
      "rate_limiter",
    ],
    rules: [
      {
        id: "cf-edge-waf",
        title: "Edge surface has no WAF in front of it",
        severity: "critical",
        kind: "require_primitive_when_present",
        whenResourceIds: ["cdn_edge", "api_gateway"],
        requiredResourceIds: ["cloudflare_waf", "web_application_firewall"],
        detail:
          "An unfiltered edge forwards SQLi, path traversal and scanner traffic straight to the origin. Managed rulesets plus bot scoring remove the overwhelming majority of that noise for free.",
        suggestion:
          "Attach a WAF (Cloudflare managed + OWASP core rules) to the hostname, start in log-only mode, then enforce after a week of false-positive review.",
        conceptId: "rate-limiting",
      },
      {
        id: "cf-origin-tunnel",
        title: "Origin is exposed instead of tunnelled",
        severity: "warning",
        kind: "require_primitive_when_present",
        whenResourceIds: ["rest_service", "api_gateway"],
        requiredResourceIds: ["cloudflare_tunnel", "rate_limiter"],
        detail:
          "If the origin has a public address, attackers bypass the edge entirely: no WAF, no bot management, no rate limit, and no record of the request in edge logs.",
        suggestion:
          "Publish the origin only through a Cloudflare Tunnel (outbound-only connection) or lock it to the edge IP ranges, and keep a rate limiter as the last line of defence.",
        conceptId: "rate-limiting",
      },
      {
        id: "cf-no-direct-database",
        title: "Internet edge talks straight to a database",
        severity: "critical",
        kind: "forbid_direct_edge",
        sourceResourceIds: ["cdn_edge", "dns_load_balancer"],
        targetResourceIds: ["postgres_db", "cassandra_store", "document_store", "cockroach_db", "vector_database"],
        detail:
          "A database reachable from the public edge needs a public endpoint, a public credential path, and a connection pool sized for the open internet. Every one of those is an incident waiting for a date.",
        suggestion:
          "Insert the API tier between edge and storage: the edge terminates TLS, the service owns credentials, pooling and query limits.",
        conceptId: "microservices-monolith",
      },
      {
        id: "cf-certificate-lifecycle",
        title: "Edge hostnames have no automated certificate lifecycle",
        severity: "info",
        kind: "require_primitive_when_present",
        whenResourceIds: ["cdn_edge"],
        requiredResourceIds: ["cert_manager", "secrets_manager"],
        detail:
          "Manual certificate renewals are the classic midnight outage: the calendar reminder fires, nobody rotates the secret, and every client fails the handshake at once.",
        suggestion:
          "Automate issuance and rotation (cert-manager / ACME / Cloudflare universal certs) and alert on expiry at 30, 14 and 7 days.",
        conceptId: null,
      },
    ],
  },
  {
    id: "kubernetes-production-hardening",
    name: "Kubernetes Production & eBPF Hardening",
    version: "3.1.0",
    author: "SysCraft Labs",
    category: "Kubernetes",
    summary:
      "Production-readiness checks for a cluster slice: quorum-backed control plane, cluster-wide telemetry, and East-West traffic isolated by a mesh or CNI policy engine.",
    installedByDefault: true,
    tags: ["kubernetes", "ebpf", "cni", "observability"],
    recommendedPrimitives: [
      "kube_apiserver",
      "kube_etcd",
      "k8s_deployment",
      "envoy_mesh",
      "prometheus_stack",
      "otel_collector",
    ],
    rules: [
      {
        id: "k8s-workload-observability",
        title: "Cluster workloads ship without telemetry",
        severity: "critical",
        kind: "require_primitive_when_present",
        whenResourceIds: ["k8s_deployment", "kube_apiserver"],
        requiredResourceIds: ["prometheus_stack", "otel_collector", "observability_stack"],
        detail:
          "Without a metrics/trace pipeline the first symptom of a bad rollout is a customer complaint. Kubernetes gives you the events; something has to retain and query them.",
        suggestion:
          "Deploy Prometheus + OpenTelemetry collectors (or a managed observability stack) with RED/USE dashboards and scrape the kubelet, apiserver and workload endpoints.",
        conceptId: "observability-tracing",
      },
      {
        id: "k8s-apiserver-etcd",
        title: "Control plane has no etcd quorum behind it",
        severity: "critical",
        kind: "require_primitive_when_present",
        whenResourceIds: ["kube_apiserver"],
        requiredResourceIds: ["kube_etcd"],
        detail:
          "The apiserver is stateless; every object it accepts lives in etcd. An apiserver without an etcd ring in the design silently implies an external dependency nothing on the canvas accounts for.",
        suggestion:
          "Model etcd explicitly as a 3- or 5-member Raft ring on separate disks, with defragmentation and snapshot backups scheduled.",
        conceptId: "raft-consensus",
      },
      {
        id: "k8s-east-west-isolation",
        title: "East-West traffic has no mesh or CNI policy layer",
        severity: "warning",
        kind: "require_primitive_when_present",
        whenResourceIds: ["k8s_deployment"],
        requiredResourceIds: ["envoy_mesh", "cni_overlay"],
        detail:
          "Flat pod networking lets any workload dial any other workload. One compromised pod then reaches every service account token and every internal endpoint in the cluster.",
        suggestion:
          "Add a service mesh (mTLS + authorization policy) or an eBPF CNI with default-deny network policies, then allow-list per namespace.",
        conceptId: "microservices-monolith",
      },
      {
        id: "k8s-control-plane-multi-az",
        title: "Control plane is pinned to one availability zone",
        severity: "critical",
        kind: "require_multi_az_category",
        whenResourceIds: ["kube_apiserver", "kube_etcd"],
        detail:
          "A single-AZ control plane means a zone incident stops every deployment, every scheduler decision, and every API call — including the calls your on-call engineer needs to fix it.",
        suggestion:
          "Spread control-plane members across three AZs and put the apiserver behind a multi-AZ load balancer with health checks.",
        conceptId: "replication",
      },
      {
        id: "k8s-gitops-audit",
        title: "Cluster changes have no GitOps trail",
        severity: "info",
        kind: "require_primitive_when_present",
        whenResourceIds: ["k8s_deployment", "kube_apiserver"],
        requiredResourceIds: ["argocd_gitops"],
        detail:
          "Imperative kubectl changes are unreviewable: no diff, no approver, no rollback target. Compliance evidence for change management simply does not exist.",
        suggestion:
          "Reconcile the cluster from Git with Argo CD, and treat manual edits as drift that gets reverted automatically.",
        conceptId: null,
      },
    ],
  },
  {
    id: "zero-trust-stride-auditor",
    name: "STRIDE & CVE Shield Security Plugin",
    version: "2.0.3",
    author: "SysCraft Labs",
    category: "Security & Compliance",
    summary:
      "Threat-models the canvas with STRIDE: no internet path reaches a database, every data tier has a secrets source, and every identity-bearing request passes a real authentication gate.",
    installedByDefault: true,
    tags: ["security", "stride", "zero-trust", "secrets"],
    recommendedPrimitives: [
      "web_application_firewall",
      "identity_provider",
      "secrets_manager",
      "rate_limiter",
      "api_gateway",
      "postgres_db",
    ],
    rules: [
      {
        id: "zt-edge-to-database",
        title: "Spoofing/Elevation: edge reaches a data store directly",
        severity: "critical",
        kind: "forbid_direct_edge",
        sourceResourceIds: ["cdn_edge", "dns_load_balancer"],
        targetResourceIds: ["postgres_db", "cassandra_store", "cockroach_db", "document_store"],
        detail:
          "STRIDE's Elevation of Privilege in one hop: a public edge with a direct database edge effectively publishes the storage tier. Credentials live at the edge, which is the least trusted place they can live.",
        suggestion:
          "Terminate at an API tier that holds the credentials and enforces authorization per request; the edge should never know a database exists.",
        conceptId: "microservices-monolith",
      },
      {
        id: "zt-datastore-secrets",
        title: "Information disclosure: data tier has no secrets manager",
        severity: "critical",
        kind: "require_primitive_when_present",
        whenResourceIds: DATASTORE_IDS,
        requiredResourceIds: ["secrets_manager"],
        detail:
          "Database credentials that live in environment variables or config maps leak through logs, crash dumps and any read access to the pod spec. Rotation becomes a redeploy, so it never happens.",
        suggestion:
          "Source credentials from a secrets manager with short-lived, automatically rotated leases, and give each service its own least-privilege role.",
        conceptId: null,
      },
      {
        id: "zt-datastore-identity",
        title: "Repudiation: data tier has no identity provider",
        severity: "warning",
        kind: "require_primitive_when_present",
        whenResourceIds: DATASTORE_IDS,
        requiredResourceIds: ["identity_provider"],
        detail:
          "Without a central identity provider there is no trustworthy record of who changed what: every audit question reduces to shared service accounts and application logs you cannot prove.",
        suggestion:
          "Federate human and workload identity through an IdP (OIDC/IAM), issue per-service credentials, and log the principal on every state change.",
        conceptId: null,
      },
      {
        id: "zt-entry-waf-and-limit",
        title: "Denial of service: entry tier has no WAF or rate limit",
        severity: "warning",
        kind: "require_primitive_when_present",
        whenResourceIds: ["api_gateway", "rest_service"],
        requiredResourceIds: ["web_application_firewall", "rate_limiter"],
        detail:
          "A request tier with no throttle accepts whatever concurrency the internet offers. One credential-stuffing script converts directly into queue depth, CPU saturation and a p99 blowout.",
        suggestion:
          "Add a WAF plus a per-key token bucket at the entry tier; shed load explicitly at the edge instead of collapsing in the service.",
        conceptId: "rate-limiting",
      },
    ],
  },
  {
    id: "finops-unit-economics",
    name: "FinOps Cloud Cost & Spot Optimizer",
    version: "1.4.1",
    author: "SysCraft Labs",
    category: "FinOps",
    summary:
      "Keeps the architecture inside its unit economics: flags runaway hourly spend, insists on a cache before scaling premium tiers, and keeps worker fleets event-driven rather than always-on.",
    installedByDefault: false,
    tags: ["finops", "cost", "spot", "unit-economics"],
    recommendedPrimitives: ["serverless_function", "redis_cache", "cdn_edge", "rate_limiter", "message_queue"],
    rules: [
      {
        id: "finops-node-cost-ceiling",
        title: "A single block exceeds the hourly cost ceiling",
        severity: "warning",
        kind: "max_node_cost",
        maxCostUsdPerHour: 4.5,
        detail:
          "One block is consuming more than the whole design's per-hour target. Costs scale with replicas, so an unnoticed replication factor multiplies the bill every hour of every day.",
        suggestion:
          "Right-size replicas against measured utilisation, move batch work to spot/graceful-interruption capacity, and set a budget alarm at 60% of the monthly ceiling.",
        conceptId: null,
      },
      {
        id: "finops-gpu-cost-ceiling",
        title: "Accelerated tier is above the inference budget",
        severity: "warning",
        kind: "max_node_cost",
        whenResourceIds: ["llm_inference", "agent_orchestrator"],
        maxCostUsdPerHour: 2.5,
        detail:
          "GPU hours dominate an AI bill. A single model tier above the ceiling usually means reserved capacity would beat on-demand, or the model is larger than the task needs.",
        suggestion:
          "Batch prompts, cap output tokens, cache aggressively, and compare reserved GPU commitments against measured token volume before scaling replicas.",
        conceptId: "llm-systems",
      },
      {
        id: "finops-cache-before-scale",
        title: "Premium tier scales without a cache in front",
        severity: "warning",
        kind: "require_primitive_when_present",
        whenResourceIds: ["cockroach_db", "cassandra_store", "search_cluster", "kafka_stream", "llm_inference"],
        requiredResourceIds: ["redis_cache", "cdn_edge"],
        detail:
          "These tiers are the expensive ones, and without a cache every request pays their full cost. Caching the cheap repeat traffic is almost always an order of magnitude cheaper than adding capacity.",
        suggestion:
          "Add a shared cache (or a CDN for read-heavy assets) and measure the hit rate before adding another replica to the premium tier.",
        conceptId: "caching-strategies",
      },
      {
        id: "finops-idle-worker-fleet",
        title: "Worker fleet has no queue feeding it",
        severity: "info",
        kind: "require_primitive_when_present",
        whenResourceIds: ["background_worker"],
        requiredResourceIds: ["message_queue", "kafka_stream", "event_bus"],
        detail:
          "Always-on workers with nothing to consume bill the full month while idling. Event-driven scaling only works when there is a queue exposing backlog as the scaling signal.",
        suggestion:
          "Put a queue in front and scale the fleet on queue depth (KEDA/HPA), so idle workers cost nothing.",
        conceptId: "message-queues",
      },
    ],
  },
  {
    id: "genai-rag-guardrails",
    name: "Enterprise GenAI & RAG Guardrails",
    version: "0.9.4",
    author: "SysCraft Labs",
    category: "AI & LLMs",
    summary:
      "Guardrails for LLM and agent topologies: metered inference, a semantic cache to absorb repeat prompts, grounded retrieval, and traceability for multi-step agent chains.",
    installedByDefault: false,
    tags: ["ai", "llm", "rag", "agents", "guardrails"],
    recommendedPrimitives: [
      "llm_inference",
      "vector_database",
      "redis_cache",
      "rate_limiter",
      "agent_orchestrator",
      "observability_stack",
    ],
    rules: [
      {
        id: "genai-rate-limit",
        title: "LLM tier is reachable without a rate limiter",
        severity: "critical",
        kind: "require_primitive_when_present",
        whenResourceIds: ["llm_inference", "agent_orchestrator"],
        requiredResourceIds: ["rate_limiter"],
        detail:
          "Token spend is unbounded by default: one runaway client or agent loop can exhaust the provider quota and the month's budget within minutes, and every other tenant starts getting 429s.",
        suggestion:
          "Meter per-tenant tokens with a rate limiter (requests and tokens per minute), and cap max output tokens plus agent loop depth.",
        conceptId: "rate-limiting",
      },
      {
        id: "genai-semantic-cache",
        title: "No semantic cache in front of the model",
        severity: "warning",
        kind: "require_primitive_when_present",
        whenResourceIds: ["llm_inference", "agent_orchestrator"],
        requiredResourceIds: ["redis_cache"],
        detail:
          "Enterprise prompt traffic is heavily repetitive. Serving exact and embedding-similar hits from a cache cuts GPU time proportionally to the hit rate — often 30-50% for support workloads.",
        suggestion:
          "Add a Redis-backed semantic cache keyed on normalized prompt embeddings with a strict similarity threshold and tenant partitioning.",
        conceptId: "caching-strategies",
      },
      {
        id: "genai-grounding",
        title: "Model answers without a retrieval tier",
        severity: "warning",
        kind: "require_primitive_when_present",
        whenResourceIds: ["llm_inference"],
        requiredResourceIds: ["vector_database"],
        detail:
          "A bare model answers from parametric memory: it cannot cite the current handbook, and hallucinations are indistinguishable from facts at the API boundary.",
        suggestion:
          "Ground prompts with top-k retrieval from a vector store, pass citations through to the client, and refuse to answer when retrieval confidence is low.",
        conceptId: "vector-search",
      },
      {
        id: "genai-agent-traces",
        title: "Agent chains are untraceable",
        severity: "info",
        kind: "require_primitive_when_present",
        whenResourceIds: ["agent_orchestrator"],
        requiredResourceIds: ["observability_stack", "otel_collector", "prometheus_stack"],
        detail:
          "A multi-step agent produces a tree of tool calls, retries and model invocations. Without spans you cannot tell whether a slow answer came from retrieval, the model, or a tool timeout.",
        suggestion:
          "Emit one trace per agent run with a span per step/tool call, and record token counts and cache hits as span attributes.",
        conceptId: "llm-systems",
      },
    ],
  },
  {
    id: "compliance-soc2-hipaa-pci",
    name: "SOC2 / HIPAA / PCI-DSS Compliance Gate",
    version: "1.2.0",
    author: "SysCraft Labs",
    category: "Security & Compliance",
    summary:
      "Maps architecture evidence to SOC 2, HIPAA and PCI-DSS control language: retained audit logs, rotatable encryption keys, filtered ingress, and reviewable change management.",
    installedByDefault: false,
    tags: ["compliance", "soc2", "hipaa", "pci-dss", "audit"],
    recommendedPrimitives: [
      "loki_logs",
      "observability_stack",
      "cert_manager",
      "secrets_manager",
      "web_application_firewall",
      "argocd_gitops",
    ],
    rules: [
      {
        id: "compliance-audit-trail",
        title: "No retained audit trail for the environment",
        severity: "critical",
        kind: "require_primitive_when_present",
        requiredResourceIds: ["loki_logs", "observability_stack"],
        detail:
          "SOC 2 CC7 and HIPAA §164.312(b) both require recorded, reviewable activity. Without centralized logs with defined retention there is no evidence to hand an auditor — and no timeline during an incident.",
        suggestion:
          "Ship application and audit logs to a central store with tamper-evident retention (12 months hot, 7 years cold for HIPAA) and a documented review cadence.",
        conceptId: "observability-tracing",
      },
      {
        id: "compliance-key-rotation",
        title: "No automated encryption key lifecycle",
        severity: "critical",
        kind: "require_primitive_when_present",
        requiredResourceIds: ["cert_manager", "secrets_manager"],
        detail:
          "PCI-DSS 3.6/3.7 and HIPAA §164.312(a)(2)(iv) require documented key management. Keys created once and never rotated are a finding on every assessment, and a full-disk compromise becomes a permanent one.",
        suggestion:
          "Centralize keys and certificates in a secrets manager with automated rotation, and record rotation events in the audit trail.",
        conceptId: null,
      },
      {
        id: "compliance-ingress-filter",
        title: "Ingress is not filtered by a WAF",
        severity: "critical",
        kind: "require_primitive_when_present",
        requiredResourceIds: ["web_application_firewall", "cloudflare_waf"],
        detail:
          "PCI-DSS 6.6 requires either a reviewed application or a WAF in front of public web surfaces. An unfiltered ingress is an automatic gap in the control matrix.",
        suggestion:
          "Terminate public traffic through a WAF with managed OWASP rules, log every block, and review false positives before enforcing.",
        conceptId: "rate-limiting",
      },
      {
        id: "compliance-change-management",
        title: "Cluster changes bypass review",
        severity: "info",
        kind: "require_primitive_when_present",
        whenResourceIds: ["k8s_deployment", "kube_apiserver"],
        requiredResourceIds: ["argocd_gitops"],
        detail:
          "SOC 2 CC8 expects changes to be authorized and traceable. Manual kubectl edits produce no diff, no approver and no rollback artifact.",
        suggestion:
          "Reconcile the cluster from Git (Argo CD / Flux) so every change is a reviewed pull request with an auditable deploy history.",
        conceptId: null,
      },
    ],
  },
];

const SEED_BY_ID = new Map(SEED_RESOURCES.map((resource) => [resource.id, resource]));
const VALID_RESOURCE_IDS = new Set(SEED_RESOURCES.map((resource) => resource.id));

/** The full primitive catalog, exposed for builder UIs that pick block ids. */
export function getPrimitiveOptions(): Array<{ id: string; name: string; category: string }> {
  return SEED_RESOURCES.map((resource) => ({
    id: resource.id,
    name: resource.name,
    category: resource.category,
  }));
}

export function isValidPrimitiveId(id: string): boolean {
  return VALID_RESOURCE_IDS.has(id);
}

function effectiveMultiAz(node: DoctorNodeInput): boolean {
  if (typeof node.overrides.multiAz === "boolean") return node.overrides.multiAz;
  return SEED_BY_ID.get(node.resourceId)?.defaults.multiAz ?? false;
}

function effectiveCostPerHour(node: DoctorNodeInput): number {
  const seed = SEED_BY_ID.get(node.resourceId);
  const perReplica =
    typeof node.overrides.costPerHourUsd === "number" && Number.isFinite(node.overrides.costPerHourUsd)
      ? node.overrides.costPerHourUsd
      : (seed?.defaults.costPerHourUsd ?? 0);
  const replicas = Math.max(
    1,
    node.overrides.replicationFactor ?? seed?.defaults.replicationFactor ?? 1,
  );
  return perReplica * replicas;
}

function nameOf(node: DoctorNodeInput): string {
  return node.label || SEED_BY_ID.get(node.resourceId)?.name || node.resourceId;
}

function matchesAny(value: string, allowed: string[] | undefined): boolean {
  return Array.isArray(allowed) && allowed.includes(value);
}

interface RuleEvaluationContext {
  plugin: SysCraftPlugin;
  rule: DeclarativePluginRule;
  nodes: DoctorNodeInput[];
  edges: DoctorEdgeInput[];
  nodeById: Map<string, DoctorNodeInput>;
  presentResourceIds: Set<string>;
}

function finding(
  ctx: RuleEvaluationContext,
  nodeIds: string[],
  detailOverride?: string,
): DoctorFinding {
  return {
    ruleId: `${ctx.plugin.id}:${ctx.rule.id}`,
    severity: ctx.rule.severity,
    title: `[Plugin: ${ctx.plugin.name}] ${ctx.rule.title}`,
    detail: detailOverride ? `${detailOverride} ${ctx.rule.detail}` : ctx.rule.detail,
    suggestion: ctx.rule.suggestion,
    nodeIds,
    conceptId: ctx.rule.conceptId,
  };
}

function evaluateRule(ctx: RuleEvaluationContext): DoctorFinding[] {
  const { rule, nodes, edges, nodeById, presentResourceIds } = ctx;

  switch (rule.kind) {
    case "require_primitive_when_present": {
      const required = rule.requiredResourceIds ?? [];
      if (required.length === 0) return [];
      if (required.some((id) => presentResourceIds.has(id))) return [];
      const triggerIds = rule.whenResourceIds;
      const triggerNodes = triggerIds
        ? nodes.filter((node) => triggerIds.includes(node.resourceId))
        : nodes;
      if (triggerNodes.length === 0) return [];
      const presentTriggers = [...new Set(triggerNodes.map((node) => node.resourceId))];
      const presentNames = presentTriggers
        .map((id) => SEED_BY_ID.get(id)?.name ?? id)
        .slice(0, 3)
        .join(", ");
      const missingNames = required
        .map((id) => SEED_BY_ID.get(id)?.name ?? id)
        .slice(0, 3)
        .join(" or ");
      return [
        finding(
          ctx,
          triggerNodes.map((node) => node.id),
          presentNames
            ? `Canvas has ${presentNames} but no ${missingNames}.`
            : `Canvas has nothing providing ${missingNames}.`,
        ),
      ];
    }

    case "forbid_direct_edge": {
      const sources = rule.sourceResourceIds ?? [];
      const targets = rule.targetResourceIds ?? [];
      if (sources.length === 0 || targets.length === 0) return [];
      const out: DoctorFinding[] = [];
      for (const edge of edges) {
        const source = nodeById.get(edge.source);
        const target = nodeById.get(edge.target);
        if (!source || !target) continue;
        if (!matchesAny(source.resourceId, sources)) continue;
        if (!matchesAny(target.resourceId, targets)) continue;
        out.push(
          finding(
            ctx,
            [source.id, target.id],
            `${nameOf(source)} is wired directly into ${nameOf(target)}.`,
          ),
        );
      }
      return out;
    }

    case "max_node_cost": {
      const ceiling = rule.maxCostUsdPerHour;
      if (typeof ceiling !== "number" || !Number.isFinite(ceiling)) return [];
      const scoped = rule.whenResourceIds
        ? nodes.filter((node) => matchesAny(node.resourceId, rule.whenResourceIds))
        : nodes;
      const out: DoctorFinding[] = [];
      for (const node of scoped) {
        const cost = effectiveCostPerHour(node);
        if (cost <= ceiling) continue;
        out.push(
          finding(
            ctx,
            [node.id],
            `${nameOf(node)} costs $${cost.toFixed(2)}/hr at its effective replica count, above the $${ceiling.toFixed(2)}/hr ceiling.`,
          ),
        );
      }
      return out;
    }

    case "require_multi_az_category": {
      const scoped = rule.whenResourceIds
        ? nodes.filter((node) => matchesAny(node.resourceId, rule.whenResourceIds))
        : nodes;
      const out: DoctorFinding[] = [];
      for (const node of scoped) {
        if (effectiveMultiAz(node)) continue;
        out.push(
          finding(
            ctx,
            [node.id],
            `${nameOf(node)} resolves to a single availability zone (multiAz = false).`,
          ),
        );
      }
      return out;
    }

    default:
      return [];
  }
}

const SEVERITY_RANK: Record<DoctorSeverity, number> = { critical: 0, warning: 1, info: 2 };

/**
 * Interprets every rule of every active plugin against one canvas snapshot.
 * Pure: no stores, no DOM, no randomness — safe to call from a worker, a test,
 * or inside a `useMemo`.
 */
export function runDeclarativePluginRules(
  plugins: SysCraftPlugin[],
  nodes: DoctorNodeInput[],
  edges: DoctorEdgeInput[],
): DoctorFinding[] {
  if (plugins.length === 0) return [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const presentResourceIds = new Set(nodes.map((node) => node.resourceId));
  const findings: DoctorFinding[] = [];

  for (const plugin of plugins) {
    for (const rule of plugin.rules) {
      findings.push(
        ...evaluateRule({ plugin, rule, nodes, edges, nodeById, presentResourceIds }),
      );
    }
  }

  return findings.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

/* ------------------------------------------------------------------ */
/* Manifest validation — shared by the JSON importer and the store.     */
/* ------------------------------------------------------------------ */

const VALID_KINDS = new Set<string>(DECLARATIVE_RULE_KINDS.map((entry) => entry.kind));
const VALID_SEVERITIES = new Set<string>(["critical", "warning", "info"]);

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function sanitizeRule(raw: unknown, index: number, pluginId: string): DeclarativePluginRule | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;
  const kind = asString(input.kind);
  if (!VALID_KINDS.has(kind)) return null;
  const severity = asString(input.severity, "warning");
  const title = asString(input.title, `Rule ${index + 1}`);
  const whenResourceIds = asStringArray(input.whenResourceIds).filter(isValidPrimitiveId);
  const requiredResourceIds = asStringArray(input.requiredResourceIds).filter(isValidPrimitiveId);
  const sourceResourceIds = asStringArray(input.sourceResourceIds).filter(isValidPrimitiveId);
  const targetResourceIds = asStringArray(input.targetResourceIds).filter(isValidPrimitiveId);
  const maxCostUsdPerHour =
    typeof input.maxCostUsdPerHour === "number" && Number.isFinite(input.maxCostUsdPerHour)
      ? Math.max(0, input.maxCostUsdPerHour)
      : undefined;

  if (kind === "require_primitive_when_present" && requiredResourceIds.length === 0) return null;
  if (kind === "forbid_direct_edge" && (sourceResourceIds.length === 0 || targetResourceIds.length === 0)) {
    return null;
  }
  if (kind === "max_node_cost" && maxCostUsdPerHour === undefined) return null;
  if (kind === "require_multi_az_category" && whenResourceIds.length === 0) return null;

  return {
    id: asString(input.id, `${pluginId}-rule-${index + 1}`),
    title,
    severity: (VALID_SEVERITIES.has(severity) ? severity : "warning") as DoctorSeverity,
    kind: kind as DeclarativeRuleKind,
    ...(whenResourceIds.length > 0 ? { whenResourceIds } : {}),
    ...(requiredResourceIds.length > 0 ? { requiredResourceIds } : {}),
    ...(sourceResourceIds.length > 0 ? { sourceResourceIds } : {}),
    ...(targetResourceIds.length > 0 ? { targetResourceIds } : {}),
    ...(maxCostUsdPerHour !== undefined ? { maxCostUsdPerHour } : {}),
    detail: asString(input.detail, "This plugin rule fired on the current canvas."),
    suggestion: asString(input.suggestion, "Adjust the canvas to satisfy the plugin's guardrail."),
    conceptId: typeof input.conceptId === "string" && input.conceptId.length > 0 ? input.conceptId : null,
  };
}

/**
 * Validates a plugin manifest (already parsed from JSON). Returns the normalized
 * plugin or an error message explaining the first structural problem. Used by
 * both `importPluginJson` and the in-app plugin builder.
 */
export function normalizePluginManifest(
  raw: unknown,
): { ok: true; plugin: SysCraftPlugin } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Plugin manifest must be a JSON object." };
  }
  const input = raw as Record<string, unknown>;
  const id = asString(input.id);
  if (!id) return { ok: false, error: "Plugin manifest is missing a non-empty `id`." };
  if (!/^[a-z0-9][a-z0-9-_]*$/i.test(id)) {
    return { ok: false, error: "Plugin `id` may only contain letters, digits, dashes and underscores." };
  }
  const name = asString(input.name);
  if (!name) return { ok: false, error: "Plugin manifest is missing a non-empty `name`." };
  const category = asString(input.category, "Custom");
  if (!PLUGIN_CATEGORIES.includes(category as PluginCategory)) {
    return {
      ok: false,
      error: `Plugin \`category\` must be one of: ${PLUGIN_CATEGORIES.join(", ")}.`,
    };
  }
  if (!Array.isArray(input.rules) || input.rules.length === 0) {
    return { ok: false, error: "Plugin manifest must declare at least one rule." };
  }
  const rules: DeclarativePluginRule[] = [];
  for (let index = 0; index < input.rules.length; index += 1) {
    const rule = sanitizeRule(input.rules[index], index, id);
    if (!rule) {
      return {
        ok: false,
        error: `Rule ${index + 1} is invalid: check \`kind\` and the block ids it references.`,
      };
    }
    rules.push(rule);
  }
  const recommendedPrimitives = asStringArray(input.recommendedPrimitives).filter(isValidPrimitiveId);

  return {
    ok: true,
    plugin: {
      id,
      name,
      version: asString(input.version, "1.0.0"),
      author: asString(input.author, "Community"),
      category: category as PluginCategory,
      summary: asString(input.summary, "Imported architecture plugin."),
      installedByDefault: typeof input.installedByDefault === "boolean" ? input.installedByDefault : false,
      tags: asStringArray(input.tags),
      rules,
      recommendedPrimitives,
    },
  };
}

/** Convenience wrapper: parse a JSON string then validate it. */
export function parsePluginManifestJson(
  jsonText: string,
): { ok: true; plugin: SysCraftPlugin } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: "That is not valid JSON." };
  }
  return normalizePluginManifest(parsed);
}

/** Serializes a plugin to a pretty-printed manifest for the Export JSON button. */
export function serializePlugin(plugin: SysCraftPlugin): string {
  return JSON.stringify(plugin, null, 2);
}

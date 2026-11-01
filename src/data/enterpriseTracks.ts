/**
 * Enterprise L&D content: role-based competency tracks, the six readiness
 * pillars that back the architect radar, starter Architecture Decision
 * Records, and a sample engineering cohort that managers can clone locally.
 *
 * Every module / lab / blueprint reference below points at an id that exists
 * in `pathData.ts`, `guidedLabs.ts`, and `blueprints.ts`, so the enterprise hub
 * can compute real progress without a second source of truth.
 */

/* ------------------------------------------------------------------ */
/* Readiness pillars                                                   */
/* ------------------------------------------------------------------ */

export const READINESS_PILLARS = [
  {
    id: "scalability",
    label: "Scalability & Queuing",
    shortLabel: "Scalability",
    description: "Queueing math, sharding, replication, and the load path from edge to database.",
  },
  {
    id: "aws",
    label: "AWS Architecture",
    shortLabel: "AWS",
    description: "Multi-AZ VPC design, managed data services, and Well-Architected trade-offs.",
  },
  {
    id: "cloudflare",
    label: "Cloudflare Edge",
    shortLabel: "Cloudflare Edge",
    description: "Anycast routing, tiered cache, Workers, tunnels, and zero-egress storage.",
  },
  {
    id: "kubernetes",
    label: "Kubernetes Internals",
    shortLabel: "Kubernetes",
    description: "Control plane, data plane, operators, CRDs, and cluster upgrade safety.",
  },
  {
    id: "security",
    label: "Security & Zero-Trust",
    shortLabel: "Zero-Trust Security",
    description: "Identity-aware access, mTLS, supply-chain attestation, and CVE response.",
  },
  {
    id: "finops",
    label: "FinOps & Governance",
    shortLabel: "FinOps & ADRs",
    description: "Unit economics, commitment planning, error budgets, and decision records.",
  },
] as const;

export type ReadinessPillarId = (typeof READINESS_PILLARS)[number]["id"];

/* ------------------------------------------------------------------ */
/* Role-based tracks                                                   */
/* ------------------------------------------------------------------ */

export interface EnterpriseRoleTrack {
  id: string;
  roleLevel: string;
  title: string;
  summary: string;
  estimatedHours: number;
  focusPillars: string[];
  moduleIds: string[];
  requiredLabIds: string[];
  blueprintId: string;
  capstonePrompt: string;
}

export const ENTERPRISE_ROLE_TRACKS: EnterpriseRoleTrack[] = [
  {
    id: "l3-l4-production-engineer",
    roleLevel: "L3–L4 Engineer",
    title: "Production Systems Engineer",
    summary:
      "Ship the first reliable version of a service: one box to a load-balanced pair, cache invalidation, read replicas, and a queue that absorbs the launch spike without melting the database.",
    estimatedHours: 36,
    focusPillars: ["Scalability & Queuing", "AWS Architecture", "FinOps & Governance"],
    moduleIds: [
      "how-to-approach-design",
      "simple-system",
      "caching",
      "one-server-not-enough",
      "one-database-not-enough",
      "rate-limiting",
      "growing-big",
    ],
    requiredLabIds: ["bitly-url-shortener", "distributed-rate-limiter", "pastebin-service"],
    blueprintId: "url-shortener",
    capstonePrompt:
      "A multi-tenant URL shortener is about to be featured in a national campaign. Design the redirect and create paths for a tenfold traffic spike, prove the cache-loss failure mode is survivable, and keep the steady-state bill under the stated hourly budget. Deliver the CAP table, the queueing math, the rollback plan, and one paragraph on which single metric pages you first.",
  },
  {
    id: "l5-senior-scale",
    roleLevel: "L5 Senior Engineer",
    title: "Distributed Systems Owner",
    summary:
      "Own correctness and latency across services: replication and quorum trade-offs, partition keys that do not hotspot, Kafka delivery semantics, and an active-active read path with a rehearsed regional failover.",
    estimatedHours: 44,
    focusPillars: ["Scalability & Queuing", "Kubernetes Internals", "AWS Architecture"],
    moduleIds: [
      "distributed-problems",
      "replication-depth",
      "partitioning-depth",
      "messaging-kafka",
      "cross-service-transactions",
      "events-streams",
      "availability-global",
      "caching",
      "one-database-not-enough",
    ],
    requiredLabIds: ["whatsapp-chat", "twitter-timeline", "uber-matching", "dynamodb-from-scratch"],
    blueprintId: "global-active-active",
    capstonePrompt:
      "Design a global messaging and presence platform for fifty million concurrent connections. Defend your choice of wide-column inbox, the offline spool, and the presence staleness bound. Then walk through a full region evacuation: what drains, what rejects writes, and what the user sees during the failover window.",
  },
  {
    id: "l6-staff-principal",
    roleLevel: "L6 Staff / Principal Architect",
    title: "Principal Architect & Platform Strategist",
    summary:
      "Set multi-year technical direction: edge-first ingress, an internal Kubernetes platform with golden paths, zero-trust segmentation, and a FinOps model that survives an executive review.",
    estimatedHours: 56,
    focusPillars: [
      "Scalability & Queuing",
      "AWS Architecture",
      "Cloudflare Edge",
      "Kubernetes Internals",
      "Security & Zero-Trust",
      "FinOps & Governance",
    ],
    moduleIds: [
      "aws-architecture-scratch-to-prod",
      "cloudflare-edge-and-workers",
      "kubernetes-control-and-data-plane",
      "extensible-plugins-and-operators",
      "security-zero-trust-and-cve-defense",
      "principal-architect-and-finops",
      "availability-global",
      "coordination-and-time",
    ],
    requiredLabIds: ["netflix-streaming", "razorpay-payments", "agentic-rag-support", "youtube-upload-playback"],
    blueprintId: "full-k8s-platform",
    capstonePrompt:
      "Present a board-ready architecture for a regulated streaming and payments business: anycast edge in front of a multi-region origin, an internal developer platform on Kubernetes, a documented zero-trust posture, and a three-year TCO with commitment coverage. Include the two decisions you would reverse if the budget were cut by a third, and the ADRs that record why.",
  },
  {
    id: "secops-cloud-native",
    roleLevel: "SecOps & Cloud-Native Architect",
    title: "Zero-Trust Cloud-Native Defender",
    summary:
      "Assume the network is hostile: identity-aware ingress, workload mTLS, least-privilege service accounts, supply-chain attestation, and a CVE response path that can quarantine a workload without taking the platform down.",
    estimatedHours: 40,
    focusPillars: ["Security & Zero-Trust", "Kubernetes Internals", "Cloudflare Edge"],
    moduleIds: [
      "security-zero-trust-and-cve-defense",
      "kubernetes-control-and-data-plane",
      "extensible-plugins-and-operators",
      "cloudflare-edge-and-workers",
      "rate-limiting",
      "cross-service-transactions",
    ],
    requiredLabIds: ["razorpay-payments", "agentic-rag-support", "distributed-rate-limiter", "whatsapp-chat"],
    blueprintId: "cloudflare-edge-security",
    capstonePrompt:
      "A critical CVE lands in a base image used by forty services. Write the containment plan: which ingress rules tighten first, how you verify workload identity during the rollout, how the payment path keeps idempotency while pods recycle, and how you prove to auditors that no request bypassed the edge.",
  },
];

/* ------------------------------------------------------------------ */
/* Architecture Decision Records                                       */
/* ------------------------------------------------------------------ */

export type AdrStatus = "Proposed" | "Accepted" | "Superseded";

export interface AdrRecord {
  id: string;
  title: string;
  status: AdrStatus;
  date: string;
  context: string;
  consideredOptions: string[];
  decision: string;
  consequences: string;
  targetSlaPercent: number;
  estimatedMonthlyBudgetUsd: number;
}

export const STARTER_ADRS: AdrRecord[] = [
  {
    id: "ADR-001",
    title:
      "Adopt Cloudflare Anycast Edge + Tiered Cache + Outbound Tunnels in front of AWS Multi-AZ Origin",
    status: "Accepted",
    date: "2026-02-14",
    context:
      "Our customer base is now 62% outside us-east-1, and the marketing launch calendar produces flash crowds that saturate the ALB and NAT gateways. The current CloudFront distribution still sends cache misses through a single origin region, and the security team wants the origin to stop accepting inbound internet traffic entirely. The last two launch incidents averaged 41 minutes of elevated p99 and one NAT data-processing bill spike of 38,000 USD.",
    consideredOptions: [
      "CloudFront + Global Accelerator + multi-region active-active origin",
      "Cloudflare anycast edge with Tiered Cache, Cache Rules, and outbound-only cloudflared tunnels",
      "Akamai Ion in front of a single-region ALB with an upgraded NAT gateway fleet",
      "Keep the current stack and pre-warm origins before every launch",
    ],
    decision:
      "Standardize public ingress on Cloudflare anycast. Cacheable GET traffic terminates at the nearest PoP, Tiered Cache collapses misses at a regional upper tier, and origin access is restricted to two outbound-only tunnels per region. AWS remains the system of record; the ALB is no longer internet-reachable. Launch-day hero assets are pre-warmed with a cache-tag purge runbook.",
    consequences:
      "Origin egress and NAT data processing drop by an estimated 74%, and cache-hit traffic no longer pays cloud egress. The trade-off is a second control plane: Cloudflare rules, tunnel health, and cache-tag purges must be in the same change-review process as AWS changes. We add a synthetic check per PoP and a quarterly cache-key review. Break-glass origin access is a documented SSM session, not an open security group.",
    targetSlaPercent: 99.99,
    estimatedMonthlyBudgetUsd: 14800,
  },
  {
    id: "ADR-002",
    title: "Standardize Kubernetes Data Plane on Cilium eBPF & Envoy mTLS Service Mesh",
    status: "Proposed",
    date: "2026-04-02",
    context:
      "Three platform teams run three different service-mesh configurations: sidecar Istio in payments, Linkerd in growth, and plain kube-proxy elsewhere. Incident reviews show that 40% of cross-team debugging time is spent proving which proxy handled a request. The security roadmap requires workload identity and mTLS everywhere before the next audit, and node-level kube-proxy conntrack is a recurring source of latency spikes above 30,000 connections per node.",
    consideredOptions: [
      "Sidecar-per-pod Istio with its own CA and Envoy filters",
      "Cilium eBPF data plane with per-node Envoy and Cilium mutual authentication",
      "Linkerd with a hosted trust anchor and per-namespace extensions",
      "Stay multi-mesh and document the differences per namespace",
    ],
    decision:
      "Adopt Cilium as the single CNI and data plane, with eBPF-based load balancing replacing kube-proxy, per-node Envoy for L7 policy and ingress, and Cilium mutual authentication for workload identity. Existing Istio authorization policies are translated into Cilium network policies and validated in shadow mode for one release before enforcement. Mesh certificates rotate through the platform CA with a documented trust-anchor recovery drill.",
    consequences:
      "One observable data plane, lower per-pod overhead, and a single identity model for network policy. The team must build Cilium upgrade expertise and a recovery path that does not assume kube-proxy exists. Windows node pools remain on the legacy CNI until the vendor ships parity, so two clusters stay out of the initial wave. Rollback is a blue-green node-pool replacement, not an in-place downgrade.",
    targetSlaPercent: 99.95,
    estimatedMonthlyBudgetUsd: 9200,
  },
  {
    id: "ADR-003",
    title: "Transactional Outbox + Kafka for Cross-Service Payment Idempotency",
    status: "Accepted",
    date: "2025-11-19",
    context:
      "The payments service writes to Postgres and then publishes a Kafka event. During the last two partial outages the publish succeeded but the transaction rolled back, producing phantom captures; a retry path also double-charged eleven customers. Finance requires exactly-once effects at the ledger boundary, and the reconciliation job currently runs hourly, which is too late for customer-visible errors.",
    consideredOptions: [
      "Two-phase commit between Postgres and Kafka",
      "Saga orchestration with synchronous compensations",
      "Transactional outbox table plus a Debezium/Kafka relay and idempotent consumers",
      "Publish before commit and rely on a nightly reconciliation sweep",
    ],
    decision:
      "Persist a payment event row in the same Postgres transaction as the ledger mutation. A relay publishes outbox rows to Kafka using the payment id as the partition key, and every consumer enforces an idempotency key with a durable dedupe store. Producer retries are safe because the outbox row is the source of truth; consumer retries are safe because the dedupe record commits with the effect. A reconciliation job compares outbox status, ledger state, and downstream acknowledgements every five minutes.",
    consequences:
      "Phantom captures and duplicate ledger entries become structurally impossible at the service boundary. Kafka becomes a required dependency for payment event propagation, so the relay needs its own SLO, lag alerts, and a replay runbook. Consumers must keep idempotency records for at least the maximum replay window. The outbox table adds write amplification to the payments database, which we budget for in the capacity plan and index by created_at for purge.",
    targetSlaPercent: 99.99,
    estimatedMonthlyBudgetUsd: 6400,
  },
];

/* ------------------------------------------------------------------ */
/* Sample enterprise cohort                                            */
/* ------------------------------------------------------------------ */

export interface TeamMemberReadiness {
  id: string;
  name: string;
  title: string;
  roleLevel: string;
  trackId: string;
  pillarScores: Record<ReadinessPillarId, number>;
  labsCompleted: number;
  certifications: string[];
  lastActive: string;
}

export const SAMPLE_TEAM_COHORT: TeamMemberReadiness[] = [
  {
    id: "emp-1042",
    name: "Ananya Rao",
    title: "Senior Backend Engineer",
    roleLevel: "L5 Senior Engineer",
    trackId: "l5-senior-scale",
    pillarScores: {
      scalability: 78,
      aws: 71,
      cloudflare: 54,
      kubernetes: 66,
      security: 61,
      finops: 48,
    },
    labsCompleted: 7,
    certifications: ["AWS Solutions Architect – Associate", "CKA"],
    lastActive: "2026-10-28",
  },
  {
    id: "emp-0871",
    name: "Marcus Chen",
    title: "Staff Platform Engineer",
    roleLevel: "L6 Staff / Principal Architect",
    trackId: "l6-staff-principal",
    pillarScores: {
      scalability: 88,
      aws: 84,
      cloudflare: 79,
      kubernetes: 92,
      security: 76,
      finops: 71,
    },
    labsCompleted: 11,
    certifications: ["CKA", "CKS", "AWS Solutions Architect – Professional"],
    lastActive: "2026-10-30",
  },
  {
    id: "emp-1188",
    name: "Priya Nair",
    title: "Cloud Security Engineer",
    roleLevel: "SecOps & Cloud-Native Architect",
    trackId: "secops-cloud-native",
    pillarScores: {
      scalability: 69,
      aws: 74,
      cloudflare: 82,
      kubernetes: 63,
      security: 90,
      finops: 58,
    },
    labsCompleted: 8,
    certifications: ["CKS", "AWS Security – Specialty"],
    lastActive: "2026-10-29",
  },
  {
    id: "emp-0934",
    name: "Diego Álvarez",
    title: "Senior Site Reliability Engineer",
    roleLevel: "L5 Senior Engineer",
    trackId: "l5-senior-scale",
    pillarScores: {
      scalability: 81,
      aws: 66,
      cloudflare: 61,
      kubernetes: 84,
      security: 72,
      finops: 64,
    },
    labsCompleted: 9,
    certifications: ["CKA", "Google Cloud Professional Cloud Architect"],
    lastActive: "2026-10-27",
  },
  {
    id: "emp-1305",
    name: "Sofia Kowalski",
    title: "Backend Engineer",
    roleLevel: "L3–L4 Engineer",
    trackId: "l3-l4-production-engineer",
    pillarScores: {
      scalability: 62,
      aws: 55,
      cloudflare: 44,
      kubernetes: 39,
      security: 52,
      finops: 33,
    },
    labsCompleted: 4,
    certifications: ["AWS Cloud Practitioner"],
    lastActive: "2026-10-30",
  },
  {
    id: "emp-0619",
    name: "Rahul Mehta",
    title: "Principal Architect",
    roleLevel: "L6 Staff / Principal Architect",
    trackId: "l6-staff-principal",
    pillarScores: {
      scalability: 91,
      aws: 89,
      cloudflare: 85,
      kubernetes: 82,
      security: 88,
      finops: 83,
    },
    labsCompleted: 12,
    certifications: ["AWS Solutions Architect – Professional", "CKA", "TOGAF Level 2"],
    lastActive: "2026-10-26",
  },
];

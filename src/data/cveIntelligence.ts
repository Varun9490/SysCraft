/**
 * Curated infrastructure CVE intelligence for the Security Architecture Hub.
 *
 * Every record is written from an architect's point of view: what the bug
 * actually lets an attacker do, which structural assumption it breaks, and
 * which SysCraft defense primitives restore the boundary. The feed is a local
 * cache so the hub works offline, in an air-gapped lab, and inside a static
 * export — `src/engine/cveScanner.ts` can merge live NVD / CISA KEV / CVE.now
 * records on top of it without losing this editorial layer.
 */

export type StrideCategory =
  | "Spoofing"
  | "Tampering"
  | "Repudiation"
  | "Information Disclosure"
  | "Denial of Service"
  | "Elevation of Privilege";

export type CveSeverity = "CRITICAL" | "HIGH" | "MEDIUM";

export type CveEcosystem =
  | "Kubernetes"
  | "Cloudflare / Edge"
  | "AWS / Cloud"
  | "Databases & Cache"
  | "Service Mesh & API"
  | "AI & LLM";

export interface CveIntelligenceItem {
  /** Canonical CVE identifier, e.g. "CVE-2025-1974". */
  id: string;
  title: string;
  /** ISO date (YYYY-MM-DD) the CVE was published. */
  published: string;
  /** CVSS v3.1 base score as published by the vendor or NVD. */
  cvss: number;
  severity: CveSeverity;
  /** Primary weakness class, e.g. "CWE-94". */
  cwe: string;
  /** Dominant STRIDE impact used by the threat-model breakdown. */
  stride: StrideCategory;
  ecosystem: CveEcosystem;
  /** SysCraft primitive ids that carry this vulnerability class. */
  affectedPrimitives: string[];
  summary: string;
  /** The structural assumption the bug invalidates. */
  architecturalRootCause: string;
  /** Defense-in-depth pattern that removes the class, not just the instance. */
  mitigationPattern: string;
  /** SysCraft primitive ids that close the boundary on a canvas. */
  recommendedDefensePrimitives: string[];
  /** True when CISA KEV / vendor reporting confirms real-world exploitation. */
  exploitedInWild: boolean;
  sourceUrl: string;
}

export const STRIDE_CATEGORIES: StrideCategory[] = [
  "Spoofing",
  "Tampering",
  "Repudiation",
  "Information Disclosure",
  "Denial of Service",
  "Elevation of Privilege",
];

export const CVE_SEVERITIES: CveSeverity[] = ["CRITICAL", "HIGH", "MEDIUM"];

export const CVE_ECOSYSTEMS: CveEcosystem[] = [
  "Kubernetes",
  "Cloudflare / Edge",
  "AWS / Cloud",
  "Databases & Cache",
  "Service Mesh & API",
  "AI & LLM",
];

export const STRIDE_INTENT: Record<StrideCategory, string> = {
  Spoofing: "Pretending to be a trusted service, user, or key.",
  Tampering: "Changing data, config, or bytes in flight or at rest.",
  Repudiation: "Denying an action because the audit trail can be altered.",
  "Information Disclosure": "Reading data the caller was never granted.",
  "Denial of Service": "Making the system unavailable to legitimate traffic.",
  "Elevation of Privilege": "Turning low trust into host, cluster, or tenant control.",
};

/**
 * Offline-first intelligence cache. Ordered by attack surface — cluster control
 * plane, runtime, edge, managed cloud, data tier, then AI serving — so the hub
 * opens on the boundary failures architects most often get wrong.
 */
export const CURATED_CVE_FEED: CveIntelligenceItem[] = [
  {
    id: "CVE-2025-1974",
    title: 'Ingress-NGINX Admission Controller Unauthenticated RCE ("IngressNightmare")',
    published: "2025-03-24",
    cvss: 9.8,
    severity: "CRITICAL",
    cwe: "CWE-94",
    stride: "Elevation of Privilege",
    ecosystem: "Kubernetes",
    affectedPrimitives: ["kube_ingress_gateway", "ingress_controller", "kube_apiserver"],
    summary:
      "The ingress-nginx admission controller accepted AdmissionReview requests without authenticating the caller. Any pod that could reach the webhook could submit a crafted Ingress object, inject NGINX directives into the generated configuration, execute code inside the controller, and then read Secrets across every namespace using the controller's service account.",
    architecturalRootCause:
      "A control-plane webhook sat on the pod-routable network and treated object content as trusted configuration. The controller also held cluster-wide Secret read access, so one unauthenticated request crossed both the network and the tenant boundary at once.",
    mitigationPattern:
      "Keep admission webhooks off the workload network, require mTLS client authentication on the listener, and scope the controller role to the resources it actually mutates. Treat ingress annotations as executable input: allow-list them, run the controller with a read-only root filesystem, and ship the patched release through the same GitOps pipeline as the rest of the cluster.",
    recommendedDefensePrimitives: ["cni_overlay", "cert_manager", "secrets_manager", "web_application_firewall"],
    exploitedInWild: true,
    sourceUrl: "https://nvd.nist.gov/vuln/detail/CVE-2025-1974",
  },
  {
    id: "CVE-2024-21626",
    title: 'runc File Descriptor Leak Container Escape ("Leaky Vessels")',
    published: "2024-01-31",
    cvss: 8.6,
    severity: "HIGH",
    cwe: "CWE-403",
    stride: "Elevation of Privilege",
    ecosystem: "Kubernetes",
    affectedPrimitives: ["k8s_deployment", "container_registry", "k8s_cluster"],
    summary:
      "runc leaked a host file descriptor for the container's working directory before exec, and a container process could keep it open. By changing directory through that descriptor, a workload escaped to the host filesystem and could overwrite host binaries, read other tenants' mounts, or collect node credentials.",
    architecturalRootCause:
      "The container runtime inherited a privileged host descriptor across the exec boundary. Isolation depended on namespace correctness alone, with no seccomp or LSM rule denying use of leaked descriptors.",
    mitigationPattern:
      "Pin runc and containerd to patched releases and verify the runtime version during image admission. Add a seccomp profile that blocks the abuse primitive, run workloads rootless with user namespaces, mount the host filesystem read-only, and keep node pools on an immutable rebuild path so one runtime patch rolls everywhere.",
    recommendedDefensePrimitives: ["cni_overlay", "secrets_manager", "identity_provider", "cert_manager"],
    exploitedInWild: false,
    sourceUrl: "https://nvd.nist.gov/vuln/detail/CVE-2024-21626",
  },
  {
    id: "CVE-2026-53495",
    title: "containerd CRI ExecSync Goroutine Leak Leads to Node-Level Denial of Service",
    published: "2026-09-14",
    cvss: 6.8,
    severity: "MEDIUM",
    cwe: "CWE-400",
    stride: "Denial of Service",
    ecosystem: "Kubernetes",
    affectedPrimitives: ["k8s_cluster", "k8s_deployment", "container_registry"],
    summary:
      "containerd's CRI ExecSync handler drained the attach IO stream with a select block that never waited on the request context being canceled. When an exec probe or lifecycle hook spawned a background child process that inherited stdout/stderr, the pipe never completed and the drain goroutine parked forever. Kubernetes repeats exec probes on short intervals, so blocked goroutines accumulated linearly, host memory grew, and the kernel OOM killer terminated containerd — taking the runtime and every workload managing container that depends on it down until a manual restart.",
    architecturalRootCause:
      "The runtime trusted that a child process would always close its inherited standard streams, and it never bounded the IO drain with a context cancellation or a hard timeout. Every orchestrator retry converted a probe failure into a permanently held resource, so node availability depended on workload behavior instead of a runtime budget.",
    mitigationPattern:
      "Upgrade containerd to 1.7.35, 2.0.12, 2.2.8, or 2.3.5, which adds a ctx.Done() branch to the drain select and uses a deferred context for execProcess.Delete. Replace exec probes with httpGet or tcpSocket probes where feasible, and make any process a probe spawns redirect its standard streams to /dev/null. Constrain containerd memory with a systemd MemoryHigh limit only as a last resort, and alert on goroutine and RSS growth so a leak is caught before the OOM killer fires.",
    recommendedDefensePrimitives: ["rate_limiter", "web_application_firewall", "api_gateway", "observability_stack"],
    exploitedInWild: false,
    sourceUrl: "https://nvd.nist.gov/vuln/detail/CVE-2026-53495",
  },
  {
    id: "CVE-2023-44487",
    title: "HTTP/2 Rapid Reset DDoS Attack on L7 Load Balancers & Gateways",
    published: "2023-10-10",
    cvss: 7.5,
    severity: "HIGH",
    cwe: "CWE-400",
    stride: "Denial of Service",
    ecosystem: "Cloudflare / Edge",
    affectedPrimitives: [
      "cdn_edge",
      "api_gateway",
      "dns_load_balancer",
      "envoy_mesh",
      "kube_ingress_gateway",
      "ingress_controller",
    ],
    summary:
      "HTTP/2 servers created a stream for each HEADERS frame and immediately reset it. Cheap RST_STREAM frames forced expensive stream setup and teardown, letting a modest botnet drive millions of requests per second and exhaust L7 proxies, CDNs, and ingress controllers long before the origin saw traffic.",
    architecturalRootCause:
      "L7 termination honored client-controlled stream lifecycles without accounting for the cost of cancelled work. No per-connection concurrent-stream cap, reset budget, or edge request-rate ceiling existed in front of the origin.",
    mitigationPattern:
      "Enforce concurrent-stream limits at the edge, charge RST_STREAM against a per-client budget, and shed excess streams before they reach the origin. Keep connection-level rate limits and anycast scrubbing in front of every L7 entry point, and verify each proxy's HTTP/2 implementation is patched.",
    recommendedDefensePrimitives: ["cloudflare_waf", "rate_limiter", "web_application_firewall", "api_gateway"],
    exploitedInWild: true,
    sourceUrl: "https://nvd.nist.gov/vuln/detail/CVE-2023-44487",
  },
  {
    id: "CVE-2024-6387",
    title: 'OpenSSH Server Signal Handler Race Condition RCE ("regreSSHion")',
    published: "2024-07-01",
    cvss: 8.1,
    severity: "HIGH",
    cwe: "CWE-364",
    stride: "Elevation of Privilege",
    ecosystem: "AWS / Cloud",
    affectedPrimitives: ["rest_service", "serverless_function", "background_worker", "k8s_deployment"],
    summary:
      "A signal-handler race in OpenSSH's server let an unauthenticated client win a use-after-free during SIGALRM handling. On glibc-based Linux hosts, a patient attacker could parlay that race into remote root code execution against any sshd exposed to the internet.",
    architecturalRootCause:
      "A privileged network daemon ran user-space signal handling around asynchronous session setup. The race window was reachable pre-authentication, so the host's management port became an unauthenticated root attack surface.",
    mitigationPattern:
      "Patch OpenSSH and set LoginGraceTime to zero where operationally viable. Never expose sshd publicly: front administrative access with an identity-aware proxy or bastion, bind sshd to a private overlay network, and alert on pre-authentication connection churn.",
    recommendedDefensePrimitives: ["cni_overlay", "identity_provider", "secrets_manager", "rate_limiter"],
    exploitedInWild: false,
    sourceUrl: "https://nvd.nist.gov/vuln/detail/CVE-2024-6387",
  },
  {
    id: "CVE-2024-45337",
    title: "Go x/crypto/ssh ServerCallback Authentication Bypass",
    published: "2024-12-11",
    cvss: 9.1,
    severity: "CRITICAL",
    cwe: "CWE-287",
    stride: "Spoofing",
    ecosystem: "Service Mesh & API",
    affectedPrimitives: ["api_gateway", "rest_service", "envoy_mesh", "argocd_gitops", "otel_collector"],
    summary:
      "Applications that implemented ServerConfig.PublicKeyCallback and returned nil for an unknown key could have the callback invoked again on the same connection, authenticating as a different user. The bug turns a common authorization pattern into an identity bypass on SSH-fronted APIs, GitOps agents, and collectors.",
    architecturalRootCause:
      "The SSH server library carried per-connection authentication state without binding it to the key that was actually verified. Authorization leaked across callback invocations, so identity was inferred from mutable session state instead of a verified credential.",
    mitigationPattern:
      "Upgrade golang.org/x/crypto and audit every PublicKeyCallback for nil-error returns on unknown keys. Terminate SSH at a hardened gateway that issues short-lived certificates from a central identity provider, and never trust a bare username without a certificate bound to the key.",
    recommendedDefensePrimitives: ["identity_provider", "cert_manager", "secrets_manager", "cni_overlay"],
    exploitedInWild: false,
    sourceUrl: "https://nvd.nist.gov/vuln/detail/CVE-2024-45337",
  },
  {
    id: "CVE-2024-31449",
    title: "Redis Lua `bit` Library Stack Buffer Overflow RCE",
    published: "2024-10-07",
    cvss: 8.8,
    severity: "HIGH",
    cwe: "CWE-121",
    stride: "Elevation of Privilege",
    ecosystem: "Databases & Cache",
    affectedPrimitives: ["redis_cache", "memcached_cluster"],
    summary:
      "The Redis Lua sandbox exposed its `bit` library with insufficient bounds checks, so a crafted BITFIELD or BITPOS script wrote past a stack buffer. An authenticated user with EVAL rights could crash the server or execute code in the redis-server process, then pivot to every dataset and session token in the cache.",
    architecturalRootCause:
      "A multi-tenant data plane executed untrusted scripts in-process, in the same memory space as credentials. The Lua sandbox was treated as a security boundary even though its native bindings were never memory-safe.",
    mitigationPattern:
      "Patch Redis and disable EVAL/EVALSHA for application tenants. Split cache instances by trust domain, require TLS plus ACL-scoped users, and keep the cache behind the service mesh so a compromised node cannot reach unrelated datasets. Treat any cache holding session tokens as a Tier-0 secret store.",
    recommendedDefensePrimitives: ["secrets_manager", "cni_overlay", "rate_limiter", "cert_manager"],
    exploitedInWild: false,
    sourceUrl: "https://nvd.nist.gov/vuln/detail/CVE-2024-31449",
  },
  {
    id: "CVE-2024-10979",
    title: "PostgreSQL PL/Perl Environment Variable Manipulation",
    published: "2024-11-14",
    cvss: 8.8,
    severity: "HIGH",
    cwe: "CWE-15",
    stride: "Elevation of Privilege",
    ecosystem: "Databases & Cache",
    affectedPrimitives: ["postgres_db", "cockroach_db"],
    summary:
      "PL/Perl let an unprivileged database user set process environment variables through a crafted function call. Overriding PATH or a library search path turned a database role into operating-system code execution as the postgres service account, exposing every tenant database on the cluster.",
    architecturalRootCause:
      "An untrusted procedural language ran inside the database server process with inherited environment control. Database roles were treated as application-level identities even though the language runtime could mutate the host process.",
    mitigationPattern:
      "Patch PostgreSQL and drop PL/Perl from application databases. Keep untrusted procedural languages out of production images, enforce per-tenant roles with least privilege, run the database on a private overlay, and source credentials from a managed secret store instead of process environment variables.",
    recommendedDefensePrimitives: ["secrets_manager", "cni_overlay", "identity_provider"],
    exploitedInWild: false,
    sourceUrl: "https://nvd.nist.gov/vuln/detail/CVE-2024-10979",
  },
  {
    id: "CVE-2024-24786",
    title: "Protobuf-Go Infinite Loop Denial of Service in Envoy / K8s Control Plane",
    published: "2024-03-06",
    cvss: 7.5,
    severity: "HIGH",
    cwe: "CWE-835",
    stride: "Denial of Service",
    ecosystem: "Service Mesh & API",
    affectedPrimitives: ["envoy_mesh", "kube_apiserver", "otel_collector", "api_gateway"],
    summary:
      "protojson.Unmarshal could loop forever on a message containing a recursive Any payload. Any service that parsed untrusted protobuf JSON — Envoy xDS adapters, Kubernetes aggregation layers, telemetry collectors — could pin a CPU core and stop serving after a single small request.",
    architecturalRootCause:
      "A shared serialization library processed attacker-controlled recursive structures without a depth or node budget. Unbounded recursion on the control plane's parsing path had no timeout capable of preempting it.",
    mitigationPattern:
      "Upgrade google.golang.org/protobuf and place a hard request-size plus recursion-depth limit in front of every JSON/protobuf ingress. Run control-plane parsers in isolated workers with CPU quotas, and keep admission and aggregation endpoints behind an API gateway with per-client concurrency caps.",
    recommendedDefensePrimitives: ["rate_limiter", "api_gateway", "web_application_firewall", "cni_overlay"],
    exploitedInWild: false,
    sourceUrl: "https://nvd.nist.gov/vuln/detail/CVE-2024-24786",
  },
  {
    id: "CVE-2024-5321",
    title: "Kubernetes kube-proxy / Node Log Permission Privilege Escalation",
    published: "2024-08-13",
    cvss: 7.8,
    severity: "HIGH",
    cwe: "CWE-276",
    stride: "Repudiation",
    ecosystem: "Kubernetes",
    affectedPrimitives: ["kubelet_kubeproxy", "k8s_cluster", "k8s_deployment", "cni_overlay"],
    summary:
      "On clusters with Windows nodes, default ACLs let BUILTIN\\Users read container logs and the NT event log, while permissive node credentials let a workload with pod-create rights escalate toward node administration. The same gap lets an attacker erase the audit trail that incident response depends on, turning a local foothold into an unattributable one.",
    architecturalRootCause:
      "Node-level log and credential ACLs inherited broad built-in group access instead of least privilege. Pod scheduling rights were effectively equivalent to node administration, and log integrity was not isolated from workload identities.",
    mitigationPattern:
      "Patch kubelet and kube-proxy on every node pool, restrict pod-create rights through admission policy, and ship logs off-node to an append-only collector before a workload can touch them. Give node pools dedicated identities, remove unused built-in group access, and alert on log-source gaps.",
    recommendedDefensePrimitives: ["cni_overlay", "identity_provider", "secrets_manager", "observability_stack"],
    exploitedInWild: false,
    sourceUrl: "https://nvd.nist.gov/vuln/detail/CVE-2024-5321",
  },
  {
    id: "CVE-2024-27983",
    title: "Node.js HTTP/2 Frame Memory Exhaustion on API Gateways",
    published: "2024-04-03",
    cvss: 7.5,
    severity: "HIGH",
    cwe: "CWE-400",
    stride: "Denial of Service",
    ecosystem: "Service Mesh & API",
    affectedPrimitives: ["api_gateway", "rest_service", "serverless_function", "background_worker"],
    summary:
      "Node.js's HTTP/2 server mishandled CONTINUATION frames, so an unauthenticated client could keep allocating per-frame state until the process hit its memory ceiling. Gateways and backend-for-frontend services built on Node dropped connections or were OOM-killed by one slow stream.",
    architecturalRootCause:
      "The HTTP/2 frame parser accepted an unbounded number of continuation frames per stream without a memory budget. The gateway had no per-connection resource cap, and process memory was shared by every tenant on the instance.",
    mitigationPattern:
      "Upgrade Node.js, cap maxSessionMemory and concurrent streams on every HTTP/2 server, and place a connection-aware edge in front of Node origins. Run gateways under hard memory limits with horizontal replicas so one exhausted process cannot take down the fleet.",
    recommendedDefensePrimitives: ["rate_limiter", "cloudflare_waf", "api_gateway", "web_application_firewall"],
    exploitedInWild: false,
    sourceUrl: "https://nvd.nist.gov/vuln/detail/CVE-2024-27983",
  },
  {
    id: "CVE-2025-24813",
    title: "Apache Tomcat / API Gateway Partial PUT Path Equivalence RCE",
    published: "2025-03-10",
    cvss: 9.8,
    severity: "CRITICAL",
    cwe: "CWE-22",
    stride: "Tampering",
    ecosystem: "AWS / Cloud",
    affectedPrimitives: ["api_gateway", "rest_service", "document_store", "blob_storage"],
    summary:
      "Tomcat normalized a partial PUT path after writing the temporary upload, so a crafted Content-Range plus a path-equivalent URL could place attacker-controlled bytes where a servlet could read them. With write-enabled DefaultServlet and disk session persistence, the file write became unauthenticated remote code execution.",
    architecturalRootCause:
      "The upload path and the servlet mapping resolved the same URL differently. Temporary files were written inside the web root, and session persistence trusted serialized content from a path an unauthenticated client could write.",
    mitigationPattern:
      "Patch Tomcat, disable the write-enabled DefaultServlet and disk session persistence, and reject path-equivalent URLs at the edge. Keep uploads outside the web root, normalize and re-check paths after every decode, and front the gateway with a WAF that blocks partial PUT and traversal encodings.",
    recommendedDefensePrimitives: ["web_application_firewall", "cloudflare_waf", "api_gateway", "rate_limiter"],
    exploitedInWild: true,
    sourceUrl: "https://nvd.nist.gov/vuln/detail/CVE-2025-24813",
  },
  {
    id: "CVE-2024-8986",
    title: "LLM Serving / vLLM Distributed Pickle Deserialization & Prompt Escalation",
    published: "2024-09-19",
    cvss: 9.0,
    severity: "CRITICAL",
    cwe: "CWE-502",
    stride: "Information Disclosure",
    ecosystem: "AI & LLM",
    affectedPrimitives: ["llm_inference", "vector_database", "agent_orchestrator", "k8s_deployment"],
    summary:
      "Distributed vLLM workers deserialized scheduling messages with pickle, and the serving gateway accepted prompt payloads that could reach those RPC entry points. A crafted request achieved code execution inside the inference process, exposing model weights, prompt history, retrieval context, and every tenant's KV cache.",
    architecturalRootCause:
      "The model-serving data plane mixed untrusted prompt input with trusted inter-process RPC on the same network, then used a code-executing serializer. Tenant prompts, control messages, and worker credentials all shared one trust boundary.",
    mitigationPattern:
      "Patch vLLM, replace pickle with a signed and schema-validated codec, and require mTLS between gateway and workers on a private overlay. Isolate each tenant's inference pool, run workers non-root with read-only model mounts, and enforce prompt validation plus rate limits at the API gateway.",
    recommendedDefensePrimitives: ["identity_provider", "cert_manager", "secrets_manager", "cni_overlay", "api_gateway"],
    exploitedInWild: false,
    sourceUrl: "https://nvd.nist.gov/vuln/detail/CVE-2024-8986",
  },
  {
    id: "CVE-2025-46817",
    title: "Container Registry / OCI Manifest Auth Bypass & Image Poisoning",
    published: "2025-06-12",
    cvss: 8.6,
    severity: "HIGH",
    cwe: "CWE-287",
    stride: "Tampering",
    ecosystem: "Kubernetes",
    affectedPrimitives: ["container_registry", "k8s_deployment", "k8s_cluster", "argocd_gitops"],
    summary:
      "A registry's manifest push endpoint accepted anonymous writes when the auth challenge endpoint was unreachable, so an attacker could overwrite a trusted tag with a malicious image that every downstream cluster pulled on the next sync. GitOps controllers reconciled the poisoned digest without re-verifying provenance.",
    architecturalRootCause:
      "Image identity was trusted to a mutable tag instead of an immutable digest, and the registry's authentication gate failed open on dependency outage. No admission policy verified signatures or SBOMs before a pod could run the image.",
    mitigationPattern:
      "Pin every deployment to a content-addressed digest, enforce image signature verification (cosign/Sigstore) at admission, and require the registry to fail closed when its auth backend is unreachable. Gate GitOps syncs behind policy checks and scan images in CI before they reach the registry.",
    recommendedDefensePrimitives: ["identity_provider", "cert_manager", "secrets_manager", "cloudflare_waf", "argocd_gitops"],
    exploitedInWild: false,
    sourceUrl: "https://nvd.nist.gov/vuln/detail/CVE-2025-46817",
  },
];

/** Fast lookup used by the hub's canvas-exposure annotations. */
export const CURATED_CVE_MAP: Record<string, CveIntelligenceItem> = Object.fromEntries(
  CURATED_CVE_FEED.map((item) => [item.id, item]),
);

export function getCuratedCve(id: string): CveIntelligenceItem | undefined {
  return CURATED_CVE_MAP[id];
}

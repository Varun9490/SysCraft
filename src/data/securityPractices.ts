export interface SecurityPractice {
  id: string;
  number: number;
  title: string;
  plainEnglish: string;
  doThis: string;
  neverDoThis: string;
  aws: string;
  cloudflare: string;
  kubernetes: string;
  tryOnCanvas: string[];
}

export const SECURITY_PRACTICES: SecurityPractice[] = [
  {
    id: "check_caller",
    number: 1,
    title: "Check who is calling before you do any work",
    plainEnglish: "Every request must prove who sent it with a short-lived token before any business logic runs.",
    doThis: "Issue 5 to 15 minute OIDC tokens from an identity provider and verify them at the edge and in every service.",
    neverDoThis: "Never put a long-lived secret in browser code, env files, or git.",
    aws: "Use IAM roles with OIDC federation (IRSA or EKS Pod Identity) instead of static access keys.",
    cloudflare: "Validate JWTs at the edge with Cloudflare Access or Workers and forward only verified claims.",
    kubernetes: "Use projected service-account tokens and short-lived OIDC tokens; disable long-lived secrets.",
    tryOnCanvas: ["identity_provider", "api_gateway", "web_application_firewall"],
  },
  {
    id: "least_privilege",
    number: 2,
    title: "Allow the smallest action, not \"logged in = can do everything\"",
    plainEnglish: "Being authenticated is not the same as being authorized; each action needs its own permission check.",
    doThis: "Authorize each route and action by identity and context, and require mTLS between services.",
    neverDoThis: "Never treat 'logged in' as 'can do everything'.",
    aws: "Use IAM least-privilege policies scoped to specific actions and resources, enforced with Cedar or OPA.",
    cloudflare: "Use API Gateway policies and mTLS client certs; separate read and write scopes.",
    kubernetes: "Use RBAC with namespace-scoped roles and SPIFFE mTLS via a mesh for east-west calls.",
    tryOnCanvas: ["identity_provider", "envoy_mesh", "api_gateway"],
  },
  {
    id: "encrypt_wire_disk",
    number: 3,
    title: "Encrypt on the wire and on disk",
    plainEnglish: "Data should be unreadable in transit and at rest, and secrets should never live in git or env files.",
    doThis: "Terminate TLS 1.3 at the edge and at every hop; encrypt data at rest with KMS envelope encryption; store secrets in a vault.",
    neverDoThis: "Never commit secrets or keep them in .env files in production.",
    aws: "Use ACM for TLS, KMS for envelope encryption, and Secrets Manager or Parameter Store for secrets.",
    cloudflare: "Enable TLS 1.3 and strict origin pull; keep secrets in Workers secrets, not code.",
    kubernetes: "Use cert-manager for TLS, etcd encryption at rest, and an external secrets operator.",
    tryOnCanvas: ["cert_manager", "secrets_manager", "cloudflare_waf"],
  },
  {
    id: "default_deny_network",
    number: 4,
    title: "Default-deny the network",
    plainEnglish: "A pod should not reach the database or an admission webhook unless a policy explicitly allows it.",
    doThis: "Start with a default-deny NetworkPolicy and allow only named paths.",
    neverDoThis: "Never allow any pod to reach any other pod or the database by default.",
    aws: "Use security groups with explicit ingress and egress plus VPC endpoints; deny by default.",
    cloudflare: "Use Zero Trust network policies and tunnel egress controls.",
    kubernetes: "Apply default-deny ingress and egress NetworkPolicies through a CNI such as Cilium or Calico.",
    tryOnCanvas: ["cni_overlay", "postgres_db", "kube_apiserver"],
  },
  {
    id: "rate_limit_public",
    number: 5,
    title: "Put a limit on every public door",
    plainEnglish: "Every public endpoint needs a token bucket and a 429 with Retry-After, or a retry storm becomes a self-inflicted outage.",
    doThis: "Put a token bucket on every public endpoint and return 429 with Retry-After.",
    neverDoThis: "Never expose an endpoint with no rate limit or retry budget.",
    aws: "Use API Gateway throttling and usage plans plus WAF rate-based rules.",
    cloudflare: "Use Cloudflare Rate Limiting rules and 429 responses.",
    kubernetes: "Use Envoy or ingress rate limits and a gateway retry budget.",
    tryOnCanvas: ["rate_limiter", "api_gateway", "cloudflare_waf"],
  },
  {
    id: "zero_trust_inside",
    number: 6,
    title: "Do not trust the inside of the VPC",
    plainEnglish: "Zero trust means the coffee-shop rule: every hop shows a badge, even traffic inside your own network.",
    doThis: "Require identity and policy checks on every hop, even inside the network.",
    neverDoThis: "Never assume traffic inside the VPC is safe.",
    aws: "Use VPC Lattice or a service mesh with IAM auth and verify identity per request.",
    cloudflare: "Use Cloudflare Zero Trust for internal apps and device posture.",
    kubernetes: "Use service mesh mTLS and authorization policies for all east-west traffic.",
    tryOnCanvas: ["envoy_mesh", "identity_provider", "service_mesh"],
  },
  {
    id: "lease_secrets",
    number: 7,
    title: "Lease secrets for minutes",
    plainEnglish: "Static IAM keys and IMDSv1 are how one SSRF becomes the whole account.",
    doThis: "Use short-lived credentials and IMDSv2 with a hop limit of 1.",
    neverDoThis: "Never use static IAM access keys or IMDSv1.",
    aws: "Disable IMDSv1, enforce IMDSv2 with hop limit 1, and use STS temporary credentials.",
    cloudflare: "Use short-lived API tokens scoped to one zone.",
    kubernetes: "Use projected tokens and an external secrets operator with rotation.",
    tryOnCanvas: ["secrets_manager", "identity_provider", "web_application_firewall"],
  },
  {
    id: "patch_edge_first",
    number: 8,
    title: "Patch at the edge first",
    plainEnglish: "A WAF virtual patch buys hours when a CVE like an ingress RCE drops; then roll the nodes.",
    doThis: "Apply a WAF virtual patch at the edge immediately, then patch and roll nodes.",
    neverDoThis: "Never wait for a full node rollout before blocking an active exploit.",
    aws: "Use AWS WAF managed rules and Shield, then patch AMIs after.",
    cloudflare: "Deploy Cloudflare WAF managed rules as virtual patches.",
    kubernetes: "Use ingress WAF rules first, then rolling update nodes.",
    tryOnCanvas: ["cloudflare_waf", "web_application_firewall", "ingress_controller"],
  },
  {
    id: "audit_log",
    number: 9,
    title: "Write down who changed what",
    plainEnglish: "If you cannot answer who changed what after an incident, you do not have an audit log.",
    doThis: "Record every change with actor, time, and diff, and make it tamper-evident.",
    neverDoThis: "Never allow unaudited changes to production.",
    aws: "Enable CloudTrail in all regions with log file validation.",
    cloudflare: "Use audit logs and change tracking for all config.",
    kubernetes: "Enable API server audit logging and admission webhooks.",
    tryOnCanvas: ["observability_stack", "k8s_cluster", "secrets_manager"],
  },
  {
    id: "blast_radius",
    number: 10,
    title: "Assume one box is already owned",
    plainEnglish: "Blast radius is the real control: egress deny, separate subnets, and no shared admin.",
    doThis: "Deny egress by default, segment subnets, and separate admin paths.",
    neverDoThis: "Never share admin credentials or allow unrestricted egress.",
    aws: "Use separate accounts and subnets, deny egress, and break-glass admin roles.",
    cloudflare: "Use egress policies and separate admin networks.",
    kubernetes: "Use network segmentation, separate namespaces, and no shared cluster-admin.",
    tryOnCanvas: ["cni_overlay", "k8s_cluster", "postgres_db"],
  },
];

/**
 * Pure helper: a security practice is "covered" on a canvas when every primitive
 * in its `tryOnCanvas` list is present among the supplied resource ids.
 * Accepts either an array of resource-id strings or canvas node-like objects
 * carrying a `resourceId` field, so callers can pass store nodes directly.
 */
export function evaluateSecurityPractice(
  practice: SecurityPractice,
  available: Array<string | { resourceId?: string | number | null }> = [],
): boolean {
  const present = new Set(
    available.map((entry) =>
      typeof entry === "string" ? entry : String(entry?.resourceId ?? ""),
    ),
  );
  return (practice?.tryOnCanvas ?? []).every((id) => present.has(id));
}
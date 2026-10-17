export type NetDiagramKind =
  | "anycast"
  | "vpc"
  | "dns"
  | "nat"
  | "peering"
  | "tls"
  | "mesh";

export interface NetConcept {
  id: string;
  title: string;
  summary: string;
  kind: NetDiagramKind;
  points: string[];
  services: { provider: string; service: string }[];
}

export const NET_CONCEPTS: NetConcept[] = [
  {
    id: "anycast",
    title: "Anycast & global routing",
    summary:
      "Many machines announce the same IP. BGP delivers each user to the topologically nearest one, so 'the edge' is wherever the user already is.",
    kind: "anycast",
    points: [
      "One address, hundreds of locations — the network picks the path, not your code.",
      "Failover is automatic: withdraw the route and BGP reroutes around it.",
      "The backbone from the nearest POP onward is private and optimized.",
    ],
    services: [
      { provider: "Cloudflare", service: "Anycast network" },
      { provider: "AWS", service: "Global Accelerator" },
      { provider: "GCP", service: "Global external LB (anycast VIP)" },
    ],
  },
  {
    id: "vpc",
    title: "VPC, subnets & security groups",
    summary:
      "A VPC is your private address space. Subnets carve it into public and private tiers, and security groups act as stateful per-resource firewalls.",
    kind: "vpc",
    points: [
      "Public subnets hold load balancers; private subnets hold databases with no route out.",
      "Security groups are allow-list and stateful — return traffic is automatic.",
      "Network ACLs add a stateless subnet-level backstop.",
    ],
    services: [
      { provider: "AWS", service: "VPC + Security Groups" },
      { provider: "Azure", service: "Virtual Network + NSG" },
      { provider: "GCP", service: "VPC + firewall rules" },
    ],
  },
  {
    id: "dns",
    title: "DNS & resolution",
    summary:
      "DNS turns names into addresses through a recursive chain: resolver → root → TLD → authoritative. Record types and TTLs are your steering wheel.",
    kind: "dns",
    points: [
      "Low TTLs enable fast failover; high TTLs cut lookup latency and load.",
      "Latency- and geo-based routing steer users to the nearest healthy region.",
      "DNSSEC signs answers so resolvers can reject spoofed responses.",
    ],
    services: [
      { provider: "Cloudflare", service: "1.1.1.1 / DNS" },
      { provider: "AWS", service: "Route 53" },
      { provider: "Azure", service: "Azure DNS" },
    ],
  },
  {
    id: "nat",
    title: "NAT & egress",
    summary:
      "Private instances reach the internet through a NAT gateway that rewrites source addresses — outbound only, so nothing can dial in.",
    kind: "nat",
    points: [
      "A gateway sits in a public subnet and translates flows for private ones.",
      "Egress is a common bill shock: all outbound bytes flow through it.",
      "Centralized egress via a transit VPC simplifies inspection and allow-lists.",
    ],
    services: [
      { provider: "AWS", service: "NAT Gateway" },
      { provider: "GCP", service: "Cloud NAT" },
      { provider: "Azure", service: "NAT Gateway" },
    ],
  },
  {
    id: "peering",
    title: "Private connectivity",
    summary:
      "Reach services in other VPCs or accounts without traversing the public internet — via peering, transit gateways, or private endpoints.",
    kind: "peering",
    points: [
      "VPC peering is a direct, non-transitive link between two networks.",
      "Transit gateways build a hub-and-spoke topology instead of a mesh of links.",
      "Private endpoints let you consume a managed service over a private IP.",
    ],
    services: [
      { provider: "AWS", service: "PrivateLink / Transit Gateway" },
      { provider: "Azure", service: "Private Link" },
      { provider: "GCP", service: "Private Service Connect" },
    ],
  },
  {
    id: "tls",
    title: "TLS termination & certificates",
    summary:
      "The edge decrypts TLS, inspects and caches, then re-encrypts toward the origin — offloading crypto and centralizing certificate management.",
    kind: "tls",
    points: [
      "Terminate at the edge to offload handshakes and enable L7 routing.",
      "Re-encrypt to origin (end-to-end) when compliance requires it.",
      "ACME automation renews certificates so they never expire in production.",
    ],
    services: [
      { provider: "Cloudflare", service: "Universal SSL / ACME" },
      { provider: "AWS", service: "ACM + ALB" },
      { provider: "GCP", service: "Managed certificates" },
    ],
  },
  {
    id: "mesh",
    title: "Service mesh & mTLS",
    summary:
      "A mesh moves retries, timeouts, and mutual TLS out of your code and into a sidecar (or ambient) data plane.",
    kind: "mesh",
    points: [
      "Every service-to-service call carries an identity and is encrypted (mTLS).",
      "Traffic policy — retries, timeouts, circuit breaking — is declarative, not code.",
      "The control plane distributes identity and policy; the data plane enforces it.",
    ],
    services: [
      { provider: "GCP", service: "Anthos Service Mesh / Istio" },
      { provider: "AWS", service: "App Mesh" },
      { provider: "Azure", service: "Open Service Mesh" },
    ],
  },
];

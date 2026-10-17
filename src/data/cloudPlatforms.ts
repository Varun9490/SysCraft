export type ProviderId = "aws" | "azure" | "gcp" | "cloudflare" | "oci";

export interface Provider {
  id: ProviderId;
  name: string;
  short: string;
  color: string;
  tagline: string;
  reach: string;
  edge: string;
  strengths: string[];
}

export const PROVIDERS: Provider[] = [
  {
    id: "aws",
    name: "Amazon Web Services",
    short: "AWS",
    color: "#FF9900",
    tagline: "The widest catalogue and the deepest bench of primitives.",
    reach: "33 regions · 105 AZs",
    edge: "400+ CloudFront POPs",
    strengths: ["Breadth of managed services", "Mature IAM model", "Global AZ topology"],
  },
  {
    id: "azure",
    name: "Microsoft Azure",
    short: "Azure",
    color: "#3B82F6",
    tagline: "Enterprise identity and hybrid cloud first.",
    reach: "60+ regions",
    edge: "190+ Front Door edge sites",
    strengths: ["Entra ID integration", "Hybrid / Arc", "Enterprise agreements"],
  },
  {
    id: "gcp",
    name: "Google Cloud",
    short: "GCP",
    color: "#4285F4",
    tagline: "Best-in-class networking, data, and Kubernetes lineage.",
    reach: "40 regions · 121 zones",
    edge: "180+ Cloud CDN POPs",
    strengths: ["Private global network", "BigQuery / Spanner", "GKE"],
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    short: "Cloudflare",
    color: "#F6821F",
    tagline: "Everything at the edge, on one anycast network.",
    reach: "330+ cities",
    edge: "Anycast everywhere",
    strengths: ["Edge compute (Workers)", "Zero Trust / SASE", "DDoS absorption"],
  },
  {
    id: "oci",
    name: "Oracle Cloud",
    short: "OCI",
    color: "#C74634",
    tagline: "Price-performance and bare-metal density.",
    reach: "48 regions",
    edge: "Regional edge",
    strengths: ["Bare metal", "Exadata / Oracle DB", "Fast egress tiering"],
  },
];

export const PROVIDER_MAP = new Map(PROVIDERS.map((p) => [p.id, p]));

export interface ServiceRow {
  category: string;
  what: string;
  aws: string;
  azure: string;
  gcp: string;
  cloudflare: string;
  oci: string;
}

export const SERVICE_MATRIX: ServiceRow[] = [
  {
    category: "Virtual machines",
    what: "Raw compute you patch yourself",
    aws: "EC2",
    azure: "Virtual Machines",
    gcp: "Compute Engine",
    cloudflare: "—",
    oci: "Compute",
  },
  {
    category: "Containers",
    what: "Run OCI images, managed or raw",
    aws: "ECS / EKS",
    azure: "AKS / Container Apps",
    gcp: "GKE / Cloud Run",
    cloudflare: "Containers",
    oci: "OKE / Container Instances",
  },
  {
    category: "Serverless functions",
    what: "Event-driven, scale to zero",
    aws: "Lambda",
    azure: "Functions",
    gcp: "Cloud Functions",
    cloudflare: "Workers",
    oci: "Functions",
  },
  {
    category: "Object storage",
    what: "Durable blobs over HTTP",
    aws: "S3",
    azure: "Blob Storage",
    gcp: "Cloud Storage",
    cloudflare: "R2",
    oci: "Object Storage",
  },
  {
    category: "Block storage",
    what: "Attached disks for VMs",
    aws: "EBS",
    azure: "Managed Disks",
    gcp: "Persistent Disk",
    cloudflare: "—",
    oci: "Block Volumes",
  },
  {
    category: "Relational DB",
    what: "Managed SQL with replication",
    aws: "RDS / Aurora",
    azure: "Azure SQL / PostgreSQL",
    gcp: "Cloud SQL / Spanner",
    cloudflare: "D1",
    oci: "Autonomous Database",
  },
  {
    category: "NoSQL / KV",
    what: "Wide-column or key-value at scale",
    aws: "DynamoDB",
    azure: "Cosmos DB",
    gcp: "Firestore / Bigtable",
    cloudflare: "KV",
    oci: "NoSQL Database",
  },
  {
    category: "Cache",
    what: "In-memory, sub-ms reads",
    aws: "ElastiCache",
    azure: "Azure Cache for Redis",
    gcp: "Memorystore",
    cloudflare: "Cache API",
    oci: "Cache with Redis",
  },
  {
    category: "Message queue",
    what: "Buffered work hand-off",
    aws: "SQS",
    azure: "Service Bus / Storage Queues",
    gcp: "Pub/Sub",
    cloudflare: "Queues",
    oci: "Streaming / Queue",
  },
  {
    category: "Event streaming",
    what: "Append-only log with replay",
    aws: "Kinesis / MSK",
    azure: "Event Hubs",
    gcp: "Pub/Sub / Managed Kafka",
    cloudflare: "—",
    oci: "Streaming",
  },
  {
    category: "CDN",
    what: "Cache bytes near the user",
    aws: "CloudFront",
    azure: "Front Door / CDN",
    gcp: "Cloud CDN",
    cloudflare: "CDN",
    oci: "CDN",
  },
  {
    category: "DNS",
    what: "Name resolution and steering",
    aws: "Route 53",
    azure: "Azure DNS",
    gcp: "Cloud DNS",
    cloudflare: "DNS",
    oci: "DNS",
  },
  {
    category: "Load balancer",
    what: "Distribute traffic across backends",
    aws: "ALB / NLB",
    azure: "Load Balancer / App Gateway",
    gcp: "Cloud Load Balancing",
    cloudflare: "Load Balancing",
    oci: "Load Balancer",
  },
  {
    category: "API gateway",
    what: "Auth, throttle, route at L7",
    aws: "API Gateway",
    azure: "API Management",
    gcp: "API Gateway / Apigee",
    cloudflare: "API Shield / Gateway",
    oci: "API Gateway",
  },
  {
    category: "Firewall / WAF",
    what: "Block bad traffic at the edge",
    aws: "WAF / Shield",
    azure: "WAF / Firewall",
    gcp: "Cloud Armor",
    cloudflare: "WAF / Magic Firewall",
    oci: "WAF",
  },
  {
    category: "Kubernetes",
    what: "Managed control plane",
    aws: "EKS",
    azure: "AKS",
    gcp: "GKE",
    cloudflare: "—",
    oci: "OKE",
  },
  {
    category: "Secrets & config",
    what: "Store and rotate credentials",
    aws: "Secrets Manager",
    azure: "Key Vault",
    gcp: "Secret Manager",
    cloudflare: "Secrets Store",
    oci: "Vault",
  },
  {
    category: "Observability",
    what: "Metrics, logs, traces",
    aws: "CloudWatch / X-Ray",
    azure: "Monitor",
    gcp: "Cloud Monitoring",
    cloudflare: "Analytics / Logpush",
    oci: "Observability",
  },
  {
    category: "Identity",
    what: "Authn/authz and federation",
    aws: "IAM / Cognito",
    azure: "Entra ID",
    gcp: "Cloud IAM / Identity Platform",
    cloudflare: "Access / Zero Trust",
    oci: "IAM / Identity Domains",
  },
  {
    category: "Private network",
    what: "Isolated virtual network",
    aws: "VPC",
    azure: "Virtual Network",
    gcp: "VPC",
    cloudflare: "Tunnel / Magic WAN",
    oci: "VCN",
  },
];

export const SERVICE_CATEGORIES = SERVICE_MATRIX.map((row) => row.category);

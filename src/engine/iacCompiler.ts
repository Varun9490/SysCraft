import { SEED_RESOURCES } from "@/data/seedResources";
import type { GraphTopology } from "@/types/simulation";

/**
 * Infrastructure-as-Code compilers (Milestone 7).
 * Pure functions: canvas GraphTopology → Terraform HCL, Docker Compose YAML,
 * Kubernetes manifests, Mermaid diagrams, and RFC Markdown. All output is
 * deterministic (sorted by node id) so exports diff cleanly in version
 * control. Costs reuse the seed catalog FinOps rates.
 */

const seedById = new Map(SEED_RESOURCES.map((r) => [r.id, r]));

export type IacFormat = "terraform" | "docker" | "kubernetes" | "mermaid" | "rfc";

function slug(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "node"
  );
}

function sortedNodes(topology: GraphTopology) {
  return [...topology.nodes].sort((a, b) => a.id.localeCompare(b.id));
}

function costPerHour(resourceId: string): number {
  return seedById.get(resourceId)?.defaults.costPerHourUsd ?? 0.1;
}

/** Monthly burn ≈ Σ hourly × 730. */
export function estimateMonthlyCost(topology: GraphTopology): number {
  return topology.nodes.reduce(
    (sum, n) => sum + costPerHour(n.resourceId) * Math.max(1, Math.floor(n.replicationFactor)) * 730,
    0,
  );
}

function terraformResourceFor(resourceId: string, name: string, replicas: number, region: string): string {
  const seed = seedById.get(resourceId);
  const category = seed?.category ?? "compute";
  const count = `  count = ${Math.max(1, Math.floor(replicas))}\n`;
  switch (category) {
    case "edge":
      return `resource "aws_cloudfront_distribution" "${name}" {\n  enabled = true\n  origin {\n    domain_name = "${name}.origin.internal"\n    origin_id   = "${name}-origin"\n  }\n  default_cache_behavior {\n    target_origin_id = "${name}-origin"\n    viewer_protocol_policy = "redirect-to-https"\n  }\n  tags = { Region = "${region}" }\n}\n`;
    case "database":
      return `resource "aws_db_instance" "${name}" {\n${count}  engine            = "postgres"\n  instance_class    = "db.r6g.large"\n  allocated_storage = 500\n  multi_az          = true\n  tags = { Region = "${region}" }\n}\n`;
    case "cache":
      return `resource "aws_elasticache_cluster" "${name}" {\n${count}  engine         = "redis"\n  node_type      = "cache.r6g.large"\n  num_cache_nodes = 1\n  tags = { Region = "${region}" }\n}\n`;
    case "messaging":
    case "streaming":
      return `resource "aws_sqs_queue" "${name}" {\n  name                      = "${name}"\n  visibility_timeout_seconds = 60\n  tags = { Region = "${region}" }\n}\n`;
    case "storage":
      return `resource "aws_s3_bucket" "${name}" {\n  bucket = "${name}-data"\n  tags = { Region = "${region}" }\n}\n`;
    case "security":
      return `resource "aws_wafv2_web_acl" "${name}" {\n  name  = "${name}"\n  scope = "CLOUDFRONT"\n  default_action {\n    allow {}\n  }\n  visibility_config {\n    cloudwatch_metrics_enabled = true\n    metric_name                = "${name}"\n    sampled_requests_enabled   = true\n  }\n  tags = { Region = "${region}" }\n}\n`;
    case "network":
    case "api":
      return `resource "aws_lb" "${name}" {\n  name               = "${name}"\n  load_balancer_type = "application"\n  tags = { Region = "${region}" }\n}\n`;
    case "search":
      return `resource "aws_opensearch_domain" "${name}" {\n  domain_name = "${name}"\n  cluster_config {\n    instance_type  = "r6g.large.search"\n    instance_count = ${Math.max(2, Math.floor(replicas))}\n  }\n  tags = { Region = "${region}" }\n}\n`;
    case "ai_llm":
      return `resource "aws_sagemaker_endpoint" "${name}" {\n  name                 = "${name}"\n  endpoint_config_name = "${name}-config"\n  tags = [{ Key = "Region", Value = "${region}" }]\n}\n`;
    case "vector_db":
      return `resource "aws_opensearchserverless_collection" "${name}" {\n  name = "${name}"\n  type = "VECTORSEARCH"\n}\n`;
    case "observability":
      return `resource "aws_cloudwatch_log_group" "${name}" {\n  name              = "/syscraft/${name}"\n  retention_in_days = 90\n  tags = { Region = "${region}" }\n}\n`;
    default:
      return `resource "aws_ecs_service" "${name}" {\n${count}  name            = "${name}"\n  desired_count   = ${Math.max(1, Math.floor(replicas))}\n  launch_type     = "FARGATE"\n  tags = { Region = "${region}" }\n}\n`;
  }
}

export function compileTerraform(topology: GraphTopology): string {
  const nodes = sortedNodes(topology);
  const monthly = estimateMonthlyCost(topology);
  const header = [
    `# SysCraft export — ${nodes.length} resources, ${topology.edges.length} links`,
    `# Estimated burn: $${monthly.toFixed(2)}/mo (seed catalog rates, us-east-1)`,
    `terraform {`,
    `  required_version = ">= 1.6"`,
    `  required_providers {`,
    `    aws = { source = "hashicorp/aws", version = "~> 5.0" }`,
    `  }`,
    `}`,
    ``,
    `variable "region" {`,
    `  type    = string`,
    `  default = "us-east-1"`,
    `}`,
    ``,
    `provider "aws" {`,
    `  region = var.region`,
    `}`,
    ``,
  ].join("\n");
  const bodies = nodes.map((n) =>
    terraformResourceFor(n.resourceId, `${slug(n.resourceId)}_${slug(n.id)}`, n.replicationFactor, n.region),
  );
  const outputs = nodes.length > 0
    ? `\noutput "resource_count" {\n  value = ${nodes.length}\n}\n`
    : "";
  return `${header}${bodies.join("\n")}${outputs}`;
}

const DOCKER_IMAGES: Record<string, string> = {
  postgres_db: "postgres:16",
  cockroach_db: "cockroachdb/cockroach:v23.2",
  cassandra_store: "cassandra:4.1",
  document_store: "mongo:7",
  redis_cache: "redis:7",
  memcached_cluster: "memcached:1.6",
  message_queue: "rabbitmq:3-management",
  kafka_stream: "bitnami/kafka:3.7",
  event_bus: "bitnami/kafka:3.7",
  api_gateway: "nginx:1.25",
  cdn_edge: "nginx:1.25",
  search_cluster: "opensearchproject/opensearch:2.12",
  vector_database: "qdrant/qdrant:v1.9",
  rest_service: "node:20-slim",
  background_worker: "node:20-slim",
};

function dockerImageFor(resourceId: string, category: string): string {
  return DOCKER_IMAGES[resourceId] ?? (category === "database" ? "postgres:16" : category === "cache" ? "redis:7" : "node:20-slim");
}

export function compileDockerCompose(topology: GraphTopology): string {
  const nodes = sortedNodes(topology);
  const serviceName = new Map(nodes.map((n) => [n.id, `${slug(n.resourceId)}_${slug(n.id)}`]));
  const deps = new Map<string, string[]>();
  for (const n of nodes) deps.set(n.id, []);
  for (const e of topology.edges) {
    if (deps.has(e.target)) deps.get(e.target)?.push(serviceName.get(e.source) ?? e.source);
  }
  const lines: string[] = [
    `# SysCraft export — ${nodes.length} services`,
    `name: syscraft`,
    `services:`,
  ];
  nodes.forEach((n, i) => {
    const seed = seedById.get(n.resourceId);
    const name = serviceName.get(n.id) ?? n.id;
    const port = 8000 + i;
    const primaryPort = seed?.servicePorts?.[0];
    const hostPort = primaryPort?.port ?? port;
    const containerPort = primaryPort?.containerPort ?? primaryPort?.port ?? 80;
    const needs = (deps.get(n.id) ?? []).filter((d) => d !== name);
    lines.push(`  ${name}:`);
    lines.push(`    image: ${dockerImageFor(n.resourceId, seed?.category ?? "compute")}`);
    lines.push(`    restart: unless-stopped`);
    lines.push(`    environment:`);
    lines.push(`      REGION: ${n.region}`);
    lines.push(`      REPLICAS: "${Math.max(1, Math.floor(n.replicationFactor))}"`);
    lines.push(`    ports:`);
    lines.push(`      - "${hostPort}:${containerPort}"`);
    for (const extra of (seed?.servicePorts ?? []).slice(1)) {
      lines.push(`      - "${extra.port}:${extra.containerPort ?? extra.port}" # ${extra.label}`);
    }
    if (needs.length > 0) {
      lines.push(`    depends_on:`);
      for (const d of needs) lines.push(`      - ${d}`);
    }
    if (seed?.category === "database" || seed?.category === "cache") {
      lines.push(`    volumes:`);
      lines.push(`      - ${name}-data:/data`);
    }
  });
  const volumes = nodes.filter((n) => {
    const c = seedById.get(n.resourceId)?.category;
    return c === "database" || c === "cache";
  });
  if (volumes.length > 0) {
    lines.push(`volumes:`);
    for (const n of volumes) lines.push(`  ${(serviceName.get(n.id) ?? n.id) + "-data"}:`);
  }
  return `${lines.join("\n")}\n`;
}

export function compileKubernetes(topology: GraphTopology): string {
  const nodes = sortedNodes(topology);
  const docs: string[] = [`# SysCraft export — ${nodes.length} workloads (namespace: syscraft)`];
  nodes.forEach((n, i) => {
    const seed = seedById.get(n.resourceId);
    const name = `${slug(n.resourceId)}-${slug(n.id)}`.slice(0, 52);
    const replicas = Math.max(1, Math.floor(n.replicationFactor));
    const cpu = n.baseThroughputRps > 10000 ? "2000m" : "500m";
    const servicePorts = seed?.servicePorts ?? [];
    const primaryPort = servicePorts[0];
    const containerPort = primaryPort?.containerPort ?? primaryPort?.port ?? 8000 + i;
    const expose = primaryPort?.expose ?? "cluster";
    docs.push(`---`);
    docs.push(`apiVersion: apps/v1`);
    docs.push(`kind: Deployment`);
    docs.push(`metadata:`);
    docs.push(`  name: ${name}`);
    docs.push(`  namespace: syscraft`);
    docs.push(`spec:`);
    docs.push(`  replicas: ${replicas}`);
    docs.push(`  selector:`);
    docs.push(`    matchLabels:`);
    docs.push(`      app: ${name}`);
    docs.push(`  template:`);
    docs.push(`    metadata:`);
    docs.push(`      labels:`);
    docs.push(`        app: ${name}`);
    docs.push(`    spec:`);
    docs.push(`      containers:`);
    docs.push(`        - name: ${name}`);
    docs.push(`          image: ${dockerImageFor(n.resourceId, seed?.category ?? "compute")}`);
    docs.push(`          ports:`);
    docs.push(`            - name: ${primaryPort?.label ? slug(primaryPort.label) : "http"}`);
    docs.push(`              protocol: ${(primaryPort?.protocol === "udp" ? "UDP" : "TCP")}`);
    docs.push(`              containerPort: ${containerPort}`);
    docs.push(`          env:`);
    docs.push(`            - name: REGION`);
    docs.push(`              value: "${n.region}"`);
    docs.push(`          resources:`);
    docs.push(`            requests:`);
    docs.push(`              cpu: ${cpu}`);
    docs.push(`              memory: 512Mi`);
    docs.push(`            limits:`);
    docs.push(`              cpu: ${cpu}`);
    docs.push(`              memory: 1Gi`);
    docs.push(`---`);
    docs.push(`apiVersion: v1`);
    docs.push(`kind: Service`);
    docs.push(`metadata:`);
    docs.push(`  name: ${name}`);
    docs.push(`  namespace: syscraft`);
    docs.push(`spec:`);
    docs.push(`  selector:`);
    docs.push(`    app: ${name}`);
    docs.push(`  ports:`);
    for (const port of servicePorts.length > 0
      ? servicePorts
      : [{ label: "http", port: 80 as number, containerPort: 8000 + i, protocol: undefined as string | undefined }]) {
      docs.push(`    - name: ${port.label ? slug(port.label) : "port"}`);
      docs.push(`      port: ${port.port}`);
      docs.push(`      targetPort: ${port.containerPort ?? port.port}`);
      if (("protocol" in port ? port.protocol : undefined) === "udp") docs.push(`      protocol: UDP`);
    }
    if (expose === "internet" || expose === "loadbalancer") {
      docs.push(`  type: LoadBalancer`);
    } else if (expose === "node") {
      docs.push(`  type: NodePort`);
    } else {
      docs.push(`  type: ClusterIP`);
    }
  });
  return `${docs.join("\n")}\n`;
}

export function compileMermaid(topology: GraphTopology): string {
  const nodes = sortedNodes(topology);
  const lines = ["flowchart LR"];
  const regions = new Map<string, typeof nodes>();
  for (const n of nodes) {
    if (!regions.has(n.region)) regions.set(n.region, []);
    regions.get(n.region)?.push(n);
  }
  for (const [region, members] of regions) {
    lines.push(`  subgraph ${slug(region)}["${region}"]`);
    for (const n of members) {
      const label = `${slug(n.id)}["${n.resourceId}<br/>c=${Math.max(1, Math.floor(n.replicationFactor))} · ${n.baseThroughputRps}rps"]`;
      lines.push(`    ${label}`);
    }
    lines.push("  end");
  }
  const ids = new Set(nodes.map((n) => n.id));
  for (const e of topology.edges) {
    if (ids.has(e.source) && ids.has(e.target)) {
      lines.push(`  ${slug(e.source)} --> ${slug(e.target)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export interface RfcOptions {
  title?: string;
  author?: string;
  targetRps?: number;
  sloP99Ms?: number;
}

export function compileRfc(topology: GraphTopology, options: RfcOptions = {}): string {
  const nodes = sortedNodes(topology);
  const monthly = estimateMonthlyCost(topology);
  const risks = nodes
    .filter((n) => Math.floor(n.replicationFactor) <= 1)
    .map((n) => `- **${n.resourceId}** (${n.id}): single replica — promote to 3 across AZs.`);
  const lines = [
    `# RFC: ${options.title ?? "Untitled system"}`,
    ``,
    `Author: ${options.author ?? "SysCraft workbench"} · Date: ${new Date().toISOString().slice(0, 10)}`,
    ``,
    `## 1. Overview`,
    ``,
    `${nodes.length} services, ${topology.edges.length} links${options.targetRps ? `, targeting ${options.targetRps.toLocaleString()} RPS` : ""}${options.sloP99Ms ? ` at p99 ≤ ${options.sloP99Ms}ms` : ""}. Estimated burn $${monthly.toFixed(2)}/mo.`,
    ``,
    `## 2. Topology`,
    ``,
    "```mermaid",
    compileMermaid(topology).trimEnd(),
    "```",
    ``,
    `## 3. Capacity`,
    ``,
    `| Service | Type | Replicas | Per-replica RPS | Region |`,
    `| --- | --- | --- | --- | --- |`,
    ...nodes.map((n) => `| ${n.id} | ${n.resourceId} | ${Math.max(1, Math.floor(n.replicationFactor))} | ${n.baseThroughputRps} | ${n.region} |`),
    ``,
    `## 4. Risks & mitigations`,
    ``,
    ...(risks.length > 0 ? risks : ["- No single-replica services detected. Validate with a `zone_outage` chaos drill before sign-off."]),
    ``,
    `## 5. Operations`,
    ``,
    `- Alert on p99, error burn, and queue depth per service (see telemetry drawer).`,
    `- Game-day quarterly: traffic_surge + dependency_down with the Incident Arena rubric.`,
    `- Blameless post-mortem template ships with every drill (PostMortemModal).`,
    ``,
  ];
  return lines.join("\n");
}

export function compileAll(topology: GraphTopology, rfcOptions: RfcOptions = {}): Record<IacFormat, string> {
  return {
    terraform: compileTerraform(topology),
    docker: compileDockerCompose(topology),
    kubernetes: compileKubernetes(topology),
    mermaid: compileMermaid(topology),
    rfc: compileRfc(topology, rfcOptions),
  };
}

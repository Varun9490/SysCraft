import {
  CURATED_CVE_FEED,
  STRIDE_CATEGORIES,
  type CveEcosystem,
  type CveIntelligenceItem,
  type CveSeverity,
  type StrideCategory,
} from "@/data/cveIntelligence";
import { SEED_RESOURCE_MAP } from "@/data/seedResources";

/**
 * Browser-safe CVE intelligence engine.
 *
 * Two responsibilities, both pure at the edges:
 *  - `mapRawCveToArchitecture` deterministically turns an arbitrary NVD / KEV /
 *    CVE.now record into a SysCraft architecture record (no network, no clock).
 *  - `scrapeLiveCveFeed` attempts a live fetch with a hard timeout and falls
 *    back to the curated cache without ever throwing.
 *
 * `auditCanvasSecurityArchitecture` is a pure function over the canvas graph, so
 * the hub UI and future tests can run it in Node with no DOM.
 */

export interface RawCveRecord {
  id: string;
  description: string;
  published?: string;
  cvss?: number;
  sourceUrl?: string;
}

export interface CveFeedResult {
  items: CveIntelligenceItem[];
  source: string;
  liveScraped: boolean;
  timestamp: string;
}

export interface SecurityAuditNode {
  id: string;
  resourceId: string;
  label: string;
  overrides?: Record<string, unknown>;
}

export interface SecurityAuditEdge {
  id: string;
  source: string;
  target: string;
}

export interface ZeroTrustCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  fixResourceId: string;
}

export interface ExposedNode {
  nodeId: string;
  label: string;
  resourceId: string;
  matchingCves: CveIntelligenceItem[];
  mitigatedByTopology: boolean;
  mitigationReason: string;
}

export type StrideStatus = "hardened" | "partial" | "exposed";

export interface StrideBreakdownEntry {
  category: StrideCategory;
  status: StrideStatus;
  detail: string;
  recommendation: string;
}

export interface SecurityAudit {
  securityPostureScore: number;
  zeroTrustChecks: ZeroTrustCheck[];
  exposedNodes: ExposedNode[];
  strideBreakdown: StrideBreakdownEntry[];
}

/* ------------------------------------------------------------------------ */
/* Keyword intelligence: description text -> architecture vocabulary.       */
/* ------------------------------------------------------------------------ */

interface KeywordRule {
  tag: string;
  test: RegExp;
  primitives: string[];
  ecosystem?: CveEcosystem;
  /** How strongly this tag votes for the ecosystem (default 1). */
  weight?: number;
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    tag: "kubernetes",
    test: /kubernetes|kube-?apiserver|kube-?proxy|kubelet|k8s|etcd|control plane/,
    primitives: ["kube_apiserver", "k8s_cluster", "kubelet_kubeproxy"],
    ecosystem: "Kubernetes",
    weight: 3,
  },
  {
    tag: "ingress",
    test: /ingress|nginx|ingressnightmare|admission (controller|webhook)/,
    primitives: ["ingress_controller", "kube_ingress_gateway"],
    ecosystem: "Kubernetes",
    weight: 2,
  },
  {
    tag: "envoy",
    test: /envoy|istio|sidecar|service mesh|mtls|east-west|xds/,
    primitives: ["envoy_mesh", "service_mesh"],
    ecosystem: "Service Mesh & API",
    weight: 2,
  },
  {
    tag: "http2",
    test: /http\/?2|rapid reset|rst_stream|continuation frame|stream reset/,
    primitives: ["api_gateway", "cdn_edge", "dns_load_balancer"],
    ecosystem: "Cloudflare / Edge",
    weight: 2,
  },
  {
    tag: "ddos",
    test: /ddos|denial of service|resource exhaustion|memory exhaustion|amplification/,
    primitives: ["cdn_edge", "api_gateway", "dns_load_balancer"],
    ecosystem: "Cloudflare / Edge",
  },
  {
    tag: "cache",
    test: /redis|memcached|cache|lua|evalsha|evalscript/,
    primitives: ["redis_cache", "memcached_cluster"],
    ecosystem: "Databases & Cache",
    weight: 2,
  },
  {
    tag: "sql",
    test: /postgres|postgresql|pl\/perl|sql injection|cockroach|database server/,
    primitives: ["postgres_db", "cockroach_db"],
    ecosystem: "Databases & Cache",
    weight: 2,
  },
  {
    tag: "stream",
    test: /kafka|event bus|message queue|stream processor|consumer group/,
    primitives: ["kafka_stream", "event_bus", "message_queue"],
  },
  {
    tag: "llm",
    test: /llm|vllm|inference|prompt|model weight|vector|ai serving|kv cache|pickle/,
    primitives: ["llm_inference", "vector_database", "agent_orchestrator"],
    ecosystem: "AI & LLM",
    weight: 3,
  },
  {
    tag: "container",
    test: /runc|containerd|container escape|docker|namespace|file descriptor/,
    primitives: ["k8s_deployment", "container_registry"],
    ecosystem: "Kubernetes",
    weight: 2,
  },
  {
    tag: "auth",
    test: /authentication bypass|authorization bypass|publickeycallback|jwt|oauth|saml|ssh|credential|identity/,
    primitives: ["api_gateway", "rest_service", "identity_provider"],
    ecosystem: "Service Mesh & API",
    weight: 2,
  },
  {
    tag: "aws",
    test: /aws|amazon|cloudtrail|s3 bucket|ec2|lambda/,
    primitives: ["serverless_function", "blob_storage", "api_gateway"],
    ecosystem: "AWS / Cloud",
    weight: 2,
  },
  {
    tag: "cloudflare",
    test: /cloudflare|waf|cdn|anycast|edge network|load balancer/,
    primitives: ["cdn_edge", "api_gateway"],
    ecosystem: "Cloudflare / Edge",
    weight: 2,
  },
  {
    tag: "tls",
    test: /tls|x509|certificate|cert-manager|handshake|cipher/,
    primitives: ["kube_ingress_gateway", "api_gateway"],
  },
  {
    tag: "web",
    test: /tomcat|servlet|partial put|path traversal|path equivalence|request smuggling/,
    primitives: ["api_gateway", "rest_service", "document_store"],
  },
  {
    tag: "nodejs",
    test: /node\.js|nodejs|bff|backend-for-frontend/,
    primitives: ["api_gateway", "rest_service"],
    ecosystem: "Service Mesh & API",
    weight: 2,
  },
];

const ROOT_CAUSE_BY_STRIDE: Record<StrideCategory, string> = {
  Spoofing:
    "Identity was inferred from session state or a partially verified credential instead of a signature bound to the caller. One trusted hop could therefore speak for another.",
  Tampering:
    "Untrusted input reached a write path whose normalization rules disagreed with the read path. Bytes the caller could control ended up in a location the runtime trusted.",
  Repudiation:
    "Audit evidence lived inside the same trust domain as the workload producing it, so a compromised process could read, alter, or suppress the record of its own actions.",
  "Information Disclosure":
    "Sensitive data shared a process, cache, or network segment with a lower-trust tenant. No isolation boundary forced an explicit grant before data crossed to the caller.",
  "Denial of Service":
    "Work proportional to attacker-controlled input ran without a budget, concurrency cap, or depth limit. A tiny request could consume a shared resource until healthy traffic starved.",
  "Elevation of Privilege":
    "A low-trust process could reach a code path that ran with higher privilege: a cluster-admin webhook, a host descriptor, or an in-process runtime. The privilege boundary was assumed but never enforced.",
};

const MITIGATION_BY_STRIDE: Record<StrideCategory, string> = {
  Spoofing:
    "Bind every identity to a short-lived credential verified at the edge, require mTLS between services, and fail closed when a callback cannot prove key possession.",
  Tampering:
    "Validate and re-normalize on the server side, keep writable paths outside the web root, and sign or checksum artifacts before any downstream consumer trusts them.",
  Repudiation:
    "Stream audit events off-node to an append-only, separately credentialed collector, and alert on gaps or clock skew in the log pipeline.",
  "Information Disclosure":
    "Split tenants by process, credential, and network segment; encrypt at rest with a managed key service; return only fields the caller was explicitly granted.",
  "Denial of Service":
    "Put a rate limiter and connection-aware proxy in front of every internet-facing hop, cap per-request memory and recursion, and isolate parsers in workers with CPU quotas.",
  "Elevation of Privilege":
    "Keep control-plane endpoints off the workload network, run workloads rootless with seccomp and read-only mounts, and scope service accounts to the exact resources they mutate.",
};

const ECOSYSTEM_CONTEXT: Partial<Record<CveEcosystem, string>> = {
  Kubernetes:
    " In Kubernetes the control plane and tenant workloads share a flat pod network, so a single reachable webhook or node component becomes a cluster-wide boundary failure.",
  "Cloudflare / Edge":
    " At the edge, every terminated connection is multiplexed across shared proxy capacity, so per-client accounting is the only thing separating one abuser from all tenants.",
  "AWS / Cloud":
    " In cloud accounts, instance metadata and long-lived service credentials turn a host-level bug into account-level access unless workloads use scoped, short-lived identity.",
  "Databases & Cache":
    " In the data tier, application roles, procedural runtimes, and cached session tokens share one process, so a role-level bug can expose every tenant on the instance.",
  "Service Mesh & API":
    " In the service mesh, gateways and sidecars parse untrusted protocol frames on the data path; a parser or auth bug there bypasses every downstream authorization check.",
  "AI & LLM":
    " In model serving, prompts, retrieval context, and inter-worker RPC share a network and a process, so prompt input can become code execution or cross-tenant data access.",
};

const CWE_BY_STRIDE: Record<StrideCategory, string> = {
  Spoofing: "CWE-287",
  Tampering: "CWE-22",
  Repudiation: "CWE-778",
  "Information Disclosure": "CWE-200",
  "Denial of Service": "CWE-400",
  "Elevation of Privilege": "CWE-269",
};

const MAX_AFFECTED_PRIMITIVES = 5;
const MAX_DEFENSE_PRIMITIVES = 5;

export function severityFromScore(cvss: number): CveSeverity {
  if (cvss >= 9) return "CRITICAL";
  if (cvss >= 7) return "HIGH";
  return "MEDIUM";
}

function classifyStride(haystack: string): StrideCategory {
  if (/denial of service|\bdos\b|ddos|rapid reset|infinite loop|memory exhaustion|resource exhaustion|amplification/.test(haystack)) {
    return "Denial of Service";
  }
  if (/authentication bypass|authorization bypass|spoof|impersonat|forged|jwt|oauth|saml|credential stuffing/.test(haystack)) {
    return "Spoofing";
  }
  if (/remote code execution|\brce\b|privilege escalation|container escape|arbitrary code|command injection|deseriali[sz]|pickle/.test(haystack)) {
    return "Elevation of Privilege";
  }
  if (/path traversal|tamper|file write|write files|request smuggling|injection|poison|modify|partial put/.test(haystack)) {
    return "Tampering";
  }
  if (/information disclosure|exfiltration|leak|read files|read arbitrary|sensitive data|exposure|prompt/.test(haystack)) {
    return "Information Disclosure";
  }
  if (/audit log|repudiation|log manipulation|erase log|event log/.test(haystack)) {
    return "Repudiation";
  }
  return "Elevation of Privilege";
}

function classifyEcosystem(
  haystack: string,
  votes: Map<CveEcosystem, number>,
): CveEcosystem {
  for (const rule of KEYWORD_RULES) {
    if (!rule.ecosystem || !rule.test.test(haystack)) continue;
    votes.set(rule.ecosystem, (votes.get(rule.ecosystem) ?? 0) + (rule.weight ?? 1));
  }
  let winner: CveEcosystem | undefined;
  let best = 0;
  const ordered: CveEcosystem[] = [
    "Kubernetes",
    "AI & LLM",
    "Databases & Cache",
    "Service Mesh & API",
    "Cloudflare / Edge",
    "AWS / Cloud",
  ];
  for (const ecosystem of ordered) {
    const score = votes.get(ecosystem) ?? 0;
    if (score > best) {
      best = score;
      winner = ecosystem;
    }
  }
  return winner ?? "Service Mesh & API";
}

function classifyDefenses(tags: Set<string>, affected: string[]): string[] {
  const defenses = new Set<string>(["rate_limiter", "web_application_firewall"]);

  if (tags.has("kubernetes") || tags.has("container")) {
    defenses.add("cni_overlay");
    defenses.add("cert_manager");
  }
  if (tags.has("ingress") || tags.has("http2") || tags.has("cloudflare") || tags.has("web")) {
    defenses.add("cloudflare_waf");
  }
  if (tags.has("cache") || tags.has("sql") || tags.has("llm")) {
    defenses.add("secrets_manager");
  }
  if (tags.has("auth") || tags.has("llm") || tags.has("aws")) {
    defenses.add("identity_provider");
  }
  if (tags.has("envoy")) {
    defenses.add("envoy_mesh");
  }
  if (tags.has("llm")) {
    defenses.add("api_gateway");
  }
  for (const primitive of affected) {
    if (primitive === "kube_apiserver" || primitive === "k8s_cluster") defenses.add("cni_overlay");
    if (primitive === "cdn_edge") defenses.add("cloudflare_waf");
  }

  return Array.from(defenses).slice(0, MAX_DEFENSE_PRIMITIVES);
}

function titleFromDescription(description: string, id: string): string {
  const sentence = description.split(/[.!?]\s+/)[0]?.replace(/\s+/g, " ").trim() ?? "";
  if (!sentence) return `${id} infrastructure vulnerability`;
  return sentence.length > 150 ? `${sentence.slice(0, 147).trimEnd()}…` : sentence;
}

/**
 * Deterministic description classifier. Rule order is fixed, so the same raw
 * record always produces the same architecture mapping.
 */
export function mapRawCveToArchitecture(raw: RawCveRecord): CveIntelligenceItem {
  const description = `${raw.description ?? ""}`.trim();
  const haystack = `${raw.id} ${description}`.toLowerCase();
  const tags = new Set<string>();
  const primitives = new Set<string>();
  const votes = new Map<CveEcosystem, number>();

  for (const rule of KEYWORD_RULES) {
    if (!rule.test.test(haystack)) continue;
    tags.add(rule.tag);
    for (const primitive of rule.primitives) primitives.add(primitive);
  }

  if (primitives.size === 0) {
    primitives.add("api_gateway");
    primitives.add("rest_service");
  }

  const affected = Array.from(primitives).slice(0, MAX_AFFECTED_PRIMITIVES);
  const ecosystem = classifyEcosystem(haystack, votes);
  const stride = classifyStride(haystack);
  const rawScore = typeof raw.cvss === "number" && Number.isFinite(raw.cvss) ? raw.cvss : 7.5;
  const cvss = Math.max(0, Math.min(10, rawScore));
  const cweMatch = description.match(/CWE-\d{1,4}/i);
  const published = raw.published && raw.published.length >= 4 ? raw.published.slice(0, 10) : "unknown";
  const exploitedInWild =
    /known exploited|exploited in the wild|cisa kev|active exploitation|exploited by|in the wild/.test(haystack);
  const context = ECOSYSTEM_CONTEXT[ecosystem] ?? "";

  return {
    id: raw.id,
    title: titleFromDescription(description, raw.id),
    published,
    cvss,
    severity: severityFromScore(cvss),
    cwe: cweMatch ? cweMatch[0].toUpperCase() : CWE_BY_STRIDE[stride],
    stride,
    ecosystem,
    affectedPrimitives: affected,
    summary: description.length > 0 ? description : `${raw.id} infrastructure vulnerability reported by a live feed.`,
    architecturalRootCause: `${ROOT_CAUSE_BY_STRIDE[stride]}${context}`,
    mitigationPattern: MITIGATION_BY_STRIDE[stride],
    recommendedDefensePrimitives: classifyDefenses(tags, affected),
    exploitedInWild,
    sourceUrl: raw.sourceUrl ?? `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(raw.id)}`,
  };
}

/* ------------------------------------------------------------------------ */
/* Live feed scraping with a clean offline fallback.                        */
/* ------------------------------------------------------------------------ */

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function asText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = asText(value);
    if (text) return text;
  }
  return undefined;
}

function descriptionsFrom(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  const parts: string[] = [];
  for (const entry of value) {
    const record = asRecord(entry);
    const text = asText(record?.value) ?? asText(record?.description);
    if (text) parts.push(text);
  }
  return parts.length > 0 ? parts.join(" ") : undefined;
}

function firstReferenceUrl(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  for (const entry of value) {
    const direct = asText(entry);
    if (direct) return direct;
    const record = asRecord(entry);
    const url = firstText(record?.url, record?.source);
    if (url) return url;
  }
  return undefined;
}

function cvssFrom(record: UnknownRecord): number | undefined {
  const direct = asNumber(record.cvss) ?? asNumber(record.cvssScore) ?? asNumber(record.score);
  if (direct !== undefined) return direct;

  const cve = asRecord(record.cve);
  const cna = asRecord(asRecord(record.containers)?.cna);
  const metricHolders = [record.metrics, cve?.metrics, cna?.metrics, record.impact];

  for (const holder of metricHolders) {
    const metrics = asRecord(holder);
    if (!metrics) continue;
    for (const key of ["cvssMetricV40", "cvssMetricV31", "cvssMetricV30", "cvssMetricV2", "cvssV3_1", "cvssV3_0"]) {
      const entries = metrics[key];
      if (Array.isArray(entries)) {
        for (const entry of entries) {
          const data = asRecord(asRecord(entry)?.cvssData) ?? asRecord(entry);
          const score = asNumber(data?.baseScore) ?? asNumber(data?.score);
          if (score !== undefined) return score;
        }
      }
      const single = asRecord(metrics[key]);
      const score = asNumber(single?.baseScore);
      if (score !== undefined) return score;
    }
    const cvssData = asRecord(metrics.cvssData);
    const dataScore = asNumber(cvssData?.baseScore);
    if (dataScore !== undefined) return dataScore;
  }

  const cvssObject = asRecord(record.cvss);
  return asNumber(cvssObject?.baseScore);
}

function digestRecord(entry: unknown): RawCveRecord | null {
  const record = asRecord(entry);
  if (!record) return null;

  const cve = asRecord(record.cve);
  const outer = cve ?? record;
  const meta = asRecord(record.cveMetadata);
  const cna = asRecord(asRecord(record.containers)?.cna);

  const id = firstText(
    outer.id,
    outer.cveID,
    outer.cveId,
    record.cveID,
    meta?.cveId,
    record.id,
  );
  if (!id) return null;

  let description = firstText(
    outer.description,
    outer.summary,
    outer.shortDescription,
    descriptionsFrom(outer.descriptions),
    descriptionsFrom(cna?.descriptions),
    record.description,
    record.summary,
    record.shortDescription,
    descriptionsFrom(record.descriptions),
    record.details,
  );
  if (!description) return null;

  const isKevRecord = Boolean(record.vendorProject ?? record.requiredAction ?? record.knownRansomwareCampaignUse);
  if (isKevRecord && !/known exploited|exploited in the wild/i.test(description)) {
    description = `${description} Listed in the CISA KEV catalog as exploited in the wild.`;
  }

  const published = firstText(
    outer.published,
    outer.Published,
    outer.dateAdded,
    meta?.datePublished,
    record.published,
    record.dateAdded,
    record.publishedDate,
    outer.lastModified,
  );

  return {
    id,
    description,
    published,
    cvss: cvssFrom(record) ?? cvssFrom(outer),
    sourceUrl:
      firstText(
        record.sourceUrl,
        record.url,
        firstReferenceUrl(outer.references),
        firstReferenceUrl(record.references),
      ) ?? undefined,
  };
}

function extractRawRecords(payload: unknown): RawCveRecord[] {
  const collect = (value: unknown): RawCveRecord[] => {
    if (!Array.isArray(value)) return [];
    const records: RawCveRecord[] = [];
    for (const entry of value) {
      const digested = digestRecord(entry);
      if (digested) records.push(digested);
    }
    return records;
  };

  if (Array.isArray(payload)) return collect(payload);
  const root = asRecord(payload);
  if (!root) return [];

  for (const key of ["vulnerabilities", "cves", "CVE_Items", "items", "data", "results"]) {
    const records = collect(root[key]);
    if (records.length > 0) return records;
  }
  const single = digestRecord(root);
  return single ? [single] : [];
}

function itemMatchesKeyword(item: CveIntelligenceItem, keyword: string): boolean {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    item.id,
    item.title,
    item.summary,
    item.cwe,
    item.ecosystem,
    item.stride,
    item.architecturalRootCause,
    item.mitigationPattern,
    ...item.affectedPrimitives,
    ...item.recommendedDefensePrimitives,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function curatedFallback(keyword?: string): CveIntelligenceItem[] {
  const needle = keyword?.trim();
  if (!needle) return CURATED_CVE_FEED;
  const filtered = CURATED_CVE_FEED.filter((item) => itemMatchesKeyword(item, needle));
  return filtered.length > 0 ? filtered : CURATED_CVE_FEED;
}

function sourceLabelFor(url: string): string {
  if (/nvd\.nist\.gov/i.test(url)) return "NVD 2.0 Live REST API (services.nvd.nist.gov)";
  if (/cisa\.gov/i.test(url)) return "CISA KEV Live Catalog (cisa.gov)";
  if (/cve\.now/i.test(url)) return "CVE.now Live JSON Feed";
  try {
    return `Live CVE Feed (${new URL(url).hostname})`;
  } catch {
    return "Live CVE Feed";
  }
}

function mergeFeeds(live: CveIntelligenceItem[]): CveIntelligenceItem[] {
  const seen = new Set<string>();
  const merged: CveIntelligenceItem[] = [];

  for (const item of live) {
    const key = item.id.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const curated = CURATED_CVE_FEED.find((entry) => entry.id.toUpperCase() === key);
    // Curated records carry an editorial root-cause / mitigation layer that raw
    // NVD prose cannot provide, so they win on id collisions. Live-only ids are
    // appended and sorted newest-first below.
    merged.push(curated ?? item);
  }
  for (const item of CURATED_CVE_FEED) {
    const key = item.id.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged.sort((a, b) => {
    if (a.published === "unknown") return 1;
    if (b.published === "unknown") return -1;
    return b.published.localeCompare(a.published);
  });
}

/**
 * Fetch a live CVE feed and merge it over the curated cache. Never rejects:
 * network failures, CORS blocks, rate limits, and malformed JSON all degrade to
 * the offline cache so the hub always renders.
 */
export async function scrapeLiveCveFeed(
  options: { keyword?: string; customFeedUrl?: string; timeoutMs?: number } = {},
): Promise<CveFeedResult> {
  const keyword = options.keyword?.trim() || "kubernetes";
  const timeoutMs = Math.max(1500, options.timeoutMs ?? 6500);
  const url =
    options.customFeedUrl?.trim() ||
    `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(keyword)}&resultsPerPage=12`;
  const timestamp = new Date().toISOString();

  try {
    if (typeof fetch !== "function") throw new Error("fetch unavailable");
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer =
      controller !== null
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller?.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`feed responded ${response.status}`);
      const payload: unknown = await response.json();
      const rawRecords = extractRawRecords(payload);
      if (rawRecords.length === 0) throw new Error("feed returned no usable CVE records");

      const liveItems = rawRecords.map((raw) => mapRawCveToArchitecture(raw));
      return {
        items: mergeFeeds(liveItems),
        source: sourceLabelFor(url),
        liveScraped: true,
        timestamp,
      };
    } finally {
      if (timer !== null) clearTimeout(timer);
    }
  } catch {
    return {
      items: curatedFallback(options.keyword),
      source: "Curated NVD / CISA KEV / CVE.now Intelligence Cache (Offline-Ready)",
      liveScraped: false,
      timestamp,
    };
  }
}

/* ------------------------------------------------------------------------ */
/* Canvas security posture / Zero-Trust / STRIDE audit.                     */
/* ------------------------------------------------------------------------ */

const DATABASE_PRIMITIVES = new Set([
  "postgres_db",
  "cockroach_db",
  "cassandra_store",
  "document_store",
  "search_cluster",
  "redis_cache",
]);

function primitiveLabel(resourceId: string): string {
  return SEED_RESOURCE_MAP[resourceId]?.name ?? resourceId;
}

function firstPresent(resourceIds: Set<string>, candidates: string[]): string | undefined {
  return candidates.find((candidate) => resourceIds.has(candidate));
}

function isMultiAzNode(node: SecurityAuditNode): boolean {
  const override = node.overrides?.multiAz;
  if (typeof override === "boolean") return override;
  return SEED_RESOURCE_MAP[node.resourceId]?.defaults.multiAz === true;
}

interface ZeroTrustDefinition {
  id: string;
  label: string;
  candidates: string[];
  fixResourceId: string;
  description: string;
}

const ZERO_TRUST_DEFINITIONS: ZeroTrustDefinition[] = [
  {
    id: "perimeter-waf",
    label: "Perimeter Edge WAF",
    candidates: ["cloudflare_waf", "web_application_firewall"],
    fixResourceId: "cloudflare_waf",
    description: "L7 request inspection and managed rules at the first internet-facing hop.",
  },
  {
    id: "north-south-rate-limit",
    label: "North-South Rate Limiting",
    candidates: ["rate_limiter", "api_gateway"],
    fixResourceId: "rate_limiter",
    description: "Per-client budgets so one caller cannot exhaust shared gateway capacity.",
  },
  {
    id: "central-identity",
    label: "Centralized Identity Provider",
    candidates: ["identity_provider"],
    fixResourceId: "identity_provider",
    description: "One authority issues and validates short-lived workload and user identity.",
  },
  {
    id: "east-west-mtls",
    label: "East-West mTLS / Segmentation",
    candidates: ["envoy_mesh", "service_mesh", "cni_overlay"],
    fixResourceId: "envoy_mesh",
    description: "Service-to-service calls require verified identity and default-deny network policy.",
  },
  {
    id: "secrets-kms",
    label: "Secrets & KMS Vault",
    candidates: ["secrets_manager", "cert_manager"],
    fixResourceId: "secrets_manager",
    description: "Credentials are issued at runtime, scoped, rotated, and never baked into images.",
  },
  {
    id: "private-origin",
    label: "Private Origin / Tunnel Isolation",
    candidates: ["cloudflare_tunnel"],
    fixResourceId: "cloudflare_tunnel",
    description: "Origin services accept traffic only through a private tunnel or multi-AZ data tier.",
  },
];

const ZERO_TRUST_WEIGHTS: Record<string, number> = {
  "perimeter-waf": 22,
  "north-south-rate-limit": 18,
  "central-identity": 18,
  "east-west-mtls": 18,
  "secrets-kms": 14,
  "private-origin": 10,
};

const STRIDE_DEFENSES: Record<StrideCategory, string[]> = {
  Spoofing: ["identity_provider", "cert_manager"],
  Tampering: ["web_application_firewall", "cloudflare_waf"],
  Repudiation: ["observability_stack", "loki_logs"],
  "Information Disclosure": ["secrets_manager", "cni_overlay"],
  "Denial of Service": ["rate_limiter", "cloudflare_waf"],
  "Elevation of Privilege": ["cni_overlay", "envoy_mesh"],
};

const STRIDE_RECOMMENDATIONS: Record<StrideCategory, string> = {
  Spoofing:
    "Route every caller through the identity provider and require mTLS certificates between services before trusting a username or header.",
  Tampering:
    "Put a WAF in front of write paths and validate payloads server-side; never let an upload land in a directory the runtime executes from.",
  Repudiation:
    "Add an observability pipeline that mirrors audit events to an append-only sink with separate credentials from the workload.",
  "Information Disclosure":
    "Vault secrets and segment tenants with network policy so a cache or database compromise cannot read another tenant's data.",
  "Denial of Service":
    "Front the edge with a rate limiter and WAF with connection and per-request budgets; cap parser recursion and memory.",
  "Elevation of Privilege":
    "Keep the control plane off the workload network, run rootless with seccomp, and default-deny east-west traffic unless it is mTLS-authenticated.",
};

export function auditCanvasSecurityArchitecture(
  nodes: SecurityAuditNode[],
  edges: SecurityAuditEdge[],
  cveFeed: CveIntelligenceItem[] = CURATED_CVE_FEED,
): SecurityAudit {
  const resourceIds = new Set(nodes.map((node) => node.resourceId));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const inboundCount = new Map<string, number>();
  for (const edge of edges) {
    if (!nodeIds.has(edge.target)) continue;
    inboundCount.set(edge.target, (inboundCount.get(edge.target) ?? 0) + 1);
  }

  /* ---- Zero-Trust checks ------------------------------------------------ */
  const zeroTrustChecks: ZeroTrustCheck[] = ZERO_TRUST_DEFINITIONS.map((definition) => {
    const found = firstPresent(resourceIds, definition.candidates);
    const multiAzDatabase = nodes.find(
      (node) => DATABASE_PRIMITIVES.has(node.resourceId) && isMultiAzNode(node),
    );
    const passed = definition.id === "private-origin" ? Boolean(found ?? multiAzDatabase) : Boolean(found);
    const evidence =
      found !== undefined
        ? `${primitiveLabel(found)} is on the canvas.`
        : definition.id === "private-origin" && multiAzDatabase
          ? `${multiAzDatabase.label} runs multi-AZ as a private origin.`
          : `No ${primitiveLabel(definition.fixResourceId)} control is present.`;
    const detail = passed
      ? `${evidence} ${definition.description}`
      : `${evidence} ${definition.description} Add ${primitiveLabel(definition.fixResourceId)} to close this gap.`;
    return {
      id: definition.id,
      label: definition.label,
      passed,
      detail,
      fixResourceId: definition.fixResourceId,
    };
  });

  /* ---- CVE exposure per node ------------------------------------------- */
  const exposedNodes: ExposedNode[] = [];

  for (const node of nodes) {
    const matchingCves = cveFeed.filter((cve) => cve.affectedPrimitives.includes(node.resourceId));
    if (matchingCves.length === 0) continue;

    const activeDefenses = new Set<string>();
    for (const cve of matchingCves) {
      for (const defense of cve.recommendedDefensePrimitives) {
        if (resourceIds.has(defense)) activeDefenses.add(defense);
      }
    }

    const mitigatedByTopology = activeDefenses.size > 0;
    const ingress = inboundCount.get(node.id) ?? 0;
    const defenseNames = Array.from(activeDefenses).map(primitiveLabel);
    const mitigationReason = mitigatedByTopology
      ? `Mitigated by ${defenseNames.join(", ")} already on this canvas. The exposed primitive remains in scope for patching, but the defense-in-depth hop absorbs the attack path.`
      : `No recommended defense primitive is present${ingress > 0 ? ` and ${ingress} inbound edge${ingress === 1 ? "" : "s"} reach this node` : " (the node has no inbound edge yet, so it is a latent risk rather than a reachable one)"}. Add ${matchingCves[0].recommendedDefensePrimitives.map(primitiveLabel).slice(0, 2).join(" + ")} to interrupt the blast radius.`;

    exposedNodes.push({
      nodeId: node.id,
      label: node.label,
      resourceId: node.resourceId,
      matchingCves,
      mitigatedByTopology,
      mitigationReason,
    });
  }

  /* ---- STRIDE breakdown ------------------------------------------------- */
  const strideBreakdown: StrideBreakdownEntry[] = STRIDE_CATEGORIES.map((category) => {
    const relevant = cveFeed.filter((cve) => cve.stride === category);
    const affectedRelevant = relevant.filter((cve) =>
      cve.affectedPrimitives.some((primitive) => resourceIds.has(primitive)),
    );
    const mitigatedRelevant = affectedRelevant.filter((cve) =>
      cve.recommendedDefensePrimitives.some((primitive) => resourceIds.has(primitive)),
    );
    const unmitigated = affectedRelevant.filter(
      (cve) => !cve.recommendedDefensePrimitives.some((primitive) => resourceIds.has(primitive)),
    );
    const controlPresent = STRIDE_DEFENSES[category].some((primitive) => resourceIds.has(primitive));

    let status: StrideStatus;
    if (unmitigated.length > 0) status = "exposed";
    else if (mitigatedRelevant.length > 0) status = "hardened";
    else if (controlPresent) status = "hardened";
    else status = "partial";

    const pieces: string[] = [];
    if (affectedRelevant.length === 0) {
      pieces.push(
        controlPresent
          ? `No feed CVE currently targets an affected primitive, and ${primitiveLabel(
              STRIDE_DEFENSES[category].find((primitive) => resourceIds.has(primitive)) ?? "",
            )} is already present.`
          : "No feed CVE currently targets an affected primitive, but no category control is present to verify the assumption.",
      );
    } else {
      pieces.push(
        `${mitigatedRelevant.length} of ${affectedRelevant.length} in-scope CVE${
          affectedRelevant.length === 1 ? "" : "s"
        } have a recommended defense on the canvas.`,
      );
      if (unmitigated.length > 0) {
        pieces.push(
          `Exposed: ${unmitigated
            .slice(0, 2)
            .map((cve) => cve.id)
            .join(", ")}${unmitigated.length > 2 ? ` +${unmitigated.length - 2} more` : ""}.`,
        );
      }
    }

    return {
      category,
      status,
      detail: pieces.join(" "),
      recommendation: STRIDE_RECOMMENDATIONS[category],
    };
  });

  /* ---- Score ------------------------------------------------------------ */
  const checkScore = zeroTrustChecks.reduce(
    (sum, check) => sum + (check.passed ? (ZERO_TRUST_WEIGHTS[check.id] ?? 0) : 0),
    0,
  );
  const unmitigatedExposures = exposedNodes.filter((node) => !node.mitigatedByTopology).length;
  const exposurePenalty = Math.min(25, unmitigatedExposures * 4);
  const securityPostureScore = Math.max(0, Math.min(100, Math.round(checkScore - exposurePenalty)));

  return {
    securityPostureScore,
    zeroTrustChecks,
    exposedNodes,
    strideBreakdown,
  };
}

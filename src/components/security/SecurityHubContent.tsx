'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Flame,
  Globe,
  Lock,
  RefreshCw,
  Shield,
  ShieldCheck,
  Wrench,
  XCircle,
  Zap,
} from '@/components/ui/icons';
import {
  CURATED_CVE_FEED,
  CVE_ECOSYSTEMS,
  CVE_SEVERITIES,
  STRIDE_INTENT,
  type CveEcosystem,
  type CveIntelligenceItem,
  type CveSeverity,
} from '@/data/cveIntelligence';
import { SEED_RESOURCE_MAP } from '@/data/seedResources';
import { SecurityPractices } from '@/components/security/SecurityPractices';
import { auditCanvasSecurityArchitecture, scrapeLiveCveFeed } from '@/engine/cveScanner';
import { flushPendingCanvasWrite } from '@/store/canvasPersistence';
import { useCanvasStore } from '@/store/useCanvasStore';

const OFFLINE_SOURCE = "Curated NVD / CISA KEV / CVE.now Intelligence Cache (Offline-Ready)";

const SCRAPE_KEYWORDS = ["kubernetes", "envoy", "nginx", "redis", "postgresql", "cloudflare", "aws", "llm"];

const HARDENING_RESOURCE_IDS = [
  "cloudflare_waf",
  "rate_limiter",
  "identity_provider",
  "envoy_mesh",
  "secrets_manager",
];

const ENTRY_RESOURCE_IDS = new Set([
  "cdn_edge",
  "dns_load_balancer",
  "api_gateway",
  "ingress_controller",
  "kube_ingress_gateway",
  "cloudflare_tunnel",
]);

const STRIDE_STATUS_META: Record<string, { label: string; className: string }> = {
  hardened: { label: "Hardened", className: "border-success/40 bg-success/10 text-success" },
  partial: { label: "Partial", className: "border-warning/40 bg-warning/10 text-warning" },
  exposed: { label: "Exposed", className: "border-danger/40 bg-danger/10 text-danger" },
};

function primitiveLabel(resourceId: string): string {
  return SEED_RESOURCE_MAP[resourceId]?.name ?? resourceId;
}

function scoreTone(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 55) return "text-warning";
  return "text-danger";
}

function scoreCaption(score: number): string {
  if (score >= 85) return "Zero-trust posture holds. Keep patching the primitives that remain exposed.";
  if (score >= 60) return "A working baseline, but several trust boundaries are still assumed rather than enforced.";
  if (score > 0) return "The canvas has visible gaps. Apply the hardening set, then re-run the audit.";
  return "No defenses on the canvas yet. Add a perimeter, identity, and segmentation layer first.";
}

function formatSync(iso: string | null): string {
  if (!iso) return "offline cache loaded";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "offline cache loaded";
  return `synced ${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
}

function severityClass(severity: CveSeverity): string {
  if (severity === "CRITICAL") return "border-danger/40 bg-danger/10 text-danger";
  if (severity === "HIGH") return "border-warning/40 bg-warning/10 text-warning";
  return "border-brass/40 bg-brass/10 text-brass";
}

function averagePosition(): { x: number; y: number } {
  const { nodes } = useCanvasStore.getState();
  if (nodes.length === 0) return { x: 320, y: 240 };
  const total = nodes.reduce(
    (sum, node) => ({ x: sum.x + node.position.x, y: sum.y + node.position.y }),
    { x: 0, y: 0 },
  );
  return { x: total.x / nodes.length, y: total.y / nodes.length };
}

/** Find the primitive on the canvas or add it in a ring around the current graph. */
function ensurePrimitive(resourceId: string): string {
  const state = useCanvasStore.getState();
  const existing = state.nodes.find((node) => String(node.data.resourceId) === resourceId);
  if (existing) return existing.id;

  const anchor = averagePosition();
  const index = state.nodes.length;
  const angle = (index % 8) * (Math.PI / 4);
  const position = {
    x: Math.round(anchor.x + Math.cos(angle) * 300 - 108),
    y: Math.round(anchor.y + Math.sin(angle) * 220 + 60),
  };
  return state.addNode(resourceId, position);
}

/** Ensure a reachable internet-facing hop exists so a blast radius is meaningful. */
function ensureExposurePath(targetNodeId: string, targetResourceId: string): void {
  const state = useCanvasStore.getState();
  if (ENTRY_RESOURCE_IDS.has(targetResourceId)) return;
  const hasEntry = state.nodes.some((node) => ENTRY_RESOURCE_IDS.has(String(node.data.resourceId)));
  if (hasEntry) return;
  const entryId = ensurePrimitive("api_gateway");
  if (entryId !== targetNodeId) useCanvasStore.getState().addEdge(entryId, targetNodeId);
}

function wireDefense(defenseNodeId: string, targetNodeId: string): void {
  if (defenseNodeId === targetNodeId) return;
  useCanvasStore.getState().addEdge(defenseNodeId, targetNodeId);
}

function navigateToCanvas(router: ReturnType<typeof useRouter>): void {
  flushPendingCanvasWrite();
  router.push("/canvas");
}

export function SecurityHubContent() {
  const router = useRouter();
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);

  const [feed, setFeed] = useState<CveIntelligenceItem[]>(CURATED_CVE_FEED);
  const [feedSource, setFeedSource] = useState(OFFLINE_SOURCE);
  const [liveScraped, setLiveScraped] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState(SCRAPE_KEYWORDS[0]);
  const [customFeedUrl, setCustomFeedUrl] = useState("");
  const [ecosystemFilter, setEcosystemFilter] = useState<"all" | CveEcosystem>("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | CveSeverity>("all");
  const [kevOnly, setKevOnly] = useState(false);
  const [actionNote, setActionNote] = useState<string | null>(null);

  // Restore the user's persisted topology so the posture panel reflects the
  // canvas they actually saved, not an empty first render.
  useEffect(() => {
    void Promise.resolve(useCanvasStore.persist.rehydrate()).catch(() => undefined);
  }, []);

  const audit = useMemo(
    () =>
      auditCanvasSecurityArchitecture(
        nodes.map((node) => ({
          id: node.id,
          resourceId: String(node.data.resourceId),
          label: String(node.data.label),
          overrides: node.data.overrides as Record<string, unknown>,
        })),
        edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
        feed,
      ),
    [nodes, edges, feed],
  );

  const visibleFeed = useMemo(() => {
    return feed.filter((item) => {
      if (ecosystemFilter !== "all" && item.ecosystem !== ecosystemFilter) return false;
      if (severityFilter !== "all" && item.severity !== severityFilter) return false;
      if (kevOnly && !item.exploitedInWild) return false;
      return true;
    });
  }, [feed, ecosystemFilter, severityFilter, kevOnly]);

  const exposureByCve = useMemo(() => {
    const map = new Map<string, { total: number; mitigated: number }>();
    for (const exposed of audit.exposedNodes) {
      for (const cve of exposed.matchingCves) {
        const entry = map.get(cve.id) ?? { total: 0, mitigated: 0 };
        entry.total += 1;
        if (exposed.mitigatedByTopology) entry.mitigated += 1;
        map.set(cve.id, entry);
      }
    }
    return map;
  }, [audit]);

  const kevCount = feed.filter((item) => item.exploitedInWild).length;
  const criticalCount = feed.filter((item) => item.severity === "CRITICAL").length;
  const passedChecks = audit.zeroTrustChecks.filter((check) => check.passed).length;
  const mitigatedNodes = audit.exposedNodes.filter((node) => node.mitigatedByTopology).length;

  const handleScrape = async () => {
    setLoading(true);
    setActionNote(null);
    try {
      const result = await scrapeLiveCveFeed({
        keyword,
        customFeedUrl: customFeedUrl.trim() || undefined,
      });
      setFeed(result.items);
      setFeedSource(result.source);
      setLiveScraped(result.liveScraped);
      setLastSync(result.timestamp);
      setActionNote(
        result.liveScraped
          ? `Live feed merged. ${result.items.length} records are now available for the canvas audit.`
          : "Live feed was unreachable (offline, CORS, or rate-limited). The curated intelligence cache is loaded instead.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApplyHardening = () => {
    let state = useCanvasStore.getState();
    if (state.nodes.length === 0) {
      state.loadStarterTemplate();
      state = useCanvasStore.getState();
    }

    const entry =
      state.nodes.find((node) => ENTRY_RESOURCE_IDS.has(String(node.data.resourceId))) ?? state.nodes[0];
    let added = 0;

    for (const resourceId of HARDENING_RESOURCE_IDS) {
      const alreadyPresent = useCanvasStore
        .getState()
        .nodes.some((node) => String(node.data.resourceId) === resourceId);
      const defenseId = ensurePrimitive(resourceId);
      if (!alreadyPresent) added += 1;
      if (entry) wireDefense(defenseId, entry.id);
    }

    if (entry) useCanvasStore.getState().focusNode(entry.id);
    setActionNote(
      `${added === 0 ? "All hardening primitives were already present" : `Added ${added} hardening primitive${added === 1 ? "" : "s"}`} and wired them ahead of ${entry ? String(entry.data.label) : "the entry point"}.`,
    );
    navigateToCanvas(router);
  };

  const handleSimulateBlastRadius = (cve: CveIntelligenceItem) => {
    const targetResourceId = cve.affectedPrimitives[0] ?? "api_gateway";
    const targetId = ensurePrimitive(targetResourceId);
    ensureExposurePath(targetId, targetResourceId);
    useCanvasStore.getState().focusNode(targetId);
    setActionNote(`Blast radius staged around ${primitiveLabel(targetResourceId)} for ${cve.id}.`);
    navigateToCanvas(router);
  };

  const handlePatchArchitecture = (cve: CveIntelligenceItem) => {
    const state = useCanvasStore.getState();
    const existingTarget = state.nodes.find((node) =>
      cve.affectedPrimitives.includes(String(node.data.resourceId)),
    );
    const targetResourceId = existingTarget
      ? String(existingTarget.data.resourceId)
      : (cve.affectedPrimitives[0] ?? "api_gateway");
    const targetId = existingTarget?.id ?? ensurePrimitive(targetResourceId);
    ensureExposurePath(targetId, targetResourceId);

    let added = 0;
    for (const defense of cve.recommendedDefensePrimitives) {
      const alreadyPresent = useCanvasStore
        .getState()
        .nodes.some((node) => String(node.data.resourceId) === defense);
      const defenseId = ensurePrimitive(defense);
      if (!alreadyPresent) added += 1;
      wireDefense(defenseId, targetId);
    }

    useCanvasStore.getState().focusNode(targetId);
    setActionNote(
      `${added === 0 ? "Defense primitives already present" : `Added ${added} defense primitive${added === 1 ? "" : "s"}`} around ${primitiveLabel(targetResourceId)} for ${cve.id}.`,
    );
    navigateToCanvas(router);
  };

  const score = audit.securityPostureScore;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="section-container min-w-0 py-12 md:py-16">
      {/* Hero */}
      <div className="grid items-end gap-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <span className="eyebrow">
            <Shield className="h-3.5 w-3.5 text-brass" />
            Security architecture
          </span>
          <h1 className="mt-5 max-w-2xl text-balance text-4xl font-semibold tracking-tight text-content md:text-5xl">
            Design the system. <span className="text-brass">Then break it</span> before someone else does.
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-content-secondary">
            Threat-model the canvas you already built, map every live infrastructure CVE onto the SysCraft primitive
            that carries it, and patch the architecture — not just the version string.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {[
              { label: "STRIDE threat model", icon: Activity },
              { label: "CISA KEV aware", icon: Flame },
              { label: "Zero-trust audit", icon: Lock },
            ].map(({ label, icon: Icon }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-app/50 px-3 py-1 text-[12px] text-content-secondary"
              >
                <Icon className="h-3.5 w-3.5 text-brass" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="min-w-0 lg:col-span-5">
          <div className="min-w-0 rounded-2xl border border-line bg-app/50 p-4 shadow-card">
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] uppercase tracking-[0.18em] text-content-tertiary">Threat snapshot</p>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-content-tertiary">
                <span className={`h-1.5 w-1.5 rounded-full ${liveScraped ? "bg-success" : "bg-brass"}`} />
                {liveScraped ? "live feed" : "curated cache"}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { value: feed.length, label: "CVE records" },
                { value: criticalCount, label: "critical" },
                { value: kevCount, label: "KEV exploited" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-line bg-ink/40 px-3 py-2.5">
                  <p className="text-lg font-semibold text-content">{stat.value}</p>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-content-tertiary">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              {feed.slice(0, 3).map((cve) => (
                <div key={cve.id} className="flex items-center gap-2 rounded-lg border border-line/70 px-2.5 py-1.5">
                  <span className="font-mono text-[10px] text-brass">{cve.id}</span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-content-secondary">{cve.title}</span>
                  <span className="text-[10px] font-semibold text-content-tertiary">{cve.cvss.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SecurityPractices />

      {/* Live scraper */}
      <section className="mt-12 overflow-hidden rounded-2xl border border-line bg-app/50 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Live CVE scraper</p>
            <p className="mt-1 text-[12.5px] text-content-secondary">
              Query the NVD REST API, a CISA KEV export, or your own <code className="font-mono text-[11px] text-content">cve.now</code>{" "}
              JSON feed. CORS, offline, and rate-limit failures fall back to the curated cache.
            </p>
          </div>
          <div
            className="flex w-full min-w-0 flex-col items-start gap-1 sm:ml-auto sm:w-auto sm:max-w-[460px] sm:items-end"
            role="status"
            aria-live="polite"
          >
            <span
              className={`inline-flex w-full min-w-0 max-w-full items-center gap-2 rounded-full border px-3 py-1 text-[11px] sm:w-auto ${
                liveScraped
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-line bg-app-raised/60 text-content-secondary"
              }`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${loading ? "animate-pulse bg-brass" : liveScraped ? "bg-success" : "bg-brass"}`} />
              <span className="truncate">
                {loading ? "Scraping live intelligence…" : feedSource}
              </span>
            </span>
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-content-tertiary">{formatSync(lastSync)}</span>
          </div>
        </div>

        <div className="grid gap-3 px-5 py-4 md:grid-cols-[180px_1fr_auto] md:items-end">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-content-tertiary">Keyword</span>
            <select
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-ink/60 px-3 text-[13px] text-content outline-none transition focus:border-brass/60"
            >
              {SCRAPE_KEYWORDS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-content-tertiary">
              Custom feed / NVD / CISA KEV URL (optional)
            </span>
            <input
              type="url"
              value={customFeedUrl}
              onChange={(event) => setCustomFeedUrl(event.target.value)}
              placeholder="https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=kubernetes"
              className="h-10 w-full rounded-lg border border-line bg-ink/60 px-3 font-mono text-[11.5px] text-content outline-none transition placeholder:text-content-tertiary/70 focus:border-brass/60"
            />
          </label>

          <button
            type="button"
            onClick={handleScrape}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brass px-4 text-[12.5px] font-semibold text-ink transition hover:bg-brass-bright disabled:cursor-wait disabled:opacity-70"
          >
            {loading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink/30 border-t-ink" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {loading ? "Scraping…" : "Scrape Live CVEs Now"}
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-t border-line px-5 py-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-content-tertiary">Ecosystem</span>
            <select
              value={ecosystemFilter}
              onChange={(event) => setEcosystemFilter(event.target.value as "all" | CveEcosystem)}
              className="h-9 rounded-lg border border-line bg-ink/60 px-3 text-[12px] text-content outline-none focus:border-brass/60"
            >
              <option value="all">All ecosystems</option>
              {CVE_ECOSYSTEMS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-content-tertiary">Severity</span>
            <select
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value as "all" | CveSeverity)}
              className="h-9 rounded-lg border border-line bg-ink/60 px-3 text-[12px] text-content outline-none focus:border-brass/60"
            >
              <option value="all">All severities</option>
              {CVE_SEVERITIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-line bg-ink/60 px-3 text-[12px] text-content-secondary transition hover:border-brass/40">
            <input
              type="checkbox"
              checked={kevOnly}
              onChange={(event) => setKevOnly(event.target.checked)}
              className="h-3.5 w-3.5 accent-[#cda86a]"
            />
            <Flame className="h-3.5 w-3.5 text-danger" />
            Exploited in the wild (KEV)
          </label>

          <span className="ml-auto text-[11px] text-content-tertiary">
            Showing <span className="text-content">{visibleFeed.length}</span> of {feed.length} records
          </span>
        </div>

        {actionNote ? (
          <p className="border-t border-line bg-brass/[0.06] px-5 py-2.5 text-[11.5px] text-content-secondary" role="status">
            {actionNote}
          </p>
        ) : null}
      </section>

      {/* Canvas posture */}
      <section className="mt-10 grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col items-center rounded-2xl border border-line bg-app/50 p-5 text-center shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Security posture</p>
          <div className="relative mt-4 h-36 w-36">
            <svg viewBox="0 0 100 100" className={`h-36 w-36 -rotate-90 ${scoreTone(score)}`} aria-hidden="true">
              <circle cx="50" cy="50" r={radius} fill="none" stroke="rgb(var(--line))" strokeWidth="7" />
              {score > 0 ? (
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
                  className="transition-all duration-700"
                />
              ) : null}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-semibold tracking-tight ${scoreTone(score)}`}>{score}</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-content-tertiary">/ 100</span>
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-content-secondary">{scoreCaption(score)}</p>

          <dl className="mt-4 grid w-full grid-cols-2 gap-2 text-left">
            <div className="rounded-xl border border-line bg-ink/40 px-3 py-2">
              <dt className="text-[9.5px] uppercase tracking-[0.12em] text-content-tertiary">Controls</dt>
              <dd className="text-[13px] font-semibold text-content">
                {passedChecks}/{audit.zeroTrustChecks.length}
              </dd>
            </div>
            <div className="rounded-xl border border-line bg-ink/40 px-3 py-2">
              <dt className="text-[9.5px] uppercase tracking-[0.12em] text-content-tertiary">Mitigated paths</dt>
              <dd className="text-[13px] font-semibold text-content">
                {mitigatedNodes}/{audit.exposedNodes.length || 0}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={handleApplyHardening}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brass px-4 py-2.5 text-[12.5px] font-semibold text-ink transition hover:bg-brass-bright"
          >
            <ShieldCheck className="h-4 w-4" />
            Apply Zero-Trust Hardening
          </button>
          <Link
            href="/canvas"
            className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] text-content-tertiary transition hover:text-brass"
          >
            Open the canvas <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <p className="mt-2 text-[10.5px] leading-relaxed text-content-tertiary">
            Adds the missing perimeter, identity, mesh, and secrets primitives, then wires them ahead of the entry
            point.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-app/50 p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Zero-trust alignment</p>
              <p className="mt-1 text-[12.5px] text-content-secondary">
                Six architectural checks against the canvas currently in your store.
              </p>
            </div>
            <span className="rounded-full border border-line bg-ink/40 px-2.5 py-1 text-[10.5px] uppercase tracking-[0.12em] text-content-tertiary">
              {nodes.length} node{nodes.length === 1 ? "" : "s"} · {edges.length} edge{edges.length === 1 ? "" : "s"}
            </span>
          </div>

          <ul className="mt-4 grid gap-2.5 md:grid-cols-2">
            {audit.zeroTrustChecks.map((check) => (
              <li
                key={check.id}
                className={`rounded-xl border p-3 ${
                  check.passed ? "border-success/25 bg-success/[0.05]" : "border-line bg-ink/30"
                }`}
              >
                <div className="flex items-start gap-2">
                  {check.passed ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  )}
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-content">{check.label}</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-content-secondary">{check.detail}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {audit.exposedNodes.length > 0 ? (
            <div className="mt-4 rounded-xl border border-line bg-ink/30 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <p className="text-[12px] font-semibold text-content">Canvas CVE exposure</p>
                <span className="ml-auto text-[10.5px] uppercase tracking-[0.12em] text-content-tertiary">
                  {mitigatedNodes} mitigated · {audit.exposedNodes.length - mitigatedNodes} unprotected
                </span>
              </div>
              <ul className="mt-2 space-y-1.5">
                {audit.exposedNodes.slice(0, 4).map((exposed) => (
                  <li key={exposed.nodeId} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11.5px]">
                    <span className="font-medium text-content">{exposed.label}</span>
                    <span className="font-mono text-[10px] text-content-tertiary">
                      {exposed.matchingCves.map((cve) => cve.id).join(", ")}
                    </span>
                    <span className={exposed.mitigatedByTopology ? "text-success" : "text-danger"}>
                      {exposed.mitigatedByTopology ? "mitigated" : "unprotected"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-success/25 bg-success/[0.05] px-3 py-2.5">
              <ShieldCheck className="h-4 w-4 text-success" />
              <p className="text-[11.5px] text-content-secondary">
                No node on this canvas maps to a known CVE in the active feed. Add primitives to stress-test the
                architecture.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* STRIDE */}
      <section className="mt-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">STRIDE threat model</p>
            <p className="mt-1 text-[12.5px] text-content-secondary">
              Each category is scored from the feed records that target primitives on your canvas.
            </p>
          </div>
          <span className="text-[11px] text-content-tertiary">
            {audit.strideBreakdown.filter((entry) => entry.status === "hardened").length} hardened ·{" "}
            {audit.strideBreakdown.filter((entry) => entry.status === "exposed").length} exposed
          </span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {audit.strideBreakdown.map((entry) => {
            const meta = STRIDE_STATUS_META[entry.status];
            return (
              <div key={entry.category} className="flex h-full flex-col rounded-2xl border border-line bg-app/50 p-4 shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-content">{entry.category}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] ${meta.className}`}>
                    {meta.label}
                  </span>
                </div>
                <p className="mt-2 text-[11.5px] leading-relaxed text-content-secondary">{STRIDE_INTENT[entry.category]}</p>
                <p className="mt-2 flex-1 text-[11px] leading-relaxed text-content-tertiary">{entry.detail}</p>
                <p className="mt-2 border-t border-line pt-2 text-[11px] leading-relaxed text-content-secondary">
                  <span className="text-brass">Fix: </span>
                  {entry.recommendation}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CVE grid */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">CVE intelligence</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-content md:text-3xl">
              Every CVE has an architecture lesson
            </h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-content-secondary">
              Patch the primitive in the version column, then trace the structural assumption it broke. The badge on
              each card is computed against the canvas in your store right now.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-app/50 px-3 py-1 text-[11px] text-content-secondary">
            <Globe className="h-3.5 w-3.5 text-brass" />
            {visibleFeed.length} in view
          </span>
        </div>

        {visibleFeed.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-line bg-app/50 px-5 py-10 text-center">
            <p className="text-[13px] text-content-secondary">
              No records match these filters. Clear the severity, ecosystem, or KEV filter to see the full feed.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {visibleFeed.map((cve) => {
              const exposure = exposureByCve.get(cve.id);
              const exposureState = !exposure
                ? "absent"
                : exposure.mitigated === exposure.total
                  ? "mitigated"
                  : exposure.mitigated > 0
                    ? "partial"
                    : "exposed";
              return (
                <article
                  key={cve.id}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-app/50 shadow-card transition hover:border-line-strong"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] ${severityClass(cve.severity)}`}>
                          {cve.severity}
                        </span>
                        {cve.exploitedInWild ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-danger/40 bg-danger/10 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-danger">
                            <Flame className="h-3 w-3" /> KEV
                          </span>
                        ) : null}
                        <span className="font-mono text-[10.5px] text-content-tertiary">{cve.id}</span>
                      </div>
                      <h3 className="mt-2 text-[15px] font-semibold leading-snug text-content">{cve.title}</h3>
                    </div>
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-ink/50">
                      <span className="text-lg font-semibold text-content">{cve.cvss.toFixed(1)}</span>
                      <span className="text-[8.5px] uppercase tracking-[0.12em] text-content-tertiary">CVSS</span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 px-5 py-4">
                    <div className="flex flex-wrap gap-1.5 text-[10.5px]">
                      <span className="rounded-full border border-line bg-app-raised/60 px-2 py-0.5 font-mono text-content-secondary">
                        {cve.cwe}
                      </span>
                      <span className="rounded-full border border-line bg-app-raised/60 px-2 py-0.5 text-content-secondary">
                        {cve.stride}
                      </span>
                      <span className="rounded-full border border-line bg-app-raised/60 px-2 py-0.5 text-content-secondary">
                        {cve.ecosystem}
                      </span>
                      <span className="rounded-full border border-line bg-app-raised/60 px-2 py-0.5 text-content-tertiary">
                        {cve.published}
                      </span>
                    </div>

                    <p className="text-[12.5px] leading-relaxed text-content-secondary">{cve.summary}</p>

                    <div className="rounded-xl border border-line bg-ink/30 p-3">
                      <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-brass">
                        Architectural root cause
                      </p>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-content-secondary">
                        {cve.architecturalRootCause}
                      </p>
                    </div>

                    <div className="rounded-xl border border-line bg-ink/30 p-3">
                      <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-brass">
                        Defense-in-depth mitigation
                      </p>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-content-secondary">{cve.mitigationPattern}</p>
                    </div>

                    <div>
                      <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
                        Affected SysCraft primitives
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {cve.affectedPrimitives.map((primitive) => (
                          <span
                            key={primitive}
                            className="rounded-md border border-danger/25 bg-danger/[0.06] px-2 py-0.5 text-[10.5px] text-content-secondary"
                          >
                            {primitiveLabel(primitive)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
                        Recommended defenses
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {cve.recommendedDefensePrimitives.map((primitive) => (
                          <span
                            key={primitive}
                            className="rounded-md border border-success/25 bg-success/[0.06] px-2 py-0.5 text-[10.5px] text-content-secondary"
                          >
                            {primitiveLabel(primitive)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div
                      className={`mt-auto flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] ${
                        exposureState === "exposed"
                          ? "border-danger/30 bg-danger/[0.07] text-danger"
                          : exposureState === "partial"
                            ? "border-warning/30 bg-warning/[0.07] text-warning"
                            : exposureState === "mitigated"
                              ? "border-success/30 bg-success/[0.07] text-success"
                              : "border-line bg-ink/30 text-content-tertiary"
                      }`}
                    >
                      {exposureState === "exposed" ? (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      ) : exposureState === "partial" ? (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      ) : exposureState === "mitigated" ? (
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <Shield className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span>
                        {exposureState === "exposed"
                          ? `Exposed on your canvas: ${exposure?.total ?? 0} node${(exposure?.total ?? 0) === 1 ? "" : "s"} in scope, no recommended defense present.`
                          : exposureState === "partial"
                            ? `Partly mitigated: ${exposure?.mitigated ?? 0} of ${exposure?.total ?? 0} exposed nodes are behind a recommended defense.`
                            : exposureState === "mitigated"
                              ? `Mitigated by your topology: all ${exposure?.total ?? 0} exposed node${(exposure?.total ?? 0) === 1 ? "" : "s"} sit behind a recommended defense.`
                              : "Not on your canvas yet — simulate the blast radius to stage the affected primitive."}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => handleSimulateBlastRadius(cve)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-app-raised/60 px-3 py-1.5 text-[11.5px] font-medium text-content transition hover:border-brass/50 hover:text-brass"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Simulate Blast Radius on Canvas
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePatchArchitecture(cve)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brass/40 bg-brass/10 px-3 py-1.5 text-[11.5px] font-medium text-brass transition hover:bg-brass/20"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      Patch Architecture (+ Defense Primitives)
                    </button>
                    <a
                      href={cve.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto inline-flex items-center gap-1 self-center text-[11px] text-content-tertiary transition hover:text-brass"
                    >
                      Advisory
                      <ArrowRight className="h-3 w-3 -rotate-45" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="mt-10 flex items-start gap-2 border-t border-line pt-5 text-[11px] leading-relaxed text-content-tertiary">
        <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brass" />
        CVE metadata is a curated architecture cache merged with live NVD / CISA KEV JSON when the browser allows the
        request. CVSS scores, affected ranges, and vendor advisories should always be confirmed against the linked
        source before making patch decisions. The hub never sends your canvas topology anywhere: the audit runs
        locally in the browser.
      </p>
    </div>
  );
}

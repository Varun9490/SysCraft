'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  FileJson,
  FileText,
  FlaskConical,
  Gauge,
  Globe,
  GraduationCap,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Table,
  Trash2,
  Upload,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from "@/components/ui/icons";
import { BLUEPRINT_MAP } from "@/data/blueprints";
import {
  ENTERPRISE_ROLE_TRACKS,
  READINESS_PILLARS,
  SAMPLE_TEAM_COHORT,
  STARTER_ADRS,
  type AdrRecord,
  type AdrStatus,
  type EnterpriseRoleTrack,
  type ReadinessPillarId,
  type TeamMemberReadiness,
} from "@/data/enterpriseTracks";
import { GUIDED_LABS } from "@/data/guidedLabs";
import { PATH_PARTS } from "@/data/pathData";
import { getSeedResource } from "@/data/seedResources";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useLearningStore } from "@/store/useLearningStore";
import { useSimStore } from "@/store/useSimStore";
import type { LabProgress } from "@/types/challenges";

/* ------------------------------------------------------------------ */
/* Constants & pure helpers                                            */
/* ------------------------------------------------------------------ */

type TabId = "tracks" | "sla" | "finops" | "adr";

const TABS: Array<{ id: TabId; label: string; hint: string; icon: LucideIcon }> = [
  { id: "tracks", label: "Tracks & radar", hint: "Role pathways and a six-axis readiness view", icon: GraduationCap },
  { id: "sla", label: "SLA & error budget", hint: "Composite availability from the active canvas", icon: Gauge },
  { id: "finops", label: "FinOps TCO", hint: "Five deployment models, one monthly bill", icon: Wallet },
  { id: "adr", label: "ADR studio & cohort", hint: "Decision records and team readiness", icon: FileText },
];

const MINUTES_PER_MONTH = 43_200;
const SECONDS_PER_MONTH = MINUTES_PER_MONTH * 60;
const HOURS_PER_MONTH = 730;
const HOURS_PER_YEAR = 8_760;
const REFERENCE_IDS = ["cdn_edge", "api_gateway", "rest_service", "postgres_db"] as const;
const SLA_TARGETS = [99.9, 99.95, 99.99, 99.999] as const;

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const USD_PRECISE = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatUsd(value: number): string {
  return USD.format(Number.isFinite(value) ? value : 0);
}

function formatUsdPrecise(value: number): string {
  return USD_PRECISE.format(Number.isFinite(value) ? value : 0);
}

function formatPct(fraction: number, digits = 3): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

function formatScore(score: number): string {
  return `${Math.round(score)}%`;
}

function formatDowntime(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0s";
  if (minutes < 1) return `${(minutes * 60).toFixed(1)}s`;
  if (minutes < 60) return `${minutes.toFixed(1)}m`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const remainder = Math.round(minutes % 60);
    return `${hours}h ${remainder}m`;
  }
  return `${(minutes / 1440).toFixed(2)} days`;
}

function scoreTone(score: number): { bar: string; text: string } {
  if (score >= 80) return { bar: "bg-success", text: "text-success" };
  if (score >= 60) return { bar: "bg-brass", text: "text-brass" };
  if (score >= 40) return { bar: "bg-warning", text: "text-warning" };
  return { bar: "bg-danger", text: "text-danger" };
}

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const MODULE_TITLE_BY_ID = new Map(
  PATH_PARTS.flatMap((part) => part.modules).map((module) => [module.id, module.title]),
);

const LAB_STAGE_TOTALS = new Map(GUIDED_LABS.map((lab) => [lab.id, lab.stages.length]));
const LAB_TITLE_BY_ID = new Map(GUIDED_LABS.map((lab) => [lab.id, lab.title]));

interface ModuleMastery {
  total: number;
  reviewed: number;
}

type ModuleMasteryMap = Map<string, ModuleMastery>;

const PILLAR_SOURCE: Record<ReadinessPillarId, { moduleIds: string[]; labIds: string[] }> = {
  scalability: {
    moduleIds: [
      "simple-system",
      "caching",
      "one-server-not-enough",
      "one-database-not-enough",
      "rate-limiting",
      "replication-depth",
      "partitioning-depth",
      "availability-global",
    ],
    labIds: [
      "bitly-url-shortener",
      "twitter-timeline",
      "netflix-streaming",
      "uber-matching",
      "distributed-rate-limiter",
    ],
  },
  aws: {
    moduleIds: ["aws-architecture-scratch-to-prod", "storage-engines", "one-database-not-enough"],
    labIds: ["dynamodb-from-scratch", "razorpay-payments", "notification-platform"],
  },
  cloudflare: {
    moduleIds: ["cloudflare-edge-and-workers", "caching", "rate-limiting"],
    labIds: ["bitly-url-shortener", "agentic-rag-support", "dropbox-file-sync"],
  },
  kubernetes: {
    moduleIds: ["kubernetes-control-and-data-plane", "extensible-plugins-and-operators", "growing-big"],
    labIds: ["uber-matching", "search-autocomplete"],
  },
  security: {
    moduleIds: ["security-zero-trust-and-cve-defense", "cross-service-transactions", "rate-limiting"],
    labIds: ["razorpay-payments", "whatsapp-chat", "agentic-rag-support"],
  },
  finops: {
    moduleIds: ["principal-architect-and-finops", "growing-big", "putting-it-together"],
    labIds: ["netflix-streaming", "pastebin-service", "youtube-upload-playback"],
  },
};

function computePillarScore(
  pillarId: ReadinessPillarId,
  moduleMastery: ModuleMasteryMap,
  labProgress: Record<string, LabProgress>,
): number {
  const source = PILLAR_SOURCE[pillarId];
  let loadedModules = 0;
  let reviewedModules = 0;
  for (const moduleId of source.moduleIds) {
    const mastery = moduleMastery.get(moduleId);
    if (!mastery) continue;
    loadedModules += 1;
    if (mastery.reviewed > 0) reviewedModules += 1;
  }
  const moduleRatio =
    source.moduleIds.length > 0
      ? (0.4 * loadedModules + 0.6 * reviewedModules) / source.moduleIds.length
      : 0;

  let completedStages = 0;
  let totalStages = 0;
  for (const labId of source.labIds) {
    const stages = LAB_STAGE_TOTALS.get(labId) ?? 0;
    totalStages += stages;
    completedStages += Math.min(stages, labProgress[labId]?.completedStages.length ?? 0);
  }
  const labRatio = totalStages > 0 ? completedStages / totalStages : 0;

  return Math.round(Math.min(100, Math.max(0, (moduleRatio * 0.55 + labRatio * 0.45) * 100)));
}

interface TrackStat {
  track: EnterpriseRoleTrack;
  progress: number;
  modulesReviewed: number;
  labsCompleted: number;
  labsTotal: number;
}

function computeTrackStat(
  track: EnterpriseRoleTrack,
  moduleMastery: ModuleMasteryMap,
  labProgress: Record<string, LabProgress>,
): TrackStat {
  const modulesReviewed = track.moduleIds.filter((id) => (moduleMastery.get(id)?.reviewed ?? 0) > 0).length;
  const moduleRatio = track.moduleIds.length > 0 ? modulesReviewed / track.moduleIds.length : 0;

  let completedStages = 0;
  let totalStages = 0;
  for (const labId of track.requiredLabIds) {
    const stages = LAB_STAGE_TOTALS.get(labId) ?? 0;
    totalStages += stages;
    completedStages += Math.min(stages, labProgress[labId]?.completedStages.length ?? 0);
  }
  const labRatio = totalStages > 0 ? completedStages / totalStages : 0;

  return {
    track,
    progress: Math.round((moduleRatio * 0.4 + labRatio * 0.6) * 100),
    modulesReviewed,
    labsCompleted: track.requiredLabIds.filter((id) => (labProgress[id]?.completedStages.length ?? 0) > 0).length,
    labsTotal: track.requiredLabIds.length,
  };
}

/* ------------------------------------------------------------------ */
/* Availability model                                                  */
/* ------------------------------------------------------------------ */

interface AvailabilityRow {
  id: string;
  label: string;
  resourceId: string;
  region: string;
  replicas: number;
  multiAz: boolean;
  availability: number;
  source: "canvas" | "reference";
}

function combineZoneAvailability(baseAvailability: number, multiAz: boolean): number {
  const base = Math.min(0.999999, Math.max(0.9, baseAvailability));
  if (!multiAz) return base;
  // Zone failures are partially correlated (shared control plane, deploy
  // pipeline, bad config). Extra zones remove most single-zone unavailability
  // but do not cube it into fantasy nines the way independent coin flips would.
  return Math.min(0.999999, 1 - (1 - base) * 0.35);
}

function serialAvailability(rows: AvailabilityRow[]): number {
  return rows.reduce((product, row) => product * row.availability, 1);
}

function parallelAvailability(rows: AvailabilityRow[]): number {
  return 1 - rows.reduce((product, row) => product * (1 - row.availability), 1);
}

function referenceAvailabilityRows(): AvailabilityRow[] {
  return REFERENCE_IDS.map((id) => {
    const seed = getSeedResource(id);
    const multiAz = seed?.defaults.multiAz ?? true;
    const base = seed?.defaults.availability ?? 0.999;
    return {
      id: `ref-${id}`,
      label: seed?.name ?? id,
      resourceId: id,
      region: seed?.defaults.region ?? "us-east-1",
      replicas: seed?.defaults.replicationFactor ?? 1,
      multiAz,
      availability: combineZoneAvailability(base, multiAz),
      source: "reference",
    };
  });
}

/* ------------------------------------------------------------------ */
/* TCO model                                                           */
/* ------------------------------------------------------------------ */

interface TcoModel {
  id: string;
  label: string;
  provider: string;
  monthlyUsd: number;
  annualUsd: number;
  savingsUsd: number;
  savingsPct: number;
  notes: string;
  accent: string;
}

interface FinOpsRecommendation {
  title: string;
  detail: string;
  impact: string;
}

function buildTcoModels(hourlyUsd: number, egressTb: number): TcoModel[] {
  const compute = Math.max(0.01, hourlyUsd) * HOURS_PER_MONTH;
  const egressGb = Math.max(0, egressTb) * 1024;
  const natHourly = 2 * 0.045 * HOURS_PER_MONTH;
  const natProcessing = egressGb * 0.35 * 0.045;
  const internetEgress = egressGb * 0.09;

  const awsOnDemand = compute + natHourly + natProcessing + internetEgress;
  const awsWellArchitected = compute * 0.62 + 6 * 0.01 * HOURS_PER_MONTH + egressGb * 0.72 * 0.09;
  const cloudflare = compute * 0.48 + 25;
  const gcp = compute * 0.58 + 73 + egressGb * 0.08;
  const azure = compute * 0.64 + 18 + egressGb * 0.087;

  const rows: Array<Omit<TcoModel, "annualUsd" | "savingsUsd" | "savingsPct">> = [
    {
      id: "aws-on-demand",
      label: "AWS On-Demand",
      provider: "AWS",
      monthlyUsd: awsOnDemand,
      notes: "Compute at list price, two NAT gateways, NAT data processing, and public internet egress on the first 10 TB tier.",
      accent: "#C58F4A",
    },
    {
      id: "aws-well-architected",
      label: "AWS Well-Architected",
      provider: "AWS",
      monthlyUsd: awsWellArchitected,
      notes: "One-year Savings Plan on steady compute, VPC endpoints instead of NAT for AWS service traffic, egress trimmed by edge caching.",
      accent: "#D6A863",
    },
    {
      id: "cloudflare-edge",
      label: "Cloudflare Edge + Workers + R2",
      provider: "Cloudflare",
      monthlyUsd: cloudflare,
      notes: "Origin compute offloaded to Workers and tiered cache, R2 zero-egress storage, and no per-GB origin egress on cached responses.",
      accent: "#E7C08A",
    },
    {
      id: "gcp-autopilot",
      label: "GCP GKE Autopilot + CUD",
      provider: "GCP",
      monthlyUsd: gcp,
      notes: "Autopilot per-pod billing with committed use discount, regional cluster fee, and standard network egress.",
      accent: "#93B27C",
    },
    {
      id: "azure-aks",
      label: "Azure AKS + Reserved",
      provider: "Azure",
      monthlyUsd: azure,
      notes: "Reserved VM instances, AKS standard load balancer, and zone-redundant managed disks with egress charged per GB.",
      accent: "#7696AA",
    },
  ];

  return rows.map((row) => {
    const savings = awsOnDemand - row.monthlyUsd;
    return {
      ...row,
      annualUsd: row.monthlyUsd * 12,
      savingsUsd: savings,
      savingsPct: awsOnDemand > 0 ? (savings / awsOnDemand) * 100 : 0,
    };
  });
}

function buildFinOpsRecommendations(
  hourlyUsd: number,
  egressTb: number,
  models: TcoModel[],
): FinOpsRecommendation[] {
  const computeMonthly = Math.max(0.01, hourlyUsd) * HOURS_PER_MONTH;
  const cloudflare = models.find((model) => model.id === "cloudflare-edge");
  const wellArchitected = models.find((model) => model.id === "aws-well-architected");
  const gcp = models.find((model) => model.id === "gcp-autopilot");
  const recommendations: FinOpsRecommendation[] = [
    {
      title: "Move immutable GET traffic to the edge before buying more origin",
      detail:
        egressTb >= 20
          ? `${egressTb} TB/month of egress is the dominant line item. Cached responses at an anycast PoP carry no origin egress and absorb the flash-crowd tail that otherwise sizes your fleet.`
          : "Even at modest egress, every cache hit is an origin request you never provision for. Tag immutable assets, set long TTLs, and add an origin shield tier.",
      impact:
        cloudflare && cloudflare.savingsUsd > 0
          ? `Modeled edge-first run rate: ${formatUsd(cloudflare.monthlyUsd)}/mo (${formatUsd(cloudflare.annualUsd)}/yr).`
          : "Validate the modeled edge-first run rate against your current bill.",
    },
    {
      title: "Cover steady-state compute with a commitment, not list price",
      detail:
        "A one-year Savings Plan or committed-use contract typically removes a third of on-demand compute. Commit only the floor you can forecast; keep burst capacity on-demand and flex.",
      impact:
        wellArchitected && wellArchitected.savingsUsd > 0
          ? `${formatUsd(wellArchitected.savingsUsd)}/mo saved versus AWS On-Demand in this model.`
          : "Commitment coverage is already close to the modeled floor.",
    },
    {
      title: "Delete NAT data processing from the critical path",
      detail:
        "Service-to-service traffic that leaves through a NAT gateway pays both hourly and per-GB processing. VPC endpoints, private link, or an outbound tunnel remove that meter entirely.",
      impact:
        egressTb > 0
          ? `NAT processing is roughly ${formatUsd(egressTb * 1024 * 0.35 * 0.045)}/mo at the current egress level.`
          : "Add egress volume to see the NAT processing line.",
    },
    {
      title:
        computeMonthly > 3_000
          ? "Right-size before committing: the compute floor is the biggest lever"
          : "Keep the platform bill small enough to stay boring",
      detail:
        computeMonthly > 3_000
          ? `Compute is ${formatUsd(computeMonthly)}/mo in this model. Per-node utilization and replica counts should be reviewed before a multi-year commitment locks the shape in.`
          : `Compute is ${formatUsd(computeMonthly)}/mo in this model. A small footprint is easier to re-platform; revisit managed Kubernetes pricing once the floor stabilizes.`,
      impact:
        gcp && gcp.savingsUsd > 0
          ? `GKE Autopilot models at ${formatUsd(gcp.monthlyUsd)}/mo; compare its per-pod billing with your real request profile.`
          : "No material Autopilot delta in this model.",
    },
  ];
  return recommendations;
}

/* ------------------------------------------------------------------ */
/* Radar chart                                                         */
/* ------------------------------------------------------------------ */

const RADAR_CENTER_X = 180;
const RADAR_CENTER_Y = 150;
const RADAR_RADIUS = 92;

function radarPoint(index: number, count: number, radius: number): { x: number; y: number } {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return {
    x: RADAR_CENTER_X + Math.cos(angle) * radius,
    y: RADAR_CENTER_Y + Math.sin(angle) * radius,
  };
}

function radarPolygon(values: number[], radius: number): string {
  return values
    .map((value, index) => {
      const clamped = Math.max(0, Math.min(100, value));
      const point = radarPoint(index, values.length, (clamped / 100) * radius);
      return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    })
    .join(" ");
}

function RadarChart({
  scores,
  targets,
  trackTitle,
}: {
  scores: Record<ReadinessPillarId, number>;
  targets: Record<ReadinessPillarId, number>;
  trackTitle: string;
}) {
  const values = READINESS_PILLARS.map((pillar) => scores[pillar.id]);
  const targetValues = READINESS_PILLARS.map((pillar) => targets[pillar.id]);
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg
      viewBox="0 0 360 300"
      role="img"
      aria-label={`Six-axis readiness radar for the ${trackTitle} track`}
      className="h-auto w-full"
    >
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={radarPolygon(
            READINESS_PILLARS.map(() => ring * 100),
            RADAR_RADIUS,
          )}
          fill="none"
          stroke="rgb(var(--line))"
          strokeWidth={ring === 1 ? 1.2 : 0.6}
          strokeDasharray={ring === 1 ? undefined : "3 5"}
        />
      ))}
      {READINESS_PILLARS.map((pillar, index) => {
        const outer = radarPoint(index, READINESS_PILLARS.length, RADAR_RADIUS);
        return (
          <line
            key={pillar.id}
            x1={RADAR_CENTER_X}
            y1={RADAR_CENTER_Y}
            x2={outer.x}
            y2={outer.y}
            stroke="rgb(var(--line))"
            strokeWidth={0.6}
          />
        );
      })}
      <polygon
        points={radarPolygon(targetValues, RADAR_RADIUS)}
        fill="rgb(var(--accent) / 0.06)"
        stroke="rgb(var(--accent) / 0.5)"
        strokeWidth={1.2}
        strokeDasharray="4 4"
      />
      <polygon
        points={radarPolygon(values, RADAR_RADIUS)}
        fill="rgb(var(--accent) / 0.22)"
        stroke="rgb(var(--accent-bright))"
        strokeWidth={2}
      />
      {READINESS_PILLARS.map((pillar, index) => {
        const point = radarPoint(index, READINESS_PILLARS.length, (scores[pillar.id] / 100) * RADAR_RADIUS);
        return <circle key={pillar.id} cx={point.x} cy={point.y} r={2.6} fill="rgb(var(--accent-bright))" />;
      })}
      {READINESS_PILLARS.map((pillar, index) => {
        const label = radarPoint(index, READINESS_PILLARS.length, RADAR_RADIUS + 26);
        const anchor =
          Math.abs(label.x - RADAR_CENTER_X) < 6 ? "middle" : label.x > RADAR_CENTER_X ? "start" : "end";
        return (
          <g key={pillar.id}>
            <text
              x={label.x}
              y={label.y - 3}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={8}
              fill="rgb(var(--content-secondary))"
            >
              {pillar.shortLabel}
            </text>
            <text
              x={label.x}
              y={label.y + 8}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={8}
              fontWeight={700}
              fill="rgb(var(--accent))"
            >
              {Math.round(scores[pillar.id])}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* ADR markdown                                                        */
/* ------------------------------------------------------------------ */

function renderAdrMarkdown(adr: AdrRecord): string {
  const options = adr.consideredOptions
    .map((option, index) => `${index + 1}. ${option.trim()}`)
    .join("\n");
  return [
    `# ${adr.id}: ${adr.title}`,
    "",
    `- **Status:** ${adr.status}`,
    `- **Date:** ${adr.date}`,
    `- **Target SLA:** ${adr.targetSlaPercent}%`,
    `- **Estimated monthly budget:** ${formatUsd(adr.estimatedMonthlyBudgetUsd)}`,
    "",
    "## Context",
    "",
    adr.context.trim(),
    "",
    "## Considered options",
    "",
    options,
    "",
    "## Decision",
    "",
    adr.decision.trim(),
    "",
    "## Consequences",
    "",
    adr.consequences.trim(),
    "",
    "---",
    "",
    "_Generated by the SysCraft Principal Architect ADR Studio. Metrics are modeled, not a vendor quote._",
    "",
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* Cohort normalization                                                */
/* ------------------------------------------------------------------ */

function memberReadiness(member: TeamMemberReadiness): number {
  const total = READINESS_PILLARS.reduce((sum, pillar) => sum + member.pillarScores[pillar.id], 0);
  return Math.round(total / READINESS_PILLARS.length);
}

function clampScore(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeMember(raw: unknown, index: number): TeamMemberReadiness | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!name) return null;
  const rawScores =
    record.pillarScores && typeof record.pillarScores === "object"
      ? (record.pillarScores as Record<string, unknown>)
      : record;
  const pillarScores = {} as Record<ReadinessPillarId, number>;
  for (const pillar of READINESS_PILLARS) {
    pillarScores[pillar.id] = clampScore(rawScores[pillar.id]);
  }
  const trackId =
    typeof record.trackId === "string" && ENTERPRISE_ROLE_TRACKS.some((track) => track.id === record.trackId)
      ? record.trackId
      : ENTERPRISE_ROLE_TRACKS[0].id;
  const track = ENTERPRISE_ROLE_TRACKS.find((candidate) => candidate.id === trackId) ?? ENTERPRISE_ROLE_TRACKS[0];
  const certifications = Array.isArray(record.certifications)
    ? record.certifications.filter((item): item is string => typeof item === "string")
    : [];
  return {
    id: typeof record.id === "string" && record.id.trim().length > 0 ? record.id : `emp-import-${index + 1}`,
    name,
    title: typeof record.title === "string" && record.title.trim().length > 0 ? record.title : "Engineer",
    roleLevel:
      typeof record.roleLevel === "string" && record.roleLevel.trim().length > 0
        ? record.roleLevel
        : track.roleLevel,
    trackId,
    pillarScores,
    labsCompleted: Math.max(0, Math.round(Number(record.labsCompleted) || 0)),
    certifications,
    lastActive: typeof record.lastActive === "string" ? record.lastActive : "",
  };
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function EnterpriseHubContent() {
  const [tab, setTab] = useState<TabId>("tracks");
  const [selectedTrackId, setSelectedTrackId] = useState<string>(ENTERPRISE_ROLE_TRACKS[0].id);
  const [holderName, setHolderName] = useState<string>("Principal Architect");

  const canvasNodes = useCanvasStore((state) => state.nodes);
  const sceneName = useCanvasStore((state) => state.sceneName);
  const cards = useLearningStore((state) => state.cards);
  const cardModule = useLearningStore((state) => state.cardModule);
  const labProgress = useLearningStore((state) => state.labProgress);
  const liveHourly = useSimStore((state) => state.totalCostPerHourUsd);

  useEffect(() => {
    if (!useCanvasStore.getState().hydrated) {
      void Promise.resolve(useCanvasStore.persist.rehydrate()).catch(() => undefined);
    }
    void useLearningStore.getState().hydrateFromDb();
  }, []);

  /* ---------------- learning evidence ---------------- */

  const moduleMastery = useMemo<ModuleMasteryMap>(() => {
    const map: ModuleMasteryMap = new Map();
    for (const [cardId, moduleId] of Object.entries(cardModule)) {
      const card = cards[cardId];
      if (!card) continue;
      const current = map.get(moduleId) ?? { total: 0, reviewed: 0 };
      current.total += 1;
      if (card.reps > 0 || card.state !== "new") current.reviewed += 1;
      map.set(moduleId, current);
    }
    return map;
  }, [cardModule, cards]);

  const pillarScores = useMemo<Record<ReadinessPillarId, number>>(() => {
    const scores = {} as Record<ReadinessPillarId, number>;
    for (const pillar of READINESS_PILLARS) {
      scores[pillar.id] = computePillarScore(pillar.id, moduleMastery, labProgress);
    }
    return scores;
  }, [moduleMastery, labProgress]);

  const trackStats = useMemo<TrackStat[]>(
    () => ENTERPRISE_ROLE_TRACKS.map((track) => computeTrackStat(track, moduleMastery, labProgress)),
    [moduleMastery, labProgress],
  );

  const activeTrackStat = trackStats.find((stat) => stat.track.id === selectedTrackId) ?? trackStats[0];
  const activeTrack = activeTrackStat.track;
  const activeBlueprint = BLUEPRINT_MAP[activeTrack.blueprintId];

  const trackTargets = useMemo<Record<ReadinessPillarId, number>>(() => {
    const targets = {} as Record<ReadinessPillarId, number>;
    for (const pillar of READINESS_PILLARS) {
      targets[pillar.id] = activeTrack.focusPillars.includes(pillar.label) ? 85 : 65;
    }
    return targets;
  }, [activeTrack]);

  const buildCertificateJson = () =>
    JSON.stringify(
      {
        format: "syscraft.enterprise.readiness/1",
        issuedAt: new Date().toISOString(),
        holder: holderName.trim() || "Principal Architect",
        issuer: "SysCraft Enterprise L&D",
        track: {
          id: activeTrack.id,
          roleLevel: activeTrack.roleLevel,
          title: activeTrack.title,
          estimatedHours: activeTrack.estimatedHours,
          blueprintId: activeTrack.blueprintId,
        },
        overallReadiness: activeTrackStat.progress,
        pillars: READINESS_PILLARS.map((pillar) => ({
          id: pillar.id,
          label: pillar.label,
          score: pillarScores[pillar.id],
          target: trackTargets[pillar.id],
        })),
        modules: activeTrack.moduleIds.map((moduleId) => ({
          id: moduleId,
          title: MODULE_TITLE_BY_ID.get(moduleId) ?? moduleId,
          reviewed: (moduleMastery.get(moduleId)?.reviewed ?? 0) > 0,
        })),
        labs: activeTrack.requiredLabIds.map((labId) => {
          const total = LAB_STAGE_TOTALS.get(labId) ?? 0;
          const completed = Math.min(total, labProgress[labId]?.completedStages.length ?? 0);
          return {
            id: labId,
            title: LAB_TITLE_BY_ID.get(labId) ?? labId,
            stagesCompleted: completed,
            stagesTotal: total,
            bestScore: labProgress[labId]?.bestScore ?? 0,
          };
        }),
        capstonePrompt: activeTrack.capstonePrompt,
      },
      null,
      2,
    );

  const buildCertificateMarkdown = () => {
    const issuedAt = new Date().toISOString().slice(0, 10);
    return certificateMarkdown.replace("**Issued by:**", `**Issued:** ${issuedAt}\n**Issued by:**`);
  };

  const certificateMarkdown = useMemo(() => {
    const moduleLines = activeTrack.moduleIds
      .map((moduleId) => {
        const reviewed = (moduleMastery.get(moduleId)?.reviewed ?? 0) > 0;
        return `- ${reviewed ? "[x]" : "[ ]"} ${MODULE_TITLE_BY_ID.get(moduleId) ?? moduleId}`;
      })
      .join("\n");
    const labLines = activeTrack.requiredLabIds
      .map((labId) => {
        const total = LAB_STAGE_TOTALS.get(labId) ?? 0;
        const completed = Math.min(total, labProgress[labId]?.completedStages.length ?? 0);
        return `- ${LAB_TITLE_BY_ID.get(labId) ?? labId}: ${completed}/${total} stages · best score ${
          labProgress[labId]?.bestScore ?? 0
        }%`;
      })
      .join("\n");
    const pillarLines = READINESS_PILLARS.map(
      (pillar) => `- **${pillar.label}:** ${pillarScores[pillar.id]}% (target ${trackTargets[pillar.id]}%)`,
    ).join("\n");
    return [
      "# SysCraft Enterprise Readiness Certificate",
      "",
      `**Holder:** ${holderName.trim() || "Principal Architect"}`,
      `**Track:** ${activeTrack.title}`,
      `**Role level:** ${activeTrack.roleLevel}`,
      `**Overall evidence score:** ${activeTrackStat.progress}%`,
      `**Blueprint:** ${activeBlueprint?.name ?? activeTrack.blueprintId}`,
      `**Issued by:** SysCraft Enterprise L&D`,
      "",
      "## Six-axis readiness",
      "",
      pillarLines,
      "",
      "## Modules evidenced",
      "",
      moduleLines,
      "",
      "## Labs completed",
      "",
      labLines,
      "",
      "## Capstone brief",
      "",
      activeTrack.capstonePrompt,
      "",
      "---",
      "",
      "This certificate is generated locally from this browser's SysCraft learning store. It records evidence from reviewed flashcards and completed guided-lab stages; it is not a proctored credential.",
      "",
    ].join("\n");
  }, [
    holderName,
    activeTrack,
    activeTrackStat.progress,
    activeBlueprint,
    pillarScores,
    trackTargets,
    moduleMastery,
    labProgress,
  ]);

  /* ---------------- availability ---------------- */

  const availabilityRows = useMemo<AvailabilityRow[]>(() => {
    if (canvasNodes.length === 0) return referenceAvailabilityRows();
    return canvasNodes.map((node) => {
      const resourceId = String(node.data.resourceId ?? "rest_service");
      const seed = getSeedResource(resourceId);
      const overrides = node.data.overrides ?? {};
      const multiAz = overrides.multiAz ?? seed?.defaults.multiAz ?? false;
      const base = seed?.defaults.availability ?? 0.999;
      return {
        id: node.id,
        label: String(node.data.label ?? seed?.name ?? resourceId),
        resourceId,
        region: overrides.region ?? seed?.defaults.region ?? "us-east-1",
        replicas: Math.max(1, overrides.replicationFactor ?? seed?.defaults.replicationFactor ?? 1),
        multiAz,
        availability: combineZoneAvailability(base, multiAz),
        source: "canvas",
      };
    });
  }, [canvasNodes]);

  const [redundancyMode, setRedundancyMode] = useState<"serial" | "parallel">("serial");
  const [multiRegion, setMultiRegion] = useState(false);
  const [targetSla, setTargetSla] = useState<number>(99.99);

  const sla = useMemo(() => {
    const baseComposite =
      redundancyMode === "serial" ? serialAvailability(availabilityRows) : parallelAvailability(availabilityRows);
    const composite = Math.min(0.99999999, multiRegion ? 1 - Math.pow(1 - baseComposite, 2) : baseComposite);
    const targetFraction = Math.min(1, Math.max(0, targetSla / 100));
    const downtimeMinutes = (1 - composite) * MINUTES_PER_MONTH;
    const allowedMinutes = (1 - targetFraction) * MINUTES_PER_MONTH;
    const burnRate = allowedMinutes > 0 ? downtimeMinutes / allowedMinutes : 0;
    const weakest = availabilityRows.reduce(
      (worst, row) => (row.availability < worst.availability ? row : worst),
      availabilityRows[0],
    );
    return {
      baseComposite,
      composite,
      downtimeMinutes,
      downtimeSeconds: downtimeMinutes * 60,
      allowedMinutes,
      allowedSeconds: allowedMinutes * 60,
      burnRate,
      weakest,
      healthy: burnRate <= 1,
    };
  }, [availabilityRows, redundancyMode, multiRegion, targetSla]);

  /* ---------------- cost ---------------- */

  const hourlyBreakdown = useMemo(() => {
    if (canvasNodes.length === 0) {
      return REFERENCE_IDS.map((id) => {
        const seed = getSeedResource(id);
        const replicas = seed?.defaults.replicationFactor ?? 1;
        const unitCost = seed?.defaults.costPerHourUsd ?? 0.12;
        return {
          id: `ref-${id}`,
          label: seed?.name ?? id,
          replicas,
          unitCost,
          hourly: unitCost * replicas,
        };
      });
    }
    return canvasNodes.map((node) => {
      const resourceId = String(node.data.resourceId ?? "rest_service");
      const seed = getSeedResource(resourceId);
      const overrides = node.data.overrides ?? {};
      const replicas = Math.max(1, overrides.replicationFactor ?? seed?.defaults.replicationFactor ?? 1);
      const unitCost = overrides.costPerHourUsd ?? seed?.defaults.costPerHourUsd ?? 0.12;
      return {
        id: node.id,
        label: String(node.data.label ?? seed?.name ?? resourceId),
        replicas,
        unitCost,
        hourly: unitCost * replicas,
      };
    });
  }, [canvasNodes]);

  const canvasHourly = hourlyBreakdown.reduce((sum, item) => sum + item.hourly, 0);
  const effectiveHourly = liveHourly > 0 ? liveHourly : canvasHourly;
  const costSource =
    liveHourly > 0 ? "live simulation" : canvasNodes.length > 0 ? "canvas replicas × defaults" : "reference topology";

  const [egressTb, setEgressTb] = useState<number>(12);
  const tcoModels = useMemo(() => buildTcoModels(effectiveHourly, egressTb), [effectiveHourly, egressTb]);
  const finOpsRecommendations = useMemo(
    () => buildFinOpsRecommendations(effectiveHourly, egressTb, tcoModels),
    [effectiveHourly, egressTb, tcoModels],
  );
  const awsBaseline = tcoModels[0];
  const bestModel = tcoModels.reduce((best, model) => (model.monthlyUsd < best.monthlyUsd ? model : best), tcoModels[0]);
  const activeMonthlyBudget =
    tcoModels.find((model) => model.id === "aws-on-demand")?.monthlyUsd ?? effectiveHourly * HOURS_PER_MONTH;

  /* ---------------- ADR studio ---------------- */

  const [adrs, setAdrs] = useState<AdrRecord[]>(() =>
    STARTER_ADRS.map((adr) => ({ ...adr, consideredOptions: [...adr.consideredOptions] })),
  );
  const [selectedAdrId, setSelectedAdrId] = useState<string>(STARTER_ADRS[0].id);
  const [adrNotice, setAdrNotice] = useState<string>("");

  const selectedAdr = adrs.find((adr) => adr.id === selectedAdrId) ?? adrs[0];

  const updateSelectedAdr = (patch: Partial<AdrRecord>) => {
    setAdrs((current) =>
      current.map((adr) => (adr.id === selectedAdr.id ? { ...adr, ...patch } : adr)),
    );
  };

  const createAdr = () => {
    const nextNumber =
      adrs.reduce((max, adr) => {
        const parsed = Number.parseInt(adr.id.replace(/\D/g, ""), 10);
        return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
      }, 0) + 1;
    const id = `ADR-${String(nextNumber).padStart(3, "0")}`;
    const today = new Date().toISOString().slice(0, 10);
    const next: AdrRecord = {
      id,
      title: "Choose the next architecture bet",
      status: "Proposed",
      date: today,
      context:
        "Describe the forces at play: traffic shape, latency target, team ownership, compliance constraints, and the incident or cost signal that made this decision necessary.",
      consideredOptions: [
        "Option A — extend the current platform along its existing seams",
        "Option B — introduce a dedicated managed service for this capability",
        "Option C — defer the decision and measure until the trigger threshold is crossed",
      ],
      decision:
        "State the option that was chosen and the boundary it applies to. Name the owner and the review date so the decision does not drift.",
      consequences:
        "Record what becomes easier, what becomes harder, and the rollback path if the decision proves wrong. Include the unit-cost and availability impact.",
      targetSlaPercent: Number((sla.composite * 100).toFixed(4)),
      estimatedMonthlyBudgetUsd: Math.round(activeMonthlyBudget),
    };
    setAdrs((current) => [...current, next]);
    setSelectedAdrId(id);
    setAdrNotice(`${id} created and linked to the current canvas metrics.`);
  };

  const autoFillAdrFromCanvas = () => {
    const slaPercent = Number(Math.min(99.9999, Math.max(0, sla.composite * 100)).toFixed(4));
    const budget = Math.round(activeMonthlyBudget);
    const snapshot = `Canvas snapshot (${sceneName}, ${canvasNodes.length || REFERENCE_IDS.length} blocks, ${
      availabilityRows.length
    } availability rows): composite ${
      redundancyMode === "serial" ? "serial" : "active-active"
    } availability ${slaPercent}%${
      multiRegion ? " with multi-region failover" : ""
    }, modeled monthly TCO ${formatUsd(budget)}, weakest tier ${sla.weakest.label}.`;
    updateSelectedAdr({
      targetSlaPercent: slaPercent,
      estimatedMonthlyBudgetUsd: budget,
      context: selectedAdr.context.includes("Canvas snapshot")
        ? `${selectedAdr.context.split("Canvas snapshot")[0].trim()}\n\n${snapshot}`
        : `${selectedAdr.context.trim()}\n\n${snapshot}`,
    });
    setAdrNotice(`Auto-filled ${slaPercent}% SLA and ${formatUsd(budget)}/mo from the active topology.`);
  };

  /* ---------------- cohort ---------------- */

  const [cohort, setCohort] = useState<TeamMemberReadiness[]>(() =>
    SAMPLE_TEAM_COHORT.map((member) => ({
      ...member,
      pillarScores: { ...member.pillarScores },
      certifications: [...member.certifications],
    })),
  );
  const [draftMember, setDraftMember] = useState<{ name: string; title: string; trackId: string }>({
    name: "",
    title: "",
    trackId: ENTERPRISE_ROLE_TRACKS[0].id,
  });
  const [cohortNotice, setCohortNotice] = useState<string>("");
  const [cohortError, setCohortError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const cohortAverages = useMemo<Record<ReadinessPillarId, number>>(() => {
    const averages = {} as Record<ReadinessPillarId, number>;
    for (const pillar of READINESS_PILLARS) {
      const total = cohort.reduce((sum, member) => sum + member.pillarScores[pillar.id], 0);
      averages[pillar.id] = cohort.length > 0 ? Math.round(total / cohort.length) : 0;
    }
    return averages;
  }, [cohort]);

  const weakestPillar = READINESS_PILLARS.reduce(
    (worst, pillar) => (cohortAverages[pillar.id] < cohortAverages[worst.id] ? pillar : worst),
    READINESS_PILLARS[0],
  );
  const cohortReadiness =
    cohort.length > 0
      ? Math.round(cohort.reduce((sum, member) => sum + memberReadiness(member), 0) / cohort.length)
      : 0;

  const updateMemberScore = (memberId: string, pillarId: ReadinessPillarId, value: number) => {
    setCohort((current) =>
      current.map((member) =>
        member.id === memberId
          ? {
              ...member,
              pillarScores: { ...member.pillarScores, [pillarId]: Math.max(0, Math.min(100, Math.round(value))) },
            }
          : member,
      ),
    );
  };

  const addCohortMember = () => {
    const name = draftMember.name.trim();
    if (!name) {
      setCohortError("Add a name before adding a team member.");
      return;
    }
    setCohortError("");
    const track =
      ENTERPRISE_ROLE_TRACKS.find((candidate) => candidate.id === draftMember.trackId) ??
      ENTERPRISE_ROLE_TRACKS[0];
    const member: TeamMemberReadiness = {
      id: `emp-${Date.now().toString(36)}`,
      name,
      title: draftMember.title.trim() || "Engineer",
      roleLevel: track.roleLevel,
      trackId: track.id,
      pillarScores: { scalability: 0, aws: 0, cloudflare: 0, kubernetes: 0, security: 0, finops: 0 },
      labsCompleted: 0,
      certifications: [],
      lastActive: new Date().toISOString().slice(0, 10),
    };
    setCohort((current) => [...current, member]);
    setDraftMember({ name: "", title: "", trackId: track.id });
    setCohortNotice(`${name} added to the local cohort. Edit the pillar cells to record current mastery.`);
  };

  const removeCohortMember = (memberId: string) => {
    setCohort((current) => current.filter((member) => member.id !== memberId));
    setCohortNotice("Team member removed from the local cohort.");
  };

  const importCohort = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result ?? ""));
        const rows = Array.isArray(parsed)
          ? parsed
          : parsed && typeof parsed === "object" && Array.isArray((parsed as { members?: unknown }).members)
            ? ((parsed as { members: unknown[] }).members)
            : null;
        if (!rows) throw new Error("missing members");
        const normalized = rows
          .map((row, index) => normalizeMember(row, index))
          .filter((member): member is TeamMemberReadiness => member !== null);
        if (normalized.length === 0) throw new Error("no valid members");
        setCohort(normalized);
        setCohortError("");
        setCohortNotice(`Imported ${normalized.length} readiness snapshots into the local cohort.`);
      } catch {
        setCohortError("That file is not a valid cohort snapshot. Export one first, or use a JSON array with name and pillarScores.");
      }
    };
    reader.readAsText(file);
  };

  const exportCohort = () => {
    downloadTextFile(
      "syscraft-cohort-readiness.json",
      JSON.stringify(
        {
          format: "syscraft.enterprise.cohort/1",
          exportedAt: new Date().toISOString(),
          pillars: READINESS_PILLARS,
          members: cohort,
        },
        null,
        2,
      ),
      "application/json",
    );
  };

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[440px] overflow-hidden">
        <div className="line-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_65%_70%_at_50%_0%,black,transparent)]" />
      </div>

      <section className="section-container relative pb-8 pt-14 md:pt-20">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <span className="eyebrow">
              <span className="h-1.5 w-1.5 rounded-full bg-brass" />
              Enterprise L&amp;D &amp; principal architect governance
            </span>
            <h1 className="mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tighter text-content md:text-5xl">
              Prove readiness, price the architecture, record the decision.
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-content-secondary">
              A governance suite for engineering leaders: role-based competency tracks, a live composite SLA and error-budget
              model, a multi-cloud TCO comparator, and an ADR studio that inherits metrics from the active canvas. Team data
              stays in this browser.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-line bg-app/60 px-3 py-1 text-[12px] text-content-secondary">
                {ENTERPRISE_ROLE_TRACKS.length} role tracks
              </span>
              <span className="rounded-full border border-line bg-app/60 px-3 py-1 text-[12px] text-content-secondary">
                {READINESS_PILLARS.length} readiness axes
              </span>
              <span className="rounded-full border border-line bg-app/60 px-3 py-1 text-[12px] text-content-secondary">
                Local-only cohort of {SAMPLE_TEAM_COHORT.length}
              </span>
              <span className="rounded-full border border-status bg-app/60 px-3 py-1 text-[12px] text-content-secondary">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-success align-middle" />
                No upload, no telemetry
              </span>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="rounded-2xl border border-line bg-app/50 p-5 shadow-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-tertiary">
                Current evidence snapshot
              </p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-4xl font-semibold tabular-nums tracking-tight text-content">
                    {activeTrackStat.progress}%
                  </p>
                  <p className="mt-1 text-[12px] text-content-secondary">{activeTrack.roleLevel} readiness</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brass/40 bg-brass/10 text-brass">
                  <Award size={20} />
                </span>
              </div>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-app-raised">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brass-deep via-brass to-brass-bright transition-all"
                  style={{ width: `${Math.max(2, activeTrackStat.progress)}%` }}
                />
              </div>
              <p className="mt-3 text-[11.5px] leading-relaxed text-content-tertiary">
                Derived from reviewed flashcards and completed guided-lab stages in this browser.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="section-container relative">
        <div
          role="tablist"
          aria-label="Enterprise governance sections"
          className="flex flex-col gap-1 rounded-2xl border border-line bg-app/50 p-1.5 shadow-card sm:flex-row"
        >
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`enterprise-tab-${item.id}`}
                aria-selected={active}
                aria-controls={`enterprise-panel-${item.id}`}
                onClick={() => setTab(item.id)}
                className={`group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors ${
                  active
                    ? "bg-brass/12 text-content ring-1 ring-inset ring-brass/35"
                    : "text-content-secondary hover:bg-app-raised/60 hover:text-content"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                    active ? "border-brass/40 bg-brass/15 text-brass" : "border-line bg-app-raised/50 text-content-tertiary"
                  }`}
                >
                  <Icon size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">{item.label}</span>
                  <span className="block truncate text-[11px] text-content-tertiary">{item.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        key={tab}
        role="tabpanel"
        id={`enterprise-panel-${tab}`}
        aria-labelledby={`enterprise-tab-${tab}`}
        className="section-container animate-fade-in py-8 md:py-10"
      >
        {/* ============================================================ */}
        {/* TRACKS & RADAR                                               */}
        {/* ============================================================ */}
        {tab === "tracks" ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">
                  Role-based competency tracks
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-content md:text-3xl">
                  Four ladders, one readiness radar
                </h2>
                <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-content-secondary">
                  Each ladder names the modules, labs, blueprint, and capstone that define the role. Pick a ladder to see the
                  evidence you already have and the gap to the target profile.
                </p>
              </div>
              <div className="rounded-xl border border-line bg-app/50 px-4 py-3 text-right">
                <p className="text-[10.5px] uppercase tracking-[0.16em] text-content-tertiary">Cohort readiness</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-content">{cohortReadiness}%</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {trackStats.map((stat) => {
                const selected = stat.track.id === activeTrack.id;
                const tone = scoreTone(stat.progress);
                return (
                  <button
                    key={stat.track.id}
                    type="button"
                    onClick={() => setSelectedTrackId(stat.track.id)}
                    aria-pressed={selected}
                    className={`group rounded-2xl border p-4 text-left transition-all ${
                      selected
                        ? "border-brass/45 bg-brass/[0.06] shadow-card"
                        : "border-line bg-app/40 hover:border-line-strong hover:bg-app/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-brass">
                          {stat.track.roleLevel}
                        </p>
                        <p className="mt-1.5 text-[15px] font-semibold text-content">{stat.track.title}</p>
                      </div>
                      <span className={`shrink-0 text-[19px] font-semibold tabular-nums ${tone.text}`}>
                        {stat.progress}%
                      </span>
                    </div>
                    <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-app-raised">
                      <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.max(2, stat.progress)}%` }} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-content-tertiary">
                      <span>{stat.modulesReviewed}/{stat.track.moduleIds.length} modules evidenced</span>
                      <span>{stat.labsCompleted}/{stat.labsTotal} labs started</span>
                      <span>{stat.track.estimatedHours}h guided</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-line bg-app/50 p-5 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-content-tertiary">Selected track</p>
                      <h3 className="mt-1 text-xl font-semibold tracking-tight text-content">{activeTrack.title}</h3>
                      <p className="text-[12px] text-brass">{activeTrack.roleLevel}</p>
                    </div>
                    <span className="rounded-full border border-line bg-app-raised/60 px-3 py-1 text-[11px] tabular-nums text-content-secondary">
                      {activeTrack.estimatedHours} guided hours
                    </span>
                  </div>
                  <p className="mt-4 text-[13px] leading-relaxed text-content-secondary">{activeTrack.summary}</p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {activeTrack.focusPillars.map((pillar) => (
                      <span
                        key={pillar}
                        className="rounded-full border border-brass/30 bg-brass/[0.08] px-2.5 py-0.5 text-[11px] text-brass"
                      >
                        {pillar}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
                        <BookOpen size={12} /> Modules in scope
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {activeTrack.moduleIds.map((moduleId) => {
                          const reviewed = (moduleMastery.get(moduleId)?.reviewed ?? 0) > 0;
                          return (
                            <li key={moduleId} className="flex items-start gap-2 text-[12px]">
                              <span className={`mt-0.5 ${reviewed ? "text-success" : "text-content-tertiary"}`}>
                                {reviewed ? <CheckCircle2 size={13} /> : <span className="block h-3 w-3 rounded-full border border-line-strong" />}
                              </span>
                              <span className={reviewed ? "text-content-secondary" : "text-content-tertiary"}>
                                {MODULE_TITLE_BY_ID.get(moduleId) ?? moduleId}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
                        <FlaskConical size={12} /> Required labs
                      </p>
                      <ul className="mt-2 space-y-2">
                        {activeTrack.requiredLabIds.map((labId) => {
                          const total = LAB_STAGE_TOTALS.get(labId) ?? 0;
                          const completed = Math.min(total, labProgress[labId]?.completedStages.length ?? 0);
                          const ratio = total > 0 ? completed / total : 0;
                          return (
                            <li key={labId}>
                              <div className="flex items-center justify-between gap-2 text-[12px]">
                                <span className="truncate text-content-secondary">{LAB_TITLE_BY_ID.get(labId) ?? labId}</span>
                                <span className="shrink-0 tabular-nums text-content-tertiary">
                                  {completed}/{total}
                                </span>
                              </div>
                              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-app-raised">
                                <div
                                  className="h-full rounded-full bg-brass"
                                  style={{ width: `${Math.max(ratio > 0 ? 4 : 0, ratio * 100)}%` }}
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-line bg-app-raised/40 p-4">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">
                      <Sparkles size={12} /> Capstone
                    </p>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-content-secondary">{activeTrack.capstonePrompt}</p>
                    <p className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-content-tertiary">
                      <Layers size={12} />
                      Blueprint: <span className="text-content-secondary">{activeBlueprint?.name ?? activeTrack.blueprintId}</span>
                      <ChevronRight size={12} />
                      <span>{activeBlueprint?.difficulty ?? "advanced"}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-line bg-app/50 p-5 shadow-card">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
                      Six-axis readiness
                    </p>
                    <span className="rounded-full border border-line bg-app-raised/60 px-2.5 py-0.5 text-[10.5px] text-content-tertiary">
                      solid = you · dashed = target
                    </span>
                  </div>
                  <div className="mt-2">
                    <RadarChart scores={pillarScores} targets={trackTargets} trackTitle={activeTrack.title} />
                  </div>
                  <ul className="mt-1 space-y-1.5">
                    {READINESS_PILLARS.map((pillar) => {
                      const score = pillarScores[pillar.id];
                      const tone = scoreTone(score);
                      return (
                        <li key={pillar.id} className="flex items-center gap-2.5">
                          <span className="w-[132px] shrink-0 truncate text-[11px] text-content-secondary">
                            {pillar.label}
                          </span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-app-raised">
                            <span
                              className={`block h-full rounded-full ${tone.bar}`}
                              style={{ width: `${Math.max(score > 0 ? 3 : 0, score)}%` }}
                            />
                          </span>
                          <span className={`w-9 shrink-0 text-right text-[11px] font-semibold tabular-nums ${tone.text}`}>
                            {score}%
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="mt-4 rounded-2xl border border-line bg-app/50 p-5 shadow-card">
                  <p className="flex items-center gap-2 text-[12px] font-semibold text-content">
                    <Award size={15} className="text-brass" /> Verifiable readiness certificate
                  </p>
                  <p className="mt-2 text-[12px] leading-relaxed text-content-secondary">
                    Export the evidence behind this track — module coverage, lab stage completion, pillar scores, and the
                    capstone brief. The file is generated locally and can be attached to an internal promotion packet.
                  </p>
                  <label className="mt-3 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">
                    Certificate holder
                    <input
                      type="text"
                      value={holderName}
                      onChange={(event) => setHolderName(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-line bg-app-raised/50 px-3 py-2 text-[12.5px] font-normal normal-case tracking-normal text-content outline-none transition-colors focus:border-brass/50"
                      placeholder="Name on the certificate"
                    />
                  </label>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() =>
                        downloadTextFile(
                          `syscraft-readiness-${activeTrack.id}.json`,
                          buildCertificateJson(),
                          "application/json",
                        )
                      }
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-brass/40 bg-brass/10 px-3 py-2 text-[12px] font-medium text-brass transition-colors hover:bg-brass/20"
                    >
                      <FileJson size={14} /> JSON
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadTextFile(
                          `syscraft-readiness-${activeTrack.id}.md`,
                          buildCertificateMarkdown(),
                          "text/markdown",
                        )
                      }
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-line bg-app-raised/60 px-3 py-2 text-[12px] font-medium text-content-secondary transition-colors hover:border-brass/40 hover:text-content"
                    >
                      <Download size={14} /> Markdown
                    </button>
                  </div>
                  <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-content-tertiary">
                    <Lock size={11} /> Evidence score {activeTrackStat.progress}% · generated from local IndexedDB state
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

        {/* ============================================================ */}
        {/* SLA & ERROR BUDGET                                           */}
        {/* ============================================================ */}
        {tab === "sla" ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">
                  Principal architect availability desk
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-content md:text-3xl">
                  Composite SLA &amp; error-budget calculator
                </h2>
                <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-content-secondary">
                  Every block carries a steady-state availability. Chain them in series, run them redundantly, then compare the
                  result with the promise you made to the business.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-app/60 px-3 py-1 text-[11.5px] text-content-secondary">
                  <Activity size={12} className={canvasNodes.length > 0 ? "text-success" : "text-warning"} />
                  {canvasNodes.length > 0
                    ? `${canvasNodes.length} live canvas blocks`
                    : "reference topology (canvas empty)"}
                </span>
                <span className="rounded-full border border-line bg-app/60 px-3 py-1 text-[11.5px] tabular-nums text-content-secondary">
                  {sceneName}
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-line bg-app/50 p-5 shadow-card">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
                    Redundancy model
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-line bg-app-raised/40 p-1">
                    {(
                      [
                        { id: "serial" as const, label: "Serial chain", hint: "request traverses every tier" },
                        { id: "parallel" as const, label: "Active-active", hint: "any replica can serve" },
                      ]
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setRedundancyMode(mode.id)}
                        aria-pressed={redundancyMode === mode.id}
                        className={`rounded-lg px-2.5 py-2 text-left transition-colors ${
                          redundancyMode === mode.id
                            ? "bg-brass/15 text-content ring-1 ring-inset ring-brass/35"
                            : "text-content-secondary hover:bg-app-raised/60"
                        }`}
                      >
                        <span className="block text-[12.5px] font-medium">{mode.label}</span>
                        <span className="block text-[10.5px] text-content-tertiary">{mode.hint}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setMultiRegion((current) => !current)}
                    aria-pressed={multiRegion}
                    className={`mt-3 flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                      multiRegion
                        ? "border-brass/40 bg-brass/[0.08]"
                        : "border-line bg-app-raised/40 hover:border-line-strong"
                    }`}
                  >
                    <span>
                      <span className="block text-[12.5px] font-medium text-content">Multi-region failover</span>
                      <span className="block text-[10.5px] text-content-tertiary">
                        Two independent regions, DNS health-check cutover
                      </span>
                    </span>
                    <span
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                        multiRegion ? "bg-brass" : "bg-line-strong"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-ink transition-all ${
                          multiRegion ? "left-[18px]" : "left-0.5"
                        }`}
                      />
                    </span>
                  </button>

                  <label className="mt-4 block">
                    <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">
                      <span>Business SLA target</span>
                      <span className="tabular-nums text-brass">{targetSla}%</span>
                    </span>
                    <select
                      value={targetSla}
                      onChange={(event) => setTargetSla(Number(event.target.value))}
                      className="mt-1.5 w-full rounded-lg border border-line bg-app-raised/50 px-3 py-2 text-[12.5px] text-content outline-none transition-colors focus:border-brass/50"
                    >
                      {SLA_TARGETS.map((value) => (
                        <option key={value} value={value}>
                          {value}% monthly
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="mt-4 rounded-xl border border-line bg-ink/40 p-3.5 font-mono text-[11px] leading-relaxed text-content-secondary">
                    <p className="text-content-tertiary">
                      {redundancyMode === "serial" ? "A_serial = ∏ Aᵢ" : "A_parallel = 1 − ∏(1 − Aᵢ)"}
                    </p>
                    <p className="mt-1 break-all text-[10.5px] text-content-tertiary">
                      {availabilityRows
                        .map((row) => row.availability.toFixed(5))
                        .join(" × ")}
                    </p>
                    <p className="mt-2 text-brass">
                      = {formatPct(sla.baseComposite, 4)}
                      {multiRegion ? "  →  A = 1 − (1 − A)²" : ""}
                    </p>
                    {multiRegion ? <p className="text-brass">= {formatPct(sla.composite, 5)}</p> : null}
                  </div>
                </div>
              </div>

              <div className="space-y-4 lg:col-span-7">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-line bg-app/50 p-4 shadow-card">
                    <p className="text-[10.5px] uppercase tracking-[0.14em] text-content-tertiary">Composite availability</p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-content">
                      {formatPct(sla.composite, 4)}
                    </p>
                    <p className="mt-1 text-[11px] text-content-tertiary">
                      {sla.healthy ? "inside" : "over"} the target · {formatPct(1 - sla.composite, 4)} unavailable
                    </p>
                  </div>
                  <div className="rounded-2xl border border-line bg-app/50 p-4 shadow-card">
                    <p className="text-[10.5px] uppercase tracking-[0.14em] text-content-tertiary">
                      Allowed downtime / mo
                    </p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-content">
                      {formatDowntime(sla.allowedMinutes)}
                    </p>
                    <p className="mt-1 text-[11px] text-content-tertiary">
                      at {targetSla}% · {Math.round(sla.allowedSeconds).toLocaleString()} seconds
                    </p>
                  </div>
                  <div
                    className={`rounded-2xl border p-4 shadow-card ${
                      sla.healthy ? "border-line bg-app/50" : "border-danger/40 bg-danger/[0.06]"
                    }`}
                  >
                    <p className="text-[10.5px] uppercase tracking-[0.14em] text-content-tertiary">Error-budget burn</p>
                    <p
                      className={`mt-2 text-2xl font-semibold tabular-nums ${
                        sla.burnRate <= 1 ? "text-success" : sla.burnRate <= 2 ? "text-warning" : "text-danger"
                      }`}
                    >
                      {sla.burnRate < 10 ? sla.burnRate.toFixed(2) : sla.burnRate.toFixed(1)}×
                    </p>
                    <p className="mt-1 text-[11px] text-content-tertiary">
                      actual {formatDowntime(sla.downtimeMinutes)} vs allowed {formatDowntime(sla.allowedMinutes)}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-app/50 shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
                    <div>
                      <p className="text-[12.5px] font-semibold text-content">Availability per tier</p>
                      <p className="text-[10.5px] text-content-tertiary">
                        {redundancyMode === "serial"
                          ? "A single weak tier multiplies through the whole request path."
                          : "Parallel mode assumes any healthy replica can absorb the full request."}
                      </p>
                    </div>
                    <span className="rounded-full border border-warning/40 bg-warning/[0.08] px-2.5 py-0.5 text-[10.5px] text-warning">
                      Weakest: {sla.weakest.label}
                    </span>
                  </div>
                  <div className="max-h-[330px] overflow-y-auto px-5 py-3">
                    <ul className="space-y-2.5">
                      {availabilityRows.map((row) => {
                        const isWeakest = row.id === sla.weakest.id;
                        const barWidth = Math.max(2, Math.min(100, ((row.availability - 0.995) / 0.005) * 100));
                        return (
                          <li
                            key={row.id}
                            className={`rounded-xl border px-3 py-2.5 ${
                              isWeakest ? "border-danger/35 bg-danger/[0.05]" : "border-line bg-app-raised/30"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="truncate text-[12.5px] font-medium text-content">{row.label}</span>
                                {row.multiAz ? (
                                  <span className="rounded border border-success/30 bg-success/10 px-1.5 py-0.5 text-[9.5px] text-success">
                                    multi-AZ
                                  </span>
                                ) : (
                                  <span className="rounded border border-line bg-app-raised px-1.5 py-0.5 text-[9.5px] text-content-tertiary">
                                    single AZ
                                  </span>
                                )}
                                {row.source === "reference" ? (
                                  <span className="rounded border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[9.5px] text-warning">
                                    reference
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] tabular-nums">
                                <span className="text-content-tertiary">{row.region}</span>
                                <span className="text-content-tertiary">×{row.replicas}</span>
                                <span className={isWeakest ? "font-semibold text-danger" : "font-semibold text-content-secondary"}>
                                  {formatPct(row.availability, 5)}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-app-raised">
                              <div
                                className={`h-full rounded-full ${isWeakest ? "bg-danger" : "bg-brass"}`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <p className="border-t border-line px-5 py-2.5 text-[10.5px] leading-relaxed text-content-tertiary">
                    Availability is a steady-state planning number, not a guarantee. A multi-AZ tier is modeled as three zones
                    with partially correlated failures; a serial chain multiplies every dependency. Use it to find the
                    weakest link, then verify the design with a chaos drill.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

        {/* ============================================================ */}
        {/* FINOPS TCO                                                   */}
        {/* ============================================================ */}
        {tab === "finops" ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Multi-cloud FinOps</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-content md:text-3xl">
                  TCO comparator: five ways to run the same system
                </h2>
                <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-content-secondary">
                  Start from the hourly bill on the canvas, add the egress you actually move, then compare list price,
                  commitment pricing, edge offload, and managed Kubernetes. Numbers are directional models, not vendor quotes.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-line bg-app/60 px-3 py-1 text-[11.5px] text-content-secondary">
                <Activity size={12} className="text-brass" /> Cost source: {costSource}
              </span>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className="rounded-2xl border border-line bg-app/50 p-5 shadow-card">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">Inputs</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-line bg-app-raised/40 p-3">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-content-tertiary">Canvas hourly</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-content">
                        {formatUsdPrecise(effectiveHourly)}
                      </p>
                      <p className="text-[10px] text-content-tertiary">per hour</p>
                    </div>
                    <div className="rounded-xl border border-line bg-app-raised/40 p-3">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-content-tertiary">Monthly compute</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-content">
                        {formatUsd(effectiveHourly * HOURS_PER_MONTH)}
                      </p>
                      <p className="text-[10px] text-content-tertiary">at {HOURS_PER_MONTH} hours</p>
                    </div>
                  </div>

                  <label className="mt-4 block">
                    <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">
                      <span>Monthly egress</span>
                      <span className="tabular-nums text-brass">{egressTb} TB</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={egressTb}
                      onChange={(event) => setEgressTb(Number(event.target.value))}
                      className="mt-2 w-full accent-[rgb(var(--accent))]"
                      aria-label="Monthly egress in terabytes"
                    />
                    <span className="mt-1 flex justify-between text-[10px] tabular-nums text-content-tertiary">
                      <span>0</span>
                      <span>50 TB</span>
                      <span>100 TB</span>
                    </span>
                  </label>

                  <div className="mt-4 rounded-xl border border-line bg-ink/40 p-3">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-content-tertiary">Best modeled option</p>
                    <p className="mt-1 text-[15px] font-semibold text-content">{bestModel.label}</p>
                    <p className="mt-1 text-[12px] tabular-nums text-brass">
                      {formatUsd(bestModel.monthlyUsd)}/mo · {formatUsd(bestModel.annualUsd)}/yr
                    </p>
                    <p className="mt-1 text-[10.5px] text-content-tertiary">
                      {bestModel.savingsUsd > 0
                        ? `${formatUsd(bestModel.savingsUsd)}/mo (${bestModel.savingsPct.toFixed(0)}%) below AWS On-Demand`
                        : "No modeled savings versus AWS On-Demand"}
                    </p>
                  </div>

                  <p className="mt-4 text-[10.5px] leading-relaxed text-content-tertiary">
                    Model assumptions: {HOURS_PER_MONTH} hours/month, two NAT gateways, blended internet egress $0.09/GB,
                    edge offload of cacheable compute, and a one-year commitment discount. Validate against your real bill
                    before making a commitment.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-8">
                <div className="overflow-hidden rounded-2xl border border-line bg-app/50 shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
                    <div>
                      <p className="text-[12.5px] font-semibold text-content">Monthly TCO by deployment model</p>
                      <p className="text-[10.5px] text-content-tertiary">
                        Sorted by modeled monthly spend · savings measured against AWS On-Demand
                      </p>
                    </div>
                    <span className="rounded-full border border-line bg-app-raised/60 px-2.5 py-0.5 text-[10.5px] tabular-nums text-content-secondary">
                      {egressTb} TB egress
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] border-collapse text-left text-[12px]">
                      <thead>
                        <tr className="border-b border-line text-[10px] uppercase tracking-[0.12em] text-content-tertiary">
                          <th className="px-5 py-2.5 font-semibold">Model</th>
                          <th className="px-3 py-2.5 text-right font-semibold">Monthly</th>
                          <th className="px-3 py-2.5 text-right font-semibold">Annual</th>
                          <th className="px-3 py-2.5 text-right font-semibold">vs AWS</th>
                          <th className="px-5 py-2.5 text-right font-semibold">Savings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tcoModels.map((model, index) => {
                          const isBaseline = index === 0;
                          const isBest = model.id === bestModel.id;
                          return (
                            <tr
                              key={model.id}
                              className={`border-b border-line/70 last:border-0 ${
                                isBest ? "bg-brass/[0.06]" : ""
                              }`}
                            >
                              <td className="px-5 py-3 align-top">
                                <div className="flex items-start gap-2">
                                  <span
                                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: model.accent }}
                                  />
                                  <div>
                                    <p className="font-medium text-content">
                                      {model.label}
                                      {isBest ? (
                                        <span className="ml-2 rounded border border-brass/40 bg-brass/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-brass">
                                          best
                                        </span>
                                      ) : null}
                                    </p>
                                    <p className="mt-0.5 max-w-sm text-[10.5px] leading-relaxed text-content-tertiary">
                                      {model.notes}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right align-top tabular-nums text-content">
                                {formatUsd(model.monthlyUsd)}
                                <span className="block text-[10px] text-content-tertiary">
                                  {formatUsdPrecise(model.monthlyUsd / HOURS_PER_MONTH)}/h
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right align-top tabular-nums text-content-secondary">
                                {formatUsd(model.annualUsd)}
                              </td>
                              <td
                                className={`px-3 py-3 text-right align-top tabular-nums ${
                                  isBaseline ? "text-content-tertiary" : "text-content-secondary"
                                }`}
                              >
                                {isBaseline ? "baseline" : `${model.savingsUsd >= 0 ? "−" : "+"}${formatUsd(Math.abs(model.savingsUsd))}`}
                              </td>
                              <td
                                className={`px-5 py-3 text-right align-top font-semibold tabular-nums ${
                                  isBaseline
                                    ? "text-content-tertiary"
                                    : model.savingsUsd > 0
                                      ? "text-success"
                                      : "text-danger"
                                }`}
                              >
                                {isBaseline ? "—" : `${model.savingsPct >= 0 ? "" : "−"}${Math.abs(model.savingsPct).toFixed(0)}%`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-5 py-2.5 text-[10.5px] text-content-tertiary">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-brass" /> AWS On-Demand baseline:
                      {awsBaseline ? ` ${formatUsd(awsBaseline.monthlyUsd)}/mo` : " n/a"}
                    </span>
                    <span>Annual delta at best option: {formatUsd((awsBaseline?.monthlyUsd ?? 0) * 12 - bestModel.annualUsd)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <div className="rounded-2xl border border-line bg-app/50 p-5 shadow-card">
                  <p className="flex items-center gap-2 text-[12.5px] font-semibold text-content">
                    <Sparkles size={15} className="text-brass" /> FinOps recommendations
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {finOpsRecommendations.map((recommendation, index) => (
                      <div key={recommendation.title} className="rounded-xl border border-line bg-app-raised/30 p-3.5">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-brass/30 bg-brass/10 text-[10px] font-semibold tabular-nums text-brass">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-[12px] font-medium text-content">{recommendation.title}</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-content-secondary">
                              {recommendation.detail}
                            </p>
                            <p className="mt-2 text-[10.5px] font-medium text-brass">{recommendation.impact}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-4">
                <div className="rounded-2xl border border-line bg-app/50 p-5 shadow-card">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
                    Hourly bill by block
                  </p>
                  <ul className="mt-3 space-y-2">
                    {hourlyBreakdown.slice(0, 8).map((item) => {
                      const maxHourly = Math.max(0.0001, ...hourlyBreakdown.map((line) => line.hourly));
                      return (
                        <li key={item.id}>
                          <div className="flex items-center justify-between gap-2 text-[11.5px]">
                            <span className="truncate text-content-secondary">{item.label}</span>
                            <span className="shrink-0 tabular-nums text-content-tertiary">
                              {formatUsdPrecise(item.hourly)}/h
                            </span>
                          </div>
                          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-app-raised">
                            <div
                              className="h-full rounded-full bg-brass/70"
                              style={{ width: `${Math.max(2, (item.hourly / maxHourly) * 100)}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[11px]">
                    <span className="text-content-tertiary">Total hourly</span>
                    <span className="font-semibold tabular-nums text-content">
                      {formatUsdPrecise(canvasHourly)}
                    </span>
                  </p>
                  <p className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-content-tertiary">Annualized</span>
                    <span className="tabular-nums text-content-secondary">
                      {formatUsd(canvasHourly * HOURS_PER_YEAR)}
                    </span>
                  </p>
                  <p className="mt-3 text-[10px] leading-relaxed text-content-tertiary">
                    {canvasNodes.length > 0
                      ? "Per-replica cost × replica count for every block on the canvas. Open the Cost analysis panel on the canvas to override individual replica prices."
                      : "No canvas topology is loaded, so this panel models a reference edge → gateway → service → database chain. Open the canvas and add blocks to replace it."}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

        {/* ============================================================ */}
        {/* ADR STUDIO & COHORT                                          */}
        {/* ============================================================ */}
        {tab === "adr" ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">
                  Principal architect ADR studio
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-content md:text-3xl">
                  Decision records and team readiness
                </h2>
                <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-content-secondary">
                  Write the decision while the context is fresh. Auto-fill the SLA and budget from the active canvas, export a
                  clean MADR file, then review the cohort against the same six pillars.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={createAdr}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-app/60 px-3 py-2 text-[12px] font-medium text-content-secondary transition-colors hover:border-brass/40 hover:text-content"
                >
                  <Plus size={13} /> New ADR
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadTextFile(
                      "syscraft-adr-collection.md",
                      adrs.map((adr) => renderAdrMarkdown(adr)).join("\n\n---\n\n"),
                      "text/markdown",
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-app/60 px-3 py-2 text-[12px] font-medium text-content-secondary transition-colors hover:border-brass/40 hover:text-content"
                >
                  <Download size={13} /> Export all
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className="rounded-2xl border border-line bg-app/50 p-2 shadow-card">
                  <div className="flex items-center justify-between px-3 py-2">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
                      Decision log
                    </p>
                    <span className="rounded-full border border-line bg-app-raised/60 px-2 py-0.5 text-[10px] tabular-nums text-content-tertiary">
                      {adrs.length}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {adrs.map((adr) => {
                      const active = adr.id === selectedAdr.id;
                      return (
                        <li key={adr.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAdrId(adr.id);
                              setAdrNotice("");
                            }}
                            aria-pressed={active}
                            className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                              active
                                ? "border-brass/40 bg-brass/[0.08]"
                                : "border-transparent hover:border-line hover:bg-app-raised/40"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brass">
                                {adr.id}
                              </span>
                              <span
                                className={`rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${
                                  adr.status === "Accepted"
                                    ? "border-success/35 bg-success/10 text-success"
                                    : adr.status === "Proposed"
                                      ? "border-warning/35 bg-warning/10 text-warning"
                                      : "border-line bg-app-raised text-content-tertiary"
                                }`}
                              >
                                {adr.status}
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-snug text-content">
                              {adr.title}
                            </p>
                            <p className="mt-1 text-[10px] tabular-nums text-content-tertiary">
                              SLA {adr.targetSlaPercent}% · {formatUsd(adr.estimatedMonthlyBudgetUsd)}/mo
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <div className="lg:col-span-8">
                <div className="rounded-2xl border border-line bg-app/50 p-5 shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-brass/35 bg-brass/10 px-2.5 py-1 text-[10.5px] font-semibold text-brass">
                        {selectedAdr.id}
                      </span>
                      <span className="text-[10.5px] text-content-tertiary">
                        Metrics linked to {canvasNodes.length > 0 ? "active canvas" : "reference topology"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={autoFillAdrFromCanvas}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-brass/40 bg-brass/10 px-2.5 py-1.5 text-[11.5px] font-medium text-brass transition-colors hover:bg-brass/20"
                      >
                        <RefreshCw size={12} /> Auto-fill from active canvas
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadTextFile(`syscraft-${selectedAdr.id}.md`, renderAdrMarkdown(selectedAdr), "text/markdown")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-app-raised/60 px-2.5 py-1.5 text-[11.5px] font-medium text-content-secondary transition-colors hover:border-brass/40 hover:text-content"
                      >
                        <Download size={12} /> Export .md
                      </button>
                    </div>
                  </div>

                  {adrNotice ? (
                    <p className="mt-3 rounded-lg border border-success/30 bg-success/[0.07] px-3 py-2 text-[11px] text-success">
                      {adrNotice}
                    </p>
                  ) : null}

                  <label className="mt-4 block">
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">
                      Title
                    </span>
                    <input
                      type="text"
                      value={selectedAdr.title}
                      onChange={(event) => updateSelectedAdr({ title: event.target.value })}
                      className="mt-1 w-full rounded-lg border border-line bg-app-raised/40 px-3 py-2 text-[13px] font-medium text-content outline-none transition-colors focus:border-brass/50"
                    />
                  </label>

                  <div className="mt-3 grid gap-3 sm:grid-cols-4">
                    <label className="block">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">
                        Status
                      </span>
                      <select
                        value={selectedAdr.status}
                        onChange={(event) => updateSelectedAdr({ status: event.target.value as AdrStatus })}
                        className="mt-1 w-full rounded-lg border border-line bg-app-raised/40 px-2.5 py-2 text-[12px] text-content outline-none transition-colors focus:border-brass/50"
                      >
                        {(["Proposed", "Accepted", "Superseded"] as AdrStatus[]).map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">
                        Date
                      </span>
                      <input
                        type="date"
                        value={selectedAdr.date}
                        onChange={(event) => updateSelectedAdr({ date: event.target.value })}
                        className="mt-1 w-full rounded-lg border border-line bg-app-raised/40 px-2.5 py-2 text-[12px] text-content outline-none transition-colors focus:border-brass/50"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">
                        Target SLA %
                      </span>
                      <input
                        type="number"
                        min={90}
                        max={99.9999}
                        step={0.0001}
                        value={selectedAdr.targetSlaPercent}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          updateSelectedAdr({
                            targetSlaPercent: Number.isFinite(next)
                              ? Math.max(0, Math.min(99.9999, next))
                              : selectedAdr.targetSlaPercent,
                          });
                        }}
                        className="mt-1 w-full rounded-lg border border-line bg-app-raised/40 px-2.5 py-2 text-[12px] tabular-nums text-content outline-none transition-colors focus:border-brass/50"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">
                        Monthly budget $
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={selectedAdr.estimatedMonthlyBudgetUsd}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          updateSelectedAdr({
                            estimatedMonthlyBudgetUsd: Number.isFinite(next)
                              ? Math.max(0, next)
                              : selectedAdr.estimatedMonthlyBudgetUsd,
                          });
                        }}
                        className="mt-1 w-full rounded-lg border border-line bg-app-raised/40 px-2.5 py-2 text-[12px] tabular-nums text-content outline-none transition-colors focus:border-brass/50"
                      />
                    </label>
                  </div>

                  <div className="mt-3 grid gap-3">
                    <label className="block">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">
                        Context
                      </span>
                      <textarea
                        value={selectedAdr.context}
                        onChange={(event) => updateSelectedAdr({ context: event.target.value })}
                        rows={4}
                        className="mt-1 w-full resize-y rounded-lg border border-line bg-app-raised/40 px-3 py-2 text-[12px] leading-relaxed text-content outline-none transition-colors focus:border-brass/50"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">
                        Considered options · one per line
                      </span>
                      <textarea
                        value={selectedAdr.consideredOptions.join("\n")}
                        onChange={(event) =>
                          updateSelectedAdr({
                            consideredOptions: event.target.value.split("\n"),
                          })
                        }
                        rows={4}
                        className="mt-1 w-full resize-y rounded-lg border border-line bg-app-raised/40 px-3 py-2 text-[12px] leading-relaxed text-content outline-none transition-colors focus:border-brass/50"
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">
                          Decision
                        </span>
                        <textarea
                          value={selectedAdr.decision}
                          onChange={(event) => updateSelectedAdr({ decision: event.target.value })}
                          rows={4}
                          className="mt-1 w-full resize-y rounded-lg border border-line bg-app-raised/40 px-3 py-2 text-[12px] leading-relaxed text-content outline-none transition-colors focus:border-brass/50"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">
                          Consequences
                        </span>
                        <textarea
                          value={selectedAdr.consequences}
                          onChange={(event) => updateSelectedAdr({ consequences: event.target.value })}
                          rows={4}
                          className="mt-1 w-full resize-y rounded-lg border border-line bg-app-raised/40 px-3 py-2 text-[12px] leading-relaxed text-content outline-none transition-colors focus:border-brass/50"
                        />
                      </label>
                    </div>
                  </div>

                  <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-content-tertiary">
                    <Lock size={11} /> This editor is local to the browser. Export Markdown to commit the record to your
                    repository.
                  </p>
                </div>
              </div>
            </div>

            {/* Cohort ---------------------------------------------------- */}
            <div className="mt-6 rounded-2xl border border-line bg-app/50 shadow-card">
              <div className="flex flex-col gap-3 border-b border-line px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-content">
                    <Users size={15} className="text-brass" /> Enterprise team cohort readiness
                  </p>
                  <p className="mt-1 text-[11px] text-content-tertiary">
                    Average readiness {cohortReadiness}% · weakest pillar {weakestPillar.label} at {cohortAverages[weakestPillar.id]}%
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) importCohort(file);
                      event.target.value = "";
                    }}
                    aria-label="Import cohort JSON snapshot"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-app-raised/60 px-3 py-2 text-[11.5px] font-medium text-content-secondary transition-colors hover:border-brass/40 hover:text-content"
                  >
                    <Upload size={13} /> Import JSON
                  </button>
                  <button
                    type="button"
                    onClick={exportCohort}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-app-raised/60 px-3 py-2 text-[11.5px] font-medium text-content-secondary transition-colors hover:border-brass/40 hover:text-content"
                  >
                    <FileJson size={13} /> Export snapshot
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={draftMember.name}
                  onChange={(event) => setDraftMember((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Team member name"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-app-raised/40 px-3 py-2 text-[12px] text-content outline-none transition-colors placeholder:text-content-tertiary focus:border-brass/50"
                  aria-label="New team member name"
                />
                <input
                  type="text"
                  value={draftMember.title}
                  onChange={(event) => setDraftMember((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Title (optional)"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-app-raised/40 px-3 py-2 text-[12px] text-content outline-none transition-colors placeholder:text-content-tertiary focus:border-brass/50"
                  aria-label="New team member title"
                />
                <select
                  value={draftMember.trackId}
                  onChange={(event) => setDraftMember((current) => ({ ...current, trackId: event.target.value }))}
                  className="rounded-lg border border-line bg-app-raised/40 px-2.5 py-2 text-[12px] text-content outline-none transition-colors focus:border-brass/50"
                  aria-label="New team member track"
                >
                  {ENTERPRISE_ROLE_TRACKS.map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.roleLevel}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addCohortMember}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-brass/40 bg-brass/10 px-3 py-2 text-[11.5px] font-medium text-brass transition-colors hover:bg-brass/20"
                >
                  <Plus size={13} /> Add member
                </button>
              </div>

              {cohortError ? (
                <p className="mx-5 mb-2 rounded-lg border border-danger/30 bg-danger/[0.07] px-3 py-2 text-[11px] text-danger">
                  {cohortError}
                </p>
              ) : null}
              {cohortNotice ? (
                <p className="mx-5 mb-2 rounded-lg border border-success/30 bg-success/[0.07] px-3 py-2 text-[11px] text-success">
                  {cohortNotice}
                </p>
              ) : null}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-left text-[11.5px]">
                  <thead>
                    <tr className="border-y border-line text-[9.5px] uppercase tracking-[0.1em] text-content-tertiary">
                      <th className="px-5 py-2.5 font-semibold">Engineer</th>
                      {READINESS_PILLARS.map((pillar) => (
                        <th key={pillar.id} className="px-2 py-2.5 text-center font-semibold">
                          {pillar.shortLabel}
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-right font-semibold">Readiness</th>
                      <th className="px-5 py-2.5 text-right font-semibold">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohort.map((member) => {
                      const readiness = memberReadiness(member);
                      const tone = scoreTone(readiness);
                      return (
                        <tr key={member.id} className="border-b border-line/60 last:border-0 hover:bg-app-raised/20">
                          <td className="px-5 py-3 align-top">
                            <p className="font-medium text-content">{member.name}</p>
                            <p className="text-[10.5px] text-content-tertiary">{member.title}</p>
                            <p className="mt-0.5 text-[9.5px] uppercase tracking-[0.08em] text-brass/80">
                              {member.roleLevel}
                            </p>
                          </td>
                          {READINESS_PILLARS.map((pillar) => {
                            const score = member.pillarScores[pillar.id];
                            const cellTone = scoreTone(score);
                            return (
                              <td key={pillar.id} className="px-2 py-3 text-center align-top">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={score}
                                  onChange={(event) =>
                                    updateMemberScore(member.id, pillar.id, Number(event.target.value))
                                  }
                                  aria-label={`${member.name} ${pillar.label} score`}
                                  className={`w-12 rounded-md border border-line bg-app-raised/40 px-1 py-1 text-center text-[11px] tabular-nums outline-none transition-colors focus:border-brass/50 ${cellTone.text}`}
                                />
                                <span className="mx-auto mt-1 block h-0.5 w-8 overflow-hidden rounded-full bg-app-raised">
                                  <span
                                    className={`block h-full rounded-full ${cellTone.bar}`}
                                    style={{ width: `${score}%` }}
                                  />
                                </span>
                              </td>
                            );
                          })}
                          <td className="px-3 py-3 text-right align-top">
                            <span className={`text-[13px] font-semibold tabular-nums ${tone.text}`}>{readiness}%</span>
                            <span className="ml-1 text-[10px] text-content-tertiary">/ {member.labsCompleted} labs</span>
                          </td>
                          <td className="px-5 py-3 text-right align-top">
                            <button
                              type="button"
                              onClick={() => removeCohortMember(member.id)}
                              aria-label={`Remove ${member.name} from the cohort`}
                              className="rounded-md border border-transparent p-1 text-content-tertiary transition-colors hover:border-danger/30 hover:bg-danger/10 hover:text-danger"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {cohort.length === 0 ? (
                      <tr>
                        <td colSpan={READINESS_PILLARS.length + 3} className="px-5 py-10 text-center text-[12px] text-content-tertiary">
                          The local cohort is empty. Add a team member above or import a readiness snapshot.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-line bg-app-raised/20 text-[10.5px]">
                      <td className="px-5 py-2.5 font-semibold uppercase tracking-[0.1em] text-content-tertiary">
                        Team average
                      </td>
                      {READINESS_PILLARS.map((pillar) => {
                        const average = cohortAverages[pillar.id];
                        return (
                          <td key={pillar.id} className={`px-2 py-2.5 text-center font-semibold tabular-nums ${scoreTone(average).text}`}>
                            {average}%
                          </td>
                        );
                      })}
                      <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${scoreTone(cohortReadiness).text}`}>
                        {cohortReadiness}%
                      </td>
                      <td className="px-5 py-2.5 text-right text-[9.5px] text-content-tertiary">{cohort.length} people</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-5 py-3 text-[10.5px] text-content-tertiary">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-success" /> Scores are editable locally; nothing leaves the browser.
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Zap size={12} className="text-brass" /> Snapshot format: syscraft.enterprise.cohort/1
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe size={12} /> {SAMPLE_TEAM_COHORT.length}-person sample roster included
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-line bg-app/40 p-4">
                <p className="flex items-center gap-2 text-[11.5px] font-semibold text-content">
                  <Table size={13} className="text-brass" /> Strongest pillar
                </p>
                <p className="mt-2 text-[12px] text-content-secondary">
                  {READINESS_PILLARS.reduce(
                    (best, pillar) => (cohortAverages[pillar.id] > cohortAverages[best.id] ? pillar : best),
                    READINESS_PILLARS[0],
                  ).label}{" "}
                  at{" "}
                  {
                    cohortAverages[
                      READINESS_PILLARS.reduce(
                        (best, pillar) => (cohortAverages[pillar.id] > cohortAverages[best.id] ? pillar : best),
                        READINESS_PILLARS[0],
                      ).id
                    ]
                  }
                  %
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-app/40 p-4">
                <p className="flex items-center gap-2 text-[11.5px] font-semibold text-content">
                  <Gauge size={13} className="text-warning" /> Coaching focus
                </p>
                <p className="mt-2 text-[12px] text-content-secondary">
                  {weakestPillar.label} is the lowest average. Assign a lab from that pillar before the next review cycle.
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-app/40 p-4">
                <p className="flex items-center gap-2 text-[11.5px] font-semibold text-content">
                  <CheckCircle2 size={13} className="text-success" /> Governance habit
                </p>
                <p className="mt-2 text-[12px] text-content-secondary">
                  Every accepted ADR should name a metric, an owner, and a review date. Use the SLA and TCO tabs as the
                  evidence pack.
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

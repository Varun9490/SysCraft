/**
 * Cross-region submarine fiber / cloud backbone latency matrix (round-trip ms).
 * Values approximate 2025-2026 public cloud ping medians between regions over
 * private backbone + submarine cable paths. Symmetric by construction.
 * Used by the simulator to add inter-region edge latency and by the offline
 * heuristic reviewer to flag high cross-region chatter.
 */

export interface CloudRegion {
  id: string;
  label: string;
  city: string;
  provider: "aws" | "gcp" | "azure" | "multi";
}

export const CLOUD_REGIONS: readonly CloudRegion[] = [
  { id: "us-east-1", label: "US East (N. Virginia)", city: "Ashburn", provider: "aws" },
  { id: "us-west-2", label: "US West (Oregon)", city: "Boardman", provider: "aws" },
  { id: "eu-west-1", label: "EU West (Ireland)", city: "Dublin", provider: "aws" },
  { id: "eu-central-1", label: "EU Central (Frankfurt)", city: "Frankfurt", provider: "aws" },
  { id: "ap-south-1", label: "AP South (Mumbai)", city: "Mumbai", provider: "aws" },
  { id: "ap-southeast-1", label: "AP Southeast (Singapore)", city: "Singapore", provider: "aws" },
  { id: "ap-northeast-1", label: "AP Northeast (Tokyo)", city: "Tokyo", provider: "aws" },
  { id: "sa-east-1", label: "South America (São Paulo)", city: "São Paulo", provider: "aws" },
  { id: "af-south-1", label: "Africa (Cape Town)", city: "Cape Town", provider: "aws" },
  { id: "me-south-1", label: "Middle East (Bahrain)", city: "Manama", provider: "aws" },
] as const;

export type RegionId = (typeof CLOUD_REGIONS)[number]["id"];

type LatencyRow = Record<string, number>;

/**
 * Round-trip milliseconds between region pairs. Diagonal is 1ms (same-AZ
 * backbone). Entries are symmetric: MATRIX[a][b] === MATRIX[b][a].
 */
const MATRIX: Record<string, LatencyRow> = {
  "us-east-1": {
    "us-east-1": 1,
    "us-west-2": 62,
    "eu-west-1": 68,
    "eu-central-1": 82,
    "ap-south-1": 188,
    "ap-southeast-1": 218,
    "ap-northeast-1": 158,
    "sa-east-1": 118,
    "af-south-1": 208,
    "me-south-1": 178,
  },
  "us-west-2": {
    "us-east-1": 62,
    "us-west-2": 1,
    "eu-west-1": 128,
    "eu-central-1": 142,
    "ap-south-1": 228,
    "ap-southeast-1": 172,
    "ap-northeast-1": 102,
    "sa-east-1": 168,
    "af-south-1": 248,
    "me-south-1": 228,
  },
  "eu-west-1": {
    "us-east-1": 68,
    "us-west-2": 128,
    "eu-west-1": 1,
    "eu-central-1": 22,
    "ap-south-1": 132,
    "ap-southeast-1": 162,
    "ap-northeast-1": 182,
    "sa-east-1": 172,
    "af-south-1": 168,
    "me-south-1": 118,
  },
  "eu-central-1": {
    "us-east-1": 82,
    "us-west-2": 142,
    "eu-west-1": 22,
    "eu-central-1": 1,
    "ap-south-1": 118,
    "ap-southeast-1": 152,
    "ap-northeast-1": 172,
    "sa-east-1": 182,
    "af-south-1": 172,
    "me-south-1": 102,
  },
  "ap-south-1": {
    "us-east-1": 188,
    "us-west-2": 228,
    "eu-west-1": 132,
    "eu-central-1": 118,
    "ap-south-1": 1,
    "ap-southeast-1": 62,
    "ap-northeast-1": 92,
    "sa-east-1": 288,
    "af-south-1": 148,
    "me-south-1": 58,
  },
  "ap-southeast-1": {
    "us-east-1": 218,
    "us-west-2": 172,
    "eu-west-1": 162,
    "eu-central-1": 152,
    "ap-south-1": 62,
    "ap-southeast-1": 1,
    "ap-northeast-1": 72,
    "sa-east-1": 298,
    "af-south-1": 188,
    "me-south-1": 102,
  },
  "ap-northeast-1": {
    "us-east-1": 158,
    "us-west-2": 102,
    "eu-west-1": 182,
    "eu-central-1": 172,
    "ap-south-1": 92,
    "ap-southeast-1": 72,
    "ap-northeast-1": 1,
    "sa-east-1": 248,
    "af-south-1": 228,
    "me-south-1": 142,
  },
  "sa-east-1": {
    "us-east-1": 118,
    "us-west-2": 168,
    "eu-west-1": 172,
    "eu-central-1": 182,
    "ap-south-1": 288,
    "ap-southeast-1": 298,
    "ap-northeast-1": 248,
    "sa-east-1": 1,
    "af-south-1": 218,
    "me-south-1": 268,
  },
  "af-south-1": {
    "us-east-1": 208,
    "us-west-2": 248,
    "eu-west-1": 168,
    "eu-central-1": 172,
    "ap-south-1": 148,
    "ap-southeast-1": 188,
    "ap-northeast-1": 228,
    "sa-east-1": 218,
    "af-south-1": 1,
    "me-south-1": 158,
  },
  "me-south-1": {
    "us-east-1": 178,
    "us-west-2": 228,
    "eu-west-1": 118,
    "eu-central-1": 102,
    "ap-south-1": 58,
    "ap-southeast-1": 102,
    "ap-northeast-1": 142,
    "sa-east-1": 268,
    "af-south-1": 158,
    "me-south-1": 1,
  },
};

export function isKnownRegion(regionId: string): boolean {
  return Object.prototype.hasOwnProperty.call(MATRIX, regionId);
}

export function listRegions(): CloudRegion[] {
  return [...CLOUD_REGIONS];
}

/**
 * Round-trip latency in ms between two regions. Unknown region ids fall back
 * to a conservative 120ms instead of NaN so the simulator never stalls.
 */
export function getRegionLatencyMs(from: string, to: string): number {
  if (from === to) return 1;
  const row = MATRIX[from];
  if (row && typeof row[to] === "number") return row[to];
  const reverse = MATRIX[to];
  if (reverse && typeof reverse[from] === "number") return reverse[from];
  return 120;
}

/** One-way latency ≈ RTT / 2, used when annotating edge link delay. */
export function getOneWayLatencyMs(from: string, to: string): number {
  return getRegionLatencyMs(from, to) / 2;
}

/**
 * Nearest region (excluding self) by RTT — handy for "deploy replica here"
 * suggestions in the offline heuristic reviewer.
 */
export function nearestRegionTo(regionId: string): string {
  const row = MATRIX[regionId];
  if (!row) return "us-east-1";
  let best = "us-east-1";
  let bestMs = Number.POSITIVE_INFINITY;
  for (const [candidate, ms] of Object.entries(row)) {
    if (candidate === regionId) continue;
    if (ms < bestMs) {
      bestMs = ms;
      best = candidate;
    }
  }
  return best;
}

/** True when two nodes sit in different regions (cross-region chatter). */
export function isCrossRegion(a: string, b: string): boolean {
  return a !== b;
}

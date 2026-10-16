/**
 * Bidirectional text-to-diagram DSL (Milestone 7).
 *
 * Grammar (one statement per line, `#` comments, blank lines ignored):
 *
 *   node  := resourceId "Label" @ (x, y) [xREPLICAS] [region]
 *   edge  := source -> target          # ids or "quoted labels"
 *
 * Examples:
 *   api_gateway "Edge gateway" @ (80, 200) x2 us-east-1
 *   rest_service "Checkout API" @ (360, 200)
 *   "Edge gateway" -> "Checkout API"
 *
 * `parseDsl` is total and tolerant: malformed lines are skipped with a
 * collected error string instead of throwing. `serializeDsl` emits canonical
 * form so parse(serialize(x)) round-trips losslessly.
 */

export interface DslNode {
  id: string;
  resourceId: string;
  label: string;
  position: { x: number; y: number };
  replicationFactor: number;
  region: string;
}

export interface DslEdge {
  source: string;
  target: string;
}

export interface DslParseResult {
  nodes: DslNode[];
  edges: DslEdge[];
  errors: string[];
}

const NODE_PATTERN = /^([a-z0-9_]+)\s+"([^"]+)"\s+@\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s*(?:x(\d+))?\s*([a-z0-9-]+)?\s*$/i;
const EDGE_PATTERN = /^(.+?)\s*->\s*(.+?)\s*$/;

function slugifyLabel(label: string, taken: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 28) || "node";
  let candidate = base;
  let suffix = 2;
  while (taken.has(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  taken.add(candidate);
  return candidate;
}

function unquote(token: string): string {
  const trimmed = token.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function parseDsl(text: string): DslParseResult {
  const nodes: DslNode[] = [];
  const edges: DslEdge[] = [];
  const errors: string[] = [];
  const taken = new Set<string>();
  const byId = new Map<string, DslNode>();
  const byLabel = new Map<string, DslNode>();

  const resolveEndpoint = (token: string): string | null => {
    const name = unquote(token);
    const byIdHit = byId.get(name);
    if (byIdHit) return byIdHit.id;
    const byLabelHit = byLabel.get(name);
    if (byLabelHit) return byLabelHit.id;
    return null;
  };

  const lines = text.split("\n");
  lines.forEach((rawLine, index) => {
    const lineNo = index + 1;
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) return;

    const nodeMatch = NODE_PATTERN.exec(line);
    if (nodeMatch) {
      const resourceId = (nodeMatch[1] ?? "rest_service").toLowerCase();
      const label = nodeMatch[2] ?? resourceId;
      const x = clampNumber(Number(nodeMatch[3]), -5000, 5000, 0);
      const y = clampNumber(Number(nodeMatch[4]), -5000, 5000, 0);
      const replicas = nodeMatch[5] ? clampNumber(Number(nodeMatch[5]), 1, 100, 1) : 1;
      const region = (nodeMatch[6] ?? "us-east-1").toLowerCase();
      const id = slugifyLabel(label, taken);
      const node: DslNode = {
        id,
        resourceId,
        label,
        position: { x, y },
        replicationFactor: Math.floor(replicas),
        region,
      };
      nodes.push(node);
      byId.set(id, node);
      if (!byLabel.has(label)) byLabel.set(label, node);
      return;
    }

    const edgeMatch = EDGE_PATTERN.exec(line);
    if (edgeMatch) {
      const source = resolveEndpoint(edgeMatch[1] ?? "");
      const target = resolveEndpoint(edgeMatch[2] ?? "");
      if (!source || !target) {
        errors.push(`line ${lineNo}: unknown endpoint in "${line}" (declare nodes before edges)`);
        return;
      }
      if (source === target) {
        errors.push(`line ${lineNo}: self-loop "${line}" ignored`);
        return;
      }
      if (edges.some((e) => e.source === source && e.target === target)) return;
      edges.push({ source, target });
      return;
    }

    errors.push(`line ${lineNo}: could not parse "${line}"`);
  });

  return { nodes, edges, errors };
}

export function serializeDsl(nodes: DslNode[], edges: DslEdge[]): string {
  const lines = ["# SysCanvas DSL — resourceId \"Label\" @ (x, y) [xREPLICAS] [region]"];
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  for (const n of sorted) {
    const x = Math.round(n.position.x);
    const y = Math.round(n.position.y);
    lines.push(`${n.resourceId} "${n.label.replace(/"/g, "")}" @ (${x}, ${y}) x${Math.max(1, Math.floor(n.replicationFactor))} ${n.region}`);
  }
  if (edges.length > 0) {
    lines.push("");
    const sortedEdges = [...edges].sort((a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target));
    for (const e of sortedEdges) {
      lines.push(`${e.source} -> ${e.target}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

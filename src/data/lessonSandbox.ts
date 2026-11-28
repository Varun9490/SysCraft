import type { LessonSandboxSpec, SandboxKind } from "./lessonBlogs";

/* ------------------------------------------------------------------ */
/* Pure lesson-sandbox evaluators (no registry dependency).            */
/* ------------------------------------------------------------------ */

export interface SandboxMetric {
  primaryMetricLabel: string;
  primaryMetricValue: string;
  secondaryMetricLabel: string;
  secondaryMetricValue: string;
  status: "healthy" | "warning" | "critical";
  explanation: string;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function evaluateLatency(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  // value = extra latency added on a hot path (ms).
  const lost = value <= 50 ? value * 0.08 : value <= 150 ? 4 + (value - 50) * 0.25 : clamp(29 + (value - 150) * 0.35, 0, 45);
  const stillServing = Math.round(clamp(100 - lost * 1.2, 55, 100));
  const status = value <= 50 ? "healthy" : value <= 150 ? "warning" : "critical";
  return {
    primaryMetricLabel: "Customers who leave before buying",
    primaryMetricValue: `${lost.toFixed(1)}%`,
    secondaryMetricLabel: "Requests still completing",
    secondaryMetricValue: `${stillServing}%`,
    status,
    explanation: `At ${value} ms ${sandbox.sliderLabel.toLowerCase()} each hop delays a user twice per request (out and back), so real-world checkout delay is roughly ${value * 2} ms. Industry studies hold that 100 ms of added delay costs about 1% of conversions — and past ~150 ms the tail spreads faster than the average climbs, so worst-case (p99) checkout times push into seconds and impatient customers abandon carts.`,
  };
}

function evaluateCapacity(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const p50 = Math.max(3, Math.round(9 * Math.sqrt(value / 40)));
  const overRatio = value / 1600;
  const p99 = Math.round(p50 * 2.8 * (overRatio > 1 ? Math.pow(overRatio, 1.6) : 1));
  const status = p99 < 70 ? "healthy" : p99 < 220 ? "warning" : "critical";
  const clamped = clamp(p99, 0, 9999);
  return {
    primaryMetricLabel: "Typical (p50) response time",
    primaryMetricValue: `${p50} ms`,
    secondaryMetricLabel: "Worst-case (p99) response time",
    secondaryMetricValue: `${clamped} ms`,
    status,
    explanation: `With ${value.toLocaleString("en-US")} ${sandbox.unit} arriving at once, a single app server still walks through each request at its own pace, so the typical response is ${p50} ms. But near 1,600 concurrent ${sandbox.unit} the queue math changes: past that point the line grows much faster than the crowd does, and worst-case response times spread into ${clamped > 400 ? "whole seconds" : "hundreds of ms"} while the average barely moves.`,
  };
}

function evaluateRetry(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const amplification = Math.round(clamp(Math.pow(1.8, Math.max(0, value - 1)), 1, 25000));
  const status = value <= 2 ? "healthy" : value <= 4 ? "warning" : "critical";
  const successWindow = clamp(100 - (value - 1) * 6, 20, 100);
  return {
    primaryMetricLabel: "Retry-storm traffic amplification",
    primaryMetricValue: `${amplification.toLocaleString("en-US")}%`,
    secondaryMetricLabel: "Requests finishing inside the deadline",
    secondaryMetricValue: `${successWindow}%`,
    status,
    explanation: `Retrying ${value.toLocaleString("en-US")} times means one temporary failure can turn into ${amplification.toLocaleString("en-US")}% extra traffic aimed at an already-struggling service. With exponential backoff and a cap, one retry is polite; three or four starts piling load on a system already gasping; more than that becomes a self-inflicted retry storm where everyone waits even if the underlying service recovers.`,
  };
}

function evaluateReceipt(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const escaped = Math.round((100 - value) * 20);
  const status = value >= 98 ? "healthy" : value >= 90 ? "warning" : "critical";
  return {
    primaryMetricLabel: "Duplicate effects prevented",
    primaryMetricValue: `${value}%`,
    secondaryMetricLabel: "Duplicate charges that slip through",
    secondaryMetricValue: `${escaped} per 10,000 requests`,
    status,
    explanation: `When ${value.toLocaleString("en-US")}% of duplicate requests are caught by the dedupe key, only ${(100 - value).toFixed(0)}% slip past — which at 10,000 payments is ${escaped} double effects. An idempotency key turns most network hiccups into harmless replays; without one the ledger silently grows a second charge the customer will dispute.`,
  };
}

function evaluatePlot(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const indexes = clamp(value * 2, 0, 999);
  const slowRisk = value >= 12 ? 90 : value >= 8 ? 60 : value >= 5 ? 30 : 10;
  const status = value <= 5 ? "healthy" : value <= 9 ? "warning" : "critical";
  return {
    primaryMetricLabel: "Structures to maintain",
    primaryMetricValue: `${indexes}`,
    secondaryMetricLabel: "Slow-query risk",
    secondaryMetricValue: `${slowRisk}%`,
    status,
    explanation: `Serving ${value.toLocaleString("en-US")} ${sandbox.unit} cleanly means planning ${indexes} structures (indexes, projections, read models) so every common read has a shortcut. Below roughly a handful of patterns this is comfortable; past that, un-modeled patterns start scanning whole tables and slow-query risk jumps into the danger zone.`,
  };
}

function evaluateQuorum(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const total = sandbox.max;
  const quorum = Math.floor(total / 2) + 1;
  const writes = value >= quorum;
  const status = value >= quorum ? "healthy" : value >= Math.ceil(total / 2) ? "warning" : "critical";
  return {
    primaryMetricLabel: "Writes accepted",
    primaryMetricValue: writes ? "Yes (quorum holds)" : "No (quorum lost)",
    secondaryMetricLabel: "Surviving replicas",
    secondaryMetricValue: `${value} of ${total} (need ${quorum})`,
    status,
    explanation: `With ${value} of ${total} replicas answering, a majority quorum needs ${quorum} nodes. ${writes ? `You still have ${value}, so all reads and writes are safe — no data risk.` : `You have fewer than ${quorum}, so the cluster refuses writes rather than risk two different truths. Reads may also stall until enough replicas come back.`} This is the honest arithmetic behind 'stall rather than corrupt'.`,
  };
}

function evaluateFanout(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const seconds = Math.max(1, Math.ceil(value / 25));
  const status = value <= 150 ? "healthy" : value <= 1500 ? "warning" : "critical";
  return {
    primaryMetricLabel: "Inboxes to write per action",
    primaryMetricValue: `${value.toLocaleString("en-US")}`,
    secondaryMetricLabel: "Time for everyone to receive",
    secondaryMetricValue: `~${seconds} s`,
    status,
    explanation: `One message to ${value.toLocaleString("en-US")} recipients means ${value.toLocaleString("en-US")} write operations at send time. Small groups are instant; a few thousand fans out in a couple of seconds; huge audiences (hundreds of thousands) make send-time copying uneconomical — which is why hybrid fan-out designs switch large senders to assemble-on-read.`,
  };
}

function evaluateQueue(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const steady = 40;
  const overload = value - steady;
  const backlog = Math.max(0, overload) * 12;
  const delay = Math.round((backlog / steady) * 10) / 10;
  const status = value <= steady * 0.95 ? "healthy" : value <= steady * 1.6 ? "warning" : "critical";
  return {
    primaryMetricLabel: "Wait before a job starts",
    primaryMetricValue: delay > 0 ? `${delay.toFixed(1)}+ s behind the line` : "Under 1 s",
    secondaryMetricLabel: "Backlog waiting",
    secondaryMetricValue: `${backlog.toLocaleString("en-US")} jobs`,
    status,
    explanation: `At ${value} ${sandbox.unit} arriving against ${steady} jobs/s of steady processing capacity${overload > 0 ? `, ${overload} jobs pile up every second and the backlog climbs to ${backlog.toLocaleString("en-US")}` : ` the pool keeps pace and the line stays short`}. The closer the arrival rate gets to the pool's ceiling, the faster the line grows — classic queueing math where p99 explodes just before full saturation.`,
  };
}

function evaluateRateLimit(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const cap = 800;
  const rejected = Math.max(0, ((value - cap) / Math.max(value, 1)) * 100);
  const status = value <= cap ? "healthy" : value <= cap * 2.5 ? "warning" : "critical";
  return {
    primaryMetricLabel: "Requests turned away",
    primaryMetricValue: `${rejected.toFixed(1)}%`,
    secondaryMetricLabel: "Requests admitted within the cap",
    secondaryMetricValue: `${Math.min(100, Math.round((cap / Math.max(value, 1)) * 100))}%`,
    status,
    explanation: `With a fixed cap of ${cap} ${sandbox.unit} per window and ${value.toLocaleString("en-US")} arriving, ${rejected.toFixed(1)}% get 429s while the rest go through. Pushing 2-3× past the cap is normal burst territory for honest clients; anything beyond that is worth asking who exactly is hammering the door.`,
  };
}

function evaluateCost(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const perUnit = 0.28;
  const perHour = value * perUnit;
  const perMonth = perHour * 730;
  const status = value <= 4 ? "healthy" : value <= 16 ? "warning" : "critical";
  return {
    primaryMetricLabel: "Monthly bill",
    primaryMetricValue: `$${Math.round(perMonth).toLocaleString("en-US")}`,
    secondaryMetricLabel: "Unit cost per hour",
    secondaryMetricValue: `$${perHour.toFixed(2)}`,
    status,
    explanation: `${value.toLocaleString("en-US")} ${sandbox.unit} at $${perUnit.toFixed(2)} per ${sandbox.unit.replace(/s$/, "")}/hour runs about $${perHour.toFixed(2)}/hour and roughly $${Math.round(perMonth).toLocaleString("en-US")}/month. Before scaling out further, check the cheaper levers: caching to offload the origin, right-sizing under-utilized units, and correcting the expensive requests themselves.`,
  };
}

function evaluateOutbox(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const lag = value < 600 ? Math.round((value / 600) * 100) / 100 : Math.round(Math.pow(value / 600, 2) * 100) / 100;
  const status = lag < 1 ? "healthy" : lag < 5 ? "warning" : "critical";
  return {
    primaryMetricLabel: "Follower / consumer lag",
    primaryMetricValue: `${lag.toFixed(2)} s`,
    secondaryMetricLabel: "Reads that briefly disagree",
    secondaryMetricValue: lag < 1 ? "Barely any" : `Most reads within the window`,
    status,
    explanation: `At ${value.toLocaleString("en-US")} ${sandbox.unit}, the second copy of the truth updates about ${lag.toFixed(2)} s behind the first. Under one second is imperceptible for most flows; a few seconds means dashboards and cross-service reads briefly disagree with the source of truth; past that, users start seeing stale answers and the risk of acting on outdated data climbs.`,
  };
}

function evaluateTail(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const p99 = Math.round((12 + Math.pow(value, 1.6)) * 10) / 10;
  const status = value < 20 ? "healthy" : value < 50 ? "warning" : "critical";
  return {
    primaryMetricLabel: "Worst-case (p99) latency",
    primaryMetricValue: `${p99} ms`,
    secondaryMetricLabel: "Share landing on one spot",
    secondaryMetricValue: `${value}%`,
    status,
    explanation: `When ${value}% of everything lands on one ${value > 50 ? "hot item" : "location"}, the unlucky ${value}% of requests all queue behind each other and skew into ${p99} ms while the typical request stays fast. That nonlinearity is why averages hide the pain — the tail feels the pile-up first.`,
  };
}

function evaluateHitRatio(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const hits = Math.round((1 - Math.exp(-value / 80)) * 1000) / 1000;
  const offloadPct = Math.round(hits * 100);
  const originPerSec = Math.round(12800 * (1 - hits));
  const status = offloadPct >= 80 ? "healthy" : offloadPct >= 55 ? "warning" : "critical";
  return {
    primaryMetricLabel: "Hit ratio",
    primaryMetricValue: `${offloadPct}%`,
    secondaryMetricLabel: "Requests still reaching the origin",
    secondaryMetricValue: `${originPerSec.toLocaleString("en-US")} of 12,800/s`,
    status,
    explanation: `A ${value} ${sandbox.unit} shelf answers roughly ${offloadPct}% of reads on its own, so only ${originPerSec.toLocaleString("en-US")} of every 12,800 requests per second bother the origin. Bigger shelf means fewer origin trips; but the shape of the access matters too — if reads are evenly spread rather than skewed, the same shelf protects far less.`,
  };
}

function evaluateSlo(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const quarterMinutes = 129600; // 90 days
  const availability = ((quarterMinutes - value) / quarterMinutes) * 100;
  const status = value <= 43 ? "healthy" : value <= 438 ? "warning" : "critical";
  const nines = availability >= 99.999 ? "5 nines" : availability >= 99.99 ? "4 nines" : availability >= 99.9 ? "3 nines" : "2 nines";
  return {
    primaryMetricLabel: "Availability",
    primaryMetricValue: `${formatPct(availability)}`,
    secondaryMetricLabel: "Budget used",
    secondaryMetricValue: `${Math.round((value / 43) * 100)}% of a 30-day 99.9% budget`,
    status,
    explanation: `${value} minutes of downtime per ${quarterMinutes.toLocaleString("en-US")} minutes works out to ${formatPct(availability)} — about ${nines}. Your error-budget math says ${Math.round((value / 43) * 100)}% of the classic 30-day 99.9% allowance is spent, and multiplying nines costs roughly 10× the operational effort each step.`,
  };
}

function formatPct(v: number): string {
  if (v >= 99.9999) return "99.9999%";
  if (v >= 99.999) return `${v.toFixed(3)}%`;
  if (v >= 99.99) return `${v.toFixed(3)}%`;
  if (v >= 99.9) return `${v.toFixed(2)}%`;
  return `${v.toFixed(1)}%`;
}

function evaluateKvMem(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const hbm = 80;
  const overflow = Math.max(0, value - hbm);
  const status = value <= 70 ? "healthy" : value <= hbm - 1 ? "warning" : "critical";
  return {
    primaryMetricLabel: "GPU memory used",
    primaryMetricValue: `${value} GB of ${hbm} GB`,
    secondaryMetricLabel: "Requests that must wait (or fail)",
    secondaryMetricValue: overflow > 0 ? `${overflow} GB worth of context` : "None",
    status,
    explanation: `Holding ${value} GB of KV cache on an 80 GB GPU leaves ${Math.max(0, hbm - value)} GB for model weights, activations, and other requests. Inside ~70% you run comfortably; near-full you're one long request away from an out-of-memory error — the honest reason context length is charged and served deliberately.`,
  };
}

function evaluateBatch(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const util = Math.round((1 - Math.exp(-value / 30)) * 100);
  const extraWait = Math.round(value * 0.8);
  const status = value <= 8 ? "warning" : value <= 64 ? "healthy" : value <= 128 ? "warning" : "critical";
  return {
    primaryMetricLabel: "GPU utilization",
    primaryMetricValue: `${util}%`,
    secondaryMetricLabel: "Extra wait added to p99",
    secondaryMetricValue: `+${extraWait} ms`,
    status,
    explanation: `Batching ${value} sequences at once keeps the GPU ${util}% busy - small batches waste the hardware's memory bandwidth, but very large ones add ${extraWait} ms of extra wait for the fastest request in the batch to finish. The sweet spot balances throughput against worst-case latency.`,
  };
}

function evaluateFuel(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const added = Math.round(value * 0.19 * 10) / 10;
  const status = value <= 40 ? "healthy" : value <= 70 ? "warning" : "critical";
  return {
    primaryMetricLabel: "Latency added by tenant plugins",
    primaryMetricValue: `+${added} ms`,
    secondaryMetricLabel: "Tenant plugin headroom",
    secondaryMetricValue: `${Math.max(0, 100 - value)}% of budget`,
    status,
    explanation: `Tenant plugin execution at this share of the budget adds about ${added} ms to each request's latency. Under 40% keeps p99 comfortably flat; past 70% the request hot path starts feeling plugin stalls, and the honest design caps fuel so one tenant's runaway plugin can't slow everyone else.`,
  };
}

function evaluateDrain(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const shedShare = clamp(Math.round(Math.pow(value / 10, 2.2) * 100), 0, 90);
  const criticalKept = clamp(100 - Math.round(value * 7), 10, 100);
  const status = value <= 3 ? "healthy" : value <= 6 ? "warning" : "critical";
  return {
    primaryMetricLabel: "Low-priority load shed",
    primaryMetricValue: `${shedShare}%`,
    secondaryMetricLabel: "Critical path still serving",
    secondaryMetricValue: `${criticalKept}%`,
    status,
    explanation: `At overload level ${value} of 10, the honest answer is to shed ${shedShare}% of low-priority work while keeping roughly ${criticalKept}% of the critical path alive. Shedding, draining, and graceful degradation are the three valves that let a struggling system back pressure the flood instead of collapsing.`,
  };
}

function evaluateDenied(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const served = Math.round((100 - value * 0.9) * 10) / 10;
  const status = value <= 15 ? "healthy" : value <= 45 ? "warning" : "critical";
  return {
    primaryMetricLabel: "Requests completing successfully",
    primaryMetricValue: `${Math.max(55, served)}%`,
    secondaryMetricLabel: "Requests stopped by the guard",
    secondaryMetricValue: `${value}%`,
    status,
    explanation: `With ${value}% of requests stopped by this guard, ${Math.max(55, Math.round(served))}% still complete. Sophisticated guards (session routing, health checks, idempotency, admission control) must be cheap enough that honest traffic barely notices, while still catching the pathological cases.`,
  };
}

/**
 * Analyzer strength 0-100: stronger normalization (lowercasing, stemming,
 * synonyms) buys recall but steadily burns precision, because distinct words
 * collapse onto the same term. Numbers are illustrative, not benchmarked.
 */
function evaluateNormalization(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const strength = clamp(Math.round(value), 0, 100);
  const recall = Math.round(clamp(35 + strength * 0.63, 0, 98));
  const precision = Math.round(clamp(99 - strength * 0.52, 0, 99));
  const status = strength <= 40 ? "healthy" : strength <= 70 ? "warning" : "critical";
  return {
    primaryMetricLabel: "Recall (relevant docs found)",
    primaryMetricValue: `${recall}%`,
    secondaryMetricLabel: "Precision (results actually relevant)",
    secondaryMetricValue: `${precision}%`,
    status,
    explanation: `At ${strength}% normalization, a query for 'run shoe' finds roughly ${recall}% of the documents that mention 'running shoes', and about ${precision}% of what it returns is genuinely relevant. Turning the dial up applies stemming, stop-word removal, and synonyms, so more word forms meet - but 'university' and 'universe' can collapse onto one stem. Tune per field: keep exact fields on keyword analysis and let prose fields carry the aggressive chain.`,
  };
}

/**
 * BM25 length penalty b in [0, 1]. Illustrative scores for the catalogue's
 * own example: a short, precise doc (3 mentions in 50 words) against a long,
 * verbose one (12 mentions in 2,000 words), with avgdl 500 and k1 1.2.
 * b = 0 ignores length entirely, so raw term frequency lets the verbose page
 * win; b = 1 fully normalizes by length. Numbers are illustrative, not a
 * benchmark.
 */
function evaluateBm25(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const b = clamp(value, 0, 1);
  const k1 = 1.2;
  const avgdl = 500;
  const score = (tf: number, dl: number): number =>
    (tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * dl) / avgdl));
  const shortScore = score(3, 50);
  const longScore = score(12, 2000);
  const shortWins = shortScore >= longScore;
  const status = b < 0.4 ? "critical" : b <= 0.6 ? "warning" : b <= 0.9 ? "healthy" : "warning";
  const verdict = shortWins
    ? "the short, precise document now outranks the long, padded one"
    : "the long, padded document still outranks the short, precise one";
  return {
    primaryMetricLabel: "Short precise doc (BM25 score)",
    primaryMetricValue: shortScore.toFixed(2),
    secondaryMetricLabel: "Long verbose doc (BM25 score)",
    secondaryMetricValue: longScore.toFixed(2),
    status,
    explanation: `With b = ${b.toFixed(2)}, ${verdict}: ${shortScore.toFixed(2)} vs ${longScore.toFixed(2)}. The b knob scales length normalization, so b = 0 ranks on term frequency alone (verbose pages win) and b = 1 fully divides by document length (genuinely long, topical pages get punished). The scorer's default sits near 0.75 because it usually balances the two; tune it against a labelled query set rather than by feel.`,
  };
}

/**
 * Share of queries that can use an index, 0-100. The remainder fall back to a
 * sequential scan, which is fine at 10k rows and fatal at 50M.
 */
function evaluateIndexScan(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const matching = clamp(Math.round(value), 0, 100);
  const scanning = 100 - matching;
  const rows = 50_000_000;
  const scannedRowsPerSec = Math.round(rows * (scanning / 100));
  const status = matching >= 90 ? "healthy" : matching >= 60 ? "warning" : "critical";
  return {
    primaryMetricLabel: "Queries served by the index",
    secondaryMetricLabel: "Queries falling back to a full scan",
    primaryMetricValue: `${matching}%`,
    secondaryMetricValue: `${scanning}%`,
    status,
    explanation: `When ${matching}% of queries match the index shape, the other ${scanning}% read every row: on a 50 million row table that is roughly ${scannedRowsPerSec.toLocaleString("en-US")} rows visited per 100 such queries. A sequential scan is honest work at small sizes and an outage at scale, which is why the leading-wildcard LIKE and mismatched sort orders deserve their own index or a search engine. Watch pg_stat_statements for the offenders.`,
  };
}

/**
 * Secondary indexes on one hot table, 0-20. Every INSERT, UPDATE, and DELETE
 * writes the heap row and then one leaf insert per index whose columns change,
 * so write cost grows linearly with the number of indexes carried. Numbers are
 * illustrative, not benchmarked.
 */
function evaluateIndexTax(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const indexes = Math.round(clamp(value, 0, sandbox.max));
  const writes = indexes + 1;
  const writeMs = Math.round((1.0 + indexes * 0.18) * 10) / 10;
  const status = indexes <= 5 ? "healthy" : indexes <= 12 ? "warning" : "critical";
  const indexWord = indexes === 1 ? "index" : "indexes";
  return {
    primaryMetricLabel: "Write latency per INSERT",
    primaryMetricValue: `${writeMs.toFixed(1)} ms`,
    secondaryMetricLabel: "B-tree writes per change",
    secondaryMetricValue: `${writes} (heap + ${indexes} ${indexWord})`,
    status,
    explanation: `With ${indexes} secondary ${indexWord} on the table, every INSERT, UPDATE, and DELETE does ${writes} B-tree writes: one for the row itself plus one for each index that touches the changed columns. That puts a single write near ${writeMs.toFixed(1)} ms, so bulk loads and hot-row updates cost roughly ${writes}× the work of an unindexed table while a handful of well-chosen indexes keeps each write under 2 ms. Past roughly a dozen, write latency and WAL volume start to dominate - the honest fix is dropping indexes no query uses (idx_scan = 0 in pg_stat_user_indexes) and preferring covering indexes that serve several reads at once.`,
  };
}

/**
 * Bloom filter bits per element, 1-32. For each setting the hash count is the
 * classic optimum k = (m/n) ln 2, and the false-positive rate is
 * (1 - e^(-k n/m))^k. Numbers are textbook formulas, not a benchmark.
 */
function evaluateBloomFp(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const bits = Math.round(clamp(value, 1, 32));
  const hashes = Math.max(1, Math.round(bits * Math.LN2));
  const fpr = Math.pow(1 - Math.exp(-hashes / bits), hashes);
  const memoryMb = bits / 8; // per one million keys
  const status = bits >= 8 ? "healthy" : bits >= 5 ? "warning" : "critical";
  const absentShare = Math.round((1 - fpr) * 1000) / 10;
  return {
    primaryMetricLabel: "False-positive rate",
    primaryMetricValue: formatRate(fpr * 100),
    secondaryMetricLabel: "Memory per 1M keys",
    secondaryMetricValue: `${memoryMb.toFixed(2)} MB`,
    status,
    explanation: `At ${bits} ${sandbox.unit} per element the filter runs its optimal ${hashes} hashes, so roughly ${formatRate(fpr * 100)} of lookups for items that were never added come back "probably present". With ${bits} bits per element that costs about ${memoryMb.toFixed(2)} MB per million keys - a few thousand times smaller than keeping the keys themselves. "Definitely absent" stays exact at every setting (${absentShare}% of genuine misses here), which is why the filter sits in front of an expensive lookup: a negative answer usually saves the disk or database trip, and the rare false positive only costs one unnecessary check.`,
  };
}

function formatRate(pct: number): string {
  if (pct >= 10) return `${pct.toFixed(0)}%`;
  if (pct >= 1) return `${pct.toFixed(1)}%`;
  if (pct >= 0.1) return `${pct.toFixed(2)}%`;
  if (pct >= 0.001) return `${pct.toFixed(3)}%`;
  return `${pct.toExponential(1)}%`;
}

function evaluateCorpusScan(sandbox: LessonSandboxSpec, value: number): SandboxMetric {
  const docs = Math.max(0, Math.round(value));
  // Assumptions stated in the explanation: 1 KB per document, a sequential
  // read at ~1 GB/s, and a sharded term dictionary that answers a lookup in a
  // few milliseconds regardless of corpus size.
  const gigabytes = (docs * 1024) / 1e9;
  const scanMs = gigabytes * 1000;
  const lookupMs = 2 + docs * 1e-7;
  const ratio = scanMs / lookupMs;
  const status = scanMs <= 100 ? "healthy" : scanMs <= 3000 ? "warning" : "critical";
  const scanLabel = scanMs >= 1000 ? `${(scanMs / 1000).toFixed(1)} s` : `${Math.max(1, Math.round(scanMs))} ms`;
  const lookupLabel = lookupMs < 10 ? `${lookupMs.toFixed(1)} ms` : `${Math.round(lookupMs)} ms`;
  return {
    primaryMetricLabel: "Full-scan time per search",
    primaryMetricValue: scanLabel,
    secondaryMetricLabel: "Inverted-index lookup",
    secondaryMetricValue: lookupLabel,
    status,
    explanation: `At ${docs.toLocaleString("en-US")} ${sandbox.unit} the table holds roughly ${gigabytes.toFixed(1)} GB (assuming 1 KB per document) and a LIKE scan reads all of it, so one search costs about ${scanLabel}. The index reads a term dictionary entry and a posting list instead, staying near ${lookupLabel} no matter how large the corpus grows — about ${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}× faster here. Below a few hundred milliseconds a scan is honest work; past seconds it is an outage that every user pays for with every keystroke.`,
  };
}

const KIND_EVALUATORS: Record<SandboxKind, (sandbox: LessonSandboxSpec, value: number) => SandboxMetric> = {
  latency: evaluateLatency,
  capacity: evaluateCapacity,
  retry: evaluateRetry,
  receipt: evaluateReceipt,
  plot: evaluatePlot,
  quorum: evaluateQuorum,
  fanout: evaluateFanout,
  queue: evaluateQueue,
  rateLimit: evaluateRateLimit,
  cost: evaluateCost,
  outbox: evaluateOutbox,
  tail: evaluateTail,
  hitRatio: evaluateHitRatio,
  slo: evaluateSlo,
  kvMem: evaluateKvMem,
  batch: evaluateBatch,
  fuel: evaluateFuel,
  denied: evaluateDenied,
  drain: evaluateDrain,
  normalization: evaluateNormalization,
  bm25: evaluateBm25,
  indexScan: evaluateIndexScan,
  corpusScan: evaluateCorpusScan,
  indexTax: evaluateIndexTax,
  bloomFp: evaluateBloomFp,
};

/**
 * Pure evaluation of a lesson sandbox: takes the sandbox spec and the user's
 * slider value, returns live beginner-friendly feedback with real numbers.
 */
export function evaluateLessonSandbox(
  sandbox: LessonSandboxSpec,
  value: number,
): SandboxMetric & { primaryMetricValue: string } {
  const kind = sandbox.kind;
  if (!kind) {
    return {
      primaryMetricLabel: "Preview metric",
      primaryMetricValue: `${value} ${sandbox.unit}`,
      secondaryMetricLabel: "Explore the canvas",
      secondaryMetricValue: "—",
      status: "healthy",
      explanation: `At ${value} ${sandbox.unit}, add the listed canvas boxes and watch live request flows through the playground.`,
    };
  }
  return KIND_EVALUATORS[kind](sandbox, value);
}

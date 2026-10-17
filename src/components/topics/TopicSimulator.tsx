'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from '@/components/ui/icons';
import type { Topic, TopicParam } from '@/data/topics';
import {
  nodeColor,
  simulateCache,
  simulateCdn,
  simulateConsistentHashing,
  simulateLoadBalancing,
  simulateRateLimit,
  simulateSharding,
  type LBAlgorithm,
} from './simCore';

type ParamState = Record<string, number | string>;

const num = (s: ParamState, id: string) => Number(s[id] ?? 0);
const str = (s: ParamState, id: string) => String(s[id] ?? '');

function defaultsFor(topic: Topic): ParamState {
  return Object.fromEntries(topic.params.map((p) => [p.id, p.default]));
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

function Control({
  param,
  value,
  onChange,
}: {
  param: TopicParam;
  value: number | string;
  onChange: (value: number | string) => void;
}) {
  if (param.kind === 'choice') {
    return (
      <div>
        <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-content-tertiary">{param.label}</p>
        <div className="flex flex-wrap gap-1.5">
          {param.choices?.map((choice) => {
            const active = value === choice.value;
            return (
              <button
                key={choice.value}
                type="button"
                onClick={() => onChange(choice.value)}
                className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  active
                    ? 'border-brass/60 bg-brass/15 text-content'
                    : 'border-line bg-app-raised/50 text-content-secondary hover:border-line-strong hover:text-content'
                }`}
              >
                {choice.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-content-tertiary">{param.label}</p>
        <p className="text-[13px] font-semibold tabular-nums text-content">
          {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2) : value}
          {param.unit ? <span className="ml-0.5 text-content-tertiary">{param.unit}</span> : null}
        </p>
      </div>
      <input
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={Number(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-brass"
        aria-label={param.label}
      />
    </div>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'good' | 'warn' }) {
  const toneClass = tone === 'good' ? 'text-success' : tone === 'warn' ? 'text-danger' : 'text-content';
  return (
    <div className="rounded-xl border border-line bg-app-raised/40 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.14em] text-content-tertiary">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Visuals                                                            */
/* ------------------------------------------------------------------ */

function HashRingView({ result }: { result: ReturnType<typeof simulateConsistentHashing> }) {
  const cx = 170;
  const cy = 170;
  const r = 124;
  const polar = (angle: number, radius: number) => {
    const theta = angle * Math.PI * 2 - Math.PI / 2;
    return [cx + radius * Math.cos(theta), cy + radius * Math.sin(theta)] as const;
  };
  const nodeAngles = result.counts.map((_, i) => {
    const angles = result.vnodes.filter((v) => v.node === i).map((v) => v.angle);
    if (!angles.length) return 0;
    return angles.reduce((a, b) => a + b, 0) / angles.length;
  });

  return (
    <svg viewBox="0 0 340 340" className="h-full w-full">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgb(var(--line-strong))" strokeWidth={1} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgb(var(--accent) / 0.22)" strokeWidth={6} />
      {result.vnodes.map((v, i) => {
        const [x, y] = polar(v.angle, r);
        return <circle key={i} cx={x} cy={y} r={3.4} fill={nodeColor(v.node)} />;
      })}
      {result.keys.map((k, i) => {
        const [x, y] = polar(k.angle, r - 22);
        return (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            r={2.6}
            fill={nodeColor(k.node)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            transition={{ delay: (i % 24) * 0.02, duration: 0.3 }}
          />
        );
      })}
      {nodeAngles.map((angle, i) => {
        const [x, y] = polar(angle, r + 20);
        return (
          <text
            key={i}
            x={x}
            y={y}
            fill={nodeColor(i)}
            fontSize="11"
            fontFamily="ui-monospace, monospace"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {result.counts[i]}
          </text>
        );
      })}
    </svg>
  );
}

function LBView({ result }: { result: ReturnType<typeof simulateLoadBalancing> }) {
  const max = Math.max(...result.served, 1);
  const barW = 34;
  const gap = 14;
  const width = result.served.length * (barW + gap);
  return (
    <svg viewBox={`0 0 ${Math.max(width, 260)} 260`} className="h-full w-full">
      <line x1={0} y1={210} x2="100%" y2={210} stroke="rgb(var(--line-strong))" strokeWidth={1} />
      {result.served.map((value, i) => {
        const h = (value / max) * 180;
        const x = i * (barW + gap) + gap / 2;
        return (
          <g key={i}>
            <motion.rect
              x={x}
              width={barW}
              rx={5}
              fill={nodeColor(i)}
              fillOpacity={0.85}
              initial={false}
              animate={{ y: 210 - h, height: Math.max(2, h) }}
              transition={{ type: 'spring', stiffness: 160, damping: 22 }}
            />
            <text x={x + barW / 2} y={230} fill="rgb(var(--content-tertiary))" fontSize="10" textAnchor="middle" fontFamily="ui-monospace, monospace">
              {i + 1}
            </text>
            <text x={x + barW / 2} y={246} fill="rgb(var(--content-secondary))" fontSize="10" textAnchor="middle" fontFamily="ui-monospace, monospace">
              {value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function CacheView({ result }: { result: ReturnType<typeof simulateCache> }) {
  const pct = Math.round(result.hitRatio * 100);
  const circumference = 2 * Math.PI * 54;
  const points = result.series.length
    ? result.series.map((v, i) => `${(i / Math.max(1, result.series.length - 1)) * 300},${120 - v * 100}`).join(' ')
    : '';
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 sm:flex-row">
      <svg viewBox="0 0 140 140" className="h-40 w-40 shrink-0">
        <circle cx="70" cy="70" r="54" fill="none" stroke="rgb(var(--line-strong))" strokeWidth={12} />
        <motion.circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: circumference * (1 - result.hitRatio) }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          transform="rotate(-90 70 70)"
        />
        <text x="70" y="66" fill="rgb(var(--content))" fontSize="26" fontWeight="600" textAnchor="middle" fontFamily="var(--font-outfit), sans-serif">
          {pct}%
        </text>
        <text x="70" y="86" fill="rgb(var(--content-tertiary))" fontSize="10" textAnchor="middle" fontFamily="ui-monospace, monospace">
          HIT RATE
        </text>
      </svg>
      <svg viewBox="0 0 300 140" className="h-36 w-full min-w-0 flex-1">
        <line x1="0" y1="120" x2="300" y2="120" stroke="rgb(var(--line))" strokeWidth={1} />
        <polyline points={points} fill="none" stroke="rgb(var(--accent))" strokeWidth={2} />
        <text x="4" y="16" fill="rgb(var(--content-tertiary))" fontSize="10" fontFamily="ui-monospace, monospace">
          hit rate over time
        </text>
      </svg>
    </div>
  );
}

function RateLimitView({ result }: { result: ReturnType<typeof simulateRateLimit> }) {
  const maxTokens = Math.max(...result.series.map((s) => s.tokens), 1);
  const points = result.series
    .map((s, i) => `${(i / Math.max(1, result.series.length - 1)) * 300},${120 - (s.tokens / maxTokens) * 100}`)
    .join(' ');
  const total = result.allowed + result.rejected || 1;
  const allowedPct = (result.allowed / total) * 100;
  return (
    <div className="flex h-full flex-col gap-5 py-2">
      <svg viewBox="0 0 300 140" className="w-full">
        <line x1="0" y1="120" x2="300" y2="120" stroke="rgb(var(--line))" strokeWidth={1} />
        <polyline points={points} fill="none" stroke="rgb(var(--accent))" strokeWidth={2} />
        <text x="4" y="16" fill="rgb(var(--content-tertiary))" fontSize="10" fontFamily="ui-monospace, monospace">
          bucket level over time
        </text>
      </svg>
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        <motion.div className="h-full bg-success" initial={false} animate={{ width: `${allowedPct}%` }} transition={{ type: 'spring', stiffness: 140, damping: 22 }} />
        <div className="h-full flex-1 bg-danger/70" />
      </div>
      <div className="flex justify-between text-[11px] font-medium">
        <span className="text-success">admitted {result.allowed}</span>
        <span className="text-danger">shed {result.rejected}</span>
      </div>
    </div>
  );
}

function ShardView({ result }: { result: ReturnType<typeof simulateSharding> }) {
  const max = Math.max(...result.counts, 1);
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      {result.counts.map((value, i) => {
        const hot = i === result.hotIndex;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-[11px] font-medium text-content-tertiary">shard {i + 1}</span>
            <div className="h-5 flex-1 overflow-hidden rounded-md border border-line bg-app-raised/40">
              <motion.div
                className="h-full rounded-md"
                style={{ background: hot ? 'rgb(var(--danger))' : nodeColor(i) }}
                initial={false}
                animate={{ width: `${(value / max) * 100}%` }}
                transition={{ type: 'spring', stiffness: 150, damping: 22 }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-content-secondary">{value}</span>
          </div>
        );
      })}
    </div>
  );
}

function CdnView({ result, edges }: { result: ReturnType<typeof simulateCdn>; edges: number }) {
  const max = Math.max(result.origin, result.edge, 1);
  const bar = (value: number, label: string, color: string) => (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-[11px] text-content-tertiary">{label}</span>
      <div className="h-5 flex-1 overflow-hidden rounded-md border border-line bg-app-raised/40">
        <motion.div className="h-full rounded-md" style={{ background: color }} initial={false} animate={{ width: `${(value / max) * 100}%` }} transition={{ type: 'spring', stiffness: 150, damping: 22 }} />
      </div>
      <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-content-secondary">{Math.round(value)}ms</span>
    </div>
  );
  return (
    <div className="flex h-full flex-col justify-center gap-5">
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-semibold tabular-nums text-brass">{Math.round(result.effective)}ms</span>
        <span className="text-[12px] text-content-tertiary">blended latency</span>
      </div>
      <div className="space-y-3">
        {bar(result.edge, 'Edge hit', 'rgb(var(--accent))')}
        {bar(result.origin, 'Origin miss', 'rgb(var(--info))')}
      </div>
      <div className="flex gap-3">
        {Array.from({ length: Math.max(edges, 1) }).map((_, i) => (
          <span key={i} className="flex items-center gap-1.5 text-[11px] text-content-secondary">
            <span className="h-2 w-2 rounded-full bg-brass" /> edge {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

export function TopicSimulator({ topic }: { topic: Topic }) {
  const [state, setState] = useState<ParamState>(() => defaultsFor(topic));
  const set = (id: string, value: number | string) => setState((s) => ({ ...s, [id]: value }));
  const reset = () => setState(defaultsFor(topic));

  const sim = useMemo(() => {
    if (!topic.kind) return null;
    switch (topic.kind) {
      case 'consistent-hashing':
        return { kind: topic.kind, data: simulateConsistentHashing(num(state, 'nodes'), num(state, 'keys'), num(state, 'replicas')) };
      case 'load-balancing':
        return { kind: topic.kind, data: simulateLoadBalancing(num(state, 'servers'), num(state, 'rps'), str(state, 'algorithm') as LBAlgorithm) };
      case 'cache':
        return { kind: topic.kind, data: simulateCache(num(state, 'cacheSize'), num(state, 'keySpace'), num(state, 'skew'), num(state, 'requests')) };
      case 'rate-limit':
        return { kind: topic.kind, data: simulateRateLimit(num(state, 'rate'), num(state, 'burst'), num(state, 'requestRps'), num(state, 'seconds')) };
      case 'sharding':
        return { kind: topic.kind, data: simulateSharding(num(state, 'shards'), num(state, 'keys'), str(state, 'strategy') as 'hash' | 'range', num(state, 'skew')) };
      case 'cdn':
        return { kind: topic.kind, data: simulateCdn(num(state, 'edges'), num(state, 'hitRatio') / 100, num(state, 'originLatency'), num(state, 'edgeLatency')) };
    }
  }, [topic.kind, state]);

  const metrics = useMemo(() => {
    if (!sim) return [];
    switch (sim.kind) {
      case 'consistent-hashing': {
        const d = sim.data;
        return [
          { label: 'Max shard / avg', value: `${Math.round(d.max)} vs ${d.avg.toFixed(1)}` },
          { label: 'Imbalance', value: `${Math.round(d.imbalance)}%`, tone: d.imbalance > 40 ? ('warn' as const) : ('good' as const) },
          { label: 'Virtual nodes', value: `${d.vnodes.length}` },
        ];
      }
      case 'load-balancing': {
        const d = sim.data;
        return [
          { label: 'Peak server / avg', value: `${d.max} vs ${Math.round(d.avg)}` },
          { label: 'Skew', value: `${Math.round(d.skew)}%`, tone: d.skew > 30 ? ('warn' as const) : ('good' as const) },
          { label: 'Backends', value: `${d.served.length}` },
        ];
      }
      case 'cache': {
        const d = sim.data;
        return [
          { label: 'Hit rate', value: `${Math.round(d.hitRatio * 100)}%`, tone: d.hitRatio > 0.7 ? ('good' as const) : ('warn' as const) },
          { label: 'Hits / misses', value: `${d.hits} / ${d.misses}` },
          { label: 'Evictions', value: `${d.evictions}` },
        ];
      }
      case 'rate-limit': {
        const d = sim.data;
        return [
          { label: 'Admitted', value: `${d.allowed}`, tone: 'good' as const },
          { label: 'Shed', value: `${d.rejected}`, tone: d.rejectRate > 0.2 ? ('warn' as const) : ('default' as const) },
          { label: 'Shed rate', value: `${Math.round(d.rejectRate * 100)}%` },
        ];
      }
      case 'sharding': {
        const d = sim.data;
        return [
          { label: 'Hottest shard', value: `${d.max} keys` },
          { label: 'Coldest shard', value: `${d.min} keys` },
          { label: 'Imbalance', value: `${Math.round(d.imbalance)}%`, tone: d.imbalance > 50 ? ('warn' as const) : ('good' as const) },
        ];
      }
      case 'cdn': {
        const d = sim.data;
        return [
          { label: 'Offloaded from origin', value: `${Math.round(d.offload)}%`, tone: 'good' as const },
          { label: 'Blended latency', value: `${Math.round(d.effective)}ms` },
          { label: 'Origin miss latency', value: `${Math.round(d.origin)}ms` },
        ];
      }
    }
  }, [sim]);

  if (!sim) return null;

  return (
    <div className="rounded-2xl border border-line bg-app/50 p-4 shadow-card sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.18em] text-content-tertiary">Live sandbox</p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-app-raised/50 px-2.5 py-1.5 text-[11px] font-medium text-content-secondary transition-colors hover:border-line-strong hover:text-content"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-line bg-app-raised/30 p-3 lg:col-span-3">
          {sim.kind === 'consistent-hashing' && <HashRingView result={sim.data} />}
          {sim.kind === 'load-balancing' && <LBView result={sim.data} />}
          {sim.kind === 'cache' && <CacheView result={sim.data} />}
          {sim.kind === 'rate-limit' && <RateLimitView result={sim.data} />}
          {sim.kind === 'sharding' && <ShardView result={sim.data} />}
          {sim.kind === 'cdn' && <CdnView result={sim.data} edges={num(state, 'edges')} />}
        </div>

        <div className="space-y-5 lg:col-span-2">
          <div className="grid grid-cols-3 gap-2">
            {metrics.map((m) => (
              <Metric key={m.label} label={m.label} value={m.value} tone={m.tone} />
            ))}
          </div>
          <div className="space-y-4">
            {topic.params.map((param) => (
              <Control key={param.id} param={param} value={state[param.id]} onChange={(v) => set(param.id, v)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

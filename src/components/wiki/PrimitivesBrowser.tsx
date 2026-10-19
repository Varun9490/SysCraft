'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle2, Clock, Cpu, FlaskConical, HardDrive, Search, ShieldCheck, Sparkles, Wrench, XCircle } from '@/components/ui/icons';
import { Markdown } from '@/components/Markdown';
import { ShinyText } from '@/components/ui/reactbits/ShinyText';
import { SEED_RESOURCES } from '@/data/seedResources';
import { canvasHrefWithAdd } from '@/store/canvasDeepLink';
import type { ResourceCategory, ResourceDefinition } from '@/types/resource';

/**
 * The primitives library: every canvas block (32 cloud + Kubernetes services)
 * exposing its full encyclopedia article, production-realistic defaults,
 * trade-off matrix, and when-to-use guidance. Same single source of truth the
 * NodeInspector and simulator read, so the docs can never drift from the sim.
 */

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  edge: "Edge & Delivery",
  compute: "Compute",
  api: "API Layer",
  storage: "Object Storage",
  cache: "Caching",
  messaging: "Messaging",
  streaming: "Streaming",
  database: "Databases",
  search: "Search",
  security: "Security",
  observability: "Observability",
  network: "Networking",
  ai_llm: "AI & LLM",
  vector_db: "Vector DB",
  serverless: "Serverless",
};

const CATEGORY_ORDER: ResourceCategory[] = [
  'edge', 'network', 'api', 'compute', 'serverless', 'cache', 'database',
  'storage', 'streaming', 'messaging', 'search', 'vector_db', 'ai_llm',
  'observability', 'security',
];

const ENGINE_LABELS: Record<string, string> = {
  none: 'Stateless',
  b_tree: 'B-tree',
  lsm_tree: 'LSM tree',
  in_memory: 'In-memory',
  append_log: 'Append log',
  columnar: 'Columnar',
};

const CONSISTENCY_LABELS: Record<string, string> = {
  linearizable: 'Linearizable',
  quorum: 'Quorum',
  eventual: 'Eventual',
};

function formatRps(rps: number): string {
  if (rps >= 1_000_000) return `${(rps / 1_000_000).toFixed(1)}M`;
  if (rps >= 1_000) return `${Math.round(rps / 1000)}K`;
  return String(rps);
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-zinc-800/60 py-1.5 text-[12px] first:border-t-0">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-medium tabular-nums text-zinc-200">{value}</span>
    </div>
  );
}

export function PrimitivesBrowser({ primitives = SEED_RESOURCES }: { primitives?: ResourceDefinition[] }) {
  const [category, setCategory] = useState<ResourceCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(() => primitives[0]?.id ?? '');
  // The id carried by ?resource= — tracked separately so the canvas CTA
  // links to the primitive the reader actually deep-linked to, not the one
  // that happened to be rendered before the effect ran.
  const [deepLinkId, setDeepLinkId] = useState<string | null>(null);

  // ?resource=<id> deep-link — read on mount only, SSR-safe.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('resource');
    if (id && primitives.some((p) => p.id === id)) {
      setSelectedId(id);
      setDeepLinkId(id);
    }
  }, [primitives]);

  const select = (id: string) => {
    setSelectedId(id);
    window.history.replaceState(null, '', `/wiki/primitives?resource=${encodeURIComponent(id)}`);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return primitives.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    });
  }, [primitives, category, query]);

  const selected = primitives.find((p) => p.id === selectedId) ?? filtered[0] ?? primitives[0];

  const counts = useMemo(() => {
    const map = new Map<ResourceCategory, number>();
    for (const p of primitives) {
      map.set(p.category, (map.get(p.category) ?? 0) + 1);
    }
    return map;
  }, [primitives]);

  if (!selected) {
    return <p className="section-container py-16 text-center text-[13px] text-zinc-500">No primitives match.</p>;
  }

  return (
    <div>
      <header className="section-container relative pb-8 pt-16 md:pt-20">
        <span className="eyebrow">
          <ShinyText text="The building blocks" />
        </span>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tighter text-content md:text-5xl">
              Infrastructure primitives
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-content-secondary">
              Every canvas block, fully documented: per-block latency and cost defaults, hardening scores, trade-off
              matrices, and a written engineering walkthrough. The article you read here is the exact definition the
              simulator's 20 Hz physics run against.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line/70 bg-line/60">
            <div className="bg-app/70 px-5 py-4">
              <p className="text-2xl font-semibold tracking-tight text-content">{primitives.length}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-content-tertiary">Primitives</p>
            </div>
            <div className="bg-app/70 px-5 py-4">
              <p className="text-2xl font-semibold tracking-tight text-content">{counts.size}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-content-tertiary">Categories</p>
            </div>
          </div>
        </div>
      </header>

      <div className="section-container pb-20">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search primitives, e.g. “redis” or “lambda”…"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/70 py-2.5 pl-10 pr-4 text-[13.5px] text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-600"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                category === 'all'
                  ? 'border-brass/60 bg-brass/10 text-brass-bright'
                  : 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
              }`}
            >
              All · {primitives.length}
            </button>
            {CATEGORY_ORDER.map((c) => {
              const count = counts.get(c) ?? 0;
              if (count === 0) return null;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    category === c
                      ? 'border-brass/60 bg-brass/10 text-brass-bright'
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                  }`}
                >
                  {CATEGORY_LABELS[c]} · {count}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          {/* List rail */}
          <aside className="max-h-[70vh] space-y-1.5 overflow-y-auto pr-1" aria-label="Primitive list">
            {filtered.map((p, i) => {
              const active = p.id === selected.id;
              return (
                <div key={p.id} className="relative">
                  <button
                    type="button"
                    onClick={() => select(p.id)}
                    className={`wiki-pop-item w-full rounded-xl border px-3.5 py-3 pr-24 text-left transition-all ${
                      active
                        ? 'border-brass/50 bg-brass/[0.07]'
                        : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-600 hover:bg-zinc-900/60'
                    }`}
                    style={{ animationDelay: `${Math.min(i * 30, 420)}ms` }}
                  >
                    <span className={`block truncate text-[13px] font-semibold ${active ? 'text-brass-bright' : 'text-zinc-100'}`}>
                      {p.name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-[10.5px] text-zinc-500">
                      <span>{CATEGORY_LABELS[p.category]}</span>
                      ·
                      <span className="tabular-nums">{formatRps(p.defaults.baseThroughputRps)} RPS</span>
                      ·
                      <span className="tabular-nums">${p.defaults.costPerHourUsd.toFixed(2)}/hr</span>
                    </span>
                  </button>
                  <Link
                    href={canvasHrefWithAdd([p.id])}
                    title={`Add ${p.name} to the canvas`}
                    aria-label={`Add ${p.name} to the canvas`}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10.5px] font-semibold text-zinc-300 transition-colors hover:border-brass/60 hover:text-brass-bright"
                  >
                    + Canvas
                  </Link>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="p-4 text-center text-[12.5px] text-zinc-500">No primitives match that search.</p>
            )}
          </aside>

          {/* Article pane */}
          <article key={selected.id} className="wiki-pop min-w-0">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass">
                    {CATEGORY_LABELS[selected.category]} · {selected.id}
                  </p>
                  <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-zinc-50">{selected.name}</h2>
                  <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-zinc-300">{selected.description}</p>
                </div>
                <Link
                  href={canvasHrefWithAdd([deepLinkId ?? selected.id])}
                  className="group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brass px-4 py-2 text-[12.5px] font-semibold text-zinc-950 transition-transform hover:scale-[1.03]"
                >
                  <FlaskConical size={14} />
                  Add to canvas
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              {/* Stat strip */}
              <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800/70 sm:grid-cols-4">
                {[
                  { label: 'Throughput headroom', value: `${formatRps(selected.defaults.baseThroughputRps)} RPS` },
                  { label: 'P50 / P95 / P99', value: `${selected.defaults.baseP50Ms}/${selected.defaults.baseP95Ms}/${selected.defaults.baseP99Ms} ms` },
                  { label: 'Cost (per replica-hr)', value: `$${selected.defaults.costPerHourUsd.toFixed(2)}` },
                  { label: 'Hardening score', value: `${selected.defaults.securityScore}/100` },
                ].map((stat) => (
                  <div key={stat.label} className="bg-zinc-950 px-4 py-3">
                    <p className="text-[15px] font-semibold tabular-nums text-zinc-50">{stat.value}</p>
                    <p className="mt-0.5 text-[9.5px] uppercase tracking-[0.12em] text-zinc-500">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Spec sheet */}
              <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1fr]">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
                  <p className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    <Wrench size={12} /> Runtime shape
                  </p>
                  <SpecRow label="Replicas per instance" value={String(selected.defaults.replicationFactor)} />
                  <SpecRow label="vCPU / replica" value={`${selected.defaults.vcpu} vCPU`} />
                  <SpecRow label="Memory / replica" value={`${selected.defaults.memoryGb} GiB`} />
                  <SpecRow label="Max concurrency" value={String(selected.defaults.maxConcurrency)} />
                  <SpecRow label="Write ratio" value={`${Math.round(selected.defaults.writeRatio * 100)}%`} />
                  <SpecRow label="Storage engine" value={ENGINE_LABELS[selected.defaults.storageEngine] ?? selected.defaults.storageEngine} />
                  <SpecRow label="Consistency model" value={CONSISTENCY_LABELS[selected.defaults.consistency] ?? selected.defaults.consistency} />
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
                  <p className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    <ShieldCheck size={12} /> Reliability posture
                  </p>
                  <SpecRow label="Steady-state availability" value={`${(selected.defaults.availability * 100).toFixed(2).replace(/\.?0+$/, '')}%`} />
                  <SpecRow label="Ingress rate limit" value={`${formatRps(selected.defaults.rateLimitRps)} RPS`} />
                  <SpecRow label="Cache hit rate" value={`${Math.round(selected.defaults.cacheHitRate * 100)}%`} />
                  <SpecRow label="Default region" value={selected.defaults.region} />
                  <SpecRow label="Multi-AZ" value={selected.defaults.multiAz ? 'Yes' : 'No'} />
                  <SpecRow label="Stroke sketch style" value={selected.fillStyle} />
                </div>
              </div>

              {/* Article */}
              <div className="mt-7">
                <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  <BookOpen size={12} /> Engineering walkthrough
                </p>
                <Markdown source={selected.encyclopediaMarkdown} />
              </div>

              {/* Trade-offs */}
              {selected.tradeOffs.length > 0 && (
                <div className="mt-7">
                  <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Trade-off matrix</p>
                  <div className="overflow-x-auto rounded-xl border border-zinc-800">
                    <table className="w-full text-left text-[12px]">
                      <thead>
                        <tr className="bg-zinc-900 text-[10.5px] uppercase tracking-wider text-zinc-400">
                          <th scope="col" className="px-3 py-2">Dimension</th>
                          <th scope="col" className="px-3 py-2">Option A</th>
                          <th scope="col" className="px-3 py-2">Option B</th>
                          <th scope="col" className="px-3 py-2">Pick</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.tradeOffs.map((row) => (
                          <tr key={row.dimension} className="border-t border-zinc-800/70 odd:bg-zinc-950 even:bg-zinc-900/40">
                            <td className="px-3 py-2 font-medium text-zinc-200">{row.dimension}</td>
                            <td className="px-3 py-2 text-zinc-400">{row.optionA}</td>
                            <td className="px-3 py-2 text-zinc-400">{row.optionB}</td>
                            <td className="px-3 py-2 text-emerald-300/90">{row.recommendation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* When to use / avoid */}
              <div className="mt-7 grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                    <CheckCircle2 size={13} /> Use when
                  </p>
                  <ul className="mt-2.5 space-y-1.5">
                    {selected.whenToUse.map((entry) => (
                      <li key={entry} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-zinc-300">
                        <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
                        {entry}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-red-300">
                    <XCircle size={13} /> Avoid when
                  </p>
                  <ul className="mt-2.5 space-y-1.5">
                    {selected.whenNotToUse.map((entry) => (
                      <li key={entry} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-zinc-300">
                        <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-red-400" aria-hidden="true" />
                        {entry}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {selected.scalingNotes && (
                <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-sky-900/50 bg-sky-950/20 p-4">
                  <Sparkles size={14} className="mt-0.5 shrink-0 text-sky-300" />
                  <p className="text-[12.5px] leading-relaxed text-zinc-300">
                    <span className="font-semibold text-sky-200">Scaling note · </span>
                    {selected.scalingNotes}
                  </p>
                </div>
              )}

              <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-zinc-800 pt-4 text-[11.5px] text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <Cpu size={12} /> Simulated at 20 Hz in the worker
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={12} /> Defaults mirror production shapes
                </span>
                <Link href={canvasHrefWithAdd([deepLinkId ?? selected.id])} className="ml-auto inline-flex items-center gap-1.5 text-sky-300 hover:text-sky-200">
                  <HardDrive size={12} /> Build with it on the canvas <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

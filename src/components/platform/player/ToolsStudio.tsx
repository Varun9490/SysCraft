'use client';

import Link from "next/link";
import { useMemo, useState } from "react";
import { Gauge, Search, ShieldCheck } from "@/components/ui/icons";
import {
  decodeNotation,
  estimateCapacity,
  estimateErrorBudget,
  estimateKvCache,
  type CapacityInput,
  type KvCacheInput,
} from "@/learning/platform/calculators";
import { SECURITY_CHECKLIST, type SecurityComponent } from "@/learning/platform/securityChecklist";

function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[12px] font-medium text-content-secondary">{label}</label>
      <div className="mt-1.5 flex items-center rounded-xl border border-line bg-app px-3">
        <input
          id={id}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full bg-transparent py-2.5 text-[13px] text-content focus:outline-none"
        />
        {suffix ? <span className="shrink-0 font-mono text-[11px] text-content-tertiary">{suffix}</span> : null}
      </div>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/70 py-2.5 last:border-b-0">
      <span className="text-[12px] text-content-secondary">{label}</span>
      <span className="font-mono text-[13px] text-brass">{value}</span>
    </div>
  );
}

function Notes({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-4 space-y-1.5 text-[12px] leading-relaxed text-content-tertiary" data-cursor="read">
      {items.map((item) => (
        <li key={item}>— {item}</li>
      ))}
    </ul>
  );
}

const COMPONENT_LABELS: Record<SecurityComponent, string> = {
  edge: "Edge and transport",
  api: "API and identity",
  data: "Data and storage",
  queue: "Queues and streams",
  k8s: "Kubernetes",
  llm: "Model-powered systems",
};

const COMPONENT_ORDER: SecurityComponent[] = ["edge", "api", "data", "queue", "k8s", "llm"];

export function ToolsStudio() {
  const [capacity, setCapacity] = useState<CapacityInput>({
    dau: 100000,
    requestsPerUserPerDay: 12,
    readWriteRatio: 0.9,
    peakFactor: 5,
    payloadKb: 8,
    retentionDays: 365,
  });
  const [kv, setKv] = useState<KvCacheInput>({
    paramsBillion: 70,
    precisionBits: 16,
    layers: 80,
    kvHeads: 8,
    headDim: 128,
    contextTokens: 8192,
    batch: 32,
  });
  const [budget, setBudget] = useState({ slaPercent: 99.9, windowDays: 30 });
  const [query, setQuery] = useState("");

  const capacityResult = useMemo(() => estimateCapacity(capacity), [capacity]);
  const kvResult = useMemo(() => estimateKvCache(kv), [kv]);
  const budgetResult = useMemo(() => estimateErrorBudget(budget), [budget]);
  const notationResults = useMemo(() => decodeNotation(query), [query]);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-12 sm:px-8">
      <header className="max-w-3xl" data-cursor="read">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Working tools</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-content sm:text-4xl">Back-of-envelope bench</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-content-secondary">
          Five small calculators you can actually use. Every result shows the arithmetic and its limits — no invented
          charts, no account, nothing leaves this browser.
        </p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-app-raised p-6 shadow-card" aria-labelledby="capacity-title">
          <div className="flex items-center gap-2 text-brass"><Gauge size={16} /><span className="text-[11px] font-semibold uppercase tracking-[0.16em]">01 · Sizing</span></div>
          <h2 id="capacity-title" className="mt-3 text-lg font-semibold text-content">Capacity estimate</h2>
          <p className="mt-2 text-[12px] leading-relaxed text-content-secondary" data-cursor="read">
            Start from daily active users and work forward to QPS, storage, and egress.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <NumberField id="cap-dau" label="Daily active users" value={capacity.dau} min={0} max={1e12} onChange={(dau) => setCapacity((s) => ({ ...s, dau }))} />
            <NumberField id="cap-rpu" label="Requests per user / day" value={capacity.requestsPerUserPerDay} min={0} max={1e7} onChange={(requestsPerUserPerDay) => setCapacity((s) => ({ ...s, requestsPerUserPerDay }))} />
            <NumberField id="cap-read" label="Read fraction" value={capacity.readWriteRatio} min={0} max={1} step={0.01} onChange={(readWriteRatio) => setCapacity((s) => ({ ...s, readWriteRatio }))} />
            <NumberField id="cap-peak" label="Peak factor" value={capacity.peakFactor} min={1} max={100} step={0.5} onChange={(peakFactor) => setCapacity((s) => ({ ...s, peakFactor }))} />
            <NumberField id="cap-payload" label="Write payload (KB)" value={capacity.payloadKb} min={0} max={1e7} onChange={(payloadKb) => setCapacity((s) => ({ ...s, payloadKb }))} />
            <NumberField id="cap-retention" label="Retention (days)" value={capacity.retentionDays} min={0} max={36500} onChange={(retentionDays) => setCapacity((s) => ({ ...s, retentionDays }))} />
          </div>
          <div className="mt-5 rounded-xl border border-line bg-app px-4 py-2">
            <ResultRow label="Average QPS" value={capacityResult.avgQps.toFixed(2)} />
            <ResultRow label="Peak QPS" value={capacityResult.peakQps.toFixed(2)} />
            <ResultRow label="Retained storage (GB, 3×)" value={capacityResult.storageGb.toFixed(2)} />
            <ResultRow label="Average egress (Mbps)" value={capacityResult.bandwidthMbps.toFixed(2)} />
          </div>
          <p className="mt-4 font-mono text-[11px] leading-relaxed text-content-tertiary">
            avgQps = DAU × requests/user/day ÷ 86,400 · peakQps = avgQps × factor · storage = writes × retention ×
            payload × 1,000 × 3 ÷ 10⁹
          </p>
          <Notes items={capacityResult.notes} />
        </section>

        <section className="rounded-2xl border border-line bg-app-raised p-6 shadow-card" aria-labelledby="kv-title">
          <div className="flex items-center gap-2 text-brass"><Gauge size={16} /><span className="text-[11px] font-semibold uppercase tracking-[0.16em]">02 · Inference</span></div>
          <h2 id="kv-title" className="mt-3 text-lg font-semibold text-content">KV cache and VRAM</h2>
          <p className="mt-2 text-[12px] leading-relaxed text-content-secondary" data-cursor="read">
            Weights dominate at short context; the KV cache grows with context and concurrency.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <NumberField id="kv-params" label="Parameters (billions)" value={kv.paramsBillion} min={0} max={1e6} onChange={(paramsBillion) => setKv((s) => ({ ...s, paramsBillion }))} />
            <NumberField id="kv-bits" label="Precision (bits)" value={kv.precisionBits} min={1} max={64} onChange={(precisionBits) => setKv((s) => ({ ...s, precisionBits }))} />
            <NumberField id="kv-layers" label="Layers" value={kv.layers} min={1} max={1000} onChange={(layers) => setKv((s) => ({ ...s, layers }))} />
            <NumberField id="kv-heads" label="KV heads" value={kv.kvHeads} min={1} max={1024} onChange={(kvHeads) => setKv((s) => ({ ...s, kvHeads }))} />
            <NumberField id="kv-dim" label="Head dimension" value={kv.headDim} min={1} max={1024} onChange={(headDim) => setKv((s) => ({ ...s, headDim }))} />
            <NumberField id="kv-context" label="Context tokens" value={kv.contextTokens} min={0} max={1e7} step={512} onChange={(contextTokens) => setKv((s) => ({ ...s, contextTokens }))} />
            <NumberField id="kv-batch" label="Batch / concurrency" value={kv.batch} min={0} max={1e5} onChange={(batch) => setKv((s) => ({ ...s, batch }))} />
          </div>
          <div className="mt-5 rounded-xl border border-line bg-app px-4 py-2">
            <ResultRow label="Weights (GiB)" value={kvResult.weightGb.toFixed(2)} />
            <ResultRow label="KV cache (GiB)" value={kvResult.kvCacheGb.toFixed(2)} />
            <ResultRow label="Activations (GiB)" value={kvResult.activationGb.toFixed(2)} />
            <ResultRow label="Planning total (GiB)" value={kvResult.totalVramGb.toFixed(2)} />
          </div>
          <p className="mt-4 font-mono text-[11px] leading-relaxed text-content-tertiary">
            KV = 2 × layers × kvHeads × headDim × contextTokens × batch × bytes/value · weights = params × bytes ÷ 1024³
          </p>
          <Notes items={kvResult.notes} />
        </section>

        <section className="rounded-2xl border border-line bg-app-raised p-6 shadow-card" aria-labelledby="sla-title">
          <div className="flex items-center gap-2 text-brass"><Gauge size={16} /><span className="text-[11px] font-semibold uppercase tracking-[0.16em]">03 · Reliability</span></div>
          <h2 id="sla-title" className="mt-3 text-lg font-semibold text-content">Error budget</h2>
          <p className="mt-2 text-[12px] leading-relaxed text-content-secondary" data-cursor="read">
            An SLO is a budget, not a slogan. See how much downtime the promise actually allows.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <NumberField id="sla-percent" label="Availability target (%)" value={budget.slaPercent} min={99} max={99.999} step={0.001} onChange={(slaPercent) => setBudget((s) => ({ ...s, slaPercent }))} />
            <NumberField id="sla-days" label="Window (days)" value={budget.windowDays} min={1} max={3650} onChange={(windowDays) => setBudget((s) => ({ ...s, windowDays }))} />
          </div>
          <div className="mt-5 rounded-xl border border-line bg-app px-4 py-2">
            <ResultRow label="Target" value={budgetResult.ninesLabel} />
            <ResultRow label="Allowed downtime in window (min)" value={budgetResult.allowedDowntimeMinutes.toFixed(2)} />
            <ResultRow label="Budget per 30 days (min)" value={budgetResult.monthlyMinutes.toFixed(2)} />
            <ResultRow label="One-hour outage consumes" value={`${budgetResult.burnPerHourAt1x.toFixed(1)}× budget`} />
            <ResultRow label="At 2× burn, budget lasts" value={`${budgetResult.hoursToExhaustAt2x.toFixed(1)} hours`} />
            <ResultRow label="At 10× burn, budget lasts" value={`${budgetResult.hoursToExhaustAt10x.toFixed(1)} hours`} />
          </div>
          <p className="mt-4 font-mono text-[11px] leading-relaxed text-content-tertiary">
            allowed minutes = windowDays × 24 × 60 × (1 − SLO) · 1× burn = one hour ÷ 30-day budget
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-app-raised p-6 shadow-card" aria-labelledby="notation-title">
          <div className="flex items-center gap-2 text-brass"><Search size={16} /><span className="text-[11px] font-semibold uppercase tracking-[0.16em]">04 · Decoder</span></div>
          <h2 id="notation-title" className="mt-3 text-lg font-semibold text-content">Notation decoder</h2>
          <p className="mt-2 text-[12px] leading-relaxed text-content-secondary" data-cursor="read">
            Search by symbol or plain meaning — p99, ρ, RPO, TTFT, and the rest.
          </p>
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-line bg-app px-3">
            <label htmlFor="notation-query" className="sr-only">Search notation</label>
            <input
              id="notation-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try p99, quorum, or KV"
              className="w-full bg-transparent py-2.5 text-[13px] text-content placeholder:text-content-tertiary focus:outline-none"
            />
          </div>
          <p className="mt-3 text-[11px] text-content-tertiary">{notationResults.length} matching entries</p>
          <ul className="mt-3 max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {notationResults.map((entry) => (
              <li key={entry.symbol} className="rounded-xl border border-line bg-app px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[13px] text-brass">{entry.symbol}</span>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-content-tertiary">{entry.category.replace("-", " ")}</span>
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-content-secondary" data-cursor="read">{entry.plain}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-line bg-app-raised p-6 shadow-card" aria-labelledby="security-tool-title">
        <div className="flex items-center gap-2 text-brass"><ShieldCheck size={16} /><span className="text-[11px] font-semibold uppercase tracking-[0.16em]">05 · Defensive review</span></div>
        <h2 id="security-tool-title" className="mt-3 text-lg font-semibold text-content">Security checklist</h2>
        <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-content-secondary" data-cursor="read">
          Verification prompts grouped by the component that owns each control. Open a group to review the practice, why
          it matters, and the check to run. These are defensive checks for systems you operate.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {COMPONENT_ORDER.map((component) => {
            const items = SECURITY_CHECKLIST.filter((item) => item.component === component);
            if (items.length === 0) return null;
            return (
              <details key={component} className="group rounded-xl border border-line bg-app px-4 py-3">
                <summary className="cursor-pointer list-none text-[13px] font-medium text-content marker:hidden">
                  <span className="inline-flex w-full items-center justify-between gap-3">
                    <span>{COMPONENT_LABELS[component]}</span>
                    <span className="font-mono text-[11px] text-content-tertiary">{items.length} checks</span>
                  </span>
                </summary>
                <ul className="mt-4 space-y-4 border-t border-line pt-4">
                  {items.map((item) => (
                    <li key={item.id}>
                      <h3 className="text-[12px] font-medium text-content">{item.practice}</h3>
                      <p className="mt-1 text-[12px] leading-relaxed text-content-secondary" data-cursor="read">Why: {item.why}</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-content-tertiary" data-cursor="read">Check: {item.check}</p>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </section>

      <div className="mt-10 text-[12px]">
        <Link href="/paths" className="text-content-secondary hover:text-brass">
          Take these numbers into a lesson →
        </Link>
      </div>
    </main>
  );
}

'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Gauge, Layers, ShieldCheck, Zap } from '@/components/ui/icons';
import { getBlueprint } from '@/data/blueprints';
import { flushPendingCanvasWrite } from '@/store/canvasPersistence';
import { useCanvasStore } from '@/store/useCanvasStore';

/**
 * Architecture packet & control-loop visualizer.
 *
 * Four production topologies rendered as live SVG schematics: every toggle
 * recomputes real numbers (quorum arithmetic, NAT data-processing charges,
 * iptables chain depth, CVE mitigation paths) instead of replaying a canned
 * animation. Each tab can load its matching blueprint onto the canvas.
 */

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* ------------------------------------------------------------------ */

const LINE = 'rgb(var(--line-strong))';
const ACCENT = 'rgb(var(--accent))';
const RAISED = 'rgb(var(--surface-raised))';
const TEXT = 'rgb(var(--content))';
const SECONDARY = 'rgb(var(--content-secondary))';
const TERTIARY = 'rgb(var(--content-tertiary))';
const OK = 'rgb(var(--success))';
const WARN = 'rgb(var(--warning))';
const BAD = 'rgb(var(--danger))';
const INFO = 'rgb(var(--info))';

type Tone = 'default' | 'accent' | 'ok' | 'warn' | 'bad' | 'info';

const TONE_STROKE: Record<Tone, string> = {
  default: LINE,
  accent: ACCENT,
  ok: OK,
  warn: WARN,
  bad: BAD,
  info: INFO,
};

/* ------------------------------------------------------------------ */
/* Formatting helpers (locale-pinned so SSR and CSR agree)             */
/* ------------------------------------------------------------------ */

const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');
const fmtPct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;
const fmtMs = (n: number) => {
  if (n >= 100) return `${fmtInt(n)} ms`;
  if (n >= 10) return `${n.toFixed(1)} ms`;
  if (n >= 1) return `${n.toFixed(2)} ms`;
  return `${Math.max(1, Math.round(n * 1000))} µs`;
};
const fmtUsd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/* ------------------------------------------------------------------ */
/* SVG primitives                                                      */
/* ------------------------------------------------------------------ */

function SvgBox({
  x,
  y,
  w,
  h,
  title,
  subtitle,
  tone = 'default',
  dashed = false,
  titleSize = 11,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  subtitle?: string;
  tone?: Tone;
  dashed?: boolean;
  titleSize?: number;
}) {
  const stroke = TONE_STROKE[tone];
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        fill={RAISED}
        fillOpacity={tone === 'default' ? 0.72 : 0.9}
        stroke={stroke}
        strokeWidth={tone === 'default' ? 1 : 1.5}
        strokeDasharray={dashed ? '5 4' : undefined}
      />
      <text
        x={x + w / 2}
        y={subtitle ? y + h / 2 - 4 : y + h / 2 + 1}
        fill={TEXT}
        fontSize={titleSize}
        fontWeight={600}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="ui-monospace, monospace"
      >
        {title}
      </text>
      {subtitle ? (
        <text
          x={x + w / 2}
          y={y + h / 2 + 11}
          fill={TERTIARY}
          fontSize={9.5}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="ui-monospace, monospace"
        >
          {subtitle}
        </text>
      ) : null}
    </g>
  );
}

function Packet({
  d,
  dur = 2.4,
  delay = 0,
  color = ACCENT,
  r = 3.2,
}: {
  d: string;
  dur?: number;
  delay?: number;
  color?: string;
  r?: number;
}) {
  return (
    <circle r={r} fill={color}>
      <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${delay}s`} path={d} />
    </circle>
  );
}

function FlowLine({ d, color = LINE, dashed = false }: { d: string; color?: string; dashed?: boolean }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={1.2}
      strokeDasharray={dashed ? '4 4' : undefined}
      strokeLinecap="round"
    />
  );
}

function SvgCaption({ x, y, children, tone = 'default' }: { x: number; y: number; children: string; tone?: Tone }) {
  return (
    <text x={x} y={y} fill={TONE_STROKE[tone]} fontSize={9.5} fontFamily="ui-monospace, monospace">
      {children}
    </text>
  );
}

function Burst({ x, y, color = BAD }: { x: number; y: number; color?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={5} fill="none" stroke={color} strokeWidth={1.4}>
        <animate attributeName="r" values="4;20" dur="1.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0" dur="1.4s" repeatCount="indefinite" />
      </circle>
      <circle cx={x} cy={y} r={4} fill={color} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Shell pieces                                                        */
/* ------------------------------------------------------------------ */

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-xl border border-line bg-app-raised/30 px-3 py-2.5 text-left transition-colors hover:border-line-strong"
    >
      <span
        className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
          checked ? 'border-brass/70 bg-brass/30' : 'border-line-strong bg-app'
        }`}
      >
        <span
          className={`h-3.5 w-3.5 rounded-full transition-transform ${
            checked ? 'translate-x-[18px] bg-brass' : 'translate-x-[3px] bg-content-tertiary'
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-medium leading-snug text-content">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-content-tertiary">{description}</span>
      </span>
    </button>
  );
}

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-app-raised/30 px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-medium text-content">{label}</span>
        <span className="font-mono text-[11.5px] text-brass">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line-strong"
        style={{ accentColor: 'rgb(var(--accent))' }}
      />
    </div>
  );
}

function SegmentedRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ id: T; label: string; hint?: string }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-app-raised/30 px-3 py-2.5">
      <span className="block text-[12.5px] font-medium text-content">{label}</span>
      <div className="mt-2 space-y-1.5">
        {options.map((option) => {
          const active = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.id)}
              className={`w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                active
                  ? 'border-brass/50 bg-brass/10 text-content'
                  : 'border-line bg-app/40 text-content-secondary hover:border-line-strong hover:text-content'
              }`}
            >
              <span className="block text-[11.5px] font-medium leading-snug">{option.label}</span>
              {option.hint ? <span className="mt-0.5 block text-[10.5px] leading-snug text-content-tertiary">{option.hint}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint: string;
  tone?: Tone;
}) {
  const valueTone: Record<Tone, string> = {
    default: 'text-content',
    accent: 'text-brass',
    ok: 'text-emerald-300',
    warn: 'text-amber-300',
    bad: 'text-rose-300',
    info: 'text-sky-300',
  };
  return (
    <div className="rounded-xl border border-line bg-app/60 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.14em] text-content-tertiary">{label}</p>
      <p className={`mt-1 font-mono text-[15px] font-semibold leading-none ${valueTone[tone]}`}>{value}</p>
      <p className="mt-1.5 text-[10.5px] leading-snug text-content-tertiary">{hint}</p>
    </div>
  );
}

function DiagramPanel({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-app/50 p-3 shadow-card">
      <div className="overflow-hidden rounded-xl border border-line/70 bg-app-raised/20">{children}</div>
      <p className="mt-2 px-1 text-[11.5px] leading-relaxed text-content-tertiary">{caption}</p>
    </div>
  );
}

function ControlPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-app/50 p-3 shadow-card">
      <p className="mb-2.5 flex items-center gap-1.5 px-1 text-[10px] uppercase tracking-[0.18em] text-content-tertiary">
        <Gauge size={11} />
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MetricGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Tab 1 — AWS Multi-AZ VPC, Aurora quorum & gateway VPC endpoint      */
/* ------------------------------------------------------------------ */

const AWS_AZS = [
  { id: '1a', x: 16, label: 'us-east-1a' },
  { id: '1b', x: 246, label: 'us-east-1b' },
  { id: '1c', x: 476, label: 'us-east-1c' },
] as const;

type AzId = (typeof AWS_AZS)[number]['id'];

const AZ_RPS = 3000;
const KB_PER_REQUEST = 9;
const SECONDS_PER_MONTH = 2_592_000;
const NAT_PER_TB = 45;

function AwsTab() {
  const [failedAzs, setFailedAzs] = useState<Set<AzId>>(() => new Set<AzId>());
  const [vpcEndpoint, setVpcEndpoint] = useState(false);
  const [cacheHit, setCacheHit] = useState(0.93);
  const [rps, setRps] = useState(1800);

  const toggleAz = (id: AzId) => {
    setFailedAzs((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const azsUp = Math.max(0, 3 - failedAzs.size);
  const capacity = Math.max(1, AZ_RPS * Math.max(1, azsUp));
  const utilization = rps / capacity;
  const queueMs = utilization <= 0.75 ? 0 : Math.min(1200, 90 * ((utilization - 0.75) / 0.25) ** 2);

  const storageCopies = Math.max(0, 6 - failedAzs.size * 2);
  const writeQuorumOk = storageCopies >= 4;
  const readQuorumOk = storageCopies >= 3;
  const commitMs = !readQuorumOk ? 480 : failedAzs.size === 0 ? 6.4 : 9.2;

  const cacheP99 = 1.1 + queueMs * 0.2;
  const dbP99 = commitMs + queueMs;
  const blendedP99 = 14 + cacheHit * cacheP99 + (1 - cacheHit) * dbP99;

  const monthlyTb = (rps * KB_PER_REQUEST * 1024 * SECONDS_PER_MONTH) / 1e12;
  const natMonthly = vpcEndpoint ? 0 : monthlyTb * NAT_PER_TB;
  const natRate = vpcEndpoint ? 0 : NAT_PER_TB;

  const azOutage = failedAzs.has('1a');

  return (
    <div className="space-y-3">
      <DiagramPanel
        caption="Click any availability zone to fail it. The ALB bus drains to the survivors, Aurora keeps committing while at least four of its six storage copies answer, and the gateway endpoint removes the NAT hairpin from every S3 byte."
      >
        <svg viewBox="0 0 960 410" className="block h-auto w-full" role="img" aria-label="AWS multi-AZ architecture schematic">
          <defs>
            <radialGradient id="aws-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={ACCENT} stopOpacity="0.18" />
              <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width="960" height="410" fill="url(#aws-glow)" />

          {/* Public edge */}
          <SvgBox x={16} y={24} w={124} h={42} title="Route 53" subtitle="latency records" />
          <SvgBox x={176} y={24} w={168} h={42} title="CloudFront + WAF" subtitle="TLS 1.3 · OWASP CRS" tone="accent" />
          <SvgBox x={380} y={24} w={150} h={42} title="Multi-AZ ALB" subtitle="cross-zone" />
          <SvgBox
            x={556}
            y={24}
            w={240}
            h={42}
            title={`Aurora ${storageCopies}/6 writable`}
            subtitle={writeQuorumOk ? '4-of-6 write quorum met' : 'write quorum lost — commits stall'}
            tone={writeQuorumOk ? (failedAzs.size > 0 ? 'warn' : 'ok') : 'bad'}
            titleSize={11}
          />

          <FlowLine d="M 140 45 L 176 45" />
          <FlowLine d="M 344 45 L 380 45" />
          <Packet d="M 140 45 L 176 45" dur={1.6} />
          <Packet d="M 344 45 L 380 45" dur={1.6} delay={0.5} />

          {/* ALB fan-out bus into the private subnets */}
          <FlowLine d="M 455 66 L 455 92 L 825 92" />
          <FlowLine d="M 455 66 L 455 92" />

          {AWS_AZS.map((az) => {
            const dead = failedAzs.has(az.id);
            const dropX = az.x + 105;
            const appX = az.x + 14;
            return (
              <g
                key={az.id}
                role="button"
                tabIndex={0}
                aria-label={`Toggle availability zone ${az.label}`}
                className="cursor-pointer focus:outline-none"
                onClick={() => toggleAz(az.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleAz(az.id);
                  }
                }}
              >
                <rect
                  x={az.x}
                  y={110}
                  width={210}
                  height={200}
                  rx={10}
                  fill={dead ? 'rgb(var(--danger) / 0.08)' : 'rgb(var(--surface) / 0.35)'}
                  stroke={dead ? BAD : LINE}
                  strokeWidth={dead ? 1.6 : 1}
                  strokeDasharray={dead ? '6 4' : undefined}
                />
                <text
                  x={az.x + 14}
                  y={128}
                  fill={dead ? BAD : TERTIARY}
                  fontSize={8.5}
                  fontFamily="ui-monospace, monospace"
                >
                  {dead ? `${az.label} · draining` : az.label}
                </text>

                <FlowLine d={`M ${dropX} 92 L ${dropX} 140`} color={dead ? BAD : LINE} dashed={dead} />
                {!dead ? <Packet d={`M 455 92 L ${dropX} 92 L ${dropX} 140`} dur={2.2} delay={az.x / 900} /> : null}

                <SvgBox
                  x={appX}
                  y={140}
                  w={182}
                  h={44}
                  title="ECS Fargate task"
                  subtitle={dead ? 'drained · 0 targets' : 'task def :8080'}
                  tone={dead ? 'bad' : 'default'}
                  dashed={dead}
                />

                <FlowLine d={`M ${appX + 42} 184 L ${appX + 42} 192`} color={dead ? BAD : LINE} dashed={dead} />
                <FlowLine d={`M ${appX + 140} 184 L ${appX + 140} 192`} color={dead ? BAD : LINE} dashed={dead} />

                <SvgBox
                  x={appX}
                  y={192}
                  w={86}
                  h={64}
                  title="ElastiCache"
                  subtitle={dead ? '—' : `hit ${fmtPct(cacheHit)}`}
                  tone={dead ? 'bad' : 'info'}
                  dashed={dead}
                  titleSize={10}
                />
                <SvgBox
                  x={appX + 96}
                  y={192}
                  w={86}
                  h={64}
                  title="Aurora"
                  subtitle={dead ? 'copies lost' : '2 copies here'}
                  tone={dead ? 'bad' : readQuorumOk ? 'ok' : 'bad'}
                  dashed={dead}
                  titleSize={10}
                />

                <circle cx={appX + 120} cy={240} r={3} fill={dead ? BAD : OK} />
                <circle cx={appX + 130} cy={240} r={3} fill={dead ? BAD : OK} />

                <text
                  x={appX + 43}
                  y={274}
                  fill={dead ? BAD : TERTIARY}
                  fontSize={8}
                  fontFamily="ui-monospace, monospace"
                >
                  {dead ? 'zone isolated' : '2 of 6 storage copies'}
                </text>
              </g>
            );
          })}

          {/* Private endpoints vs NAT hairpin */}
          <FlowLine d="M 825 92 L 825 110" color={vpcEndpoint ? OK : LINE} />
          {vpcEndpoint ? <Packet d="M 825 92 L 825 110" dur={1.4} color={OK} /> : null}

          <SvgBox
            x={706}
            y={110}
            w={238}
            h={64}
            title="Gateway VPC Endpoint"
            subtitle={vpcEndpoint ? 'S3 · DynamoDB · $0/TB' : 'attached · idle'}
            tone={vpcEndpoint ? 'ok' : 'default'}
          />
          <FlowLine d="M 825 174 L 825 200" color={vpcEndpoint ? OK : LINE} />
          {vpcEndpoint ? <Packet d="M 825 174 L 825 200" dur={1.4} color={OK} delay={0.3} /> : null}

          <SvgBox x={706} y={200} w={238} h={56} title="S3 + DynamoDB" subtitle="object + table storage" />

          <SvgBox
            x={706}
            y={300}
            w={238}
            h={56}
            title="NAT Gateway"
            subtitle={vpcEndpoint ? '$0/TB · bypassed' : '$45/TB processed'}
            tone={vpcEndpoint ? 'bad' : 'warn'}
            dashed={vpcEndpoint}
          />
          <FlowLine
            d="M 944 328 L 956 328 L 956 228 L 944 228"
            color={vpcEndpoint ? TERTIARY : WARN}
            dashed
          />
          <SvgCaption x={700} y={382} tone={vpcEndpoint ? 'ok' : 'warn'}>
            {vpcEndpoint ? 'hairpin removed' : 'NAT hairpin per GB'}
          </SvgCaption>

          <SvgCaption x={16} y={400}>
            PRIVATE SUBNETS · 3 AZs · ALB cross-zone balancing
          </SvgCaption>
        </svg>
      </DiagramPanel>

      <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ControlPanel title="Failure & routing controls">
          <ToggleRow
            label="Simulate AZ-1a failure"
            description="Drains the ALB target group to 1b/1c; Aurora keeps a 4-of-6 write quorum."
            checked={azOutage}
            onChange={() => toggleAz('1a')}
          />
          <ToggleRow
            label="S3/DynamoDB gateway VPC endpoint"
            description="Replaces the NAT hairpin with a private route table entry — free data processing."
            checked={vpcEndpoint}
            onChange={setVpcEndpoint}
          />
          <SliderRow
            label="Cache hit ratio"
            value={Math.round(cacheHit * 100)}
            display={fmtPct(cacheHit)}
            min={50}
            max={99}
            onChange={(next) => setCacheHit(next / 100)}
          />
          <SliderRow
            label="Client RPS"
            value={rps}
            display={`${fmtInt(rps)} rps`}
            min={500}
            max={10000}
            step={100}
            onChange={setRps}
          />
        </ControlPanel>

        <MetricGrid>
          <MetricTile
            label="Blended p99"
            value={fmtMs(blendedP99)}
            hint={queueMs > 1 ? `queue wait ${fmtMs(queueMs)}` : 'cache-tier + commit path'}
            tone={blendedP99 > 120 ? 'bad' : blendedP99 > 40 ? 'warn' : 'ok'}
          />
          <MetricTile
            label="NAT data processing"
            value={`$${natRate}/TB`}
            hint={`${fmtUsd(natMonthly)}/mo over ${monthlyTb.toFixed(1)} TB`}
            tone={vpcEndpoint ? 'ok' : 'warn'}
          />
          <MetricTile
            label="Aurora copies"
            value={`${storageCopies}/6`}
            hint={writeQuorumOk ? 'write quorum 4/6 met' : readQuorumOk ? 'reads only · writes stall' : 'read + write quorum lost'}
            tone={writeQuorumOk ? 'ok' : readQuorumOk ? 'warn' : 'bad'}
          />
          <MetricTile
            label="AZs serving"
            value={`${azsUp}/3`}
            hint={`${fmtInt(capacity)} rps of ALB capacity`}
            tone={azsUp === 3 ? 'ok' : azsUp === 2 ? 'warn' : 'bad'}
          />
        </MetricGrid>

        <div className="rounded-xl border border-line bg-app/60 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-content-tertiary">
            <Layers size={11} /> Control-loop readout
          </p>
          <ul className="mt-1.5 space-y-1 text-[11.5px] leading-snug text-content-secondary">
            <li>
              <span className="text-content-tertiary">Drain:</span>{' '}
              {azsUp === 3 ? 'all three target groups healthy' : `ALB shifted traffic to ${azsUp} zone${azsUp === 1 ? '' : 's'}`}
            </li>
            <li>
              <span className="text-content-tertiary">Commit:</span>{' '}
              {writeQuorumOk ? `${fmtMs(commitMs)} to 4 of 6 storage nodes` : 'storage quorum unreachable — API returns 503'}
            </li>
            <li>
              <span className="text-content-tertiary">Egress:</span>{' '}
              {vpcEndpoint ? 'S3/DynamoDB stays in the VPC route table' : `every object pays $${NAT_PER_TB}/TB at the NAT`}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 2 — Cloudflare anycast edge, V8 isolates & Durable Objects      */
/* ------------------------------------------------------------------ */

type CacheStateMode = 'kv' | 'do';

function CloudflareTab() {
  const [tieredCache, setTieredCache] = useState(true);
  const [ddosWave, setDdosWave] = useState(false);
  const [stateMode, setStateMode] = useState<CacheStateMode>('kv');
  const [tunnelEnabled, setTunnelEnabled] = useState(true);
  const [rps, setRps] = useState(24000);

  const edgeHit = tieredCache ? 0.995 : 0.86;
  const originFanOut = tieredCache ? 1 : 330;
  const attackRps = ddosWave ? 100000 : 0;
  const stateMs = stateMode === 'kv' ? 1.1 : 22;
  const missCost = tunnelEnabled ? 78 : 62;
  const p99 = 12 + 0.9 + 1.6 + stateMs + (1 - edgeHit) * missCost + (ddosWave ? 1.4 : 0);
  const originRpm = Math.round(rps * (1 - edgeHit) * 60);
  const originRps = Math.round(attackRps > 0 ? 0 : rps * (1 - edgeHit));

  return (
    <div className="space-y-3">
      <DiagramPanel
        caption="Anycast terminates in the closest of the global cities, the isolate handles the request in a few milliseconds, and the origin only sees misses that survived the shield. Flip tiered cache off to watch origin fetch fan-out explode across every PoP."
      >
        <svg viewBox="0 0 940 400" className="block h-auto w-full" role="img" aria-label="Cloudflare edge architecture schematic">
          <SvgBox x={16} y={40} w={120} h={48} title="Global users" subtitle="https://app" />
          <SvgBox x={176} y={40} w={160} h={48} title="Anycast BGP" subtitle="330+ cities · 12ms" tone="accent" />
          <SvgBox
            x={376}
            y={40}
            w={150}
            h={48}
            title="Edge WAF"
            subtitle={ddosWave ? 'absorbing attack' : 'L3–L7 · bot mgmt'}
            tone={ddosWave ? 'warn' : 'default'}
          />
          <SvgBox x={566} y={40} w={168} h={48} title="Workers V8 isolate" subtitle="< 3ms cold start" titleSize={11} />

          <SvgBox x={774} y={8} w={150} h={44} title="Workers KV" subtitle="AP · ~1ms read" tone={stateMode === 'kv' ? 'ok' : 'default'} titleSize={11} />
          <SvgBox
            x={774}
            y={84}
            w={150}
            h={44}
            title="Durable Object"
            subtitle="CP · single actor"
            tone={stateMode === 'do' ? 'ok' : 'default'}
            titleSize={11}
          />
          <SvgBox x={774} y={160} w={150} h={44} title="R2 bucket" subtitle="$0 egress" titleSize={11} />

          <SvgBox
            x={196}
            y={250}
            w={150}
            h={48}
            title="Tiered cache"
            subtitle={tieredCache ? 'upper tier shield' : 'disabled'}
            tone={tieredCache ? 'ok' : 'default'}
            dashed={!tieredCache}
          />
          <SvgBox x={16} y={250} w={120} h={48} title="Botnet" subtitle="100k rps flood" tone={ddosWave ? 'bad' : 'default'} dashed={!ddosWave} />
          <SvgBox x={566} y={250} w={168} h={48} title="cloudflared" subtitle={tunnelEnabled ? 'outbound only' : 'port 443 open'} tone={tunnelEnabled ? 'ok' : 'warn'} titleSize={11} />
          <SvgBox x={774} y={250} w={150} h={48} title="Private origin" subtitle={tunnelEnabled ? 'no inbound listener' : 'internet reachable'} tone={tunnelEnabled ? 'ok' : 'bad'} titleSize={10} />

          <FlowLine d="M 136 64 L 176 64" />
          <FlowLine d="M 336 64 L 376 64" />
          <FlowLine d="M 526 64 L 566 64" />
          <Packet d="M 136 64 L 176 64" dur={1.4} />
          <Packet d="M 336 64 L 376 64" dur={1.4} delay={0.4} />
          <Packet d="M 526 64 L 566 64" dur={1.4} delay={0.8} />

          <FlowLine d="M 620 40 L 620 24 L 774 24" color={stateMode === 'kv' ? OK : LINE} />
          {stateMode === 'kv' ? <Packet d="M 620 40 L 620 24 L 774 24" dur={1.8} color={OK} /> : null}

          <FlowLine d="M 734 64 L 754 64 L 754 106 L 774 106" color={stateMode === 'do' ? OK : LINE} />
          {stateMode === 'do' ? <Packet d="M 734 64 L 754 64 L 754 106 L 774 106" dur={1.8} color={OK} /> : null}

          <FlowLine d="M 734 80 L 762 80 L 762 182 L 774 182" />
          <Packet d="M 734 80 L 762 80 L 762 182 L 774 182" dur={2.1} delay={0.6} />

          <FlowLine d="M 600 88 L 600 250" color={tunnelEnabled ? OK : LINE} />
          <Packet d="M 600 88 L 600 250" dur={2.4} color={tunnelEnabled ? OK : WARN} />
          <FlowLine d="M 734 274 L 774 274" color={tunnelEnabled ? OK : LINE} dashed={!tunnelEnabled} />
          <Packet d="M 734 274 L 774 274" dur={1.2} color={tunnelEnabled ? OK : WARN} delay={0.3} />

          {/* tier shield miss path: collapse 330 PoP misses into one origin fetch */}
          <FlowLine d="M 271 250 L 271 224 L 451 224 L 451 88" color={tieredCache ? OK : TERTIARY} dashed={!tieredCache} />
          <Packet d="M 451 88 L 451 224 L 271 224 L 271 250" dur={2.6} color={tieredCache ? OK : TERTIARY} delay={0.2} />

          <FlowLine d="M 271 298 L 271 370 L 850 370 L 850 298" color={tieredCache ? OK : TERTIARY} dashed={!tieredCache} />
          {tieredCache ? <Packet d="M 271 298 L 271 370 L 850 370 L 850 298" dur={3.4} color={OK} /> : null}
          <SvgCaption x={470} y={386} tone={tieredCache ? 'ok' : 'default'}>
            {tieredCache ? '1 origin fetch per object per TTL' : '330 PoP misses reach the origin'}
          </SvgCaption>

          {ddosWave ? (
            <>
              <FlowLine d="M 136 274 L 376 274 L 376 88" color={BAD} dashed />
              <Packet d="M 136 274 L 376 274 L 376 88" dur={2.2} color={BAD} />
              <Packet d="M 136 274 L 376 274 L 376 88" dur={2.2} delay={0.7} color={BAD} />
              <Burst x={451} y={64} color={WARN} />
              <SvgCaption x={386} y={368} tone="bad">
                100,000 rps dropped before compute
              </SvgCaption>
            </>
          ) : null}
        </svg>
      </DiagramPanel>

      <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ControlPanel title="Edge policy controls">
          <ToggleRow
            label="Tiered cache shield"
            description="A miss in one city asks the upper tier, not the origin — 330 fetches collapse into one."
            checked={tieredCache}
            onChange={setTieredCache}
          />
          <ToggleRow
            label="Simulate HTTP/2 Rapid Reset flood"
            description="100k RPS of stream resets; the edge enforces the stream budget and never bills origin CPU."
            checked={ddosWave}
            onChange={setDdosWave}
          />
          <ToggleRow
            label="Outbound cloudflared tunnel"
            description="The origin dials out, so port 443 is closed and nothing is port-scannable."
            checked={tunnelEnabled}
            onChange={setTunnelEnabled}
          />
          <SegmentedRow<CacheStateMode>
            label="Edge state model"
            options={[
              { id: 'kv', label: 'Workers KV (AP ~1ms read)', hint: 'Eventual consistency, globally replicated reads.' },
              { id: 'do', label: 'Durable Object (CP single-threaded actor)', hint: 'Strong consistency, one actor per object — serialized writes.' },
            ]}
            value={stateMode}
            onChange={setStateMode}
          />
          <SliderRow
            label="Clean client traffic"
            value={rps}
            display={`${fmtInt(rps)} rps`}
            min={5000}
            max={60000}
            step={1000}
            onChange={setRps}
          />
        </ControlPanel>

        <MetricGrid>
          <MetricTile label="Edge p99" value={fmtMs(p99)} hint="anycast + isolate + state read" tone={p99 > 45 ? 'warn' : 'ok'} />
          <MetricTile
            label="Origin fan-out"
            value={`${originFanOut} / object`}
            hint={`${fmtInt(originRpm)} origin fetches per minute`}
            tone={tieredCache ? 'ok' : 'warn'}
          />
          <MetricTile
            label="Attack absorbed"
            value={ddosWave ? `${fmtInt(attackRps)} rps` : 'idle'}
            hint={ddosWave ? 'origin sees 0 attack requests' : 'waiting — flip the flood on'}
            tone={ddosWave ? 'ok' : 'default'}
          />
          <MetricTile
            label="Origin ingress"
            value={tunnelEnabled ? 'closed' : '443 open'}
            hint={tunnelEnabled ? 'outbound-only tunnel, 4 replicas' : `${fmtInt(originRps)} rps from the public internet`}
            tone={tunnelEnabled ? 'ok' : 'bad'}
          />
        </MetricGrid>

        <div className="rounded-xl border border-line bg-app/60 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-content-tertiary">
            <Zap size={11} /> Consistency readout
          </p>
          <ul className="mt-1.5 space-y-1 text-[11.5px] leading-snug text-content-secondary">
            <li>
              <span className="text-content-tertiary">KV:</span> replicated reads, ~1ms, may serve a value that is a
              propagation window old.
            </li>
            <li>
              <span className="text-content-tertiary">DO:</span> one actor owns the object, so writes serialize behind a
              single thread.
            </li>
            <li>
              <span className="text-content-tertiary">Isolate:</span> {fmtInt(attackRps + rps)} rps handled without a cold
              container start.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 3 — Kubernetes watch loop & Cilium eBPF vs iptables             */
/* ------------------------------------------------------------------ */

type CniMode = 'ebpf' | 'iptables';
type EtcdState = 'healthy' | 'one_down' | 'two_down';

function KubernetesTab() {
  const [cniMode, setCniMode] = useState<CniMode>('ebpf');
  const [serviceCount, setServiceCount] = useState(3000);
  const [nodeCrash, setNodeCrash] = useState(false);
  const [etcdState, setEtcdState] = useState<EtcdState>('healthy');

  const lookupMs = cniMode === 'ebpf' ? 0.03 : 0.00032 * serviceCount;
  const chainRules = serviceCount * 3;
  const podP99 = 0.55 + lookupMs + (nodeCrash ? 0.4 : 0);

  const members = 3;
  const alive = etcdState === 'healthy' ? 3 : etcdState === 'one_down' ? 2 : 1;
  const quorumNeeded = 2;
  const quorumOk = alive >= quorumNeeded;
  const commitMs = !quorumOk ? 0 : alive === 3 ? 4.8 : 6.9;

  const pods = [0, 1, 2, 3, 4, 5, 6];

  return (
    <div className="space-y-3">
      <DiagramPanel
        caption="The control plane is a watch loop: apiserver writes to etcd, the watch cache fans changes to the scheduler and controllers, and kubelets reconcile pods. Compare the O(1) eBPF hash lookup against an iptables chain walk that grows with every Service you add."
      >
        <svg viewBox="0 0 940 400" className="block h-auto w-full" role="img" aria-label="Kubernetes control plane and eBPF data plane schematic">
          <SvgBox x={16} y={20} w={120} h={42} title="Argo CD" subtitle="git sync" />
          <SvgBox x={16} y={76} w={120} h={42} title="kubectl" subtitle="kubeconfig" />
          <SvgBox x={176} y={46} w={170} h={62} title="kube-apiserver" subtitle=":6443 · watch cache" tone="accent" />
          <SvgBox
            x={396}
            y={20}
            w={160}
            h={60}
            title="etcd"
            subtitle={`Raft · ${alive}/3 alive`}
            tone={quorumOk ? (alive === 3 ? 'ok' : 'warn') : 'bad'}
          />
          <SvgBox x={396} y={92} w={160} h={36} title="watch cache" titleSize={11} />
          <SvgBox x={596} y={20} w={150} h={44} title="kube-scheduler" titleSize={11} />
          <SvgBox x={596} y={76} w={150} h={44} title="controller-mgr" titleSize={11} />

          <FlowLine d="M 136 41 L 176 66" />
          <FlowLine d="M 136 97 L 176 88" />
          <Packet d="M 136 41 L 176 66" dur={1.8} />
          <Packet d="M 136 97 L 176 88" dur={1.8} delay={0.5} />

          <FlowLine d="M 346 62 L 396 44" color={quorumOk ? OK : BAD} />
          <Packet d="M 346 62 L 396 44" dur={1.4} color={quorumOk ? OK : BAD} />
          <FlowLine d="M 476 80 L 476 92" />
          <FlowLine d="M 396 112 L 346 96" />

          <FlowLine d="M 346 50 L 346 8 L 671 8 L 671 20" />
          <Packet d="M 671 20 L 671 8 L 346 8 L 346 50" dur={2.2} />
          <FlowLine d="M 346 100 L 370 100 L 370 140 L 671 140 L 671 120" />
          <Packet d="M 671 120 L 671 140 L 370 140 L 370 100 L 346 100" dur={2.4} delay={0.4} />

          {/* etcd member dots */}
          {[0, 1, 2].map((index) => (
            <circle
              key={index}
              cx={430 + index * 14}
              cy={64}
              r={3}
              fill={index < alive ? OK : BAD}
              opacity={index < alive ? 1 : 0.5}
            />
          ))}

          {/* apiserver → kubelet bus */}
          <FlowLine d="M 261 108 L 261 170 L 655 170" color={quorumOk ? LINE : WARN} />
          {[271, 463, 655].map((x, index) => (
            <g key={x}>
              <FlowLine d={`M ${x} 170 L ${x} 190`} color={x === 463 && nodeCrash ? BAD : LINE} dashed={x === 463 && nodeCrash} />
              {!(x === 463 && nodeCrash) ? (
                <Packet d={`M 261 170 L ${x} 170 L ${x} 190`} dur={2} delay={index * 0.4} />
              ) : null}
            </g>
          ))}

          {/* worker nodes */}
          {[
            { x: 186, label: 'node-1', tone: 'default' as Tone },
            { x: 378, label: 'node-2', tone: nodeCrash ? ('bad' as Tone) : ('default' as Tone) },
            { x: 570, label: 'node-3', tone: 'default' as Tone },
          ].map((node) => {
            const dead = node.label === 'node-2' && nodeCrash;
            return (
              <g key={node.label}>
                <rect
                  x={node.x}
                  y={190}
                  width={170}
                  height={60}
                  rx={8}
                  fill={RAISED}
                  fillOpacity={0.72}
                  stroke={dead ? BAD : LINE}
                  strokeWidth={dead ? 1.5 : 1}
                  strokeDasharray={dead ? '5 4' : undefined}
                />
                <text x={node.x + 12} y={208} fill={dead ? BAD : TERTIARY} fontSize={8.5} fontFamily="ui-monospace, monospace">
                  {dead ? 'node-2 · NotReady' : node.label}
                </text>
                <text x={node.x + 85} y={232} fill={dead ? BAD : SECONDARY} fontSize={9.5} textAnchor="middle" fontFamily="ui-monospace, monospace">
                  {dead ? 'kubelet silent 40s' : 'kubelet · 2 pods'}
                </text>
              </g>
            );
          })}

          {/* cilium pod network band */}
          <rect x={186} y={282} width={554} height={96} rx={10} fill="rgb(var(--surface) / 0.35)" stroke={LINE} strokeDasharray="6 4" />
          <text x={200} y={300} fill={cniMode === 'ebpf' ? OK : WARN} fontSize={8.5} fontFamily="ui-monospace, monospace">
            {cniMode === 'ebpf' ? 'Cilium eBPF · O(1) hash map per packet' : `iptables · ${fmtInt(chainRules)} chain rules walked`}
          </text>

          <FlowLine
            d={`M 216 340 L ${216 + (pods.length - 1) * 74} 340`}
            color={cniMode === 'ebpf' ? OK : WARN}
            dashed={cniMode === 'iptables'}
          />
          {pods.map((index) => {
            const x = 216 + index * 74;
            const evicted = nodeCrash && (index === 2 || index === 3);
            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={340}
                  r={11}
                  fill={RAISED}
                  stroke={evicted ? TERTIARY : cniMode === 'ebpf' ? OK : WARN}
                  strokeWidth={1.3}
                  opacity={evicted ? 0.35 : 1}
                />
                <text x={x} y={344} fill={evicted ? TERTIARY : SECONDARY} fontSize={7.5} textAnchor="middle" fontFamily="ui-monospace, monospace">
                  pod
                </text>
              </g>
            );
          })}
          {cniMode === 'ebpf' ? <Packet d={`M 216 340 L ${216 + (pods.length - 1) * 74} 340`} dur={2.6} color={OK} /> : null}
          <SvgCaption x={200} y={370} tone={nodeCrash ? 'warn' : 'default'}>
            {nodeCrash ? '2 pods evicted → scheduler re-binds in 45s' : 'pod-to-pod east-west, no kube-proxy hop'}
          </SvgCaption>

          <SvgBox x={760} y={282} w={164} h={42} title="OTel collector" titleSize={11} />
          <SvgBox x={760} y={334} w={164} h={44} title="Prometheus" titleSize={11} />
          <FlowLine d="M 740 316 L 760 303" />
          <FlowLine d="M 842 324 L 842 334" />
          <FlowLine d="M 760 356 L 720 356 L 720 250" />
          <Packet d="M 720 250 L 720 356 L 760 356" dur={2.4} delay={0.3} />

          {/* quorum badge */}
          <SvgBox
            x={16}
            y={190}
            w={140}
            h={60}
            title={`quorum ${alive}/3`}
            subtitle={quorumOk ? `needs ${quorumNeeded} · writes OK` : 'writes sealed'}
            tone={quorumOk ? (alive === 3 ? 'ok' : 'warn') : 'bad'}
            titleSize={11}
          />
          {!quorumOk ? <Burst x={86} y={220} /> : null}
        </svg>
      </DiagramPanel>

      <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ControlPanel title="Data-plane & control-plane controls">
          <SegmentedRow<CniMode>
            label="Service lookup datapath"
            options={[
              { id: 'ebpf', label: 'Cilium eBPF O(1) Hash Map', hint: 'One map probe per packet, independent of Service count.' },
              { id: 'iptables', label: 'Legacy iptables O(N) Chain', hint: 'Every Service appends rules; each packet walks the chain.' },
            ]}
            value={cniMode}
            onChange={setCniMode}
          />
          <SliderRow
            label="Services in the cluster"
            value={serviceCount}
            display={`${fmtInt(serviceCount)} services`}
            min={500}
            max={10000}
            step={250}
            onChange={setServiceCount}
          />
          <ToggleRow
            label="Simulate worker node 2 loss"
            description="kubelet heartbeats stop, the controller manager taints the node and the scheduler re-binds its pods."
            checked={nodeCrash}
            onChange={setNodeCrash}
          />
          <SegmentedRow<EtcdState>
            label="etcd membership"
            options={[
              { id: 'healthy', label: '3 of 3 members healthy', hint: 'Quorum floor(N/2)+1 = 2 — survives one loss.' },
              { id: 'one_down', label: '1 member down · 2 of 3', hint: 'Quorum holds with zero remaining fault tolerance.' },
              { id: 'two_down', label: '2 members down · 1 of 3', hint: 'Quorum lost: writes stall, running pods keep serving.' },
            ]}
            value={etcdState}
            onChange={setEtcdState}
          />
        </ControlPanel>

        <MetricGrid>
          <MetricTile
            label="Lookup cost"
            value={fmtMs(lookupMs)}
            hint={cniMode === 'ebpf' ? 'one hash-map probe' : `${fmtInt(chainRules)} rules per packet`}
            tone={lookupMs > 2 ? 'bad' : lookupMs > 0.5 ? 'warn' : 'ok'}
          />
          <MetricTile
            label="Pod-to-pod p99"
            value={fmtMs(podP99)}
            hint={cniMode === 'ebpf' ? 'eBPF fast path' : 'chain walk dominates'}
            tone={podP99 > 3 ? 'bad' : podP99 > 1 ? 'warn' : 'ok'}
          />
          <MetricTile
            label="etcd quorum"
            value={`${alive}/${members}`}
            hint={quorumOk ? (alive === 3 ? 'full tolerance' : 'one failure from sealed') : 'writes rejected'}
            tone={quorumOk ? (alive === 3 ? 'ok' : 'warn') : 'bad'}
          />
          <MetricTile
            label="Commit latency"
            value={quorumOk ? fmtMs(commitMs) : 'stalled'}
            hint={quorumOk ? 'fsync on a majority' : 'apiserver returns 500 on writes'}
            tone={quorumOk ? 'ok' : 'bad'}
          />
        </MetricGrid>

        <div className="rounded-xl border border-line bg-app/60 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-content-tertiary">
            <Layers size={11} /> Reconcile timeline
          </p>
          <ul className="mt-1.5 space-y-1 text-[11.5px] leading-snug text-content-secondary">
            <li>
              <span className="text-content-tertiary">T+0s</span> — pod is bound to node-2.
            </li>
            <li>
              <span className="text-content-tertiary">T+40s</span> — {nodeCrash ? 'heartbeat missed; node marked NotReady' : 'heartbeats nominal every 10s'}.
            </li>
            <li>
              <span className="text-content-tertiary">T+45s</span> — {nodeCrash ? 'eviction → scheduler binds replacement pods' : 'watch cache idle, no churn'}.
            </li>
            <li>
              <span className="text-content-tertiary">data plane</span> — {cniMode === 'ebpf' ? 'eBPF map updated, no restart' : 'iptables rules rewritten cluster-wide'}.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 4 — Zero-trust defense in depth & CVE simulator                 */
/* ------------------------------------------------------------------ */

type AttackId = 'normal' | 'sqli' | 'rapid_reset' | 'ingressnightmare' | 'ssrf';
type LayerVerdict = 'pass' | 'blocked' | 'mitigated' | 'idle';

const ZT_LAYERS = [
  { id: 1, name: 'Edge WAF', short: 'Edge WAF', detail: 'OWASP CRS, HTTP/2 stream budget, bot scoring' },
  { id: 2, name: 'API Gateway', short: 'Rate Limit', detail: 'Per-tenant token bucket, 429 shed with Retry-After' },
  { id: 3, name: 'OIDC identity', short: 'OIDC JWT', detail: '5-minute access tokens, audience + issuer bound' },
  { id: 4, name: 'Envoy mesh', short: 'SPIFFE mTLS', detail: 'Workload SVIDs rotated hourly, default deny peers' },
  { id: 5, name: 'CNI policy', short: 'NetworkPolicy', detail: 'Default-deny east-west, explicit allow only :8443 off-limits' },
  { id: 6, name: 'KMS secrets', short: 'KMS Secrets', detail: 'IMDSv2 hop-limit 1, hour-scoped DB credentials' },
] as const;

interface AttackDef {
  id: AttackId;
  label: string;
  vector: string;
  /** 1..6 = layer that stops it, 7 = reaches the data tier. */
  blockedAt: number;
  verdict: Exclude<LayerVerdict, 'idle'>;
  code: string;
  detail: string;
}

const ATTACKS: AttackDef[] = [
  {
    id: 'normal',
    label: 'Normal traffic',
    vector: 'Browser → API → Postgres',
    blockedAt: 7,
    verdict: 'pass',
    code: '200 OK · 42 ms',
    detail: 'A schema-valid, authenticated request walks every layer and reaches the data tier holding an hour-scoped credential.',
  },
  {
    id: 'sqli',
    label: 'SQLi / XSS payload',
    vector: 'UNION SELECT + <script> in the query string',
    blockedAt: 1,
    verdict: 'blocked',
    code: '403 · CRS 942100',
    detail: 'The OWASP CRS signature rejects the UNION payload at the edge; the origin never parses the string.',
  },
  {
    id: 'rapid_reset',
    label: 'CVE-2023-44487 HTTP/2 Rapid Reset',
    vector: '100k concurrent stream open/abort cycles',
    blockedAt: 2,
    verdict: 'mitigated',
    code: '429 · stream budget',
    detail: 'The edge caps concurrent streams and enforces an RST budget, then the gateway token bucket absorbs the residual.',
  },
  {
    id: 'ingressnightmare',
    label: 'CVE-2025-1974 IngressNightmare lateral probe',
    vector: 'Config-injection packet toward the admission webhook',
    blockedAt: 5,
    verdict: 'blocked',
    code: 'DENY · default-deny',
    detail: 'No NetworkPolicy allows pod-CIDR traffic to admission webhook :8443, so the injection attempt never reaches the listener.',
  },
  {
    id: 'ssrf',
    label: 'SSRF cloud metadata steal',
    vector: 'http://169.254.169.254/latest/meta-data/iam/',
    blockedAt: 6,
    verdict: 'mitigated',
    code: 'IMDSv2 · refused',
    detail: 'Hop-limit 1 refuses the metadata token request and the workload holds only least-privilege, hour-scoped DB credentials.',
  },
];

function verdictStyle(verdict: LayerVerdict): string {
  switch (verdict) {
    case 'pass':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    case 'blocked':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
    case 'mitigated':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    default:
      return 'border-line bg-app-raised/40 text-content-tertiary';
  }
}

function ZeroTrustTab() {
  const [attackId, setAttackId] = useState<AttackId>('sqli');
  const attack = ATTACKS.find((item) => item.id === attackId) ?? ATTACKS[0];

  const verdictFor = (layerId: number): LayerVerdict => {
    if (attack.blockedAt === 7) return 'pass';
    if (layerId < attack.blockedAt) return 'pass';
    if (layerId === attack.blockedAt) return attack.verdict;
    return 'idle';
  };

  const stopLayer = attack.blockedAt <= 6 ? ZT_LAYERS[attack.blockedAt - 1] : null;
  const stopX = stopLayer ? 12 + (stopLayer.id - 1) * 150 + 66 : 828;

  return (
    <div className="space-y-3">
      <DiagramPanel
        caption="Pick an attack and watch where the packet dies. No layer trusts a network position: the edge assumes the client is hostile, the mesh assumes the pod network is hostile, and the database assumes the service is hostile."
      >
        <svg viewBox="0 0 920 300" className="block h-auto w-full" role="img" aria-label="Zero trust enforcement pipeline schematic">
          {ZT_LAYERS.map((layer, index) => {
            const verdict = verdictFor(layer.id);
            const x = 12 + index * 150;
            const tone: Tone =
              verdict === 'pass' ? 'ok' : verdict === 'blocked' ? 'bad' : verdict === 'mitigated' ? 'warn' : 'default';
            return (
              <g key={layer.id}>
                <SvgBox
                  x={x}
                  y={70}
                  w={132}
                  h={92}
                  title={layer.short}
                  subtitle={
                    verdict === 'blocked' ? 'DENY' : verdict === 'mitigated' ? 'MITIGATED' : verdict === 'pass' ? 'allowed' : 'not reached'
                  }
                  tone={tone}
                  dashed={verdict === 'idle'}
                  titleSize={11}
                />
                <circle cx={x + 14} cy={54} r={9} fill={RAISED} stroke={tone === 'default' ? LINE : TONE_STROKE[tone]} strokeWidth={1.2} />
                <text x={x + 14} y={57} fill={TEXT} fontSize={8.5} textAnchor="middle" fontFamily="ui-monospace, monospace">
                  {layer.id}
                </text>
              </g>
            );
          })}

          {/* packet journey */}
          <FlowLine d="M 4 116 L 828 116" color={attack.blockedAt === 7 ? OK : LINE} />
          <Packet d={`M 4 116 L ${stopX} 116`} dur={2.6} color={attack.verdict === 'pass' ? OK : attack.verdict === 'blocked' ? BAD : WARN} />
          {attack.blockedAt <= 6 ? <Burst x={stopX} y={116} color={attack.verdict === 'blocked' ? BAD : WARN} /> : null}

          {/* data tier for the fully-passing request */}
          <SvgBox
            x={762}
            y={196}
            w={148}
            h={54}
            title="Postgres"
            subtitle={attack.blockedAt === 7 ? 'query executed' : 'never reached'}
            tone={attack.blockedAt === 7 ? 'ok' : 'default'}
            dashed={attack.blockedAt !== 7}
            titleSize={11}
          />
          <FlowLine d="M 828 162 L 828 196" color={attack.blockedAt === 7 ? OK : TERTIARY} dashed={attack.blockedAt !== 7} />
          {attack.blockedAt === 7 ? <Packet d="M 828 162 L 828 196" dur={1.2} color={OK} delay={0.4} /> : null}

          <SvgCaption x={12} y={34} tone={attack.verdict === 'pass' ? 'ok' : attack.verdict === 'blocked' ? 'bad' : 'warn'}>
            {`${attack.code} · ${attack.label}`}
          </SvgCaption>
          <SvgCaption x={12} y={286}>
            defence in depth: 6 independent enforcement points, no implicit trust between hops
          </SvgCaption>
        </svg>
      </DiagramPanel>

      <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ControlPanel title="Attack simulator">
          <div className="space-y-1.5">
            {ATTACKS.map((item) => {
              const active = item.id === attackId;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setAttackId(item.id)}
                  className={`w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                    active
                      ? 'border-brass/50 bg-brass/10 text-content'
                      : 'border-line bg-app/40 text-content-secondary hover:border-line-strong hover:text-content'
                  }`}
                >
                  <span className="block text-[11.5px] font-medium leading-snug">{item.label}</span>
                  <span className="mt-0.5 block text-[10.5px] leading-snug text-content-tertiary">{item.vector}</span>
                </button>
              );
            })}
          </div>
        </ControlPanel>

        <div className="rounded-xl border border-line bg-app/60 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-content-tertiary">
            <ShieldCheck size={11} /> Outcome
          </p>
          <p className={`mt-1.5 inline-flex rounded-full border px-2 py-0.5 font-mono text-[11px] ${verdictStyle(attack.verdict)}`}>
            {attack.code}
          </p>
          <p className="mt-2 text-[11.5px] leading-relaxed text-content-secondary">{attack.detail}</p>
        </div>

        <MetricGrid>
          <MetricTile
            label="Blocked at"
            value={attack.blockedAt > 6 ? 'no layer' : `L${attack.blockedAt}`}
            hint={stopLayer ? stopLayer.name : 'request reached the data tier'}
            tone={attack.blockedAt > 6 ? 'ok' : attack.verdict === 'blocked' ? 'bad' : 'warn'}
          />
          <MetricTile label="Identity TTL" value="5 min" hint="OIDC access token, refreshed by rotation" tone="accent" />
          <MetricTile label="SVID rotation" value="1 h" hint="SPIFFE leaf certs, auto-reissued" tone="accent" />
          <MetricTile
            label="Blast radius"
            value={attack.blockedAt > 6 ? '1 table' : '0 tables'}
            hint={attack.blockedAt > 6 ? 'scoped grant, no cross-tenant read' : 'payload never touched storage'}
            tone="ok"
          />
        </MetricGrid>
      </div>

      <div className="xl:col-span-2">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ZT_LAYERS.map((layer) => {
            const verdict = verdictFor(layer.id);
            return (
              <div key={layer.id} className="rounded-xl border border-line bg-app/50 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-content">
                    <span className="mr-1.5 font-mono text-[10px] text-content-tertiary">L{layer.id}</span>
                    {layer.name}
                  </p>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-wide ${verdictStyle(verdict)}`}>
                    {verdict === 'pass' ? 'passed' : verdict === 'blocked' ? 'blocked' : verdict === 'mitigated' ? 'mitigated' : 'bypassed'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-content-tertiary">{layer.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Blueprint loader                                                    */
/* ------------------------------------------------------------------ */

function LoadBlueprintStrip({ blueprintId }: { blueprintId: string }) {
  const router = useRouter();
  const blueprint = getBlueprint(blueprintId);

  const handleLoad = () => {
    const target = getBlueprint(blueprintId);
    if (!target) return;
    useCanvasStore.getState().loadBlueprintTemplate(target);
    flushPendingCanvasWrite();
    router.push('/canvas');
  };

  return (
    <div className="mt-4 flex flex-col items-start gap-3 rounded-2xl border border-line bg-app/60 p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold text-content">
          {blueprint ? blueprint.name : 'Blueprint unavailable'}
        </p>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-content-secondary">
          {blueprint
            ? `${blueprint.category} · ${blueprint.difficulty} · ${blueprint.nodes.length} nodes wired and ready to simulate.`
            : 'The matching blueprint could not be resolved.'}
        </p>
      </div>
      <button
        type="button"
        onClick={handleLoad}
        disabled={!blueprint}
        className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-brass px-4 py-2 text-[12.5px] font-semibold text-ink shadow-card transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Load this Architecture on Canvas
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */

const TABS = [
  {
    id: 'aws',
    label: 'AWS Multi-AZ',
    hint: 'VPC, Aurora quorum & PrivateLink',
    blueprintId: 'aws-multi-az-well-architected',
    title: 'AWS Multi-AZ VPC, Aurora 4/6 Quorum & PrivateLink',
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare edge',
    hint: 'Anycast, V8 isolates & Durable Objects',
    blueprintId: 'cloudflare-global-edge-stack',
    title: 'Cloudflare Anycast Edge, V8 Isolates & Durable Objects',
  },
  {
    id: 'kubernetes',
    label: 'Kubernetes',
    hint: 'Watch loop & Cilium eBPF',
    blueprintId: 'kubernetes-gitops-production-cluster',
    title: 'Kubernetes Watch-Loop & Cilium eBPF vs iptables',
  },
  {
    id: 'zerotrust',
    label: 'Zero trust',
    hint: 'Defense in depth & CVE drills',
    blueprintId: 'zero-trust-cve-hardened-enterprise',
    title: 'Zero-Trust Defense-in-Depth & CVE Attack Simulator',
  },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function InteractiveArchVisualizer() {
  const [tabId, setTabId] = useState<TabId>('aws');
  const activeTab = TABS.find((tab) => tab.id === tabId) ?? TABS[0];

  return (
    <section className="mt-16" aria-labelledby="arch-visualizer-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="arch-visualizer-heading" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">
            Architecture packet &amp; control loop
          </h2>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-content-secondary">
            Four production topologies, live. Toggle a failure, an attack, or a datapath choice and the schematic
            recomputes quorum math, charges, and mitigation paths — then load the same design onto the canvas.
          </p>
        </div>
        <span className="rounded-full border border-line bg-app/50 px-3 py-1 text-[11px] text-content-tertiary">
          interactive · no account needed
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Architecture visualizer tabs">
        {TABS.map((tab) => {
          const active = tab.id === tabId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTabId(tab.id)}
              className={`rounded-xl border px-3.5 py-2 text-left transition-colors ${
                active
                  ? 'border-brass/50 bg-brass/10 text-content'
                  : 'border-line bg-app/40 text-content-secondary hover:border-line-strong hover:text-content'
              }`}
            >
              <span className="block text-[12.5px] font-semibold leading-snug">{tab.label}</span>
              <span className="mt-0.5 block text-[10.5px] leading-snug text-content-tertiary">{tab.hint}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-app/30 p-3 md:p-4">
        <h3 className="mb-3 px-1 text-[13.5px] font-semibold text-content">{activeTab.title}</h3>
        {tabId === 'aws' ? <AwsTab /> : null}
        {tabId === 'cloudflare' ? <CloudflareTab /> : null}
        {tabId === 'kubernetes' ? <KubernetesTab /> : null}
        {tabId === 'zerotrust' ? <ZeroTrustTab /> : null}
        <LoadBlueprintStrip blueprintId={activeTab.blueprintId} />
      </div>
    </section>
  );
}

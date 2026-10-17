'use client';

import { motion } from 'framer-motion';
import type { NetDiagramKind } from '@/data/cloudNetworking';

const STROKE = 'rgb(var(--line-strong))';
const ACCENT = 'rgb(var(--accent))';
const FILL = 'rgb(var(--surface-raised))';

function Box({
  x,
  y,
  w,
  h,
  label,
  accent = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={7} fill={FILL} stroke={accent ? ACCENT : STROKE} strokeWidth={accent ? 1.4 : 1} />
      <text x={x + w / 2} y={y + h / 2} fill="rgb(var(--content-secondary))" fontSize="10.5" textAnchor="middle" dominantBaseline="middle" fontFamily="ui-monospace, monospace">
        {label}
      </text>
    </g>
  );
}

function TravelDot({ d, dur = 2.4, delay = 0 }: { d: string; dur?: number; delay?: number }) {
  return (
    <circle r={3.2} fill={ACCENT}>
      <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${delay}s`} path={d} />
    </circle>
  );
}

export function NetDiagram({ kind }: { kind: NetDiagramKind }) {
  const common = (
    <rect x="0" y="0" width="360" height="240" fill="none" />
  );

  return (
    <svg viewBox="0 0 360 240" className="h-full w-full">
      {common}
      {kind === 'anycast' && (
        <g>
          <circle cx="180" cy="120" r="34" fill={FILL} stroke={ACCENT} strokeWidth={1.4} />
          <text x="180" y="117" fill="rgb(var(--content))" fontSize="10" textAnchor="middle" fontFamily="ui-monospace, monospace">ORIGIN</text>
          <text x="180" y="130" fill="rgb(var(--content-tertiary))" fontSize="8" textAnchor="middle" fontFamily="ui-monospace, monospace">1 address</text>
          {[
            [60, 48],
            [300, 48],
            [60, 192],
            [300, 192],
          ].map(([x, y], i) => (
            <g key={i}>
              <line x1={x} y1={y} x2={180} y2={120} stroke={STROKE} strokeWidth={1} />
              <circle cx={x} cy={y} r={16} fill={FILL} stroke={ACCENT} strokeWidth={1.2} />
              <text x={x} y={y + 3} fill="rgb(var(--content-secondary))" fontSize="8" textAnchor="middle" fontFamily="ui-monospace, monospace">edge</text>
              <TravelDot d={`M ${x} ${y} L 180 120`} dur={2.6} delay={i * 0.5} />
            </g>
          ))}
        </g>
      )}

      {kind === 'vpc' && (
        <g>
          <rect x="16" y="24" width="328" height="192" rx="12" fill="none" stroke={STROKE} strokeWidth={1.2} strokeDasharray="5 5" />
          <text x="28" y="42" fill="rgb(var(--content-tertiary))" fontSize="9" fontFamily="ui-monospace, monospace">VPC 10.0.0.0/16</text>
          <rect x="36" y="56" width="140" height="140" rx="9" fill={FILL} fillOpacity={0.5} stroke={STROKE} />
          <text x="106" y="72" fill="rgb(var(--content-tertiary))" fontSize="9" textAnchor="middle" fontFamily="ui-monospace, monospace">public subnet</text>
          <Box x={66} y={92} w={80} h={34} label="Load bal." accent />
          <rect x="196" y="56" width="140" height="140" rx="9" fill={FILL} fillOpacity={0.5} stroke={STROKE} />
          <text x="266" y="72" fill="rgb(var(--content-tertiary))" fontSize="9" textAnchor="middle" fontFamily="ui-monospace, monospace">private subnet</text>
          <Box x={226} y={92} w={80} h={34} label="app" />
          <Box x={226} y={140} w={80} h={34} label="database" accent />
          <line x1="146" y1="109" x2="226" y2="109" stroke={STROKE} strokeWidth={1.2} />
          <TravelDot d="M 146 109 L 226 109" dur={2} />
          <text x="16" y="20" fill="rgb(var(--content-tertiary))" fontSize="9" fontFamily="ui-monospace, monospace">internet →</text>
        </g>
      )}

      {kind === 'dns' && (
        <g>
          {[
            ['client', 20],
            ['resolver', 88],
            ['root', 156],
            ['TLD', 224],
            ['auth', 292],
          ].map(([label, x], i) => (
            <g key={label as string}>
              {i > 0 && <line x1={(x as number) - 26} y1="120" x2={(x as number) - 4} y2="120" stroke={STROKE} strokeWidth={1} />}
              <circle cx={(x as number) + 18} cy="120" r="22" fill={FILL} stroke={i === 0 || i === 4 ? ACCENT : STROKE} strokeWidth={i === 0 || i === 4 ? 1.4 : 1} />
              <text x={(x as number) + 18} y="123" fill="rgb(var(--content-secondary))" fontSize="8.5" textAnchor="middle" fontFamily="ui-monospace, monospace">{label as string}</text>
            </g>
          ))}
          <TravelDot d="M 38 96 L 320 96" dur={3.4} />
        </g>
      )}

      {kind === 'nat' && (
        <g>
          <rect x="24" y="60" width="120" height="120" rx="9" fill={FILL} fillOpacity={0.5} stroke={STROKE} />
          <text x="84" y="78" fill="rgb(var(--content-tertiary))" fontSize="9" textAnchor="middle" fontFamily="ui-monospace, monospace">private</text>
          <Box x={42} y={92} w={84} h={26} label="instance" />
          <Box x={42} y={128} w={84} h={26} label="instance" />
          <Box x={196} y={100} w={92} h={40} label="NAT gw" accent />
          <ellipse cx="322" cy="120" rx="24" ry="40" fill="none" stroke={STROKE} strokeWidth={1.2} />
          <text x="322" y="123" fill="rgb(var(--content-tertiary))" fontSize="8.5" textAnchor="middle" fontFamily="ui-monospace, monospace">net</text>
          <line x1="126" y1="120" x2="196" y2="120" stroke={STROKE} strokeWidth={1.2} />
          <line x1="288" y1="120" x2="298" y2="120" stroke={STROKE} strokeWidth={1.2} />
          <TravelDot d="M 126 120 L 196 120 L 298 120" dur={2.8} />
        </g>
      )}

      {kind === 'peering' && (
        <g>
          <circle cx="180" cy="120" r="30" fill={FILL} stroke={ACCENT} strokeWidth={1.4} />
          <text x="180" y="123" fill="rgb(var(--content))" fontSize="8.5" textAnchor="middle" fontFamily="ui-monospace, monospace">transit</text>
          {[
            [50, 54, 'VPC A'],
            [50, 186, 'VPC B'],
            [310, 54, 'VPC C'],
            [310, 186, 'on-prem'],
          ].map(([x, y, label], i) => (
            <g key={i}>
              <line x1={x as number} y1={y as number} x2={180} y2={120} stroke={STROKE} strokeWidth={1} />
              <Box x={(x as number) - 34} y={(y as number) - 15} w={68} h={30} label={label as string} />
              <TravelDot d={`M ${x} ${y} L 180 120`} dur={2.4} delay={i * 0.4} />
            </g>
          ))}
        </g>
      )}

      {kind === 'tls' && (
        <g>
          <Box x={24} y={96} w={78} h={40} label="client" />
          <Box x={140} y={82} w={96} h={68} label="edge" accent />
          <text x="188" y="168" fill="rgb(var(--content-tertiary))" fontSize="8.5" textAnchor="middle" fontFamily="ui-monospace, monospace">decrypt · inspect · cache</text>
          <Box x={268} y={96} w={78} h={40} label="origin" />
          <line x1="102" y1="116" x2="140" y2="116" stroke={ACCENT} strokeWidth={1.4} />
          <line x1="236" y1="116" x2="268" y2="116" stroke={ACCENT} strokeWidth={1.4} strokeDasharray="4 3" />
          <text x="121" y="108" fill="rgb(var(--content-tertiary))" fontSize="8" textAnchor="middle" fontFamily="ui-monospace, monospace">TLS</text>
          <text x="252" y="108" fill="rgb(var(--content-tertiary))" fontSize="8" textAnchor="middle" fontFamily="ui-monospace, monospace">re-TLS</text>
          <TravelDot d="M 102 116 L 268 116" dur={3} />
        </g>
      )}

      {kind === 'mesh' && (
        <g>
          <Box x={120} y={20} w={120} h={30} label="control plane" accent />
          {[
            [40, 150],
            [140, 172],
            [240, 150],
          ].map(([x, y], i) => (
            <g key={i}>
              <line x1={180} y1={50} x2={x} y2={(y as number) - 18} stroke={STROKE} strokeWidth={0.8} strokeDasharray="3 4" />
              <Box x={(x as number) - 30} y={(y as number) - 18} w={60} h={36} label={`app ${i + 1}`} />
              <circle cx={(x as number) + 30} cy={y as number} r={7} fill={FILL} stroke={ACCENT} strokeWidth={1.2} />
            </g>
          ))}
          <line x1="100" y1="150" x2="170" y2="172" stroke={ACCENT} strokeWidth={1.2} />
          <line x1="170" y1="172" x2="270" y2="150" stroke={ACCENT} strokeWidth={1.2} />
          <text x="180" y="230" fill="rgb(var(--content-tertiary))" fontSize="9" textAnchor="middle" fontFamily="ui-monospace, monospace">mTLS between every sidecar</text>
          <motion.circle r={3.2} fill={ACCENT} cx={100} cy={150} animate={{ cx: [100, 170, 270], cy: [150, 172, 150], opacity: [0, 1, 1, 0] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 0.4 }} />
        </g>
      )}
    </svg>
  );
}

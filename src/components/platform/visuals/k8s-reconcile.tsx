'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

const POD_COL = [C.border, C.warning, C.warning, C.focus, C.healthy];

export function K8sReconcileVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const desired = s === 3 ? 5 : 3;
  const actual = s === 0 ? 0 : s === 1 ? 2 : s === 2 ? 3 : s === 3 ? 3 : 5;
  const final = s === 4;

  return (
    <Frame title="k8s reconcile" step={s} active={active}>
      <text x="320" y="74" textAnchor="middle" fontSize="10" fill={C.focus}>
        {[
          'desired state · manifest replicas: 3',
          'controller observes actual: 2',
          'diff → create one pod',
          'HPA raises desired replicas',
          'converged · actual == desired (final)',
        ][s]}
      </text>

      <Panel x={60} y={112} w={190} h={58} label="desired" sub={`replicas: ${desired}`} color={C.brass} />
      <Panel x={60} y={200} w={190} h={58} label="actual" sub={`pods: ${actual}`} color={final ? C.healthy : C.focus} />
      <Arrow x1={250} y1={141} x2={292} y2={141} color={C.brass} />
      <Arrow x1={250} y1={229} x2={292} y2={229} color={C.focus} />
      <g>
        <rect x={296} y={132} width={120} height={68} rx={8} fill={C.brass} fillOpacity="0.1" stroke={C.brass} strokeWidth="1.3" />
        <text x={356} y={160} textAnchor="middle" fontSize="10" fill="currentColor">diff</text>
        <text x={356} y={182} textAnchor="middle" fontSize="11" fill={s === 1 || s === 3 ? C.warning : C.healthy}>
          {s === 1 ? '+1 pod' : s === 3 ? `+${desired - actual} pods` : final ? '0' : s === 2 ? 'reconciled' : '—'}
        </text>
      </g>
      <Arrow x1={416} y1={166} x2={456} y2={166} color={final ? C.healthy : C.brass} />
      <Panel x={460} y={132} w={120} h={68} label="controller" color={C.healthy} sub={final ? 'stable' : 'acting'} />

      <text x="74" y="300" fontSize="10" fill={C.border}>pods</text>
      {Array.from({ length: Math.max(desired, actual) }).map((_, i) => {
        const exists = i < actual;
        const x = 74 + i * 92;
        return (
          <g key={i}>
            <rect
              x={x}
              y={312}
              width={72}
              height={48}
              rx={6}
              fill={exists ? POD_COL[s] ?? C.healthy : 'none'}
              fillOpacity={exists ? 0.18 : 0}
              stroke={exists ? POD_COL[s] ?? C.healthy : C.border}
              strokeWidth="1.2"
              strokeDasharray={exists ? undefined : '4 3'}
            />
            <text x={x + 36} y={341} textAnchor="middle" fontSize="10" fill={exists ? 'currentColor' : C.border}>
              {exists ? `pod${i + 1}` : 'new'}
            </text>
          </g>
        );
      })}

      <text x="320" y="378" textAnchor="middle" fontSize="9" fill={final ? C.healthy : C.border}>
        {final ? 'reconciled · no further writes needed' : 'level-triggered loop: observe → diff → act → repeat'}
      </text>
    </Frame>
  );
}

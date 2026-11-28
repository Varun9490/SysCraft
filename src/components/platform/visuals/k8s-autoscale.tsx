'use client';

import { C, Frame, useStep, type VisualProps } from './Frame';

const CPU = [25, 50, 75, 95, 65];
const PODS = [1, 2, 3, 5, 4];

export function K8sAutoscaleVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const cpu = CPU[s] ?? CPU[0];
  const pods = PODS[s] ?? PODS[0];
  const final = s === 4;

  return (
    <Frame title="autoscale" step={s} active={active}>
      <text x="70" y="106" fontSize="10" fill={C.border}>
        cpu
      </text>
      <rect x="70" y="120" width="500" height="26" rx={6} fill={C.border} fillOpacity="0.35" />
      <rect
        x="70"
        y="120"
        width={(cpu / 100) * 500}
        height="26"
        rx={6}
        fill={cpu > 80 ? C.warning : C.healthy}
        fillOpacity="0.6"
      />
      <text x="590" y="139" textAnchor="end" fontSize="10" fill={cpu > 80 ? C.warning : C.healthy}>
        {`${cpu}%`}
      </text>

      <text x="70" y="190" fontSize="10" fill={C.border}>
        pods
      </text>
      {Array.from({ length: pods }).map((_, i) => {
        const x = 70 + i * 104;
        const newest = i === pods - 1 && s > 0;
        return (
          <g key={i}>
            <rect
              x={x}
              y="206"
              width="88"
              height="66"
              rx={7}
              fill={C.focus}
              fillOpacity={newest ? 0.22 : 0.1}
              stroke={C.focus}
              strokeWidth="1.2"
              strokeDasharray={newest ? '4 3' : undefined}
            />
            <text x={x + 44} y="244" textAnchor="middle" fontSize="10" fill="currentColor">
              {`pod${i + 1}`}
            </text>
          </g>
        );
      })}

      <text x="320" y="316" textAnchor="middle" fontSize="9" fill={final ? C.healthy : C.healthy}>
        {final ? 'cluster autoscaled · nodes added · converged' : 'scale out'}
      </text>
    </Frame>
  );
}

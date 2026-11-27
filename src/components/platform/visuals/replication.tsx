'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

const LAG = [2, 8, 4, 1];

export function ReplicationVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const laggy = s % 2 === 1 ? 1 : 2;
  const lagVal = LAG[s];
  const r1 = laggy === 1 ? `lag ${lagVal}` : 'in sync';
  const r2 = laggy === 2 ? `lag ${lagVal}` : 'in sync';

  return (
    <Frame title="replication" step={s} active={active}>
      <Panel x={30} y={160} w={110} h={60} label="write" color={C.focus} />
      <Arrow x1={140} y1={190} x2={188} y2={190} />
      <Panel x={192} y={156} w={140} h={68} label="primary" sub="leader" color={C.brass} />

      <Arrow x1={332} y1={178} x2={446} y2={116} color={C.healthy} />
      <Arrow x1={332} y1={204} x2={446} y2={262} color={laggy === 2 ? C.warning : C.healthy} />

      <Panel x={450} y={88} w={150} h={58} label="replica 1" color={laggy === 1 ? C.warning : C.healthy} />
      <Panel x={450} y={234} w={150} h={58} label="replica 2" color={laggy === 2 ? C.warning : C.healthy} />

      <text
        x="525"
        y="164"
        textAnchor="middle"
        fontSize="9"
        fill={laggy === 1 ? C.warning : C.healthy}
      >
        {r1}
      </text>
      <text
        x="525"
        y="310"
        textAnchor="middle"
        fontSize="9"
        fill={laggy === 2 ? C.warning : C.healthy}
      >
        {r2}
      </text>
    </Frame>
  );
}

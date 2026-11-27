'use client';

import { C, Frame, useStep, type VisualProps } from './Frame';

const PARTS = [
  { t: 'λ', x: 224, label: 'arrival', c: C.focus },
  { t: '/', x: 274, label: '', c: C.border },
  { t: 'μ', x: 318, label: 'service', c: C.healthy },
  { t: '=', x: 370, label: '', c: C.border },
  { t: 'ρ', x: 420, label: 'utilization', c: C.brass },
];
const LIT = [0, 2, 4, 4];

export function NotationDecoderVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const litIdx = LIT[s];

  return (
    <Frame title="notation decoder" step={s} active={active}>
      {PARTS.map((p, i) => {
        const lit = i === litIdx;
        return (
          <g key={i}>
            {lit ? (
              <circle cx={p.x} cy={158} r={30} fill={p.c} fillOpacity="0.12" stroke={p.c} strokeWidth="1" />
            ) : null}
            <text x={p.x} y={172} textAnchor="middle" fontSize="38" fill={lit ? p.c : 'currentColor'}>
              {p.t}
            </text>
            {p.label ? (
              <text x={p.x} y={214} textAnchor="middle" fontSize="9" fill={lit ? p.c : C.border}>
                {p.label}
              </text>
            ) : null}
          </g>
        );
      })}

      <text x="320" y="288" textAnchor="middle" fontSize="10" fill={s === 3 ? C.healthy : C.border}>
        {s === 3 ? 'ρ < 1 → stable' : 'arrival rate / service rate'}
      </text>
    </Frame>
  );
}

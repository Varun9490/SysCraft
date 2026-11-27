'use client';

import { C, Frame, useStep, type VisualProps } from './Frame';

const CTX = ['4k', '8k', '16k', '32k'];
const SPLITS = [
  [70, 18, 12],
  [62, 26, 12],
  [52, 36, 12],
  [40, 48, 12],
];

export function TokenMathVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const split = SPLITS[s];
  const x = 110;
  const y = 120;
  const barW = 380;
  const h = 150;
  let cy = y;

  const segs = [
    { v: split[0], c: C.brass, label: 'weights' },
    { v: split[1], c: C.focus, label: 'kv cache' },
    { v: split[2], c: C.healthy, label: 'activations' },
  ];

  return (
    <Frame title="token math" step={s} active={active}>
      <text x="320" y="86" textAnchor="middle" fontSize="10" fill={C.focus}>
        {`ctx ${CTX[s]} · batch 1`}
      </text>

      {segs.map((seg) => {
        const hh = (seg.v / 100) * h;
        const yy = cy;
        cy += hh;
        return (
          <g key={seg.label}>
            <rect
              x={x}
              y={yy}
              width={barW}
              height={hh}
              fill={seg.c}
              fillOpacity="0.45"
              stroke={seg.c}
              strokeWidth="1"
            />
            <text x={x + barW / 2} y={yy + hh / 2 + 3} textAnchor="middle" fontSize="9" fill="currentColor">
              {`${seg.label} ${seg.v}%`}
            </text>
          </g>
        );
      })}

      <line x1={x + barW} y1={y} x2={x + barW + 16} y2={y} stroke={C.border} strokeWidth="1" />
      <line x1={x + barW} y1={y + h} x2={x + barW + 16} y2={y + h} stroke={C.border} strokeWidth="1" />
      <line x1={x + barW + 14} y1={y} x2={x + barW + 14} y2={y + h} stroke={C.border} strokeWidth="1" />
      <text x={x + barW + 24} y={y + h / 2} fontSize="9" fill={C.brass}>
        memory
      </text>

      <text x="320" y="310" textAnchor="middle" fontSize="9" fill={C.focus}>
        kv grows with context
      </text>
    </Frame>
  );
}

'use client';

import { C, Frame, useStep, type VisualProps } from './Frame';

const SETS = [
  [1, 5, 9, 14],
  [1, 5, 9, 14, 18, 21],
  [1, 5, 9, 14, 18, 21, 3, 11],
  [1, 5, 9, 14, 18, 21, 3, 11, 7, 23],
  [1, 5, 9, 14, 18, 21, 3, 11, 7, 23, 2, 16],
];
const EST = [4120, 8350, 12640, 17110, 21480];

export function BloomHllVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const set = new Set(SETS[s] ?? SETS[0]);
  const final = s === 4;

  return (
    <Frame title="bloom / hll" step={s} active={active}>
      <text x="60" y="112" fontSize="10" fill={C.focus}>
        bit array
      </text>
      {Array.from({ length: 24 }).map((_, i) => {
        const col = i % 12;
        const row = Math.floor(i / 12);
        const x = 60 + col * 42;
        const y = 132 + row * 38;
        const on = set.has(i);
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width="32"
            height="28"
            rx="4"
            fill={on ? C.brass : 'none'}
            fillOpacity={on ? 0.7 : 0}
            stroke={on ? C.brass : C.border}
            strokeWidth="1"
          />
        );
      })}

      <text x="60" y="244" fontSize="9" fill={C.border}>
        {`${set.size} of 24 bits set`}
      </text>

      <rect
        x="420"
        y="270"
        width="172"
        height="76"
        rx="9"
        fill={C.focus}
        fillOpacity="0.08"
        stroke={C.focus}
        strokeWidth="1.2"
      />
      <text x="506" y="298" textAnchor="middle" fontSize="9" fill={C.focus}>
        approximate
      </text>
      <text x="506" y="326" textAnchor="middle" fontSize="18" fill="currentColor">
        {EST[s] ?? EST[0]}
      </text>

      <text x="320" y="368" textAnchor="middle" fontSize="9" fill={final ? C.healthy : C.border}>
        {final ? 'exact recheck confirms · fp bounded' : 'three hash positions per item'}
      </text>
    </Frame>
  );
}

'use client';

import { C, Frame, useStep, type VisualProps } from './Frame';

const CX = 300;
const CY = 196;
const R = 108;
const NODE_ANGLES = [-90, 0, 90, 180];

function xy(angleDeg: number, rad = R): readonly [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [CX + rad * Math.cos(a), CY + rad * Math.sin(a)];
}

export function ConsistentHashVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const removed = s === 2 ? 2 : -1;

  const keys = Array.from({ length: 16 }).map((_, i) => {
    const ang = -90 + i * 22.5;
    const owner = Math.floor((ang + 90) / 90) % 4;
    const moved = s === 2 && owner === 2;
    return { ang, ang2: moved ? ang + 10 : ang, moved };
  });

  return (
    <Frame title="consistent hashing" step={s} active={active}>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke={C.border} strokeWidth="1.2" />

      {NODE_ANGLES.map((a, i) => {
        const [x, y] = xy(a);
        const off = i === removed;
        return (
          <g key={i} opacity={off ? 0.3 : 1}>
            <rect
              x={x - 9}
              y={y - 9}
              width={18}
              height={18}
              rx={4}
              fill={off ? 'none' : C.brass}
              fillOpacity={off ? 0 : 0.22}
              stroke={off ? C.warning : C.brass}
              strokeWidth="1.3"
              strokeDasharray={off ? '3 3' : undefined}
            />
            <text x={x} y={y + 3.5} textAnchor="middle" fontSize="9" fill="currentColor">
              n{i + 1}
            </text>
          </g>
        );
      })}

      {keys.map((k, i) => {
        const [x, y] = xy(k.ang);
        const [x2, y2] = xy(k.ang2);
        return (
          <g key={i}>
            {k.moved ? (
              <line x1={x} y1={y} x2={x2} y2={y2} stroke={C.warning} strokeWidth="1" strokeDasharray="2 2" />
            ) : null}
            <circle cx={x2} cy={y2} r={3.4} fill={k.moved ? C.focus : C.healthy} />
          </g>
        );
      })}

      <text x={CX} y={CY - 4} textAnchor="middle" fontSize="11" fill="currentColor">
        ring
      </text>
      <text x={CX} y={CY + 13} textAnchor="middle" fontSize="9" fill={s === 2 ? C.warning : C.focus}>
        {s === 2 ? 'localized remap' : '4 nodes · 16 keys'}
      </text>
    </Frame>
  );
}

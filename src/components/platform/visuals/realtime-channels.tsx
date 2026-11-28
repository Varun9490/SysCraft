'use client';

import { C, Frame, useStep, type VisualProps } from './Frame';

const COLS = [
  { x: 70, label: 'polling', gap: 3, color: C.warning },
  { x: 260, label: 'sse', gap: 2, color: C.brass },
  { x: 450, label: 'websocket', gap: 1, color: C.healthy },
];

export function RealtimeChannelsVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const ticks = 4 + s;
  const top = 118;
  const bottom = 326;
  // s === 4 is the final hardened state: persistent channel with revoked stale connections.
  const final = s === 4;

  return (
    <Frame title="realtime channels" step={s} active={active}>
      {COLS.map((col) => (
        <g key={col.label}>
          <rect
            x={col.x}
            y={90}
            width="152"
            height="252"
            rx="8"
            fill={col.color}
            fillOpacity={final && col.gap === 1 ? 0.12 : 0.05}
            stroke={final && col.gap === 1 ? col.color : C.border}
            strokeWidth="1"
          />
          <text x={col.x + 76} y={78} textAnchor="middle" fontSize="10" fill={col.color}>
            {col.label}
          </text>
          <line x1={col.x + 20} y1={top} x2={col.x + 20} y2={bottom} stroke={C.border} strokeWidth="1.2" />
          {col.gap === 1 ? (
            <line
              x1={col.x + 20}
              y1={top}
              x2={col.x + 20}
              y2={bottom}
              stroke={col.color}
              strokeWidth="3"
              strokeOpacity="0.35"
            />
          ) : null}

          {Array.from({ length: ticks }).map((_, i) => {
            if (col.gap !== 1 && i % col.gap !== 0) return null;
            const y = top + 6 + i * ((bottom - top - 12) / Math.max(1, ticks - 1));
            return (
              <g key={i}>
                <line
                  x1={col.x + 20}
                  y1={y}
                  x2={col.x + 132}
                  y2={y}
                  stroke={col.color}
                  strokeWidth={col.gap === 1 ? 1 : 2}
                  strokeOpacity={col.gap === 1 ? 0.55 : 0.9}
                />
                <circle cx={col.x + 20} cy={y} r={col.gap === 1 ? 2 : 3.5} fill={col.color} />
              </g>
            );
          })}
        </g>
      ))}

      <text x="320" y="360" textAnchor="middle" fontSize="9" fill={final ? C.healthy : C.border}>
        {final ? 'persistent channel · stale connections revoked' : 'repeated delivery over time'}
      </text>
    </Frame>
  );
}

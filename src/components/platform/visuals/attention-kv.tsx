'use client';

import { C, Frame, useStep, type VisualProps } from './Frame';

const COLS = 8;
const ROWS = 4;
const X = 96;
const Y = 110;
const W = 44;
const H = 26;
const GAP = 8;

export function AttentionKvVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const attended = s + 1;
  const reusedR = (s + 1) % ROWS;
  const reusedC = (s * 2 + 1) % COLS;
  const tokenY = Y + (ROWS * (H + GAP)) / 2 - 17;

  return (
    <Frame title="attention kv" step={s} active={active}>
      <text x="180" y="82" textAnchor="middle" fontSize="10" fill={C.focus}>
        key / value cache
      </text>

      {Array.from({ length: ROWS }).map((_, r) =>
        Array.from({ length: COLS }).map((_, c) => {
          const x = X + c * (W + GAP);
          const y = Y + r * (H + GAP);
          const isReused = r === reusedR && c === reusedC;
          const isAttended = r < attended;
          return (
            <g key={`${r}-${c}`}>
              <rect
                x={x}
                y={y}
                width={W}
                height={H}
                rx={4}
                fill={isAttended ? C.brass : C.border}
                fillOpacity={isAttended ? 0.16 : 0.1}
                stroke={isReused ? C.focus : isAttended ? C.brass : C.border}
                strokeWidth={isReused ? 1.8 : 1}
              />
              {c === 0 ? (
                <text x={x - 8} y={y + 17} textAnchor="end" fontSize="9" fill={C.border}>
                  {`r${r}`}
                </text>
              ) : null}
            </g>
          );
        }),
      )}

      <rect
        x="550"
        y={tokenY}
        width="64"
        height="34"
        rx={6}
        fill={C.healthy}
        fillOpacity="0.16"
        stroke={C.healthy}
        strokeWidth="1.3"
      />
      <text x="582" y={tokenY + 21} textAnchor="middle" fontSize="10" fill="currentColor">
        token
      </text>

      {Array.from({ length: attended }).map((_, r) => (
        <line
          key={r}
          x1={X + COLS * (W + GAP) - GAP}
          y1={Y + r * (H + GAP) + H / 2}
          x2={550}
          y2={tokenY + 17}
          stroke={C.brass}
          strokeOpacity="0.5"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      ))}

      <text x="320" y="360" textAnchor="middle" fontSize="9" fill={C.focus}>
        paged block reused
      </text>
    </Frame>
  );
}

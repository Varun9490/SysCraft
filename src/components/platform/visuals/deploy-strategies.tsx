'use client';

import { C, Frame, useStep, type VisualProps } from './Frame';

const PCT = [5, 25, 100, 25];

export function DeployStrategiesVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const p = PCT[s];
  const rollback = s === 3;
  const barX = 80;
  const barW = 480;
  const y = 180;
  const h = 54;
  const newW = (p / 100) * barW;

  return (
    <Frame title="deploy strategy" step={s} active={active}>
      <text x="80" y="120" fontSize="10" fill={C.border}>
        stable
      </text>
      <text x="560" y="120" textAnchor="end" fontSize="10" fill={C.brass}>
        new
      </text>

      <rect
        x={barX}
        y={y}
        width={barW}
        height={h}
        rx="8"
        fill={C.focus}
        fillOpacity="0.16"
        stroke={C.focus}
        strokeWidth="1.2"
      />
      {p === 100 ? (
        <rect
          x={barX}
          y={y}
          width={barW}
          height={h}
          rx="8"
          fill={C.brass}
          fillOpacity="0.3"
          stroke={C.brass}
          strokeWidth="1.2"
        />
      ) : (
        <rect
          x={barX + barW - newW}
          y={y}
          width={newW}
          height={h}
          rx="8"
          fill={C.brass}
          fillOpacity="0.35"
          stroke={C.brass}
          strokeWidth="1.2"
        />
      )}
      <text x="320" y={y + 32} textAnchor="middle" fontSize="14" fill="currentColor">
        {`${p}% new`}
      </text>

      <text x="320" y="270" textAnchor="middle" fontSize="9" fill={rollback ? C.danger : C.healthy}>
        {rollback ? 'error rate rising' : 'error rate ok'}
      </text>

      {rollback ? (
        <g>
          <path
            d="M 470 260 C 470 320 170 320 170 262"
            fill="none"
            stroke={C.danger}
            strokeWidth="1.5"
          />
          <polygon points="170,262 178,274 162,274" fill={C.danger} />
          <text x="320" y="342" textAnchor="middle" fontSize="9" fill={C.danger}>
            rollback
          </text>
        </g>
      ) : null}
    </Frame>
  );
}

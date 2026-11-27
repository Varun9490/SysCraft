'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

export function SagaOutboxVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const retry = s === 3;

  return (
    <Frame title="saga outbox" step={s} active={active}>
      <Panel x={26} y={150} w={124} h={66} label="service" color={C.brass} />
      <Arrow x1={150} y1={183} x2={190} y2={183} />

      <rect
        x="194"
        y="110"
        width="180"
        height="146"
        rx="8"
        fill={C.brass}
        fillOpacity="0.06"
        stroke={C.brass}
        strokeWidth="1.2"
      />
      <text x="284" y="136" textAnchor="middle" fontSize="10" fill="currentColor">
        outbox
      </text>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={212}
          y={150 + i * 26}
          width="144"
          height="16"
          rx="3"
          fill={C.brass}
          fillOpacity={0.28 + i * 0.12}
          stroke={C.brass}
          strokeWidth="0.8"
        />
      ))}

      <Arrow x1={374} y1={183} x2={414} y2={183} color={C.focus} />
      <Panel x={418} y={150} w={90} h={66} label="relay" color={C.focus} />
      <Arrow x1={508} y1={183} x2={546} y2={183} color={C.healthy} />
      <Panel x={550} y={150} w={66} h={66} label="sink" color={C.healthy} />

      <path
        d="M 284 108 C 284 70 150 70 150 148"
        fill="none"
        stroke={C.healthy}
        strokeWidth="1.2"
        strokeDasharray="4 3"
      />
      <text x="216" y="66" textAnchor="middle" fontSize="9" fill={C.healthy}>
        atomic commit
      </text>

      {retry ? (
        <g>
          <path
            d="M 462 220 C 462 268 380 268 380 224"
            fill="none"
            stroke={C.warning}
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />
          <text x="420" y="286" textAnchor="middle" fontSize="9" fill={C.warning}>
            retry
          </text>
        </g>
      ) : null}
    </Frame>
  );
}

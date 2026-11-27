'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

export function QueueWorkersVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const items = 2 + s;
  const dlq = s === 3;

  return (
    <Frame title="queue / workers" step={s} active={active}>
      <Panel x={28} y={162} w={112} h={62} label="producer" color={C.brass} />
      <Arrow x1={140} y1={193} x2={188} y2={193} />

      <rect
        x="192"
        y="120"
        width="150"
        height="146"
        rx="8"
        fill={C.brass}
        fillOpacity="0.06"
        stroke={C.brass}
        strokeWidth="1.2"
      />
      <text x="267" y="146" textAnchor="middle" fontSize="10" fill="currentColor">
        queue
      </text>
      {Array.from({ length: items }).map((_, i) => (
        <rect
          key={i}
          x={212}
          y={158 + i * 24}
          width="110"
          height="16"
          rx="3"
          fill={C.brass}
          fillOpacity="0.3"
          stroke={C.brass}
          strokeWidth="0.8"
        />
      ))}

      {[0, 1, 2].map((i) => (
        <g key={i}>
          <Panel x={420} y={104 + i * 84} w={130} h={54} label={`worker ${i + 1}`} color={C.healthy} />
          <Arrow x1={342} y1={193} x2={418} y2={131 + i * 84} color={C.focus} />
        </g>
      ))}

      {dlq ? (
        <g>
          <Arrow x1={342} y1={246} x2={300} y2={312} color={C.danger} dashed />
          <rect
            x="196"
            y="312"
            width="208"
            height="42"
            rx="7"
            fill={C.danger}
            fillOpacity="0.1"
            stroke={C.danger}
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />
          <text x="300" y="338" textAnchor="middle" fontSize="10" fill={C.danger}>
            dead letter
          </text>
        </g>
      ) : null}
    </Frame>
  );
}

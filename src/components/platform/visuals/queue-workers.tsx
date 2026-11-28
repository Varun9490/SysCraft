'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

export function QueueWorkersVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  // s === 4 is the scaled-out, backlog-cleared final state with a fourth worker.
  const final = s === 4;
  const items = final ? 4 : 2 + s;
  const dlq = s === 3;
  const workers = final ? 4 : 3;

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
          fillOpacity={final ? 0.18 : 0.3}
          stroke={C.brass}
          strokeWidth="0.8"
        />
      ))}

      {Array.from({ length: workers }).map((_, i) => (
        <g key={i}>
          <Panel
            x={420}
            y={96 + i * 70}
            w={130}
            h={54}
            label={final && i === 3 ? 'worker 4' : `worker ${i + 1}`}
            color={C.healthy}
            sub={final && i === 3 ? 'scaled' : undefined}
          />
          <Arrow x1={342} y1={193} x2={418} y2={123 + i * 70} color={C.focus} />
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

      <text x="320" y="382" textAnchor="middle" fontSize="9" fill={final ? C.healthy : C.border}>
        {final ? 'scaled consumers · backlog cleared' : 'lease-based redelivery to workers'}
      </text>
    </Frame>
  );
}

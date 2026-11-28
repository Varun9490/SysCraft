'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

// Step 5 (s === 4) is the drained / caught-up final state, not a repeat of step 1.
const LAGS = [
  [30, 18, 24],
  [20, 28, 12],
  [10, 14, 6],
  [4, 6, 2],
  [1, 2, 1],
];

export function KafkaPartitionsVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const lags = LAGS[s] ?? LAGS[0];
  const final = s === 4;

  return (
    <Frame title="kafka partitions" step={s} active={active}>
      <text x="100" y="78" textAnchor="middle" fontSize="10" fill={C.focus}>
        topic
      </text>

      {[0, 1, 2].map((i) => {
        const y = 104 + i * 78;
        return (
          <g key={i}>
            <rect
              x="60"
              y={y}
              width="410"
              height="46"
              rx="7"
              fill={C.brass}
              fillOpacity="0.07"
              stroke={C.brass}
              strokeWidth="1.2"
            />
            <text x="78" y={y + 28} fontSize="11" fill="currentColor">
              {`p${i}`}
            </text>
            <rect
              x="120"
              y={y + 8}
              width={lags[i] * 2.2}
              height="9"
              rx="2"
              fill={lags[i] > 20 ? C.warning : C.healthy}
              fillOpacity="0.75"
            />
            <text x="120" y={y + 38} fontSize="8" fill={C.border}>
              {`lag ${lags[i]}`}
            </text>
            <Arrow x1={470} y1={y + 23} x2={506} y2={190 + i * 14} color={C.focus} />
          </g>
        );
      })}

      <Panel x={510} y={142} w={106} h={108} label="consumer group" color={C.focus} fontSize={11} />
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={528 + i * 28}
          y={196}
          width="20"
          height="20"
          rx="4"
          fill={C.focus}
          fillOpacity="0.3"
          stroke={C.focus}
          strokeWidth="1"
        />
      ))}
      <text x="563" y="236" textAnchor="middle" fontSize="8" fill={C.border}>
        3 consumers
      </text>

      <text x="320" y="360" textAnchor="middle" fontSize="9" fill={final ? C.healthy : C.border}>
        {final ? 'lag drained · offsets committed · steady' : 'in-flight lag per partition'}
      </text>
    </Frame>
  );
}

'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

const STAGES = ['plan', 'tool allowlist', 'result', 'stop'];
const SPOTS: readonly (readonly [number, number])[] = [
  [70, 120],
  [360, 120],
  [360, 270],
  [70, 270],
];

export function AgentLoopVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  // s === 4 is the completed final state: loop stopped with an audit trail.
  const final = s === 4;
  const activeStage = final ? 3 : s;

  return (
    <Frame title="agent loop" step={s} active={active}>
      {STAGES.map((label, i) => {
        const [x, y] = SPOTS[i];
        const on = i === activeStage;
        const col = label === 'stop' ? C.healthy : on ? C.brass : C.border;
        return (
          <Panel
            key={label}
            x={x}
            y={y}
            w={180}
            h={62}
            label={label}
            color={col}
            filled={on}
            sub={on ? (final ? 'done' : 'active') : undefined}
          />
        );
      })}

      <Arrow x1={250} y1={151} x2={358} y2={151} />
      <Arrow x1={450} y1={182} x2={450} y2={268} />
      <Arrow x1={358} y1={301} x2={252} y2={301} color={C.focus} />
      <Arrow x1={160} y1={268} x2={160} y2={184} color={C.focus} />

      {final ? (
        <g>
          <rect
            x="480"
            y="200"
            width="130"
            height="42"
            rx={6}
            fill={C.healthy}
            fillOpacity="0.12"
            stroke={C.healthy}
            strokeWidth="1"
          />
          <text x="545" y="226" textAnchor="middle" fontSize="9" fill={C.healthy}>
            audit logged
          </text>
          <text x="545" y="258" textAnchor="middle" fontSize="9" fill={C.healthy}>
            loop ended
          </text>
        </g>
      ) : (
        <g>
          <rect
            x="480"
            y="200"
            width="130"
            height="42"
            rx={6}
            fill="none"
            stroke={C.danger}
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.8"
          />
          <text x="545" y="226" textAnchor="middle" fontSize="9" fill={C.danger}>
            other tool
          </text>
          <line x1="492" y1="208" x2="598" y2="234" stroke={C.danger} strokeWidth="1.5" />
          <line x1="598" y1="208" x2="492" y2="234" stroke={C.danger} strokeWidth="1.5" />
          <text x="545" y="258" textAnchor="middle" fontSize="9" fill={C.border}>
            not allowed
          </text>
        </g>
      )}
    </Frame>
  );
}

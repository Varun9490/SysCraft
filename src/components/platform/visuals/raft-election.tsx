'use client';

import { Arrow, C, Frame, useStep, type VisualProps } from './Frame';

const CX = 320;
const CY = 210;
const R = 124;

function pos(i: number): readonly [number, number] {
  const a = ((-90 + i * 72) * Math.PI) / 180;
  return [CX + R * Math.cos(a), CY + R * Math.sin(a)];
}

export function RaftElectionVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const term = 1 + s;
  const leader = s === 3 ? 0 : s % 5;
  const stepped = s === 3 ? 1 : -1;
  const candidate = s === 0 ? 4 : -1;

  const nodes = Array.from({ length: 5 }).map((_, i) => {
    const [x, y] = pos(i);
    const state = i === stepped ? 'step down' : i === leader ? 'leader' : i === candidate ? 'candidate' : 'follower';
    const color = i === stepped ? C.warning : i === leader ? C.healthy : i === candidate ? C.focus : C.border;
    return { x, y, state, color, i };
  });
  const lead = nodes[leader];

  return (
    <Frame title="raft election" step={s} active={active}>
      <text x="320" y="56" textAnchor="middle" fontSize="10" fill={C.brass}>
        {`term ${term}`}
      </text>

      {s === 3 ? (
        <line x1="388" y1="60" x2="388" y2="352" stroke={C.warning} strokeWidth="1" strokeDasharray="5 5" />
      ) : null}

      {nodes
        .filter((n) => n.i !== leader && n.i !== stepped)
        .map((n) => (
          <Arrow key={n.i} x1={n.x} y1={n.y} x2={lead.x} y2={lead.y} color={C.focus} opacity={0.5} />
        ))}

      {nodes.map((n) => (
        <g key={n.i}>
          <circle
            cx={n.x}
            cy={n.y}
            r={24}
            fill={n.color}
            fillOpacity={n.i === leader || n.i === stepped ? 0.18 : 0.06}
            stroke={n.color}
            strokeWidth="1.4"
            strokeDasharray={n.i === stepped ? '3 3' : undefined}
          />
          <text x={n.x} y={n.y - 2} textAnchor="middle" fontSize="10" fill="currentColor">
            {`n${n.i}`}
          </text>
          <text x={n.x} y={n.y + 11} textAnchor="middle" fontSize="8" fill={n.color}>
            {n.state}
          </text>
        </g>
      ))}

      {s === 3 ? (
        <text x="320" y="372" textAnchor="middle" fontSize="9" fill={C.warning}>
          leader steps down
        </text>
      ) : null}
    </Frame>
  );
}

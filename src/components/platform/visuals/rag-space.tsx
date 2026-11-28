'use client';

import { C, Frame, useStep, type VisualProps } from './Frame';

const PTS: readonly (readonly [number, number])[] = [
  [130, 120],
  [185, 150],
  [220, 110],
  [260, 170],
  [300, 130],
  [350, 190],
  [400, 140],
  [450, 200],
  [500, 160],
  [170, 250],
  [240, 270],
  [330, 250],
  [420, 280],
  [520, 250],
  [120, 200],
  [370, 100],
];
const QUERIES: readonly (readonly [number, number])[] = [
  [200, 150],
  [300, 160],
  [400, 180],
  [460, 190],
  [360, 175],
];

export function RagSpaceVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const q = QUERIES[s] ?? QUERIES[0];
  const ranked = PTS.map((p, i) => ({ p, i, d: Math.hypot(p[0] - q[0], p[1] - q[1]) })).sort(
    (a, b) => a.d - b.d,
  );
  const near = ranked.slice(0, 3).map((r) => r.i);
  const nearSet = new Set(near);
  const reject = ranked[ranked.length - 1];
  // The final step is the permission-aware result set: the nearest neighbor is
  // filtered out by ACL even though it has the best lexical/semantic score.
  const final = s === 4;
  const filtered = final ? near[0] : -1;

  return (
    <Frame title="rag space" step={s} active={active}>
      <rect
        x="56"
        y="66"
        width="512"
        height="272"
        rx="8"
        fill={C.focus}
        fillOpacity="0.03"
        stroke={C.border}
        strokeWidth="1"
      />
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1={56}
          y1={100 + i * 62}
          x2={568}
          y2={100 + i * 62}
          stroke={C.border}
          strokeOpacity="0.4"
          strokeWidth="0.6"
        />
      ))}

      {PTS.map((p, i) => {
        const isNear = nearSet.has(i);
        const isRejected = i === reject.i || i === filtered;
        return (
          <g key={i}>
            {isNear && i !== filtered ? (
              <circle cx={p[0]} cy={p[1]} r="11" fill="none" stroke={C.brass} strokeOpacity="0.6" strokeWidth="1" />
            ) : null}
            <circle
              cx={p[0]}
              cy={p[1]}
              r={isNear ? 4.5 : 3}
              fill={isRejected ? C.danger : isNear ? C.brass : C.border}
              stroke={isRejected ? C.danger : 'none'}
              strokeWidth="1.2"
              strokeDasharray={isRejected ? '2 2' : undefined}
            />
            {i === filtered ? (
              <text x={p[0]} y={p[1] - 12} textAnchor="middle" fontSize="8" fill={C.danger}>
                acl deny
              </text>
            ) : null}
          </g>
        );
      })}

      <circle cx={q[0]} cy={q[1]} r="16" fill="none" stroke={C.focus} strokeWidth="1.2" strokeDasharray="3 3" />
      <circle cx={q[0]} cy={q[1]} r="5" fill={C.focus} />
      <line x1={q[0] - 22} y1={q[1]} x2={q[0] - 9} y2={q[1]} stroke={C.focus} strokeWidth="1" />
      <line x1={q[0] + 9} y1={q[1]} x2={q[0] + 22} y2={q[1]} stroke={C.focus} strokeWidth="1" />
      <text x={q[0]} y={q[1] - 24} textAnchor="middle" fontSize="9" fill={C.focus}>
        query
      </text>

      <text x="72" y="354" fontSize="9" fill={C.brass}>
        3 neighbors
      </text>
      <text x="552" y="354" textAnchor="end" fontSize="9" fill={C.danger}>
        {final ? 'top hit ACL-filtered' : 'low score rejected'}
      </text>
    </Frame>
  );
}

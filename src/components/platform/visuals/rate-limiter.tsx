'use client';

import { Arrow, C, FlowDot, Frame, Panel, useReducedMotion, useStep, type VisualProps } from './Frame';

export function RateLimiterVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const reduce = useReducedMotion();
  const tokens = 4 - s;
  const denied = s === 3;

  return (
    <Frame title="token bucket" step={s} active={active}>
      <text x="120" y="80" textAnchor="middle" fontSize="10" fill={C.focus}>
        refill
      </text>
      {s < 3 ? (
        <FlowDot from={[260, 54]} to={[260, 112]} reduce={reduce} color={C.healthy} duration={1.6} />
      ) : null}
      <Arrow x1={260} y1={54} x2={260} y2={104} color={C.healthy} dashed />

      <rect
        x="172"
        y="112"
        width="176"
        height="180"
        rx="12"
        fill={C.healthy}
        fillOpacity="0.05"
        stroke={C.healthy}
        strokeWidth="1.3"
      />
      {Array.from({ length: 4 }).map((_, i) => {
        const filled = i < tokens;
        return (
          <circle
            key={i}
            cx={214 + i * 38}
            cy={236}
            r={13}
            fill={filled ? C.brass : 'none'}
            stroke={filled ? C.brass : C.border}
            strokeWidth="1.4"
            strokeDasharray={filled ? undefined : '3 3'}
          />
        );
      })}
      <text x="260" y="140" textAnchor="middle" fontSize="10" fill="currentColor">
        bucket
      </text>
      <text x="260" y="270" textAnchor="middle" fontSize="9" fill={denied ? C.danger : C.healthy}>
        {`${tokens} tokens`}
      </text>

      <Panel x={468} y={168} w={132} h={62} label="request" color={denied ? C.danger : C.focus} />
      <Arrow x1={348} y1={196} x2={466} y2={196} color={denied ? C.danger : C.focus} />

      {denied ? (
        <g>
          <line x1="500" y1="248" x2="570" y2="316" stroke={C.danger} strokeWidth="2" />
          <line x1="570" y1="248" x2="500" y2="316" stroke={C.danger} strokeWidth="2" />
          <text x="534" y="338" textAnchor="middle" fontSize="9" fill={C.danger}>
            denied
          </text>
        </g>
      ) : (
        <text x="534" y="252" textAnchor="middle" fontSize="9" fill={C.healthy}>
          allowed
        </text>
      )}
    </Frame>
  );
}

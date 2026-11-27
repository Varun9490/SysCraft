'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

export function ThreatDefenseVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const on = s >= 2;

  return (
    <Frame title="input defense" step={s} active={active}>
      <Panel x={40} y={156} w={170} h={68} label="untrusted text" sub="external" color={C.warning} />

      <Arrow x1={210} y1={190} x2={on ? 330 : 468} y2={190} color={on ? C.danger : C.warning} />

      {on ? (
        <g>
          <path
            d="M 400 118 L 452 138 L 452 196 C 452 232 424 254 400 262 C 376 254 348 232 348 196 L 348 138 Z"
            fill={C.healthy}
            fillOpacity="0.12"
            stroke={C.healthy}
            strokeWidth="1.6"
          />
          <text x="400" y="196" textAnchor="middle" fontSize="12" fill={C.healthy}>
            shield
          </text>
          <text x="400" y="282" textAnchor="middle" fontSize="9" fill={C.danger}>
            blocked
          </text>
        </g>
      ) : (
        <text x="400" y="282" textAnchor="middle" fontSize="9" fill={C.warning}>
          inspecting
        </text>
      )}

      <Panel x={470} y={156} w={130} h={68} label="service" sub="trusted" color={on ? C.border : C.healthy} />
      {on ? null : <Arrow x1={452} y1={190} x2={468} y2={190} color={C.healthy} />}
    </Frame>
  );
}

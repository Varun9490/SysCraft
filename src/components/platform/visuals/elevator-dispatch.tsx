'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

const FLOORS = [8, 7, 6, 5, 4, 3, 2, 1];

export function ElevatorDispatchVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const carFloor = [1, 3, 5, 6, 4][s];
  const final = s === 4;

  return (
    <Frame title="elevator dispatch" step={s} active={active}>
      <text x="320" y="74" textAnchor="middle" fontSize="10" fill={C.focus}>
        {[
          'shaft · hall calls and car position',
          'SCAN · sweep in one direction',
          'LOOK · reverse at last request',
          'dispatch score · nearest + direction',
          'safety interlock · guarded movement (final)',
        ][s]}
      </text>

      <rect x={70} y={96} width={150} height={248} rx={8} fill={C.border} fillOpacity="0.08" stroke={C.border} strokeWidth="1" />
      <rect x={420} y={96} width={150} height={248} rx={8} fill={C.border} fillOpacity="0.08" stroke={C.border} strokeWidth="1" />
      {FLOORS.map((f, i) => {
        const y = 108 + i * 29;
        const requested = (s === 0 && (f === 6 || f === 2)) || (s === 1 && f >= carFloor) || (s === 2 && (f === 7 || f === 3)) || (s === 3 && f === carFloor);
        return (
          <g key={f}>
            <text x={56} y={y + 12} textAnchor="end" fontSize="10" fill={C.border}>{f}</text>
            <line x1={70} y1={y + 8} x2={220} y2={y + 8} stroke={C.border} strokeOpacity="0.4" strokeWidth="0.7" />
            <text x={236} y={y + 12} fontSize="9" fill={requested ? C.warning : C.border}>
              {requested ? (f > carFloor ? '▲ call' : '▼ call') : '·'}
            </text>
          </g>
        );
      })}

      {(() => {
        const y = 108 + (8 - carFloor) * 29;
        return (
          <g>
            <rect x={438} y={y} width={114} height={26} rx={5} fill={final ? C.healthy : C.brass} fillOpacity="0.22" stroke={final ? C.healthy : C.brass} strokeWidth="1.4" />
            <text x={495} y={y + 17} textAnchor="middle" fontSize="10" fill="currentColor">car {carFloor}</text>
          </g>
        );
      })()}

      {s === 1 ? (
        <g>
          <Arrow x1={495} y1={270} x2={495} y2={140} color={C.brass} />
          <text x="320" y="360" textAnchor="middle" fontSize="10" fill={C.brass}>
            SCAN: keep going up, serve requests in path order
          </text>
        </g>
      ) : null}
      {s === 2 ? (
        <g>
          <Arrow x1={495} y1={140} x2={495} y2={270} color={C.warning} />
          <text x="320" y="360" textAnchor="middle" fontSize="10" fill={C.warning}>
            LOOK: turn around at the highest requested floor
          </text>
        </g>
      ) : null}
      {s === 3 ? (
        <text x="320" y="360" textAnchor="middle" fontSize="10" fill={C.healthy}>
          score = distance + same-direction bonus − load penalty
        </text>
      ) : null}
      {s === 0 ? (
        <text x="320" y="360" textAnchor="middle" fontSize="10" fill={C.border}>
          each call is a durable request, not a fragile socket signal
        </text>
      ) : null}

      {final ? (
        <g>
          <Panel x={268} y={180} w={130} h={52} label="door locked" color={C.danger} sub="until stopped" />
          <text x="320" y="260" textAnchor="middle" fontSize="9" fill={C.border}>interlock verified</text>
          <text x="320" y="360" textAnchor="middle" fontSize="10" fill={C.healthy}>
            local safety authority wins: no movement until the door state is proven
          </text>
        </g>
      ) : null}
    </Frame>
  );
}

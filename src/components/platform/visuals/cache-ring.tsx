'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

const CX = 300;
const CY = 188;
const R = 104;
const N = 12;

function pt(i: number): readonly [number, number] {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2;
  return [CX + R * Math.cos(a), CY + R * Math.sin(a)];
}

export function CacheRingVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const final = s === 4;
  // Final step is the fully warm, steady cache: no cold miss, distinct from s0.
  const hit = final ? 6 : (s * 3) % N;
  const miss = final ? -1 : (hit + 5) % N;

  return (
    <Frame title="cache ring" step={s} active={active}>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke={C.border} strokeWidth="13" strokeOpacity="0.55" />
      <circle cx={CX} cy={CY} r={R} fill="none" stroke={C.brass} strokeWidth="1.2" strokeOpacity="0.55" />

      {Array.from({ length: N }).map((_, i) => {
        const [x, y] = pt(i);
        const isHit = i === hit;
        const isMiss = i === miss;
        return (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r={isHit ? 7 : 4}
              fill={isHit ? C.brass : isMiss ? 'none' : C.border}
              stroke={isMiss ? C.warning : 'none'}
              strokeWidth="1.5"
              strokeDasharray={isMiss ? '3 2' : undefined}
            />
            {isHit ? (
              <text x={x} y={y - 14} textAnchor="middle" fontSize="9" fill={C.brass}>
                hit
              </text>
            ) : null}
            {isMiss ? (
              <text x={x} y={y - 14} textAnchor="middle" fontSize="9" fill={C.warning}>
                miss
              </text>
            ) : null}
          </g>
        );
      })}

      <text x={CX} y={CY - 4} textAnchor="middle" fontSize="11" fill="currentColor">
        cache
      </text>
      <text x={CX} y={CY + 13} textAnchor="middle" fontSize="9" fill={C.focus}>
        {final ? `${N}/${N} warm` : `${N - 2}/${N} warm`}
      </text>

      {!final ? (
        <g>
          <Arrow x1={pt(miss)[0]} y1={pt(miss)[1] + 6} x2={536} y2={304} color={C.warning} dashed />
          <Panel x={486} y={304} w={116} h={44} label="disk" sub="cold read" color={C.warning} />
        </g>
      ) : (
        <text x="320" y="356" textAnchor="middle" fontSize="9" fill={C.healthy}>
          steady hit rate · no cold reads
        </text>
      )}
    </Frame>
  );
}

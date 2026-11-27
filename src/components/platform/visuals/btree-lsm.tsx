'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

export function BTreeLsmVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const hi = s % 2;

  return (
    <Frame title="btree / lsm" step={s} active={active}>
      <line x1="318" y1="46" x2="318" y2="356" stroke={C.border} strokeWidth="1" />
      <text x="160" y="70" textAnchor="middle" fontSize="10" fill={C.focus}>
        btree · in place
      </text>
      <text x="480" y="70" textAnchor="middle" fontSize="10" fill={C.brass}>
        lsm · append + flush
      </text>

      <Panel x={100} y={106} w={120} h={42} label="root page" color={C.brass} />
      <Panel x={40} y={214} w={112} h={42} label="leaf 1" color={hi === 0 ? C.focus : C.border} filled={hi === 0} />
      <Panel x={168} y={214} w={112} h={42} label="leaf 2" color={hi === 1 ? C.focus : C.border} filled={hi === 1} />
      <Arrow x1={160} y1={148} x2={96} y2={212} />
      <Arrow x1={160} y1={148} x2={224} y2={212} />
      <text x="166" y="288" textAnchor="middle" fontSize="9" fill={C.border}>
        rewrite page
      </text>

      <Panel x={392} y={104} w={176} h={44} label="memtable" sub="in memory" color={C.healthy} />
      {s > 0 ? <Arrow x1={480} y1={150} x2={480} y2={178} color={C.brass} /> : null}

      {Array.from({ length: s }).map((_, i) => {
        const w = 150 - i * 26;
        const x = 405 + (150 - w) / 2;
        const y = 182 + i * 50;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={w}
              height={34}
              rx={5}
              fill={C.brass}
              fillOpacity={0.1}
              stroke={C.brass}
              strokeWidth="1"
            />
            <text x={x + w / 2} y={y + 21} textAnchor="middle" fontSize="9" fill="currentColor">
              {`run ${i + 1}`}
            </text>
          </g>
        );
      })}

      {s === 0 ? (
        <text x="480" y="212" textAnchor="middle" fontSize="9" fill={C.border}>
          no flush yet
        </text>
      ) : null}
      <text x="480" y="340" textAnchor="middle" fontSize="9" fill={s > 0 ? C.brass : C.border}>
        {s > 0 ? 'sorted runs on disk' : 'buffer writes'}
      </text>
    </Frame>
  );
}

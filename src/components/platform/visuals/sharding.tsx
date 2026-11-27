'use client';

import { C, Frame, Panel, useStep, type VisualProps } from './Frame';

const SPOTS: readonly (readonly [number, number])[] = [
  [100, 104],
  [360, 104],
  [100, 224],
  [360, 224],
];

export function ShardingVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const hot = s % 4;
  const split = s === 3;

  return (
    <Frame title="sharding" step={s} active={active}>
      {SPOTS.map(([x, y], i) => {
        if (split && i === hot) {
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width="170"
                height="82"
                rx="8"
                fill="none"
                stroke={C.border}
                strokeWidth="1"
                strokeDasharray="4 3"
              />
              <rect
                x={x + 8}
                y={y + 12}
                width="72"
                height="58"
                rx="6"
                fill={C.healthy}
                fillOpacity="0.16"
                stroke={C.healthy}
                strokeWidth="1.2"
              />
              <rect
                x={x + 90}
                y={y + 12}
                width="72"
                height="58"
                rx="6"
                fill={C.healthy}
                fillOpacity="0.16"
                stroke={C.healthy}
                strokeWidth="1.2"
              />
              <text x={x + 44} y={y + 46} textAnchor="middle" fontSize="9" fill="currentColor">
                a
              </text>
              <text x={x + 126} y={y + 46} textAnchor="middle" fontSize="9" fill="currentColor">
                b
              </text>
            </g>
          );
        }
        return (
          <Panel
            key={i}
            x={x}
            y={y}
            w={170}
            h={82}
            label={`shard ${i + 1}`}
            sub={i === hot ? 'hot' : `${(i + 1) * 25}%`}
            color={i === hot ? C.warning : C.border}
            filled={i === hot}
          />
        );
      })}

      <text x="320" y="344" textAnchor="middle" fontSize="9" fill={split ? C.healthy : C.warning}>
        {split ? 'hot shard split' : `shard ${hot + 1} hot`}
      </text>
    </Frame>
  );
}

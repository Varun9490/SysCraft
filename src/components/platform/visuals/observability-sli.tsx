'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

const BURN = [0.4, 1.2, 6.5, 14.4, 2.0];

export function ObservabilitySliVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);

  return (
    <Frame title="sli / slo / alerts" step={s} active={active}>
      <text x="320" y="74" textAnchor="middle" fontSize="10" fill={C.focus}>
        {[
          'SLI · good events / valid events',
          'SLO target · 99.9%',
          'error budget · consumed vs remaining',
          'burn rate · fast and slow windows',
          'alert state · pending → firing → resolved (final)',
        ][s]}
      </text>

      {s === 0 ? (
        <g>
          <Panel x={60} y={140} w={140} h={58} label="good events" color={C.healthy} />
          <text x={214} y={174} textAnchor="middle" fontSize="16" fill={C.brass}>/</text>
          <Panel x={232} y={140} w={140} h={58} label="valid events" color={C.focus} />
          <Arrow x1={372} y1={169} x2={424} y2={169} />
          <rect x={428} y={132} width={150} height={74} rx={8} fill={C.brass} fillOpacity="0.12" stroke={C.brass} strokeWidth="1.3" />
          <text x={503} y={164} textAnchor="middle" fontSize="12" fill="currentColor">SLI</text>
          <text x={503} y={188} textAnchor="middle" fontSize="10" fill={C.border}>99.94%</text>
          <text x="320" y="268" textAnchor="middle" fontSize="9" fill={C.border}>
            measure what users experience, not what the server happened to emit
          </text>
        </g>
      ) : null}

      {s === 1 ? (
        <g>
          <rect x={80} y={140} width={480} height={60} rx={8} fill={C.healthy} fillOpacity="0.12" stroke={C.healthy} strokeWidth="1.2" />
          <rect x={80} y={140} width={480 * 0.06} height={60} rx={8} fill={C.danger} fillOpacity="0.45" stroke={C.danger} strokeWidth="1" />
          <text x="320" y={176} textAnchor="middle" fontSize="12" fill="currentColor">SLO ≥ 99.9%</text>
          <text x="80" y="232" fontSize="10" fill={C.danger}>bad</text>
          <text x="560" y="232" textAnchor="end" fontSize="10" fill={C.healthy}>good</text>
          <text x="320" y="286" textAnchor="middle" fontSize="9" fill={C.border}>
            the target and its measurement must be reviewed together
          </text>
        </g>
      ) : null}

      {s === 2 ? (
        <g>
          <text x="80" y="140" fontSize="10" fill={C.border}>error budget</text>
          <rect x="80" y="156" width="480" height="42" rx={8} fill={C.border} fillOpacity="0.4" />
          <rect x="80" y="156" width={480 * 0.63} height="42" rx={8} fill={C.brass} fillOpacity="0.6" />
          <text x="320" y={183} textAnchor="middle" fontSize="11" fill="currentColor">63% spent · 37% left</text>
          <Arrow x1={80} y1={232} x2={560} y2={232} color={C.focus} />
          <text x="320" y="270" textAnchor="middle" fontSize="9" fill={C.healthy}>
            spend the budget deliberately; freeze risky releases when it runs out
          </text>
        </g>
      ) : null}

      {s === 3 ? (
        <g>
          {[
            { l: '1h burn', v: BURN[3], c: C.danger },
            { l: '6h burn', v: BURN[2], c: C.warning },
            { l: 'current', v: BURN[4], c: C.healthy },
          ].map((row, i) => (
            <g key={row.l}>
              <text x="80" y={150 + i * 62} fontSize="10" fill={C.border}>{row.l}</text>
              <rect x="170" y={136 + i * 62} width={330} height={24} rx={6} fill={C.border} fillOpacity="0.35" />
              <rect x="170" y={136 + i * 62} width={Math.min(330, (row.v / 15) * 330)} height={24} rx={6} fill={row.c} fillOpacity="0.65" />
              <text x={514} y={154 + i * 62} fontSize="10" fill={row.c}>{`${row.v.toFixed(1)}×`}</text>
            </g>
          ))}
          <text x="320" y="350" textAnchor="middle" fontSize="9" fill={C.border}>
            fast window catches acute regressions · slow window confirms sustained pain
          </text>
        </g>
      ) : null}

      {s === 4 ? (
        <g>
          {[
            { l: 'pending', c: C.warning, x: 60 },
            { l: 'firing', c: C.danger, x: 250 },
            { l: 'resolved', c: C.healthy, x: 440 },
          ].map((st, i) => (
            <g key={st.l}>
              <rect x={st.x} y={140} width={140} height={62} rx={8} fill={st.c} fillOpacity="0.14" stroke={st.c} strokeWidth="1.4" />
              <text x={st.x + 70} y={177} textAnchor="middle" fontSize="12" fill="currentColor">{st.l}</text>
              {i < 2 ? <Arrow x1={st.x + 142} y1={171} x2={st.x + 188} y2={171} color={C.brass} /> : null}
            </g>
          ))}
          <rect x="120" y="250" width="400" height="62" rx={8} fill={C.focus} fillOpacity="0.08" stroke={C.focus} strokeWidth="1.1" />
          <text x="320" y={276} textAnchor="middle" fontSize="10" fill="currentColor">durable alert state survives restarts</text>
          <text x="320" y={298} textAnchor="middle" fontSize="9" fill={C.border}>
            page only on user-visible burn, never on raw threshold alone
          </text>
        </g>
      ) : null}
    </Frame>
  );
}

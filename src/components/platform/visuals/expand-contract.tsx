'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

export function ExpandContractVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);

  return (
    <Frame title="expand / contract" step={s} active={active}>
      <text x="320" y="74" textAnchor="middle" fontSize="10" fill={C.focus}>
        {[
          'old schema · one column',
          'expand · add new column, dual-write',
          'backfill · old values into new column',
          'shadow read · verify parity',
          'contract · drop the old column (final)',
        ][s]}
      </text>

      {s === 0 ? (
        <g>
          <rect x={170} y={140} width={300} height={90} rx={9} fill={C.border} fillOpacity="0.1" stroke={C.border} strokeWidth="1.3" />
          <text x={320} y={174} textAnchor="middle" fontSize="12" fill="currentColor">users</text>
          <text x={320} y={206} textAnchor="middle" fontSize="11" fill={C.brass}>name (old)</text>
          <text x="320" y="276" textAnchor="middle" fontSize="9" fill={C.border}>
            old and new code must both work during the migration
          </text>
        </g>
      ) : null}

      {s === 1 ? (
        <g>
          <Panel x={60} y={130} w={150} h={56} label="new code" color={C.healthy} sub="dual-write" />
          <Arrow x1={210} y1={158} x2={260} y2={158} color={C.healthy} />
          <rect x={264} y={120} width={310} height={110} rx={9} fill={C.brass} fillOpacity="0.08" stroke={C.brass} strokeWidth="1.3" />
          <text x={419} y={148} textAnchor="middle" fontSize="11" fill="currentColor">users</text>
          <text x={419} y={178} textAnchor="middle" fontSize="11" fill={C.warning}>name (old)</text>
          <text x={419} y={208} textAnchor="middle" fontSize="11" fill={C.healthy}>full_name (new)</text>
          <text x="320" y="280" textAnchor="middle" fontSize="9" fill={C.border}>
            additive change is backward compatible with old readers
          </text>
        </g>
      ) : null}

      {s === 2 ? (
        <g>
          <Panel x={60} y={150} w={140} h={56} label="backfill job" color={C.brass} sub="batched" />
          <Arrow x1={200} y1={178} x2={250} y2={178} />
          <rect x={254} y={146} width={320} height={64} rx={8} fill={C.brass} fillOpacity="0.1" stroke={C.brass} strokeWidth="1.2" />
          <text x="414" y={174} textAnchor="middle" fontSize="11" fill="currentColor">name → full_name</text>
          <text x="414" y={196} textAnchor="middle" fontSize="9" fill={C.border}>idempotent, resumable, rate-limited</text>
          <rect x="110" y="250" width="420" height="26" rx={6} fill={C.border} fillOpacity="0.4" />
          <rect x="110" y="250" width={420 * 0.72} height="26" rx={6} fill={C.healthy} fillOpacity="0.6" />
          <text x="320" y="304" textAnchor="middle" fontSize="9" fill={C.border}>
            use keyset pagination, never OFFSET over a changing table
          </text>
        </g>
      ) : null}

      {s === 3 ? (
        <g>
          <Panel x={70} y={140} w={160} h={58} label="read old" color={C.warning} />
          <Panel x={70} y={230} w={160} h={58} label="read new" color={C.healthy} />
          <Arrow x1={230} y1={169} x2={282} y2={200} color={C.warning} />
          <Arrow x1={230} y1={259} x2={282} y2={224} color={C.healthy} />
          <rect x={286} y={170} width={160} height={86} rx={8} fill={C.focus} fillOpacity="0.1" stroke={C.focus} strokeWidth="1.3" />
          <text x={366} y={204} textAnchor="middle" fontSize="11" fill="currentColor">compare</text>
          <text x={366} y={230} textAnchor="middle" fontSize="10" fill={C.healthy}>parity ✓</text>
          <Arrow x1={446} y1={213} x2={492} y2={213} color={C.healthy} />
          <Panel x={496} y={184} w={100} h={58} label="cutover" color={C.healthy} />
          <text x="320" y="310" textAnchor="middle" fontSize="9" fill={C.border}>
            shadow reads expose mismatches before traffic switches
          </text>
        </g>
      ) : null}

      {s === 4 ? (
        <g>
          <rect x={180} y={130} width={280} height={100} rx={9} fill={C.healthy} fillOpacity="0.1" stroke={C.healthy} strokeWidth="1.4" />
          <text x={320} y={166} textAnchor="middle" fontSize="12" fill="currentColor">users</text>
          <text x={320} y={200} textAnchor="middle" fontSize="12" fill={C.healthy}>full_name (only)</text>
          <Arrow x1={320} y1={104} x2={320} y2={128} color={C.healthy} />
          <text x="320" y={98} textAnchor="middle" fontSize="10" fill={C.healthy}>contract complete</text>
          <text x="320" y="274" textAnchor="middle" fontSize="10" fill={C.healthy}>
            old column dropped only after every reader has moved
          </text>
          <text x="320" y="302" textAnchor="middle" fontSize="9" fill={C.border}>
            keep the rollback window explicit and rehearsed
          </text>
        </g>
      ) : null}
    </Frame>
  );
}

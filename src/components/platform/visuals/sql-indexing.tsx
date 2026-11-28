'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

export function SqlIndexingVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);

  return (
    <Frame title="sql indexing" step={s} active={active}>
      <text x="320" y="74" textAnchor="middle" fontSize="10" fill={C.focus}>
        {[
          'query with a literal value',
          'normalize · parameterize + fold case',
          'B-tree index lookup on the key',
          'row pointer → heap fetch',
          'prepared statement · safe identifiers (final)',
        ][s]}
      </text>

      {s === 0 ? (
        <g>
          <rect x={70} y={140} width={500} height={70} rx={8} fill={C.brass} fillOpacity="0.08" stroke={C.brass} strokeWidth="1.2" />
          <text x={90} y={174} fontSize="12" fill="currentColor">SELECT * FROM users</text>
          <text x={90} y={196} fontSize="12" fill={C.warning}>{"WHERE email = 'Ada@Example.com';"}</text>
          <text x="320" y="266" textAnchor="middle" fontSize="9" fill={C.border}>
            the literal is a value, not SQL structure — never concatenate it
          </text>
        </g>
      ) : null}

      {s === 1 ? (
        <g>
          <Panel x={60} y={140} w={160} h={58} label="Ada@Example.com" color={C.warning} fontSize={10} />
          <Arrow x1={220} y1={169} x2={272} y2={169} />
          <Panel x={276} y={140} w={150} h={58} label="ada@example.com" color={C.healthy} sub="lowercase + trimmed" fontSize={11} />
          <Arrow x1={426} y1={169} x2={478} y2={169} color={C.healthy} />
          <Panel x={482} y={140} w={98} h={58} label="key" color={C.brass} sub="indexed" />
          <text x="320" y="252" textAnchor="middle" fontSize="9" fill={C.border}>
            normalization must be identical at write time and read time
          </text>
        </g>
      ) : null}

      {s === 2 ? (
        <g>
          <Panel x={60} y={150} w={120} h={54} label="root" color={C.brass} />
          <Arrow x1={180} y1={177} x2={220} y2={177} />
          <Panel x={224} y={150} w={120} h={54} label="branch" color={C.brass} />
          <Arrow x1={344} y1={177} x2={384} y2={177} />
          <Panel x={388} y={150} w={120} h={54} label="leaf" color={C.healthy} sub="ada → row 42" />
          <text x="320" y="252" textAnchor="middle" fontSize="10" fill={C.healthy}>
            O(log n) comparisons instead of a full table scan
          </text>
          <text x="320" y="284" textAnchor="middle" fontSize="9" fill={C.border}>
            a function on the indexed column can defeat the index
          </text>
        </g>
      ) : null}

      {s === 3 ? (
        <g>
          <Panel x={70} y={140} w={150} h={58} label="index leaf" color={C.healthy} sub="row 42" />
          <Arrow x1={220} y1={169} x2={272} y2={169} color={C.healthy} />
          <rect x={276} y={120} width={290} height={140} rx={8} fill={C.focus} fillOpacity="0.07" stroke={C.focus} strokeWidth="1.2" />
          <text x={296} y={148} fontSize="10" fill={C.focus}>heap / clustered row</text>
          <text x={296} y={180} fontSize="11" fill="currentColor">id 42 · ada@example.com</text>
          <text x={296} y={208} fontSize="11" fill="currentColor">role: reader · active</text>
          <text x={296} y={244} fontSize="9" fill={C.border}>non-covering index needs a row fetch</text>
          <text x="320" y="300" textAnchor="middle" fontSize="9" fill={C.healthy}>
            include frequently read columns to avoid extra lookups
          </text>
        </g>
      ) : null}

      {s === 4 ? (
        <g>
          <rect x={70} y={140} width={480} height={64} rx={8} fill={C.healthy} fillOpacity="0.1" stroke={C.healthy} strokeWidth="1.3" />
          <text x={90} y={170} fontSize="12" fill="currentColor">WHERE email = $1</text>
          <text x={90} y={192} fontSize="10" fill={C.healthy}>bind parameter · never interpolate</text>
          <Panel x={70} y={244} w={230} h={54} label="value → data" color={C.healthy} sub="escaped by the driver" />
          <Panel x={330} y={244} w={220} h={54} label="identifiers → allowlist" color={C.brass} sub="sort column, direction" />
          <text x="320" y="340" textAnchor="middle" fontSize="9" fill={C.healthy}>
            parameters carry values; identifiers must be chosen from a fixed set
          </text>
        </g>
      ) : null}
    </Frame>
  );
}

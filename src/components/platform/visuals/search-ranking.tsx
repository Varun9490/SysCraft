'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

const DOCS = [
  { id: 'd1', terms: ['cache', 'eviction'], score: 4.2, allowed: true },
  { id: 'd2', terms: ['cache', 'lru'], score: 5.6, allowed: false },
  { id: 'd3', terms: ['cache', 'ttl'], score: 3.1, allowed: true },
  { id: 'd4', terms: ['queue', 'jobs'], score: 1.4, allowed: true },
];

export function SearchRankingVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);

  return (
    <Frame title="search ranking" step={s} active={active}>
      <text x="320" y="74" textAnchor="middle" fontSize="10" fill={C.focus}>
        {[
          'documents → tokens',
          'inverted index · term → postings',
          'query terms → candidate set',
          'lexical score · BM25 top-k',
          'permission filter → final results (final)',
        ][s]}
      </text>

      {s === 0 ? (
        <g>
          {DOCS.map((d, i) => (
            <g key={d.id}>
              <Panel x={60} y={118 + i * 58} w={110} h={44} label={d.id} color={C.focus} />
              <Arrow x1={170} y1={140 + i * 58} x2={212} y2={140 + i * 58} color={C.brass} />
              <rect x={216} y={118 + i * 58} width={354} height={44} rx={7} fill={C.brass} fillOpacity="0.08" stroke={C.brass} strokeWidth="1.1" />
              <text x={232} y={146 + i * 58} fontSize="11" fill="currentColor">{d.terms.join('  ·  ')}</text>
            </g>
          ))}
        </g>
      ) : null}

      {s === 1 ? (
        <g>
          {[
            { t: 'cache', list: 'd1, d2, d3', c: C.healthy },
            { t: 'lru', list: 'd2', c: C.brass },
            { t: 'ttl', list: 'd3', c: C.brass },
            { t: 'queue', list: 'd4', c: C.border },
          ].map((row, i) => (
            <g key={row.t}>
              <rect x={80} y={112 + i * 60} width={130} height={46} rx={7} fill={row.c} fillOpacity="0.14" stroke={row.c} strokeWidth="1.2" />
              <text x={145} y={141 + i * 60} textAnchor="middle" fontSize="12" fill="currentColor">{row.t}</text>
              <Arrow x1={210} y1={135 + i * 60} x2={252} y2={135 + i * 60} color={row.c} />
              <text x={264} y={141 + i * 60} fontSize="11" fill={C.border}>→ [ {row.list} ]</text>
            </g>
          ))}
          <text x="320" y="360" textAnchor="middle" fontSize="9" fill={C.border}>
            postings are sorted doc ids · intersection is a merge, not a scan
          </text>
        </g>
      ) : null}

      {s === 2 ? (
        <g>
          <Panel x={60} y={150} w={150} h={58} label="query: cache" color={C.brass} />
          <Arrow x1={210} y1={179} x2={262} y2={179} />
          <rect x={266} y={136} width={180} height={86} rx={8} fill={C.brass} fillOpacity="0.1" stroke={C.brass} strokeWidth="1.3" />
          <text x={356} y={166} textAnchor="middle" fontSize="11" fill="currentColor">postings</text>
          <text x={356} y={192} textAnchor="middle" fontSize="10" fill={C.healthy}>d1 · d2 · d3</text>
          <Arrow x1={446} y1={179} x2={496} y2={179} color={C.healthy} />
          <Panel x={500} y={150} w={90} h={58} label="3 hits" color={C.healthy} />
          <text x="320" y="280" textAnchor="middle" fontSize="9" fill={C.border}>
            union for OR · intersection for AND · skip lists jump to candidates
          </text>
        </g>
      ) : null}

      {s === 3 ? (
        <g>
          {DOCS.slice(0, 3).map((d, i) => (
            <g key={d.id}>
              <text x={100} y={140 + i * 66} fontSize="11" fill="currentColor">{d.id}</text>
              <rect x={140} y={122 + i * 66} width={340 * (d.score / 6)} height={30} rx={6} fill={C.brass} fillOpacity="0.55" stroke={C.brass} strokeWidth="1" />
              <text x={496} y={143 + i * 66} fontSize="10" fill={C.brass}>{d.score.toFixed(1)}</text>
            </g>
          ))}
          <text x="320" y="360" textAnchor="middle" fontSize="9" fill={C.border}>
            BM25 rewards term frequency with saturation and length normalization
          </text>
        </g>
      ) : null}

      {s === 4 ? (
        <g>
          {DOCS.slice(0, 3).map((d, i) => {
            const y = 118 + i * 70;
            return (
              <g key={d.id}>
                <rect x={70} y={y} width={370} height={54} rx={7} fill={d.allowed ? C.healthy : C.danger} fillOpacity={d.allowed ? 0.1 : 0.12} stroke={d.allowed ? C.healthy : C.danger} strokeWidth="1.2" strokeDasharray={d.allowed ? undefined : '4 3'} />
                <text x={92} y={y + 33} fontSize="12" fill="currentColor">{i + 1}. {d.id}</text>
                <text x={300} y={y + 33} fontSize="10" fill={d.allowed ? C.healthy : C.danger}>
                  {d.allowed ? 'allowed' : 'denied by ACL'}
                </text>
                {!d.allowed ? (
                  <g>
                    <line x1={94} y1={y + 24} x2={140} y2={y + 44} stroke={C.danger} strokeWidth="1.6" />
                    <line x1={140} y1={y + 24} x2={94} y2={y + 44} stroke={C.danger} strokeWidth="1.6" />
                  </g>
                ) : null}
                <Arrow x1={442} y1={y + 27} x2={486} y2={y + 27} color={d.allowed ? C.healthy : C.border} opacity={d.allowed ? 1 : 0.3} />
              </g>
            );
          })}
          <text x="320" y="360" textAnchor="middle" fontSize="9" fill={C.healthy}>
            filter by permission before ranking · never let a denied doc enter the result set
          </text>
        </g>
      ) : null}
    </Frame>
  );
}

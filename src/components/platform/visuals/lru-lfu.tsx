'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

const KEYS = ['a', 'b', 'c', 'd'];

export function LruLfuVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);

  return (
    <Frame title="lru / lfu cache" step={s} active={active}>
      <text x="320" y="74" textAnchor="middle" fontSize="10" fill={C.focus}>
        {[
          'hash map · key → node pointer',
          'doubly linked list · recency order',
          'put · evict the LRU tail',
          'LFU · frequency buckets',
          'LFU with LRU tie-break (final)',
        ][s]}
      </text>

      {s === 0 ? (
        <g>
          <Panel x={60} y={124} w={150} h={50} label="hash map" color={C.focus} />
          {KEYS.map((k, i) => (
            <g key={k}>
              <rect x={250} y={110 + i * 52} width={54} height={34} rx={6} fill={C.brass} fillOpacity="0.2" stroke={C.brass} strokeWidth="1" />
              <text x={277} y={132 + i * 52} textAnchor="middle" fontSize="12" fill="currentColor">{k}</text>
              <Arrow x1={210} y1={149} x2={248} y2={127 + i * 52} color={C.focus} opacity={0.7} />
              <text x={340} y={132 + i * 52} fontSize="9" fill={C.border}>→ node {i + 1}</text>
            </g>
          ))}
        </g>
      ) : null}

      {s === 1 ? (
        <g>
          <text x="70" y="120" fontSize="9" fill={C.healthy}>MRU head</text>
          <text x="500" y="120" fontSize="9" fill={C.warning}>LRU tail</text>
          {KEYS.map((k, i) => (
            <g key={k}>
              <rect x={70 + i * 130} y={140} width={112} height={56} rx={8} fill={i === 0 ? C.healthy : C.border} fillOpacity={i === 0 ? 0.2 : 0.1} stroke={i === 0 ? C.healthy : C.border} strokeWidth="1.2" />
              <text x={126 + i * 130} y={174} textAnchor="middle" fontSize="13" fill="currentColor">{k}</text>
              {i < KEYS.length - 1 ? <Arrow x1={184 + i * 130} y1={168} x2={198 + i * 130} y2={168} color={C.focus} /> : null}
            </g>
          ))}
          <text x="320" y="250" textAnchor="middle" fontSize="10" fill={C.brass}>
            get(b) moves b to the head in O(1)
          </text>
        </g>
      ) : null}

      {s === 2 ? (
        <g>
          {['a', 'b', 'c'].map((k, i) => (
            <rect key={k} x={80 + i * 150} y={130} width={120} height={54} rx={8} fill={C.border} fillOpacity="0.12" stroke={C.border} strokeWidth="1.2" />
          ))}
          {['a', 'b', 'c'].map((k, i) => (
            <text key={`t${k}`} x={140 + i * 150} y={164} textAnchor="middle" fontSize="12" fill="currentColor">{k}</text>
          ))}
          <rect x={470} y={130} width={96} height={54} rx={8} fill={C.danger} fillOpacity="0.18" stroke={C.danger} strokeWidth="1.4" strokeDasharray="4 3" />
          <text x={518} y={156} textAnchor="middle" fontSize="11" fill={C.danger}>d</text>
          <text x={518} y={170} textAnchor="middle" fontSize="8" fill={C.danger}>evict tail</text>
          <Arrow x1={410} y1={200} x2={470} y2={180} color={C.danger} dashed />
          <text x="320" y="250" textAnchor="middle" fontSize="10" fill={C.healthy}>
            put(d) → map and list updated atomically, d appended to head
          </text>
        </g>
      ) : null}

      {s === 3 ? (
        <g>
          {[
            { f: 'freq 1', keys: ['b', 'd'], c: C.warning },
            { f: 'freq 2', keys: ['c'], c: C.brass },
            { f: 'freq 3', keys: ['a'], c: C.healthy },
          ].map((bucket, i) => (
            <g key={bucket.f}>
              <Panel x={70} y={110 + i * 76} w={110} h={54} label={bucket.f} color={bucket.c} />
              <Arrow x1={180} y1={137 + i * 76} x2={214} y2={137 + i * 76} color={bucket.c} />
              <rect x={218} y={110 + i * 76} width={180 + bucket.keys.length * 30} height={54} rx={8} fill={bucket.c} fillOpacity="0.12" stroke={bucket.c} strokeWidth="1.2" />
              {bucket.keys.map((k, j) => (
                <text key={k} x={248 + j * 44} y={144 + i * 76} fontSize="13" fill="currentColor">{k}</text>
              ))}
            </g>
          ))}
          <text x="320" y="360" textAnchor="middle" fontSize="9" fill={C.border}>
            evict minimum frequency bucket
          </text>
        </g>
      ) : null}

      {s === 4 ? (
        <g>
          <Panel x={70} y={130} w={140} h={56} label="freq 1" color={C.warning} />
          <Arrow x1={210} y1={158} x2={244} y2={158} color={C.warning} />
          <rect x={248} y={130} width={72} height={56} rx={7} fill={C.healthy} fillOpacity="0.2" stroke={C.healthy} strokeWidth="1.4" />
          <text x={284} y={164} textAnchor="middle" fontSize="13" fill="currentColor">b</text>
          <rect x={336} y={130} width={72} height={56} rx={7} fill={C.danger} fillOpacity="0.18" stroke={C.danger} strokeWidth="1.4" strokeDasharray="4 3" />
          <text x={372} y={164} textAnchor="middle" fontSize="13" fill={C.danger}>d</text>
          <text x={342} y={212} textAnchor="middle" fontSize="9" fill={C.healthy}>keep most recent</text>
          <text x={420} y={212} textAnchor="middle" fontSize="9" fill={C.danger}>evict LRU in bucket</text>
          <text x="320" y="270" textAnchor="middle" fontSize="10" fill={C.healthy}>
            deterministic tie-break: recency inside the minimum-frequency bucket
          </text>
        </g>
      ) : null}
    </Frame>
  );
}

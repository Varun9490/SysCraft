'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

export function PubsubRoutingVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);

  return (
    <Frame title="pub/sub routing" step={s} active={active}>
      <text x="320" y="74" textAnchor="middle" fontSize="10" fill={C.focus}>
        {[
          'topic key · sports/tennis/final',
          'topic trie · wildcard subscriptions',
          'match subscribers to queues',
          'durable queues · backpressure',
          'wildcard auth · delivery ack (final)',
        ][s]}
      </text>

      {s === 0 ? (
        <g>
          <Panel x={80} y={140} w={180} h={58} label="publisher" color={C.brass} />
          <Arrow x1={260} y1={169} x2={316} y2={169} />
          <rect x={320} y={132} width={230} height={74} rx={8} fill={C.focus} fillOpacity="0.12" stroke={C.focus} strokeWidth="1.2" />
          {['sports', 'tennis', 'final'].map((t, i) => (
            <text key={t} x={340 + i * 74} y={176} fontSize="12" fill="currentColor">{t}</text>
          ))}
          <text x="320" y="250" textAnchor="middle" fontSize="9" fill={C.border}>
            delimiter-separated segments become trie edges
          </text>
        </g>
      ) : null}

      {s === 1 ? (
        <g>
          <Panel x={60} y={150} w={104} h={50} label="root" color={C.focus} />
          <Arrow x1={164} y1={175} x2={196} y2={175} />
          <Panel x={200} y={150} w={104} h={50} label="sports" color={C.brass} />
          <Arrow x1={304} y1={175} x2={336} y2={175} />
          <Panel x={340} y={150} w={104} h={50} label="tennis" color={C.healthy} />
          <Arrow x1={444} y1={175} x2={476} y2={175} />
          <Panel x={480} y={150} w={96} h={50} label="final" color={C.healthy} />
          <text x={252} y={244} textAnchor="middle" fontSize="10" fill={C.warning}>sub: sports/#</text>
          <text x={392} y={244} textAnchor="middle" fontSize="10" fill={C.brass}>sub: sports/tennis/*</text>
          <text x="320" y="290" textAnchor="middle" fontSize="9" fill={C.border}>
            {"'#' matches zero or more levels · '*' matches exactly one"}
          </text>
        </g>
      ) : null}

      {s === 2 ? (
        <g>
          <Panel x={60} y={160} w={120} h={56} label="topic" color={C.focus} />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <Arrow x1={180} y1={188} x2={250} y2={124 + i * 66} color={C.brass} />
              <Panel x={254} y={100 + i * 66} w={140} h={48} label={`sub ${i + 1}`} color={i === 1 ? C.warning : C.healthy} sub={i === 1 ? 'no match' : 'matched'} />
            </g>
          ))}
          <text x="320" y="340" textAnchor="middle" fontSize="9" fill={C.border}>
            fan-out copies the message to each matching subscriber queue
          </text>
        </g>
      ) : null}

      {s === 3 ? (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={70 + i * 180} y={120} width={150} height={160} rx={8} fill={C.brass} fillOpacity="0.06" stroke={C.brass} strokeWidth="1.2" />
              <text x={145 + i * 180} y={146} textAnchor="middle" fontSize="10" fill="currentColor">queue {i + 1}</text>
              {Array.from({ length: 3 - i }).map((_, j) => (
                <rect key={j} x={84 + i * 180} y={162 + j * 28} width={122} height={18} rx={3} fill={C.brass} fillOpacity="0.3" stroke={C.brass} strokeWidth="0.8" />
              ))}
              <text x={145 + i * 180} y={266} textAnchor="middle" fontSize="9" fill={i === 2 ? C.warning : C.healthy}>
                {i === 2 ? 'backpressure' : 'draining'}
              </text>
            </g>
          ))}
          <text x="320" y="340" textAnchor="middle" fontSize="9" fill={C.border}>
            per-subscriber offset · slow consumer cannot block the topic
          </text>
        </g>
      ) : null}

      {s === 4 ? (
        <g>
          <Panel x={70} y={140} w={140} h={56} label="wildcard sub" color={C.warning} />
          <Arrow x1={210} y1={168} x2={262} y2={168} color={C.warning} />
          <g>
            <path d="M 320 122 L 372 142 L 372 200 C 372 236 344 258 320 266 C 296 258 268 236 268 200 L 268 142 Z" fill={C.healthy} fillOpacity="0.12" stroke={C.healthy} strokeWidth="1.6" />
            <text x={320} y={196} textAnchor="middle" fontSize="11" fill={C.healthy}>authz</text>
          </g>
          <Arrow x1={374} y1={168} x2={436} y2={168} color={C.healthy} />
          <Panel x={440} y={140} w={130} h={56} label="deliver + ack" color={C.healthy} sub="at-least-once" />
          <text x="320" y="300" textAnchor="middle" fontSize="10" fill={C.healthy}>
            authorize the pattern before delivery · ack only after processing
          </text>
        </g>
      ) : null}
    </Frame>
  );
}

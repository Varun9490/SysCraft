'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

export function DnsHttpProtocolsVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);

  return (
    <Frame title="dns / http protocols" step={s} active={active}>
      <text x="320" y="74" textAnchor="middle" fontSize="10" fill={C.focus}>
        {[
          'DNS · recursive resolution + cache',
          'HTTP/2 · multiplexed streams',
          'HPACK · header compression',
          'QUIC · independent stream loss recovery',
          'gRPC · schema + deadline (final)',
        ][s]}
      </text>

      {s === 0 ? (
        <g>
          <Panel x={50} y={150} w={100} h={54} label="client" color={C.focus} />
          <Arrow x1={150} y1={177} x2={190} y2={177} />
          <Panel x={194} y={150} w={110} h={54} label="resolver" color={C.brass} sub="cache" />
          <Arrow x1={304} y1={177} x2={344} y2={177} color={C.brass} />
          <Panel x={348} y={112} w={110} h={48} label="root / TLD" color={C.border} fontSize={11} />
          <Panel x={348} y={196} w={110} h={48} label="authoritative" color={C.healthy} fontSize={11} />
          <Arrow x1={458} y1={220} x2={498} y2={196} color={C.healthy} />
          <Panel x={502} y={150} w={88} h={54} label="A record" color={C.healthy} fontSize={11} />
          <text x="320" y="286" textAnchor="middle" fontSize="9" fill={C.border}>
            cache key includes record type · TTL bounds staleness
          </text>
        </g>
      ) : null}

      {s === 1 ? (
        <g>
          <rect x={60} y={112} width={180} height={196} rx={8} fill={C.warning} fillOpacity="0.07" stroke={C.warning} strokeWidth="1.2" />
          <text x={150} y={140} textAnchor="middle" fontSize="11" fill={C.warning}>HTTP/1.1</text>
          <text x={150} y={186} textAnchor="middle" fontSize="11" fill="currentColor">req → resp</text>
          <text x={150} y={220} textAnchor="middle" fontSize="11" fill="currentColor">req → resp</text>
          <text x={150} y={260} textAnchor="middle" fontSize="9" fill={C.border}>head-of-line blocking</text>
          <rect x={390} y={112} width={180} height={196} rx={8} fill={C.healthy} fillOpacity="0.07" stroke={C.healthy} strokeWidth="1.2" />
          <text x={480} y={140} textAnchor="middle" fontSize="11" fill={C.healthy}>HTTP/2</text>
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <line x1={410} y1={164 + i * 32} x2={550} y2={164 + i * 32} stroke={i === 2 ? C.brass : C.healthy} strokeWidth="2" strokeOpacity="0.8" />
              <text x={400} y={168 + i * 32} textAnchor="end" fontSize="8" fill={C.border}>s{i + 1}</text>
            </g>
          ))}
          <text x="480" y="292" textAnchor="middle" fontSize="9" fill={C.border}>streams share one connection</text>
        </g>
      ) : null}

      {s === 2 ? (
        <g>
          <rect x={70} y={140} width={220} height={70} rx={8} fill={C.warning} fillOpacity="0.08" stroke={C.warning} strokeWidth="1.2" />
          <text x={90} y={170} fontSize="10" fill={C.warning}>authorization: Bearer ...</text>
          <text x={90} y={192} fontSize="10" fill={C.warning}>cookie: session=...</text>
          <Arrow x1={290} y1={175} x2={340} y2={175} color={C.brass} />
          <Panel x={344} y={142} w={110} h={64} label="HPACK" color={C.brass} sub="indexed table" />
          <Arrow x1={454} y1={175} x2={504} y2={175} color={C.healthy} />
          <rect x={508} y={140} width={70} height={70} rx={8} fill={C.healthy} fillOpacity="0.12" stroke={C.healthy} strokeWidth="1.2" />
          <text x={543} y={172} textAnchor="middle" fontSize="16" fill={C.healthy}>#62</text>
          <text x="320" y="270" textAnchor="middle" fontSize="9" fill={C.border}>
            repeated headers become table indices · no repeated literal bytes
          </text>
        </g>
      ) : null}

      {s === 3 ? (
        <g>
          <rect x={60} y={118} width={520} height={168} rx={9} fill={C.focus} fillOpacity="0.06" stroke={C.focus} strokeWidth="1.2" />
          <text x="320" y={146} textAnchor="middle" fontSize="11" fill={C.focus}>QUIC / HTTP3</text>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <line x1={90} y1={180 + i * 28} x2={550} y2={180 + i * 28} stroke={i === 1 ? C.danger : C.healthy} strokeWidth={i === 1 ? 1 : 2} strokeDasharray={i === 1 ? '6 5' : undefined} strokeOpacity="0.9" />
              <text x={78} y={184 + i * 28} textAnchor="end" fontSize="9" fill={i === 1 ? C.danger : C.healthy}>s{i + 1}</text>
            </g>
          ))}
          <text x={320} y={272} textAnchor="middle" fontSize="9" fill={C.danger}>
            packet loss on stream 2 does not stall streams 1 and 3
          </text>
          <text x="320" y="324" textAnchor="middle" fontSize="9" fill={C.healthy}>
            loss recovery is per stream; the connection stays alive
          </text>
        </g>
      ) : null}

      {s === 4 ? (
        <g>
          <Panel x={60} y={130} w={150} h={58} label="proto schema" color={C.brass} sub="typed contract" />
          <Arrow x1={210} y1={159} x2={262} y2={159} />
          <Panel x={266} y={130} w={130} h={58} label="gRPC call" color={C.focus} sub="deadline" />
          <Arrow x1={396} y1={159} x2={448} y2={159} color={C.healthy} />
          <Panel x={452} y={130} w={128} h={58} label="server" color={C.healthy} sub="cancel-aware" />
          <rect x="110" y="230" width="420" height="66" rx={8} fill={C.healthy} fillOpacity="0.08" stroke={C.healthy} strokeWidth="1.1" />
          <text x="320" y={258} textAnchor="middle" fontSize="10" fill="currentColor">deadline travels with the call; budgets compose</text>
          <text x="320" y={282} textAnchor="middle" fontSize="9" fill={C.border}>
            stop work when the caller has already given up
          </text>
        </g>
      ) : null}
    </Frame>
  );
}

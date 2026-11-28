'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

export function ParkingAllocationVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);

  return (
    <Frame title="parking allocation" step={s} active={active}>
      <text x="320" y="74" textAnchor="middle" fontSize="10" fill={C.focus}>
        {[
          'lot grid · free / occupied spots',
          'atomic claim · compare-and-swap',
          'reservation with expiry (TTL)',
          'idempotent gate entry',
          'override + audit (final)',
        ][s]}
      </text>

      {s === 0 ? (
        <g>
          {Array.from({ length: 12 }).map((_, i) => {
            const col = i % 6;
            const row = Math.floor(i / 6);
            const occupied = i === 2 || i === 7 || i === 9;
            const x = 70 + col * 84;
            const y = 130 + row * 88;
            return (
              <g key={i}>
                <rect x={x} y={y} width={68} height={64} rx={6} fill={occupied ? C.warning : C.healthy} fillOpacity={occupied ? 0.22 : 0.1} stroke={occupied ? C.warning : C.healthy} strokeWidth="1.2" />
                <text x={x + 34} y={y + 38} textAnchor="middle" fontSize="12" fill="currentColor">{i + 1}</text>
              </g>
            );
          })}
          <text x="320" y="340" textAnchor="middle" fontSize="9" fill={C.border}>
            3 occupied · 9 free · gate reads the same atomic state
          </text>
        </g>
      ) : null}

      {s === 1 ? (
        <g>
          <Panel x={60} y={150} w={140} h={58} label="request spot 4" color={C.focus} />
          <Arrow x1={200} y1={179} x2={252} y2={179} />
          <rect x={256} y={132} width={150} height={94} rx={8} fill={C.brass} fillOpacity="0.1" stroke={C.brass} strokeWidth="1.3" />
          <text x={331} y={160} textAnchor="middle" fontSize="10" fill={C.brass}>CAS(free → mine)</text>
          <text x={331} y={184} textAnchor="middle" fontSize="9" fill={C.healthy}>success · one winner</text>
          <text x={331} y={206} textAnchor="middle" fontSize="9" fill={C.danger}>losers retry</text>
          <Arrow x1={406} y1={179} x2={456} y2={179} color={C.healthy} />
          <rect x={460} y={150} width={104} height={58} rx={7} fill={C.healthy} fillOpacity="0.2" stroke={C.healthy} strokeWidth="1.4" />
          <text x={512} y={184} textAnchor="middle" fontSize="12" fill="currentColor">spot 4</text>
          <text x="320" y="278" textAnchor="middle" fontSize="9" fill={C.border}>
            no two drivers can claim the same spot
          </text>
        </g>
      ) : null}

      {s === 2 ? (
        <g>
          <rect x={224} y={120} width={192} height={70} rx={8} fill={C.brass} fillOpacity="0.14" stroke={C.brass} strokeWidth="1.3" />
          <text x={320} y={150} textAnchor="middle" fontSize="11" fill="currentColor">reserved · spot 4</text>
          <text x={320} y={174} textAnchor="middle" fontSize="10" fill={C.warning}>expires in 05:00</text>
          <rect x={110} y={240} width={420} height={22} rx={6} fill={C.border} fillOpacity="0.4" />
          <rect x={110} y={240} width={420 * 0.7} height={22} rx={6} fill={C.warning} fillOpacity="0.65" />
          <text x="320" y={290} textAnchor="middle" fontSize="10" fill={C.healthy}>
            expiry releases the spot automatically if the driver never arrives
          </text>
        </g>
      ) : null}

      {s === 3 ? (
        <g>
          <Panel x={60} y={150} w={150} h={56} label="gate request" color={C.focus} sub="idempotency key" />
          <Arrow x1={210} y1={178} x2={262} y2={178} />
          <rect x={266} y={130} width={150} height={96} rx={8} fill={C.brass} fillOpacity="0.1" stroke={C.brass} strokeWidth="1.3" />
          <text x={341} y={160} textAnchor="middle" fontSize="10" fill={C.brass}>id already used?</text>
          <text x={341} y={186} textAnchor="middle" fontSize="9" fill={C.healthy}>yes → same result</text>
          <text x={341} y={208} textAnchor="middle" fontSize="9" fill={C.healthy}>no → open once</text>
          <Arrow x1={416} y1={178} x2={466} y2={178} color={C.healthy} />
          <Panel x={470} y={150} w={110} h={56} label="barrier up" color={C.healthy} />
          <text x="320" y="280" textAnchor="middle" fontSize="9" fill={C.border}>
            duplicate gate events never open twice
          </text>
        </g>
      ) : null}

      {s === 4 ? (
        <g>
          <Panel x={70} y={140} w={150} h={58} label="override request" color={C.warning} />
          <Arrow x1={220} y1={169} x2={272} y2={169} color={C.warning} />
          <g>
            <path d="M 336 120 L 388 140 L 388 198 C 388 234 360 256 336 264 C 312 256 284 234 284 198 L 284 140 Z" fill={C.healthy} fillOpacity="0.12" stroke={C.healthy} strokeWidth="1.6" />
            <text x={336} y={194} textAnchor="middle" fontSize="11" fill={C.healthy}>approval</text>
          </g>
          <Arrow x1={390} y1={169} x2={440} y2={169} color={C.healthy} />
          <Panel x={444} y={140} w={126} h={58} label="audit entry" color={C.healthy} sub="who · when · why" />
          <text x="320" y="300" textAnchor="middle" fontSize="10" fill={C.healthy}>
            manual override requires authority and leaves a durable audit record
          </text>
        </g>
      ) : null}
    </Frame>
  );
}

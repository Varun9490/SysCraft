'use client';

import { Arrow, C, FlowDot, Frame, Panel, useReducedMotion, useStep, type VisualProps } from './Frame';

export function CircuitBreakerVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const reduce = useReducedMotion();
  const states = [
    { l: 'CLOSED', c: C.healthy, x: 70 },
    { l: 'OPEN', c: C.danger, x: 250 },
    { l: 'HALF-OPEN', c: C.warning, x: 430 },
  ] as const;
  const current = s === 0 ? 0 : s === 1 ? 1 : s === 2 ? 1 : s === 3 ? 2 : 0;
  // s === 4 returns to CLOSED after a successful probe: the synthesis state.
  const final = s === 4;

  return (
    <Frame title="circuit breaker" step={s} active={active}>
      <text x="320" y="74" textAnchor="middle" fontSize="10" fill={C.focus}>
        {[
          'CLOSED · requests pass, failures counted',
          'threshold exceeded → trip to OPEN',
          'OPEN · fail fast, no downstream calls',
          'HALF-OPEN · allow probe requests',
          'probe succeeds → CLOSED (final)',
        ][s]}
      </text>

      {states.map((st, i) => (
        <g key={st.l}>
          <rect
            x={st.x}
            y={130}
            width={150}
            height={62}
            rx={8}
            fill={st.c}
            fillOpacity={i === current ? 0.22 : 0.06}
            stroke={st.c}
            strokeWidth={i === current ? 2 : 1.2}
            strokeDasharray={i === 2 && i !== current ? '4 3' : undefined}
          />
          <text x={st.x + 75} y={168} textAnchor="middle" fontSize={st.l === 'HALF-OPEN' ? 11 : 13} fill={i === current ? st.c : 'currentColor'}>
            {st.l}
          </text>
        </g>
      ))}
      <Arrow x1={220} y1={161} x2={248} y2={161} color={C.danger} />
      <Arrow x1={400} y1={161} x2={428} y2={161} color={C.warning} />
      <path d="M 505 196 C 505 252 145 252 145 196" fill="none" stroke={C.healthy} strokeWidth="1.2" strokeDasharray="4 3" />
      <text x="320" y="274" textAnchor="middle" fontSize="9" fill={C.healthy}>success → close</text>

      {s === 0 ? (
        <g>
          <Panel x={70} y={304} w={150} h={48} label="call downstream" color={C.healthy} />
          <Arrow x1={220} y1={328} x2={270} y2={328} color={C.healthy} />
          <text x={320} y={334} fontSize="10" fill={C.healthy}>allowed · count result</text>
        </g>
      ) : null}
      {s === 1 ? (
        <g>
          <text x="320" y="316" textAnchor="middle" fontSize="10" fill={C.danger}>
            failure ratio over the sliding window crossed the threshold
          </text>
        </g>
      ) : null}
      {s === 2 ? (
        <g>
          <Panel x={70} y={304} w={150} h={48} label="caller" color={C.danger} />
          <Arrow x1={220} y1={328} x2={270} y2={328} color={C.danger} />
          <text x={320} y={334} fontSize="10" fill={C.danger}>fail fast · no call</text>
          {!reduce ? <FlowDot from={[380, 328]} to={[470, 328]} reduce={reduce} color={C.danger} duration={1.8} /> : null}
        </g>
      ) : null}
      {s === 3 ? (
        <g>
          <Panel x={70} y={304} w={150} h={48} label="limited probes" color={C.warning} />
          <Arrow x1={220} y1={328} x2={270} y2={328} color={C.warning} />
          <text x={320} y={334} fontSize="10" fill={C.warning}>bounded · one at a time</text>
        </g>
      ) : null}
      {final ? (
        <g>
          <Panel x={70} y={304} w={150} h={48} label="probe ok" color={C.healthy} />
          <Arrow x1={220} y1={328} x2={270} y2={328} color={C.healthy} />
          <text x={320} y={334} fontSize="10" fill={C.healthy}>reset counters · resume traffic</text>
        </g>
      ) : null}

      <text x="320" y="378" textAnchor="middle" fontSize="9" fill={final ? C.healthy : C.border}>
        {final ? 'closed with a cool-down and bounded probes · no thundering herd' : 'jittered timeouts prevent synchronized retries'}
      </text>
    </Frame>
  );
}

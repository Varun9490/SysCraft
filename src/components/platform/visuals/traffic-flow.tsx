'use client';

import { Arrow, C, FlowDot, Frame, Panel, useReducedMotion, useStep, type VisualProps } from './Frame';

export function TrafficFlowVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const reduce = useReducedMotion();
  const dots = 2 + s * 2;
  // s === 4 is the steady, guarded final state: both APIs healthy behind an edge cache.
  const final = s === 4;

  return (
    <Frame title="traffic flow" step={s} active={active}>
      <Panel x={24} y={168} w={92} h={54} label="client" color={C.focus} />
      <Panel
        x={170}
        y={168}
        w={100}
        h={54}
        label="load balancer"
        sub={final ? 'edge cache' : undefined}
        color={final ? C.healthy : C.brass}
        fontSize={11}
      />
      <Panel
        x={330}
        y={104}
        w={104}
        h={52}
        label="api a"
        sub={s === 3 ? 'slow' : 'healthy'}
        color={s === 3 ? C.warning : C.healthy}
      />
      <Panel x={330} y={238} w={104} h={52} label="api b" sub="healthy" color={C.healthy} />
      <Panel x={520} y={168} w={96} h={54} label="database" color={C.brass} />

      <Arrow x1={116} y1={195} x2={168} y2={195} />
      <Arrow x1={270} y1={190} x2={328} y2={130} />
      <Arrow x1={270} y1={201} x2={328} y2={264} />
      <Arrow x1={434} y1={130} x2={518} y2={185} />
      <Arrow x1={434} y1={264} x2={518} y2={205} />

      {Array.from({ length: dots }).map((_, i) => {
        const upper = i % 2 === 0;
        return (
          <FlowDot
            key={i}
            from={[118, 195]}
            to={[434, upper ? 130 : 264]}
            delay={i * 0.32}
            reduce={reduce}
            color={upper ? C.brass : C.healthy}
          />
        );
      })}

      {s === 3 ? (
        <text x="382" y="92" textAnchor="middle" fontSize="9" fill={C.warning}>
          elevated latency
        </text>
      ) : null}

      <text x="320" y="356" textAnchor="middle" fontSize="9" fill={final ? C.healthy : C.border}>
        {final ? 'steady state · cached at the edge · all healthy' : 'request path through the load balancer'}
      </text>
    </Frame>
  );
}

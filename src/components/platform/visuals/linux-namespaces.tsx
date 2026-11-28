'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

export function LinuxNamespacesVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);

  return (
    <Frame title="linux namespaces" step={s} active={active}>
      <text x="320" y="74" textAnchor="middle" fontSize="10" fill={C.focus}>
        {[
          'host · processes share one view',
          'PID namespace · isolated process trees',
          'mount / net namespace · separate views',
          'cgroup · cpu and memory limits',
          'capabilities + isolation boundary (final)',
        ][s]}
      </text>

      {s === 0 ? (
        <g>
          <rect x={90} y={120} width={460} height={190} rx={10} fill={C.border} fillOpacity="0.08" stroke={C.border} strokeWidth="1.2" />
          <text x="320" y={148} textAnchor="middle" fontSize="11" fill={C.focus}>host kernel</text>
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={120 + i * 110} y={186} width={86} height={54} rx={7} fill={C.brass} fillOpacity="0.14" stroke={C.brass} strokeWidth="1.1" />
              <text x={163 + i * 110} y={219} textAnchor="middle" fontSize="11" fill="currentColor">pid {i + 1}</text>
            </g>
          ))}
          <text x="320" y={284} textAnchor="middle" fontSize="9" fill={C.border}>
            one PID space, one mount table, one network stack
          </text>
        </g>
      ) : null}

      {s === 1 ? (
        <g>
          {[
            { x: 70, label: 'ns A', c: C.healthy },
            { x: 340, label: 'ns B', c: C.focus },
          ].map((ns) => (
            <g key={ns.label}>
              <rect x={ns.x} y={120} width={230} height={200} rx={9} fill={ns.c} fillOpacity="0.07" stroke={ns.c} strokeWidth="1.3" />
              <text x={ns.x + 115} y={148} textAnchor="middle" fontSize="11" fill={ns.c}>{ns.label}</text>
              <text x={ns.x + 115} y={182} textAnchor="middle" fontSize="10" fill="currentColor">pid 1</text>
              <text x={ns.x + 115} y={214} textAnchor="middle" fontSize="10" fill="currentColor">pid 2</text>
              <text x={ns.x + 115} y={246} textAnchor="middle" fontSize="10" fill="currentColor">pid 3</text>
              <text x={ns.x + 115} y={292} textAnchor="middle" fontSize="9" fill={C.border}>own /proc view</text>
            </g>
          ))}
        </g>
      ) : null}

      {s === 2 ? (
        <g>
          <Panel x={70} y={130} w={150} h={58} label="container A" color={C.healthy} />
          <Panel x={70} y={232} w={150} h={58} label="container B" color={C.focus} />
          <Arrow x1={220} y1={159} x2={300} y2={159} color={C.healthy} />
          <Arrow x1={220} y1={261} x2={300} y2={261} color={C.focus} />
          <g>
            <rect x={304} y={118} width={266} height={60} rx={7} fill={C.brass} fillOpacity="0.1" stroke={C.brass} strokeWidth="1.2" />
            <text x={437} y={142} textAnchor="middle" fontSize="10" fill="currentColor">mount namespace</text>
            <text x={437} y={162} textAnchor="middle" fontSize="9" fill={C.border}>private root filesystem</text>
          </g>
          <g>
            <rect x={304} y={220} width={266} height={60} rx={7} fill={C.brass} fillOpacity="0.1" stroke={C.brass} strokeWidth="1.2" />
            <text x={437} y={244} textAnchor="middle" fontSize="10" fill="currentColor">net namespace</text>
            <text x={437} y={264} textAnchor="middle" fontSize="9" fill={C.border}>own interfaces and ports</text>
          </g>
        </g>
      ) : null}

      {s === 3 ? (
        <g>
          <rect x={70} y={120} width={500} height={190} rx={9} fill={C.border} fillOpacity="0.08" stroke={C.border} strokeWidth="1.2" />
          <text x="320" y={148} textAnchor="middle" fontSize="11" fill={C.focus}>cgroup v2</text>
          <text x="110" y="190" fontSize="10" fill={C.border}>cpu.max</text>
          <rect x="110" y="204" width="420" height="22" rx={6} fill={C.border} fillOpacity="0.4" />
          <rect x="110" y="204" width={420 * 0.6} height="22" rx={6} fill={C.warning} fillOpacity="0.6" />
          <text x="110" y="256" fontSize="10" fill={C.border}>memory.max</text>
          <rect x="110" y="270" width="420" height="22" rx={6} fill={C.border} fillOpacity="0.4" />
          <rect x="110" y="270" width={420 * 0.45} height="22" rx={6} fill={C.focus} fillOpacity="0.6" />
          <text x="320" y="320" textAnchor="middle" fontSize="9" fill={C.healthy}>
            limits are enforced by the kernel, not by the process
          </text>
        </g>
      ) : null}

      {s === 4 ? (
        <g>
          <Panel x={80} y={140} w={150} h={56} label="process" color={C.focus} />
          <Arrow x1={230} y1={168} x2={282} y2={168} />
          <g>
            <path d="M 348 118 L 400 138 L 400 196 C 400 232 372 254 348 262 C 324 254 296 232 296 196 L 296 138 Z" fill={C.healthy} fillOpacity="0.12" stroke={C.healthy} strokeWidth="1.6" />
            <text x={348} y={192} textAnchor="middle" fontSize="11" fill={C.healthy}>boundary</text>
          </g>
          <Arrow x1={402} y1={168} x2={452} y2={168} color={C.healthy} />
          <Panel x={456} y={140} w={116} h={56} label="kernel" color={C.healthy} sub="enforces" />
          <text x="320" y="292" textAnchor="middle" fontSize="10" fill={C.healthy}>
            namespaces + cgroups + dropped capabilities = least-privilege container
          </text>
        </g>
      ) : null}
    </Frame>
  );
}

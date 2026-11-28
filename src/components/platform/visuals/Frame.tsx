'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';

export type VisualProps = {
  stepIndex: number;
  active?: boolean;
};

/**
 * Monotonic navigation version supplied by TopicVisual. Frames read it through
 * context so every registered visual replays its step transition without each
 * of them having to forward a prop explicitly.
 */
export const VisualTransitionContext = createContext<number>(0);

export const C = {
  ink: '#141310',
  brass: '#CDA86A',
  healthy: '#7E9A6A',
  warning: '#C58F4A',
  danger: '#BE5F58',
  focus: '#7AA0B0',
  paper: '#1C1B17',
  border: '#3A362C',
  fg: '#CFC6B2',
} as const;

/**
 * 0..4 for any integer step, including negative values.
 *
 * Five-step case studies and blogs need a distinct final (synthesis/defense)
 * state, so the visual cycle is five states rather than four. Every visual
 * treats `s === 4` as that concluding state; no visual may alias it to `s === 0`.
 */
export function useStep(stepIndex: number): number {
  return ((stepIndex % 5) + 5) % 5;
}

/**
 * Starts in the static state on both server and first client render so
 * hydration matches. Only after mount do we read the real media query.
 */
export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduce(mq.matches);
    update();
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', update);
    return () => {
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', update);
    };
  }, []);

  return reduce;
}

export function Frame({
  title,
  step,
  active,
  children,
}: {
  title: string;
  step?: number;
  active?: boolean;
  children: ReactNode;
}) {
  const transitionKey = useContext(VisualTransitionContext);
  const reduce = useReducedMotion();

  return (
    <div
      className="w-full aspect-[16/10] rounded-2xl overflow-hidden"
      style={{ background: C.paper, color: C.fg }}
    >
      <svg
        viewBox="0 0 640 400"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={title}
        style={{ display: 'block' }}
      >
        <rect
          x="0.5"
          y="0.5"
          width="639"
          height="399"
          rx="16"
          fill={C.paper}
          stroke={C.border}
          strokeWidth="1"
        />
        <text x="22" y="30" fontSize="11" letterSpacing="1.4" fill={C.focus}>
          {title}
        </text>
        {typeof step === 'number' ? (
          <text x="618" y="30" textAnchor="end" fontSize="10" fill={C.brass}>
            {`STEP ${step + 1}`}
          </text>
        ) : null}
        {/* Remount only the visual body (never the reader) whenever a step is
            committed. The keyed group restarts the entrance transition and any
            nested looping dots for scroll, buttons, dots, resume and arrow keys
            alike. Under reduced motion it renders at rest, with no motion. */}
        <motion.g
          key={transitionKey}
          initial={reduce ? false : { opacity: 0.55, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.3, ease: 'easeOut' }}
        >
          {children}
        </motion.g>
        {active ? (
          <rect
            x="2.5"
            y="2.5"
            width="635"
            height="395"
            rx="14"
            fill="none"
            stroke={C.focus}
            strokeOpacity="0.45"
            strokeWidth="1.5"
          />
        ) : null}
      </svg>
    </div>
  );
}

export function Arrow({
  x1,
  y1,
  x2,
  y2,
  color = C.brass,
  width = 1.4,
  dashed = false,
  opacity = 1,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  width?: number;
  dashed?: boolean;
  opacity?: number;
}) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const a = 7;
  const spread = 0.42;
  const hp1 = `${(x2 - a * Math.cos(ang - spread)).toFixed(2)},${(y2 - a * Math.sin(ang - spread)).toFixed(2)}`;
  const hp2 = `${(x2 - a * Math.cos(ang + spread)).toFixed(2)},${(y2 - a * Math.sin(ang + spread)).toFixed(2)}`;
  const ex = x2 - Math.cos(ang) * 4;
  const ey = y2 - Math.sin(ang) * 4;

  return (
    <g opacity={opacity}>
      <line
        x1={x1}
        y1={y1}
        x2={ex}
        y2={ey}
        stroke={color}
        strokeWidth={width}
        strokeDasharray={dashed ? '4 4' : undefined}
      />
      <polygon points={`${x2},${y2} ${hp1} ${hp2}`} fill={color} />
    </g>
  );
}

export function Panel({
  x,
  y,
  w,
  h,
  label,
  sub,
  color = C.brass,
  filled = false,
  dashed = false,
  fontSize = 12,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  color?: string;
  filled?: boolean;
  dashed?: boolean;
  fontSize?: number;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="8"
        fill={filled ? color : 'none'}
        fillOpacity={filled ? 0.16 : 0}
        stroke={color}
        strokeWidth="1.3"
        strokeDasharray={dashed ? '5 4' : undefined}
      />
      <text
        x={x + w / 2}
        y={y + h / 2 + (sub ? -2 : 4)}
        textAnchor="middle"
        fontSize={fontSize}
        fill="currentColor"
      >
        {label}
      </text>
      {sub ? (
        <text x={x + w / 2} y={y + h / 2 + 13} textAnchor="middle" fontSize="9" fill={color} opacity="0.85">
          {sub}
        </text>
      ) : null}
    </g>
  );
}

/** A packet dot that travels between two points with framer-motion transforms. */
export function FlowDot({
  from,
  to,
  reduce,
  delay = 0,
  color = C.brass,
  r = 2.6,
  duration = 2.2,
}: {
  from: readonly [number, number];
  to: readonly [number, number];
  reduce: boolean;
  delay?: number;
  color?: string;
  r?: number;
  duration?: number;
}) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];

  if (reduce) {
    return <circle cx={from[0] + dx * 0.6} cy={from[1] + dy * 0.6} r={r} fill={color} opacity="0.75" />;
  }

  return (
    <motion.circle
      cx={from[0]}
      cy={from[1]}
      r={r}
      fill={color}
      initial={{ x: 0, y: 0, opacity: 0 }}
      animate={{
        x: [0, dx * 0.1, dx * 0.9, dx],
        y: [0, dy * 0.1, dy * 0.9, dy],
        opacity: [0, 0.9, 0.9, 0],
      }}
      transition={{
        duration,
        delay,
        times: [0, 0.1, 0.9, 1],
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

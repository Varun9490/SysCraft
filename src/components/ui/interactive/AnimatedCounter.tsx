'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useInView, useMotionValueEvent, useSpring } from 'framer-motion';
import { useMotionPreferences } from './useMotionPreferences';

export interface AnimatedCounterProps {
  to: number;
  className?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Approximate animation length in seconds. Defaults to 1.6. */
  duration?: number;
}

/**
 * Spring-driven numeral that starts counting only once it enters the viewport.
 *
 * The final value is present in the server-rendered markup. During the
 * animation the text node is updated directly from the spring, avoiding a
 * React render per frame. Reduced-motion users see the final number at once.
 */
export function AnimatedCounter({
  to,
  className,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 1.6,
}: AnimatedCounterProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(rootRef, { once: true, margin: '-8% 0px' });
  const { reducedMotion } = useMotionPreferences();

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: Math.max(0, decimals),
        maximumFractionDigits: Math.max(0, decimals),
      }),
    [decimals],
  );

  const format = useCallback(
    (value: number) => `${prefix}${formatter.format(value)}${suffix}`,
    [formatter, prefix, suffix],
  );

  const stiffness = Math.max(40, 260 / Math.max(0.4, duration));
  const spring = useSpring(0, { stiffness, damping: 26, mass: 0.75 });

  useMotionValueEvent(spring, 'change', (value) => {
    const node = textRef.current;
    if (node) node.textContent = format(value);
  });

  useEffect(() => {
    if (!inView || reducedMotion) {
      spring.jump(to);
      if (textRef.current) textRef.current.textContent = format(to);
      return undefined;
    }

    spring.jump(0);
    if (textRef.current) textRef.current.textContent = format(0);
    spring.set(to);
    return undefined;
  }, [inView, reducedMotion, to, spring, format]);

  return (
    <span
      ref={rootRef}
      className={`tabular-nums ${className ?? ''}`}
      aria-label={`${prefix}${formatter.format(to)}${suffix}`}
    >
      <span ref={textRef} aria-hidden="true">
        {format(to)}
      </span>
    </span>
  );
}

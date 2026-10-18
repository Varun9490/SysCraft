'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, useSpring } from 'framer-motion';

/**
 * ReactBits-style CountUp: spring-driven integer count that starts when the
 * element scrolls into view. Falls back to the final value under
 * prefers-reduced-motion (server render shows the target — no layout shift).
 */

interface CountUpProps {
  to: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function CountUp({ to, duration = 1.6, className, prefix = '', suffix = '' }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const [display, setDisplay] = useState(to);

  const spring = useSpring(0, {
    stiffness: 23 / Math.max(0.4, duration) / 4 + 30 * (1 / duration),
    damping: 28,
    mass: 0.9,
  });

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced || !inView) {
      setDisplay(to);
      return;
    }
    spring.jump(0);
    const unsub = spring.on('change', (v) => setDisplay(Math.max(0, Math.round(v))));
    // start slightly later so the hero settles first
    const t = window.setTimeout(() => spring.set(to), 240);
    return () => {
      unsub();
      window.clearTimeout(t);
    };
  }, [inView, to, spring]);

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ''}`} aria-label={`${prefix}${to}${suffix}`}>
      <span aria-hidden="true">
        {prefix}
        {display}
        {suffix}
      </span>
    </span>
  );
}

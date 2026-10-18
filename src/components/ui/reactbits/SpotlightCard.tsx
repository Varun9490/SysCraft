'use client';

import { useEffect, useRef } from 'react';

/**
 * ReactBits-style SpotlightCard: a soft radial light follows the pointer
 * across the card surface via CSS custom properties. Pure CSS paint — no
 * re-renders per mousemove.
 */

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}

export function SpotlightCard({ children, className, spotlightColor = 'rgba(205, 168, 106, 0.16)' }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const onMove = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
      el.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
      el.style.opacity = '1';
    };
    const onLeave = () => {
      el.style.opacity = '0';
    };

    el.parentElement?.addEventListener('mousemove', onMove);
    el.parentElement?.addEventListener('mouseleave', onLeave);
    return () => {
      el.parentElement?.removeEventListener('mousemove', onMove);
      el.parentElement?.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ${className ?? ''}`}
      style={{ background: `radial-gradient(240px circle at var(--spot-x, 50%) var(--spot-y, 50%), ${spotlightColor}, transparent 70%)` }}
    />
  );
}

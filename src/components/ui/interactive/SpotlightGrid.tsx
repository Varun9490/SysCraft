'use client';

import { useEffect, useRef } from 'react';
import { useMotionPreferences } from './useMotionPreferences';

export interface SpotlightGridProps {
  className?: string;
  /** Which existing utility grid to draw beneath the light. Defaults to "line". */
  grid?: 'line' | 'dot';
  /** CSS colour of the radial wash. Defaults to a low-contrast brass. */
  color?: string;
  /** Diameter of the spotlight in pixels. Defaults to 360. */
  radius?: number;
}

/**
 * Pure-CSS decorative backdrop: a quiet grid plus a radial wash that follows
 * the pointer across the host element. Pointer coordinates are written straight
 * to CSS custom properties, so moving the pointer never re-renders React.
 *
 * The layer is absolutely positioned, aria-hidden and pointer-events-none.
 * Reduced-motion users only ever receive the static grid.
 */
export function SpotlightGrid({
  className,
  grid = 'line',
  color = 'rgb(var(--accent) / 0.10)',
  radius = 360,
}: SpotlightGridProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useMotionPreferences();

  useEffect(() => {
    if (reducedMotion) return undefined;

    const layer = ref.current;
    const host = layer?.parentElement;
    if (!layer || !host) return undefined;

    const onMove = (event: PointerEvent): void => {
      const rect = host.getBoundingClientRect();
      layer.style.setProperty('--sx', `${event.clientX - rect.left}px`);
      layer.style.setProperty('--sy', `${event.clientY - rect.top}px`);
      layer.style.setProperty('--spot-opacity', '1');
    };

    const onLeave = (): void => {
      layer.style.setProperty('--spot-opacity', '0');
    };

    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', onLeave);
    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
    };
  }, [reducedMotion]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}
    >
      <div
        className={`absolute inset-0 opacity-[0.35] ${grid === 'dot' ? 'dot-grid' : 'line-grid'}`}
      />
      {!reducedMotion && (
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            opacity: 'var(--spot-opacity, 0)',
            background: `radial-gradient(circle ${Math.max(80, radius)}px at var(--sx, 50%) var(--sy, 50%), ${color}, transparent 70%)`,
          }}
        />
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';

const SPRING = { stiffness: 220, damping: 18, mass: 0.4 };
const POINTER_STRENGTH = 0.28;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Pointer-following translation driven entirely by motion values.
 *
 * Pointer events never touch React state, so a magnetic control costs no
 * re-renders. The returned handler set is intentionally generic so the same
 * behaviour can be attached to a real <button> or a next/link anchor.
 */
export function useMagnetic<T extends HTMLElement>(enabled: boolean, maxOffset = 6) {
  const ref = useRef<T>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, SPRING);
  const y = useSpring(rawY, SPRING);

  // Return to rest immediately when the interaction becomes unavailable.
  useEffect(() => {
    if (!enabled) {
      rawX.set(0);
      rawY.set(0);
    }
  }, [enabled, rawX, rawY]);

  const onPointerMove = (event: React.PointerEvent<T>): void => {
    if (!enabled) return;
    const element = ref.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);

    rawX.set(clamp(dx * POINTER_STRENGTH, -maxOffset, maxOffset));
    rawY.set(clamp(dy * POINTER_STRENGTH, -maxOffset, maxOffset));
  };

  const onPointerLeave = (): void => {
    rawX.set(0);
    rawY.set(0);
  };

  return { ref, x, y, onPointerMove, onPointerLeave };
}

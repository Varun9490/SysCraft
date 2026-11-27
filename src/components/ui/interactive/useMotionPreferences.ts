'use client';

import { useSyncExternalStore } from 'react';

/**
 * Shared, SSR-safe motion capability snapshot.
 *
 * The server snapshot deliberately reports the *static* variant (no fine
 * pointer, reduced motion requested) so hydration always starts from the same
 * DOM on both sides. The values are refreshed by `useSyncExternalStore` when
 * the user's media queries change — never on pointer movement.
 */
export interface MotionPreferences {
  /** True when the primary pointer is precise (mouse / trackpad). */
  finePointer: boolean;
  /** True when the user asked the OS to reduce motion. */
  reducedMotion: boolean;
}

const STATIC_SNAPSHOT: MotionPreferences = {
  finePointer: false,
  reducedMotion: true,
};

let cachedSnapshot: MotionPreferences = STATIC_SNAPSHOT;

function readSnapshot(): MotionPreferences {
  if (typeof window === 'undefined') return STATIC_SNAPSHOT;

  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Return a stable object identity so useSyncExternalStore does not loop.
  if (
    cachedSnapshot.finePointer !== finePointer ||
    cachedSnapshot.reducedMotion !== reducedMotion
  ) {
    cachedSnapshot = { finePointer, reducedMotion };
  }
  return cachedSnapshot;
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const fine = window.matchMedia('(pointer: fine)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  fine.addEventListener('change', onChange);
  reduced.addEventListener('change', onChange);

  return () => {
    fine.removeEventListener('change', onChange);
    reduced.removeEventListener('change', onChange);
  };
}

function getServerSnapshot(): MotionPreferences {
  return STATIC_SNAPSHOT;
}

export function useMotionPreferences(): MotionPreferences {
  return useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);
}

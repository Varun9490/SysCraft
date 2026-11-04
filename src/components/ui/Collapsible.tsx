'use client';

import type { ReactNode } from 'react';

/**
 * CSS-driven expand/collapse. Uses the grid-rows [0fr, 1fr] technique so the
 * animation runs on the compositor without measuring heights in JS, and the
 * content stays mounted (preserving form state and scroll position).
 *
 * `inert` and `aria-hidden` keep hidden content out of the tab order and away
 * from assistive technology while it is collapsed.
 */
export function Collapsible({
  open,
  children,
  outerClassName,
  innerClassName,
  durationMs = 260,
}: {
  open: boolean;
  children: ReactNode;
  outerClassName?: string;
  innerClassName?: string;
  durationMs?: number;
}) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      } ${outerClassName ?? ''}`}
      style={{ transitionDuration: `${durationMs}ms` }}
    >
      <div
        className={`min-h-0 overflow-hidden ${innerClassName ?? ''}`}
        inert={!open}
        aria-hidden={!open}
      >
        {children}
      </div>
    </div>
  );
}

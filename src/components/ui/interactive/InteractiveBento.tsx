'use client';

import { motion } from 'framer-motion';
import { useMotionPreferences } from './useMotionPreferences';

export interface InteractiveBentoProps {
  children: React.ReactNode;
  className?: string;
}

export interface BentoItemProps {
  children: React.ReactNode;
  className?: string;
  /** CSS colour of the hover wash. Defaults to a low-contrast brass. */
  spotlightColor?: string;
}

/**
 * A responsive bento grid. Consumers own the span classes (`col-span-2`,
 * `row-span-2`, …) on each BentoItem, so layout stays predictable.
 */
export function InteractiveBento({ children, className }: InteractiveBentoProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

/**
 * Semantic-content wrapper with a brass spotlight on hover and keyboard focus.
 * The pointer handler writes CSS variables directly; it never sets state.
 */
export function BentoItem({
  children,
  className,
  spotlightColor = 'rgb(var(--accent) / 0.12)',
}: BentoItemProps) {
  const { finePointer, reducedMotion } = useMotionPreferences();
  const spotlightEnabled = finePointer && !reducedMotion;

  return (
    <motion.div
      className={`group relative overflow-hidden rounded-2xl border border-line bg-app-raised shadow-card ${className ?? ''}`}
      onPointerMove={(event) => {
        if (!spotlightEnabled) return;
        const element = event.currentTarget;
        const rect = element.getBoundingClientRect();
        element.style.setProperty('--bx', `${event.clientX - rect.left}px`);
        element.style.setProperty('--by', `${event.clientY - rect.top}px`);
      }}
    >
      {spotlightEnabled && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
          style={{
            background: `radial-gradient(320px circle at var(--bx, 50%) var(--by, 50%), ${spotlightColor}, transparent 68%)`,
          }}
        />
      )}
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}

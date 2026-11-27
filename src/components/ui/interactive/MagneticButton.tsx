'use client';

import { motion } from 'framer-motion';
import { useMagnetic } from './useMagnetic';
import { useMotionPreferences } from './useMotionPreferences';

export interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
  disabled?: boolean;
  /** Maximum translation in pixels on either axis. Defaults to 6px. */
  maxOffset?: number;
  title?: string;
}

/**
 * A real <button> with a subtle pointer-following magnetic pull.
 *
 * Motion is expressed with springs on transform values, never component
 * state. Coarse pointers, reduced-motion users and disabled buttons get a
 * completely static control with the native focus ring intact.
 */
export function MagneticButton({
  children,
  className,
  onClick,
  type = 'button',
  disabled = false,
  maxOffset = 6,
  'aria-label': ariaLabel,
  title,
}: MagneticButtonProps) {
  const { finePointer, reducedMotion } = useMotionPreferences();
  const enabled = finePointer && !reducedMotion && !disabled;
  const { ref, x, y, onPointerMove, onPointerLeave } =
    useMagnetic<HTMLButtonElement>(enabled, maxOffset);

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={onClick}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      aria-label={ariaLabel}
      title={title}
      className={className}
      style={{ x, y }}
    >
      {children}
    </motion.button>
  );
}

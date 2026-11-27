'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMagnetic } from './useMagnetic';
import { useMotionPreferences } from './useMotionPreferences';

export interface MagneticLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  target?: string;
  rel?: string;
  /** Maximum translation in pixels on either axis. Defaults to 6px. */
  maxOffset?: number;
}

/**
 * Magnetic counterpart for navigation. The animated wrapper is a span; the
 * clickable, focusable element stays a genuine next/link anchor which receives
 * the caller's className so padding remains part of the hit area.
 */
export function MagneticLink({
  href,
  children,
  className,
  onClick,
  target,
  rel,
  maxOffset = 6,
  'aria-label': ariaLabel,
}: MagneticLinkProps) {
  const { finePointer, reducedMotion } = useMotionPreferences();
  const enabled = finePointer && !reducedMotion;
  const { ref, x, y, onPointerMove, onPointerLeave } =
    useMagnetic<HTMLSpanElement>(enabled, maxOffset);

  return (
    <motion.span
      ref={ref}
      className="inline-block"
      style={{ x, y }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <Link
        href={href}
        className={className}
        onClick={onClick}
        target={target}
        rel={rel}
        aria-label={ariaLabel}
      >
        {children}
      </Link>
    </motion.span>
  );
}

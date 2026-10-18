'use client';

import { motion } from 'framer-motion';

/**
 * ReactBits-style ShinyText / GradientText shells. The shimmer + gradient
 * sweeps live in globals.css (`.shiny-text`, `.gradient-text-animated`) so
 * they degrade cleanly under reduced-motion.
 */

export function ShinyText({
  text,
  className,
  disabled = false,
}: {
  text: string;
  className?: string;
  disabled?: boolean;
}) {
  return <span className={`shiny-text ${disabled ? 'shiny-text-off' : ''} ${className ?? ''}`}>{text}</span>;
}

export function GradientText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`gradient-text-animated ${className ?? ''}`}>{children}</span>;
}

'use client';

import { motion } from 'framer-motion';
import { useMotionPreferences } from './useMotionPreferences';

export interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Vertical offset in pixels. Defaults to 24. */
  y?: number;
  /** Blur radius in pixels at the start of the reveal. Defaults to 6. */
  blur?: number;
  delay?: number;
  once?: boolean;
  duration?: number;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Scroll-triggered reveal combining opacity, translation and a short blur.
 * With reduced motion the element is rendered already settled, so no content
 * is ever hidden from a user who opted out of animation.
 */
export function ScrollReveal({
  children,
  className,
  y = 24,
  blur = 6,
  delay = 0,
  once = true,
  duration = 0.7,
}: ScrollRevealProps) {
  const { reducedMotion } = useMotionPreferences();

  const shown = { opacity: 1, y: 0, filter: 'blur(0px)' };
  const hidden = {
    opacity: 0,
    y,
    filter: `blur(${Math.max(0, blur)}px)`,
  };

  return (
    <motion.div
      className={className}
      initial={reducedMotion ? shown : hidden}
      whileInView={shown}
      viewport={{ once, margin: '-8% 0px -8% 0px' }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

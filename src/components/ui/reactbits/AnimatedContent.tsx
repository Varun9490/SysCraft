'use client';

import { motion } from 'framer-motion';

type Direction = 'top' | 'bottom' | 'left' | 'right';

const OFFSETS: Record<Direction, { x: number; y: number }> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * ReactBits-style AnimatedContent: fires once when the block scrolls into
 * view, sliding a configurable distance along a configurable axis.
 */

interface AnimatedContentProps {
  children: React.ReactNode;
  className?: string;
  distance?: number;
  direction?: Direction;
  delay?: number;
  duration?: number;
}

export function AnimatedContent({
  children,
  className,
  distance = 60,
  direction = 'bottom',
  delay = 0,
  duration = 0.7,
}: AnimatedContentProps) {
  const offset = OFFSETS[direction];
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: offset.x * distance, y: offset.y * distance }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

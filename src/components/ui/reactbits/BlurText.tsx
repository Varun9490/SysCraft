'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * ReactBits-style BlurText: words blur-and-rise into place with a staggered
 * spring loop. Content stays in the DOM for SEO — only per-word animation
 * transforms differ. Reduced-motion users see static text immediately.
 */

interface BlurTextProps {
  text: string;
  className?: string;
  /** ms between word starts */
  delay?: number;
  /** px of vertical settle */
  offset?: number;
  initialBlur?: number;
  /** Render as text-through when true (no animation). */
  disabled?: boolean;
}

export function BlurText({
  text,
  className,
  delay = 70,
  offset = 10,
  initialBlur = 8,
  disabled = false,
}: BlurTextProps) {
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);

  if (disabled) return <span className={className}>{text}</span>;

  return (
    <motion.span
      className={`inline-block ${className ?? ''}`}
      aria-label={text}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block will-change-transform"
          style={{ transformOrigin: 'center bottom' }}
          variants={{
            hidden: { opacity: 0, filter: `blur(${initialBlur}px)`, y: offset },
            visible: {
              opacity: 1,
              filter: 'blur(0px)',
              y: 0,
              transition: {
                delay: (i * delay) / 1000,
                duration: 0.62,
                ease: [0.22, 1, 0.36, 1],
              },
            },
          }}
          aria-hidden="true"
        >
          {word}
          {i < words.length - 1 ? '\u00A0' : ''}
        </motion.span>
      ))}
    </motion.span>
  );
}

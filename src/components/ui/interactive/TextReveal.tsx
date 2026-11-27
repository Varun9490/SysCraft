'use client';

import { Fragment, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMotionPreferences } from './useMotionPreferences';

export interface TextRevealProps {
  text: string;
  className?: string;
  delay?: number;
  as?: 'h1' | 'h2' | 'p';
  /** Reveal individual words or whole lines. Defaults to "word". */
  mode?: 'word' | 'line';
  /** Seconds between consecutive units. Defaults to 0.07. */
  stagger?: number;
  duration?: number;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Masked, staggered reveal for headings. Every unit sits inside a clipping
 * wrapper that already occupies its final width and height, so the animation
 * only translates transforms — the surrounding layout never shifts.
 *
 * The visual spans are aria-hidden; the heading carries a single aria-label
 * with the complete text for assistive technology.
 */
export function TextReveal({
  text,
  className,
  delay = 0,
  as = 'h2',
  mode = 'word',
  stagger = 0.07,
  duration = 0.6,
}: TextRevealProps) {
  const Tag = as;
  const { reducedMotion } = useMotionPreferences();

  const words = useMemo(
    () => text.trim().split(/\s+/).filter(Boolean),
    [text],
  );
  const lines = useMemo(() => text.split('\n'), [text]);

  const hidden = { y: '110%', opacity: 0 };
  const shown = { y: '0%', opacity: 1 };

  const transitionFor = (index: number) => ({
    duration,
    delay: delay + index * Math.max(0, stagger),
    ease: EASE,
  });

  return (
    <Tag className={className} aria-label={text}>
      <span aria-hidden="true">
        {mode === 'line'
          ? lines.map((line, index) => (
              <span key={index} className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={reducedMotion ? shown : hidden}
                  whileInView={shown}
                  viewport={{ once: true, margin: '-8% 0px' }}
                  transition={transitionFor(index)}
                >
                  {line.length > 0 ? line : '\u00a0'}
                </motion.span>
              </span>
            ))
          : words.map((word, index) => (
              <Fragment key={`${word}-${index}`}>
                <span className="inline-block overflow-hidden align-bottom">
                  <motion.span
                    className="inline-block"
                    initial={reducedMotion ? shown : hidden}
                    whileInView={shown}
                    viewport={{ once: true, margin: '-8% 0px' }}
                    transition={transitionFor(index)}
                  >
                    {word}
                  </motion.span>
                </span>
                {index < words.length - 1 ? ' ' : null}
              </Fragment>
            ))}
      </span>
    </Tag>
  );
}

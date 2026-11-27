'use client';

import { useId } from 'react';
import { motion } from 'framer-motion';
import { useMotionPreferences } from './useMotionPreferences';

export interface AnimatedBeamProps {
  /** Any SVG path `d` string. Defaults to a straight horizontal beam. */
  path?: string;
  /** Seconds for one dash cycle. Defaults to 2.4. */
  duration?: number;
  /** CSS colour applied to the stroke and gradient stops. */
  color?: string;
  /** Seconds before the first cycle begins. Defaults to 0. */
  delay?: number;
  className?: string;
  /** SVG viewBox. Defaults to "0 0 100 20". */
  viewBox?: string;
  strokeWidth?: number;
}

const DEFAULT_PATH = 'M 0 10 L 100 10';
const DASH_LENGTH = 18;
const GAP_LENGTH = 12;

/**
 * A quiet travelling beam drawn with SVG. A faint guide line stays put while
 * a dashed gradient pulse rides along the same path. Reduced-motion users get
 * a single static line. Gradient ids are derived from `useId`, so multiple
 * beams never collide in the document.
 */
export function AnimatedBeam({
  path = DEFAULT_PATH,
  duration = 2.4,
  color = 'rgb(var(--accent))',
  delay = 0,
  className,
  viewBox = '0 0 100 20',
  strokeWidth = 1.5,
}: AnimatedBeamProps) {
  const { reducedMotion } = useMotionPreferences();
  const rawId = useId();
  const gradientId = `beam-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <svg
      viewBox={viewBox}
      width="100%"
      height="100%"
      className={className ?? 'h-5 w-full'}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopOpacity="0" style={{ stopColor: color }} />
          <stop offset="50%" stopOpacity="1" style={{ stopColor: color }} />
          <stop offset="100%" stopOpacity="0" style={{ stopColor: color }} />
        </linearGradient>
      </defs>

      {reducedMotion ? (
        <path
          d={path}
          fill="none"
          vectorEffect="non-scaling-stroke"
          strokeWidth={strokeWidth}
          strokeOpacity={0.55}
          style={{ stroke: color }}
        />
      ) : (
        <>
          <path
            d={path}
            fill="none"
            vectorEffect="non-scaling-stroke"
            strokeWidth={strokeWidth}
            strokeOpacity={0.18}
            style={{ stroke: color }}
          />
          <motion.path
            d={path}
            fill="none"
            vectorEffect="non-scaling-stroke"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth + 0.6}
            strokeLinecap="round"
            strokeDasharray={`${DASH_LENGTH} ${GAP_LENGTH}`}
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -(DASH_LENGTH + GAP_LENGTH) }}
            transition={{
              duration: Math.max(0.2, duration),
              delay: Math.max(0, delay),
              ease: 'linear',
              repeat: Infinity,
            }}
          />
        </>
      )}
    </svg>
  );
}

'use client';

import { motion, type MotionStyle } from "framer-motion";
import { useMemo, type ReactNode } from "react";

/**
 * remocn-style motion typography, implemented for React/framer-motion.
 * The vocabulary mirrors remocn.dev/docs/typography: FocusBlurResolve,
 * SoftBlurIn, MaskRevealUp, StaggeredFadeUp, and MarkerHighlight — rebuilt
 * on canvas tokens and matched to prefers-reduced-motion.
 */

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** remocn FocusBlurResolve — a heavy blur resolves into crisp content. */
export function FocusBlurResolve({
  children,
  className,
  delay = 0,
  amount = 10,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, filter: `blur(${amount}px)`, scale: 1.012, y: 12 }}
      animate={{ opacity: 1, filter: "blur(0px)", scale: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/** remocn SoftBlurIn — per-character blur and rise for display headings. */
export function SoftBlurIn({
  text,
  className,
  style,
  perChar = 0.02,
}: {
  text: string;
  className?: string;
  style?: MotionStyle;
  perChar?: number;
}) {
  const chars = useMemo(() => Array.from(text), [text]);
  return (
    <motion.span
      className={`inline-block ${className ?? ""}`}
      style={style}
      aria-label={text}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: perChar } },
      }}
    >
      {chars.map((char, i) => (
        <motion.span
          key={`${char}-${i}`}
          aria-hidden="true"
          className="inline-block will-change-transform"
          variants={{
            hidden: { opacity: 0, y: 7, filter: "blur(5px)" },
            show: {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              transition: { duration: 0.45, ease: EASE_OUT },
            },
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.span>
  );
}

/** remocn MaskRevealUp — lines reveal upward from a soft mask. */
export function MaskRevealUp({
  children,
  delay = 0,
  className,
  whileInView = false,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  whileInView?: boolean;
}) {
  const animationProps = whileInView
    ? { whileInView: "masked-in" as const, viewport: { once: true, margin: "-12% 0px" } }
    : { animate: "masked-in" as const };
  return (
    <span className={`block overflow-hidden ${className ?? ""}`}>
      <motion.span
        className="inline-block will-change-transform"
        initial={{ y: "112%", opacity: 0 }}
        {...animationProps}
        variants={{ "masked-in": { y: "0%", opacity: 1 } }}
        transition={{ duration: 0.6, delay, ease: EASE_OUT }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/** remocn StaggeredFadeUp — words rise with a soft cascading delay. */
export function StaggeredFadeUp({
  text,
  className,
  perWord = 0.035,
}: {
  text: string;
  className?: string;
  perWord?: number;
}) {
  const words = useMemo(() => text.split(/\s+/), [text]);
  return (
    <span
      className={className}
      aria-label={text}
    >
      <motion.span
        className="inline"
        aria-hidden="true"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-8% 0px" }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: perWord } } }}
      >
        {words.map((word, i) => (
          <motion.span
            key={`${word}-${i}`}
            className="inline-block will-change-transform"
            variants={{
              hidden: { opacity: 0, y: 8, filter: "blur(3px)" },
              show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.4, ease: EASE_OUT } },
            }}
          >
            {word}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        ))}
      </motion.span>
    </span>
  );
}

/** remocn MarkerHighlight — a marker bar sweeps in behind a phrase. */
export function MarkerHighlight({ children }: { children: ReactNode }) {
  return (
    <motion.span
      className="relative isolate inline-block"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-10% 0px" }}
    >
      <motion.span
        aria-hidden="true"
        className="absolute -inset-x-0.5 -inset-y-0.5 -z-10 rounded-sm bg-brass/25"
        variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1 } }}
        style={{ originX: 0 }}
        transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.05 }}
      />
      <span className="text-zinc-100">{children}</span>
    </motion.span>
  );
}

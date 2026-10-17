'use client';

import { motion } from "framer-motion";

export function GlowCard({
  children,
  className = "",
  hoverable = true,
  glowColor = "rgba(205, 168, 106, 0.16)",
}: {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  glowColor?: string;
}) {
  return (
    <motion.div
      whileHover={hoverable ? { y: -4 } : undefined}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/45 ${
        hoverable ? "transition-colors hover:border-zinc-700" : ""
      } ${className}`}
    >
      {hoverable && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(420px circle at 50% 0%, ${glowColor}, transparent 65%)`,
          }}
        />
      )}
      <div className="relative">{children}</div>
    </motion.div>
  );
}

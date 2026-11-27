'use client';

import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import type { LearningMode } from "@/learning/platform/types";

const MODES: Array<{ value: LearningMode; label: string; hint: string }> = [
  { value: "story", label: "Story", hint: "Analogy and narrative" },
  { value: "engineer", label: "Engineer", hint: "Mechanics and trade-offs" },
  { value: "both", label: "Both", hint: "Choose a layer for each step" },
];

/**
 * Compact reading-mode control. The active option is marked by a shared
 * `layoutId` pill, so changing mode moves one element instead of popping
 * backgrounds between buttons.
 */
export function ModeSwitch({
  mode,
  onChange,
  label = "Reading mode",
}: {
  mode: LearningMode;
  onChange: (mode: LearningMode) => void;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const pillTransition = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 32, mass: 0.7 };

  return (
    <LayoutGroup id="learner-mode-switch">
      <div
        className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-app-raised p-1"
        role="group"
        aria-label={label}
      >
        {MODES.map((option) => {
          const active = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              title={option.hint}
              className={`relative rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors sm:px-4 ${
                active ? "text-ink" : "text-content-secondary hover:text-content"
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="learner-mode-pill"
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-brass"
                  transition={pillTransition}
                />
              ) : null}
              <span className="relative z-10">{option.label}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

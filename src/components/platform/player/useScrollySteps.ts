'use client';

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared scrollytelling navigation for lesson and blog readers.
 *
 * Scroll and explicit navigation are deliberately cooperative: a click claims
 * the next 600ms so the IntersectionObserver cannot pull the reader back to a
 * section it is still smooth-scrolling past. Reading-mode changes can hold that
 * suppression window open while their content-height animations settle.
 *
 * `stepVersion` is a monotonic counter bumped once per committed step change.
 * It is the single transition signal handed to every visual so that arrow keys,
 * buttons, dots, resume restores and scroll all replay the same animation.
 */
export function useScrollySteps(count: number) {
  const [activeStep, setActiveStep] = useState(0);
  const [stepVersion, setStepVersion] = useState(0);
  const activeStepRef = useRef(0);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const observerSuppressedUntilRef = useRef(0);

  const commitStep = useCallback(
    (index: number) => {
      const target = Math.max(0, Math.min(count - 1, index));
      // Guard against duplicate commits (repeated scroll observations or a
      // held arrow key) so a single navigation replays exactly one animation.
      if (target === activeStepRef.current) return target;
      activeStepRef.current = target;
      setActiveStep(target);
      setStepVersion((version) => version + 1);
      return target;
    },
    [count],
  );

  useEffect(() => {
    if (typeof window === "undefined" || count === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < observerSuppressedUntilRef.current) return;
        let bestIndex = -1;
        let bestRatio = 0;
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.stepIndex);
          if (!Number.isFinite(index)) continue;
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIndex = index;
          }
        }
        if (bestIndex >= 0 && bestRatio >= 0.4) commitStep(bestIndex);
      },
      { threshold: [0, 0.4, 0.6, 1] },
    );
    for (const element of sectionRefs.current) {
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [count, commitStep]);

  const goToStep = useCallback(
    (index: number) => {
      const target = commitStep(index);
      observerSuppressedUntilRef.current = Math.max(
        observerSuppressedUntilRef.current,
        Date.now() + 600,
      );
      const element = sectionRefs.current[target];
      if (element && typeof window !== "undefined") {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        element.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      }
    },
    [commitStep],
  );

  const holdStep = useCallback((durationMs = 1000) => {
    observerSuppressedUntilRef.current = Math.max(
      observerSuppressedUntilRef.current,
      Date.now() + durationMs,
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      // Read the live step from the ref instead of a render-scoped closure so a
      // key repeat or a press during the smooth scroll cannot act on a stale
      // index. Arrow keys therefore take the exact same goToStep path (and the
      // same stepVersion bump) as the Previous/Next buttons and step dots.
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToStep(activeStepRef.current - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToStep(activeStepRef.current + 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToStep]);

  return { activeStep, sectionRefs, goToStep, holdStep, stepVersion };
}

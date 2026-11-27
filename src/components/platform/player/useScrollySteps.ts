'use client';

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared scrollytelling navigation for lesson and blog readers.
 *
 * Scroll and explicit navigation are deliberately cooperative: a click claims
 * the next 600ms so the IntersectionObserver cannot pull the reader back to a
 * section it is still smooth-scrolling past. Reading-mode changes can hold that
 * suppression window open while their content-height animations settle.
 */
export function useScrollySteps(count: number) {
  const [activeStep, setActiveStep] = useState(0);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const observerSuppressedUntilRef = useRef(0);

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
        if (bestIndex >= 0 && bestRatio >= 0.4) setActiveStep(bestIndex);
      },
      { threshold: [0, 0.4, 0.6, 1] },
    );
    for (const element of sectionRefs.current) {
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [count]);

  const goToStep = useCallback(
    (index: number) => {
      const target = Math.max(0, Math.min(count - 1, index));
      observerSuppressedUntilRef.current = Math.max(
        observerSuppressedUntilRef.current,
        Date.now() + 600,
      );
      setActiveStep(target);
      const element = sectionRefs.current[target];
      if (element && typeof window !== "undefined") {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        element.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      }
    },
    [count],
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
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToStep(activeStep - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToStep(activeStep + 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeStep, goToStep]);

  return { activeStep, sectionRefs, goToStep, holdStep };
}

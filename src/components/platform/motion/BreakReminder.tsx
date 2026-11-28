'use client';

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useLearnerPlatformStore } from "@/store/useLearnerPlatformStore";

const IDLE_LIMIT_MS = 90_000;
const BREATH_MS = 120_000;
const SNOOZE_MS = 10 * 60_000;

function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

/**
 * Non-blocking, attention-friendly break nudge. Focus time only accrues while
 * the tab is visible, the pointer/keyboard are active, and no quiz is running.
 */
export default function BreakReminder() {
  const breakMinutes = Number(useLearnerPlatformStore((s) => s.prefs?.breakMinutes ?? 0));
  const hydrated = useLearnerPlatformStore((s) => s.hydrated);

  // Remount on every preference change so Off → the same interval cannot
  // revive a reminder or breathing timer owned by the previous setting.
  return <BreakReminderTimer key={breakMinutes} breakMinutes={breakMinutes} hydrated={hydrated} />;
}

function BreakReminderTimer({ breakMinutes, hydrated }: { breakMinutes: number; hydrated: boolean }) {
  // Visibility is keyed by the preference it belongs to, so a preference change
  // hides the reminder without a synchronous state reset in the effect.
  const [view, setView] = useState<{ minutes: number; shown: boolean; breathing: boolean } | null>(null);
  const shown = view !== null && view.minutes === breakMinutes && view.shown;
  const breathing = view !== null && view.minutes === breakMinutes && view.breathing;
  const [remaining, setRemaining] = useState(BREATH_MS / 1000);

  const activeMsRef = useRef(0);
  const snoozeUntilRef = useRef(0);
  const shownRef = useRef(false);

  useEffect(() => {
    activeMsRef.current = 0;
    snoozeUntilRef.current = 0;
    shownRef.current = false;

    if (
      typeof window === "undefined" ||
      typeof document === "undefined" ||
      !hydrated ||
      !Number.isFinite(breakMinutes) ||
      breakMinutes <= 0
    ) {
      return;
    }

    let lastActivity = Date.now();
    let lastTick = Date.now();
    let tabVisible = !document.hidden;

    const markActivity = () => {
      lastActivity = Date.now();
    };
    const onVisibility = () => {
      tabVisible = !document.hidden;
      lastTick = Date.now();
    };

    const timer = window.setInterval(() => {
      const now = Date.now();
      const delta = Math.min(Math.max(now - lastTick, 0), 2000);
      lastTick = now;

      const quizActive = Boolean(document.querySelector('[data-quiz-active="true"]'));
      if (quizActive && shownRef.current) {
        shownRef.current = false;
        setView({ minutes: breakMinutes, shown: false, breathing: false });
      }

      const idle = now - lastActivity >= IDLE_LIMIT_MS;
      const muted = !tabVisible || idle || quizActive || now < snoozeUntilRef.current;
      const thresholdMs = breakMinutes * 60_000;
      // Once a reminder is open, the completed focus cycle must not arm another
      // reminder underneath it (or interrupt an in-progress breathing break).
      if (!muted && !shownRef.current) {
        activeMsRef.current += delta;
        if (activeMsRef.current >= thresholdMs) {
          activeMsRef.current = 0;
          shownRef.current = true;
          setView({ minutes: breakMinutes, shown: true, breathing: false });
        }
      }

      window.dispatchEvent(new CustomEvent("syscraft:study-tick", {
        detail: {
          activeMs: activeMsRef.current,
          thresholdMs,
          shown: shownRef.current,
          muted,
        },
      }));
    }, 1000);

    window.addEventListener("pointermove", markActivity, { passive: true });
    window.addEventListener("pointerdown", markActivity, { passive: true });
    window.addEventListener("keydown", markActivity);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pointermove", markActivity);
      window.removeEventListener("pointerdown", markActivity);
      window.removeEventListener("keydown", markActivity);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [breakMinutes, hydrated]);

  useEffect(() => {
    if (!breathing || typeof window === "undefined") return;
    const end = Date.now() + BREATH_MS;
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        shownRef.current = false;
        setView({ minutes: breakMinutes, shown: false, breathing: false });
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [breathing, breakMinutes]);

  const dismiss = () => {
    shownRef.current = false;
    activeMsRef.current = 0;
    setView(null);
  };

  const snooze = () => {
    shownRef.current = false;
    activeMsRef.current = 0;
    snoozeUntilRef.current = Date.now() + SNOOZE_MS;
    setView(null);
  };

  if (!shown) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="Break reminder"
      className="fixed bottom-4 right-4 z-[60] w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line bg-app-overlay/90 p-4 text-content shadow-lift backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brass">
            Break reminder
          </p>
          <h2 className="mt-1 text-sm font-semibold">Give your eyes a moment</h2>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss break reminder"
          title="Dismiss"
          className="rounded-lg p-1 text-content-tertiary transition hover:bg-app-raised hover:text-content focus-visible:ring-2 focus-visible:ring-sky-400/60"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-content-secondary">
        <li>20-20-20: look at something 20 feet away for 20 seconds.</li>
        <li>Drink some water and let your shoulders drop.</li>
      </ul>

      {breathing ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-line bg-app/60 py-4">
          <div
            className="break-breathe h-14 w-14 rounded-full border-2 border-brass/70 bg-brass/10"
            aria-hidden="true"
          />
          <p className="font-mono text-sm tabular-nums text-brass-bright">{formatClock(remaining)}</p>
          <p className="text-[11px] text-content-tertiary">
            Inhale as the circle grows, exhale as it settles.
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            shownRef.current = true;
            setRemaining(BREATH_MS / 1000);
            setView({ minutes: breakMinutes, shown: true, breathing: true });
          }}
          className="rounded-lg border border-brass/50 bg-brass/15 px-3 py-1.5 text-[12px] font-semibold text-brass-bright transition hover:bg-brass/25 focus-visible:ring-2 focus-visible:ring-sky-400/60"
        >
          Start 2-min break
        </button>
        <button
          type="button"
          onClick={snooze}
          className="rounded-lg border border-line bg-app-raised px-3 py-1.5 text-[12px] font-medium text-content transition hover:border-line-strong focus-visible:ring-2 focus-visible:ring-sky-400/60"
        >
          Snooze 10m
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg px-2 py-1.5 text-[12px] font-medium text-content-secondary transition hover:text-content focus-visible:ring-2 focus-visible:ring-sky-400/60"
        >
          Dismiss
        </button>
      </div>
    </aside>
  );
}

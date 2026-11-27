'use client';

import { useCallback, useEffect, useState } from "react";
import { Check, Database, Download, RotateCcw } from "@/components/ui/icons";
import { exportLearnerJson, importLearnerJson } from "@/learning/platform/storage";
import type { BreakMinutes, LearningMode, ThemePref } from "@/learning/platform/types";
import { useLearnerPlatformStore } from "@/store/useLearnerPlatformStore";

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

const MODES: Array<{ value: LearningMode; label: string }> = [
  { value: "story", label: "Story" },
  { value: "engineer", label: "Engineer" },
  { value: "both", label: "Both" },
];

const THEMES: Array<{ value: ThemePref; label: string }> = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

const BREAKS: Array<{ value: BreakMinutes; label: string }> = [
  { value: 0, label: "Off" },
  { value: 15, label: "15 minutes" },
  { value: 25, label: "25 minutes" },
  { value: 45, label: "45 minutes" },
];

/** Local calendar date so the filename matches the learner's own day. */
function dateStamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Browser-local learner data and preferences. Everything here is an explicit
 * user action; storage is only touched inside effects or event handlers so the
 * settings route can still be prerendered safely.
 */
export function LearnerDataPanel() {
  const hydrate = useLearnerPlatformStore((s) => s.hydrate);
  const lessonCount = useLearnerPlatformStore((s) => s.completedLessons.length);
  const blogCount = useLearnerPlatformStore((s) => s.readBlogs.length);
  const noteCount = useLearnerPlatformStore((s) => Object.keys(s.notes).length);
  const bookmarkCount = useLearnerPlatformStore((s) => s.bookmarks.length);
  const prefs = useLearnerPlatformStore((s) => s.prefs);
  const setMode = useLearnerPlatformStore((s) => s.setMode);
  const setTheme = useLearnerPlatformStore((s) => s.setTheme);
  const setAmbient = useLearnerPlatformStore((s) => s.setAmbient);
  const setCursor = useLearnerPlatformStore((s) => s.setCursor);
  const setBreakMinutes = useLearnerPlatformStore((s) => s.setBreakMinutes);
  const resetProgress = useLearnerPlatformStore((s) => s.resetProgress);
  const replaceState = useLearnerPlatformStore((s) => s.replaceState);

  const [status, setStatus] = useState<string | null>(null);
  const [resetArmed, setResetArmed] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const exportProgress = useCallback(() => {
    setResetArmed(false);
    const json = exportLearnerJson(useLearnerPlatformStore.getState());
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `syscraft-progress-${dateStamp(new Date())}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Progress exported.");
  }, []);

  const importProgress = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setResetArmed(false);
      setStatus(null);
      if (file.size > MAX_IMPORT_BYTES) {
        setStatus("That file is larger than 2 MB. Choose a smaller progress file.");
        return;
      }
      try {
        const parsed = importLearnerJson(await file.text());
        replaceState(parsed);
        setStatus("Progress imported.");
      } catch {
        setStatus("That file is not valid SysCraft progress. Nothing was changed.");
      }
    },
    [replaceState],
  );

  const resetLearningProgress = useCallback(() => {
    if (!resetArmed) {
      setResetArmed(true);
      setStatus("Click \"Confirm reset\" to erase this browser's learning progress.");
      return;
    }
    resetProgress();
    setResetArmed(false);
    setStatus("Learning progress reset. Your preferences were kept.");
  }, [resetArmed, resetProgress]);

  const counts = [
    { label: "Completed lessons", value: lessonCount },
    { label: "Read blogs", value: blogCount },
    { label: "Saved notes", value: noteCount },
    { label: "Bookmarks", value: bookmarkCount },
  ];

  return (
    <section
      aria-labelledby="learner-data-heading"
      className="rounded-2xl border border-line bg-app-raised p-5 shadow-card sm:p-6"
    >
      <div className="flex items-center gap-2">
        <Database size={16} className="text-brass" aria-hidden="true" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass">Local learning</p>
      </div>
      <h2 id="learner-data-heading" className="mt-3 text-xl font-semibold text-content sm:text-2xl">
        Your learning data
      </h2>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-content-secondary" data-cursor="read">
        Progress, notes, bookmarks, preferences, and recall history stay in this browser. No account is required, and
        nothing is sent to a server.
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {counts.map((item) => (
          <div key={item.label} className="rounded-xl border border-line bg-app px-4 py-3">
            <dt className="text-[11px] font-medium text-content-tertiary">{item.label}</dt>
            <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-content">{item.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-app p-4 sm:p-5">
          <h3 className="text-[13px] font-semibold text-content">Move your progress</h3>
          <p className="mt-2 text-[12px] leading-relaxed text-content-secondary" data-cursor="read">
            Export saves one JSON file. Import replaces the learning data in this browser, including these preferences.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportProgress}
              className="inline-flex items-center gap-2 rounded-xl border border-brass/50 bg-brass/10 px-4 py-2.5 text-[13px] font-semibold text-brass transition-colors hover:bg-brass/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60"
            >
              <Download size={16} aria-hidden="true" />
              Export progress
            </button>
          </div>
          <label htmlFor="learner-progress-file" className="mt-5 block text-[12px] font-medium text-content">
            Import progress
          </label>
          <input
            id="learner-progress-file"
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              event.currentTarget.value = "";
              void importProgress(file);
            }}
            className="mt-2 block w-full rounded-xl border border-line bg-app-raised px-3 py-2 text-[12px] text-content-secondary file:mr-3 file:rounded-lg file:border file:border-line file:bg-app file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-content focus:border-brass/60 focus:outline-none"
          />
          <p className="mt-2 text-[11px] text-content-tertiary">Choose a SysCraft progress file up to 2 MB.</p>
        </div>

        <div className="rounded-xl border border-line bg-app p-4 sm:p-5">
          <h3 className="text-[13px] font-semibold text-content">Preferences</h3>
          <p className="mt-2 text-[12px] leading-relaxed text-content-secondary" data-cursor="read">
            These choices are saved alongside your progress in this browser.
          </p>

          <fieldset className="mt-5">
            <legend className="text-[11px] font-medium uppercase tracking-[0.12em] text-content-tertiary">
              Learning style
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {MODES.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-xl border px-3 py-2 text-[12px] font-medium transition-colors focus-within:ring-2 focus-within:ring-brass/60 ${
                    prefs.mode === option.value
                      ? "border-brass/60 bg-brass/10 text-brass"
                      : "border-line text-content-secondary hover:border-brass/40 hover:text-content"
                  }`}
                >
                  <input
                    type="radio"
                    name="learner-mode"
                    value={option.value}
                    checked={prefs.mode === option.value}
                    onChange={() => setMode(option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-[11px] font-medium uppercase tracking-[0.12em] text-content-tertiary">
              Appearance
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {THEMES.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-xl border px-3 py-2 text-[12px] font-medium transition-colors focus-within:ring-2 focus-within:ring-brass/60 ${
                    prefs.theme === option.value
                      ? "border-brass/60 bg-brass/10 text-brass"
                      : "border-line text-content-secondary hover:border-brass/40 hover:text-content"
                  }`}
                >
                  <input
                    type="radio"
                    name="learner-theme"
                    value={option.value}
                    checked={prefs.theme === option.value}
                    onChange={() => setTheme(option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div role="group" aria-label="Display motion" className="mt-5 space-y-3">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2 text-[12px] text-content focus-within:border-brass/60">
              <input
                type="checkbox"
                aria-label="Ambient background"
                checked={prefs.ambient}
                onChange={(event) => setAmbient(event.target.checked)}
                className="h-4 w-4 accent-brass"
              />
              Ambient background
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2 text-[12px] text-content focus-within:border-brass/60">
              <input
                type="checkbox"
                aria-label="Custom cursor"
                checked={prefs.cursor}
                onChange={(event) => setCursor(event.target.checked)}
                className="h-4 w-4 accent-brass"
              />
              Custom cursor
            </label>
          </div>

          <div className="mt-5">
            <label htmlFor="learner-break" className="text-[11px] font-medium uppercase tracking-[0.12em] text-content-tertiary">
              Break reminder
            </label>
            <select
              id="learner-break"
              value={String(prefs.breakMinutes)}
              onChange={(event) => setBreakMinutes(Number(event.target.value) as BreakMinutes)}
              className="mt-2 block w-full rounded-xl border border-line bg-app-raised px-3 py-2 text-[12px] text-content focus:border-brass/60 focus:outline-none"
            >
              {BREAKS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {status ? (
        <p role="status" aria-live="polite" className="mt-4 text-[12px] leading-relaxed text-brass">
          {status}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4 border-t border-line pt-5">
        <div className="max-w-xl">
          <h3 className="text-[13px] font-semibold text-content">Reset learning progress</h3>
          <p className="mt-2 text-[12px] leading-relaxed text-content-secondary" data-cursor="read">
            This clears lessons, blogs, notes, bookmarks, and recall history in this browser. Canvas blueprints and FSRS
            cards live in IndexedDB as separate data, and they are not deleted by this reset.
          </p>
        </div>
        <button
          type="button"
          onClick={resetLearningProgress}
          aria-pressed={resetArmed}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70 ${
            resetArmed
              ? "border-rose-400/70 bg-rose-400/15 text-rose-300 hover:bg-rose-400/25"
              : "border-danger/40 text-danger hover:border-danger/70"
          }`}
        >
          {resetArmed ? <Check size={16} aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" />}
          {resetArmed ? "Confirm reset" : "Reset learning progress"}
        </button>
      </div>
    </section>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import {
  Bookmark,
  Clock3,
  Command,
  ListChecks,
  MousePointer2,
  NotebookPen,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useLearnerPlatformStore } from "@/store/useLearnerPlatformStore";
import type { BreakMinutes, LearningMode } from "@/learning/platform/types";
import { asBookmarks } from "./platformRoutes";

type Panel = "none" | "notes" | "bookmarks";

const MODES = [
  { value: "story", label: "Story" },
  { value: "engineer", label: "Engineer" },
  { value: "both", label: "Both" },
] as const;

const BREAK_OPTIONS = [
  { value: "15", label: "15m" },
  { value: "25", label: "25m" },
  { value: "45", label: "45m" },
  { value: "off", label: "Off" },
];

const spring = { type: "spring" as const, stiffness: 420, damping: 32, mass: 0.8 };

const actionButton =
  "inline-flex w-full items-center gap-2 rounded-lg border border-line/70 bg-app/60 px-2 py-1.5 text-left text-[12px] font-medium text-content transition hover:border-line-strong hover:bg-app-overlay hover:text-brass-bright focus-visible:ring-2 focus-visible:ring-sky-400/60";

function toggleButton(active: boolean): string {
  return `inline-flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-[12px] font-medium transition focus-visible:ring-2 focus-visible:ring-sky-400/60 ${
    active
      ? "border-brass/50 bg-brass/10 text-brass-bright"
      : "border-line/70 bg-app/60 text-content-secondary hover:text-content"
  }`;
}

function DockGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-brass">
        {label}
      </p>
      {children}
    </div>
  );
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Compact floating utility launcher. The full control set lives in a popover
 * that opens above the launcher, so the default shell keeps only a 44–48px
 * button in the corner.
 */
export default function UtilityDock() {
  const mode = String(useLearnerPlatformStore((s) => s.prefs?.mode ?? "both"));
  const ambient = Boolean(useLearnerPlatformStore((s) => s.prefs?.ambient));
  const cursor = Boolean(useLearnerPlatformStore((s) => s.prefs?.cursor));
  const breakMinutes = Number(useLearnerPlatformStore((s) => s.prefs?.breakMinutes ?? 0));
  const setMode = useLearnerPlatformStore((s) => s.setMode);
  const setAmbient = useLearnerPlatformStore((s) => s.setAmbient);
  const setCursor = useLearnerPlatformStore((s) => s.setCursor);
  const setBreakMinutes = useLearnerPlatformStore((s) => s.setBreakMinutes);

  const scratchpad = useLearnerPlatformStore((s) => s.notes.scratchpad ?? "");
  const setNote = useLearnerPlatformStore((s) => s.setNote);
  const rawBookmarks = useLearnerPlatformStore((s) => s.bookmarks);

  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("none");
  const [study, setStudy] = useState({ activeMs: 0, thresholdMs: 25 * 60_000, shown: false, muted: false });
  const dockRef = useRef<HTMLDivElement | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const firstControlRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef(false);
  const reduceMotion = Boolean(useReducedMotion());
  const bookmarks = asBookmarks(rawBookmarks);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    setPanel("none");
    if (restoreFocus) restoreFocusRef.current = true;
  }, []);

  const openDock = () => {
    setPanel("none");
    setOpen(true);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStudyTick = (event: Event) => {
      const detail = (event as CustomEvent<{
        activeMs: number;
        thresholdMs: number;
        shown: boolean;
        muted: boolean;
      }>).detail;
      if (!detail || !Number.isFinite(detail.activeMs) || !Number.isFinite(detail.thresholdMs)) return;
      setStudy({
        activeMs: Math.max(0, detail.activeMs),
        thresholdMs: Math.max(0, detail.thresholdMs),
        shown: Boolean(detail.shown),
        muted: Boolean(detail.muted),
      });
    };
    window.addEventListener("syscraft:study-tick", onStudyTick);
    return () => window.removeEventListener("syscraft:study-tick", onStudyTick);
  }, []);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const frame = window.requestAnimationFrame(() => firstControlRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (open || typeof window === "undefined" || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    const frame = window.requestAnimationFrame(() => launcherRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && dockRef.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  const openSearch = () => {
    if (typeof window === "undefined") return;
    close(false);
    window.dispatchEvent(new CustomEvent("syscraft:open-search"));
  };

  const updateNote = (value: string) => {
    setNote("scratchpad", value);
  };

  const thresholdMs = breakMinutes > 0 ? breakMinutes * 60_000 : study.thresholdMs;
  const remainingMs = Math.max(0, thresholdMs - study.activeMs);
  const studyStatus = breakMinutes === 0
    ? "Break off"
    : study.shown
      ? "Break ready"
      : `${formatDuration(remainingMs)} to break`;
  const dotTone = breakMinutes === 0
    ? "bg-content-tertiary/70"
    : study.shown
      ? "bg-warning"
      : "bg-success";

  return (
    <div
      ref={dockRef}
      className="fixed bottom-4 left-4 z-[60] flex max-w-[calc(100vw-2rem)] flex-col items-start gap-2"
    >
      <AnimatePresence>
        {open ? (
          <motion.section
            key="utility-popover"
            id="platform-utility-popover"
            role="dialog"
            aria-label="Platform utilities"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 8 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 8 }}
            transition={reduceMotion ? { duration: 0 } : spring}
            style={{ transformOrigin: "bottom left" }}
            className="platform-card max-h-[calc(100dvh-6rem)] w-[min(22rem,calc(100vw-2rem))] max-sm:w-[calc(100vw-2rem)] overflow-y-auto p-3 shadow-lift"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brass">
                  Utility dock
                </h2>
                <p
                  className="mt-0.5 flex items-center gap-1.5 text-[11px] leading-tight tabular-nums text-content-tertiary"
                  title={`Active study time ${formatDuration(study.activeMs)}${study.muted ? " (paused)" : ""}`}
                >
                  <Clock3 className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{studyStatus}</span>
                  {breakMinutes > 0 && study.muted ? <span>· paused</span> : null}
                </p>
              </div>
              <button
                type="button"
                onClick={() => close(true)}
                aria-label="Close utilities"
                title="Close utilities"
                className="rounded-lg p-1 text-content-tertiary transition hover:bg-app-overlay hover:text-content focus-visible:ring-2 focus-visible:ring-sky-400/60"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <DockGroup label="Navigate">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    ref={firstControlRef}
                    type="button"
                    onClick={openSearch}
                    aria-label="Search lessons, labs, and tools"
                    aria-keyshortcuts="Meta+K Control+K"
                    title="Search (Ctrl/Cmd+K)"
                    className={actionButton}
                  >
                    <Search className="h-3.5 w-3.5 shrink-0 text-brass" aria-hidden="true" />
                    <span>Search</span>
                  </button>
                  <Link
                    href="/quiz"
                    aria-label="Open quiz"
                    title="Open quiz"
                    className={actionButton}
                  >
                    <ListChecks className="h-3.5 w-3.5 shrink-0 text-brass" aria-hidden="true" />
                    <span>Quiz</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPanel((current) => (current === "notes" ? "none" : "notes"))}
                    aria-expanded={panel === "notes"}
                    aria-label="Scratchpad notes"
                    title="Scratchpad"
                    className={actionButton}
                  >
                    <NotebookPen className="h-3.5 w-3.5 shrink-0 text-brass" aria-hidden="true" />
                    <span>Notes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanel((current) => (current === "bookmarks" ? "none" : "bookmarks"))}
                    aria-expanded={panel === "bookmarks"}
                    aria-label="Saved bookmarks"
                    title="Bookmarks"
                    className={actionButton}
                  >
                    <Bookmark className="h-3.5 w-3.5 shrink-0 text-brass" aria-hidden="true" />
                    <span>Saved</span>
                  </button>
                </div>
              </DockGroup>

              <DockGroup label="View">
                <div
                  role="group"
                  aria-label="Learning mode"
                  className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-app/70 p-1"
                >
                  {MODES.map((item) => {
                    const active = mode === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        aria-label={`${item.label} mode`}
                        aria-pressed={active}
                        onClick={() => setMode(item.value as LearningMode)}
                        className={`rounded-lg px-1.5 py-1 text-[11px] font-medium transition focus-visible:ring-2 focus-visible:ring-sky-400/60 ${
                          active
                            ? "bg-app-overlay text-brass-bright shadow-top-hair"
                            : "text-content-secondary hover:text-content"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </DockGroup>

              <DockGroup label="Focus">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAmbient(!ambient)}
                    aria-pressed={ambient}
                    aria-label="Ambient background"
                    title="Ambient background"
                    className={toggleButton(ambient)}
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Ambient</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCursor(!cursor)}
                    aria-pressed={cursor}
                    aria-label="Custom cursor"
                    title="Custom cursor"
                    className={toggleButton(cursor)}
                  >
                    <MousePointer2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Cursor</span>
                  </button>
                </div>
                <label className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-line/70 bg-app/60 px-2 py-1.5 text-[12px] text-content">
                  <span className="inline-flex items-center gap-2 text-content-secondary">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                    Break
                  </span>
                  <select
                    aria-label="Break reminder interval"
                    title="Break reminder interval"
                    value={breakMinutes === 0 ? "off" : String(breakMinutes)}
                    onChange={(event) => {
                      const raw = event.target.value;
                      const next = raw === "off" ? 0 : Number(raw);
                      setBreakMinutes(next as BreakMinutes);
                    }}
                    className="rounded-md border border-line bg-app px-1.5 py-0.5 text-[11px] text-content focus-visible:ring-2 focus-visible:ring-sky-400/60"
                  >
                    {BREAK_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </DockGroup>
            </div>

            <AnimatePresence initial={false}>
              {panel !== "none" ? (
                <motion.div
                  key={panel}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.16 }}
                  className="mt-3 rounded-xl border border-line bg-app/60 p-2"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brass">
                      {panel === "notes" ? "Scratchpad" : "Bookmarks"}
                    </p>
                    <button
                      type="button"
                      onClick={() => setPanel("none")}
                      aria-label={`Close ${panel === "notes" ? "scratchpad" : "bookmarks"}`}
                      title="Close"
                      className="rounded-lg p-1 text-content-tertiary transition hover:bg-app-overlay hover:text-content focus-visible:ring-2 focus-visible:ring-sky-400/60"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  {panel === "notes" ? (
                    <>
                      <textarea
                        aria-label="Scratchpad notes"
                        value={scratchpad}
                        onChange={(event) => updateNote(event.target.value)}
                        placeholder="Jot down a number or a question..."
                        rows={3}
                        className="w-full resize-y rounded-lg border border-line bg-app px-2.5 py-2 text-[13px] leading-relaxed text-content placeholder:text-content-tertiary focus-visible:ring-2 focus-visible:ring-sky-400/60"
                      />
                      <p className="mt-1 text-[11px] text-content-tertiary">
                        Saved automatically on this device.
                      </p>
                    </>
                  ) : bookmarks.length === 0 ? (
                    <p className="text-[13px] leading-relaxed text-content-secondary">
                      No bookmarks yet. Save a lesson or lab and it will show up here.
                    </p>
                  ) : (
                    <ul className="max-h-40 space-y-1 overflow-y-auto">
                      {bookmarks.map((item, index) => (
                        <li key={`${item.href}-${index}`}>
                          <Link
                            href={item.href}
                            className="block rounded-lg px-2 py-1.5 text-[13px] text-content transition hover:bg-app-overlay hover:text-brass-bright focus-visible:ring-2 focus-visible:ring-sky-400/60"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <motion.button
        ref={launcherRef}
        type="button"
        data-utility-launcher=""
        onClick={() => (open ? close(false) : openDock())}
        aria-label={open ? "Close platform utilities" : "Open platform utilities"}
        aria-expanded={open}
        aria-controls={open ? "platform-utility-popover" : undefined}
        title="Utilities"
        whileHover={reduceMotion ? undefined : { scale: 1.04 }}
        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
        transition={reduceMotion ? { duration: 0 } : spring}
        className="relative grid h-11 w-11 place-items-center rounded-2xl border border-line bg-app-raised/95 text-brass shadow-card backdrop-blur transition-colors hover:border-line-strong hover:text-brass-bright focus-visible:ring-2 focus-visible:ring-sky-400/60 sm:h-12 sm:w-12"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, rotate: -45, scale: 0.7 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, rotate: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, rotate: 45, scale: 0.7 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.16 }}
              className="grid place-items-center"
            >
              <X className="h-[18px] w-[18px]" aria-hidden="true" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, rotate: 45, scale: 0.7 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, rotate: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, rotate: -45, scale: 0.7 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.16 }}
              className="grid place-items-center"
            >
              <Command className="h-[18px] w-[18px]" aria-hidden="true" />
            </motion.span>
          )}
        </AnimatePresence>
        <span
          aria-hidden="true"
          className={`absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full ring-2 ring-app-raised ${dotTone} ${
            breakMinutes > 0 && study.shown ? "break-breathe" : ""
          }`}
        />
      </motion.button>
    </div>
  );
}

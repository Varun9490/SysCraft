'use client';

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronDown, Clock, GraduationCap, Layers } from "@/components/ui/icons";
import { EASE } from "@/components/ui/motion";
import { TopicVisual } from "@/components/platform/visuals/registry";
import { useLearnerPlatformStore } from "@/store/useLearnerPlatformStore";
import type { LearningMode, Lesson, LessonStep } from "@/learning/platform/types";
import { SecurityAndNotes } from "./SecurityAndNotes";
import { useScrollySteps } from "./useScrollySteps";
import { ModeSwitch } from "./ModeSwitch";

const LAYER_TABS = [
  { id: "story", label: "Story", engineer: false },
  { id: "engineer", label: "Engineer", engineer: true },
] as const;

// Quiz eligibility is earned by reading, never by merely opening a page. Time
// only accrues while the tab is visible and the reader is active; see the
// tracking effect in LessonPlayer below.
const READY_READ_MS = 30_000;
const IDLE_LIMIT_MS = 90_000;
const READ_TICK_MS = 1_000;

/**
 * One step's reading layers. Story is the default layer; the engineer layer is
 * only mounted when it is useful: on demand in Story/Both, always in Engineer.
 * Only ever one full-height text panel is shown in Both mode.
 */
function StepLayers({
  step,
  mode,
  idPrefix,
}: {
  step: LessonStep;
  mode: LearningMode;
  idPrefix: string;
}) {
  const [engineerOpen, setEngineerOpen] = useState(false);
  const reduce = useReducedMotion();
  const duration = reduce ? 0 : 0.22;
  const pillTransition = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.7 };

  const showStory = mode !== "engineer" && !(mode === "both" && engineerOpen);
  const showEngineer = mode === "engineer" || engineerOpen;

  return (
    <>
      {mode === "both" ? (
        <LayoutGroup id={`lesson-layer-${idPrefix}`}>
          <div
            className="mt-4 inline-flex items-center gap-1 rounded-full border border-line bg-app-raised p-0.5"
            role="group"
            aria-label={`Reading layer for ${step.title}`}
          >
            {LAYER_TABS.map((tab) => {
              const active = tab.engineer === engineerOpen;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEngineerOpen(tab.engineer)}
                  aria-pressed={active}
                  className={`relative rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                    active ? "text-ink" : "text-content-secondary hover:text-content"
                  }`}
                >
                  {active ? (
                    <motion.span
                      layoutId={`lesson-layer-pill-${idPrefix}`}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-brass"
                      transition={pillTransition}
                    />
                  ) : null}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      ) : null}

      {mode === "story" ? (
        <button
          type="button"
          onClick={() => setEngineerOpen((open) => !open)}
          aria-expanded={engineerOpen}
          aria-controls={`lesson-layers-${idPrefix}`}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-app-raised px-3 py-1.5 text-[12px] font-medium text-content-secondary transition-colors hover:border-brass/40 hover:text-content"
        >
          <Layers size={13} />
          {engineerOpen ? "Hide engineering details" : "Go deeper · Engineer"}
          <motion.span
            aria-hidden="true"
            className="inline-flex"
            animate={{ rotate: engineerOpen ? 180 : 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
          >
            <ChevronDown size={13} />
          </motion.span>
        </button>
      ) : null}

      <div id={`lesson-layers-${idPrefix}`} className="mt-5 grid min-h-[260px] content-start gap-4">
        <AnimatePresence initial={false} mode="wait">
          {showStory ? (
            <motion.div
              key="story"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration, ease: EASE }}
              className="overflow-hidden"
            >
              <article className="rounded-2xl border border-line bg-app-raised/70 p-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">Story</h3>
                <p className="mt-3 whitespace-pre-wrap text-[14px] leading-[1.8] text-content">{step.story}</p>
              </article>
            </motion.div>
          ) : null}
          {showEngineer ? (
            <motion.div
              key="engineer"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration, ease: EASE }}
              className="overflow-hidden"
            >
              <article data-cursor="inspect" className="rounded-2xl border border-line bg-app px-5 py-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">Engineer</h3>
                <pre className="mt-3 whitespace-pre-wrap font-mono text-[13px] leading-[1.8] text-content-secondary">
                  {step.engineer}
                </pre>
              </article>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const { activeStep, sectionRefs, goToStep, holdStep, stepVersion } = useScrollySteps(lesson.steps.length);

  const hydrate = useLearnerPlatformStore((s) => s.hydrate);
  const hydrated = useLearnerPlatformStore((s) => s.hydrated);
  const resume = useLearnerPlatformStore((s) => s.resume);
  const visitTopic = useLearnerPlatformStore((s) => s.visitTopic);
  const setResume = useLearnerPlatformStore((s) => s.setResume);
  const mode = useLearnerPlatformStore((s) => s.prefs.mode);
  const setMode = useLearnerPlatformStore((s) => s.setMode);
  const reduce = useReducedMotion();
  const resumeAppliedRef = useRef(false);
  const finalizeVisitRef = useRef<() => void>(() => {});
  const [resumeReady, setResumeReady] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated || resumeAppliedRef.current) return;
    resumeAppliedRef.current = true;
    const savedStep =
      resume?.kind === "lesson" && resume.id === lesson.id
        ? Math.max(0, Math.min(lesson.steps.length - 1, resume.stepIndex))
        : 0;
    const frame = window.requestAnimationFrame(() => {
      if (savedStep > 0) goToStep(savedStep);
      setResumeReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hydrated, resume, lesson.id, lesson.steps.length, goToStep]);

  useEffect(() => {
    if (!hydrated || !resumeReady) return;
    setResume({ kind: "lesson", id: lesson.id, stepIndex: activeStep });
  }, [setResume, hydrated, resumeReady, lesson.id, activeStep]);

  // Accrue active, visible reading time locally (never in React state). The tab
  // being hidden or 90s of pointer/keyboard inactivity pauses the clock. The
  // timer and listeners are torn down on topic change, which also resets the
  // accumulated time, so navigating to another lesson starts from zero.
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    let activeMs = 0;
    let lastActivity = Date.now();
    let lastTick = Date.now();
    let tabVisible = !document.hidden;
    let done = false;

    const markVisited = () => {
      if (done) return;
      done = true;
      visitTopic(lesson.id);
    };
    finalizeVisitRef.current = markVisited;

    const markActivity = () => {
      lastActivity = Date.now();
    };
    const onVisibility = () => {
      tabVisible = !document.hidden;
      lastTick = Date.now();
    };

    const timer = window.setInterval(() => {
      if (done) return;
      const now = Date.now();
      const delta = Math.min(Math.max(now - lastTick, 0), READ_TICK_MS * 2);
      lastTick = now;
      if (tabVisible && now - lastActivity < IDLE_LIMIT_MS) activeMs += delta;
      if (activeMs >= READY_READ_MS) markVisited();
    }, READ_TICK_MS);

    window.addEventListener("pointerdown", markActivity, { passive: true });
    window.addEventListener("pointermove", markActivity, { passive: true });
    window.addEventListener("keydown", markActivity);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(timer);
      finalizeVisitRef.current = () => {};
      window.removeEventListener("pointerdown", markActivity);
      window.removeEventListener("pointermove", markActivity);
      window.removeEventListener("keydown", markActivity);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [lesson.id, visitTopic]);

  // Reaching the final step counts as meaningful reading regardless of how
  // long it took (including a restored resume position at the last step).
  useEffect(() => {
    if (!hydrated || !resumeReady) return;
    if (activeStep === lesson.steps.length - 1) finalizeVisitRef.current();
  }, [hydrated, resumeReady, activeStep, lesson.steps.length]);

  const step = lesson.steps[activeStep] ?? lesson.steps[0];

  return (
    <main data-learner-hydrated={hydrated ? "true" : "false"} className="mx-auto w-full max-w-7xl px-5 pb-24 pt-10 sm:px-8">
      <nav className="flex flex-wrap items-center gap-2 text-[12px] text-content-tertiary" aria-label="Breadcrumb">
        <Link href="/paths" className="transition-colors hover:text-content">Learning paths</Link>
        <span aria-hidden="true">/</span>
        <span>{lesson.title}</span>
      </nav>

      <header className="mt-6 max-w-3xl">
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-content-tertiary">
          <span className="inline-flex items-center gap-1.5"><Clock size={13} /> {lesson.minutes} min</span>
          <span className="inline-flex items-center gap-1.5"><GraduationCap size={13} /> Guided lesson</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-content sm:text-4xl">{lesson.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-content-secondary" data-cursor="read">{lesson.summary}</p>
        <p className="mt-4 border-l-2 border-brass/60 pl-4 text-[14px] italic leading-relaxed text-content-secondary" data-cursor="read">
          {lesson.storyHook}
        </p>

      </header>

      {/* Sticky so the mode switch stays reachable without scrolling back to the
          header, which would change the active step. z-30 is above page content
          but below the z-40 site header and z-[60] utility dock. */}
      <div className="sticky top-14 z-30 -mx-5 mt-6 flex h-11 items-center overflow-x-auto border-y border-line/60 bg-ink/90 px-5 backdrop-blur-xl sm:-mx-8 sm:px-8">
        <div className="w-max">
          <ModeSwitch
            mode={mode}
            onChange={(nextMode) => {
              holdStep();
              setMode(nextMode);
            }}
          />
        </div>
      </div>

      <div className="mt-10 grid grid-cols-12 gap-6 lg:gap-10">
        <aside className="order-1 col-span-12 lg:order-2 lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <figure className="overflow-hidden rounded-2xl border border-line bg-app-raised shadow-card">
              <div key={`visual-${stepVersion}`} className="aspect-video min-h-[280px] w-full">
                <TopicVisual
                  visualId={step?.visualId ?? "traffic-flow"}
                  stepIndex={activeStep}
                  transitionKey={stepVersion}
                />
              </div>
              <figcaption className="flex items-start justify-between gap-3 border-t border-line px-5 py-3">
                <span className="text-[12px] leading-relaxed text-content-tertiary">
                  {step?.visualCaption ?? "Follow the highlighted stage as you scroll."}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-brass">
                  {String(activeStep + 1).padStart(2, "0")} / {String(lesson.steps.length).padStart(2, "0")}
                </span>
              </figcaption>
            </figure>
            <p className="mt-3 text-[12px] leading-relaxed text-content-tertiary" data-cursor="read">
              Use <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[11px]">←</kbd> and{" "}
              <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[11px]">→</kbd> or the step dots to
              move through the lesson.
            </p>
          </div>
        </aside>

        <div className="order-2 col-span-12 lg:order-1 lg:col-span-7" data-cursor="read">
          <nav className="flex flex-wrap items-center gap-3 border-b border-line pb-5" aria-label="Step controls">
            <button
              type="button"
              onClick={() => goToStep(activeStep - 1)}
              disabled={activeStep === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-[12px] text-content-secondary transition-colors hover:border-brass/40 hover:text-content disabled:opacity-40"
            >
              <ArrowLeft size={14} /> Previous
            </button>
            <ol className="flex flex-1 flex-wrap items-center justify-center gap-1.5" aria-label="Lesson steps">
              {lesson.steps.map((entry, index) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => goToStep(index)}
                    aria-label={`Go to step ${index + 1}: ${entry.title}`}
                    aria-current={index === activeStep ? "step" : undefined}
                    className="group relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  >
                    {/* 24x24 hit area; the visible dot stays a compact pill. */}
                    <span
                      aria-hidden="true"
                      className={`absolute left-1/2 top-1/2 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 ${
                        index === activeStep
                          ? "w-8 bg-brass"
                          : "w-2.5 bg-line-strong group-hover:w-5 group-hover:bg-content-tertiary"
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => goToStep(activeStep + 1)}
              disabled={activeStep === lesson.steps.length - 1}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-[12px] text-content-secondary transition-colors hover:border-brass/40 hover:text-content disabled:opacity-40"
            >
              Next <ArrowRight size={14} />
            </button>
          </nav>

          {lesson.steps.map((entry, index) => (
            <section
              key={entry.id}
              id={`step-${index}`}
              data-step-index={index}
              ref={(element) => {
                sectionRefs.current[index] = element;
              }}
              className="min-h-[70vh] scroll-mt-32 border-b border-line/60 py-12"
              aria-labelledby={`step-title-${index}`}
            >
              <motion.div
                initial={false}
                animate={index === activeStep ? "active" : "idle"}
                variants={{
                  active: { y: 0, opacity: 1 },
                  idle: { y: 8, opacity: 0.92 },
                }}
                transition={reduce ? { duration: 0 } : { duration: 0.32, ease: EASE }}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brass">
                  Step {String(index + 1).padStart(2, "0")}
                </p>
                <h2 id={`step-title-${index}`} className="mt-3 text-2xl font-semibold tracking-tight text-content">
                  {entry.title}
                </h2>
                <StepLayers
                  step={entry}
                  mode={mode}
                  idPrefix={`${lesson.id}-${entry.id}`}
                />
              </motion.div>
            </section>
          ))}

          <nav className="flex items-center justify-between gap-4 py-8" aria-label="End of lesson">
            <button
              type="button"
              onClick={() => goToStep(activeStep - 1)}
              disabled={activeStep === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-[12px] text-content-secondary transition-colors hover:text-content disabled:opacity-40"
            >
              <ArrowLeft size={14} /> Previous
            </button>
            <Link href="/quiz" className="text-[12px] text-brass hover:underline">
              Review what you have read →
            </Link>
            <button
              type="button"
              onClick={() => goToStep(activeStep + 1)}
              disabled={activeStep === lesson.steps.length - 1}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-[12px] text-content-secondary transition-colors hover:text-content disabled:opacity-40"
            >
              Next <ArrowRight size={14} />
            </button>
          </nav>
        </div>
      </div>

      <SecurityAndNotes
        items={lesson.security}
        topicId={lesson.id}
        kind="lesson"
        completeLabel="Mark lesson complete"
      />
    </main>
  );
}

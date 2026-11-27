'use client';

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronDown, Clock, Layers } from "@/components/ui/icons";
import { EASE } from "@/components/ui/motion";
import { TopicVisual } from "@/components/platform/visuals/registry";
import { getLessonById } from "@/content/platform/registry";
import { useLearnerPlatformStore } from "@/store/useLearnerPlatformStore";
import type { BlogPost, BlogStep, LearningMode } from "@/learning/platform/types";
import { SecurityAndNotes } from "./SecurityAndNotes";
import { useScrollySteps } from "./useScrollySteps";
import { ModeSwitch } from "./ModeSwitch";

const LAYER_TABS = [
  { id: "story", label: "Story", engineer: false },
  { id: "engineer", label: "Engineer", engineer: true },
] as const;

/**
 * One step's reading layers for the blog reader. Story is the default layer;
 * the engineer layer is mounted only on demand (Story/Both) or exclusively in
 * Engineer mode. Both mode never renders two full-height columns.
 */
function StepLayers({
  step,
  mode,
  idPrefix,
}: {
  step: BlogStep;
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
        <LayoutGroup id={`blog-layer-${idPrefix}`}>
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
                      layoutId={`blog-layer-pill-${idPrefix}`}
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
          aria-controls={`blog-layers-${idPrefix}`}
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

      <div id={`blog-layers-${idPrefix}`} className="mt-5 grid min-h-[260px] content-start gap-4">
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

export function BlogReader({ post }: { post: BlogPost }) {
  const { activeStep, sectionRefs, goToStep, holdStep } = useScrollySteps(post.steps.length);

  const hydrate = useLearnerPlatformStore((s) => s.hydrate);
  const hydrated = useLearnerPlatformStore((s) => s.hydrated);
  const resume = useLearnerPlatformStore((s) => s.resume);
  const visitTopic = useLearnerPlatformStore((s) => s.visitTopic);
  const markBlogRead = useLearnerPlatformStore((s) => s.markBlogRead);
  const setResume = useLearnerPlatformStore((s) => s.setResume);
  const mode = useLearnerPlatformStore((s) => s.prefs.mode);
  const setMode = useLearnerPlatformStore((s) => s.setMode);
  const reduce = useReducedMotion();
  const resumeAppliedRef = useRef(false);
  const [resumeReady, setResumeReady] = useState(false);

  useEffect(() => {
    hydrate();
    visitTopic(post.id);
  }, [hydrate, visitTopic, post.id]);

  useEffect(() => {
    if (!hydrated || resumeAppliedRef.current) return;
    resumeAppliedRef.current = true;
    const savedStep =
      resume?.kind === "blog" && resume.id === post.id
        ? Math.max(0, Math.min(post.steps.length - 1, resume.stepIndex))
        : 0;
    const frame = window.requestAnimationFrame(() => {
      if (savedStep > 0) goToStep(savedStep);
      setResumeReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hydrated, resume, post.id, post.steps.length, goToStep]);

  useEffect(() => {
    if (!hydrated || !resumeReady) return;
    setResume({ kind: "blog", id: post.id, stepIndex: activeStep });
  }, [setResume, hydrated, resumeReady, post.id, activeStep]);

  useEffect(() => {
    if (hydrated && resumeReady && activeStep >= post.steps.length - 1) {
      markBlogRead(post.id);
    }
  }, [hydrated, resumeReady, activeStep, post.id, post.steps.length, markBlogRead]);

  const step = post.steps[activeStep] ?? post.steps[0];
  const related = post.relatedLessonIds
    .map((id) => getLessonById(id))
    .filter((lesson): lesson is NonNullable<typeof lesson> => Boolean(lesson));

  return (
    <main className="mx-auto w-full max-w-7xl px-5 pb-24 pt-10 sm:px-8">
      <nav className="flex flex-wrap items-center gap-2 text-[12px] text-content-tertiary" aria-label="Breadcrumb">
        <Link href="/blogs" className="transition-colors hover:text-content">Field notes</Link>
        <span aria-hidden="true">/</span>
        <span>{post.title}</span>
      </nav>

      <header className="mt-6 max-w-3xl">
        <div className="flex items-center gap-2 text-[12px] text-content-tertiary">
          <Clock size={13} /> {post.minutes} min read
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-content sm:text-4xl">{post.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-content-secondary" data-cursor="read">{post.dek}</p>

        <div className="mt-7">
          <ModeSwitch
            mode={mode}
            onChange={(nextMode) => {
              holdStep();
              setMode(nextMode);
            }}
          />
        </div>
      </header>

      <div className="mt-10 grid grid-cols-12 gap-6 lg:gap-10">
        <aside className="order-1 col-span-12 lg:order-2 lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <figure className="overflow-hidden rounded-2xl border border-line bg-app-raised shadow-card">
              <div className="aspect-video min-h-[280px] w-full">
                <TopicVisual visualId={step?.visualId ?? "traffic-flow"} stepIndex={activeStep} />
              </div>
              <figcaption className="flex items-start justify-between gap-3 border-t border-line px-5 py-3">
                <span className="text-[12px] leading-relaxed text-content-tertiary">
                  {step?.visualCaption ?? "Follow the highlighted stage as you scroll."}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-brass">
                  {String(activeStep + 1).padStart(2, "0")} / {String(post.steps.length).padStart(2, "0")}
                </span>
              </figcaption>
            </figure>
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
            <ol className="flex flex-1 flex-wrap items-center justify-center gap-1.5" aria-label="Article steps">
              {post.steps.map((entry, index) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => goToStep(index)}
                    aria-label={`Go to step ${index + 1}: ${entry.title}`}
                    aria-current={index === activeStep ? "step" : undefined}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      index === activeStep ? "w-8 bg-brass" : "w-2.5 bg-line-strong hover:w-5 hover:bg-content-tertiary"
                    }`}
                  />
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => goToStep(activeStep + 1)}
              disabled={activeStep === post.steps.length - 1}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-[12px] text-content-secondary transition-colors hover:border-brass/40 hover:text-content disabled:opacity-40"
            >
              Next <ArrowRight size={14} />
            </button>
          </nav>

          {post.steps.map((entry, index) => (
            <section
              key={entry.id}
              id={`step-${index}`}
              data-step-index={index}
              ref={(element) => {
                sectionRefs.current[index] = element;
              }}
              className="min-h-[70vh] scroll-mt-24 border-b border-line/60 py-12"
              aria-labelledby={`post-step-title-${index}`}
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
                <h2 id={`post-step-title-${index}`} className="mt-3 text-2xl font-semibold tracking-tight text-content">
                  {entry.title}
                </h2>
                <StepLayers
                  step={entry}
                  mode={mode}
                  idPrefix={`${post.id}-${entry.id}`}
                />
              </motion.div>
            </section>
          ))}

          {related.length > 0 ? (
            <section className="py-8" aria-labelledby="related-heading">
              <h2 id="related-heading" className="text-[13px] font-semibold text-content">Go deeper in the paths</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {related.map((lesson) => (
                  <li key={lesson.id}>
                    <Link
                      href={`/paths/${lesson.trackId}/${lesson.slug}`}
                      className="inline-flex rounded-full border border-line px-3 py-1.5 text-[12px] text-content-secondary transition-colors hover:border-brass/40 hover:text-content"
                    >
                      {lesson.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="py-4">
            <Link href="/quiz" className="text-[12px] text-brass hover:underline">
              Review what you have read →
            </Link>
          </div>
        </div>
      </div>

      <SecurityAndNotes
        items={post.securityTakeaways}
        topicId={post.id}
        kind="blog"
        completeLabel="Mark as read"
      />
    </main>
  );
}

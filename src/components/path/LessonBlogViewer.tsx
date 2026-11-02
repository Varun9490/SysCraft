'use client';

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  PlayCircle,
  Pause,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from "@/components/ui/icons";
import { Markdown } from "@/components/Markdown";
import { getBlueprint } from "@/data/blueprints";
import { canvasHrefWithAdd } from "@/store/canvasDeepLink";
import { flushPendingCanvasWrite } from "@/store/canvasPersistence";
import { useCanvasStore } from "@/store/useCanvasStore";
import { evaluateLessonSandbox } from "@/data/lessonBlogs";
import type { LessonBlog } from "@/data/lessonBlogs";

interface Props {
  blog: LessonBlog;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  completed?: boolean;
  onToggleComplete?: () => void;
  onMarkComplete?: () => void;
}

const TONE_DOT: Record<LessonBlog["diagramFlow"][number]["tone"], string> = {
  emerald: "bg-emerald-400",
  sky: "bg-sky-400",
  amber: "bg-amber-400",
  violet: "bg-violet-400",
  rose: "bg-rose-400",
};

const TONE_RING: Record<LessonBlog["diagramFlow"][number]["tone"], string> = {
  emerald: "border-emerald-400/60 bg-emerald-500/10 text-emerald-200",
  sky: "border-sky-400/60 bg-sky-500/10 text-sky-200",
  amber: "border-amber-400/60 bg-amber-500/10 text-amber-200",
  violet: "border-violet-400/60 bg-violet-500/10 text-violet-200",
  rose: "border-rose-400/60 bg-rose-500/10 text-rose-200",
};

const STATUS_TONE: Record<"healthy" | "warning" | "critical", string> = {
  healthy: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  critical: "border-rose-500/40 bg-rose-500/10 text-rose-300",
};

export function LessonBlogViewer({
  blog,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  completed,
  onToggleComplete,
  onMarkComplete,
}: Props) {
  const router = useRouter();
  const [sliderValue, setSliderValue] = useState(blog.sandbox.defaultValue);
  const [activeStep, setActiveStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [quizChoice, setQuizChoice] = useState<number | null>(null);
  const [quizRevealed, setQuizRevealed] = useState(false);
  const [packetX, setPacketX] = useState(0);

  const trackRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Reset per-lesson interactive state whenever the blog changes.
  useEffect(() => {
    setSliderValue(blog.sandbox.defaultValue);
    setActiveStep(0);
    setAutoPlay(false);
    setStageIndex(0);
    setQuizChoice(null);
    setQuizRevealed(false);
  }, [blog.id, blog.sandbox.defaultValue]);

  const flow = blog.diagramFlow;
  const flowLen = flow.length;

  // Auto-play the request flow.
  useEffect(() => {
    if (!autoPlay || flowLen === 0) return;
    const id = window.setInterval(() => {
      setActiveStep((prev) => (prev + 1) % flowLen);
    }, 1700);
    return () => window.clearInterval(id);
  }, [autoPlay, flowLen]);

  const metric = useMemo(
    () => evaluateLessonSandbox(blog.sandbox, sliderValue),
    [blog.sandbox, sliderValue],
  );

  const quizCorrect = quizChoice !== null && quizChoice === blog.quiz.correctIndex;

  // Auto-mark complete when the learner answers correctly.
  useEffect(() => {
    if (quizRevealed && quizCorrect) {
      onMarkComplete?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizRevealed, quizCorrect]);

  const handleTryOnCanvas = () => {
    if (blog.sandbox.blueprintId) {
      const bp = getBlueprint(blog.sandbox.blueprintId);
      if (bp) {
        useCanvasStore.getState().loadBlueprintTemplate(bp);
        flushPendingCanvasWrite();
        router.push("/canvas");
        return;
      }
    }
    router.push(canvasHrefWithAdd(blog.sandbox.canvasPrimitives));
  };

  const stepForward = () => setActiveStep((prev) => (prev + 1) % flowLen);

  // Measure the active step's button centre so the packet dot travels to the
  // exact node instead of a guessed percentage (which drifted off-track).
  useEffect(() => {
    const measure = () => {
      const container = trackRef.current;
      const btn = stepRefs.current[activeStep];
      if (!container || !btn) return;
      setPacketX(btn.offsetLeft + btn.offsetWidth / 2 - 6);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeStep, flowLen]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-app-raised/40 p-5 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brass/40 bg-brass/10 px-2.5 py-1 text-[11px] font-semibold text-brass">
            Module {blog.moduleNumber}
          </span>
          <span className="text-[12px] text-content-tertiary">{blog.moduleTitle}</span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-line bg-app/60 px-2.5 py-1 text-[11px] tabular-nums text-content-secondary">
            <BookOpen size={11} />
            {blog.readMinutes} min read
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
              Lesson {blog.lessonNumber}
            </p>
            <h2 className="mt-1 text-[20px] font-semibold leading-tight tracking-tight text-content">
              {blog.title}
            </h2>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleComplete}
              aria-pressed={Boolean(completed)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                completed
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                  : "border-line bg-app/60 text-content-secondary hover:border-line-strong hover:text-content"
              }`}
            >
              {completed ? <CheckCircle2 size={13} /> : <span className="inline-block h-3 w-3 rounded-full border border-current" />}
              {completed ? "Completed" : "Mark complete"}
            </button>
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={onPrev}
                disabled={!hasPrev}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-app/60 px-2.5 py-1.5 text-[12px] text-content-secondary transition-colors hover:border-line-strong hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft size={12} />
                Prev
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!hasNext}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-app/60 px-2.5 py-1.5 text-[12px] text-content-secondary transition-colors hover:border-line-strong hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rookie hook */}
      <div className="rounded-2xl border border-brass/30 bg-brass/5 p-5">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-brass" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">
            30-second analogy
          </p>
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-content">{blog.rookieAnalogy}</p>
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
            What you will learn
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {blog.whatYouWillLearn.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-app/60 px-3 py-1 text-[12px] text-content-secondary"
              >
                <CheckCircle2 size={11} className="text-brass" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Animated request flow */}
      <div className="rounded-2xl border border-line bg-app-raised/40 p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
              Watch the data move
            </p>
            <h3 className="mt-1 text-[15px] font-semibold text-content">
              Animated request flow
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={stepForward}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-app/60 px-3 py-1.5 text-[12px] text-content-secondary transition-colors hover:border-line-strong hover:text-content"
            >
              <ChevronRight size={12} />
              Step forward
            </button>
            <button
              type="button"
              onClick={() => setAutoPlay((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                autoPlay
                  ? "border-brass/50 bg-brass/15 text-brass"
                  : "border-line bg-app/60 text-content-secondary hover:border-line-strong hover:text-content"
              }`}
            >
              {autoPlay ? <Pause size={12} /> : <PlayCircle size={12} />}
              {autoPlay ? "Auto-playing" : "Auto-play"}
            </button>
          </div>
        </div>

        {/* Track + packet */}
        <div ref={trackRef} className="relative mt-5 px-2">
          <div className="absolute left-2 right-2 top-5 h-0.5 bg-line" />
          <motion.div
            className="absolute top-[14px] h-3 w-3 rounded-full bg-brass shadow-[0_0_12px_rgba(205,168,106,0.8)]"
            animate={{ x: packetX }}
            transition={{ type: "spring", stiffness: 140, damping: 20 }}
          />
          <div className="relative flex items-start justify-between gap-2">
            {flow.map((step, idx) => {
              const active = idx === activeStep;
              return (
                <button
                  key={idx}
                  ref={(el) => {
                    stepRefs.current[idx] = el;
                  }}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  className="flex w-full flex-col items-center gap-2 text-center"
                >
                  <span
                    className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-[11px] font-bold tabular-nums transition-colors ${
                      active
                        ? "border-brass bg-brass/20 text-brass"
                        : "border-line bg-app text-content-tertiary"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className={`text-[11.5px] font-medium leading-tight ${
                      active ? "text-content" : "text-content-secondary"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-[10px] leading-tight text-content-tertiary">{step.subtitle}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active detail */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className={`mt-5 rounded-xl border p-4 ${TONE_RING[flow[activeStep]?.tone ?? "sky"]}`}
          >
            <p className="text-[13px] font-semibold">{flow[activeStep]?.label}</p>
            <p className="mt-1 text-[12px] opacity-90">{flow[activeStep]?.subtitle}</p>
            <p className="mt-2 text-[13px] leading-relaxed">{flow[activeStep]?.detail}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 3-stage progression */}
      <div className="rounded-2xl border border-line bg-app-raised/40 p-5 shadow-card">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
          From scratch to enterprise
        </p>
        <h3 className="mt-1 text-[15px] font-semibold text-content">
          Three stages of the same idea
        </h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {blog.steps.map((step, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setStageIndex(idx)}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                stageIndex === idx
                  ? "border-brass/50 bg-brass/15 text-brass"
                  : "border-line bg-app/60 text-content-secondary hover:border-line-strong hover:text-content"
              }`}
            >
              {step.stage}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={stageIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mt-4 rounded-xl border border-line bg-app/60 p-4"
          >
            <h4 className="text-[14px] font-semibold text-content">
              {blog.steps[stageIndex].heading}
            </h4>
            <p className="mt-2 text-[13px] leading-relaxed text-content-secondary">
              {blog.steps[stageIndex].body}
            </p>
            <div className="mt-3 rounded-lg border border-brass/30 bg-brass/5 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">
                Takeaway
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-content">
                {blog.steps[stageIndex].takeaway}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sandbox */}
      <div className="rounded-2xl border border-line bg-app-raised/40 p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
              Try it out
            </p>
            <h3 className="mt-1 text-[15px] font-semibold text-content">
              {blog.sandbox.title}
            </h3>
          </div>
          <SlidersHorizontal size={16} className="text-content-tertiary" />
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-content-secondary">
          {blog.sandbox.prompt}
        </p>

        <div className="mt-4 rounded-xl border border-line bg-app/60 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <label className="text-[12.5px] font-medium text-content">
              {blog.sandbox.sliderLabel}
            </label>
            <span className="font-mono text-[12px] text-brass">
              {sliderValue.toLocaleString()} {blog.sandbox.unit}
            </span>
          </div>
          <input
            type="range"
            min={blog.sandbox.min}
            max={blog.sandbox.max}
            step={blog.sandbox.step}
            value={sliderValue}
            aria-label={blog.sandbox.sliderLabel}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line-strong"
            style={{ accentColor: "rgb(var(--accent))" }}
          />
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-content-tertiary">
            <span>{blog.sandbox.min.toLocaleString()}</span>
            <span>{blog.sandbox.max.toLocaleString()}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-app/60 p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-content-tertiary">
              {metric.primaryMetricLabel}
            </p>
            <p className="mt-1 font-mono text-[18px] font-semibold text-content">
              {metric.primaryMetricValue}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-app/60 p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-content-tertiary">
              {metric.secondaryMetricLabel}
            </p>
            <p className="mt-1 font-mono text-[18px] font-semibold text-content">
              {metric.secondaryMetricValue}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold capitalize ${STATUS_TONE[metric.status]}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {metric.status}
          </span>
          <p className="text-[12.5px] leading-relaxed text-content-secondary">
            {metric.explanation}
          </p>
        </div>

        <button
          type="button"
          onClick={handleTryOnCanvas}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-brass px-4 py-2 text-[12.5px] font-semibold text-ink transition-transform hover:scale-[1.02]"
        >
          Try this lesson on the canvas
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Case study */}
      <div className="rounded-2xl border border-line bg-app-raised/40 p-5 shadow-card">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
          Real-world case study
        </p>
        <h3 className="mt-1 text-[15px] font-semibold text-content">
          {blog.realWorldCaseStudy.company}
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-content-secondary">
          {blog.realWorldCaseStudy.story}
        </p>
        <div className="mt-3 rounded-lg border border-line bg-app/60 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">
            Key metric
          </p>
          <p className="mt-1 text-[12.5px] text-content">
            {blog.realWorldCaseStudy.keyMetric}
          </p>
        </div>
      </div>

      {/* Quiz */}
      <div className="rounded-2xl border border-line bg-app-raised/40 p-5 shadow-card">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
          Quick check
        </p>
        <h3 className="mt-1 text-[14px] font-semibold text-content">
          {blog.quiz.question}
        </h3>
        <div className="mt-3 flex flex-col gap-2">
          {blog.quiz.options.map((opt, idx) => {
            const chosen = quizChoice === idx;
            const correct = idx === blog.quiz.correctIndex;
            let cls =
              "border-line bg-app/60 text-content-secondary hover:border-line-strong hover:text-content";
            if (quizRevealed) {
              if (correct) cls = "border-emerald-500/50 bg-emerald-500/10 text-emerald-200";
              else if (chosen) cls = "border-rose-500/50 bg-rose-500/10 text-rose-200";
              else cls = "border-line bg-app/40 text-content-tertiary";
            } else if (chosen) {
              cls = "border-brass/50 bg-brass/10 text-content";
            }
            return (
              <button
                key={idx}
                type="button"
                disabled={quizRevealed}
                onClick={() => {
                  setQuizChoice(idx);
                  setQuizRevealed(true);
                }}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left text-[13px] transition-colors ${cls}`}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-bold tabular-nums">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1">{opt}</span>
                {quizRevealed && correct && <CheckCircle2 size={15} className="shrink-0 text-emerald-300" />}
              </button>
            );
          })}
        </div>

        {quizRevealed && (
          <div
            className={`mt-3 rounded-xl border px-4 py-3 text-[13px] leading-relaxed ${
              quizCorrect
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/40 bg-rose-500/10 text-rose-200"
            }`}
          >
            <p className="font-semibold">
              {quizCorrect ? "Correct!" : "Not quite — here's why:"}
            </p>
            <p className="mt-1">{blog.quiz.explanation}</p>
            {!quizCorrect && (
              <button
                type="button"
                onClick={() => {
                  setQuizChoice(null);
                  setQuizRevealed(false);
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium underline"
              >
                <RotateCcw size={12} />
                Try again
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-app/60 px-4 py-2 text-[12.5px] text-content-secondary transition-colors hover:border-line-strong hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft size={13} />
          Previous lesson
        </button>
        <Link
          href="/learn"
          className="text-[12px] text-content-tertiary hover:text-content"
        >
          Back to path
        </Link>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          className="inline-flex items-center gap-2 rounded-full bg-brass px-4 py-2 text-[12.5px] font-semibold text-ink transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next lesson
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

export default LessonBlogViewer;

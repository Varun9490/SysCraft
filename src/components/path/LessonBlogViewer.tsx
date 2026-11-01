'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Pause,
  PlayCircle,
  RotateCcw,
} from "@/components/ui/icons";
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

const STAGE_LABELS = ["From scratch", "What breaks", "In production"];

const STATUS_WORD: Record<"healthy" | "warning" | "critical", string> = {
  healthy: "fine",
  warning: "watch this",
  critical: "this breaks",
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
  const [quizChoice, setQuizChoice] = useState<number | null>(null);
  const [quizRevealed, setQuizRevealed] = useState(false);

  useEffect(() => {
    setSliderValue(blog.sandbox.defaultValue);
    setActiveStep(0);
    setAutoPlay(false);
    setQuizChoice(null);
    setQuizRevealed(false);
  }, [blog.id, blog.sandbox.defaultValue]);

  const flow = blog.diagramFlow;
  const flowLen = flow.length;

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

  const stepForward = () => setActiveStep((prev) => (prev + 1) % Math.max(1, flowLen));

  const dotTop = flowLen > 1 ? (activeStep / (flowLen - 1)) * 100 : 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[12px] text-content-tertiary">
            Module {blog.moduleNumber} · {blog.moduleTitle}
          </p>
          <p className="text-[12px] tabular-nums text-content-tertiary">
            {blog.readMinutes} min read
          </p>
        </div>
        <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-content">
          {blog.title}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onToggleComplete}
            aria-pressed={Boolean(completed)}
            className="text-[12px] text-content-secondary transition-colors hover:text-content"
          >
            {completed ? "Completed" : "Mark complete"}
            {completed ? " ✓" : ""}
          </button>
          <div className="flex items-center gap-3 text-[12px] text-content-tertiary">
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              className="transition-colors hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              className="transition-colors hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Analogy */}
      <section className="border-t border-line pt-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-content-tertiary">
          Analogy
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-content">{blog.rookieAnalogy}</p>
        {blog.whatYouWillLearn.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 text-[13px] leading-relaxed text-content-secondary">
            {blog.whatYouWillLearn.map((item, idx) => (
              <li key={idx}>- {item}</li>
            ))}
          </ul>
        )}
      </section>

      {/* Diagram */}
      <section className="border-t border-line pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-content-tertiary">
            Request flow
          </p>
          <div className="flex items-center gap-3 text-[12px] text-content-tertiary">
            <button
              type="button"
              onClick={stepForward}
              className="transition-colors hover:text-content"
            >
              Step forward
            </button>
            <button
              type="button"
              onClick={() => setAutoPlay((v) => !v)}
              className="transition-colors hover:text-content"
            >
              {autoPlay ? "Pause" : "Auto-play"}
            </button>
          </div>
        </div>

        <div className="relative mt-4 pl-6">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-line" />
          <div
            className="absolute left-[5px] h-2.5 w-2.5 rounded-full bg-brass transition-all duration-200"
            style={{ top: `${dotTop}%`, transform: "translateY(-50%)" }}
          />
          <div className="flex flex-col">
            {flow.map((step, idx) => {
              const active = idx === activeStep;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  className={`flex w-full items-baseline gap-3 py-2 text-left transition-colors ${
                    active ? "text-content" : "text-content-secondary hover:text-content"
                  }`}
                >
                  <span className="w-6 shrink-0 tabular-nums text-[11px] text-content-tertiary">
                    {idx + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium leading-snug">{step.label}</span>
                    <span className="block text-[11px] leading-snug text-content-tertiary">
                      {step.subtitle}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {flow[activeStep] && (
          <div className="mt-4 border-l-2 border-line pl-4">
            <p className="text-[13px] font-medium text-content">{flow[activeStep].label}</p>
            <p className="text-[12px] text-content-tertiary">{flow[activeStep].subtitle}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-content-secondary">
              {flow[activeStep].detail}
            </p>
          </div>
        )}
      </section>

      {/* 3 stages */}
      <section className="border-t border-line pt-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-content-tertiary">
          Three stages
        </p>
        <div className="mt-4 flex flex-col gap-6">
          {blog.steps.map((step, idx) => (
            <div key={idx} className="border-t border-line/60 pt-4 first:border-t-0 first:pt-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-content-tertiary">
                {STAGE_LABELS[idx]}
              </p>
              <h3 className="mt-1 text-[15px] font-semibold text-content">{step.heading}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-content-secondary">{step.body}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-content">
                <span className="text-content-tertiary">Takeaway: </span>
                {step.takeaway}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Sandbox */}
      <section className="border-t border-line pt-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-content-tertiary">
          Try it
        </p>
        <h3 className="mt-1 text-[15px] font-semibold text-content">{blog.sandbox.title}</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-content-secondary">{blog.sandbox.prompt}</p>

        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2">
            <label className="text-[12.5px] font-medium text-content">{blog.sandbox.sliderLabel}</label>
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
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="border border-line bg-app/40 p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-content-tertiary">
              {metric.primaryMetricLabel}
            </p>
            <p className="mt-1 font-mono text-[16px] font-semibold text-content">
              {metric.primaryMetricValue}
            </p>
          </div>
          <div className="border border-line bg-app/40 p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-content-tertiary">
              {metric.secondaryMetricLabel}
            </p>
            <p className="mt-1 font-mono text-[16px] font-semibold text-content">
              {metric.secondaryMetricValue}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-baseline gap-3">
          <span className="text-[12px] font-semibold text-content">
            {STATUS_WORD[metric.status]}
          </span>
          <p className="text-[12.5px] leading-relaxed text-content-secondary">{metric.explanation}</p>
        </div>

        <button
          type="button"
          onClick={handleTryOnCanvas}
          className="mt-4 text-[12.5px] font-medium text-brass transition-colors hover:text-brass-bright"
        >
          Try this lesson on the canvas →
        </button>
      </section>

      {/* Case study */}
      <section className="border-t border-line pt-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-content-tertiary">
          Case study
        </p>
        <h3 className="mt-1 text-[15px] font-semibold text-content">
          {blog.realWorldCaseStudy.company}
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-content-secondary">
          {blog.realWorldCaseStudy.story}
        </p>
        <p className="mt-2 text-[12px] text-content">
          <span className="text-content-tertiary">Key metric: </span>
          {blog.realWorldCaseStudy.keyMetric}
        </p>
      </section>

      {/* Quiz */}
      <section className="border-t border-line pt-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-content-tertiary">
          Quick check
        </p>
        <h3 className="mt-1 text-[14px] font-semibold text-content">{blog.quiz.question}</h3>
        <div className="mt-3 flex flex-col gap-2">
          {blog.quiz.options.map((opt, idx) => {
            const chosen = quizChoice === idx;
            const correct = idx === blog.quiz.correctIndex;
            let cls = "border-line text-content-secondary hover:border-line-strong hover:text-content";
            if (quizRevealed) {
              if (correct) cls = "border-success/60 text-success";
              else if (chosen) cls = "border-danger/60 text-danger";
              else cls = "border-line text-content-tertiary";
            } else if (chosen) {
              cls = "border-brass/60 text-content";
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
                className={`flex items-start gap-3 border px-3 py-2 text-left text-[13px] transition-colors ${cls}`}
              >
                <span className="shrink-0 text-content-tertiary">{String.fromCharCode(65 + idx)}.</span>
                <span className="flex-1">{opt}</span>
              </button>
            );
          })}
        </div>

        {quizRevealed && (
          <div className="mt-3 border-l-2 border-line pl-4 text-[13px] leading-relaxed text-content-secondary">
            <p className="font-medium text-content">
              {quizCorrect ? "Correct" : "Not quite"}
            </p>
            <p className="mt-1">{blog.quiz.explanation}</p>
            {!quizCorrect && (
              <button
                type="button"
                onClick={() => {
                  setQuizChoice(null);
                  setQuizRevealed(false);
                }}
                className="mt-2 text-[12px] text-content-tertiary transition-colors hover:text-content"
              >
                Try again
              </button>
            )}
          </div>
        )}
      </section>

      {/* Footer nav */}
      <div className="flex items-center justify-between gap-2 border-t border-line pt-4 text-[12.5px]">
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          className="text-content-secondary transition-colors hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Previous lesson
        </button>
        <Link href="/learn" className="text-content-tertiary transition-colors hover:text-content">
          Back to path
        </Link>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          className="text-content-secondary transition-colors hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next lesson →
        </button>
      </div>
    </div>
  );
}

export default LessonBlogViewer;

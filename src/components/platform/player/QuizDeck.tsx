'use client';

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Clock, RefreshCw, ShieldCheck } from "@/components/ui/icons";
import { findQuizBank } from "@/content/platform/registry";
import {
  createQuizSessionSeed,
  selectRecallQuestions,
  shuffleQuizChoices,
} from "@/learning/platform/quizSelect";
import type { QuizQuestion } from "@/learning/platform/types";
import { useLearnerPlatformStore } from "@/store/useLearnerPlatformStore";

const DECK_SIZE = 6;

/** Builds one session from shared eligibility, FSRS ranking, and choice order. */
function buildDeck(sessionSeed: number): QuizQuestion[] {
  const state = useLearnerPlatformStore.getState();
  const bank = findQuizBank(state);
  return selectRecallQuestions(state, bank, DECK_SIZE, Date.now(), sessionSeed)
    .map((question) => shuffleQuizChoices(question, sessionSeed));
}

/**
 * Mounted only after hydration. The deck is initialized in state on mount (and
 * whenever the eligible progress set changes via the parent's key), so there is
 * no need to synchronize state from inside an effect.
 */
function QuizDeckReady() {
  const recordAnswer = useLearnerPlatformStore((s) => s.recordAnswer);
  // These copies own the displayed choice order for the whole session; the
  // authored registry questions remain untouched.
  const [deck, setDeck] = useState<QuizQuestion[]>(() => buildDeck(createQuizSessionSeed()));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const rebuild = useCallback(() => {
    setDeck(buildDeck(createQuizSessionSeed()));
    setIndex(0);
    setPicked(null);
    setFinished(false);
  }, []);

  const question = deck[index];
  const answered = picked !== null;
  const correct = answered && picked === question?.answerIndex;

  const choose = (choiceIndex: number) => {
    if (!question || answered) return;
    setPicked(choiceIndex);
    recordAnswer(question, choiceIndex === question.answerIndex);
  };

  const next = () => {
    if (index === deck.length - 1) {
      setFinished(true);
      setPicked(null);
      return;
    }
    setIndex((current) => current + 1);
    setPicked(null);
  };

  if (deck.length === 0) {
    return (
      <section className="mt-10 rounded-2xl border border-line bg-app-raised p-8 shadow-card" data-cursor="read">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-brass/40 bg-brass/10 text-brass">
          <ShieldCheck size={20} />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-content">Nothing to review yet</h2>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-content-secondary">
          Start an 8-minute lesson, then come back — the quiz only uses what you have already read.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/paths/foundations/single-server"
            className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2.5 text-[13px] font-semibold text-ink hover:opacity-90"
          >
            Start the single-server lesson <ArrowRight size={15} />
          </Link>
          <Link href="/paths" className="rounded-xl border border-line px-4 py-2.5 text-[13px] text-content-secondary hover:border-brass/40 hover:text-content">
            Browse all paths
          </Link>
        </div>
      </section>
    );
  }

  if (finished || !question) {
    return (
      <section className="mt-10 rounded-2xl border border-line bg-app-raised p-8 shadow-card" data-cursor="read">
        <h2 className="text-xl font-semibold text-content">Set complete</h2>
        <p className="mt-3 text-[14px] leading-relaxed text-content-secondary">
          You worked through {deck.length} questions from what you have read. Read another lesson and a fresh set will
          be ready here.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={rebuild}
            className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-[13px] text-content-secondary hover:border-brass/40 hover:text-content"
          >
            <RefreshCw size={14} /> Choose another set
          </button>
          <Link href="/paths" className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2.5 text-[13px] font-semibold text-ink hover:opacity-90">
            Read another lesson <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      data-quiz-active={!answered ? "true" : undefined}
      className="mt-10 rounded-2xl border border-line bg-app-raised p-6 shadow-card sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-content-tertiary">
        <span className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.16em]">
          <Clock size={13} /> {question.kind.replace("-", " ")}
        </span>
        <span className="font-mono">
          {index + 1} / {deck.length}
        </span>
      </div>

      <h2 className="mt-5 text-lg font-semibold leading-relaxed text-content sm:text-xl" data-cursor="read">
        {question.prompt}
      </h2>

      <div className="mt-6 grid gap-3">
        {question.choices.map((choice, choiceIndex) => {
          const isAnswer = choiceIndex === question.answerIndex;
          const isPicked = choiceIndex === picked;
          let tone = "border-line bg-app text-content-secondary hover:border-brass/40 hover:text-content";
          if (answered && isAnswer) tone = "border-emerald-400/60 bg-emerald-400/10 text-emerald-200";
          else if (answered && isPicked) tone = "border-rose-400/50 bg-rose-400/10 text-rose-200";
          else if (answered) tone = "border-line bg-app text-content-tertiary";
          return (
            <button
              key={`${question.id}-${choiceIndex}`}
              type="button"
              onClick={() => choose(choiceIndex)}
              disabled={answered}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left text-[13px] leading-relaxed transition-colors ${tone}`}
            >
              <span className="font-mono text-[11px] text-content-tertiary">{String.fromCharCode(65 + choiceIndex)}</span>
              <span>{choice}</span>
            </button>
          );
        })}
      </div>

      {answered ? (
        <div className="mt-6 rounded-xl border border-line bg-app p-5">
          <p className={`flex items-center gap-2 text-[13px] font-semibold ${correct ? "text-emerald-300" : "text-amber-300"}`}>
            {correct ? <CheckCircle2 size={16} /> : null}
            {correct ? "Locked in" : "Not yet — here is the idea"}
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-content-secondary" data-cursor="read">
            {question.explanation}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] text-content-tertiary">Saved to your local review schedule.</span>
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2 text-[13px] font-semibold text-ink hover:opacity-90"
            >
              {index === deck.length - 1 ? "Finish set" : "Next question"} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function QuizDeck() {
  const hydrated = useLearnerPlatformStore((s) => s.hydrated);
  const hydrate = useLearnerPlatformStore((s) => s.hydrate);
  const completedLessons = useLearnerPlatformStore((s) => s.completedLessons);
  const readBlogs = useLearnerPlatformStore((s) => s.readBlogs);
  const visitedTopics = useLearnerPlatformStore((s) => s.visitedTopics);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Changing the eligible progress set remounts the deck with a freshly built
  // set, matching the previous rebuild-on-progress-change behaviour.
  const progressKey = [
    completedLessons.join("\u0000"),
    readBlogs.join("\u0000"),
    visitedTopics.join("\u0000"),
  ].join("\u0001");

  return (
    <main className="mx-auto w-full max-w-4xl px-5 pb-24 pt-12 sm:px-8">
      <header className="max-w-3xl" data-cursor="read">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Recall practice</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-content sm:text-4xl">Quiz</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-content-secondary">
          Questions come only from lessons and field notes you have already read in this browser. Missed ideas come back
          sooner; nothing is scored or shamed.
        </p>
      </header>

      {!hydrated ? (
        <div className="mt-10 rounded-2xl border border-line bg-app-raised p-8 text-[13px] text-content-secondary">
          Loading your local progress…
        </div>
      ) : (
        <QuizDeckReady key={progressKey} />
      )}

      <div className="mt-10 flex flex-wrap gap-4 text-[12px]">
        <Link href="/paths" className="text-content-secondary hover:text-brass">Keep reading →</Link>
        <Link href="/map" className="text-content-secondary hover:text-brass">See the knowledge map →</Link>
      </div>
    </main>
  );
}

'use client';

import { useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "@/components/ui/icons";
import type { QuizQuestion } from "@/types/encyclopedia";
import type { FsrsRating } from "@/engine/fsrsScheduler";
import { useLearningStore } from "@/store/useLearningStore";

/**
 * Scenario-based quiz widget with FSRS rating buttons.
 * Answering reveals the explanation; the Again/Hard/Good/Easy grade feeds
 * the same spaced-repetition scheduler as the flashcard deck, so quiz
 * performance directly shapes future review timing.
 */

interface ContextualQuizCardProps {
  question: QuizQuestion;
  onAnswered?: (correct: boolean) => void;
}

const GRADES: Array<{ rating: FsrsRating; label: string; hint: string }> = [
  { rating: 1, label: "Again", hint: "forgot" },
  { rating: 2, label: "Hard", hint: "unsure" },
  { rating: 3, label: "Good", hint: "recalled" },
  { rating: 4, label: "Easy", hint: "trivial" },
];

export function ContextualQuizCard({ question, onAnswered }: ContextualQuizCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [graded, setGraded] = useState<string | null>(null);
  const review = useLearningStore((s) => s.review);
  const ensureCard = useLearningStore((s) => s.ensureCard);

  const cardId = useMemo(() => `quiz-${question.id}`, [question.id]);
  const revealed = selectedId !== null;
  const correctOption = question.options.find((o) => o.correct);
  const wasCorrect = selectedId !== null && selectedId === correctOption?.id;

  const choose = (optionId: string) => {
    if (revealed) return;
    setSelectedId(optionId);
    ensureCard(cardId, question.conceptTag || "general");
    onAnswered?.(optionId === correctOption?.id);
  };

  const grade = (rating: FsrsRating) => {
    review(cardId, rating);
    const labels: Record<FsrsRating, string> = { 1: "Again", 2: "Hard", 3: "Good", 4: "Easy" };
    setGraded(labels[rating]);
  };

  const reset = () => {
    setSelectedId(null);
    setGraded(null);
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
      <p className="mb-2 text-sm font-medium leading-relaxed text-zinc-100">{question.prompt}</p>
      <div className="space-y-1.5">
        {question.options.map((option) => {
          const isSelected = selectedId === option.id;
          const showCorrect = revealed && option.correct;
          const showWrong = revealed && isSelected && !option.correct;
          return (
            <button
              key={option.id}
              onClick={() => choose(option.id)}
              disabled={revealed}
              className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors ${
                showCorrect
                  ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-100"
                  : showWrong
                    ? "border-red-400/70 bg-red-500/10 text-red-100"
                    : isSelected
                      ? "border-sky-400/70 bg-sky-500/10 text-zinc-100"
                      : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800"
              } ${revealed ? "cursor-default" : "cursor-pointer"}`}
            >
              {showCorrect && <CheckCircle2 size={14} className="shrink-0" />}
              {showWrong && <XCircle size={14} className="shrink-0" />}
              <span>{option.text}</span>
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="mt-2 rounded-md bg-zinc-950 p-2.5">
          <p className={`text-xs font-semibold ${wasCorrect ? "text-emerald-300" : "text-amber-300"}`}>
            {wasCorrect ? "Correct." : `Not quite — answer: ${correctOption?.text ?? "see explanation"}.`}
          </p>
          {question.explanation && (
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">{question.explanation}</p>
          )}
          <div className="mt-2 flex items-center gap-1.5">
            <span className="mr-1 text-[11px] text-zinc-500">Grade recall:</span>
            {GRADES.map((g) => (
              <button
                key={g.rating}
                onClick={() => grade(g.rating)}
                title={g.hint}
                className="rounded border border-zinc-700 px-2 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                {g.label}
              </button>
            ))}
            {graded && <span className="ml-1 text-[11px] text-sky-300">Logged “{graded}” — deck rescheduled.</span>}
            <button
              onClick={reset}
              className="ml-auto flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-800"
            >
              <RotateCcw size={11} /> Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

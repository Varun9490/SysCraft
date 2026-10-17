'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Clock, Play, Sparkles, Trophy, X } from '@/components/ui/icons';
import {
  PLAY_BY_KIND,
  PLAY_MODES,
  dailyPuzzle,
  dailyPuzzleIndex,
  scoreEstimate,
  type PlayMode,
  type PlayQuestion,
  type PlayQuestionKind,
} from '@/data/playContent';
import { loadPlayScores, recordPlayScore, type PlayScoreRecord } from '@/engine/practiceStats';

/**
 * Play layer: nine deterministic modes over one question engine.
 *
 * Four modes run fully in-browser here (Estimate Sprint, Pattern Match,
 * Debug the Outage, Bottleneck Hunt) plus the UTC-seeded Daily Puzzle. The
 * simulation-heavy modes deep-link into the lab/canvas workspaces where the
 * seeded Web Worker engine lives. Personal bests persist locally per mode.
 */

interface AnswerOutcome {
  questionId: string;
  value: string;
  points: number;
}

function questionsForMode(mode: PlayMode): PlayQuestion[] {
  if (mode.id === 'daily-puzzle') return [dailyPuzzle()];
  if (mode.kind === 'link') return [];
  return PLAY_BY_KIND[mode.kind as PlayQuestionKind] ?? [];
}

function isMultipleChoice(question: PlayQuestion): boolean {
  return Array.isArray(question.options) && question.options.length > 0;
}

export function PlayArena() {
  const [activeModeId, setActiveModeId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [guess, setGuess] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [outcomes, setOutcomes] = useState<AnswerOutcome[]>([]);
  const [finished, setFinished] = useState(false);
  const [bestScores, setBestScores] = useState<Record<string, PlayScoreRecord>>({});

  useEffect(() => {
    setBestScores(loadPlayScores());
  }, []);

  const activeMode = useMemo(() => PLAY_MODES.find((m) => m.id === activeModeId) ?? null, [activeModeId]);
  const questions = useMemo(() => (activeMode ? questionsForMode(activeMode) : []), [activeMode]);
  const question = questions[index];

  const score = useMemo(() => {
    if (outcomes.length === 0) return 0;
    const total = outcomes.reduce((sum, outcome) => sum + outcome.points, 0);
    return Math.round(total / outcomes.length);
  }, [outcomes]);

  const startMode = (mode: PlayMode) => {
    setActiveModeId(mode.id);
    setIndex(0);
    setChosen(null);
    setGuess('');
    setRevealed(false);
    setOutcomes([]);
    setFinished(false);
  };

  const submit = () => {
    if (!question || revealed) return;
    let points = 0;
    let value = '';
    if (question.kind === 'estimate' && question.numeric) {
      const numericGuess = Number(guess);
      points = scoreEstimate(numericGuess, question.numeric.answer);
      value = guess;
    } else if (isMultipleChoice(question)) {
      const correctId = question.options?.find((o) => o.correct)?.id ?? '';
      points = chosen === correctId ? 100 : 0;
      value = chosen ?? '';
    }
    setOutcomes((prev) => [...prev, { questionId: question.id, value, points }]);
    setRevealed(true);
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      // Session finished — persist the best score.
      const finalScore = Math.round(
        [...outcomes].reduce((sum, outcome) => sum + outcome.points, 0) / Math.max(1, outcomes.length),
      );
      if (activeMode) {
        setBestScores(recordPlayScore(activeMode.id, finalScore));
      }
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setChosen(null);
      setGuess('');
      setRevealed(false);
    }
  };

  const exitMode = () => {
    setActiveModeId(null);
    setFinished(false);
    setOutcomes([]);
  };

  const todayKey = new Date().toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });

  // ── Mode picker ───────────────────────────────────────────────────────────
  if (!activeMode) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {PLAY_MODES.map((mode) => {
            const best = bestScores[mode.id];
            return (
              <article
                key={mode.id}
                className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[15px] font-semibold text-zinc-100">{mode.name}</h3>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-zinc-700 px-2 py-0.5 text-[10.5px] text-zinc-400">
                    <Clock size={10} /> {mode.minutes} min
                  </span>
                </div>
                <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-zinc-400">{mode.tagline}</p>
                <p className="mt-2 text-[11px] uppercase tracking-wider text-zinc-600">Trains: {mode.trains}</p>
                <p className="mt-1 text-[11px] text-zinc-600">{mode.seedNote}</p>
                {best && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] text-amber-300">
                    <Trophy size={11} /> Best {best.bestScore}/100 · {best.plays} play{best.plays === 1 ? '' : 's'}
                  </p>
                )}
                {mode.kind === 'link' ? (
                  <Link
                    href={mode.href ?? '/labs'}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-[12.5px] font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
                  >
                    {mode.hrefLabel ?? 'Open in workspace'} <ArrowRight size={13} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => startMode(mode)}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-[12.5px] font-semibold text-zinc-950 transition-colors hover:bg-sky-400"
                  >
                    <Play size={13} /> {mode.id === 'daily-puzzle' ? `Play today (${todayKey} UTC)` : 'Play now'}
                  </button>
                )}
              </article>
            );
          })}
        </div>
        <p className="text-[12px] leading-relaxed text-zinc-600">
          Every in-browser mode is deterministic: the item bank is fixed and the Daily Puzzle is seeded from the UTC date, so two
          learners solving it see identical questions. Simulation-based modes inherit the seeded Web Worker engine, which is why
          challenge codes can be re-verified by anyone.
        </p>
      </div>
    );
  }

  // ── Result screen ─────────────────────────────────────────────────────────
  if (finished) {
    const best = bestScores[activeMode.id];
    const correct = outcomes.filter((o) => o.points === 100).length;
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 text-center">
        <Trophy size={30} className="mx-auto text-amber-300" />
        <h2 className="mt-3 text-xl font-bold text-zinc-50">{activeMode.name} — session complete</h2>
        <p className="mt-2 text-[14px] text-zinc-300">
          Score <span className="font-semibold text-zinc-100">{score}/100</span> · {correct}/{outcomes.length} exact
          {activeMode.kind === 'estimate' && ' (estimation counts within 3×)'}
        </p>
        {best && (
          <p className="mt-1 text-[12.5px] text-zinc-500">
            Personal best: {best.bestScore}/100 across {best.plays} session{best.plays === 1 ? '' : 's'}
          </p>
        )}
        <div className="mt-5 space-y-2 text-left">
          {outcomes.map((outcome) => {
            const q = questions.find((item) => item.id === outcome.questionId);
            if (!q) return null;
            return (
              <div key={outcome.questionId} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <p className="text-[12.5px] font-medium text-zinc-200">{q.prompt}</p>
                <p className="mt-1 text-[11.5px] text-zinc-500">
                  {q.numeric
                    ? `Answer: ${q.numeric.answer.toLocaleString()} ${q.numeric.unit} · your guess: ${outcome.value || '—'}`
                    : `Correct: ${q.options?.find((o) => o.correct)?.text ?? ''}`}
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-400">{q.explanation}</p>
                {q.conceptId && (
                  <Link href={`/wiki/${q.conceptId}`} className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-violet-300 hover:text-violet-200">
                    Read: {q.conceptId} <ArrowRight size={11} />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => startMode(activeMode)}
            className="rounded-full border border-zinc-700 px-4 py-2 text-[12.5px] text-zinc-300 hover:border-zinc-500"
          >
            Play again
          </button>
          <button
            type="button"
            onClick={exitMode}
            className="rounded-full bg-sky-500 px-4 py-2 text-[12.5px] font-semibold text-zinc-950 hover:bg-sky-400"
          >
            All modes
          </button>
        </div>
      </div>
    );
  }

  if (!question) return null;

  // ── Active question ───────────────────────────────────────────────────────
  const correctOptionId = question.options?.find((o) => o.correct)?.id;
  const wasCorrect = revealed ? outcomes[outcomes.length - 1]?.points === 100 : false;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles size={12} className="text-sky-300" /> {activeMode.name}
          {activeMode.id === 'daily-puzzle' && ` · seeded ${dailyPuzzleIndex()} (UTC)`}
        </span>
        <span>
          {index + 1} / {questions.length}
        </span>
      </div>

      {question.context && (
        <p className="mb-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-zinc-300">
          {question.context}
        </p>
      )}

      <p className="text-[15.5px] font-medium leading-relaxed text-zinc-100">{question.prompt}</p>

      {question.kind === 'estimate' && question.numeric ? (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[11.5px] uppercase tracking-wider text-zinc-500">
            Your estimate ({question.numeric.unit})
            <input
              type="number"
              inputMode="decimal"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              disabled={revealed}
              className="h-10 w-48 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-[14px] text-zinc-100 disabled:opacity-60"
              placeholder="order of magnitude"
            />
          </label>
          {!revealed && (
            <button
              type="button"
              onClick={submit}
              disabled={guess.trim().length === 0}
              className="h-10 rounded-lg bg-sky-500 px-4 text-[13px] font-semibold text-zinc-950 hover:bg-sky-400 disabled:opacity-40"
            >
              Submit estimate
            </button>
          )}
          {revealed && (
            <p className={`text-[13px] font-semibold ${wasCorrect ? 'text-emerald-300' : 'text-amber-300'}`}>
              Actual: {question.numeric.answer.toLocaleString()} {question.numeric.unit}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-1.5">
          {question.options?.map((option) => {
            const isChosen = chosen === option.id;
            const showCorrect = revealed && option.id === correctOptionId;
            const showWrong = revealed && isChosen && option.id !== correctOptionId;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  if (revealed) return;
                  setChosen(option.id);
                }}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[13px] transition-colors ${
                  showCorrect
                    ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-100'
                    : showWrong
                      ? 'border-red-400/70 bg-red-500/10 text-red-100'
                      : isChosen
                        ? 'border-sky-400/70 bg-sky-500/10 text-zinc-100'
                        : 'border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/60'
                }`}
              >
                {showCorrect && <Check size={14} />}
                {showWrong && <X size={14} />}
                {option.text}
              </button>
            );
          })}
          {!revealed && (
            <button
              type="button"
              onClick={submit}
              disabled={!chosen}
              className="mt-2 rounded-lg bg-sky-500 px-4 py-2 text-[13px] font-semibold text-zinc-950 hover:bg-sky-400 disabled:opacity-40"
            >
              Lock answer
            </button>
          )}
        </div>
      )}

      {revealed && (
        <div className="mt-4">
          <p className="rounded-lg bg-zinc-900 px-3 py-2.5 text-[12.5px] leading-relaxed text-zinc-300">
            {question.explanation}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {question.conceptId && (
              <Link
                href={`/wiki/${question.conceptId}`}
                className="rounded-full border border-violet-600/50 px-3 py-1.5 text-[12px] text-violet-300 hover:border-violet-400"
              >
                Read: {question.conceptId}
              </Link>
            )}
            <button
              type="button"
              onClick={next}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-1.5 text-[12.5px] font-semibold text-zinc-950 hover:bg-sky-400"
            >
              {index + 1 >= questions.length ? 'See results' : 'Next'} <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

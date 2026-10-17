'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, RefreshCw, RotateCcw, Sparkles, Trophy, X } from '@/components/ui/icons';
import { ENCYCLOPEDIA_MODULES } from '@/data/encyclopediaData';
import type { EncyclopediaModule } from '@/types/encyclopedia';
import type { FsrsRating } from '@/engine/fsrsScheduler';
import { retrievability } from '@/engine/fsrsScheduler';
import {
  DEFAULT_PRACTICE_SETTINGS,
  loadPracticeHistory,
  loadPracticeSettings,
  recordPracticeSession,
  reviewsToday,
  savePracticeSettings,
  type PracticeSessionRecord,
  type PracticeSettings,
} from '@/engine/practiceStats';
import { useLearningStore } from '@/store/useLearningStore';

/**
 * FSRS review queue runner.
 *
 * Pulls due items from the learning store across all 19 concept modules,
 * enforces a daily cap with quiet overflow (no "overdue" shame), supports a
 * one-click catch-up mode after a break, and records a practice session for
 * the Weekly Rhythm tracker when the queue is finished.
 */

interface ReviewItem {
  cardId: string;
  module: EncyclopediaModule;
  kind: 'quiz' | 'flashcard';
  prompt: string;
  options?: Array<{ id: string; text: string; correct: boolean }>;
  answer: string;
  explanation?: string;
}

const GRADES: Array<{ rating: FsrsRating; label: string; hint: string; tone: string }> = [
  { rating: 1, label: 'Again', hint: 'forgot it', tone: 'border-red-500/50 text-red-300 hover:bg-red-500/10' },
  { rating: 2, label: 'Hard', hint: 'barely', tone: 'border-amber-500/50 text-amber-300 hover:bg-amber-500/10' },
  { rating: 3, label: 'Good', hint: 'solid recall', tone: 'border-sky-500/50 text-sky-300 hover:bg-sky-500/10' },
  { rating: 4, label: 'Easy', hint: 'trivial', tone: 'border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10' },
];

function buildItemIndex(): Map<string, ReviewItem> {
  const index = new Map<string, ReviewItem>();
  for (const module of ENCYCLOPEDIA_MODULES) {
    for (const question of module.quiz) {
      index.set(`quiz-${question.id}`, {
        cardId: `quiz-${question.id}`,
        module,
        kind: 'quiz',
        prompt: question.prompt,
        options: question.options,
        answer: question.options.find((o) => o.correct)?.text ?? '',
        explanation: question.explanation,
      });
    }
    for (const card of module.flashcards) {
      index.set(card.cardId, {
        cardId: card.cardId,
        module,
        kind: 'flashcard',
        prompt: card.front,
        answer: card.back,
      });
    }
  }
  return index;
}

export function PracticeRunner() {
  const cards = useLearningStore((s) => s.cards);
  const cardModule = useLearningStore((s) => s.cardModule);
  const review = useLearningStore((s) => s.review);
  const ensureCard = useLearningStore((s) => s.ensureCard);
  const hydrateFromDb = useLearningStore((s) => s.hydrateFromDb);
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState<PracticeSettings>(DEFAULT_PRACTICE_SETTINGS);
  const [history, setHistory] = useState<PracticeSessionRecord[]>([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionQueue, setSessionQueue] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0, startedAt: 0 });
  const [finished, setFinished] = useState(false);

  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    void (async () => {
      await hydrateFromDb();
      setHydrated(true);
    })();
  }, [hydrateFromDb]);

  useEffect(() => {
    setSettings(loadPracticeSettings());
    setHistory(loadPracticeHistory());
  }, []);

  // Make sure every quiz/flashcard item exists as an FSRS card before the
  // queue is computed (new cards are due immediately).
  useEffect(() => {
    if (!hydrated) return;
    for (const module of ENCYCLOPEDIA_MODULES) {
      for (const question of module.quiz) ensureCard(`quiz-${question.id}`, module.id);
      for (const card of module.flashcards) ensureCard(card.cardId, module.id);
    }
  }, [ensureCard, hydrated]);

  const itemIndex = useMemo(buildItemIndex, []);

  const dueQueue = useMemo(() => {
    const nowMs = today.getTime();
    const due = Object.values(cards)
      .filter((card) => new Date(card.due).getTime() <= nowMs && itemIndex.has(card.cardId))
      .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
    const doneToday = reviewsToday(history, today);
    const budget = settings.catchUpMode
      ? settings.dailyCap * 3
      : Math.max(0, settings.dailyCap - doneToday);
    return due.slice(0, budget);
  }, [cards, itemIndex, history, settings, today]);

  const totalTracked = useMemo(
    () => Object.keys(cards).filter((id) => itemIndex.has(id)).length,
    [cards, itemIndex],
  );

  const upcoming = useMemo(() => {
    const nowMs = today.getTime();
    return Object.values(cards)
      .filter((card) => itemIndex.has(card.cardId) && new Date(card.due).getTime() > nowMs)
      .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())[0];
  }, [cards, itemIndex, today]);

  const current = sessionActive && !finished && sessionQueue[index] ? cards[sessionQueue[index]] : undefined;
  const currentItem = current ? itemIndex.get(current.cardId) : undefined;

  /** All tracked cards as a fallback practice pool (not-yet-due). */
  const extraPool = useMemo(
    () =>
      Object.values(cards)
        .filter((card) => itemIndex.has(card.cardId))
        .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
        .slice(0, settings.dailyCap)
        .map((card) => card.cardId),
    [cards, itemIndex, settings.dailyCap],
  );

  const startSession = (pool?: string[]) => {
    const cardIds = pool ?? dueQueue.map((card) => card.cardId);
    if (cardIds.length === 0) return;
    setSessionQueue(cardIds);
    setSessionActive(true);
    setIndex(0);
    setChosen(null);
    setRevealed(false);
    setFinished(false);
    setSessionStats({ reviewed: 0, correct: 0, startedAt: Date.now() });
  };

  const grade = (rating: FsrsRating) => {
    if (!current || !currentItem) return;
    const wasCorrect = currentItem.kind === 'flashcard' ? rating >= 3 : chosen === currentItem.options?.find((o) => o.correct)?.id;
    review(current.cardId, rating);
    const nextStats = {
      ...sessionStats,
      reviewed: sessionStats.reviewed + 1,
      correct: sessionStats.correct + (wasCorrect ? 1 : 0),
    };
    setSessionStats(nextStats);
    setChosen(null);
    setRevealed(false);
    if (index + 1 >= sessionQueue.length) {
      const seconds = Math.round((Date.now() - (sessionStats.startedAt || Date.now())) / 1000);
      setHistory(recordPracticeSession(nextStats.reviewed, nextStats.correct, seconds));
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const updateSettings = (partial: Partial<PracticeSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    savePracticeSettings(next);
  };

  const recallByModule = useMemo(() => {
    const rows: Array<{ module: EncyclopediaModule; tracked: number; meanStability: number }> = [];
    for (const module of ENCYCLOPEDIA_MODULES) {
      const moduleCards = Object.values(cards).filter((card) => cardModule[card.cardId] === module.id);
      if (moduleCards.length === 0) continue;
      const mean = moduleCards.reduce((sum, card) => sum + card.stability, 0) / moduleCards.length;
      rows.push({ module, tracked: moduleCards.length, meanStability: mean });
    }
    return rows.sort((a, b) => b.meanStability - a.meanStability).slice(0, 5);
  }, [cards, cardModule]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Spaced Review</h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-zinc-400">
            Your review queue is scheduled by FSRS (desired retention 90%). Review works best when memory is <em>partly</em> faded:
            items appear here right on time, and overflow is deferred quietly — there is no overdue counter and no streak to
            protect.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[12px] font-semibold text-emerald-300">
            {dueQueue.length} due now
          </span>
          <span className="rounded-full border border-zinc-700 px-3 py-1 text-[12px] text-zinc-400">
            {totalTracked} items tracked
          </span>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-[12px] text-zinc-400">
          Daily review cap
          <input
            type="number"
            min={5}
            max={200}
            value={settings.dailyCap}
            onChange={(e) => updateSettings({ dailyCap: Number(e.target.value) || DEFAULT_PRACTICE_SETTINGS.dailyCap })}
            className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-[13px] text-zinc-100"
          />
          <span className="text-[11px] text-zinc-600">Overflow defers to tomorrow — never marked “overdue”.</span>
        </label>
        <div className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-[12px] text-zinc-400">
          Catch-up mode
          <button
            type="button"
            onClick={() => updateSettings({ catchUpMode: !settings.catchUpMode })}
            className={`mt-1 inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-[12.5px] font-medium ${
              settings.catchUpMode
                ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
                : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {settings.catchUpMode ? 'Enabled — 3× cap' : 'Enable 3× cap'}
          </button>
          <span className="mt-1 text-[11px] text-zinc-600">Back after a break? Chew through the backlog gently.</span>
        </div>
        <div className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-[12px] text-zinc-400">
          Next scheduled
          <p className="mt-1 text-[14px] font-semibold text-zinc-100">
            {upcoming ? new Date(upcoming.due).toLocaleString() : 'Nothing scheduled yet'}
          </p>
          <span className="mt-1 text-[11px] text-zinc-600">
            {upcoming
              ? `Recall probability by then: ${(retrievability(
                  Math.max(0, (new Date(upcoming.due).getTime() - today.getTime()) / 86_400_000),
                  upcoming.stability,
                ) * 100).toFixed(0)}%`
              : 'Read a concept and grade a few items to seed the queue.'}
          </span>
        </div>
      </div>

      {!sessionActive && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6">
          {dueQueue.length > 0 ? (
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-[15px] font-semibold text-zinc-100">
                  {dueQueue.length} item{dueQueue.length === 1 ? '' : 's'} ready to review
                </p>
                <p className="mt-1 text-[12.5px] text-zinc-500">
                  Mixed interleaving across modules · estimates ~{Math.max(1, Math.round((dueQueue.length * 18) / 60))} min
                </p>
              </div>
              <button
                type="button"
                onClick={() => startSession()}
                className="ml-auto inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-[13.5px] font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
              >
                <Sparkles size={15} /> Start review session
              </button>
            </div>
          ) : (
            <div className="text-center">
              <Trophy size={28} className="mx-auto text-emerald-300" />
              <p className="mt-2 text-[15px] font-semibold text-zinc-100">Queue clear — nothing due right now.</p>
              <p className="mt-1 text-[12.5px] text-zinc-500">
                That was the intent: review lands exactly when memory is about to fade. Come back when items resurface.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link
                  href="/wiki"
                  className="rounded-full border border-zinc-700 px-4 py-2 text-[12.5px] text-zinc-300 transition-colors hover:border-zinc-500"
                >
                  Read a concept
                </Link>
                <Link
                  href="/play"
                  className="rounded-full border border-zinc-700 px-4 py-2 text-[12.5px] text-zinc-300 transition-colors hover:border-zinc-500"
                >
                  Play an estimation sprint
                </Link>
                <button
                  type="button"
                  disabled={totalTracked === 0}
                  onClick={() => startSession(extraPool)}
                  className="rounded-full border border-zinc-700 px-4 py-2 text-[12.5px] text-zinc-400 transition-colors hover:border-zinc-500 disabled:opacity-40"
                  title={totalTracked === 0 ? 'No items tracked yet' : 'Review even the not-yet-due items'}
                >
                  <RotateCcw size={12} className="mr-1 inline" /> Extra practice (not-yet-due)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {sessionActive && finished && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-6 text-center">
          <Check size={26} className="mx-auto text-emerald-300" />
          <p className="mt-2 text-[15px] font-semibold text-zinc-100">
            Session complete — {sessionStats.reviewed} reviewed, {sessionStats.correct} recalled first try.
          </p>
          <p className="mt-1 text-[12.5px] text-zinc-400">
            Tomorrow&apos;s queue is already scheduled. The next scheduled item appears{' '}
            {upcoming ? new Date(upcoming.due).toLocaleString() : 'after your next read'}.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setSessionActive(false)}
              className="rounded-full border border-zinc-700 px-4 py-2 text-[12.5px] text-zinc-300 hover:border-zinc-500"
            >
              Back to queue
            </button>
            <Link
              href="/progress"
              className="rounded-full border border-emerald-500/50 px-4 py-2 text-[12.5px] text-emerald-300 hover:border-emerald-400"
            >
              See mastery map <ArrowRight size={12} className="ml-1 inline" />
            </Link>
          </div>
        </div>
      )}

      {sessionActive && !finished && current && currentItem && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6" aria-live="polite">
          <div className="mb-3 flex items-center justify-between text-[11.5px] text-zinc-500">
            <span>
              {index + 1} / {sessionQueue.length} · {currentItem.module.title}
            </span>
            <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10.5px] uppercase tracking-wider">
              {currentItem.kind === 'quiz' ? 'Multiple choice' : 'Free recall'}
            </span>
          </div>

          <p className="text-[16px] font-medium leading-relaxed text-zinc-100">{currentItem.prompt}</p>

          {currentItem.kind === 'quiz' && currentItem.options && (
            <div className="mt-4 space-y-1.5">
              {currentItem.options.map((option) => {
                const isChosen = chosen === option.id;
                const showCorrect = revealed && option.correct;
                const showWrong = revealed && isChosen && !option.correct;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      if (revealed) return;
                      setChosen(option.id);
                      setRevealed(true);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13px] transition-colors ${
                      showCorrect
                        ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-100'
                        : showWrong
                          ? 'border-red-400/70 bg-red-500/10 text-red-100'
                          : 'border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/60'
                    }`}
                  >
                    {showCorrect && <Check size={14} />}
                    {showWrong && <X size={14} />}
                    {option.text}
                  </button>
                );
              })}
            </div>
          )}

          {currentItem.kind === 'flashcard' && (
            <div className="mt-4">
              {!revealed ? (
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-5 text-left text-[13.5px] text-zinc-300 hover:border-zinc-500"
                >
                  Think of your answer, then click to reveal…
                </button>
              ) : (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-4 py-4 text-[13.5px] leading-relaxed text-zinc-100">
                  {currentItem.answer}
                </div>
              )}
            </div>
          )}

          {revealed && (
            <div className="mt-4">
              {currentItem.explanation && (
                <p className="mb-3 rounded-md bg-zinc-900 px-3 py-2 text-[12.5px] leading-relaxed text-zinc-400">
                  {currentItem.explanation}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-zinc-500">How well did you recall it?</span>
                {GRADES.map((gradeOption) => (
                  <button
                    key={gradeOption.rating}
                    type="button"
                    onClick={() => grade(gradeOption.rating)}
                    title={gradeOption.hint}
                    className={`rounded-lg border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${gradeOption.tone}`}
                  >
                    {gradeOption.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSessionActive(false);
                  }}
                  className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300"
                >
                  <RefreshCw size={12} /> Pause session
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {recallByModule.length > 0 && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Strongest recall right now</h2>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {recallByModule.map(({ module, tracked, meanStability }) => (
              <li key={module.id} className="flex items-center justify-between rounded-lg border border-zinc-800/70 px-3 py-2 text-[12.5px]">
                <Link href={`/wiki/${module.id}`} className="text-zinc-300 hover:text-zinc-100">
                  {module.title}
                </Link>
                <span className="text-zinc-500">
                  {tracked} items · S̄ {meanStability.toFixed(1)}d
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

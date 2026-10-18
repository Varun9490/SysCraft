'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Brain,
  Check,
  Clock,
  Globe,
  Gauge,
  Play,
  Sparkles,
  Swords,
  Trophy,
  X,
  Zap,
} from '@/components/ui/icons';
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
 * Play layer: nine deterministic modes over one question engine, presented as
 * a game lobby — the UTC-seeded Daily Puzzle gets a live countdown spotlight,
 * every mode is a colored "cabinet" card with hover lift, and filters are a
 * segmented chip row. Scoring, seeds, and persistence are unchanged: four
 * modes run here, simulation modes deep-link into the lab/canvas workspaces.
 */

interface AnswerOutcome {
  questionId: string;
  value: string;
  points: number;
}

type CabinetKind = PlayQuestionKind | 'link';

const KIND_LABEL: Record<CabinetKind, string> = {
  estimate: 'Numbers game',
  match: 'Pattern instinct',
  diagnose: 'Outage recall',
  bottleneck: 'Bottleneck hunt',
  link: 'Live simulation',
};

const KIND_ACCENT: Record<CabinetKind, { bar: string; text: string; chip: string; glow: string; btn: string }> = {
  estimate: {
    bar: 'from-sky-400 to-cyan-300',
    text: 'text-sky-300',
    chip: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    glow: 'hover:shadow-[0_18px_50px_-18px_rgba(56,189,248,0.45)] hover:border-sky-500/40',
    btn: 'bg-sky-500 hover:bg-sky-400',
  },
  match: {
    bar: 'from-violet-400 to-fuchsia-300',
    text: 'text-violet-300',
    chip: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
    glow: 'hover:shadow-[0_18px_50px_-18px_rgba(167,139,250,0.45)] hover:border-violet-500/40',
    btn: 'bg-violet-500 hover:bg-violet-400',
  },
  diagnose: {
    bar: 'from-rose-400 to-red-300',
    text: 'text-rose-300',
    chip: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    glow: 'hover:shadow-[0_18px_50px_-18px_rgba(251,113,133,0.45)] hover:border-rose-500/40',
    btn: 'bg-rose-500 hover:bg-rose-400',
  },
  bottleneck: {
    bar: 'from-amber-400 to-yellow-300',
    text: 'text-amber-300',
    chip: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    glow: 'hover:shadow-[0_18px_50px_-18px_rgba(251,191,36,0.45)] hover:border-amber-500/40',
    btn: 'bg-amber-500 hover:bg-amber-400',
  },
  link: {
    bar: 'from-emerald-400 to-teal-300',
    text: 'text-emerald-300',
    chip: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    glow: 'hover:shadow-[0_18px_50px_-18px_rgba(52,211,153,0.45)] hover:border-emerald-500/40',
    btn: 'bg-emerald-500 hover:bg-emerald-400',
  },
};

const KIND_ICON: Record<CabinetKind, typeof Gauge> = {
  estimate: Activity,
  match: Brain,
  diagnose: Zap,
  bottleneck: Gauge,
  link: Globe,
};

const FILTERS: Array<{ id: CabinetKind | 'all'; label: string }> = [
  { id: 'all', label: 'All modes' },
  { id: 'estimate', label: KIND_LABEL.estimate },
  { id: 'match', label: KIND_LABEL.match },
  { id: 'diagnose', label: KIND_LABEL.diagnose },
  { id: 'bottleneck', label: KIND_LABEL.bottleneck },
  { id: 'link', label: KIND_LABEL.link },
];

function questionsForMode(mode: PlayMode): PlayQuestion[] {
  if (mode.id === 'daily-puzzle') return [dailyPuzzle()];
  if (mode.kind === 'link') return [];
  return PLAY_BY_KIND[mode.kind as PlayQuestionKind] ?? [];
}

function isMultipleChoice(question: PlayQuestion): boolean {
  return Array.isArray(question.options) && question.options.length > 0;
}

function nextUtcMidnight(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + 86_400_000;
}

function formatCountdown(ms: number): string {
  const clamped = Math.max(0, ms);
  const h = Math.floor(clamped / 3_600_000);
  const m = Math.floor((clamped % 3_600_000) / 60_000);
  const s = Math.floor((clamped % 60_000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
  const [filter, setFilter] = useState<CabinetKind | 'all'>('all');
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    setBestScores(loadPlayScores());
    setCountdown(formatCountdown(nextUtcMidnight() - Date.now()));
    const timer = window.setInterval(() => {
      setCountdown(formatCountdown(nextUtcMidnight() - Date.now()));
    }, 1000);
    return () => window.clearInterval(timer);
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
  const dailyMode = PLAY_MODES.find((m) => m.id === 'daily-puzzle');
  const gridModes = PLAY_MODES.filter((m) => m.id !== 'daily-puzzle' && m.kind !== 'link');
  const linkModes = PLAY_MODES.filter((m) => m.kind === 'link');
  const visibleGrid = filter === 'all' || filter === 'link' ? gridModes : gridModes.filter((m) => m.kind === filter);
  const visibleLinks = filter === 'all' || filter === 'link' ? linkModes : [];
  const totalSessions = Object.values(bestScores).reduce((sum, rec) => sum + rec.plays, 0);

  // ── Mode picker — the arcade lobby ────────────────────────────────────────
  if (!activeMode) {
    return (
      <div className="flex flex-col gap-6">
        {/* Player strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-[12px] text-zinc-400">
          <span className="inline-flex items-center gap-1.5 text-zinc-300">
            <Sparkles size={13} className="text-brass" /> Ten modes · one question engine · zero surprises
          </span>
          <span className="text-zinc-600">|</span>
          <span className="inline-flex items-center gap-1.5">
            <Swords size={12} className="text-sky-300" /> {totalSessions} session{totalSessions === 1 ? '' : 's'} logged on this device
          </span>
          <span className="text-zinc-600">|</span>
          <span className="inline-flex items-center gap-1.5">
            <Globe size={12} className="text-violet-300" /> Daily Puzzle flips at 00:00 UTC for everyone
          </span>
        </div>

        {/* Daily Puzzle spotlight */}
        {dailyMode && filter !== 'link' && (
          <motion.article
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-2xl border border-brass/40 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900"
          >
            <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center">
              <div className="flex-1">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-brass">
                  <Trophy size={13} /> Daily puzzle · {todayKey} UTC · seed #{dailyPuzzleIndex()}
                </p>
                <h2 className="mt-2 bg-gradient-to-r from-brass via-amber-200 to-brass bg-clip-text text-2xl font-bold tracking-tight text-transparent">
                  One shared question a day, same for everyone
                </h2>
                <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-zinc-400">
                  The UTC date seeds the item, so two learners anywhere solve identical puzzles tonight. In-browser, 5
                  minutes, {countdown === null ? 'resets at 00:00 UTC' : `resets in ${countdown}`}.
                </p>
                {bestScores['daily-puzzle'] && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] text-amber-300">
                    <Trophy size={11} /> Best {bestScores['daily-puzzle'].bestScore}/100 ·{' '}
                    {bestScores['daily-puzzle'].plays} play{bestScores['daily-puzzle'].plays === 1 ? '' : 's'} today is
                    a fresh seed
                  </p>
                )}
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                onClick={() => startMode(dailyMode)}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brass px-5 text-[14px] font-bold text-zinc-950 shadow-lg shadow-brass/20 hover:bg-brass-bright"
              >
                <Play size={15} weight="bold" /> Play today
              </motion.button>
            </div>
          </motion.article>
        )}

        {/* Filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilter(chip.id)}
              className={`relative rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                filter === chip.id
                  ? chip.id === 'all'
                    ? 'border-zinc-500 bg-zinc-100 text-zinc-950'
                    : KIND_ACCENT[chip.id].chip
                  : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Cabinets */}
        <motion.div layout className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {visibleGrid.map((mode, i) => {
              const kind = mode.kind as CabinetKind;
              const accent = KIND_ACCENT[kind];
              const KindIcon = KIND_ICON[kind];
              const best = bestScores[mode.id];
              return (
                <motion.article
                  layout
                  key={mode.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.32, delay: Math.min(i * 0.04, 0.2) }}
                  whileHover={{ y: -4 }}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 transition-shadow ${accent.glow}`}
                >
                  <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${accent.bar}`} />
                  <div className="flex flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${accent.chip}`}>
                          <KindIcon size={17} />
                        </span>
                        <div>
                          <h3 className="text-[15px] font-bold text-zinc-100">{mode.name}</h3>
                          <p className={`text-[10.5px] font-semibold uppercase tracking-[0.14em] ${accent.text}`}>
                            {KIND_LABEL[kind]}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-zinc-700 px-2 py-0.5 text-[10.5px] text-zinc-400">
                        <Clock size={10} /> {mode.minutes}m
                      </span>
                    </div>
                    <p className="mt-3 flex-1 text-[12.5px] leading-relaxed text-zinc-400">{mode.tagline}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-zinc-600">
                      <span>Trains: {mode.trains}</span>
                      <span title={mode.seedNote} className="max-w-[55%] truncate">
                        {mode.seedNote}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      {best ? (
                        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-amber-300">
                          <Trophy size={11} /> {best.bestScore}/100 · {best.plays}×
                        </span>
                      ) : (
                        <span className="text-[11.5px] text-zinc-600">No runs yet</span>
                      )}
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.94 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                        onClick={() => startMode(mode)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-bold text-zinc-950 transition-colors ${accent.btn}`}
                      >
                        <Play size={13} weight="bold" /> Play now
                      </motion.button>
                    </div>
                  </div>
                  <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-current opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-10" />
                </motion.article>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Workspace sim challenges */}
        {visibleLinks.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-2 px-0.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              <Swords size={12} className="text-emerald-300" /> Run inside the live workspace
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <AnimatePresence mode="popLayout" initial={false}>
                {visibleLinks.map((mode, i) => {
                  const accent = KIND_ACCENT.link;
                  const KindIcon = KIND_ICON.link;
                  return (
                    <motion.article
                      layout
                      key={mode.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.15) }}
                      whileHover={{ y: -3 }}
                      className={`relative flex items-center gap-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 transition-shadow ${accent.glow}`}
                    >
                      <div className={`absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b ${accent.bar}`} />
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${accent.chip}`}>
                        <KindIcon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold text-zinc-100">{mode.name}</span>
                        <span className="block truncate text-[11px] text-zinc-500">{mode.tagline}</span>
                      </span>
                      <Link
                        href={mode.href ?? '/labs'}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-[12px] font-medium text-zinc-200 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
                      >
                        {mode.hrefLabel ?? 'Open in workspace'} <ArrowRight size={12} />
                      </Link>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        <p className="text-[12px] leading-relaxed text-zinc-600">
          Scores count within tolerance clusters — exact answers hit 100, sane orders of magnitude still score.
          Workspace modes inherit the seeded Web Worker engine, so a shared challenge code replays bit-for-bit for
          anyone who has it.
        </p>
      </div>
    );
  }

  // ── Result screen ─────────────────────────────────────────────────────────
  if (finished) {
    const best = bestScores[activeMode.id];
    const correct = outcomes.filter((o) => o.points === 100).length;
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 text-center"
      >
        <motion.div
          initial={{ scale: 0.6, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        >
          <Trophy size={30} className="mx-auto text-amber-300" />
        </motion.div>
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
      </motion.div>
    );
  }

  if (!question) return null;

  // ── Active question ───────────────────────────────────────────────────────
  const correctOptionId = question.options?.find((o) => o.correct)?.id;
  const wasCorrect = revealed ? outcomes[outcomes.length - 1]?.points === 100 : false;
  const activeKind = activeMode.kind as CabinetKind;
  const accent = KIND_ACCENT[activeMode.id === 'daily-puzzle' ? 'match' : activeKind] ?? KIND_ACCENT.match;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles size={12} className={accent.text} /> {activeMode.name}
          {activeMode.id === 'daily-puzzle' && ` · seeded ${dailyPuzzleIndex()} (UTC)`}
        </span>
        <span>
          {index + 1} / {questions.length}
        </span>
      </div>

      {/* Segmented progress */}
      <div className="mb-4 flex gap-1.5">
        {questions.map((q, i) => {
          const result = outcomes.find((o) => o.questionId === q.id);
          return (
            <span
              key={q.id}
              className={`h-1 flex-1 rounded-full transition-colors ${
                result ? (result.points === 100 ? 'bg-emerald-400' : 'bg-red-400') : i === index ? 'bg-zinc-400' : 'bg-zinc-800'
              }`}
            />
          );
        })}
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
              <motion.button
                key={option.id}
                type="button"
                onClick={() => {
                  if (revealed) return;
                  setChosen(option.id);
                }}
                whileTap={{ scale: showedTapScale(revealed) }}
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
              </motion.button>
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

function showedTapScale(revealed: boolean) {
  return revealed ? 1 : 0.98;
}

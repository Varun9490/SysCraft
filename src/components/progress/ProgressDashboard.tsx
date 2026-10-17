'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  Gauge,
  Layers,
  ListChecks,
  Map as MapIcon,
  Play,
  Sparkles,
  Trophy,
} from '@/components/ui/icons';
import { ENCYCLOPEDIA_MAP } from '@/data/encyclopediaData';
import { GUIDED_LAB_MAP } from '@/data/guidedLabs';
import { PATH_PARTS } from '@/data/pathData';
import { PLAY_MODES } from '@/data/playContent';
import { retrievability } from '@/engine/fsrsScheduler';
import {
  loadPlayScores,
  loadPracticeHistory,
  loadPracticeSettings,
  reviewsToday,
  rhythmThisWeek,
  weeklyRhythm,
  type PracticeSessionRecord,
  type PlayScoreRecord,
} from '@/engine/practiceStats';
import { useLearningStore } from '@/store/useLearningStore';

/**
 * Progress dashboard (Union Blueprint §5.5).
 *
 * A three-lens mastery map over the 19 curriculum modules:
 *   1. FSRS card state — scheduled, in review, or mastered (S ≥ 21 days),
 *   2. lab completion — graded stages across the 16 guided labs,
 *   3. play records — personal bests across the nine game modes.
 * Plus the Weekly Rhythm tracker and an on-device retention estimate.
 * Everything is computed from local stores; nothing leaves the browser.
 */

type MasteryLevel = 'mastered' | 'learning' | 'scheduled' | 'untouched';

const LEVEL_META: Record<MasteryLevel, { label: string; badge: string; dot: string }> = {
  mastered: { label: 'Mastered', badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300', dot: 'bg-emerald-400' },
  learning: { label: 'In review', badge: 'border-sky-500/40 bg-sky-500/10 text-sky-300', dot: 'bg-sky-400' },
  scheduled: { label: 'Scheduled', badge: 'border-amber-500/40 bg-amber-500/10 text-amber-300', dot: 'bg-amber-400' },
  untouched: { label: 'Not started', badge: 'border-zinc-700/60 bg-zinc-900/40 text-zinc-500', dot: 'bg-zinc-700' },
};

const MASTERY_STABILITY_DAYS = 21;

interface ConceptStats {
  total: number;
  mastered: number;
  learning: number;
  newCards: number;
  due: number;
  retention: number | null;
}

export function ProgressDashboard() {
  const cards = useLearningStore((s) => s.cards);
  const cardModule = useLearningStore((s) => s.cardModule);
  const labProgress = useLearningStore((s) => s.labProgress);
  const hydrateFromDb = useLearningStore((s) => s.hydrateFromDb);
  const [hydrated, setHydrated] = useState(false);
  const [history, setHistory] = useState<PracticeSessionRecord[]>([]);
  const [scores, setScores] = useState<Record<string, PlayScoreRecord>>({});
  const [dailyCap, setDailyCap] = useState(20);

  useEffect(() => {
    void (async () => {
      await hydrateFromDb();
      setHydrated(true);
    })();
    setHistory(loadPracticeHistory());
    setScores(loadPlayScores());
    setDailyCap(loadPracticeSettings().dailyCap);
  }, [hydrateFromDb]);

  const now = useMemo(() => new Date(), []);
  const nowMs = now.getTime();

  /** FSRS stats keyed by encyclopedia concept id. */
  const conceptStats = useMemo(() => {
    const stats: Record<string, ConceptStats> = {};
    const ensure = (id: string): ConceptStats => {
      stats[id] ??= { total: 0, mastered: 0, learning: 0, newCards: 0, due: 0, retention: null };
      return stats[id];
    };
    const retentionAcc: Record<string, { sum: number; n: number }> = {};
    for (const card of Object.values(cards)) {
      const moduleId = cardModule[card.cardId];
      if (!moduleId) continue;
      const s = ensure(moduleId);
      s.total += 1;
      const dueMs = Date.parse(card.due);
      if (Number.isFinite(dueMs) && dueMs <= nowMs) s.due += 1;
      if (card.state === 'new') s.newCards += 1;
      if (card.state === 'review' && card.stability >= MASTERY_STABILITY_DAYS) s.mastered += 1;
      else if (card.reps > 0) s.learning += 1;
      if (card.lastReview) {
        const elapsed = (nowMs - Date.parse(card.lastReview)) / 86_400_000;
        const r = retrievability(Math.max(0, elapsed), card.stability);
        retentionAcc[moduleId] ??= { sum: 0, n: 0 };
        retentionAcc[moduleId]!.sum += r;
        retentionAcc[moduleId]!.n += 1;
      }
    }
    for (const [id, acc] of Object.entries(retentionAcc)) {
      const s = ensure(id);
      s.retention = acc.n > 0 ? acc.sum / acc.n : null;
    }
    return stats;
  }, [cards, cardModule, nowMs]);

  const overall = useMemo(() => {
    const all = Object.values(cards);
    const mastered = all.filter((c) => c.state === 'review' && c.stability >= MASTERY_STABILITY_DAYS).length;
    const inReview = all.filter((c) => c.reps > 0 && !(c.state === 'review' && c.stability >= MASTERY_STABILITY_DAYS)).length;
    const due = all.filter((c) => Date.parse(c.due) <= nowMs).length;
    let retentionSum = 0;
    let retentionN = 0;
    for (const c of all) {
      if (!c.lastReview) continue;
      retentionSum += retrievability(Math.max(0, (nowMs - Date.parse(c.lastReview)) / 86_400_000), c.stability);
      retentionN += 1;
    }
    return {
      tracked: all.length,
      mastered,
      inReview,
      due,
      retention: retentionN > 0 ? retentionSum / retentionN : null,
      reviews: history.reduce((sum, row) => sum + row.reviewed, 0),
    };
  }, [cards, history, nowMs]);

  const rhythm = useMemo(() => weeklyRhythm(history, now), [history, now]);
  const weekActive = useMemo(() => rhythmThisWeek(history, now), [history, now]);
  const reviewedToday = useMemo(() => reviewsToday(history, now), [history, now]);

  const labRows = useMemo(
    () =>
      Object.values(labProgress).map((row) => {
        const lab = GUIDED_LAB_MAP[row.labId];
        const stageCount = lab?.stages.length ?? 0;
        return {
          row,
          lab,
          pct: stageCount > 0 ? Math.round((row.completedStages.length / stageCount) * 100) : 0,
        };
      }),
    [labProgress],
  );

  const hasAnyData = overall.tracked > 0 || history.length > 0 || labRows.length > 0 || Object.keys(scores).length > 0;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-sky-400/80">PROGRESS</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-zinc-100">Your mastery map</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Card scheduling, lab grades, and game records — rolled into one view over the 19-module curriculum. Stored
          on-device with FSRS; it survives refreshes and never phones home.
        </p>
      </header>

      {/* Summary strip */}
      <section aria-label="Summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Layers className="h-4 w-4 text-sky-400" aria-hidden />}
          label="Cards tracked"
          value={String(overall.tracked)}
          sub={`${overall.inReview} in review · ${overall.mastered} mastered`}
        />
        <SummaryCard
          icon={<Clock className="h-4 w-4 text-amber-400" aria-hidden />}
          label="Due now"
          value={String(overall.due)}
          sub={`${reviewedToday}/${dailyCap} reviewed today`}
        />
        <SummaryCard
          icon={<Gauge className="h-4 w-4 text-emerald-400" aria-hidden />}
          label="Est. retention"
          value={overall.retention === null ? '—' : `${Math.round(overall.retention * 100)}%`}
          sub="mean retrievability today"
        />
        <SummaryCard
          icon={<Flame className="h-4 w-4 text-orange-400" aria-hidden />}
          label="Weekly rhythm"
          value={`${weekActive}/7`}
          sub={`${overall.reviews} lifetime reviews`}
        />
      </section>

      {/* Weekly rhythm */}
      <section aria-label="Weekly rhythm" className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[11px] font-semibold tracking-[0.18em] text-zinc-500">WEEKLY RHYTHM</h2>
          <Link href="/practice" className="inline-flex items-center gap-1 text-[12px] text-sky-400 transition hover:text-sky-300">
            {overall.due > 0 ? `Review ${overall.due} due cards` : 'Open practice queue'}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        <ol className="mt-4 grid grid-cols-7 gap-2">
          {rhythm.map((day) => {
            const label = new Date(`${day.day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
            return (
              <li key={day.day} className="text-center">
                <div
                  className={`mx-auto h-9 w-9 rounded-lg border ${
                    day.active ? 'border-emerald-500/50 bg-emerald-500/20' : 'border-zinc-800 bg-zinc-900/40'
                  }`}
                  aria-hidden
                />
                <span className={`mt-1.5 block text-[10.5px] ${day.active ? 'text-emerald-300' : 'text-zinc-600'}`}>{label}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Mastery map */}
      <section aria-label="Mastery map" className="mt-8">
        <div className="flex items-center gap-2">
          <MapIcon className="h-4 w-4 text-sky-400" aria-hidden />
          <h2 className="text-[11px] font-semibold tracking-[0.18em] text-zinc-500">MASTERY MAP — 19 MODULES</h2>
        </div>
        {!hydrated ? (
          <p className="mt-4 text-sm text-zinc-500">Loading your local progress…</p>
        ) : (
          <div className="mt-4 space-y-8">
            {PATH_PARTS.map((part) => (
              <div key={part.id}>
                <h3 className="font-display text-lg font-semibold text-zinc-200">{part.title}</h3>
                <p className="text-[12px] text-zinc-500">{part.subtitle}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {part.modules.map((module) => {
                    const concept = module.encyclopediaId ? ENCYCLOPEDIA_MAP[module.encyclopediaId] : undefined;
                    const stats = module.encyclopediaId ? conceptStats[module.encyclopediaId] : undefined;
                    const labIds = module.practiceLabIds ?? [];
                    const labRowsForModule = labIds.map((id) => labRows.find((r) => r.row.labId === id)).filter(Boolean);
                    const bestLabPct = labRowsForModule.length > 0 ? Math.max(...labRowsForModule.map((r) => r!.pct)) : 0;
                    const level = deriveLevel(stats, bestLabPct);
                    const meta = LEVEL_META[level];
                    const masteryPct = stats && stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : bestLabPct;
                    return (
                      <article key={module.id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] text-zinc-600">Module {module.number}</p>
                            <h4 className="mt-0.5 text-[13.5px] font-medium leading-snug text-zinc-100">{module.title}</h4>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10.5px] font-medium ${meta.badge}`}>
                            {meta.label}
                          </span>
                        </div>

                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800/80" aria-hidden>
                          <div className={`h-full rounded-full ${meta.dot}`} style={{ width: `${Math.max(masteryPct, stats && stats.total > 0 ? 3 : 0)}%` }} />
                        </div>

                        <p className="mt-2.5 text-[11.5px] leading-relaxed text-zinc-500">
                          {stats && stats.total > 0 ? (
                            <>
                              {stats.mastered}/{stats.total} cards mastered
                              {stats.due > 0 ? ` · ${stats.due} due` : ''}
                              {stats.retention !== null ? ` · ~${Math.round(stats.retention * 100)}% recall` : ''}
                            </>
                          ) : (
                            <>{concept ? 'No cards scheduled yet — visit the concept to seed the queue.' : 'Covered through labs and lessons.'}</>
                          )}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11.5px]">
                          {module.encyclopediaId && (
                            <Link
                              href={`/wiki/${module.encyclopediaId}`}
                              className="inline-flex items-center gap-1 text-sky-400 transition hover:text-sky-300"
                            >
                              <BookOpen className="h-3.5 w-3.5" aria-hidden />
                              Concept
                            </Link>
                          )}
                          {labRowsForModule.map((r) => (
                            <Link
                              key={r!.row.labId}
                              href={`/labs/${r!.row.labId}`}
                              className="inline-flex items-center gap-1 text-zinc-400 transition hover:text-zinc-200"
                            >
                              <ListChecks className="h-3.5 w-3.5" aria-hidden />
                              {r!.lab?.title ?? r!.row.labId} · {r!.pct}%
                            </Link>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Guided labs */}
      <section aria-label="Guided labs" className="mt-10">
        <h2 className="text-[11px] font-semibold tracking-[0.18em] text-zinc-500">GUIDED LABS — 16 SCENARIOS</h2>
        {labRows.length === 0 ? (
          <p className="mt-3 text-[12.5px] text-zinc-500">
            No lab attempts graded yet.{' '}
            <Link href="/labs" className="text-sky-400 transition hover:text-sky-300">
              Pick a company scenario
            </Link>{' '}
            and let the canvas grader score your topology.
          </p>
        ) : (
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {labRows
              .slice()
              .sort((a, b) => b.pct - a.pct)
              .map(({ row, lab, pct }) => (
                <Link
                  key={row.labId}
                  href={`/labs/${row.labId}`}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3.5 transition hover:border-zinc-600"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-medium text-zinc-200">{lab?.title ?? row.labId}</span>
                    <span className="text-[11px] text-zinc-500">{pct}%</span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-600">
                    {row.completedStages.length}/{lab?.stages.length ?? '?'} stages · best {row.bestScore}
                    {row.bestCostUsd !== null ? ` · $${row.bestCostUsd.toFixed(1)}/hr` : ''}
                  </p>
                </Link>
              ))}
          </div>
        )}
      </section>

      {/* Play records */}
      <section aria-label="Play records" className="mt-10">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-400" aria-hidden />
          <h2 className="text-[11px] font-semibold tracking-[0.18em] text-zinc-500">PLAY — NINE MODES</h2>
        </div>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {PLAY_MODES.map((mode) => {
            const record = scores[mode.id];
            return (
              <Link
                key={mode.id}
                href="/play"
                className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3.5 transition hover:border-zinc-600"
              >
                <div>
                  <p className="text-[12.5px] font-medium text-zinc-200">{mode.name}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-600">{mode.tagline}</p>
                </div>
                <span className="shrink-0 text-right text-[11px] text-zinc-500">
                  {record ? (
                    <>
                      <span className="block font-semibold text-amber-300">{record.bestScore}</span>
                      {record.plays} {record.plays === 1 ? 'run' : 'runs'}
                    </>
                  ) : (
                    '—'
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {!hasAnyData && (
        <section className="mt-10 rounded-2xl border border-sky-500/30 bg-sky-500/[0.05] p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-zinc-100">
            <Sparkles className="h-4 w-4 text-sky-400" aria-hidden />
            Nothing to chart yet — that's fine
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-zinc-400">
            Progress appears the moment you do anything: read a concept, answer a quiz card, grade a lab, or play a
            round. Pick a starting point below and this page fills itself in.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/learn" className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400">
              <BookOpen className="h-4 w-4" aria-hidden />
              Start the path
            </Link>
            <Link href="/practice" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Open the review queue
            </Link>
            <Link href="/play" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500">
              <Play className="h-4 w-4" aria-hidden />
              Play a round
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function deriveLevel(stats: ConceptStats | undefined, labPct: number): MasteryLevel {
  if (stats && stats.total > 0) {
    if (stats.mastered === stats.total) return 'mastered';
    if (stats.learning > 0 || stats.mastered > 0) return 'learning';
    return 'scheduled';
  }
  if (labPct >= 100) return 'mastered';
  if (labPct > 0) return 'learning';
  return 'untouched';
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-zinc-500">
        {icon}
        {label.toUpperCase()}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold text-zinc-100">{value}</p>
      <p className="mt-1 text-[11.5px] text-zinc-500">{sub}</p>
    </div>
  );
}

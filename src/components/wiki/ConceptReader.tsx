'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Download, HelpCircle, ListChecks, Sparkles } from '@/components/ui/icons';
import { Markdown, extractHeadings } from '@/components/Markdown';
import { ContextualQuizCard } from '@/components/encyclopedia/ContextualQuizCard';
import { ENCYCLOPEDIA_MODULES, getEncyclopediaModule } from '@/data/encyclopediaData';
import type { EncyclopediaModule, Flashcard } from '@/types/encyclopedia';
import { useLearningStore } from '@/store/useLearningStore';

/**
 * Standardized concept page (the /wiki/[concept] template).
 *
 * Sections in fixed order: definition, problem, how it works, quiz & recall,
 * trade-offs, when to use / avoid, numbers to remember, knowledge-graph
 * relations, flashcards, and review metadata. Every widget reads the same
 * module record the Almanac modal uses — one source of truth, zero drift.
 */

const REVIEWED_ON = '2026-10-17';

function FlashcardDeck({ cards }: { cards: Flashcard[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const card = cards[index];
  if (!card) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="mb-2 flex items-center justify-between text-[11.5px] text-zinc-500">
        <span>
          Flashcard {index + 1} / {cards.length}
        </span>
        <span>{known.size} marked known</span>
      </div>
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-6 text-left transition-colors hover:border-zinc-500"
        aria-live="polite"
      >
        <p className="text-[10.5px] uppercase tracking-wider text-zinc-500">{flipped ? 'Answer' : 'Prompt — click to flip'}</p>
        <p className="mt-1.5 text-[14px] font-medium leading-relaxed text-zinc-100">{flipped ? card.back : card.front}</p>
      </button>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setKnown((prev) => new Set(prev).add(card.cardId));
            setFlipped(false);
            setIndex((i) => Math.min(cards.length - 1, i + 1));
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/50 px-3 py-1.5 text-[12px] font-medium text-emerald-300 hover:bg-emerald-500/10"
        >
          <CheckCircle2 size={13} /> I knew it
        </button>
        <button
          type="button"
          onClick={() => {
            setFlipped(false);
            setIndex((i) => Math.min(cards.length - 1, i + 1));
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-[12px] text-zinc-300 hover:bg-zinc-800"
        >
          Next card <ArrowRight size={13} />
        </button>
        <Link
          href="/practice"
          className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-sky-300 hover:text-sky-200"
        >
          Add to spaced review queue <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

export function ConceptReader({ module }: { module: EncyclopediaModule }) {
  const ensureCard = useLearningStore((s) => s.ensureCard);

  const related = useMemo(
    () =>
      module.relatedModuleIds
        .map((id) => getEncyclopediaModule(id))
        .filter((m): m is EncyclopediaModule => Boolean(m)),
    [module.relatedModuleIds],
  );

  const toc = useMemo(() => extractHeadings(module.bodyMarkdown), [module.bodyMarkdown]);

  const [progress, setProgress] = useState(0);

  // Reading progress for the top bar — rAF-throttled, passive, SSR-safe.
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const moduleIndex = ENCYCLOPEDIA_MODULES.findIndex((m) => m.id === module.id);
  const previousModule = moduleIndex > 0 ? ENCYCLOPEDIA_MODULES[moduleIndex - 1] : undefined;
  const nextModule =
    moduleIndex >= 0 && moduleIndex < ENCYCLOPEDIA_MODULES.length - 1
      ? ENCYCLOPEDIA_MODULES[moduleIndex + 1]
      : undefined;

  const firstParagraph = useMemo(() => {
    const line = module.bodyMarkdown.split('\n').find((l) => l.trim().length > 0 && !l.trim().startsWith('#'));
    return line?.replace(/\*\*/g, '').trim() ?? module.summary;
  }, [module.bodyMarkdown, module.summary]);

  // Seed every quiz item into the FSRS deck so the review queue knows these
  // items exist before the learner finishes grading them.
  useEffect(() => {
    for (const question of module.quiz) {
      ensureCard(`quiz-${question.id}`, module.id);
    }
  }, [ensureCard, module.id, module.quiz]);

  const readyCount = module.quiz.length + module.flashcards.length;

  return (
    <div className="relative">
      {/* Reading progress */}
      <div className="fixed inset-x-0 top-0 z-40 h-0.5" aria-hidden="true">
        <div
          className="h-full bg-gradient-to-r from-brass to-brass-bright transition-[width] duration-150 ease-out"
          style={{ width: `${(progress * 100).toFixed(2)}%` }}
        />
      </div>

      <div className="mx-auto flex max-w-6xl items-start justify-center gap-10">
        <article className="min-w-0 max-w-3xl flex-1">
          <header className="wiki-reveal">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass">
              {module.difficulty} · ~{module.estimatedMinutes} min read · {readyCount} review items
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-50">{module.title}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-zinc-300">{module.summary}</p>
          </header>

        <section
          className="wiki-reveal mt-8 rounded-xl border border-brass/30 bg-brass/5 p-4"
          style={{ animationDelay: '60ms' }}
          aria-label="Definition"
        >
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-brass">In one line</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-200">{firstParagraph}</p>
        </section>

        <section className="wiki-reveal mt-8" style={{ animationDelay: '120ms' }} aria-label="How it works">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-zinc-100">
            <BookOpen size={17} className="text-brass" /> How it works
          </h2>
          <Markdown source={module.bodyMarkdown} />
        </section>

        {module.tradeOffs.length > 0 && (
          <section className="wiki-reveal mt-8" style={{ animationDelay: '180ms' }} aria-label="Trade-offs">
            <h2 className="mb-3 text-lg font-bold text-zinc-100">Trade-offs</h2>
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-left text-[12.5px]">
                <thead>
                  <tr className="bg-zinc-900 text-[10.5px] uppercase tracking-wider text-zinc-400">
                    <th scope="col" className="px-3 py-2">Dimension</th>
                    <th scope="col" className="px-3 py-2">Option A</th>
                    <th scope="col" className="px-3 py-2">Option B</th>
                    <th scope="col" className="px-3 py-2">Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {module.tradeOffs.map((row) => (
                    <tr key={row.dimension} className="border-t border-zinc-800/70 odd:bg-zinc-950 even:bg-zinc-900/40">
                      <td className="px-3 py-2 font-medium text-zinc-200">{row.dimension}</td>
                      <td className="px-3 py-2 text-zinc-400">{row.optionA}</td>
                      <td className="px-3 py-2 text-zinc-400">{row.optionB}</td>
                      <td className="px-3 py-2 text-emerald-300/90">{row.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {module.quiz.length > 0 && (
          <section className="wiki-reveal mt-8" style={{ animationDelay: '240ms' }} aria-label="Retrieval practice">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-zinc-100">
              <HelpCircle size={17} className="text-amber-300" /> Check yourself
            </h2>
            <p className="mb-3 text-[12.5px] text-zinc-500">
              Answer first, then grade recall — your grade schedules this item in the FSRS review queue.
            </p>
            <div className="space-y-3">
              {module.quiz.map((question) => (
                <ContextualQuizCard key={question.id} question={question} />
              ))}
            </div>
          </section>
        )}

        {module.flashcards.length > 0 && (
          <section className="wiki-reveal mt-8" style={{ animationDelay: '300ms' }} aria-label="Flashcards">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-zinc-100">
              <Sparkles size={17} className="text-sky-300" /> Flashcards
            </h2>
            <FlashcardDeck cards={module.flashcards} />
          </section>
        )}

        <section className="wiki-reveal mt-8" style={{ animationDelay: '360ms' }} aria-label="Numbers to remember">
          <h2 className="mb-3 text-lg font-bold text-zinc-100">Numbers to remember</h2>
          <p className="text-[12.5px] leading-relaxed text-zinc-400">
            Latency, throughput and cost figures on this page are <em>illustrative teaching values</em> — order-of-magnitude anchors
            for back-of-the-envelope work, not vendor benchmarks. The simulator labels every metric it produces as an educational
            approximation and validates its queueing math against closed-form M/M/c models in CI.
          </p>
        </section>

        {related.length > 0 && (
          <section className="wiki-reveal mt-8" style={{ animationDelay: '420ms' }} aria-label="Knowledge graph relations">
            <h2 className="mb-3 text-lg font-bold text-zinc-100">Connected concepts</h2>
            <div className="flex flex-wrap gap-2">
              {related.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/wiki/${rel.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1.5 text-[12.5px] text-zinc-300 transition-colors hover:border-brass/60 hover:text-zinc-100"
                >
                  {rel.title} <ArrowRight size={12} />
                </Link>
              ))}
              <Link
                href="/wiki/graph"
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-600/50 px-3 py-1.5 text-[12.5px] text-violet-300 transition-colors hover:border-violet-400"
              >
                Open knowledge graph
              </Link>
            </div>
          </section>
        )}

        <footer className="mt-10 flex flex-wrap items-center gap-3 border-t border-zinc-800 pt-5 text-[11.5px] text-zinc-500">
          <span>Last reviewed: {REVIEWED_ON}</span>
          <span aria-hidden="true">·</span>
          <span>Written from scratch for SysCraft</span>
          <Link href="/canvas" className="ml-auto inline-flex items-center gap-1.5 text-sky-300 hover:text-sky-200">
            <Download size={12} /> Simulate this in the canvas
          </Link>
        </footer>

        {(previousModule || nextModule) && (
          <nav className="mt-8 grid gap-3 pb-2 sm:grid-cols-2" aria-label="Adjacent concepts">
            {previousModule ? (
              <Link
                href={`/wiki/${previousModule.id}`}
                className="group flex flex-col gap-1 rounded-xl border border-zinc-800 p-4 transition-colors hover:border-brass/50"
              >
                <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  <ArrowLeft size={12} /> Previous
                </span>
                <span className="text-[13.5px] font-medium text-zinc-300 transition-colors group-hover:text-zinc-50">
                  {previousModule.title}
                </span>
              </Link>
            ) : (
              <span aria-hidden="true" />
            )}
            {nextModule && (
              <Link
                href={`/wiki/${nextModule.id}`}
                className="group flex flex-col items-end gap-1 rounded-xl border border-zinc-800 p-4 text-right transition-colors hover:border-brass/50 sm:col-start-2"
              >
                <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Next <ArrowRight size={12} />
                </span>
                <span className="text-[13.5px] font-medium text-zinc-300 transition-colors group-hover:text-zinc-50">
                  {nextModule.title}
                </span>
              </Link>
            )}
          </nav>
        )}
        </article>

        {toc.length > 1 && (
          <aside className="sticky top-24 hidden w-56 shrink-0 xl:block" aria-label="On this page">
            <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              <ListChecks size={12} /> On this page
            </p>
            <nav className="max-h-[70vh] space-y-0.5 overflow-y-auto border-l border-zinc-800 pl-3">
              {toc.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={`block rounded py-0.5 text-[12px] leading-snug transition-colors hover:text-zinc-100 ${
                    heading.level === 1 ? 'font-medium text-zinc-300' : 'pl-3 text-zinc-500'
                  }`}
                >
                  {heading.text}
                </a>
              ))}
            </nav>
          </aside>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Download, HelpCircle, ListChecks, RotateCcw, Sparkles } from '@/components/ui/icons';
import { FocusBlurResolve, MaskRevealUp, SoftBlurIn } from '@/components/ui/reactbits/remocn';
import { Markdown, extractHeadings } from '@/components/Markdown';
import { ContextualQuizCard } from '@/components/encyclopedia/ContextualQuizCard';
import { ConceptDiagram } from '@/components/wiki/ConceptDiagram';
import { ENCYCLOPEDIA_MODULES, getEncyclopediaModule } from '@/data/encyclopediaData';
import { CONCEPT_FLOW_MAP, type ConceptFlow } from '@/data/conceptFlows';
import type { ConceptDefinition } from '@/data/conceptSources';
import { ConceptDefinitionCard, CONCEPT_DEFINITION_MAP } from '@/components/wiki/ConceptDefinitionCard';
import { KeyNumberGrid } from '@/components/wiki/KeyNumberGrid';
import type { EncyclopediaModule, Flashcard } from '@/types/encyclopedia';
import type { MarkdownHeading } from '@/components/Markdown';
import { useLearningStore } from '@/store/useLearningStore';

/**
 * Standardized concept page (the /wiki/[concept] template).
 *
 * Sections in fixed order: definition, problem, how it works, quiz & recall,
 * trade-offs, numbers to remember, knowledge-graph relations, flashcards,
 * and review metadata. Every widget reads the same module record the Almanac
 * modal uses — one source of truth, zero drift.
 */

const REVIEWED_ON = '2026-10-17';

function FlashcardDeck({ cards, moduleId }: { cards: Flashcard[]; moduleId: string }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const loadFlashcardsForModule = useLearningStore((s) => s.loadFlashcardsForModule);
  const sentToReview = useRef(false);

  const advance = (cardId?: string) => {
    if (cardId) setKnown((prev) => new Set(prev).add(cardId));
    setFlipped(false);
    setIndex((i) => i + 1);
  };

  const complete = index >= cards.length;
  const card = cards[index];

  if (complete) {
    return (
      <div className="wiki-pop rounded-xl border border-brass/30 bg-brass/5 p-5">
        <p className="text-[14px] font-semibold text-zinc-100">Deck cleared — {known.size} of {cards.length} marked known.</p>
        <p className="mt-1 text-[12.5px] text-zinc-400">
          Send this deck to the FSRS queue so the recall of what you just read is scheduled automatically.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              loadFlashcardsForModule(moduleId, cards);
              sentToReview.current = true;
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-brass px-3 py-1.5 text-[12px] font-semibold text-zinc-950 hover:bg-brass-bright"
          >
            <Sparkles size={13} /> {sentToReview.current ? 'Sent — open review queue' : `Add all ${cards.length} to FSRS deck`}
          </button>
          <Link href="/practice" className="inline-flex items-center gap-1.5 text-[12px] text-sky-300 hover:text-sky-200">
            Practice spaced review <ArrowRight size={12} />
          </Link>
          <button
            type="button"
            onClick={() => {
              setKnown(new Set());
              setIndex(0);
              setFlipped(false);
            }}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-[12px] text-zinc-300 hover:bg-zinc-800"
          >
            <RotateCcw size={12} /> Restart deck
          </button>
        </div>
      </div>
    );
  }

  if (!card) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-zinc-500">
        <span>
          Flashcard {index + 1} / {cards.length}
        </span>
        <div className="flex items-center gap-1.5">
          <span>{known.size} marked known</span>
          <span className="flex gap-1" aria-hidden="true">
            {cards.map((c, i) => (
              <span
                key={c.cardId}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i < index ? 'bg-brass/70' : i === index ? 'bg-brass' : 'bg-zinc-700'
                } ${known.has(c.cardId) && i < index ? 'ring-1 ring-emerald-400/60' : ''}`}
              />
            ))}
          </span>
        </div>
      </div>
      <div className="perspective-near">
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className="preserve-3d relative block h-44 w-full rounded-lg border-0 transition-transform duration-500 [transform-style:preserve-3d]"
          style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
          aria-live="polite"
          aria-label={flipped ? 'Question side' : 'Answer side of flashcard — click to flip'}
        >
          <div className="backface-hidden absolute inset-0 flex flex-col justify-center rounded-lg border border-zinc-700 bg-zinc-950 px-5 text-left">
            <p className="text-[10.5px] uppercase tracking-wider text-zinc-500">Prompt — click to flip</p>
            <p className="mt-1.5 text-[14px] font-medium leading-relaxed text-zinc-100">{card.front}</p>
          </div>
          <div
            className="backface-hidden absolute inset-0 flex flex-col justify-center rounded-lg border border-brass/40 bg-zinc-900 px-5 text-left"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-[10.5px] uppercase tracking-[0.16em] text-brass">Answer</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-100">{card.back}</p>
          </div>
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => advance(card.cardId)}
          className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/50 px-3 py-1.5 text-[12px] font-medium text-emerald-300 hover:bg-emerald-500/10"
        >
          <CheckCircle2 size={13} /> I knew it
        </button>
        <button
          type="button"
          onClick={() => advance()}
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

  const flow = useMemo<ConceptFlow | undefined>(() => CONCEPT_FLOW_MAP[module.id], [module.id]);
  const conceptDef = useMemo<ConceptDefinition | undefined>(() => CONCEPT_DEFINITION_MAP[module.id], [module.id]);
  const related = useMemo(
    () =>
      module.relatedModuleIds
        .map((id) => getEncyclopediaModule(id))
        .filter((m): m is EncyclopediaModule => Boolean(m)),
    [module.relatedModuleIds],
  );

  const toc = useMemo(() => {
    const base = extractHeadings(module.bodyMarkdown);
    const extras: MarkdownHeading[] = [];
    if (flow) extras.push({ id: "the-flow", text: "The flow, end to end", level: 2 });
    if (flow && flow.breakPoints.length > 0) extras.push({ id: "where-it-breaks", text: "Where it breaks", level: 2 });
    if (flow && flow.readNext.length > 0) extras.push({ id: "read-next", text: "Read next", level: 2 });
    return [...base, ...extras];
  }, [module.bodyMarkdown, flow]);
  const [activeHeading, setActiveHeading] = useState<string | null>(toc[0]?.id ?? null);

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

  // Scroll-spy: highlight the section currently in the reading band.
  useEffect(() => {
    if (toc.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveHeading(entry.target.id);
        }
      },
      { rootMargin: "-18% 0px -72% 0px", threshold: 0 },
    );
    for (const heading of toc) {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [toc]);

  const moduleIndex = ENCYCLOPEDIA_MODULES.findIndex((m) => m.id === module.id);
  const previousModule = moduleIndex > 0 ? ENCYCLOPEDIA_MODULES[moduleIndex - 1] : undefined;
  const nextModule =
    moduleIndex >= 0 && moduleIndex < ENCYCLOPEDIA_MODULES.length - 1
      ? ENCYCLOPEDIA_MODULES[moduleIndex + 1]
      : undefined;

  const firstParagraph = useMemo(() => {
    const line = module.bodyMarkdown
      .split('\n')
      .find((l) => {
        const trimmed = l.trim();
        return trimmed.length > 0 && !trimmed.startsWith('#') && !trimmed.startsWith('>') && !trimmed.startsWith('```');
      });
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

      <FocusBlurResolve amount={9}>
        <div className="mx-auto flex max-w-6xl items-start justify-center gap-10">
          <article className="min-w-0 max-w-3xl flex-1">
            <header className="wiki-reveal">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass">
                {module.difficulty} · ~{module.estimatedMinutes} min read · {readyCount} review items
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-50">
                <SoftBlurIn text={module.title} />
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-zinc-300">{module.summary}</p>
            </header>

            <section
              className="wiki-reveal mt-8 rounded-xl border border-brass/30 bg-brass/5 p-4"
              style={{ animationDelay: '60ms' }}
              aria-label="Definition"
            >
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-brass">In one line</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-zinc-200">{firstParagraph}</p>
            </section>

            {flow?.plainWords && (
              <section className="wiki-reveal mt-4" style={{ animationDelay: '90ms' }} aria-label="In plain words">
                <div className="md-quote">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-brass">In plain words</p>
                  <p className="text-[14.5px] leading-[1.7] text-zinc-200">{flow.plainWords}</p>
                </div>
              </section>
            )}

            {conceptDef && (
              <section className="wiki-reveal mt-6" style={{ animationDelay: '110ms' }} aria-label="Definition and sources">
                <ConceptDefinitionCard definition={conceptDef} />
              </section>
            )}

            <section className="wiki-reveal mt-8" style={{ animationDelay: '120ms' }} aria-label="How it works">
              <MaskRevealUp whileInView>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-zinc-100">
                  <BookOpen size={17} className="text-brass" /> How it works
                </h2>
              </MaskRevealUp>
                <Markdown source={module.bodyMarkdown} />
            </section>

            {flow && (
              <section className="wiki-reveal mt-8" aria-label="The flow, end to end">
                <MaskRevealUp whileInView>
                  <h2 id="the-flow" className="mb-3 scroll-mt-24 text-lg font-bold text-zinc-100">
                    The flow, end to end
                  </h2>
                </MaskRevealUp>
                <ConceptDiagram code={flow.mermaid} />
                <p className="mt-2 text-[11.5px] text-zinc-500">
                  Drag the diagram to pan, hover a node to highlight it — every shape here maps to a section above and a
                  component you can stress in the canvas below.
                </p>
              </section>
            )}

            {flow && flow.breakPoints.length > 0 && (
              <section className="wiki-reveal mt-8" aria-label="Where it breaks">
                <MaskRevealUp whileInView>
                  <h2 id="where-it-breaks" className="mb-3 scroll-mt-24 text-lg font-bold text-zinc-100">
                    Where it breaks
                  </h2>
                </MaskRevealUp>
                <ul className="space-y-2.5">
                  {flow.breakPoints.map((point, pi) => (
                    <li
                      key={pi}
                      className="rounded-lg border border-rose-500/15 bg-rose-500/[0.04] px-3.5 py-2.5 text-[13px] leading-relaxed text-zinc-300"
                    >
                      <span className="mr-1.5 font-semibold text-rose-300/90">✕</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {module.tradeOffs.length > 0 && (
              <section className="wiki-reveal mt-8" style={{ animationDelay: '180ms' }} aria-label="Trade-offs">
                <MaskRevealUp whileInView>
                  <h2 className="mb-3 text-lg font-bold text-zinc-100">Trade-offs</h2>
                </MaskRevealUp>
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
            <MaskRevealUp whileInView>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-zinc-100">
                <HelpCircle size={17} className="text-amber-300" /> Check yourself
              </h2>
            </MaskRevealUp>
            <p className="mb-3 text-[12.5px] text-zinc-500">
              Answer first, then grade recall — your grade schedules this item in the FSRS review queue.
            </p>
            <div className="space-y-3">
              {module.quiz.map((question) => (
                <ContextualQuizCard key={question.id} question={question} moduleId={module.id} />
              ))}
            </div>
          </section>
        )}

        {module.flashcards.length > 0 && (
          <section className="wiki-reveal mt-8" style={{ animationDelay: '300ms' }} aria-label="Flashcards">
            <MaskRevealUp whileInView>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-zinc-100">
                <Sparkles size={17} className="text-sky-300" /> Flashcards
              </h2>
            </MaskRevealUp>
            <FlashcardDeck cards={module.flashcards} moduleId={module.id} />
          </section>
        )}

        <section className="wiki-reveal mt-8" style={{ animationDelay: '360ms' }} aria-label="Numbers to remember">
          <MaskRevealUp whileInView>
            <h2 className="mb-3 text-lg font-bold text-zinc-100">Numbers to remember</h2>
          </MaskRevealUp>
          {module.keyNumbers.length > 0 ? (
            <KeyNumberGrid numbers={module.keyNumbers} />
          ) : null}
          <p className="mt-3 text-[11.5px] leading-relaxed text-zinc-500">
            These are <em>illustrative teaching anchors</em> for back-of-the-envelope work — not vendor benchmarks. The
            simulator validates its queueing math against closed-form M/M/c models in CI.
          </p>
        </section>

        {flow && flow.readNext.length > 0 && (
          <section className="wiki-reveal mt-8" aria-label="Read next">
            <MaskRevealUp whileInView>
              <h2 id="read-next" className="mb-3 scroll-mt-24 text-lg font-bold text-zinc-100">
                Read next
              </h2>
            </MaskRevealUp>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {flow.readNext.map((next) => (
                <Link
                  key={next.href}
                  href={next.href}
                  className="group rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5 transition-all hover:-translate-y-0.5 hover:border-brass/50"
                >
                  <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-zinc-100 transition-colors group-hover:text-brass">
                    {next.title} <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-1 block text-[12px] leading-relaxed text-zinc-400">{next.why}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="wiki-reveal mt-8" style={{ animationDelay: '420ms' }} aria-label="Knowledge graph relations">
            <MaskRevealUp whileInView>
              <h2 className="mb-3 text-lg font-bold text-zinc-100">Connected concepts</h2>
            </MaskRevealUp>
            <div className="flex flex-wrap gap-2">
              {related.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/wiki/${rel.id}`}
                  className="wiki-pop-item inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1.5 text-[12.5px] text-zinc-300 transition-all hover:-translate-y-0.5 hover:border-brass/60 hover:text-zinc-100"
                  style={{ animationDelay: `${240 + related.indexOf(rel) * 70}ms` }}
                >
                  {rel.title} <ArrowRight size={12} />
                </Link>
              ))}
              <Link
                href="/wiki/graph"
                className="wiki-pop-item inline-flex items-center gap-1.5 rounded-full border border-violet-600/50 px-3 py-1.5 text-[12.5px] text-violet-300 transition-all hover:-translate-y-0.5 hover:border-violet-400"
                style={{ animationDelay: `${240 + related.length * 70}ms` }}
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
                className="group flex flex-col gap-1 rounded-xl border border-zinc-800 p-4 transition-all hover:-translate-y-0.5 hover:border-brass/50"
              >
                <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  <ArrowLeft size={12} className="transition-transform group-hover:-translate-x-0.5" /> Previous
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
                className="group flex flex-col items-end gap-1 rounded-xl border border-zinc-800 p-4 text-right transition-all hover:-translate-y-0.5 hover:border-brass/50 sm:col-start-2"
              >
                <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Next <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
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
            <nav className="max-h-[70vh] space-y-0.5 overflow-y-auto">
              {toc.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={`toc-link block rounded-r py-0.5 text-[12px] leading-snug transition-colors hover:text-zinc-100 ${
                    activeHeading === heading.id ? 'toc-active' : ''
                  } ${heading.level === 1 ? 'font-medium text-zinc-300' : 'text-zinc-500'}`}
                >
                  {heading.text}
                </a>
              ))}
            </nav>
          </aside>
        )}
        </div>
      </FocusBlurResolve>
    </div>
  );
}

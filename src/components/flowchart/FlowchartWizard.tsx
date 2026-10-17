'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { compressToEncodedURIComponent } from 'lz-string';
import { AlertTriangle, ArrowLeft, BookOpen, Check, ClipboardCopy, Play, RotateCcw, Sparkles } from '@/components/ui/icons';
import {
  FLOWCHART_LEAVES,
  FLOWCHART_START_ID,
  FLOWCHART_STEPS,
  getFlowchartStep,
  type FlowchartLeaf,
} from '@/data/designFlowchart';
import { ENCYCLOPEDIA_MAP } from '@/data/encyclopediaData';
import { SCENE_VERSION, useCanvasStore } from '@/store/useCanvasStore';

/**
 * Interactive design flowchart (Union Blueprint §5.1).
 *
 * Walks the decision tree question by question, then hands the learner one of
 * sixteen canonical patterns with a fully wired, 1-click canvas preset — every
 * node comes from the seed catalog, so the simulator runs it immediately.
 * A leaf can also be shared as a compressed /s link (< ~30 KB by design).
 */

interface TrailEntry {
  label: string;
  stepId: string;
}

function presetToScenePayload(leaf: FlowchartLeaf) {
  return {
    version: SCENE_VERSION,
    nodes: leaf.presetNodes.map((n) => ({
      id: n.id,
      position: { x: n.x, y: n.y },
      resourceId: n.resourceId,
      label: n.label,
      overrides: n.overrides ?? {},
    })),
    edges: leaf.presetEdges.map((e) => ({
      id: `e_${e.source}_${e.target}`,
      source: e.source,
      target: e.target,
    })),
  };
}

export function FlowchartWizard() {
  const router = useRouter();
  const [currentId, setCurrentId] = useState(FLOWCHART_START_ID);
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const step = useMemo(() => getFlowchartStep(currentId) ?? FLOWCHART_STEPS[FLOWCHART_START_ID]!, [currentId]);

  const choose = (label: string, next: string) => {
    setTrail((t) => [...t, { label, stepId: currentId }]);
    setCurrentId(next);
    setShareState('idle');
  };

  const jumpTo = (leafId: string) => {
    setTrail([]);
    setCurrentId(leafId);
    setShareState('idle');
  };

  const goBack = () => {
    const last = trail[trail.length - 1];
    if (!last) return;
    setTrail((t) => t.slice(0, -1));
    setCurrentId(last.stepId);
    setShareState('idle');
  };

  const startOver = () => {
    setTrail([]);
    setCurrentId(FLOWCHART_START_ID);
    setShareState('idle');
  };

  const openInCanvas = (leaf: FlowchartLeaf) => {
    const store = useCanvasStore.getState();
    const loaded = store.deserializeScene(JSON.stringify(presetToScenePayload(leaf)));
    if (!loaded) return;
    store.setSceneName(leaf.patternName);
    router.push('/canvas');
  };

  const copyShareLink = async (leaf: FlowchartLeaf) => {
    try {
      const encoded = compressToEncodedURIComponent(JSON.stringify(presetToScenePayload(leaf)));
      const url = `${window.location.origin}/s#${encoded}`;
      await navigator.clipboard.writeText(url);
      setShareState('copied');
    } catch {
      setShareState('failed');
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-sky-400/80">DESIGN FLOWCHART</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-zinc-100">
          From a vague idea to a wired architecture
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Answer one question at a time. At the end you get a canonical pattern, its failure modes, the concepts behind
          it — and a canvas preset you can load and simulate in one click.
        </p>
      </header>

      {trail.length > 0 && (
        <nav aria-label="Your answers" className="mb-6 flex flex-wrap items-center gap-2 text-[12px] text-zinc-500">
          <button
            type="button"
            onClick={startOver}
            className="inline-flex items-center gap-1 rounded-full border border-zinc-700/70 px-3 py-1 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Start over
          </button>
          {trail.map((entry, i) => (
            <span key={`${entry.stepId}-${i}`} className="inline-flex items-center gap-2">
              <span className="text-zinc-600">→</span>
              <span className="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1">{entry.label}</span>
            </span>
          ))}
        </nav>
      )}

      {step.kind === 'question' ? (
        <section
          className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
          aria-live="polite"
        >
          <h2 className="font-display text-xl font-semibold text-zinc-100">{step.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.prompt}</p>
          <div className="mt-6 grid gap-3">
            {step.options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => choose(option.label, option.next)}
                className="group flex items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3.5 text-left transition hover:border-sky-500/50 hover:bg-sky-500/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
              >
                <span>
                  <span className="block text-sm font-medium text-zinc-100 group-hover:text-sky-200">{option.label}</span>
                  <span className="mt-1 block text-[12.5px] leading-relaxed text-zinc-500">{option.detail}</span>
                </span>
                <ArrowLeft className="mt-1 h-4 w-4 shrink-0 rotate-180 text-zinc-600 transition group-hover:text-sky-400" aria-hidden />
              </button>
            ))}
          </div>
          {trail.length > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="mt-5 inline-flex items-center gap-1.5 text-[12px] text-zinc-500 transition hover:text-zinc-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Previous question
            </button>
          )}
        </section>
      ) : (
        <LeafPanel
          leaf={step}
          shareState={shareState}
          onOpenCanvas={() => openInCanvas(step)}
          onCopyLink={() => void copyShareLink(step)}
          onBack={trail.length > 0 ? goBack : startOver}
        />
      )}

      <section className="mt-12">
        <h2 className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500">ALL {FLOWCHART_LEAVES.length} PATTERNS</h2>
        <p className="mt-2 text-[12.5px] text-zinc-500">
          Already know where you're headed? Jump straight to a pattern — every card is a complete, runnable preset.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FLOWCHART_LEAVES.map((leaf) => (
            <button
              key={leaf.id}
              type="button"
              onClick={() => jumpTo(leaf.id)}
              className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-3.5 py-3 text-left transition hover:border-zinc-600 hover:bg-zinc-900/70"
            >
              <span className="block text-[13px] font-medium text-zinc-200">{leaf.patternName}</span>
              <span className="mt-0.5 block text-[11.5px] text-zinc-500">{leaf.tagline}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function LeafPanel({
  leaf,
  shareState,
  onOpenCanvas,
  onCopyLink,
  onBack,
}: {
  leaf: FlowchartLeaf;
  shareState: 'idle' | 'copied' | 'failed';
  onOpenCanvas: () => void;
  onCopyLink: () => void;
  onBack: () => void;
}) {
  return (
    <section className="rounded-2xl border border-sky-500/30 bg-gradient-to-b from-sky-500/[0.06] to-zinc-950/60 p-6" aria-live="polite">
      <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.18em] text-sky-400">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        YOUR PATTERN
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-zinc-50">{leaf.patternName}</h2>
      <p className="mt-1 font-mono text-[12px] text-sky-300/90">{leaf.tagline}</p>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-300">{leaf.summary}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.18em] text-amber-400/90">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            WATCH OUT FOR
          </h3>
          <ul className="mt-3 space-y-2.5">
            {leaf.watchouts.map((w) => (
              <li key={w} className="flex gap-2 text-[12.5px] leading-relaxed text-zinc-400">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400/80" aria-hidden />
                {w}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.18em] text-zinc-500">
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            CONCEPTS BEHIND IT
          </h3>
          <ul className="mt-3 space-y-2">
            {leaf.wikiConceptIds.map((id) => (
              <li key={id}>
                <Link
                  href={`/wiki/${id}`}
                  className="inline-flex items-center gap-1.5 text-[12.5px] text-sky-400 transition hover:text-sky-300"
                >
                  {ENCYCLOPEDIA_MAP[id]?.title ?? id}
                  <ArrowLeft className="h-3 w-3 rotate-180" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11.5px] leading-relaxed text-zinc-600">
            {leaf.presetNodes.length} nodes · {leaf.presetEdges.length} edges · runs on the seeded Web Worker simulator with zero
            configuration.
          </p>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onOpenCanvas}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          <Play className="h-4 w-4" aria-hidden />
          Open preset in Canvas
        </button>
        <button
          type="button"
          onClick={onCopyLink}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-50"
        >
          {shareState === 'copied' ? <Check className="h-4 w-4 text-emerald-400" aria-hidden /> : <ClipboardCopy className="h-4 w-4" aria-hidden />}
          {shareState === 'copied' ? 'Link copied' : 'Copy share link'}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 transition hover:text-zinc-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </button>
        {shareState === 'failed' && <span className="text-[11.5px] text-amber-400">Clipboard blocked — copy from the URL bar instead.</span>}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-zinc-600">
        Opening a preset replaces your current canvas — <kbd className="rounded border border-zinc-700 px-1">Ctrl/⌘ Z</kbd>{' '}
        restores it. Share links carry the whole topology in the URL fragment and open read-only on the{' '}
        <Link href="/s" className="text-zinc-400 underline decoration-dotted hover:text-zinc-200">
          share viewer
        </Link>{' '}
        — nothing is uploaded anywhere.
      </p>
    </section>
  );
}

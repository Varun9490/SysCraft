'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Play,
  Trophy,
  Wrench,
} from '@/components/ui/icons';
import { Reveal, StaggerChild, StaggerGroup } from '@/components/ui/motion';
import { START_STEPS, type StartPhase } from '@/data/startHere';
import { useStartStore } from '@/store/useStartStore';

const PHASE_TONE: Record<StartPhase, { text: string; ring: string; chip: string }> = {
  Learn: { text: 'text-brass', ring: 'border-brass/40 bg-brass/10', chip: 'border-brass/30 bg-brass/10 text-brass' },
  Build: {
    text: 'text-[#6E96A8]',
    ring: 'border-[#6E96A8]/40 bg-[#6E96A8]/10',
    chip: 'border-[#6E96A8]/30 bg-[#6E96A8]/10 text-[#6E96A8]',
  },
  Break: {
    text: 'text-[#C58F4A]',
    ring: 'border-[#C58F4A]/40 bg-[#C58F4A]/10',
    chip: 'border-[#C58F4A]/30 bg-[#C58F4A]/10 text-[#C58F4A]',
  },
  Reinforce: {
    text: 'text-[#7E9A6A]',
    ring: 'border-[#7E9A6A]/40 bg-[#7E9A6A]/10',
    chip: 'border-[#7E9A6A]/30 bg-[#7E9A6A]/10 text-[#7E9A6A]',
  },
};

const PHASE_ICON: Record<StartPhase, typeof BookOpen> = {
  Learn: BookOpen,
  Build: Play,
  Break: Wrench,
  Reinforce: Trophy,
};

export function StartPageContent() {
  const completed = useStartStore((s) => s.completed);
  const hydrate = useStartStore((s) => s.hydrate);
  const toggle = useStartStore((s) => s.toggle);
  const reset = useStartStore((s) => s.reset);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const doneCount = START_STEPS.filter((s) => completed.includes(s.id)).length;
  const total = START_STEPS.length;
  const pct = Math.round((doneCount / total) * 100);
  const nextStep = START_STEPS.find((s) => !completed.includes(s.id)) ?? START_STEPS[START_STEPS.length - 1];
  const allDone = doneCount === total;
  const totalMinutes = START_STEPS.reduce((sum, s) => sum + s.minutes, 0);

  return (
    <div className="section-container py-14 md:py-20">
      <Reveal>
        <div className="max-w-3xl">
          <span className="eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-brass" />
            Guided start
          </span>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-content md:text-5xl">
            Go from zero to a system you can <span className="text-brass">break on purpose</span>
          </h1>
          <p className="mt-5 text-pretty text-[15px] leading-relaxed text-content-secondary">
            Eight steps, about {totalMinutes} minutes, in the order that actually builds intuition. Read one idea, move
            the dials on it, load a real architecture, run it, then break it and read the post-mortem.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-10 grid gap-6 rounded-2xl border border-line bg-app/50 p-6 shadow-card md:grid-cols-[1.4fr_1fr] md:p-8">
          <div>
            <div className="flex items-center justify-between text-[12px] font-medium text-content-secondary">
              <span>Your progress</span>
              <span className="tabular-nums">
                {doneCount} / {total} steps
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-app-raised">
              <div
                className="h-full rounded-full bg-brass transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href={nextStep.href}
                className="group inline-flex items-center gap-2 rounded-full bg-brass px-4 py-2 text-[13px] font-semibold text-zinc-950 transition-transform hover:scale-[1.03]"
              >
                {allDone ? 'Back to the canvas' : `Continue: ${nextStep.title}`}
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              {doneCount > 0 && (
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-full border border-line px-3.5 py-2 text-[12px] font-medium text-content-secondary transition-colors hover:border-line-strong hover:text-content"
                >
                  Reset progress
                </button>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-app-raised/60 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">The loop</p>
            <ul className="mt-3 space-y-2 text-[13px] text-content-secondary">
              <li className="flex items-center gap-2">
                <BookOpen size={14} className="text-brass" /> Read the concept
              </li>
              <li className="flex items-center gap-2">
                <Play size={14} className="text-[#6E96A8]" /> Build it on the canvas
              </li>
              <li className="flex items-center gap-2">
                <Wrench size={14} className="text-[#C58F4A]" /> Break it on purpose
              </li>
              <li className="flex items-center gap-2">
                <Trophy size={14} className="text-[#7E9A6A]" /> Reinforce with a lab
              </li>
            </ul>
          </div>
        </div>
      </Reveal>

      <StaggerGroup className="mt-10 flex flex-col gap-3" stagger={0.05}>
        {START_STEPS.map((step, index) => {
          const done = completed.includes(step.id);
          const tone = PHASE_TONE[step.phase];
          const Icon = PHASE_ICON[step.phase];
          return (
            <StaggerChild key={step.id}>
              <div
                className={`group relative flex items-start gap-4 rounded-2xl border p-5 transition-colors ${
                  done ? 'border-brass/30 bg-app-raised/50' : 'border-line bg-app/50 hover:border-line-strong'
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-[13px] font-semibold tabular-nums ${
                    done ? 'border-brass/40 bg-brass/15 text-brass' : tone.ring + ' ' + tone.text
                  }`}
                >
                  {done ? <Check size={18} weight="bold" /> : String(index + 1).padStart(2, '0')}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${tone.chip}`}>
                      <Icon size={11} weight="bold" />
                      {step.phase}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-content-tertiary">
                      <Clock size={11} /> {step.minutes} min
                    </span>
                  </div>
                  <h2 className={`mt-2 text-[15px] font-semibold ${done ? 'text-content' : 'text-content'}`}>
                    {step.title}
                  </h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-content-secondary">{step.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Link
                      href={step.href}
                      className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${tone.text}`}
                    >
                      {step.cta}
                      <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggle(step.id)}
                      className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                        done
                          ? 'border-brass/40 bg-brass/10 text-brass'
                          : 'border-line text-content-secondary hover:border-line-strong hover:text-content'
                      }`}
                    >
                      {done ? 'Done' : 'Mark done'}
                    </button>
                  </div>
                </div>
              </div>
            </StaggerChild>
          );
        })}
      </StaggerGroup>
    </div>
  );
}

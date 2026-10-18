'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Clock, Sparkles, Trophy } from '@/components/ui/icons';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/HoverCard';
import { ACCENTS, LIBRARY_RESOURCES, TRACK_LABELS, type LibraryTrack } from '@/data/learningHub';

type TrackFilter = LibraryTrack | 'all';

const FILTERS: Array<{ id: TrackFilter; label: string }> = [
  { id: 'all', label: 'Everything' },
  { id: 'dsa', label: 'DSA' },
  { id: 'system-design', label: 'System design' },
  { id: 'cs-fundamentals', label: 'CS fundamentals' },
  { id: 'backend', label: 'Backend' },
  { id: 'ai', label: 'AI engineering' },
  { id: 'devops', label: 'DevOps' },
  { id: 'cloud', label: 'Cloud' },
  { id: 'language', label: 'Languages' },
  { id: 'api', label: 'APIs' },
  { id: 'open-source', label: 'Open source' },
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function LibraryGrid() {
  const [filter, setFilter] = useState<TrackFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const visible = useMemo(
    () => (filter === 'all' ? LIBRARY_RESOURCES : LIBRARY_RESOURCES.filter((r) => r.track === filter)),
    [filter],
  );

  const toggleDone = (id: string) => {
    setDone((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((chip) => (
          <motion.button
            key={chip.id}
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => setFilter(chip.id)}
            className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              filter === chip.id
                ? chip.id === 'all'
                  ? 'border-zinc-500 bg-zinc-100 text-zinc-950'
                  : 'border-brass/50 bg-brass/10 text-brass'
                : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
            }`}
          >
            {chip.label}
          </motion.button>
        ))}
      </div>

      <motion.div layout className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((resource, i) => {
            const accent = ACCENTS[resource.accent] ?? ACCENTS.sky;
            const expanded = openId === resource.id;
            const isDone = done[resource.id] === true;
            return (
              <motion.article
                layout
                key={resource.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.18) }}
                whileHover={{ y: -4 }}
                className={`relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 transition-shadow ${accent.glow} ${
                  isDone ? 'opacity-70' : ''
                }`}
              >
                <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${accent.bar}`} />
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold ${accent.chip}`}>
                      {TRACK_LABELS[resource.track]}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10.5px] text-zinc-500">
                      <Clock size={10} /> {resource.hours}
                    </span>
                  </div>

                  <h3 className="mt-2.5 text-[15px] font-bold leading-tight text-zinc-100">{resource.name}</h3>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-0.5 inline-flex w-fit items-center gap-1 text-[11px] text-zinc-500 hover:text-brass"
                  >
                    {hostOf(resource.url)} <ArrowRight size={10} className="-rotate-45" />
                  </a>

                  <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-400">{resource.blurb}</p>

                  {/* The hover-card body — why this source */}
                  <div className="mt-2.5">
                    <HoverCard side="top">
                      <HoverCardTrigger>
                        <span
                          className="inline-flex cursor-help items-center gap-1 text-[11.5px] font-medium text-zinc-300 underline decoration-dotted decoration-zinc-600 underline-offset-2 hover:text-brass"
                          aria-label={`Why ${resource.name}`}
                        >
                          Why this pick
                        </span>
                      </HoverCardTrigger>
                      <HoverCardContent widthClass="w-72">
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-brass">Why this pick</p>
                        <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-300">{resource.why}</p>
                        <p className="mt-2 border-t border-zinc-800 pt-2 text-[11px] text-zinc-500">
                          Best for: {resource.bestFor}
                        </p>
                      </HoverCardContent>
                    </HoverCard>
                  </div>

                  {/* Syllabus */}
                  <button
                    type="button"
                    onClick={() => setOpenId(expanded ? null : resource.id)}
                    className="mt-2 w-fit text-[11.5px] font-medium text-zinc-500 transition-colors hover:text-zinc-200"
                    aria-expanded={expanded}
                  >
                    {expanded ? 'Hide syllabus' : 'Syllabus inside'} ▾
                  </button>
                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="mt-1 space-y-1 overflow-hidden"
                      >
                        {resource.syllabus.map((line) => (
                          <li key={line} className="flex gap-1.5 text-[11.5px] leading-relaxed text-zinc-500">
                            <span className={`mt-0.5 h-1 w-1 shrink-0 rounded-full bg-current`} aria-hidden />
                            {line}
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>

                  <div className="mt-3 flex flex-1 flex-wrap items-end justify-between gap-2 border-t border-zinc-800/80 pt-3">
                    <Link
                      href={resource.pairWith.href}
                      className={`group inline-flex items-center gap-1.5 text-[11.5px] font-medium ${accent.text}`}
                      title={`Open ${resource.pairWith.label} to practice after reading`}
                    >
                      <Sparkles size={11} /> {resource.pairWith.label}
                      <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleDone(resource.id)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        isDone
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                          : 'border-zinc-700 text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-300'
                      }`}
                      title="Mark this source as done (device-local)"
                    >
                      {isDone ? <Check size={11} /> : <Trophy size={11} />}
                      {isDone ? 'Done' : 'Mark done'}
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </motion.div>

      <p className="text-[12px] leading-relaxed text-zinc-600">
        These are free, first-party or canonical sources — picked so every one pairs with something you can build or
        simulate in SysCraft right after you read. “Why this pick” explains what earns each one shelf space; follow the
        sparkles to the matching interactive companion.
      </p>
    </div>
  );
}

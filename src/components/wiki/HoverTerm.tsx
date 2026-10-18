'use client';

import Link from 'next/link';
import { ArrowRight } from '@/components/ui/icons';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/HoverCard';
import { GLOSSARY_MAP, type GlossaryEntry } from '@/data/glossary';

/**
 * Maps a jargon word in prose to its meaning: dotted underline opens the
 * shadcn-style hover card with the one-sentence definition and, when the
 * glossary ships a module link, a deep jump into the full lesson.
 */
export function HoverTerm({ term }: { term: string }) {
  const entry: GlossaryEntry | undefined = GLOSSARY_MAP[term.toLowerCase()];
  if (!entry) return <>{term}</>;

  return (
    <HoverCard delay={90} closeDelay={140}>
      <HoverCardTrigger>
        <span className="glossary-term">{term}</span>
      </HoverCardTrigger>
      <HoverCardContent align={term.length > 11 ? 'start' : 'center'} widthClass={term.length > 19 ? 'w-72' : 'w-64'}>
        <span className="pointer-events-none block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brass">
          In plain words
        </span>
        <span className="mt-1 block text-[12.5px] leading-relaxed text-zinc-300">{entry.meaning}</span>
        {entry.href ? (
          <span className="mt-1.5 block">
            <Link
              href={entry.href}
              className="pointer-events-auto inline-flex items-center gap-1 text-[11.5px] font-medium text-sky-300 hover:text-sky-200"
            >
              Open the full lesson <ArrowRight size={11} />
            </Link>
          </span>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  );
}

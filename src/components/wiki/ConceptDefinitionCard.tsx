'use client';

import { CONCEPT_DEFINITION_MAP, type ConceptDefinition, type ConceptSource } from '@/data/conceptSources';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/HoverCard';

/**
 * The per-module definition component: one breathable plain-English act
 * definition above the fold, then the canonical source chain — each with a
 * hover-card preview ("why this source") and an external jump.
 */
export function ConceptDefinitionCard({ definition }: { definition: ConceptDefinition }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Definition</p>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-200">{definition.definition}</p>
      <p className="mt-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
        Where this information comes from
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {definition.sources.map((source) => (
          <li key={source.url} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="text-[10px] text-zinc-600">§</span>
            <SourceEntry source={source} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourceEntry({ source }: { source: ConceptSource }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-1.5">
      <HoverCard delay={80} closeDelay={120}>
        <HoverCardTrigger>
          <span className="glossary-term">{source.label}</span>
        </HoverCardTrigger>
        <HoverCardContent align="start" widthClass="w-64">
          <span className="pointer-events-none block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brass">
            Why this source
          </span>
          <span className="mt-1 block text-[12.5px] leading-relaxed text-zinc-300">{source.note}</span>
        </HoverCardContent>
      </HoverCard>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10.5px] text-sky-300 transition-colors hover:text-sky-200"
        aria-label={`Open source: ${source.label}`}
      >
        ↗
      </a>
    </span>
  );
}

export { CONCEPT_DEFINITION_MAP };

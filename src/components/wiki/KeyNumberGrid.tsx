'use client';

import type { KeyNumber } from '@/types/encyclopedia';

/**
 * Renders an encyclopedia module's memorizable anchor numbers as oversized
 * tabular tiles. Values are teaching anchors, never vendor benchmarks — the
 * disclaimer lives with the section that mounts this.
 */

export function KeyNumberGrid({ numbers }: { numbers: KeyNumber[] }) {
  if (numbers.length === 0) return null;
  return (
    <div className="wiki-pop grid gap-3 sm:grid-cols-3" role="list" aria-label="Key numbers from this module">
      {numbers.map((n, i) => (
        <div
          key={n.label}
          role="listitem"
          className="wiki-pop-item group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 transition-colors hover:border-brass/50"
          style={{ animationDelay: `${i * 90}ms` }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute -right-4 -top-6 text-[64px] font-bold leading-none text-brass/[0.06] transition-transform duration-500 group-hover:scale-110">
            {i + 1}
          </div>
          <p className="relative text-[22px] font-bold leading-tight tracking-tight text-brass-bright">{n.value}</p>
          <p className="relative mt-1 text-[12.5px] font-medium leading-snug text-zinc-200">{n.label}</p>
          {n.note && <p className="relative mt-1.5 text-[11.5px] leading-relaxed text-zinc-500">{n.note}</p>}
        </div>
      ))}
    </div>
  );
}

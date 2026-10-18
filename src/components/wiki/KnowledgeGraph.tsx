'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ENCYCLOPEDIA_MODULES } from '@/data/encyclopediaData';
import type { EncyclopediaModule } from '@/types/encyclopedia';
import { useLearningStore } from '@/store/useLearningStore';

/**
 * Knowledge graph of the encyclopedia.
 *
 * Nodes are concept modules, edges are `relatedModuleIds` relations. Layout is
 * deterministic: three columns by difficulty, stable alphabetical order inside
 * each column, so the same graph renders identically every time. Node fill
 * intensity tracks FSRS mastery (mean stability of that module's cards):
 * grey = untouched, amber = in review, emerald = mastered.
 */

const COLUMN_BY_DIFFICULTY: Record<EncyclopediaModule['difficulty'], number> = {
  foundations: 0,
  intermediate: 1,
  advanced: 2,
};

const WIDTH = 980;
const NODE_R = 26;
const COLUMN_X = [140, 490, 840];
const TOP_Y = 90;
const ROW_GAP = 96;

interface Placed {
  module: EncyclopediaModule;
  x: number;
  y: number;
}

function masteryOf(module: EncyclopediaModule, cards: Record<string, { stability: number }>, cardModule: Record<string, string>): number {
  const stabilities: number[] = [];
  for (const [cardId, card] of Object.entries(cards)) {
    if (cardModule[cardId] === module.id) stabilities.push(card.stability);
  }
  if (stabilities.length === 0) return 0;
  const mean = stabilities.reduce((sum, s) => sum + s, 0) / stabilities.length;
  return Math.min(1, mean / 21); // 21+ day stability counts as mastered
}

export function KnowledgeGraph() {
  const cards = useLearningStore((s) => s.cards);
  const cardModule = useLearningStore((s) => s.cardModule);

  const placed = useMemo<Placed[]>(() => {
    const byColumn = new Map<number, EncyclopediaModule[]>();
    for (const module of ENCYCLOPEDIA_MODULES) {
      const column = COLUMN_BY_DIFFICULTY[module.difficulty];
      const list = byColumn.get(column) ?? [];
      list.push(module);
      byColumn.set(column, list);
    }
    const result: Placed[] = [];
    for (const [column, modules] of [...byColumn.entries()].sort((a, b) => a[0] - b[0])) {
      const sorted = [...modules].sort((a, b) => a.title.localeCompare(b.title));
      sorted.forEach((module, row) => {
        result.push({ module, x: COLUMN_X[column] ?? 140, y: TOP_Y + row * ROW_GAP });
      });
    }
    return result;
  }, []);

  const positionById = useMemo(() => {
    const map = new Map<string, Placed>();
    for (const p of placed) map.set(p.module.id, p);
    return map;
  }, [placed]);

  const edges = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ key: string; from: Placed; to: Placed }> = [];
    for (const p of placed) {
      for (const relatedId of p.module.relatedModuleIds) {
        const other = positionById.get(relatedId);
        if (!other) continue;
        const key = [p.module.id, relatedId].sort().join('~');
        if (seen.has(key)) continue;
        seen.add(key);
        list.push({ key, from: p, to: other });
      }
    }
    return list;
  }, [placed, positionById]);

  const height = Math.max(...placed.map((p) => p.y)) + TOP_Y;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          className="h-auto w-full min-w-[720px]"
          role="img"
          aria-label="Knowledge graph of SysCraft encyclopedia concepts grouped by difficulty"
        >
          {[0, 1, 2].map((column) => (
            <text
              key={column}
              x={COLUMN_X[column]}
              y={44}
              textAnchor="middle"
              className="fill-zinc-500 text-[15px] font-semibold uppercase"
              style={{ letterSpacing: '0.1em', fontSize: 17 }}
            >
              {['Foundations', 'Intermediate', 'Advanced'][column]}
            </text>
          ))}

          {edges.map(({ key, from, to }) => (
            <path
              key={key}
              d={`M ${from.x} ${from.y} C ${(from.x + to.x) / 2} ${from.y}, ${(from.x + to.x) / 2} ${to.y}, ${to.x} ${to.y}`}
              fill="none"
              stroke="rgba(148,163,184,0.28)"
              strokeWidth={1.4}
              strokeDasharray={from.module.difficulty === to.module.difficulty ? undefined : '5 4'}
            />
          ))}

          {placed.map(({ module, x, y }, i) => {
            const mastery = masteryOf(module, cards, cardModule);
            const fill = mastery === 0 ? 'rgba(63,63,70,0.85)' : mastery < 0.6 ? 'rgba(217,153,68,0.85)' : 'rgba(52,211,153,0.85)';
            return (
              <g
                key={module.id}
                className="wiki-graph-node"
                style={{ animationDelay: `${120 + i * 40}ms`, '--gx': `${x}px`, '--gy': `${y}px` } as React.CSSProperties}
              >
                <Link href={`/wiki/${module.id}`} aria-label={`Open ${module.title} concept page`}>
                  <circle r={NODE_R} fill={fill} stroke="rgba(113,113,122,0.7)" strokeWidth={1.2} className="cursor-pointer" />
                  <title>{`${module.title} — click to read`}</title>
                  <text
                    y={NODE_R + 16}
                    textAnchor="middle"
                    style={{ fontSize: 12.5 }}
                    className="wiki-graph-label pointer-events-none fill-zinc-300"
                  >
                    {module.title.length > 22 ? `${module.title.slice(0, 21)}…` : module.title}
                  </text>
                </Link>
              </g>
            );
          })}
        </svg>
      </div>

      <aside className="w-full shrink-0 space-y-4 lg:w-72">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Legend</h3>
          <ul className="mt-3 space-y-2 text-[12.5px] text-zinc-300">
            <li className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: 'rgba(63,63,70,0.85)' }} /> Not reviewed yet
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: 'rgba(217,153,68,0.85)' }} /> In spaced review
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: 'rgba(52,211,153,0.85)' }} /> Mastered (21+ day stability)
            </li>
            <li className="flex items-center gap-2">
              <span className="h-px w-6 border-t border-dashed border-zinc-500" /> Cross-difficulty relation
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Practice this graph</h3>
          <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-400">
            {Object.keys(cards).length === 0
              ? 'Read any concept and grade a few recall items — mastery shading appears here within one session.'
              : `${Object.keys(cards).length} review items tracked across ${new Set(Object.values(cardModule)).size} modules.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/practice"
              className="rounded-full border border-emerald-500/40 px-3 py-1.5 text-[12px] text-emerald-300 transition-colors hover:border-emerald-400"
            >
              Open review queue
            </Link>
            <Link
              href="/wiki"
              className="rounded-full border border-zinc-700 px-3 py-1.5 text-[12px] text-zinc-300 transition-colors hover:border-zinc-500"
            >
              Browse all concepts
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

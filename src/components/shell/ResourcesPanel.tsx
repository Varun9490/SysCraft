'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, FlaskConical, Plus, Search, Wrench } from "@/components/ui/icons";
import { CATEGORY_ICON } from "@/components/canvas/ResourceNode";
import { SEED_RESOURCES } from "@/data/seedResources";
import { listRegisteredCustomResources } from "@/store/customResourceRegistry";
import { useCanvasStore } from "@/store/useCanvasStore";
import type { ResourceCategory } from "@/types/resource";

/**
 * Searchable, category-grouped palette of every canvas primitive. Categories
 * collapse so the rail reads as a compact index instead of a 48-row wall.
 * User-authored primitives from the Custom Resource Studio surface in a
 * dedicated "Your primitives" group on top.
 */

const CATEGORY_ORDER: ResourceCategory[] = [
  "edge",
  "api",
  "compute",
  "serverless",
  "cache",
  "database",
  "storage",
  "search",
  "vector_db",
  "messaging",
  "streaming",
  "ai_llm",
  "network",
  "security",
  "observability",
];

function prettyCategory(category: string): string {
  return category.replace(/_/g, " ");
}

export function ResourcesPanel() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set(["edge", "compute", "__custom__"]));
  const [customs, setCustoms] = useState(() => listRegisteredCustomResources());

  const refreshCustoms = useCallback(() => {
    setCustoms(listRegisteredCustomResources());
  }, []);

  // Custom Resource Studio saves dispatch this event; also re-read once after
  // the async IndexedDB hydration completes.
  useEffect(() => {
    window.addEventListener("syscraft-custom-resources-changed", refreshCustoms);
    const timer = window.setTimeout(refreshCustoms, 600);
    return () => {
      window.removeEventListener("syscraft-custom-resources-changed", refreshCustoms);
      window.clearTimeout(timer);
    };
  }, [refreshCustoms]);

  const trimmed = query.trim().toLowerCase();

  type PaletteItem = { id: string; name: string; strokeColor: string; category: ResourceCategory };
  type PaletteGroup = { category: string; items: PaletteItem[] };

  const grouped = useMemo<PaletteGroup[]>(() => {
    const core: PaletteGroup[] = CATEGORY_ORDER.map((category) => ({
      category,
      items: SEED_RESOURCES.filter((r) => r.category === category).map(
        (r): PaletteItem => ({ id: r.id, name: r.name, strokeColor: r.strokeColor, category: r.category }),
      ),
    })).filter((group) => group.items.length > 0);
    if (customs.length === 0) return core;
    return [
      ...core,
      {
        category: "__custom__",
        items: customs.map(
          (c): PaletteItem => ({
            id: c.id,
            name: c.name,
            strokeColor: c.strokeColor,
            category: c.category,
          }),
        ),
      },
    ];
  }, [customs]);

  const filtered = useMemo<PaletteItem[]>(() => {
    if (!trimmed) return [];
    const all: PaletteItem[] = [
      ...SEED_RESOURCES.map(
        (r): PaletteItem => ({ id: r.id, name: r.name, strokeColor: r.strokeColor, category: r.category }),
      ),
      ...customs.map(
        (c): PaletteItem => ({ id: c.id, name: c.name, strokeColor: c.strokeColor, category: c.category }),
      ),
    ];
    return all.filter(
      (r) =>
        r.name.toLowerCase().includes(trimmed) ||
        r.category.toLowerCase().includes(trimmed) ||
        r.id.toLowerCase().includes(trimmed),
    );
  }, [trimmed, customs]);

  const addNode = (resourceId: string, name: string) => {
    const count = useCanvasStore.getState().nodes.length;
    useCanvasStore
      .getState()
      .addNode(resourceId, { x: 120 + (count % 8) * 48, y: 120 + (count % 8) * 36 }, name);
  };

  const toggle = (category: string) => {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const renderRow = (resource: PaletteItem) => {
    const Icon = CATEGORY_ICON[resource.category] ?? FlaskConical;
    return (
      <button
        key={resource.id}
        type="button"
        onClick={() => addNode(resource.id, resource.name)}
        className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-zinc-800/70"
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `${resource.strokeColor}22`, color: resource.strokeColor }}
        >
          <Icon size={13} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-zinc-200">{resource.name}</span>
        <Plus size={13} className="shrink-0 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    );
  };

  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-zinc-950/60">
      <div className="sticky top-0 z-10 border-b border-zinc-800/60 bg-zinc-950/90 px-3 py-2 backdrop-blur">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${SEED_RESOURCES.length} primitives…`}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/70 py-2 pl-8 pr-3 text-[13px] text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-600"
          />
        </div>
      </div>

      <div className="px-2 py-2">
        {trimmed ? (
          <>
            {filtered.map(renderRow)}
            {filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-[12px] text-zinc-500">No primitives match “{query}”.</p>
            )}
          </>
        ) : (
          grouped.map(({ category, items }) => {
            const isCustomGroup = category === "__custom__";
            const isOpen = open.has(category);
            const GroupIcon = isCustomGroup ? Wrench : CATEGORY_ICON[category as ResourceCategory] ?? FlaskConical;
            const pretty = isCustomGroup ? "Your primitives" : prettyCategory(category);
            return (
              <div key={category} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggle(category)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-zinc-800/50"
                >
                  <GroupIcon size={13} className="shrink-0 text-zinc-500" />
                  <span
                    className={`flex-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400 ${
                      isCustomGroup ? "text-sky-300/90" : ""
                    }`}
                  >
                    {pretty}
                  </span>
                  <span className="text-[10.5px] tabular-nums text-zinc-600">{items.length}</span>
                  <ChevronDown
                    size={12}
                    className={`shrink-0 text-zinc-600 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}
                  />
                </button>
                {isOpen && <div className="mt-0.5 space-y-0.5 pl-1.5">{items.map(renderRow)}</div>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

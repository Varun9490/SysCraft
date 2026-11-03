'use client';

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "@/components/ui/icons";
import { BLUEPRINTS, BLUEPRINT_CATEGORIES, type Blueprint } from "@/data/blueprints";
import { useCanvasStore } from "@/store/useCanvasStore";

const DIFFICULTY_TONE: Record<Blueprint["difficulty"], string> = {
  beginner: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  intermediate: "text-sky-400 border-sky-500/40 bg-sky-500/10",
  advanced: "text-amber-400 border-amber-500/40 bg-amber-500/10",
  expert: "text-rose-400 border-rose-500/40 bg-rose-500/10",
};

export function CaseStudiesPageContent() {
  const router = useRouter();
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BLUEPRINTS.filter((b) => {
      if (category !== "All" && b.category !== category) return false;
      if (q && !`${b.name} ${b.summary} ${b.highlights.join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [category, query]);

  const open = (blueprint: Blueprint) => {
    try {
      sessionStorage.setItem("syscraft:pendingBlueprint", blueprint.id);
    } catch {
      /* storage disabled — fall back to in-memory load */
    }
    useCanvasStore.getState().loadBlueprintTemplate(blueprint);
    router.push("/canvas");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Case studies</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-content sm:text-4xl">
          Real systems, end to end
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-content-secondary">
          Every case study is a runnable blueprint: the components, the data flow, the failure modes, and the
          trade-offs. Open one on the canvas, then break it with chaos and watch what happens.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-4">
        <label className="relative block">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search case studies — URL shortener, payments, RAG, Kubernetes…"
            className="w-full rounded-xl border border-line bg-app/70 py-3 pl-9 pr-4 text-[14px] text-content placeholder:text-content-tertiary focus:border-brass/50 focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {["All", ...BLUEPRINT_CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                category === c
                  ? "border-brass/50 bg-brass/15 text-brass"
                  : "border-line bg-app/60 text-content-secondary hover:border-line-strong hover:text-content"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((b) => (
          <article key={b.id} className="flex flex-col rounded-2xl border border-line bg-app/50 p-5">
            <div className="flex items-center justify-between gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${DIFFICULTY_TONE[b.difficulty]}`}>
                {b.difficulty}
              </span>
              <span className="text-[11px] text-content-tertiary">{b.category}</span>
            </div>
            <h2 className="mt-3 text-[15px] font-semibold text-content">{b.name}</h2>
            <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-content-secondary">{b.summary}</p>
            <ul className="mt-3 space-y-1">
              {b.highlights.slice(0, 3).map((h) => (
                <li key={h} className="flex gap-1.5 text-[11.5px] text-content-tertiary">
                  <span className="text-brass">·</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[11px] text-content-tertiary">{b.nodes.length} components</span>
              <button
                type="button"
                onClick={() => open(b)}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-brass transition-colors hover:text-brass-bright"
              >
                Open on canvas <ArrowRight size={12} />
              </button>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-10 text-center text-[13px] text-content-tertiary">
          No case studies match. Try another category or search term.
        </p>
      )}

      <div className="mt-10 rounded-2xl border border-line bg-app/40 p-6">
        <h2 className="text-[15px] font-semibold text-content">Want the walkthrough first?</h2>
        <p className="mt-2 text-[13px] text-content-secondary">
          Each lesson explains the mechanism, the numbers, and the trade-off before you touch the canvas.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/learn" className="inline-flex items-center gap-1.5 rounded-full bg-brass px-4 py-2 text-[13px] font-semibold text-ink">
            Open the curriculum <ArrowRight size={13} />
          </Link>
          <Link href="/labs" className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[13px] font-medium text-content">
            Try a graded lab
          </Link>
        </div>
      </div>
    </div>
  );
}

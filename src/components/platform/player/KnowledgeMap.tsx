'use client';

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Plus, RotateCcw, Search } from "@/components/ui/icons";
import { BLOGS, TRACKS, getTrack } from "@/content/platform/registry";
import { PLATFORM_LABS } from "@/learning/platform/labCatalog";
import { useLearnerPlatformStore } from "@/store/useLearnerPlatformStore";
import type { Lesson, Track } from "@/learning/platform/types";

const STAGE_WIDTH = 920;
const STAGE_HEIGHT = 560;

/** Hand-placed constellation: foundations at the centre, six branches around it. */
const POSITIONS: Array<{ x: number; y: number }> = [
  { x: 460, y: 282 },
  { x: 176, y: 116 },
  { x: 752, y: 116 },
  { x: 172, y: 446 },
  { x: 470, y: 470 },
  { x: 766, y: 440 },
  { x: 470, y: 66 },
];

const ACCENT: Record<Track["accent"], { dot: string; chip: string; line: string }> = {
  emerald: { dot: "bg-emerald-400", chip: "text-emerald-300 border-emerald-400/40", line: "#93B27C" },
  amber: { dot: "bg-amber-400", chip: "text-amber-300 border-amber-400/40", line: "#D6A863" },
  rose: { dot: "bg-rose-400", chip: "text-rose-300 border-rose-400/40", line: "#CE7E78" },
  indigo: { dot: "bg-indigo-400", chip: "text-indigo-300 border-indigo-400/40", line: "#A8A296" },
  cyan: { dot: "bg-cyan-400", chip: "text-cyan-400 border-cyan-400/40", line: "#DBBB86" },
};

/**
 * Canonical lesson route is /paths/<owning track slug>/<lesson slug>.
 * The track comes from the lesson itself — the same rule used by the resume
 * pill and blog reader — so a lesson listed under a selected node can never
 * produce a mixed track/lesson URL. The selected slug is only a fallback for
 * incomplete lesson metadata.
 */
function lessonHref(lesson: Lesson, selectedSlug: string): string {
  const owner = getTrack(lesson.trackId);
  return `/paths/${owner?.slug ?? selectedSlug}/${lesson.slug}`;
}

export function KnowledgeMap() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [selectedId, setSelectedId] = useState(TRACKS[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const dragRef = useRef<{ pointerId: number; x: number; y: number; ox: number; oy: number } | null>(null);

  const completedLessons = useLearnerPlatformStore((s) => s.completedLessons);
  const mastery = useLearnerPlatformStore((s) => s.mastery);
  const hydrate = useLearnerPlatformStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Resolve the selected node through the registry so the aside, its
  // prerequisites and its Open links all describe the same track.
  const selected = getTrack(selectedId) ?? TRACKS[0];
  const needle = query.trim().toLowerCase();
  const matches = (track: Track) =>
    !needle ||
    track.title.toLowerCase().includes(needle) ||
    track.slug.toLowerCase().includes(needle) ||
    track.lessons.some((lesson) => lesson.title.toLowerCase().includes(needle));

  const clampScale = (value: number) => Math.min(1.8, Math.max(0.7, Math.round(value * 100) / 100));
  const visibleBlogs = BLOGS.filter((blog) =>
    !needle || blog.title.toLowerCase().includes(needle) || blog.dek.toLowerCase().includes(needle),
  );
  const visibleLabs = PLATFORM_LABS.filter((lab) =>
    !needle || lab.title.toLowerCase().includes(needle) || lab.goal.toLowerCase().includes(needle),
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-5 pb-24 pt-12 sm:px-8">
      <header className="max-w-3xl" data-cursor="read">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Knowledge map</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-content sm:text-4xl">See how it connects</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-content-secondary">
          Seven tracks form a constellation. Drag to pan, zoom with the controls, and choose a node to see prerequisites,
          your local mastery, and the lessons inside it.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[240px] max-w-sm flex-1 items-center gap-2 rounded-xl border border-line bg-app-raised px-3">
          <Search size={15} className="text-content-tertiary" />
          <label htmlFor="map-search" className="sr-only">Search tracks and lessons</label>
          <input
            id="map-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a track or lesson"
            className="w-full bg-transparent py-2.5 text-[13px] text-content placeholder:text-content-tertiary focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-line bg-app-raised p-1" role="group" aria-label="Map zoom">
          <button
            type="button"
            onClick={() => setScale((value) => clampScale(value - 0.15))}
            aria-label="Zoom out"
            className="rounded-lg p-2 text-content-secondary hover:bg-app hover:text-content"
          >
            <span aria-hidden="true" className="text-[16px] leading-none">−</span>
          </button>
          <span className="w-12 text-center font-mono text-[11px] text-content-tertiary">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            onClick={() => setScale((value) => clampScale(value + 0.15))}
            aria-label="Zoom in"
            className="rounded-lg p-2 text-content-secondary hover:bg-app hover:text-content"
          >
            <Plus size={15} />
          </button>
          <button
            type="button"
            onClick={() => {
              setOffset({ x: 0, y: 0 });
              setScale(1);
            }}
            aria-label="Reset map view"
            className="rounded-lg p-2 text-content-secondary hover:bg-app hover:text-content"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div
          className="relative h-[540px] touch-none overflow-hidden rounded-2xl border border-line bg-app-raised shadow-card"
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).closest("button")) return;
            dragRef.current = {
              pointerId: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              ox: offset.x,
              oy: offset.y,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            setOffset({ x: drag.ox + event.clientX - drag.x, y: drag.oy + event.clientY - drag.y });
          }}
          onPointerUp={(event) => {
            if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
          onWheel={(event) => {
            setScale((value) => clampScale(value + (event.deltaY < 0 ? 0.08 : -0.08)));
          }}
        >
          <p className="pointer-events-none absolute left-4 top-4 z-10 text-[11px] text-content-tertiary">
            Drag to pan · scroll or use controls to zoom
          </p>
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              width: STAGE_WIDTH,
              height: STAGE_HEIGHT,
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: "center center",
            }}
          >
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`}
              aria-hidden="true"
            >
              {POSITIONS.slice(1).map((point, index) => {
                const from = POSITIONS[0];
                const track = TRACKS[index + 1];
                const dimmed = Boolean(needle) && !matches(track);
                return (
                  <line
                    key={`edge-${index}`}
                    x1={from.x}
                    y1={from.y}
                    x2={point.x}
                    y2={point.y}
                    stroke={ACCENT[track.accent].line}
                    strokeOpacity={dimmed ? 0.08 : selected?.id === track.id ? 0.7 : 0.28}
                    strokeWidth={selected?.id === track.id ? 2.5 : 1.5}
                    strokeDasharray="5 7"
                  />
                );
              })}
            </svg>

            {TRACKS.map((track, index) => {
              const point = POSITIONS[index] ?? POSITIONS[0];
              const accent = ACCENT[track.accent];
              const done = track.lessons.filter((lesson) => completedLessons.includes(lesson.id)).length;
              const isSelected = selected?.id === track.id;
              const dimmed = Boolean(needle) && !matches(track);
              return (
                <button
                  key={track.id}
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => setSelectedId(track.id)}
                  aria-pressed={isSelected}
                  className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-2xl border px-4 py-3 text-center transition-opacity ${
                    isSelected ? "border-brass bg-app-raised shadow-lift" : "border-line bg-app/90 hover:border-brass/50"
                  } ${dimmed ? "opacity-35" : "opacity-100"}`}
                  style={{ left: point.x, top: point.y, width: 168 }}
                >
                  <span aria-hidden="true" className={`mb-2 h-3 w-3 rounded-full ${accent.dot}`} />
                  <span className="text-[12px] font-semibold leading-tight text-content">{track.title}</span>
                  <span className="mt-1.5 font-mono text-[10px] text-content-tertiary">
                    {done}/{track.lessons.length} complete
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {selected ? (
          <aside className="rounded-2xl border border-line bg-app-raised p-6 shadow-card" aria-live="polite">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass">Selected track</p>
            <h2 className="mt-2 text-xl font-semibold text-content">{selected.title}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-content-secondary" data-cursor="read">{selected.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[11px] ${ACCENT[selected.accent].chip}`}>{selected.slug}</span>
              <span className="rounded-full border border-line px-2.5 py-1 text-[11px] text-content-tertiary">
                {selected.lessons.length} lessons
              </span>
            </div>

            <ol className="mt-6 max-h-[380px] space-y-3 overflow-y-auto pr-1">
              {selected.lessons.map((lesson, index) => {
                const record = mastery[lesson.id];
                const done = completedLessons.includes(lesson.id);
                const status = record
                  ? `${record.correct} correct · ${record.incorrect} to revisit`
                  : done
                    ? "Completed"
                    : "Not started";
                return (
                  <li key={lesson.id} className="rounded-xl border border-line bg-app p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[12px] font-medium text-content">
                        {String(index + 1).padStart(2, "0")} · {lesson.title}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-content-tertiary" data-cursor="read">
                      Prerequisites: {lesson.prerequisites.length ? lesson.prerequisites.join(", ") : "none"}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className={`text-[11px] ${done ? "text-emerald-300" : "text-content-tertiary"}`}>{status}</span>
                      <Link
                        href={lessonHref(lesson, selected.slug)}
                        aria-label={`Open ${lesson.title} in ${selected.title}`}
                        className="inline-flex items-center gap-1 text-[11px] text-brass hover:underline"
                      >
                        Open <ArrowRight size={12} />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ol>
          </aside>
        ) : null}
      </div>

      <section className="mt-10 grid gap-6 lg:grid-cols-2" aria-label="Connected blogs and labs">
        <div className="rounded-2xl border border-line bg-app-raised p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-content">Engineering field notes</h2>
            <Link href="/blogs" className="text-[12px] text-brass hover:underline">All blogs</Link>
          </div>
          <ul className="mt-4 space-y-2">
            {visibleBlogs.map((blog) => (
              <li key={blog.id}>
                <Link
                  href={`/blogs/${blog.slug}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-app px-3 py-2.5 text-[12px] text-content-secondary transition-colors hover:border-brass/40 hover:text-content"
                >
                  <span>{blog.title}</span>
                  <ArrowRight size={13} className="shrink-0 text-brass" />
                </Link>
              </li>
            ))}
            {visibleBlogs.length === 0 ? <li className="text-[12px] text-content-tertiary">No field notes match this search.</li> : null}
          </ul>
        </div>
        <div className="rounded-2xl border border-line bg-app-raised p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-content">Challenge labs</h2>
            <Link href="/labs" className="text-[12px] text-brass hover:underline">All labs</Link>
          </div>
          <ul className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {visibleLabs.map((lab) => (
              <li key={lab.id}>
                <Link
                  href={`/labs/${lab.labId}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-app px-3 py-2.5 text-[12px] text-content-secondary transition-colors hover:border-brass/40 hover:text-content"
                >
                  <span>{lab.title}</span>
                  <ArrowRight size={13} className="shrink-0 text-brass" />
                </Link>
              </li>
            ))}
            {visibleLabs.length === 0 ? <li className="text-[12px] text-content-tertiary">No labs match this search.</li> : null}
          </ul>
        </div>
      </section>
    </main>
  );
}

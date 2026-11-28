'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Clock, Search } from "@/components/ui/icons";
import { BLOGS } from "@/content/platform/registry";
import { useLearnerPlatformStore } from "@/store/useLearnerPlatformStore";
import type { BlogPost } from "@/learning/platform/types";

type Category = "Databases" | "Distributed Systems" | "AI" | "Reliability" | "Migrations";

const CATEGORIES: readonly Category[] = [
  "Databases",
  "Distributed Systems",
  "AI",
  "Reliability",
  "Migrations",
];

/**
 * Category rules read each post's own title and dek, so the filters stay
 * correct when blog copy changes — there is no parallel tag list to drift.
 */
const CATEGORY_TOPICS: Record<Category, RegExp> = {
  Databases: /\b(database(s)?|sql|schema|table|stor(e|es|age)|quer(y|ies)|index|shard(s|ing)?)\b/i,
  "Distributed Systems":
    /\b(distributed|replication|replica(s)?|consisten(t|cy)|hash(ing)?|kafka|queue(s|d)?|partition(s|ing)?|quorum|consensus|realtime|discord|ring)\b/i,
  AI: /\b(ai|llm|token(s|ization)?|agent(s)?|prompt(s)?|transformer(s)?|rag|embedding(s)?|inference|generation|decode)\b/i,
  Reliability:
    /\b(reliab(le|ility)|error budget(s)?|slo(s)?|incident(s)?|lag|availability|monitor(ing)?|alert(s)?|backpressure|zero-downtime|rollback|saturat(ed|ion))\b/i,
  Migrations: /\b(migration(s)?|migrat(e|es|ing)|backfill|cutover|zero-downtime|expand-and-contract)\b/i,
};

function categoriesFor(post: BlogPost): Category[] {
  // Related lesson ids are intentionally excluded: a single broad topic id
  // (for example observability-slos) would tag every post as Reliability.
  const topics = `${post.title} ${post.dek}`;
  const tags = CATEGORIES.filter((category) => CATEGORY_TOPICS[category].test(topics));
  return tags.length > 0 ? tags : ["Reliability"];
}

export function BlogsIndex() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const readBlogs = useLearnerPlatformStore((s) => s.readBlogs);
  const hydrate = useLearnerPlatformStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const needle = query.trim().toLowerCase();
  const searched = needle
    ? BLOGS.filter(
        (post) =>
          post.title.toLowerCase().includes(needle) ||
          post.dek.toLowerCase().includes(needle) ||
          post.relatedLessonIds.some((id) => id.toLowerCase().includes(needle)),
      )
    : [...BLOGS];

  const countFor = (item: Category | "All"): number =>
    item === "All" ? searched.length : searched.filter((post) => categoriesFor(post).includes(item)).length;

  const posts =
    category === "All" ? searched : searched.filter((post) => categoriesFor(post).includes(category));

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-12 sm:px-8">
      <header className="max-w-3xl" data-cursor="read">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Field notes</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-content sm:text-4xl">Blogs</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-content-secondary">
          Short, focused write-ups on the trade-offs behind real systems. Read them in Story, Engineer, or both modes —
          the same switch you use in the lessons.
        </p>
      </header>

      <div className="mt-8 max-w-md">
        <label htmlFor="blog-search" className="sr-only">Search field notes</label>
        <div className="flex items-center gap-2 rounded-xl border border-line bg-app-raised px-3">
          <Search size={15} className="text-content-tertiary" />
          <input
            id="blog-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles, topics, or lesson IDs"
            className="w-full min-w-0 bg-transparent py-3 text-[13px] text-content placeholder:text-content-tertiary focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter field notes by topic">
        {(["All", ...CATEGORIES] as Array<Category | "All">).map((item) => {
          const count = countFor(item);
          const active = category === item;
          return (
            <button
              key={item}
              type="button"
              aria-pressed={active}
              aria-label={`${item} (${count} field note${count === 1 ? "" : "s"})`}
              disabled={count === 0 && !active}
              onClick={() => setCategory(item)}
              className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                active
                  ? "border-brass bg-brass/15 text-content"
                  : "border-line-strong bg-app-raised text-content-secondary hover:border-brass/50 hover:text-content"
              }`}
            >
              {item}
              <span className="rounded-full bg-app px-1.5 py-0.5 font-mono text-[10px] text-content-secondary">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-[12px] text-content-secondary" aria-live="polite">
        {posts.length} field note{posts.length === 1 ? "" : "s"} shown
      </p>

      {posts.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-line bg-app-raised p-6 text-[13px] text-content-secondary" data-cursor="read">
          <p>No field notes match those filters. Try a system name such as cache, queue, or inference.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("All");
            }}
            className="mt-3 inline-flex rounded-full border border-line-strong px-3 py-1.5 text-[12px] text-content transition-colors hover:border-brass/50"
          >
            Clear search and filters
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {posts.map((post) => {
            const done = readBlogs.includes(post.id);
            return (
              <Link
                key={post.id}
                href={`/blogs/${post.slug}`}
                className="group flex flex-col rounded-2xl border border-line bg-app-raised p-6 shadow-card transition-colors hover:border-brass/40"
              >
                <div className="flex items-center justify-between gap-3 text-[11px] text-content-tertiary">
                  <span className="inline-flex items-center gap-1.5"><Clock size={13} /> {post.minutes} min read</span>
                  {done ? <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 size={13} /> Read</span> : null}
                </div>
                <h2 className="mt-4 text-lg font-semibold text-content group-hover:text-brass">{post.title}</h2>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-content-secondary" data-cursor="read">{post.dek}</p>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-content-tertiary">
                    {post.steps.length} steps · {post.relatedLessonIds.length} related lessons
                  </span>
                  <ArrowRight size={16} className="text-content-tertiary transition-transform group-hover:translate-x-1 group-hover:text-brass" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-12 text-[12px]">
        <Link href="/paths" className="text-content-secondary hover:text-brass">Browse the learning paths →</Link>
      </div>
    </main>
  );
}

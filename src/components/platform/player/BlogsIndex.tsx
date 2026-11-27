'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Clock, Search } from "@/components/ui/icons";
import { BLOGS } from "@/content/platform/registry";
import { useLearnerPlatformStore } from "@/store/useLearnerPlatformStore";

export function BlogsIndex() {
  const [query, setQuery] = useState("");
  const readBlogs = useLearnerPlatformStore((s) => s.readBlogs);
  const hydrate = useLearnerPlatformStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const needle = query.trim().toLowerCase();
  const posts = needle
    ? BLOGS.filter(
        (post) =>
          post.title.toLowerCase().includes(needle) ||
          post.dek.toLowerCase().includes(needle) ||
          post.relatedLessonIds.some((id) => id.toLowerCase().includes(needle)),
      )
    : BLOGS;

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
            className="w-full bg-transparent py-3 text-[13px] text-content placeholder:text-content-tertiary focus:outline-none"
          />
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-line bg-app-raised p-6 text-[13px] text-content-secondary" data-cursor="read">
          No field notes match that search. Try a system name such as cache, queue, or inference.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
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
                  {done ? <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 size={13} /> Read</span> : null}
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

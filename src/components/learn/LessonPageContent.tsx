'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2 } from "@/components/ui/icons";
import { LessonBlogViewer } from "@/components/path/LessonBlogViewer";
import { GlossaryText } from "@/components/wiki/GlossaryText";
import { getLessonBlog } from "@/data/lessonBlogs";
import { getAdjacentLessons, type LessonRoute } from "@/lib/lessonRoutes";

const PROGRESS_KEY = "syscraft.completedLessons.v1";

function readCompleted(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

function writeCompleted(next: Set<string>) {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify([...next]));
  } catch {
    /* storage blocked */
  }
}

export function LessonPageContent({ route }: { route: LessonRoute }) {
  const router = useRouter();
  const blog = getLessonBlog(route.moduleId, route.lessonIndex);
  const { prev, next } = getAdjacentLessons(route);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCompleted(readCompleted());
  }, []);

  const toggleComplete = useCallback((id: string) => {
    const nextSet = new Set(completed);
    if (nextSet.has(id)) nextSet.delete(id);
    else nextSet.add(id);
    writeCompleted(nextSet);
    setCompleted(nextSet);
  }, [completed]);

  const markComplete = useCallback((id: string) => {
    const nextSet = new Set(completed);
    nextSet.add(id);
    writeCompleted(nextSet);
    setCompleted(nextSet);
  }, [completed]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav className="flex flex-wrap items-center gap-1.5 text-[12px] text-content-tertiary" aria-label="Breadcrumb">
        <Link href="/learn" className="hover:text-content">Learn</Link>
        <span aria-hidden="true">/</span>
        <span>{route.partTitle}</span>
        <span aria-hidden="true">/</span>
        <Link href={`/learn#${route.moduleId}`} className="hover:text-content">{route.moduleTitle}</Link>
        <span aria-hidden="true">/</span>
        <span className="text-content">Lesson {route.lessonNumber}</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-content-tertiary">
        <span className="inline-flex items-center gap-1">
          <BookOpen size={13} /> {blog.readMinutes} min read
        </span>
        <span>Module {route.moduleNumber}</span>
        <span>Lesson {route.lessonNumber}</span>
        {completed.has(blog.id) && (
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <CheckCircle2 size={13} /> completed
          </span>
        )}
      </div>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-content sm:text-3xl">{route.title}</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-content-secondary">
        <GlossaryText text={blog.whatYouWillLearn[0]} />
      </p>

      <div className="mt-6">
        <LessonBlogViewer
          blog={blog}
          onPrev={prev ? () => router.push(prev.href) : undefined}
          onNext={next ? () => router.push(next.href) : undefined}
          hasPrev={Boolean(prev)}
          hasNext={Boolean(next)}
          completed={completed.has(blog.id)}
          onToggleComplete={() => toggleComplete(blog.id)}
          onMarkComplete={() => markComplete(blog.id)}
        />
      </div>

      <nav className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="Lesson navigation">
        {prev ? (
          <Link
            href={prev.href}
            className="group flex items-start gap-3 rounded-xl border border-line bg-app/60 p-4 transition-colors hover:border-line-strong"
          >
            <ArrowLeft size={16} className="mt-0.5 text-content-tertiary group-hover:text-content" />
            <span className="min-w-0">
              <span className="block text-[11px] uppercase tracking-wide text-content-tertiary">Previous</span>
              <span className="mt-0.5 block truncate text-[13px] text-content">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={next.href}
            className="group flex items-start gap-3 rounded-xl border border-line bg-app/60 p-4 text-right transition-colors hover:border-line-strong sm:justify-end"
          >
            <span className="min-w-0">
              <span className="block text-[11px] uppercase tracking-wide text-content-tertiary">Next</span>
              <span className="mt-0.5 block truncate text-[13px] text-content">{next.title}</span>
            </span>
            <ArrowRight size={16} className="mt-0.5 text-content-tertiary group-hover:text-content" />
          </Link>
        ) : (
          <Link
            href="/canvas"
            className="flex items-start gap-3 rounded-xl border border-emerald-700/40 bg-emerald-950/20 p-4 text-right transition-colors hover:border-emerald-600 sm:justify-end"
          >
            <span>
              <span className="block text-[11px] uppercase tracking-wide text-emerald-400">Finish</span>
              <span className="mt-0.5 block text-[13px] text-emerald-200">Build it on the canvas →</span>
            </span>
          </Link>
        )}
      </nav>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-[12px] text-content-tertiary">
        <Link href="/learn" className="hover:text-content">← Back to the full curriculum</Link>
        <span>·</span>
        <Link href="/interview" className="hover:text-content">Practice in interview mode</Link>
      </div>
    </div>
  );
}

'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLearnerPlatformStore } from "@/store/useLearnerPlatformStore";

/**
 * Server HTML never contains this pill: the store starts with `resume: null`
 * and `hydrated: false`. The registry is loaded only after a learner actually
 * has a lesson to resume, so it never enters the landing bundle.
 */
export function ResumePill() {
  const hydrate = useLearnerPlatformStore((state) => state.hydrate);
  const hydrated = useLearnerPlatformStore((state) => state.hydrated);
  const resume = useLearnerPlatformStore((state) => state.resume);
  // Keyed by resume id so a late resolution for a previous resume is ignored
  // during render instead of being reset synchronously in the effect.
  const [resolved, setResolved] = useState<{ resumeId: string; href: string } | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated || !resume || resume.kind !== "lesson") return;
    const fallback = `/paths?resume=${encodeURIComponent(resume.id)}`;
    let cancelled = false;
    void import("@/content/platform/registry")
      .then(({ getLessonById }) => {
        if (cancelled) return;
        const lesson = getLessonById(resume.id);
        setResolved({
          resumeId: resume.id,
          href: lesson ? `/paths/${lesson.trackId}/${lesson.slug}` : fallback,
        });
      })
      .catch(() => {
        if (!cancelled) setResolved({ resumeId: resume.id, href: fallback });
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, resume]);

  if (!hydrated || !resume) return null;

  const href = resume.kind === "blog"
    ? `/blogs/${resume.id}`
    : resolved?.resumeId === resume.id
      ? resolved.href
      : `/paths?resume=${encodeURIComponent(resume.id)}`;

  return (
    <Link
      href={href}
      className="group inline-flex max-w-full items-center gap-2 rounded-full border border-line-strong bg-app-raised/50 py-1.5 pl-3 pr-1.5 text-[12px] text-content-secondary transition-colors hover:border-brass/50 hover:text-content"
    >
      <span className="font-medium text-brass">Resume</span>
      <span className="h-3 w-px bg-line-strong" aria-hidden="true" />
      <span>{resume.kind === "blog" ? "Article" : "Lesson"}</span>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line-strong text-[10px] text-content-tertiary transition-colors group-hover:border-brass/50 group-hover:text-brass" aria-hidden="true">
        →
      </span>
    </Link>
  );
}

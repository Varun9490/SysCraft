'use client';

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, CheckCircle2, PenSquare, Shield, ShieldCheck } from "@/components/ui/icons";
import { EASE } from "@/components/ui/motion";
import { TopicVisual } from "@/components/platform/visuals/registry";
import { useLearnerPlatformStore } from "@/store/useLearnerPlatformStore";
import type { SecurityPractice } from "@/learning/platform/types";

/**
 * Defensive-only tail shared by the lesson and blog readers. The shield visual
 * is a hardening illustration: it changes emphasis, never depicts an exploit.
 */
export function SecurityAndNotes({
  items,
  topicId,
  kind,
  completeLabel,
}: {
  items: readonly SecurityPractice[];
  topicId: string;
  kind: "lesson" | "blog";
  completeLabel: string;
}) {
  const [shieldOn, setShieldOn] = useState(false);
  const reduce = useReducedMotion();

  const note = useLearnerPlatformStore((s) => s.notes[topicId] ?? "");
  const bookmarked = useLearnerPlatformStore((s) => s.bookmarks.includes(topicId));
  const completed = useLearnerPlatformStore(
    (s) => (kind === "lesson" ? s.completedLessons : s.readBlogs).includes(topicId),
  );
  const setNote = useLearnerPlatformStore((s) => s.setNote);
  const toggleBookmark = useLearnerPlatformStore((s) => s.toggleBookmark);
  const markLessonComplete = useLearnerPlatformStore((s) => s.markLessonComplete);
  const markBlogRead = useLearnerPlatformStore((s) => s.markBlogRead);
  const readCount = useLearnerPlatformStore(
    (s) => new Set([...s.completedLessons, ...s.readBlogs]).size,
  );

  const markComplete = () => {
    if (kind === "lesson") markLessonComplete(topicId);
    else markBlogRead(topicId);
  };

  return (
    <div className="mt-16 space-y-8 border-t border-line pt-12">
      <section aria-labelledby="security-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass">Defensive design</p>
            <h2 id="security-heading" className="mt-2 text-xl font-semibold text-content sm:text-2xl">
              Security and hardening
            </h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-content-secondary" data-cursor="read">
              For every threat below there is a concrete control and a way to verify it. These are checks to run on
              systems you own.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShieldOn((on) => !on)}
            aria-pressed={shieldOn}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-app-raised px-4 py-2 text-[13px] font-medium text-content transition-colors hover:border-brass/50 hover:text-brass"
          >
            {shieldOn ? <ShieldCheck size={16} /> : <Shield size={16} />}
            {shieldOn ? "Shield on" : "Show the shield"}
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-line bg-app-raised p-5">
              <h3 className="text-[14px] font-semibold text-content">{item.title}</h3>
              <dl className="mt-3 space-y-2 text-[13px] leading-relaxed text-content-secondary" data-cursor="read">
                <div>
                  <dt className="font-medium text-content-tertiary">Threat</dt>
                  <dd>{item.threat}</dd>
                </div>
                <div>
                  <dt className="font-medium text-content-tertiary">Control</dt>
                  <dd>{item.control}</dd>
                </div>
                <div>
                  <dt className="font-medium text-content-tertiary">Verify</dt>
                  <dd>{item.verify}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>

        <figure className="mt-6 overflow-hidden rounded-2xl border border-line bg-app-raised">
          <div className="aspect-video min-h-[280px] w-full">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={shieldOn ? "shield-on" : "shield-off"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
                className="h-full w-full"
              >
                <TopicVisual visualId="threat-defense" stepIndex={shieldOn ? 2 : 0} />
              </motion.div>
            </AnimatePresence>
          </div>
          <figcaption className="border-t border-line px-5 py-3 text-[12px] text-content-tertiary">
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={shieldOn ? "shield-on-caption" : "shield-off-caption"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: reduce ? 0 : 0.18, ease: EASE }}
                className="block"
              >
                {shieldOn
                  ? "Defense in depth: verified identity, least privilege, encryption, and observable controls."
                  : "Press “Show the shield” to bring the defensive layers into focus."}
              </motion.span>
            </AnimatePresence>
          </figcaption>
        </figure>
      </section>

      <section aria-labelledby="notes-heading" className="rounded-2xl border border-line bg-app-raised p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PenSquare size={16} className="text-brass" />
            <h2 id="notes-heading" className="text-[14px] font-semibold text-content">Your notes</h2>
          </div>
          <button
            type="button"
            onClick={() => toggleBookmark(topicId)}
            aria-pressed={bookmarked}
            className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
              bookmarked
                ? "border-brass/50 bg-brass/10 text-brass"
                : "border-line text-content-secondary hover:border-brass/40 hover:text-content"
            }`}
          >
            {bookmarked ? <span className="inline-flex items-center gap-1"><Check size={13} /> Bookmarked</span> : "Bookmark"}
          </button>
        </div>
        <label htmlFor={`note-${topicId}`} className="sr-only">Notes for this {kind}</label>
        <textarea
          id={`note-${topicId}`}
          value={note}
          onChange={(event) => setNote(topicId, event.target.value)}
          rows={4}
          placeholder="Write down the trade-off you want to remember…"
          className="mt-4 w-full resize-y rounded-xl border border-line bg-app px-4 py-3 text-[13px] leading-relaxed text-content placeholder:text-content-tertiary focus:border-brass/60 focus:outline-none"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={markComplete}
            disabled={completed}
            className="inline-flex items-center gap-2 rounded-xl bg-brass px-4 py-2.5 text-[13px] font-semibold text-ink transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-60"
          >
            {completed ? <CheckCircle2 size={16} /> : null}
            {completed ? (kind === "lesson" ? "Lesson complete" : "Marked as read") : completeLabel}
          </button>
          {completed ? <span className="text-[12px] text-content-tertiary">Saved to your local progress.</span> : null}
          <AnimatePresence initial={false}>
            {completed && readCount >= 3 ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: reduce ? 0 : 0.24, ease: EASE }}
              >
                <Link
                  href="/quiz"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-[12px] font-medium text-content-secondary transition-colors hover:border-brass/50 hover:text-brass"
                >
                  Recall what you have read <span aria-hidden="true">→</span>
                </Link>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}

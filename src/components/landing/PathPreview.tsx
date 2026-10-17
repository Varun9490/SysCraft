'use client';

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/motion";
import { PATH_PARTS, TOTAL_LESSONS, TOTAL_MODULES } from "@/data/pathData";

export function PathPreview() {
  return (
    <section className="border-y border-line/60 bg-app-raised/20 py-24 md:py-32">
      <div className="section-container grid gap-12 lg:grid-cols-12 lg:gap-14">
        <Reveal className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <span className="eyebrow">Structured curriculum</span>
            <h2 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tighter text-content md:text-5xl">
              A path, not a
              <br />
              pile of topics
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-content-secondary">
              {TOTAL_MODULES} modules and {TOTAL_LESSONS} lessons, sequenced the way a growing application needs them. Read an
              idea, then build it on the canvas the same day.
            </p>

            <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-line/70 pt-6">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.16em] text-content-tertiary">Parts</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-content">{PATH_PARTS.length}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.16em] text-content-tertiary">Modules</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-content">{TOTAL_MODULES}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.16em] text-content-tertiary">Lessons</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-brass">{TOTAL_LESSONS}</dd>
              </div>
            </dl>

            <Link
              href="/path"
              className="group mt-8 inline-flex items-center gap-2 rounded-full border border-line bg-app px-5 py-2.5 text-sm font-medium text-content transition-colors hover:border-brass/40 hover:bg-app-raised"
            >
              See the full path
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>

        <div className="flex flex-col gap-5 lg:col-span-7">
          {PATH_PARTS.map((part, index) => {
            const lessons = part.modules.reduce((s, m) => s + m.lessonTitles.length, 0);
            return (
              <Reveal
                key={part.id}
                delay={index * 0.08}
                x={index % 2 === 1 ? 22 : -22}
                className={index % 2 === 1 ? "lg:ml-12" : "lg:mr-12"}
              >
                <div className="group relative overflow-hidden rounded-2xl border border-line/70 bg-app/50 p-6 transition-colors duration-300 hover:border-brass/30 hover:bg-app/80">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-[0.07] blur-2xl"
                    style={{ background: part.accentHex }}
                  />

                  <div className="flex items-center gap-4">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-[15px] font-semibold tabular-nums"
                      style={{
                        borderColor: `${part.accentHex}55`,
                        backgroundColor: `${part.accentHex}14`,
                        color: part.accentHex,
                      }}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold tracking-tight text-content">{part.title}</h3>
                      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-content-tertiary">
                        {part.modules.length} modules · {lessons} lessons
                      </p>
                    </div>
                    <Link
                      href="/path"
                      className="ml-auto hidden shrink-0 items-center gap-1.5 text-[13px] font-medium text-content-secondary transition-colors hover:text-brass sm:inline-flex"
                    >
                      Open
                      <ArrowRight size={13} />
                    </Link>
                  </div>

                  <p className="mt-4 text-[14px] leading-relaxed text-content-secondary">{part.subtitle}</p>

                  <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                    {part.modules.slice(0, 4).map((module) => (
                      <li key={module.id} className="flex items-start gap-2 text-[13px] text-content-secondary">
                        <CheckCircle2 size={14} weight="bold" className="mt-0.5 shrink-0 text-brass/80" />
                        <span className="truncate">
                          <span className="text-content-tertiary">{module.number}.</span> {module.title}
                        </span>
                      </li>
                    ))}
                    {part.modules.length > 4 && (
                      <li className="col-span-full text-[12px] text-content-tertiary">
                        + {part.modules.length - 4} more modules
                      </li>
                    )}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

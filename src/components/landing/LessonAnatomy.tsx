'use client';

import { useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ScrollReveal } from "@/components/ui/interactive";

const PARTS = [
  {
    number: "01",
    title: "Story mode",
    meta: "narrative",
    body: "A short narrative follows one request through the system, so the reason for each component is clear before its name is.",
    hint: "Read it like a field note.",
  },
  {
    number: "02",
    title: "Engineer mode",
    meta: "precise",
    body: "The same step restated in engineering language: contracts, failure modes, and the numbers you would actually write down.",
    hint: "Same idea, exact vocabulary.",
  },
  {
    number: "03",
    title: "Visual walkthrough",
    meta: "see it move",
    body: "Scroll or click through the system frame by frame. Your place is kept, so you can leave halfway through and come back to the same point.",
    hint: "One request, one journey.",
  },
  {
    number: "04",
    title: "Security panel",
    meta: "threat · control · verify",
    body: "Every lesson names a threat, the control that answers it, and a question you can ask to check that the control really holds.",
    hint: "Ask, answer, verify.",
  },
] as const;

const EASE = [0.22, 1, 0.36, 1] as const;

function StepDiagram({ index }: { index: number }) {
  const common = {
    fill: "none",
    stroke: "rgb(var(--accent) / 0.75)",
    strokeWidth: 1.3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 84 56" className="h-14 w-[84px] shrink-0" aria-hidden="true">
      <rect x="1" y="1" width="82" height="54" rx="8" fill="#141310" stroke="rgb(var(--line))" />
      {index === 0 && (
        <>
          <path d="M 12 28 H 30 C 38 28 38 16 46 16 H 72" {...common} />
          <circle cx="12" cy="28" r="3" fill="rgb(var(--accent))" />
          <circle cx="72" cy="16" r="3" fill="rgb(var(--accent-bright))" />
        </>
      )}
      {index === 1 && (
        <>
          <path d="M 18 14 H 66 M 18 28 H 66 M 18 42 H 48" {...common} />
          <path d="M 14 10 V 46 M 70 10 V 46" {...common} strokeOpacity="0.5" />
        </>
      )}
      {index === 2 && (
        <>
          <rect x="12" y="12" width="26" height="32" rx="4" {...common} strokeOpacity="0.5" />
          <rect x="28" y="18" width="26" height="32" rx="4" {...common} strokeOpacity="0.75" />
          <rect x="44" y="24" width="26" height="32" rx="4" {...common} />
        </>
      )}
      {index === 3 && (
        <>
          <path d="M 42 10 L 68 20 V 32 C 68 43 56 49 42 52 C 28 49 16 43 16 32 V 20 Z" {...common} />
          <path d="M 32 32 L 39 39 L 53 25" {...common} stroke="rgb(var(--accent-bright))" />
        </>
      )}
    </svg>
  );
}

export function LessonAnatomy() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const reduced = useReducedMotion() === true;
  const part = PARTS[active];

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % PARTS.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + PARTS.length) % PARTS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = PARTS.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section className="section-container pb-24 pt-20 md:pb-32 md:pt-24">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
        <ScrollReveal className="lg:col-span-4">
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-brass">
            <span className="h-px w-6 bg-brass/70" aria-hidden="true" />
            How a lesson works
          </span>
          <h2 className="mt-4 max-w-sm text-balance text-3xl font-medium tracking-tight text-content md:text-4xl">
            Two ways to read the same idea.
          </h2>
          <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-content-secondary">
            One page, two registers. Start with the story when the concept is new, switch to engineer language when you want the exact trade-off.
          </p>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-content-tertiary">
            Story → Engineer → Visual → Security
          </p>
        </ScrollReveal>

        <ScrollReveal className="lg:col-span-8" delay={0.12}>
          <div className="rounded-2xl border border-line/70 bg-app/40 p-5 md:p-7">
            <div className="relative" aria-hidden="true">
              <div className="h-px w-full bg-line/70" />
              <motion.div
                className="absolute -top-[3px] h-[7px] w-[7px] rounded-full bg-brass shadow-[0_0_10px_rgb(var(--accent)/0.8)]"
                initial={false}
                animate={{ left: `${(active + 0.5) * 25}%` }}
                transition={{ duration: reduced ? 0 : 0.5, ease: EASE }}
              />
            </div>

            <div role="tablist" aria-label="How a lesson works" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PARTS.map((item, index) => (
                <button
                  key={item.number}
                  ref={(element) => { tabRefs.current[index] = element; }}
                  type="button"
                  role="tab"
                  id={`anatomy-tab-${index}`}
                  aria-controls="anatomy-panel"
                  aria-selected={active === index}
                  tabIndex={active === index ? 0 : -1}
                  onClick={() => setActive(index)}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                  className={`relative rounded-lg px-3 py-3 text-left transition-colors ${
                    active === index
                      ? "bg-app-raised/70 text-content"
                      : "text-content-tertiary hover:bg-app-raised/30 hover:text-content-secondary"
                  }`}
                >
                  <span className="block font-mono text-[10px] tabular-nums text-brass/80">{item.number}</span>
                  <span className="mt-1 block text-[12px] font-medium">{item.title}</span>
                  {active === index && (
                    <motion.span
                      layoutId="lesson-anatomy-underline"
                      className="absolute bottom-0 left-3 right-3 h-px bg-brass"
                      transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
                    />
                  )}
                </button>
              ))}
            </div>

            <div
              id="anatomy-panel"
              role="tabpanel"
              aria-labelledby={`anatomy-tab-${active}`}
              className="mt-6 min-h-[176px] rounded-xl border border-line/60 bg-ink/60 p-5 md:p-6"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={part.number}
                  initial={reduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 1 } : { opacity: 0, y: -8 }}
                  transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
                  className="flex items-start gap-5"
                >
                  <StepDiagram index={active} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="text-[16px] font-medium text-content">{part.title}</h3>
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-brass/80">{part.meta}</span>
                    </div>
                    <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-content-secondary">{part.body}</p>
                    <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-content-tertiary">{part.hint}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

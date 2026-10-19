'use client';

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Gauge, XCircle } from "@/components/ui/icons";
import { usePredictionStore } from "@/store/usePredictionStore";
import { NUMBERS_DRILL, type DrillPair } from "@/data/claims";

/**
 * The numbers decision drill: which of the two operations is faster? Labels
 * only are shown before committing — the times appear at the reveal, with the
 * arithmetic behind the verdict. Committed answers feed the same prediction
 * store as the sandbox gates, so drill accuracy lands on /progress.
 */

const SURFACE_ID = "drill:numbers";

export function NumbersDrill() {
  const records = usePredictionStore((s) => s.records);
  const commit = usePredictionStore((s) => s.commit);
  const hydrate = usePredictionStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const answered = records;
  const [activeIndex, setActiveIndex] = useState<number>(() =>
    Math.max(
      0,
      NUMBERS_DRILL.findIndex((pair) => !records[`${SURFACE_ID}:${pair.id}`]),
    ),
  );

  const stats = useMemo(() => {
    const values = Object.values(records).filter((record) => record.surfaceId === SURFACE_ID);
    const correct = values.filter((record) => record.chosen === record.correct).length;
    return { answered: values.length, correct };
  }, [records]);

  const pair: DrillPair | undefined = NUMBERS_DRILL[activeIndex];
  const revealed = Boolean(pair && answered[`${SURFACE_ID}:${pair.id}`]);

  if (!pair) return null;

  const choose = (choice: "a" | "b") => {
    if (revealed) return;
    commit({
      key: `${SURFACE_ID}:${pair.id}`,
      surfaceId: SURFACE_ID,
      questionId: pair.id,
      chosen: choice,
      correct: pair.faster,
    });
  };

  const times = (side: "a" | "b") => (side === "a" ? pair.a : pair.b);

  return (
    <div className="rounded-2xl border border-brass/25 bg-brass/[0.05] p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">
          <Gauge size={13} /> Decision drill
        </p>
        <span className="text-[11px] tabular-nums text-content-tertiary">
          {stats.answered}/{NUMBERS_DRILL.length} answered · {stats.correct} correct
        </span>
      </div>

      <p className="mt-3 text-[14px] font-medium text-content">Which completes faster, honestly?</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {(["a", "b"] as const).map((side) => {
          const item = times(side);
          const isFaster = pair.faster === side;
          const chosen = revealed ? records[`${SURFACE_ID}:${pair.id}`]?.chosen === side : false;
          return (
            <button
              key={side}
              type="button"
              onClick={() => choose(side)}
              disabled={revealed}
              className={`rounded-xl border px-4 py-3 text-left text-[13.5px] font-medium transition-all ${
                revealed
                  ? isFaster
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                    : chosen
                      ? "border-rose-500/50 bg-rose-500/10 text-rose-300"
                      : "border-line bg-app/40 text-content-tertiary"
                  : "border-line bg-app/60 text-content-secondary transition-colors hover:border-brass/50 hover:text-content"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                {item.label}
                {revealed && (
                  <span className="flex items-center gap-1 tabular-nums">
                    {isFaster ? <CheckCircle2 size={13} /> : chosen ? <XCircle size={13} /> : null}
                  </span>
                )}
              </span>
              {revealed && <span className="mt-1 block text-[12px] tabular-nums text-content-secondary">{item.time}</span>}
            </button>
          );
        })}
      </div>

      {revealed && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
          <p className="text-[13px] leading-relaxed text-content-secondary">{pair.explanation}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {stats.answered < NUMBERS_DRILL.length && (
              <button
                type="button"
                onClick={() => setActiveIndex((i) => Math.min(i + 1, NUMBERS_DRILL.length - 1))}
                className="inline-flex items-center gap-1.5 rounded-full bg-brass px-4 py-2 text-[12.5px] font-semibold text-ink transition-transform hover:scale-[1.03]"
              >
                Next pair <ArrowRight size={13} />
              </button>
            )}
            <a
              href="#claims-register"
              className="inline-flex items-center rounded-full border border-line bg-app-raised/60 px-4 py-2 text-[12.5px] font-medium text-content-secondary transition-colors hover:border-brass/50 hover:text-content"
            >
              Check the claims register
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}


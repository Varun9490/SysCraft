'use client';

import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, FlaskConical, XCircle } from "@/components/ui/icons";
import { usePredictionStore } from "@/store/usePredictionStore";
import { resolveCorrectChoice, type PredictionSpec, type SimData, type TopicSimKind } from "./predictionSpec";

/**
 * The predict-first gate: the user must commit a prediction before the kernel
 * verdict is revealed. Commitments persist locally (accuracy is graded on
 * /progress), and the reveal always shows the deterministic truth plus what to
 * watch for.
 *
 * Used two ways:
 *  - Scenario mode (caching topics): the gate stands between the user and the
 *    metrics until a prediction is committed for the active scenario.
 *  - Experiment mode (all sim topics): "Run experiment" arms the gate with
 *    that experiment's param preset — one prediction per experiment key,
 *    re-gradeable by running it again.
 */

export interface PredictionGateProps {
  surfaceId: string;
  questionId: string;
  scenarioTitle: string;
  situation: string;
  watchFor?: string;
  spec: PredictionSpec;
  kind: TopicSimKind;
  data: SimData;
  paramsDisplay?: string;
}

export function PredictionGate({
  surfaceId,
  questionId,
  scenarioTitle,
  situation,
  watchFor,
  spec,
  kind,
  data,
  paramsDisplay,
}: PredictionGateProps) {
  const records = usePredictionStore((s) => s.records);
  const commit = usePredictionStore((s) => s.commit);
  const hydrate = usePredictionStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const record = records[`${surfaceId}:${questionId}`];
  const correct = resolveCorrectChoice(kind, data);
  const revealed = Boolean(record);
  const metricValue = spec.metric(data);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-brass/25 bg-brass/[0.05] p-5 shadow-card sm:p-6"
      aria-label="Predict first"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">
          <FlaskConical size={13} /> Predict first
        </p>
        <span className="rounded-full border border-line bg-app-raised/60 px-2.5 py-1 text-[11px] font-medium text-content-secondary">
          {scenarioTitle}
        </span>
      </div>

      <p className="mt-3 text-[14px] leading-relaxed text-content">{situation}</p>

      {paramsDisplay && (
        <p className="mt-2 text-[12px] tabular-nums text-content-tertiary">{paramsDisplay}</p>
      )}

      <p className="mt-4 text-[14px] font-medium text-content">{spec.prompt}</p>
      {!revealed && spec.hint && (
        <p className="mt-1 text-[12.5px] leading-relaxed text-content-tertiary">{spec.hint}</p>
      )}

      {!revealed ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {spec.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() =>
                commit({
                  key: `${surfaceId}:${questionId}`,
                  surfaceId,
                  questionId,
                  chosen: choice.id,
                  correct: correct.id,
                })
              }
              className="rounded-xl border border-line bg-app/60 px-3 py-3 text-[13px] font-medium text-content-secondary transition-all hover:border-brass/50 hover:text-content focus-visible:outline focus-visible:outline-brass/60"
            >
              {choice.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {spec.choices.map((choice) => {
              const isCorrect = choice.id === correct.id;
              const userPickedWrong = record?.chosen === choice.id && !isCorrect;
              return (
                <div
                  key={choice.id}
                  className={`rounded-xl border px-3 py-2.5 text-[13px] font-medium transition-colors ${
                    isCorrect
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                      : userPickedWrong
                        ? "border-rose-500/50 bg-rose-500/10 text-rose-300"
                        : "border-line bg-app/40 text-content-tertiary"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {isCorrect && <CheckCircle2 size={13} />}
                    {userPickedWrong && <XCircle size={13} />}
                    {choice.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-line bg-app/60 px-4 py-3">
            <p className="text-[13px] leading-relaxed text-content-secondary">
              <span className="font-semibold text-content">
                {spec.metricLabel}: {spec.format(metricValue)}
              </span>{" "}
              — the deterministic kernel, bucketed exactly as your prediction was graded.
            </p>
            {watchFor && (
              <p className="mt-2 text-[12.5px] leading-relaxed text-content-tertiary">{watchFor}</p>
            )}
          </div>
        </div>
      )}
    </motion.section>
  );
}

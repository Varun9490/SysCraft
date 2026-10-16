/**
 * Free Spaced Repetition Scheduler (FSRS v4.5-compatible) math.
 * Pure functions with zero browser dependencies so Vitest and the
 * IndexedDB-backed useLearningStore can share one implementation.
 *
 * Model: stability S (days until recall drops to 90%), difficulty D (1-10),
 * retrievability R(t) = (1 + t / (9 * S))^-1. Ratings: 1 Again, 2 Hard,
 * 3 Good, 4 Easy. Default 17 weights follow the published FSRS-4.5 optimum.
 */

export type FsrsRating = 1 | 2 | 3 | 4;
export type FsrsState = "new" | "learning" | "review" | "relearning";

export interface FsrsCardMemory {
  cardId: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: FsrsState;
  lastReview: string | null;
}

export interface FsrsReviewLog {
  cardId: string;
  rating: FsrsRating;
  reviewedAt: string;
  elapsedDays: number;
  scheduledDays: number;
  stabilityBefore: number;
  stabilityAfter: number;
  difficultyBefore: number;
  difficultyAfter: number;
  retrievability: number;
}

export const FSRS_DEFAULT_W: readonly number[] = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616,
  0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466,
] as const;

export const FSRS_REQUEST_RETENTION = 0.9;
export const FSRS_MAX_INTERVAL_DAYS = 36500;
export const FSRS_MIN_STABILITY = 0.01;

function clampFinite(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function createNewCard(cardId: string, now: Date = new Date()): FsrsCardMemory {
  const at = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  return {
    cardId,
    due: at.toISOString(),
    stability: 1,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: "new",
    lastReview: null,
  };
}

/** Forgetting curve: R(t, S) = (1 + t / (9 * S))^-1. */
export function retrievability(elapsedDays: number, stability: number): number {
  const t = Math.max(0, Number.isFinite(elapsedDays) ? elapsedDays : 0);
  const s = Math.max(FSRS_MIN_STABILITY, Number.isFinite(stability) ? stability : 1);
  return 1 / (1 + t / (9 * s));
}

/** Initial stability S0(G) for first review. */
export function initialStability(
  rating: FsrsRating,
  w: readonly number[] = FSRS_DEFAULT_W,
): number {
  const weights = w.length >= 4 ? w : FSRS_DEFAULT_W;
  return Math.max(FSRS_MIN_STABILITY, weights[rating - 1]);
}

/** Initial difficulty D0(G) = w4 - w5 * (G - 3), clamped to [1, 10]. */
export function initialDifficulty(
  rating: FsrsRating,
  w: readonly number[] = FSRS_DEFAULT_W,
): number {
  const weights = w.length >= 6 ? w : FSRS_DEFAULT_W;
  const d = weights[4] - weights[5] * (rating - 3);
  return clampFinite(d, 1, 10, 5);
}

function nextDifficulty(
  difficulty: number,
  rating: FsrsRating,
  w: readonly number[],
): number {
  const weights = w.length >= 7 ? w : FSRS_DEFAULT_W;
  const delta = -weights[6] * (rating - 3);
  const next = difficulty + delta;
  return clampFinite(next, 1, 10, difficulty);
}

function nextRecallStability(
  difficulty: number,
  stability: number,
  retrievabilityNow: number,
  rating: FsrsRating,
  w: readonly number[],
): number {
  const weights = w.length >= 17 ? w : FSRS_DEFAULT_W;
  const r = clampFinite(retrievabilityNow, 0.01, 1, 0.9);
  const s = Math.max(FSRS_MIN_STABILITY, stability);
  const d = clampFinite(difficulty, 1, 10, 5);
  const hardPenalty = rating === 2 ? weights[15] : 1;
  const easyBonus = rating === 4 ? weights[16] : 1;
  const next =
    s *
    (1 +
      Math.exp(weights[8]) *
        (11 - d) *
        Math.pow(s, weights[9]) *
        (Math.exp((1 - r) * weights[10]) - 1) *
        hardPenalty *
        easyBonus);
  return Math.max(FSRS_MIN_STABILITY, next);
}

function nextForgetStability(
  difficulty: number,
  stability: number,
  retrievabilityNow: number,
  w: readonly number[],
): number {
  const weights = w.length >= 15 ? w : FSRS_DEFAULT_W;
  const r = clampFinite(retrievabilityNow, 0.01, 1, 0.5);
  const s = Math.max(FSRS_MIN_STABILITY, stability);
  const d = clampFinite(difficulty, 1, 10, 5);
  const next =
    weights[11] *
    Math.pow(d, weights[12]) *
    Math.pow(s + 1, weights[13]) *
    Math.exp((1 - r) * weights[14]);
  return clampFinite(next, FSRS_MIN_STABILITY, Math.max(s, 1), 1);
}

function intervalForStability(
  stability: number,
  requestRetention = FSRS_REQUEST_RETENTION,
): number {
  const s = Math.max(FSRS_MIN_STABILITY, stability);
  const rr = clampFinite(requestRetention, 0.7, 0.99, FSRS_REQUEST_RETENTION);
  const interval = (s / Math.log(0.9)) * Math.log(rr);
  if (!Number.isFinite(interval)) return 1;
  return clampFinite(Math.round(interval), 1, FSRS_MAX_INTERVAL_DAYS, 1);
}

/**
 * Advance one FSRS review. Returns the updated card memory plus an audit log.
 * `elapsedDaysOverride` lets tests avoid Date arithmetic; otherwise elapsed
 * time is derived from lastReview -> now.
 */
export function reviewCard(
  card: FsrsCardMemory,
  rating: FsrsRating,
  now: Date = new Date(),
  w: readonly number[] = FSRS_DEFAULT_W,
  requestRetention: number = FSRS_REQUEST_RETENTION,
): { card: FsrsCardMemory; log: FsrsReviewLog } {
  const weights = w.length >= 17 ? w : FSRS_DEFAULT_W;
  const at = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const prevLast = card.lastReview ? new Date(card.lastReview) : null;
  const measuredElapsed =
    prevLast && !Number.isNaN(prevLast.getTime())
      ? Math.max(0, (at.getTime() - prevLast.getTime()) / 86_400_000)
      : card.elapsedDays;
  const elapsed = clampFinite(measuredElapsed, 0, FSRS_MAX_INTERVAL_DAYS, 0);

  let stabilityAfter: number;
  let difficultyAfter: number;
  let nextState: FsrsState;

  if (card.reps === 0 && card.state === "new") {
    stabilityAfter = initialStability(rating, weights);
    difficultyAfter = initialDifficulty(rating, weights);
    nextState = rating === 1 ? "learning" : rating === 4 ? "review" : "learning";
  } else {
    const r = retrievability(elapsed, card.stability);
    difficultyAfter = nextDifficulty(card.difficulty, rating, weights);
    if (rating === 1) {
      stabilityAfter = nextForgetStability(difficultyAfter, card.stability, r, weights);
      nextState = "relearning";
    } else {
      stabilityAfter = nextRecallStability(card.difficulty, card.stability, r, rating, weights);
      nextState = "review";
    }
  }

  const scheduled = rating === 1 ? 0 : intervalForStability(stabilityAfter, requestRetention);
  const dueAt = new Date(at.getTime() + scheduled * 86_400_000);
  const updated: FsrsCardMemory = {
    cardId: card.cardId,
    due: dueAt.toISOString(),
    stability: stabilityAfter,
    difficulty: difficultyAfter,
    elapsedDays: elapsed,
    scheduledDays: scheduled,
    reps: card.reps + 1,
    lapses: card.lapses + (rating === 1 ? 1 : 0),
    state: nextState,
    lastReview: at.toISOString(),
  };
  const log: FsrsReviewLog = {
    cardId: card.cardId,
    rating,
    reviewedAt: at.toISOString(),
    elapsedDays: elapsed,
    scheduledDays: scheduled,
    stabilityBefore: card.stability,
    stabilityAfter,
    difficultyBefore: card.difficulty,
    difficultyAfter,
    retrievability: retrievability(elapsed, card.stability),
  };
  return { card: updated, log };
}

/** Sort helper: earliest-due first, new cards before far-future reviews. */
export function sortByDue(a: FsrsCardMemory, b: FsrsCardMemory): number {
  return new Date(a.due).getTime() - new Date(b.due).getTime();
}

/** Cards whose due timestamp has passed as of `now`. */
export function dueCards(cards: FsrsCardMemory[], now: Date = new Date()): FsrsCardMemory[] {
  const at = now instanceof Date && !Number.isNaN(now.getTime()) ? now.getTime() : Date.now();
  return cards.filter((c) => new Date(c.due).getTime() <= at).sort(sortByDue);
}

/** Forecast retrievability for every card t days from now. */
export function forecastRecall(
  cards: FsrsCardMemory[],
  daysAhead: number,
): Array<{ cardId: string; recall: number }> {
  const t = clampFinite(daysAhead, 0, FSRS_MAX_INTERVAL_DAYS, 0);
  return cards.map((c) => ({ cardId: c.cardId, recall: retrievability(t, c.stability) }));
}

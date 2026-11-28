import {
  createNewCard,
  dueCards,
  reviewCard,
  type FsrsCardMemory,
} from "@/engine/fsrsScheduler";
import type {
  LearnerStateV1,
  MasteryRecord,
  QuizHistoryEntry,
  QuizQuestion,
} from "./types";

const QUIZ_HISTORY_CAP = 400;
const DAY_MS = 86_400_000;

/**
 * Explicit recall policy. Band gaps exceed the maximum age/miss weights, so a
 * due card always wins over missed, unseen, and remainder questions. Inside a
 * band, older reviews and repeated misses win before the seeded tie-break.
 */
const RECALL_PRIORITY = {
  due: 4_000_000,
  missed: 3_000_000,
  unseen: 2_000_000,
  remainder: 1_000_000,
  ageDay: 100,
  missedReview: 1_000,
} as const;

/** Small deterministic LCG used only to break equal-priority recall ties. */
export function createSeededRandom(seedMs: number): () => number {
  let state = (Number.isFinite(seedMs) ? Math.trunc(seedMs) : 0) >>> 0;
  return () => {
    state = (Math.imul(1_664_525, state) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

function hashSeed(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Creates an unpredictable session seed without making the shuffle impure. */
export function createQuizSessionSeed(): number {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    try {
      const value = new Uint32Array(1);
      cryptoApi.getRandomValues(value);
      return value[0];
    } catch {
      // Restricted hosts can expose crypto without allowing random generation.
    }
  }
  return (Date.now() ^ Math.floor(Math.random() * 0x1_000_000_000)) >>> 0;
}

/**
 * Returns a session-specific copy with a deterministically shuffled choice
 * order. The authored question and choices array are never mutated; the answer
 * is tracked by its original index so duplicate choice text remains safe.
 */
export function shuffleQuizChoices(
  question: QuizQuestion,
  sessionSeed: number | string,
): QuizQuestion {
  if (question.choices.length !== 4 || question.answerIndex < 0 || question.answerIndex > 3) {
    throw new Error(`Invalid quiz choices for ${question.topicId}/${question.id}`);
  }

  const seedText = typeof sessionSeed === "number" && Number.isFinite(sessionSeed)
    ? String(Math.trunc(sessionSeed))
    : String(sessionSeed);
  const random = createSeededRandom(hashSeed(`${seedText}\u0000${question.topicId}\u0000${question.id}`));
  const ordered = question.choices.map((choice, originalIndex) => ({ choice, originalIndex }));

  for (let index = ordered.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [ordered[index], ordered[swapIndex]] = [ordered[swapIndex], ordered[index]];
  }

  const answerIndex = ordered.findIndex((entry) => entry.originalIndex === question.answerIndex);
  if (answerIndex < 0 || answerIndex > 3) {
    throw new Error(`Invalid quiz answer for ${question.topicId}/${question.id}`);
  }

  return {
    ...question,
    choices: ordered.map(({ choice }) => choice) as QuizQuestion["choices"],
    answerIndex: answerIndex as QuizQuestion["answerIndex"],
  };
}

function safeNow(nowMs: number): Date {
  return new Date(Number.isFinite(nowMs) ? nowMs : 0);
}

interface HistoryStats {
  correct: number;
  incorrect: number;
  latestAt: number;
  latestCorrect: boolean | null;
}

interface RankedQuestion {
  question: QuizQuestion;
  priority: number;
  tie: number;
}

/**
 * Selects eligible content using the product's explicit recall policy:
 * due FSRS cards first, then missed questions, unseen questions, and the
 * remaining reviewed questions. Older reviews and repeated misses take priority
 * inside a band; `sessionSeed` deterministically shuffles equal-priority ties.
 * New topics are not considered due merely because a new card starts due now.
 */
export function selectRecallQuestions(
  state: LearnerStateV1,
  bank: readonly QuizQuestion[],
  count: number,
  nowMs: number,
  sessionSeed: number = nowMs,
): QuizQuestion[] {
  if (!Number.isFinite(count) || count <= 0 || bank.length === 0) return [];

  const eligible = new Set([
    ...state.completedLessons,
    ...state.readBlogs,
    ...state.visitedTopics,
  ]);
  if (eligible.size === 0) return [];

  const now = safeNow(nowMs);
  const nowTime = now.getTime();
  const statsByQuestion = new Map<string, HistoryStats>();
  for (const entry of state.quizHistory) {
    const key = `${entry.topicId}\u0000${entry.questionId}`;
    const previous = statsByQuestion.get(key);
    const at = new Date(entry.at).getTime();
    const latestAt = Number.isFinite(at) ? at : 0;
    statsByQuestion.set(key, {
      correct: (previous?.correct ?? 0) + (entry.correct ? 1 : 0),
      incorrect: (previous?.incorrect ?? 0) + (entry.correct ? 0 : 1),
      latestAt: Math.max(previous?.latestAt ?? 0, latestAt),
      latestCorrect: !previous || latestAt >= previous.latestAt
        ? entry.correct
        : previous.latestCorrect,
    });
  }

  const cards: FsrsCardMemory[] = [];
  const cardIndexByTopic = new Map<string, number>();
  const seenQuestions = new Set<string>();
  const candidates: Array<{
    question: QuizQuestion;
    stats: HistoryStats | undefined;
    cardIndex: number;
  }> = [];

  for (const question of bank) {
    if (!eligible.has(question.topicId)) continue;
    const questionKey = `${question.topicId}\u0000${question.id}`;
    if (seenQuestions.has(questionKey)) continue;
    seenQuestions.add(questionKey);

    let cardIndex = cardIndexByTopic.get(question.topicId);
    if (cardIndex === undefined) {
      const mastery = state.mastery[question.topicId];
      cardIndex = cards.length;
      cards.push(mastery?.fsrs ?? createNewCard(mastery?.fsrsCardId ?? question.topicId, now));
      cardIndexByTopic.set(question.topicId, cardIndex);
    }
    candidates.push({
      question,
      stats: statsByQuestion.get(questionKey),
      cardIndex,
    });
  }

  if (candidates.length === 0) return [];
  const dueCardIndexes = new Set(dueCards(cards, now).map((card) => cards.indexOf(card)));
  const random = createSeededRandom(Number.isFinite(sessionSeed) ? sessionSeed : nowMs);
  const ranked: RankedQuestion[] = candidates.map(({ question, stats, cardIndex }) => {
    const mastery = state.mastery[question.topicId];
    const masteryReviewedAt = mastery?.lastReviewedAt
      ? new Date(mastery.lastReviewedAt).getTime()
      : 0;
    const reviewedAt = Math.max(
      Number.isFinite(masteryReviewedAt) ? masteryReviewedAt : 0,
      stats?.latestAt ?? 0,
    );
    const ageDays = reviewedAt > 0
      ? Math.min(3650, Math.max(0, (nowTime - reviewedAt) / DAY_MS))
      : 0;
    const incorrect = stats?.incorrect ?? 0;
    const hasScheduledReview = mastery?.fsrs !== undefined || Boolean(mastery?.lastReviewedAt);
    const isDue = hasScheduledReview && dueCardIndexes.has(cardIndex);
    const missed = stats?.latestCorrect === false;

    let band: number = RECALL_PRIORITY.remainder;
    if (isDue) band = RECALL_PRIORITY.due;
    else if (missed) band = RECALL_PRIORITY.missed;
    else if (!stats) band = RECALL_PRIORITY.unseen;
    const priority = band +
      ageDays * RECALL_PRIORITY.ageDay +
      Math.min(incorrect, 100) * RECALL_PRIORITY.missedReview;

    return { question, priority, tie: random() };
  });

  ranked.sort((a, b) =>
    b.priority - a.priority ||
    b.tie - a.tie ||
    a.question.topicId.localeCompare(b.question.topicId) ||
    a.question.id.localeCompare(b.question.id),
  );

  const limit = Math.min(ranked.length, Math.max(0, Math.floor(count)));
  return ranked.slice(0, limit).map(({ question }) => question);
}

/** Pure recall update shared by the platform store and tests. */
export function rateRecall(
  state: LearnerStateV1,
  question: QuizQuestion,
  correct: boolean,
  nowMs: number,
): LearnerStateV1 {
  const now = safeNow(nowMs);
  const reviewedAt = now.toISOString();
  const previous: MasteryRecord = state.mastery[question.topicId] ?? {
    correct: 0,
    incorrect: 0,
    lastReviewedAt: null,
    fsrsCardId: question.topicId,
  };
  const card = previous.fsrs ?? createNewCard(previous.fsrsCardId || question.topicId, now);
  const reviewed = reviewCard(card, correct ? 3 : 1, now).card;
  const entry: QuizHistoryEntry = {
    questionId: question.id,
    topicId: question.topicId,
    correct,
    at: reviewedAt,
  };

  return {
    version: state.version,
    completedLessons: state.completedLessons,
    readBlogs: state.readBlogs,
    visitedTopics: state.visitedTopics,
    mastery: {
      ...state.mastery,
      [question.topicId]: {
        correct: previous.correct + (correct ? 1 : 0),
        incorrect: previous.incorrect + (correct ? 0 : 1),
        lastReviewedAt: reviewedAt,
        fsrsCardId: previous.fsrsCardId || question.topicId,
        fsrs: reviewed,
      },
    },
    quizHistory: [...state.quizHistory, entry].slice(-QUIZ_HISTORY_CAP),
    notes: state.notes,
    bookmarks: state.bookmarks,
    resume: state.resume,
    prefs: state.prefs,
  };
}

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

/** Small deterministic LCG used only to break equal-priority recall ties. */
export function createSeededRandom(seedMs: number): () => number {
  let state = (Number.isFinite(seedMs) ? Math.trunc(seedMs) : 0) >>> 0;
  return () => {
    state = (Math.imul(1_664_525, state) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

function safeNow(nowMs: number): Date {
  return new Date(Number.isFinite(nowMs) ? nowMs : 0);
}

interface HistoryStats {
  correct: number;
  incorrect: number;
  latestAt: number;
}

interface RankedQuestion {
  question: QuizQuestion;
  priority: number;
  tie: number;
}

/**
 * Selects only content the learner has opened, favouring missed questions,
 * then unseen questions, then previously correct questions. FSRS due state and
 * review age order questions inside those three bands.
 */
export function selectRecallQuestions(
  state: LearnerStateV1,
  bank: readonly QuizQuestion[],
  count: number,
  nowMs: number,
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
  const random = createSeededRandom(nowMs);
  const ranked: RankedQuestion[] = candidates.map(({ question, stats, cardIndex }) => {
    const mastery = state.mastery[question.topicId];
    const reviewedAt = mastery?.lastReviewedAt
      ? new Date(mastery.lastReviewedAt).getTime()
      : stats?.latestAt ?? 0;
    const ageDays = Number.isFinite(reviewedAt)
      ? Math.min(3650, Math.max(0, (nowTime - reviewedAt) / DAY_MS))
      : 0;
    const incorrect = stats?.incorrect ?? 0;

    // Three explicit bands keep unseen questions between missed and mastered.
    const band = incorrect > 0 ? 2 : stats ? 0 : 1;
    const dueBonus = dueCardIndexes.has(cardIndex) ? 100_000 : 0;
    const priority = band * 1_000_000 + dueBonus + ageDays * 100 + Math.min(incorrect, 100) * 10;

    return { question, priority, tie: random() };
  });

  ranked.sort((a, b) =>
    b.priority - a.priority ||
    b.tie - a.tie ||
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

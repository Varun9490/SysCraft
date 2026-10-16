import { create } from "zustand";
import {
  createNewCard,
  dueCards,
  reviewCard,
  type FsrsCardMemory,
  type FsrsRating,
  type FsrsReviewLog,
} from "@/engine/fsrsScheduler";
import type { Flashcard } from "@/types/encyclopedia";
import type { LabProgress } from "@/types/challenges";
import { loadFsrsCards, loadLabProgress, putFsrsCards, putLabProgress } from "./db";
import type { FsrsCardRecord } from "./db";

/**
 * Learning store: FSRS flashcard memory, lab progress, and the unlocked
 * skill-constellation DAG (Milestone 3).
 *
 * Card memory persists to IndexedDB (`fsrsCards`) and hydrates lazily on
 * first Almanac mount; every helper guards non-browser runtimes so Vitest
 * can import the pure review path without IndexedDB.
 */

const REVIEW_LOG_CAP = 200;

interface LearningState {
  cards: Record<string, FsrsCardMemory>;
  cardModule: Record<string, string>;
  reviewLog: FsrsReviewLog[];
  labProgress: Record<string, LabProgress>;
  unlockedSkills: string[];
  hydrated: boolean;

  ensureCard: (cardId: string, moduleId?: string) => void;
  loadFlashcardsForModule: (moduleId: string, flashcards: Flashcard[]) => void;
  review: (cardId: string, rating: FsrsRating, now?: Date) => FsrsReviewLog | null;
  dueCards: (now?: Date) => FsrsCardMemory[];
  dueCount: (now?: Date) => number;
  setLabProgress: (progress: LabProgress) => void;
  completeLabStage: (labId: string, stageId: string, score: number, costUsd?: number) => void;
  unlockSkill: (skillId: string) => void;
  resetProgress: () => void;
  hydrateFromDb: () => Promise<void>;
  persistToDb: () => Promise<boolean>;
}

function labTimestamp(progress: LabProgress): string {
  return new Date().toISOString();
}

export const useLearningStore = create<LearningState>()((set, get) => ({
  cards: {},
  cardModule: {},
  reviewLog: [],
  labProgress: {},
  unlockedSkills: ["foundations"],
  hydrated: false,

  ensureCard: (cardId, moduleId = "general") => {
    const { cards, cardModule } = get();
    if (cards[cardId]) return;
    set({
      cards: { ...cards, [cardId]: createNewCard(cardId) },
      cardModule: { ...cardModule, [cardId]: moduleId },
    });
  },

  loadFlashcardsForModule: (moduleId, flashcards) => {
    const { cards, cardModule } = get();
    const nextCards = { ...cards };
    const nextModule = { ...cardModule };
    for (const card of flashcards) {
      if (!nextCards[card.cardId]) {
        nextCards[card.cardId] = createNewCard(card.cardId);
      }
      nextModule[card.cardId] = moduleId;
    }
    set({ cards: nextCards, cardModule: nextModule });
  },

  review: (cardId, rating, now = new Date()) => {
    const { cards } = get();
    const memory = cards[cardId] ?? createNewCard(cardId);
    const { card, log } = reviewCard(memory, rating, now);
    const reviewLog = [log, ...get().reviewLog].slice(0, REVIEW_LOG_CAP);
    set({ cards: { ...cards, [cardId]: card }, reviewLog });
    void get().persistToDb();
    return log;
  },

  dueCards: (now = new Date()) => dueCards(Object.values(get().cards), now),

  dueCount: (now = new Date()) => dueCards(Object.values(get().cards), now).length,

  setLabProgress: (progress) => {
    const stamped: LabProgress = { ...progress, updatedAt: labTimestamp(progress) };
    set((state) => ({ labProgress: { ...state.labProgress, [progress.labId]: stamped } }));
    void putLabProgress({ ...stamped, updatedAt: stamped.updatedAt });
  },

  completeLabStage: (labId, stageId, score, costUsd) => {
    const prev = get().labProgress[labId];
    const completedStages = prev && prev.completedStages.includes(stageId)
      ? prev.completedStages
      : [...(prev?.completedStages ?? []), stageId];
    const stamped: LabProgress = {
      labId,
      currentStage: (prev?.currentStage ?? 0) + 1,
      completedStages,
      bestScore: Math.max(prev?.bestScore ?? 0, Math.max(0, Math.min(100, score))),
      bestCostUsd: typeof costUsd === "number" ? costUsd : (prev?.bestCostUsd ?? null),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ labProgress: { ...state.labProgress, [labId]: stamped } }));
    void putLabProgress({ ...stamped, updatedAt: stamped.updatedAt });
  },

  unlockSkill: (skillId) => {
    const { unlockedSkills } = get();
    if (unlockedSkills.includes(skillId)) return;
    set({ unlockedSkills: [...unlockedSkills, skillId] });
  },

  resetProgress: () => {
    set({
      cards: {},
      cardModule: {},
      reviewLog: [],
      labProgress: {},
      unlockedSkills: ["foundations"],
    });
  },

  hydrateFromDb: async () => {
    if (get().hydrated) return;
    try {
      const [cardRows, labRows] = await Promise.all([loadFsrsCards(), loadLabProgress()]);
      if (cardRows.length > 0 || labRows.length > 0) {
        const cards: Record<string, FsrsCardMemory> = {};
        const cardModule: Record<string, string> = {};
        for (const row of cardRows) {
          const { moduleId, ...memory } = row;
          cards[memory.cardId] = memory;
          cardModule[memory.cardId] = moduleId;
        }
        const labProgress: Record<string, LabProgress> = {};
        for (const row of labRows) {
          labProgress[row.labId] = {
            labId: row.labId,
            currentStage: row.currentStage,
            completedStages: row.completedStages,
            bestScore: row.bestScore,
            bestCostUsd: row.bestCostUsd,
            updatedAt: row.updatedAt,
          };
        }
        set({
          cards: { ...get().cards, ...cards },
          cardModule: { ...get().cardModule, ...cardModule },
          labProgress: { ...get().labProgress, ...labProgress },
        });
      }
    } catch {
      /* offline or fresh profile; memory state remains authoritative */
    } finally {
      set({ hydrated: true });
    }
  },

  persistToDb: async () => {
    const { cards, cardModule } = get();
    const rows: FsrsCardRecord[] = Object.values(cards).map((card) => ({
      ...card,
      moduleId: cardModule[card.cardId] ?? "general",
    }));
    return putFsrsCards(rows);
  },
}));

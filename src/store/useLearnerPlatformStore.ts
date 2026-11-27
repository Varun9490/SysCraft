import { create } from "zustand";
import { rateRecall } from "@/learning/platform/quizSelect";
import { loadLearnerState, saveLearnerState } from "@/learning/platform/storage";
import {
  emptyLearnerState,
  isLearnerState,
  type BreakMinutes,
  type LearningMode,
  type LearnerStateV1,
  type QuizQuestion,
  type ResumePointer,
  type ThemePref,
} from "@/learning/platform/types";

export interface LearnerPlatformStore extends LearnerStateV1 {
  hydrated: boolean;
  setMode: (mode: LearningMode) => void;
  setTheme: (theme: ThemePref) => void;
  setAmbient: (ambient: boolean) => void;
  setCursor: (cursor: boolean) => void;
  setBreakMinutes: (minutes: BreakMinutes) => void;
  markLessonComplete: (lessonId: string) => void;
  markBlogRead: (blogId: string) => void;
  visitTopic: (topicId: string) => void;
  setNote: (topicId: string, note: string) => void;
  toggleBookmark: (topicId: string) => void;
  setResume: (resume: ResumePointer | null) => void;
  recordAnswer: (question: QuizQuestion, correct: boolean, nowMs?: number) => void;
  resetProgress: () => void;
  replaceState: (state: LearnerStateV1) => void;
  hydrate: () => void;
}

export type LearnerPlatformState = LearnerPlatformStore;

function appendUnique(values: readonly string[], value: string): string[] {
  return values.includes(value) ? [...values] : [...values, value];
}

function learnerSnapshot(state: LearnerStateV1): LearnerStateV1 {
  return {
    version: 1,
    completedLessons: state.completedLessons,
    readBlogs: state.readBlogs,
    visitedTopics: state.visitedTopics,
    mastery: state.mastery,
    quizHistory: state.quizHistory,
    notes: state.notes,
    bookmarks: state.bookmarks,
    resume: state.resume,
    prefs: state.prefs,
  };
}

export const useLearnerPlatformStore = create<LearnerPlatformStore>()((set, get) => {
  const commit = (next: LearnerStateV1): void => {
    const snapshot = learnerSnapshot(next);
    set(snapshot);
    saveLearnerState(snapshot);
  };

  return {
    ...emptyLearnerState(),
    hydrated: false,

    setMode: (mode) => {
      const current = get();
      commit({ ...current, prefs: { ...current.prefs, mode } });
    },
    setTheme: (theme) => {
      const current = get();
      commit({ ...current, prefs: { ...current.prefs, theme } });
    },
    setAmbient: (ambient) => {
      const current = get();
      commit({ ...current, prefs: { ...current.prefs, ambient } });
    },
    setCursor: (cursor) => {
      const current = get();
      commit({ ...current, prefs: { ...current.prefs, cursor } });
    },
    setBreakMinutes: (breakMinutes) => {
      const current = get();
      commit({ ...current, prefs: { ...current.prefs, breakMinutes } });
    },

    markLessonComplete: (lessonId) => {
      const current = get();
      if (current.completedLessons.includes(lessonId)) return;
      commit({ ...current, completedLessons: appendUnique(current.completedLessons, lessonId) });
    },
    markBlogRead: (blogId) => {
      const current = get();
      if (current.readBlogs.includes(blogId)) return;
      commit({ ...current, readBlogs: appendUnique(current.readBlogs, blogId) });
    },
    visitTopic: (topicId) => {
      const current = get();
      if (current.visitedTopics.includes(topicId)) return;
      commit({ ...current, visitedTopics: appendUnique(current.visitedTopics, topicId) });
    },
    setNote: (topicId, note) => {
      const current = get();
      const notes = { ...current.notes };
      if (note.length === 0) delete notes[topicId];
      else notes[topicId] = note;
      commit({ ...current, notes });
    },
    toggleBookmark: (topicId) => {
      const current = get();
      const bookmarks = current.bookmarks.includes(topicId)
        ? current.bookmarks.filter((id) => id !== topicId)
        : [...current.bookmarks, topicId];
      commit({ ...current, bookmarks });
    },
    setResume: (resume) => {
      const current = get();
      commit({ ...current, resume: resume ? { ...resume } : null });
    },
    recordAnswer: (question, correct, nowMs = Date.now()) => {
      commit(rateRecall(get(), question, correct, nowMs));
    },

    resetProgress: () => {
      const fresh = emptyLearnerState();
      // Settings are preferences rather than learning progress and survive a reset.
      fresh.prefs = { ...get().prefs };
      commit(fresh);
    },
    replaceState: (state) => {
      if (!isLearnerState(state)) throw new Error("Invalid progress file");
      commit({
        ...state,
        prefs: { ...state.prefs },
        completedLessons: [...state.completedLessons],
        readBlogs: [...state.readBlogs],
        visitedTopics: [...state.visitedTopics],
        mastery: { ...state.mastery },
        quizHistory: [...state.quizHistory],
        notes: { ...state.notes },
        bookmarks: [...state.bookmarks],
        resume: state.resume ? { ...state.resume } : null,
      });
    },
    hydrate: () => {
      if (get().hydrated) return;
      set({ ...loadLearnerState(), hydrated: true });
    },
  };
});

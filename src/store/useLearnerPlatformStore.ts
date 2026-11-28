import { create } from "zustand";
import { rateRecall } from "@/learning/platform/quizSelect";
import {
  commitLearnerState,
  getLearnerPersistenceStatus,
  LEARNER_STATE_LIMITS,
  loadLearnerState,
  normalizeLearnerState,
  subscribeToLearnerPersistence,
  subscribeToLearnerStorage,
  type LearnerPersistenceResult,
  type LearnerPersistenceStatus,
  type LearnerStateUpdater,
} from "@/learning/platform/storage";
import {
  emptyLearnerState,
  isLearnerState,
  LEARNER_STORAGE_KEY,
  type BreakMinutes,
  type LearningMode,
  type LearnerStateV1,
  type QuizQuestion,
  type ResumePointer,
  type ThemePref,
} from "@/learning/platform/types";

export interface LearnerPlatformStore extends LearnerStateV1 {
  hydrated: boolean;
  persistenceStatus: LearnerPersistenceStatus;
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

const NOTE_WRITE_DEBOUNCE_MS = 300;

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

function withNote(state: LearnerStateV1, topicId: string, note: string): LearnerStateV1 {
  const notes = { ...state.notes };
  // Reinsert edited notes so bounds evict the least-recently-edited entry first.
  delete notes[topicId];
  if (note.length > 0) notes[topicId] = note.slice(0, LEARNER_STATE_LIMITS.noteCharacters);
  return { ...state, notes };
}

export const useLearnerPlatformStore = create<LearnerPlatformStore>()((set, get) => {
  let noteTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingNotes = new Map<string, string>();
  let unsubscribeStorage: (() => void) | null = null;
  let unsubscribePersistence: (() => void) | null = null;
  let pagehideHandler: (() => void) | null = null;

  const clearNoteTimer = (): void => {
    if (noteTimer === null) return;
    clearTimeout(noteTimer);
    noteTimer = null;
  };

  const applyPersistenceResult = (result: LearnerPersistenceResult): void => {
    set({
      ...learnerSnapshot(result.state),
      persistenceStatus: result.status,
    });
  };

  const cancelPendingNotes = (): void => {
    clearNoteTimer();
    pendingNotes.clear();
  };

  const flushPendingNotes = (): void => {
    clearNoteTimer();
    if (pendingNotes.size === 0) return;
    const updates = [...pendingNotes.entries()];
    pendingNotes.clear();
    const result = commitLearnerState(
      (latest) => {
        let next = latest;
        for (const [topicId, note] of updates) next = withNote(next, topicId, note);
        return next;
      },
      { fallback: learnerSnapshot(get()) },
    );
    applyPersistenceResult(result);
  };

  const commit = (updater: LearnerStateUpdater, replace = false): void => {
    if (replace) cancelPendingNotes();
    else flushPendingNotes();
    const result = commitLearnerState(updater, { fallback: learnerSnapshot(get()) });
    applyPersistenceResult(result);
  };

  const detachListeners = (): void => {
    unsubscribeStorage?.();
    unsubscribePersistence?.();
    unsubscribeStorage = null;
    unsubscribePersistence = null;
    if (
      pagehideHandler &&
      typeof window !== "undefined" &&
      typeof window.removeEventListener === "function"
    ) {
      window.removeEventListener("pagehide", pagehideHandler);
    }
    pagehideHandler = null;
  };

  const ensurePagehideListener = (): void => {
    if (pagehideHandler || typeof window === "undefined" || typeof window.addEventListener !== "function") return;
    pagehideHandler = flushPendingNotes;
    window.addEventListener("pagehide", pagehideHandler);
  };

  const attachListeners = (): void => {
    detachListeners();
    unsubscribePersistence = subscribeToLearnerPersistence(() => {
      const status = getLearnerPersistenceStatus().status;
      if (get().persistenceStatus !== status) set({ persistenceStatus: status });
    });
    unsubscribeStorage = subscribeToLearnerStorage((event) => {
      if (event.newValue === null) {
        let learnerKeyMissing = false;
        try {
          learnerKeyMissing = window.localStorage.getItem(LEARNER_STORAGE_KEY) === null;
        } catch {
          // The normal load path below will surface the storage error.
        }
        if (learnerKeyMissing) {
          // Another tab may have performed an explicit local-data wipe. Do not
          // immediately recreate deleted keys through the normal migration path.
          cancelPendingNotes();
          set({ ...emptyLearnerState(), persistenceStatus: "idle" });
          return;
        }
      }
      // Persist local trailing edits before adopting the newest cross-tab state.
      flushPendingNotes();
      const latest = loadLearnerState();
      set({
        ...learnerSnapshot(latest),
        persistenceStatus: getLearnerPersistenceStatus().status,
      });
    });
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      ensurePagehideListener();
    }
  };

  return {
    ...emptyLearnerState(),
    hydrated: false,
    persistenceStatus: "idle",

    setMode: (mode) => {
      commit((latest) => ({ ...latest, prefs: { ...latest.prefs, mode } }));
    },
    setTheme: (theme) => {
      commit((latest) => ({ ...latest, prefs: { ...latest.prefs, theme } }));
    },
    setAmbient: (ambient) => {
      commit((latest) => ({ ...latest, prefs: { ...latest.prefs, ambient } }));
    },
    setCursor: (cursor) => {
      commit((latest) => ({ ...latest, prefs: { ...latest.prefs, cursor } }));
    },
    setBreakMinutes: (breakMinutes) => {
      commit((latest) => ({ ...latest, prefs: { ...latest.prefs, breakMinutes } }));
    },

    markLessonComplete: (lessonId) => {
      commit((latest) => ({
        ...latest,
        completedLessons: appendUnique(latest.completedLessons, lessonId),
      }));
    },
    markBlogRead: (blogId) => {
      commit((latest) => ({ ...latest, readBlogs: appendUnique(latest.readBlogs, blogId) }));
    },
    visitTopic: (topicId) => {
      commit((latest) => ({ ...latest, visitedTopics: appendUnique(latest.visitedTopics, topicId) }));
    },
    setNote: (topicId, note) => {
      pendingNotes.set(topicId, note);
      const next = normalizeLearnerState(withNote(learnerSnapshot(get()), topicId, note));
      set({ ...next, persistenceStatus: "pending" });
      ensurePagehideListener();
      clearNoteTimer();
      noteTimer = setTimeout(flushPendingNotes, NOTE_WRITE_DEBOUNCE_MS);
    },
    toggleBookmark: (topicId) => {
      commit((latest) => ({
        ...latest,
        bookmarks: latest.bookmarks.includes(topicId)
          ? latest.bookmarks.filter((id) => id !== topicId)
          : appendUnique(latest.bookmarks, topicId),
      }));
    },
    setResume: (resume) => {
      commit((latest) => ({ ...latest, resume: resume ? { ...resume } : null }));
    },
    recordAnswer: (question, correct, nowMs = Date.now()) => {
      commit((latest) => rateRecall(latest, question, correct, nowMs));
    },

    resetProgress: () => {
      commit((latest) => {
        const fresh = emptyLearnerState();
        // Settings are preferences rather than learning progress and survive a reset.
        fresh.prefs = { ...latest.prefs };
        return fresh;
      }, true);
    },
    replaceState: (state) => {
      if (!isLearnerState(state)) throw new Error("Invalid progress file");
      const replacement = normalizeLearnerState(state);
      commit(() => replacement, true);
    },
    hydrate: () => {
      if (get().hydrated) return;
      flushPendingNotes();
      const loaded = loadLearnerState();
      set({
        ...learnerSnapshot(loaded),
        hydrated: true,
        persistenceStatus: getLearnerPersistenceStatus().status,
      });
      attachListeners();
    },
  };
});

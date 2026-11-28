import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BLOGS, findQuizBank, TRACKS } from "@/content/platform/registry";
import { GUIDED_LABS } from "@/data/guidedLabs";
import {
  decodeNotation,
  estimateCapacity,
  estimateErrorBudget,
  estimateKvCache,
  notationEntries,
  type CapacityInput,
  type KvCacheInput,
} from "@/learning/platform/calculators";
import { getPlatformLab, PLATFORM_LABS } from "@/learning/platform/labCatalog";
import { rateRecall, selectRecallQuestions, shuffleQuizChoices } from "@/learning/platform/quizSelect";
import {
  commitLearnerState,
  exportLearnerJson,
  getLegacyMigrationDiagnostics,
  getLearnerPersistenceStatus,
  importLearnerJson,
  LEARNER_META_STORAGE_KEY,
  LEARNER_STATE_LIMITS,
  loadLearnerState,
  MAX_IMPORT_BYTES,
  normalizeLearnerState,
} from "@/learning/platform/storage";
import { useLearnerPlatformStore } from "@/store/useLearnerPlatformStore";
import {
  emptyLearnerState,
  isLearnerState,
  LEARNER_STORAGE_KEY,
  type LearnerStateV1,
  type QuizQuestion,
} from "@/learning/platform/types";

const NOW_MS = Date.UTC(2026, 0, 15, 12);
const DAY_MS = 86_400_000;

function makeQuestion(id: string, topicId: string): QuizQuestion {
  return {
    id,
    topicId,
    prompt: `${id} prompt`,
    choices: ["Choice A", "Choice B", "Choice C", "Choice D"],
    answerIndex: 0,
    explanation: `${id} explanation`,
    kind: "scenario",
  };
}

const readQuestion = makeQuestion("read-question", "read-topic");
const unreadQuestion = makeQuestion("unread-question", "unread-topic");
const recallBank = [readQuestion, unreadQuestion];

function expectInvalidProgressFile(raw: string): void {
  let thrown: unknown;
  try {
    importLearnerJson(raw);
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(Error);
  expect((thrown as Error).message).toContain("Invalid progress file");
}

function expectFiniteNumbers(values: readonly number[]): void {
  for (const value of values) {
    expect(Number.isFinite(value)).toBe(true);
  }
}

function capacityInput(value: number): CapacityInput {
  return {
    dau: value,
    requestsPerUserPerDay: value,
    readWriteRatio: value,
    peakFactor: value,
    payloadKb: value,
    retentionDays: value,
  };
}

function kvCacheInput(value: number): KvCacheInput {
  return {
    paramsBillion: value,
    precisionBits: value,
    layers: value,
    kvHeads: value,
    headDim: value,
    contextTokens: value,
    batch: value,
  };
}

function errorBudgetInput(value: number): { slaPercent: number; windowDays: number } {
  return { slaPercent: value, windowDays: value };
}

const hostileCapacityCases: Array<{ label: string; input: CapacityInput }> = [
  { label: "negative", input: capacityInput(-1) },
  { label: "zero", input: capacityInput(0) },
  { label: "huge", input: capacityInput(Number.MAX_VALUE) },
  { label: "NaN", input: capacityInput(Number.NaN) },
  { label: "infinite", input: capacityInput(Number.POSITIVE_INFINITY) },
  { label: "missing-as-zero", input: {} as CapacityInput },
];

const hostileKvCacheCases: Array<{ label: string; input: KvCacheInput }> = [
  { label: "negative", input: kvCacheInput(-1) },
  { label: "zero", input: kvCacheInput(0) },
  { label: "huge", input: kvCacheInput(Number.MAX_VALUE) },
  { label: "NaN", input: kvCacheInput(Number.NaN) },
  { label: "infinite", input: kvCacheInput(Number.POSITIVE_INFINITY) },
  { label: "missing-as-zero", input: {} as KvCacheInput },
];

const hostileErrorBudgetCases: Array<{
  label: string;
  input: { slaPercent: number; windowDays: number };
}> = [
  { label: "negative", input: errorBudgetInput(-1) },
  { label: "zero", input: errorBudgetInput(0) },
  { label: "huge", input: errorBudgetInput(Number.MAX_VALUE) },
  { label: "NaN", input: errorBudgetInput(Number.NaN) },
  { label: "infinite", input: errorBudgetInput(Number.POSITIVE_INFINITY) },
  { label: "missing-as-zero", input: {} as { slaPercent: number; windowDays: number } },
];

describe("learner state and storage", () => {
  it("exposes the stable storage key and a valid empty version 1 state", () => {
    expect(LEARNER_STORAGE_KEY).toBe("syscraft.learner.v1");

    const state = emptyLearnerState();
    expect(state.version).toBe(1);
    expect(state.completedLessons).toEqual([]);
    expect(state.readBlogs).toEqual([]);
    expect(state.visitedTopics).toEqual([]);
    expect(isLearnerState(state)).toBe(true);
  });

  it("loads a version 1 state in Node without touching browser APIs", () => {
    expect(typeof window).toBe("undefined");

    const loaded = loadLearnerState();
    expect(loaded.version).toBe(1);
    expect(loaded).toEqual(emptyLearnerState());
  });

  it("round-trips an exported empty state through import validation", () => {
    const exported = exportLearnerJson(emptyLearnerState());
    const imported = importLearnerJson(exported);

    expect(isLearnerState(imported)).toBe(true);
    expect(imported).toEqual(emptyLearnerState());
  });

  it.each([
    ["malformed JSON", "{not-json"],
    ["wrong version", JSON.stringify({ ...emptyLearnerState(), version: 2 })],
  ])("rejects %s with an Invalid progress file Error", (_label, raw) => {
    expectInvalidProgressFile(raw);
  });
});

class MemoryStorage implements Storage {
  readonly entries = new Map<string, string>();
  readonly writes: Array<[string, string]> = [];
  readError: Error | null = null;
  writeError: Error | null = null;

  get length(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }

  getItem(key: string): string | null {
    if (this.readError) throw this.readError;
    return this.entries.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    if (this.writeError) throw this.writeError;
    this.entries.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.writeError) throw this.writeError;
    this.entries.set(key, value);
    this.writes.push([key, value]);
  }
}

function installBrowserStorage(): { storage: MemoryStorage; events: EventTarget } {
  const storage = new MemoryStorage();
  const events = new EventTarget();
  vi.stubGlobal("window", {
    localStorage: storage,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  });
  return { storage, events };
}

function dispatchStorage(events: EventTarget, key: string, newValue?: string | null): void {
  const event = new Event("storage");
  Object.defineProperty(event, "key", { value: key });
  Object.defineProperty(event, "newValue", { value: newValue });
  events.dispatchEvent(event);
}

function resetLearnerStore(): void {
  useLearnerPlatformStore.setState(useLearnerPlatformStore.getInitialState(), true);
}

describe("learner persistence regressions", () => {
  let browser: { storage: MemoryStorage; events: EventTarget };

  beforeEach(() => {
    vi.useFakeTimers();
    browser ??= installBrowserStorage();
    browser.storage.clear();
    browser.storage.writes.length = 0;
    browser.storage.readError = null;
    browser.storage.writeError = null;
    resetLearnerStore();
  });

  afterEach(() => {
    window.dispatchEvent(new Event("pagehide"));
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("merges another tab's quiz, notes, preferences, and completions before a stale local commit", () => {
    const { storage, events } = browser;
    storage.setItem(LEARNER_STORAGE_KEY, JSON.stringify(emptyLearnerState()));
    useLearnerPlatformStore.getState().hydrate();

    const remote: LearnerStateV1 = {
      ...emptyLearnerState(),
      completedLessons: ["single-server"],
      quizHistory: [
        {
          questionId: "remote-question",
          topicId: "remote-topic",
          correct: true,
          at: new Date(NOW_MS).toISOString(),
        },
      ],
      notes: { remote: "written in the other tab" },
      prefs: { ...emptyLearnerState().prefs, mode: "engineer", theme: "light" },
    };
    commitLearnerState(() => remote);

    // No storage event is delivered, so the local Zustand snapshot is stale.
    expect(useLearnerPlatformStore.getState().quizHistory).toEqual([]);
    useLearnerPlatformStore.getState().setAmbient(false);
    useLearnerPlatformStore.getState().markBlogRead("database-melts-at-10k-rps");
    useLearnerPlatformStore.getState().recordAnswer(readQuestion, true, NOW_MS + 60_000);
    useLearnerPlatformStore.getState().setNote("local", "written in this tab");
    vi.advanceTimersByTime(300);

    const persisted = loadLearnerState();
    expect(persisted.completedLessons).toContain("single-server");
    expect(persisted.readBlogs).toContain("database-melts-at-10k-rps");
    expect(persisted.quizHistory).toHaveLength(2);
    expect(persisted.notes).toEqual({
      remote: "written in the other tab",
      local: "written in this tab",
    });
    expect(persisted.prefs).toMatchObject({ mode: "engineer", theme: "light", ambient: false });

    const meta = JSON.parse(storage.getItem(LEARNER_META_STORAGE_KEY) ?? "null") as {
      revision?: number;
      updatedAt?: string;
    } | null;
    expect(meta?.revision).toBeGreaterThan(1);
    expect(typeof meta?.updatedAt).toBe("string");

    dispatchStorage(events, LEARNER_STORAGE_KEY);
    expect(useLearnerPlatformStore.getState().notes).toEqual(persisted.notes);
    expect(useLearnerPlatformStore.getState().quizHistory).toHaveLength(2);
  });

  it("migrates rebranded legacy completions and compatible preferences idempotently", () => {
    const { storage } = browser;
    storage.setItem(
      "syscanvas.completedLessons.v1",
      JSON.stringify(["what-is-system-design::1", "single-server", "unknown-lesson", 42]),
    );
    storage.setItem("syscanvas.canvas.prefs", JSON.stringify({ animations: false }));

    useLearnerPlatformStore.getState().hydrate();
    const first = useLearnerPlatformStore.getState();
    expect(first.completedLessons).toEqual(["what-is-system-design::1", "single-server"]);
    expect(first.prefs.ambient).toBe(false);
    expect(getLegacyMigrationDiagnostics()).toEqual(["unknown-lesson"]);
    expect(storage.getItem("syscanvas.completedLessons.v1")).not.toBeNull();
    expect(storage.getItem("syscraft.completedLessons.v1")).not.toBeNull();
    expect(storage.getItem(LEARNER_STORAGE_KEY)).not.toBeNull();

    const firstMeta = storage.getItem(LEARNER_META_STORAGE_KEY);
    resetLearnerStore();
    useLearnerPlatformStore.getState().hydrate();
    expect(useLearnerPlatformStore.getState().completedLessons).toEqual(first.completedLessons);
    expect(storage.getItem(LEARNER_META_STORAGE_KEY)).toBe(firstMeta);
  });

  it("salvages valid fields when persisted v1 data contains corrupt fields", () => {
    const { storage } = browser;
    storage.setItem(
      LEARNER_STORAGE_KEY,
      JSON.stringify({
        ...emptyLearnerState(),
        completedLessons: ["single-server", 42],
        readBlogs: "not-an-array",
        notes: { valid: "keep this", corrupt: 42 },
        quizHistory: [
          {
            questionId: readQuestion.id,
            topicId: readQuestion.topicId,
            correct: true,
            at: new Date(NOW_MS).toISOString(),
          },
          { questionId: 42 },
        ],
        bookmarks: ["single-server", null],
        resume: { kind: "lesson", id: "single-server", stepIndex: -1 },
        prefs: {
          mode: "story",
          theme: "invalid",
          ambient: false,
          cursor: "invalid",
          breakMinutes: 15,
        },
      }),
    );

    const loaded = loadLearnerState();
    expect(loaded.completedLessons).toEqual(["single-server"]);
    expect(loaded.readBlogs).toEqual([]);
    expect(loaded.notes).toEqual({ valid: "keep this" });
    expect(loaded.quizHistory).toHaveLength(1);
    expect(loaded.bookmarks).toEqual(["single-server"]);
    expect(loaded.resume).toBeNull();
    expect(loaded.prefs).toEqual({
      mode: "story",
      theme: "dark",
      ambient: false,
      cursor: true,
      breakMinutes: 15,
    });
    expect(isLearnerState(JSON.parse(storage.getItem(LEARNER_STORAGE_KEY) ?? "null"))).toBe(true);
  });

  it("keeps in-memory actions usable and reports an error when quota or reads throw", () => {
    const { storage } = browser;
    storage.setItem(LEARNER_STORAGE_KEY, JSON.stringify(emptyLearnerState()));
    useLearnerPlatformStore.getState().hydrate();

    storage.writeError = Object.assign(new Error("quota exceeded"), { name: "QuotaExceededError" });
    expect(() => useLearnerPlatformStore.getState().setTheme("light")).not.toThrow();
    expect(useLearnerPlatformStore.getState().prefs.theme).toBe("light");
    expect(useLearnerPlatformStore.getState().persistenceStatus).toBe("error");
    expect(getLearnerPersistenceStatus().message).toContain("storage is full");
    expect(loadLearnerState().prefs.theme).toBe("dark");

    storage.writeError = null;
    storage.readError = new Error("storage denied");
    expect(() => useLearnerPlatformStore.getState().setCursor(false)).not.toThrow();
    expect(useLearnerPlatformStore.getState().prefs.cursor).toBe(false);
    expect(useLearnerPlatformStore.getState().persistenceStatus).toBe("error");

    storage.readError = null;
    useLearnerPlatformStore.getState().setCursor(true);
    expect(useLearnerPlatformStore.getState().persistenceStatus).toBe("saved");
  });

  it("debounces trailing note writes and flushes the final edit on pagehide", () => {
    const { storage, events } = browser;
    storage.setItem(LEARNER_STORAGE_KEY, JSON.stringify(emptyLearnerState()));
    useLearnerPlatformStore.getState().hydrate();
    const initialRaw = storage.getItem(LEARNER_STORAGE_KEY);

    useLearnerPlatformStore.getState().setNote("first", "a");
    vi.advanceTimersByTime(100);
    useLearnerPlatformStore.getState().setNote("second", "b");
    expect(storage.getItem(LEARNER_STORAGE_KEY)).toBe(initialRaw);
    expect(useLearnerPlatformStore.getState().persistenceStatus).toBe("pending");

    vi.advanceTimersByTime(300);
    expect(loadLearnerState().notes).toEqual({ first: "a", second: "b" });
    expect(useLearnerPlatformStore.getState().persistenceStatus).toBe("saved");

    useLearnerPlatformStore.getState().setNote("second", "final");
    window.dispatchEvent(new Event("pagehide"));
    expect(loadLearnerState().notes.second).toBe("final");

    dispatchStorage(events, LEARNER_META_STORAGE_KEY);
    expect(useLearnerPlatformStore.getState().notes.second).toBe("final");
  });

  it("flushes a note on pagehide even when it was edited before hydration", () => {
    const { storage } = browser;
    useLearnerPlatformStore.getState().setNote("early", "still durable");

    window.dispatchEvent(new Event("pagehide"));
    expect(loadLearnerState().notes.early).toBe("still durable");
    expect(storage.getItem(LEARNER_STORAGE_KEY)).not.toBeNull();
  });

  it("does not recreate learner keys when another tab explicitly deletes them", () => {
    const { storage, events } = browser;
    storage.setItem(LEARNER_STORAGE_KEY, JSON.stringify(emptyLearnerState()));
    useLearnerPlatformStore.getState().hydrate();
    useLearnerPlatformStore.getState().setNote("pending", "discard after wipe");
    storage.removeItem(LEARNER_STORAGE_KEY);
    storage.removeItem(LEARNER_META_STORAGE_KEY);
    storage.removeItem("syscraft.completedLessons.v1");

    for (const key of [LEARNER_STORAGE_KEY, LEARNER_META_STORAGE_KEY, "syscraft.completedLessons.v1"]) {
      dispatchStorage(events, key, null);
    }
    expect(useLearnerPlatformStore.getState().notes).toEqual({});
    expect(useLearnerPlatformStore.getState().persistenceStatus).toBe("idle");
    expect(storage.getItem(LEARNER_STORAGE_KEY)).toBeNull();
  });

  it("caps imported collections and note lengths and rejects oversized JSON", () => {
    const oversizedState: LearnerStateV1 = {
      ...emptyLearnerState(),
      completedLessons: Array.from({ length: LEARNER_STATE_LIMITS.completedLessons + 5 }, (_, index) => `lesson-${index}`),
      readBlogs: Array.from({ length: LEARNER_STATE_LIMITS.readBlogs + 5 }, (_, index) => `blog-${index}`),
      visitedTopics: Array.from({ length: LEARNER_STATE_LIMITS.visitedTopics + 5 }, (_, index) => `topic-${index}`),
      quizHistory: Array.from({ length: LEARNER_STATE_LIMITS.quizHistory + 5 }, (_, index) => ({
        questionId: `question-${index}`,
        topicId: `topic-${index}`,
        correct: true,
        at: new Date(NOW_MS).toISOString(),
      })),
      bookmarks: Array.from({ length: LEARNER_STATE_LIMITS.bookmarks + 5 }, (_, index) => `bookmark-${index}`),
      notes: Object.fromEntries([
        ...Array.from({ length: LEARNER_STATE_LIMITS.notes + 5 }, (_, index) => [`note-${index}`, "short"]),
        ["long", "x".repeat(LEARNER_STATE_LIMITS.noteCharacters + 10)],
      ]),
    };

    const imported = importLearnerJson(JSON.stringify(oversizedState));
    expect(imported.completedLessons).toHaveLength(LEARNER_STATE_LIMITS.completedLessons);
    expect(imported.readBlogs).toHaveLength(LEARNER_STATE_LIMITS.readBlogs);
    expect(imported.visitedTopics).toHaveLength(LEARNER_STATE_LIMITS.visitedTopics);
    expect(imported.quizHistory).toHaveLength(LEARNER_STATE_LIMITS.quizHistory);
    expect(imported.bookmarks).toHaveLength(LEARNER_STATE_LIMITS.bookmarks);
    expect(Object.keys(imported.notes)).toHaveLength(LEARNER_STATE_LIMITS.notes);
    expect(imported.notes.long.length).toBe(LEARNER_STATE_LIMITS.noteCharacters);
    expect(Object.values(imported.notes).reduce((total, note) => total + note.length, 0))
      .toBeLessThanOrEqual(LEARNER_STATE_LIMITS.totalNoteCharacters);

    expect(() => importLearnerJson(" ".repeat(MAX_IMPORT_BYTES + 1))).toThrow("Invalid progress file");
    expectInvalidProgressFile(JSON.stringify({ ...emptyLearnerState(), notes: [] }));
  });

  it("bounds notes at the input action before the debounced write", () => {
    const { storage } = browser;
    storage.setItem(LEARNER_STORAGE_KEY, JSON.stringify(emptyLearnerState()));
    useLearnerPlatformStore.getState().hydrate();

    useLearnerPlatformStore.getState().setNote(
      "scratchpad",
      "x".repeat(LEARNER_STATE_LIMITS.noteCharacters + 100),
    );
    expect(useLearnerPlatformStore.getState().notes.scratchpad).toHaveLength(
      LEARNER_STATE_LIMITS.noteCharacters,
    );
    vi.advanceTimersByTime(300);
    expect(loadLearnerState().notes.scratchpad).toHaveLength(LEARNER_STATE_LIMITS.noteCharacters);
    expect(normalizeLearnerState(useLearnerPlatformStore.getState())).toEqual(loadLearnerState());
  });
});

describe("shared quiz bank eligibility", () => {
  const lesson = TRACKS[0].lessons[0];
  const blog = BLOGS[0];

  it("keeps the bank empty when no lesson, blog, or meaningful visit is recorded", () => {
    const state: LearnerStateV1 = {
      ...emptyLearnerState(),
      notes: { [lesson.id]: "A note is not reading progress." },
      bookmarks: [lesson.id],
      resume: { kind: "lesson", id: lesson.id, stepIndex: 0 },
    };

    expect(findQuizBank(emptyLearnerState())).toEqual([]);
    expect(findQuizBank(state)).toEqual([]);
  });

  it("accepts completed lessons, read blogs, and meaningful visited topics independently", () => {
    expect(findQuizBank({ ...emptyLearnerState(), completedLessons: [lesson.id] }))
      .toEqual(lesson.quiz);
    expect(findQuizBank({ ...emptyLearnerState(), readBlogs: [blog.id] }))
      .toEqual(blog.quiz);
    expect(findQuizBank({ ...emptyLearnerState(), visitedTopics: [lesson.id, blog.id] }))
      .toEqual([...lesson.quiz, ...blog.quiz]);
  });

  it("deduplicates topics that appear in more than one eligibility collection", () => {
    const state: LearnerStateV1 = {
      ...emptyLearnerState(),
      completedLessons: [lesson.id],
      readBlogs: [blog.id],
      visitedTopics: [lesson.id, blog.id],
    };

    const bank = findQuizBank(state);
    const keys = bank.map((question) => `${question.topicId}\u0000${question.id}`);
    expect(bank).toHaveLength(lesson.quiz.length + blog.quiz.length);
    expect(new Set(keys).size).toBe(bank.length);
  });
});

describe("recall selection and rating", () => {
  it("returns no questions when no lessons, blogs, or topics are eligible", () => {
    const selected = selectRecallQuestions(emptyLearnerState(), recallBank, 2, NOW_MS);
    expect(selected).toEqual([]);
  });

  it("never returns questions from an unread topic", () => {
    const state = {
      ...emptyLearnerState(),
      visitedTopics: ["read-topic"],
    };

    const selected = selectRecallQuestions(state, recallBank, 2, NOW_MS);
    expect(selected).toHaveLength(1);
    expect(selected.every((question) => question.topicId === "read-topic")).toBe(true);
    expect(selected.map((question) => question.id)).toEqual(["read-question"]);
  });

  it("returns the same question ids in the same order for identical inputs", () => {
    const state = {
      ...emptyLearnerState(),
      visitedTopics: ["read-topic", "unread-topic"],
    };

    const first = selectRecallQuestions(state, recallBank, 2, NOW_MS);
    const second = selectRecallQuestions(state, recallBank, 2, NOW_MS);

    expect(first).toHaveLength(2);
    expect(first.map((question) => question.id)).toEqual(
      second.map((question) => question.id),
    );
  });

  it("prioritizes due FSRS cards, then missed, unseen, and remaining questions", () => {
    const dueCorrect = makeQuestion("due-correct", "due-topic");
    const missed = makeQuestion("missed", "missed-topic");
    const unseen = makeQuestion("unseen", "unseen-topic");
    const remainder = makeQuestion("remainder", "remainder-topic");
    const base: LearnerStateV1 = {
      ...emptyLearnerState(),
      visitedTopics: [dueCorrect.topicId, missed.topicId, unseen.topicId, remainder.topicId],
    };

    let state = rateRecall(base, dueCorrect, true, NOW_MS - 30 * DAY_MS);
    state = rateRecall(state, remainder, true, NOW_MS);
    state = {
      ...state,
      quizHistory: [
        ...state.quizHistory,
        {
          topicId: missed.topicId,
          questionId: missed.id,
          correct: false,
          at: new Date(NOW_MS - DAY_MS).toISOString(),
        },
      ],
    };

    const selected = selectRecallQuestions(
      state,
      [remainder, unseen, missed, dueCorrect],
      4,
      NOW_MS,
      NOW_MS,
    );
    expect(selected.map((question) => question.id)).toEqual([
      "due-correct",
      "missed",
      "unseen",
      "remainder",
    ]);
  });

  it("weights older due topics ahead of newer due topics", () => {
    const older = makeQuestion("older", "older-topic");
    const newer = makeQuestion("newer", "newer-topic");
    const base: LearnerStateV1 = {
      ...emptyLearnerState(),
      visitedTopics: [older.topicId, newer.topicId],
    };

    let state = rateRecall(base, older, true, NOW_MS - 30 * DAY_MS);
    state = rateRecall(state, newer, true, NOW_MS - 20 * DAY_MS);

    const selected = selectRecallQuestions(state, [newer, older], 2, NOW_MS, NOW_MS);
    expect(selected.map((question) => question.id)).toEqual(["older", "newer"]);
  });

  it("weights repeated misses ahead of single misses with the same review age", () => {
    const repeated = makeQuestion("repeated-miss", "repeated-topic");
    const single = makeQuestion("single-miss", "single-topic");
    const state: LearnerStateV1 = {
      ...emptyLearnerState(),
      visitedTopics: [repeated.topicId, single.topicId],
      quizHistory: [
        {
          topicId: repeated.topicId,
          questionId: repeated.id,
          correct: false,
          at: new Date(NOW_MS - 2 * DAY_MS).toISOString(),
        },
        {
          topicId: single.topicId,
          questionId: single.id,
          correct: false,
          at: new Date(NOW_MS - DAY_MS).toISOString(),
        },
        {
          topicId: repeated.topicId,
          questionId: repeated.id,
          correct: false,
          at: new Date(NOW_MS - DAY_MS).toISOString(),
        },
      ],
    };

    const selected = selectRecallQuestions(state, [single, repeated], 2, NOW_MS, NOW_MS);
    expect(selected.map((question) => question.id)).toEqual(["repeated-miss", "single-miss"]);
  });

  it("uses the session seed only to shuffle equal-priority questions", () => {
    const bank = Array.from({ length: 8 }, (_, index) => makeQuestion(`tie-${index}`, "tie-topic"));
    const state: LearnerStateV1 = { ...emptyLearnerState(), visitedTopics: ["tie-topic"] };

    const first = selectRecallQuestions(state, bank, bank.length, NOW_MS, 101).map((question) => question.id);
    const sameSession = selectRecallQuestions(state, bank, bank.length, NOW_MS, 101).map((question) => question.id);
    const nextSession = selectRecallQuestions(state, bank, bank.length, NOW_MS, 202).map((question) => question.id);

    expect(first).toEqual(sameSession);
    expect(first).not.toEqual(nextSession);
    expect([...first].sort()).toEqual(bank.map((question) => question.id).sort());
  });

  it("preserves history and FSRS mastery across reload and keeps the missed question due", () => {
    const state: LearnerStateV1 = { ...emptyLearnerState(), visitedTopics: ["read-topic"] };
    const reviewed = rateRecall(state, readQuestion, false, NOW_MS);
    const reloaded = importLearnerJson(exportLearnerJson(reviewed));

    expect(reloaded).toEqual(reviewed);
    expect(reloaded.quizHistory).toHaveLength(1);
    expect(reloaded.mastery[readQuestion.topicId].fsrs?.reps).toBe(1);
    expect(selectRecallQuestions(reloaded, recallBank, 1, NOW_MS, NOW_MS).map((question) => question.id))
      .toEqual([readQuestion.id]);
  });

  it("records quiz history and increments mastery for correct and incorrect reviews", () => {
    const first = rateRecall(emptyLearnerState(), readQuestion, true, NOW_MS);
    const firstReviewedAt = new Date(NOW_MS).toISOString();

    expect(first.quizHistory).toEqual([
      {
        questionId: readQuestion.id,
        topicId: readQuestion.topicId,
        correct: true,
        at: firstReviewedAt,
      },
    ]);
    expect(first.mastery[readQuestion.topicId]).toMatchObject({
      correct: 1,
      incorrect: 0,
      lastReviewedAt: firstReviewedAt,
      fsrsCardId: readQuestion.topicId,
    });
    expect(first.mastery[readQuestion.topicId].fsrs?.reps).toBe(1);

    const secondNowMs = NOW_MS + 60_000;
    const second = rateRecall(first, readQuestion, false, secondNowMs);
    const secondReviewedAt = new Date(secondNowMs).toISOString();

    expect(second.quizHistory).toHaveLength(2);
    expect(second.quizHistory[0]).toEqual(first.quizHistory[0]);
    expect(second.quizHistory[1]).toEqual({
      questionId: readQuestion.id,
      topicId: readQuestion.topicId,
      correct: false,
      at: secondReviewedAt,
    });
    expect(second.mastery[readQuestion.topicId]).toMatchObject({
      correct: 1,
      incorrect: 1,
      lastReviewedAt: secondReviewedAt,
      fsrsCardId: readQuestion.topicId,
    });
    expect(second.mastery[readQuestion.topicId].fsrs?.reps).toBe(2);
  });
});

describe("quiz choice shuffling", () => {
  const authoredBank = [
    ...TRACKS.flatMap((track) => track.lessons.flatMap((lesson) => lesson.quiz)),
    ...BLOGS.flatMap((blog) => blog.quiz),
  ];

  it("is deterministic per question/session and never mutates authored content", () => {
    const authored: QuizQuestion = { ...readQuestion, answerIndex: 1 };
    const snapshot = JSON.stringify(authored);

    const first = shuffleQuizChoices(authored, "session-a");
    const sameSession = shuffleQuizChoices(authored, "session-a");

    expect(first).toEqual(sameSession);
    expect(first).not.toBe(authored);
    expect(first.choices).not.toBe(authored.choices);
    expect(first.choices[first.answerIndex]).toBe(authored.choices[authored.answerIndex]);
    expect(first.explanation).toBe(authored.explanation);
    expect([...first.choices].sort()).toEqual([...authored.choices].sort());
    expect(JSON.stringify(authored)).toBe(snapshot);
  });

  it("guards every registry question against predictable answer positions and broken remapping", () => {
    const sessionSeeds = Array.from({ length: 24 }, (_, index) => NOW_MS + index * 1_003);
    const positionCounts = [0, 0, 0, 0];
    const positionsByQuestion = new Map<string, Set<number>>();

    for (const question of authoredBank) {
      const key = `${question.topicId}\u0000${question.id}`;
      const positions = new Set<number>();
      for (const seed of sessionSeeds) {
        const displayed = shuffleQuizChoices(question, seed);
        expect(displayed.choices[displayed.answerIndex]).toBe(question.choices[question.answerIndex]);
        expect(displayed.explanation).toBe(question.explanation);
        expect([...displayed.choices].sort()).toEqual([...question.choices].sort());
        positions.add(displayed.answerIndex);
        positionCounts[displayed.answerIndex] += 1;
      }
      positionsByQuestion.set(key, positions);
    }

    const total = authoredBank.length * sessionSeeds.length;
    expect(total).toBeGreaterThan(0);
    expect(positionCounts.every((count) => count > 0)).toBe(true);
    expect(Math.max(...positionCounts) / total).toBeLessThan(0.35);
    for (const positions of positionsByQuestion.values()) {
      expect(positions.size).toBeGreaterThan(1);
    }
  });
});

describe("platform calculators", () => {
  it.each(hostileCapacityCases)(
    "keeps every capacity output finite for $label inputs",
    ({ input }) => {
      const result = estimateCapacity(input);
      expectFiniteNumbers([
        result.avgQps,
        result.peakQps,
        result.storageGb,
        result.bandwidthMbps,
      ]);
    },
  );

  it.each(hostileKvCacheCases)(
    "keeps every KV-cache output finite for $label inputs",
    ({ input }) => {
      const result = estimateKvCache(input);
      expectFiniteNumbers([
        result.weightGb,
        result.kvCacheGb,
        result.activationGb,
        result.totalVramGb,
      ]);
    },
  );

  it.each(hostileErrorBudgetCases)(
    "keeps every error-budget output finite for $label inputs",
    ({ input }) => {
      const result = estimateErrorBudget(input);
      expectFiniteNumbers([
        result.allowedDowntimeMinutes,
        result.monthlyMinutes,
        result.burnPerHourAt1x,
      ]);
    },
  );

  it("clamps SLA percentages to the documented 99 through 99.999 range", () => {
    const low = estimateErrorBudget({ slaPercent: -100, windowDays: 30 });
    expect(low.allowedDowntimeMinutes).toBeCloseTo(432, 10);
    expect(low.monthlyMinutes).toBeCloseTo(432, 10);
    expect(low.ninesLabel).toBe("99% (2 nines)");

    const high = estimateErrorBudget({
      slaPercent: Number.MAX_VALUE,
      windowDays: 30,
    });
    expect(high.allowedDowntimeMinutes).toBeCloseTo(0.432, 10);
    expect(high.monthlyMinutes).toBeCloseTo(0.432, 10);
    expect(high.ninesLabel).toBe("99.999% (5 nines)");
  });
});

describe("notation decoder", () => {
  it("returns the complete notation list for an empty query", () => {
    expect(decodeNotation("")).toEqual(notationEntries);
  });

  it("finds p99 notation", () => {
    const matches = decodeNotation("p99");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((entry) => entry.symbol === "p99")).toBe(true);
  });

  it("returns no matches for an unknown symbol", () => {
    expect(decodeNotation("this-symbol-does-not-exist")).toEqual([]);
  });
});

describe("platform lab catalog", () => {
  it("contains at least 12 labs and maps every labId to a canonical guided lab", () => {
    expect(PLATFORM_LABS.length).toBeGreaterThanOrEqual(12);

    const guidedLabIds = new Set(GUIDED_LABS.map((lab) => lab.id));
    for (const lab of PLATFORM_LABS) {
      expect(guidedLabIds.has(lab.labId), `${lab.id} maps to ${lab.labId}`).toBe(true);
    }
  });

  it("looks up the exported flash-sale and hot-shard labs", () => {
    const flashSale = getPlatformLab("flash-sale-seat-booking");
    expect(flashSale).toMatchObject({
      id: "flash-sale-seat-booking",
      labId: "bookmyshow-ticketing",
    });
    expect(getPlatformLab("bookmyshow-ticketing")).toEqual(flashSale);

    const hotShard = getPlatformLab("hot-shard-rate-limiting");
    expect(hotShard).toMatchObject({
      id: "hot-shard-rate-limiting",
      labId: "distributed-rate-limiter",
    });
    expect(getPlatformLab("distributed-rate-limiter")).toEqual(hotShard);
  });
});

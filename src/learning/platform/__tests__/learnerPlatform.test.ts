import { describe, expect, it } from "vitest";

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
import { rateRecall, selectRecallQuestions } from "@/learning/platform/quizSelect";
import {
  exportLearnerJson,
  importLearnerJson,
  loadLearnerState,
} from "@/learning/platform/storage";
import {
  emptyLearnerState,
  isLearnerState,
  LEARNER_STORAGE_KEY,
  type QuizQuestion,
} from "@/learning/platform/types";

const NOW_MS = Date.UTC(2026, 0, 15, 12);

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

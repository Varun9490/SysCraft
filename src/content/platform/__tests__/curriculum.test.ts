import { describe, expect, it } from "vitest";

import { BLOGS, TRACKS } from "@/content/platform/registry";
import type {
  BlogPost,
  Lesson,
  QuizQuestion,
  SecurityPractice,
  VisualId,
} from "@/learning/platform/types";

const EXPECTED_TRACK_SLUGS = [
  "foundations",
  "distributed",
  "case-studies",
  "ai-engineering",
  "llm-inference",
  "ml-math",
  "backend-cloud",
] as const;

const EXPECTED_TRACK_LESSON_COUNTS = [9, 10, 12, 6, 6, 5, 5] as const;

const ALLOWED_VISUAL_IDS = [
  "traffic-flow",
  "cache-ring",
  "consistent-hash",
  "btree-lsm",
  "raft-election",
  "kafka-partitions",
  "rate-limiter",
  "rag-space",
  "attention-kv",
  "threat-defense",
  "queue-workers",
  "replication",
  "sharding",
  "realtime-channels",
  "saga-outbox",
  "bloom-hll",
  "deploy-strategies",
  "k8s-autoscale",
  "agent-loop",
  "token-math",
  "notation-decoder",
] as const satisfies readonly VisualId[];

const ALLOWED_VISUAL_ID_SET: ReadonlySet<string> = new Set(ALLOWED_VISUAL_IDS);
const ALLOWED_QUIZ_KINDS: ReadonlySet<QuizQuestion["kind"]> = new Set([
  "scenario",
  "security",
  "tradeoff",
  "story-match",
]);
const PLACEHOLDER_PATTERN = /TODO|coming\s+soon|lorem\s+ipsum/i;

const LESSON_ENTRIES = TRACKS.flatMap((track) =>
  track.lessons.map((lesson) => ({ track, lesson })),
);
const LESSON_IDS: ReadonlySet<string> = new Set(
  LESSON_ENTRIES.map(({ lesson }) => lesson.id),
);

type RegistryTopic =
  | { kind: "lesson"; value: Lesson; label: string }
  | { kind: "blog"; value: BlogPost; label: string };

const TOPICS: RegistryTopic[] = [
  ...LESSON_ENTRIES.map(({ lesson }) => ({
    kind: "lesson" as const,
    value: lesson,
    label: `lesson ${lesson.id}`,
  })),
  ...BLOGS.map((blog) => ({
    kind: "blog" as const,
    value: blog,
    label: `blog ${blog.id}`,
  })),
];

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  return [...duplicates];
}

function expectNonEmpty(fieldPath: string, value: string): void {
  expect.soft(value.trim(), `${fieldPath} must be non-empty`).not.toBe("");
}

function securityFor(topic: RegistryTopic["value"]): readonly SecurityPractice[] {
  return "security" in topic ? topic.security : topic.securityTakeaways;
}

function expectNoPlaceholder(fieldPath: string, value: string): void {
  expect.soft(
    PLACEHOLDER_PATTERN.test(value),
    `${fieldPath} contains TODO, "coming soon", or lorem ipsum`,
  ).toBe(false);
}

function expectStepContract(topic: RegistryTopic): void {
  expect.soft(
    topic.value.steps.length,
    `${topic.label}.steps must contain 4 or 5 steps`,
  ).toSatisfy((count: number) => count === 4 || count === 5);

  topic.value.steps.forEach((step, stepIndex) => {
    const stepPath = `${topic.label}.steps[${stepIndex}]`;
    expectNonEmpty(`${stepPath}.title`, step.title);
    expectNonEmpty(`${stepPath}.story`, step.story);
    expectNonEmpty(`${stepPath}.engineer`, step.engineer);
    expectNonEmpty(`${stepPath}.visualCaption`, step.visualCaption);

    const storyWords = wordCount(step.story);
    expect.soft(
      storyWords,
      `${stepPath}.story must contain at least 90 whitespace-separated words; received ${storyWords}`,
    ).toBeGreaterThanOrEqual(90);

    const engineerWords = wordCount(step.engineer);
    expect.soft(
      engineerWords,
      `${stepPath}.engineer must contain at least 90 whitespace-separated words; received ${engineerWords}`,
    ).toBeGreaterThanOrEqual(90);
  });
}

function expectSecurityContract(topic: RegistryTopic): void {
  const practices = securityFor(topic.value);
  const securityPath = topic.kind === "lesson" ? `${topic.label}.security` : `${topic.label}.securityTakeaways`;

  expect.soft(
    practices.length,
    `${securityPath} must contain at least 3 practices`,
  ).toBeGreaterThanOrEqual(3);

  practices.forEach((practice, practiceIndex) => {
    const practicePath = `${securityPath}[${practiceIndex}]`;
    expectNonEmpty(`${practicePath}.title`, practice.title);
    expectNonEmpty(`${practicePath}.threat`, practice.threat);
    expectNonEmpty(`${practicePath}.control`, practice.control);
    expectNonEmpty(`${practicePath}.verify`, practice.verify);
  });
}

function expectQuizContract(topic: RegistryTopic): void {
  const questions = topic.value.quiz;
  expect.soft(
    questions.length,
    `${topic.label}.quiz must contain at least 4 questions`,
  ).toBeGreaterThanOrEqual(4);

  questions.forEach((question, questionIndex) => {
    const questionPath = `${topic.label}.quiz[${questionIndex}]`;
    expect.soft(
      question.choices.length,
      `${questionPath}.choices must contain exactly 4 choices`,
    ).toBe(4);
    expect.soft(
      Number.isInteger(question.answerIndex) && question.answerIndex >= 0 && question.answerIndex <= 3,
      `${questionPath}.answerIndex must be an integer from 0 to 3`,
    ).toBe(true);
    expectNonEmpty(`${questionPath}.explanation`, question.explanation);
    expect.soft(
      ALLOWED_QUIZ_KINDS.has(question.kind),
      `${questionPath}.kind must be scenario, security, tradeoff, or story-match`,
    ).toBe(true);
    expect.soft(
      question.topicId,
      `${questionPath}.topicId must equal ${topic.value.id}`,
    ).toBe(topic.value.id);
  });
}

describe("SysCraft curriculum contract", () => {
  it("registers exactly 7 tracks in the required order", () => {
    expect(TRACKS).toHaveLength(7);
    expect(TRACKS.map((track) => track.slug)).toEqual(EXPECTED_TRACK_SLUGS);
  });

  it("registers exactly 53 lessons and 8 blogs", () => {
    expect(LESSON_ENTRIES).toHaveLength(53);
    expect(BLOGS).toHaveLength(8);
  });

  it("keeps the required lesson count in every track", () => {
    expect(TRACKS.map((track) => track.lessons.length)).toEqual(
      EXPECTED_TRACK_LESSON_COUNTS,
    );
  });

  it("uses globally unique lesson and blog ids", () => {
    const duplicates = duplicateValues(TOPICS.map(({ value }) => value.id));
    expect.soft(duplicates, "Registry topic ids must be unique").toEqual([]);
  });

  it("uses unique lesson slugs within each track", () => {
    for (const track of TRACKS) {
      const duplicates = duplicateValues(track.lessons.map((lesson) => lesson.slug));
      expect.soft(
        duplicates,
        `track ${track.slug} contains duplicate lesson slugs`,
      ).toEqual([]);
    }
  });

  it("uses unique quiz question ids within every topic", () => {
    for (const topic of TOPICS) {
      const duplicates = duplicateValues(
        topic.value.quiz.map((question) => question.id),
      );
      expect.soft(
        duplicates,
        `${topic.label}.quiz contains duplicate question ids`,
      ).toEqual([]);
    }
  });

  it("gives every lesson and blog complete 4- or 5-step narratives", () => {
    for (const topic of TOPICS) expectStepContract(topic);
  });

  it("gives every lesson and blog at least 3 complete security practices", () => {
    for (const topic of TOPICS) expectSecurityContract(topic);
  });

  it("gives every lesson and blog at least 4 valid quiz questions", () => {
    for (const topic of TOPICS) expectQuizContract(topic);
  });

  it("uses only the 21 visualizer registry ids", () => {
    expect(ALLOWED_VISUAL_IDS).toHaveLength(21);
    expect(new Set(ALLOWED_VISUAL_IDS).size).toBe(21);

    for (const topic of TOPICS) {
      topic.value.steps.forEach((step, stepIndex) => {
        expect.soft(
          ALLOWED_VISUAL_ID_SET.has(step.visualId),
          `${topic.label}.steps[${stepIndex}].visualId "${step.visualId}" is not registered`,
        ).toBe(true);
      });
    }
  });

  it("resolves every prerequisite to a real lesson id", () => {
    for (const { lesson } of LESSON_ENTRIES) {
      lesson.prerequisites.forEach((prerequisite, prerequisiteIndex) => {
        expect.soft(
          LESSON_IDS.has(prerequisite),
          `lesson ${lesson.id}.prerequisites[${prerequisiteIndex}] references unknown lesson id "${prerequisite}"`,
        ).toBe(true);
      });
    }
  });

  it("resolves every related blog lesson to a real lesson id", () => {
    for (const blog of BLOGS) {
      blog.relatedLessonIds.forEach((lessonId, lessonIndex) => {
        expect.soft(
          LESSON_IDS.has(lessonId),
          `blog ${blog.id}.relatedLessonIds[${lessonIndex}] references unknown lesson id "${lessonId}"`,
        ).toBe(true);
      });
    }
  });

  it("contains no placeholder text in stories, engineering notes, security, or quizzes", () => {
    for (const topic of TOPICS) {
      topic.value.steps.forEach((step, stepIndex) => {
        const stepPath = `${topic.label}.steps[${stepIndex}]`;
        expectNoPlaceholder(`${stepPath}.story`, step.story);
        expectNoPlaceholder(`${stepPath}.engineer`, step.engineer);
      });

      const securityPath = topic.kind === "lesson"
        ? `${topic.label}.security`
        : `${topic.label}.securityTakeaways`;
      securityFor(topic.value).forEach((practice, practiceIndex) => {
        const practicePath = `${securityPath}[${practiceIndex}]`;
        expectNoPlaceholder(`${practicePath}.id`, practice.id);
        expectNoPlaceholder(`${practicePath}.title`, practice.title);
        expectNoPlaceholder(`${practicePath}.threat`, practice.threat);
        expectNoPlaceholder(`${practicePath}.control`, practice.control);
        expectNoPlaceholder(`${practicePath}.verify`, practice.verify);
      });

      topic.value.quiz.forEach((question, questionIndex) => {
        const questionPath = `${topic.label}.quiz[${questionIndex}]`;
        expectNoPlaceholder(`${questionPath}.id`, question.id);
        expectNoPlaceholder(`${questionPath}.topicId`, question.topicId);
        expectNoPlaceholder(`${questionPath}.kind`, question.kind);
        expectNoPlaceholder(`${questionPath}.prompt`, question.prompt);
        question.choices.forEach((choice, choiceIndex) => {
          expectNoPlaceholder(`${questionPath}.choices[${choiceIndex}]`, choice);
        });
        expectNoPlaceholder(`${questionPath}.explanation`, question.explanation);
      });
    }
  });
});

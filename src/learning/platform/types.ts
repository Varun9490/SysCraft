import type { FsrsCardMemory } from "@/engine/fsrsScheduler";

export type LearningMode = "story" | "engineer" | "both";
export type ThemePref = "dark" | "light" | "system";
export type BreakMinutes = 0 | 15 | 25 | 45;
export type VisualId =
  | "traffic-flow" | "cache-ring" | "consistent-hash" | "btree-lsm"
  | "raft-election" | "kafka-partitions" | "rate-limiter" | "rag-space"
  | "attention-kv" | "threat-defense" | "queue-workers" | "replication"
  | "sharding" | "realtime-channels" | "saga-outbox" | "bloom-hll"
  | "deploy-strategies" | "k8s-autoscale" | "agent-loop" | "token-math"
  | "notation-decoder";

export interface LessonStep {
  id: string;
  title: string;
  story: string;
  engineer: string;
  visualId: VisualId;
  visualCaption: string;
}

export interface SecurityPractice {
  id: string;
  title: string;
  threat: string;
  control: string;
  verify: string;
}

export type QuizKind = "scenario" | "security" | "tradeoff" | "story-match";

export interface QuizQuestion {
  id: string;
  topicId: string;
  prompt: string;
  choices: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
  explanation: string;
  kind: QuizKind;
}

export interface Lesson {
  id: string;
  slug: string;
  trackId: string;
  title: string;
  summary: string;
  minutes: number;
  storyHook: string;
  prerequisites: string[];
  steps: LessonStep[];
  security: SecurityPractice[];
  quiz: QuizQuestion[];
}

export interface Track {
  id: string;
  slug: string;
  title: string;
  summary: string;
  accent: "emerald" | "amber" | "rose" | "indigo" | "cyan";
  lessons: Lesson[];
}

export interface BlogStep {
  id: string;
  title: string;
  story: string;
  engineer: string;
  visualId: VisualId;
  visualCaption: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  dek: string;
  minutes: number;
  relatedLessonIds: string[];
  steps: BlogStep[];
  securityTakeaways: SecurityPractice[];
  quiz: QuizQuestion[];
}

export interface LearnerPrefs {
  mode: LearningMode;
  theme: ThemePref;
  ambient: boolean;
  cursor: boolean;
  breakMinutes: BreakMinutes;
}

export interface MasteryRecord {
  correct: number;
  incorrect: number;
  lastReviewedAt: string | null;
  fsrsCardId: string;
  fsrs?: FsrsCardMemory;
}

export interface QuizHistoryEntry {
  questionId: string;
  topicId: string;
  correct: boolean;
  at: string;
}

export interface ResumePointer {
  kind: "lesson" | "blog";
  id: string;
  stepIndex: number;
}

export interface LearnerStateV1 {
  version: 1;
  completedLessons: string[];
  readBlogs: string[];
  visitedTopics: string[];
  mastery: Record<string, MasteryRecord>;
  quizHistory: QuizHistoryEntry[];
  notes: Record<string, string>;
  bookmarks: string[];
  resume: ResumePointer | null;
  prefs: LearnerPrefs;
}

export const LEARNER_STORAGE_KEY = "syscraft.learner.v1";
export const DEFAULT_PREFS: LearnerPrefs = {
  mode: "both",
  theme: "dark",
  ambient: true,
  cursor: true,
  breakMinutes: 25,
};

export function emptyLearnerState(): LearnerStateV1 {
  return {
    version: 1,
    completedLessons: [],
    readBlogs: [],
    visitedTopics: [],
    mastery: {},
    quizHistory: [],
    notes: {},
    bookmarks: [],
    resume: null,
    prefs: { ...DEFAULT_PREFS },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(new Date(value).getTime());
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
}

function isLearnerPrefs(value: unknown): value is LearnerPrefs {
  if (!isRecord(value)) return false;
  return (
    (value.mode === "story" || value.mode === "engineer" || value.mode === "both") &&
    (value.theme === "dark" || value.theme === "light" || value.theme === "system") &&
    typeof value.ambient === "boolean" &&
    typeof value.cursor === "boolean" &&
    (value.breakMinutes === 0 || value.breakMinutes === 15 || value.breakMinutes === 25 || value.breakMinutes === 45)
  );
}

function isFsrsCardMemory(value: unknown): value is FsrsCardMemory {
  if (!isRecord(value)) return false;
  return (
    typeof value.cardId === "string" &&
    isTimestamp(value.due) &&
    isFiniteNumber(value.stability) && value.stability > 0 &&
    isFiniteNumber(value.difficulty) && value.difficulty >= 1 && value.difficulty <= 10 &&
    isFiniteNumber(value.elapsedDays) && value.elapsedDays >= 0 &&
    isFiniteNumber(value.scheduledDays) && value.scheduledDays >= 0 &&
    isNonNegativeInteger(value.reps) &&
    isNonNegativeInteger(value.lapses) &&
    (value.state === "new" || value.state === "learning" || value.state === "review" || value.state === "relearning") &&
    (value.lastReview === null || isTimestamp(value.lastReview))
  );
}

function isMasteryRecord(value: unknown): value is MasteryRecord {
  if (!isRecord(value)) return false;
  return (
    isNonNegativeInteger(value.correct) &&
    isNonNegativeInteger(value.incorrect) &&
    (value.lastReviewedAt === null || isTimestamp(value.lastReviewedAt)) &&
    typeof value.fsrsCardId === "string" &&
    (value.fsrs === undefined || isFsrsCardMemory(value.fsrs))
  );
}

function isMasteryRecordMap(value: unknown): value is Record<string, MasteryRecord> {
  return isRecord(value) && Object.values(value).every(isMasteryRecord);
}

function isQuizHistoryEntry(value: unknown): value is QuizHistoryEntry {
  if (!isRecord(value)) return false;
  return (
    typeof value.questionId === "string" &&
    typeof value.topicId === "string" &&
    typeof value.correct === "boolean" &&
    isTimestamp(value.at)
  );
}

function isResumePointer(value: unknown): value is ResumePointer {
  if (!isRecord(value)) return false;
  return (
    (value.kind === "lesson" || value.kind === "blog") &&
    typeof value.id === "string" &&
    isNonNegativeInteger(value.stepIndex)
  );
}

/** Runtime guard used at every storage and import boundary. */
export function isLearnerState(value: unknown): value is LearnerStateV1 {
  if (!isRecord(value)) return false;
  return (
    value.version === 1 &&
    isStringArray(value.completedLessons) &&
    isStringArray(value.readBlogs) &&
    isStringArray(value.visitedTopics) &&
    isMasteryRecordMap(value.mastery) &&
    Array.isArray(value.quizHistory) && value.quizHistory.every(isQuizHistoryEntry) &&
    isStringRecord(value.notes) &&
    isStringArray(value.bookmarks) &&
    (value.resume === null || isResumePointer(value.resume)) &&
    isLearnerPrefs(value.prefs)
  );
}

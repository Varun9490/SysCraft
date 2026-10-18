import { z } from "zod";

/**
 * Visual Almanac article, FSRS flashcard, quiz, and skill-constellation
 * schemas. FSRS card runtime state lives in IndexedDB (see store/db.ts
 * in Milestone 3); these types describe the static + review payload shape.
 */

export const AlmanacDifficultySchema = z.enum(["foundations", "intermediate", "advanced"]);

export type AlmanacDifficulty = z.infer<typeof AlmanacDifficultySchema>;

export const QuizOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  correct: z.boolean().default(false),
});

export type QuizOption = z.infer<typeof QuizOptionSchema>;

export const QuizQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(QuizOptionSchema).min(2),
  explanation: z.string().default(""),
  conceptTag: z.string().default(""),
});

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const FlashcardSchema = z.object({
  cardId: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  conceptTag: z.string().default(""),
  moduleId: z.string().min(1),
});

export type Flashcard = z.infer<typeof FlashcardSchema>;

/** Single memorizable anchor value rendered in the "Numbers to remember" grid. */
export const KeyNumberSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  note: z.string().default(""),
});

export type KeyNumber = z.infer<typeof KeyNumberSchema>;

/** FSRS v4 runtime memory state per card (mirrors fsrsScheduler.ts). */
export const FsrsCardStateSchema = z.enum(["new", "learning", "review", "relearning"]);

export type FsrsCardState = z.infer<typeof FsrsCardStateSchema>;

export const FsrsCardSchema = z.object({
  cardId: z.string().min(1),
  due: z.string().default(new Date(0).toISOString()),
  stability: z.number().min(0.01).default(1),
  difficulty: z.number().min(1).max(10).default(5),
  elapsedDays: z.number().min(0).default(0),
  scheduledDays: z.number().min(0).default(0),
  reps: z.number().int().min(0).default(0),
  lapses: z.number().int().min(0).default(0),
  state: FsrsCardStateSchema.default("new"),
  lastReview: z.string().nullable().default(null),
});

export type FsrsCard = z.infer<typeof FsrsCardSchema>;

export const FsrsRatingSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export type FsrsRating = z.infer<typeof FsrsRatingSchema>;

export const VisualKindSchema = z.enum([
  "none",
  "btree_vs_lsm",
  "consistent_hash_ring",
  "raft_election",
  "token_bucket",
  "gossip",
  "merkle_tree",
  "bloom_filter",
  "vector_hnsw",
]);

export type VisualKind = z.infer<typeof VisualKindSchema>;

export const EncyclopediaModuleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  difficulty: AlmanacDifficultySchema.default("foundations"),
  estimatedMinutes: z.number().int().min(1).default(10),
  summary: z.string().min(1),
  bodyMarkdown: z.string().min(1),
  tradeOffs: z.array(
    z.object({
      dimension: z.string(),
      optionA: z.string(),
      optionB: z.string(),
      recommendation: z.string(),
    }),
  ).default([]),
  interactiveVisual: VisualKindSchema.default("none"),
  flashcards: z.array(FlashcardSchema).default([]),
  quiz: z.array(QuizQuestionSchema).default([]),
  keyNumbers: z.array(KeyNumberSchema).default([]),
  relatedModuleIds: z.array(z.string()).default([]),
  whenToUse: z.array(z.string()).optional(),
  whenNotToUse: z.array(z.string()).optional(),
  scalingNotes: z.string().optional(),
});

export type EncyclopediaModule = z.infer<typeof EncyclopediaModuleSchema>;

export const SkillNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  moduleIds: z.array(z.string()).default([]),
  dependsOn: z.array(z.string()).default([]),
  position: z.object({ x: z.number(), y: z.number() }),
});

export type SkillNode = z.infer<typeof SkillNodeSchema>;

export const SkillConstellationSchema = z.object({
  nodes: z.array(SkillNodeSchema),
});

export type SkillConstellation = z.infer<typeof SkillConstellationSchema>;

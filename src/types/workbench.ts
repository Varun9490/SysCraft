import { z } from "zod";

/**
 * 6-Step Interview & Engineering Workbench schemas.
 * Steps: 1 Requirements · 2 Back-of-Envelope · 3 API Contracts ·
 * 4 Data Model · 5 High-Level Design · 6 Deep Dives + Interview grading.
 */

export const WorkbenchStepSchema = z.enum([
  "requirements",
  "boe",
  "api",
  "data_model",
  "high_level",
  "deep_dive",
]);

export type WorkbenchStep = z.infer<typeof WorkbenchStepSchema>;

export const FunctionalRequirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  priority: z.enum(["must", "should", "nice"]).default("must"),
  done: z.boolean().default(false),
});

export type FunctionalRequirement = z.infer<typeof FunctionalRequirementSchema>;

export const NonFunctionalRequirementSchema = z.object({
  availabilityTarget: z.number().min(0).max(1).default(0.999),
  p99LatencyMs: z.number().min(1).default(300),
  durabilityTarget: z.number().min(0).max(1).default(0.99999999999),
  compliance: z.array(z.string()).default([]),
});

export type NonFunctionalRequirement = z.infer<typeof NonFunctionalRequirementSchema>;

export const BoEParamsSchema = z.object({
  dailyActiveUsers: z.number().min(1).default(10_000_000),
  readsPerUserPerDay: z.number().min(0).default(20),
  writesPerUserPerDay: z.number().min(0).default(2),
  avgReadSizeKb: z.number().min(0.01).default(4),
  avgWriteSizeKb: z.number().min(0.01).default(2),
  readWriteRatio: z.string().default("10:1"),
  retentionDays: z.number().int().min(1).default(365),
  replicationCopies: z.number().int().min(1).default(3),
  peakFactor: z.number().min(1).default(3),
});

export type BoEParams = z.infer<typeof BoEParamsSchema>;

export const BoEResultSchema = z.object({
  readQpsAvg: z.number().min(0),
  writeQpsAvg: z.number().min(0),
  readQpsPeak: z.number().min(0),
  writeQpsPeak: z.number().min(0),
  ingressMbpsPeak: z.number().min(0),
  egressMbpsPeak: z.number().min(0),
  storageGbTotal: z.number().min(0),
  storageTbPerDay: z.number().min(0),
  bandwidthTbPerDay: z.number().min(0),
  estimatedNodes: z.number().int().min(1),
  monthlyCostUsd: z.number().min(0),
});

export type BoEResult = z.infer<typeof BoEResultSchema>;

export const HttpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);

export type HttpMethod = z.infer<typeof HttpMethodSchema>;

export const ApiRouteSchema = z.object({
  id: z.string().min(1),
  method: HttpMethodSchema,
  path: z.string().min(1),
  description: z.string().default(""),
  auth: z.enum(["none", "api_key", "oauth2", "jwt", "mtls"]).default("jwt"),
  rateLimitRps: z.number().min(1).default(1000),
  requestSchema: z.string().default("{}"),
  responseSchema: z.string().default("{}"),
  p99BudgetMs: z.number().min(1).default(250),
});

export type ApiRoute = z.infer<typeof ApiRouteSchema>;

export const ColumnTypeSchema = z.enum([
  "uuid",
  "text",
  "integer",
  "bigint",
  "float",
  "boolean",
  "timestamp",
  "jsonb",
  "bytes",
  "vector",
]);

export type ColumnType = z.infer<typeof ColumnTypeSchema>;

export const TableColumnSchema = z.object({
  name: z.string().min(1),
  type: ColumnTypeSchema,
  nullable: z.boolean().default(true),
  isPartitionKey: z.boolean().default(false),
  isSortKey: z.boolean().default(false),
});

export type TableColumn = z.infer<typeof TableColumnSchema>;

export const EntitySchema = z.object({
  id: z.string().min(1),
  table: z.string().min(1),
  engine: z.enum(["postgres", "mysql", "cassandra", "dynamodb", "mongo", "redis", "bigtable"]).default("postgres"),
  columns: z.array(TableColumnSchema).default([]),
  estimatedRows: z.number().min(1).default(1_000_000),
  readQps: z.number().min(0).default(100),
  writeQps: z.number().min(0).default(10),
  notes: z.string().default(""),
});

export type Entity = z.infer<typeof EntitySchema>;

export const InterviewLevelSchema = z.enum(["L4", "L5", "L6", "L7"]);

export type InterviewLevel = z.infer<typeof InterviewLevelSchema>;

export const RubricDimensionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  score: z.number().min(0).max(4).default(0),
  feedback: z.string().default(""),
});

export type RubricDimension = z.infer<typeof RubricDimensionSchema>;

export const InterviewRubricSchema = z.object({
  level: InterviewLevelSchema.default("L5"),
  dimensions: z.array(RubricDimensionSchema).default([]),
  overallScore: z.number().min(0).max(4).default(0),
  hireSignal: z.enum(["strong_no", "no", "lean_yes", "yes", "strong_yes"]).default("no"),
  summary: z.string().default(""),
});

export type InterviewRubric = z.infer<typeof InterviewRubricSchema>;

export const WorkbenchStateSchema = z.object({
  activeStep: WorkbenchStepSchema.default("requirements"),
  functional: z.array(FunctionalRequirementSchema).default([]),
  nonFunctional: NonFunctionalRequirementSchema.default({}),
  boeParams: BoEParamsSchema.default({}),
  boeResult: BoEResultSchema.nullable().default(null),
  apiRoutes: z.array(ApiRouteSchema).default([]),
  entities: z.array(EntitySchema).default([]),
  highLevelNotes: z.string().default(""),
  deepDiveNotes: z.string().default(""),
  rubric: InterviewRubricSchema.default({}),
  timerSecondsRemaining: z.number().int().min(0).default(2700),
  timerRunning: z.boolean().default(false),
});

export type WorkbenchState = z.infer<typeof WorkbenchStateSchema>;

export function defaultWorkbenchState(): WorkbenchState {
  return WorkbenchStateSchema.parse({});
}

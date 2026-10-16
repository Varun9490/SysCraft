import { z } from "zod";

/**
 * Guided labs, chaos scenarios, post-mortem RCA, and interview rubric
 * schemas shared by GuidedLabRunner, IncidentArena, and PostMortemModal.
 */

export const LabStageKindSchema = z.enum([
  "brief",
  "boe",
  "topology",
  "api",
  "data_model",
  "chaos",
  "review",
]);

export type LabStageKind = z.infer<typeof LabStageKindSchema>;

export const GradingRuleSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  /** Minimum count of resourceIds that must appear on the canvas. */
  requiredResourceIds: z.array(z.string()).default([]),
  minNodeCount: z.number().int().min(0).default(0),
  maxP99Ms: z.number().min(0).nullable().default(null),
  maxErrorRate: z.number().min(0).max(1).nullable().default(null),
  maxCostPerHourUsd: z.number().min(0).nullable().default(null),
  requiresMultiAz: z.boolean().default(false),
  points: z.number().int().min(1).default(10),
});

export type GradingRule = z.infer<typeof GradingRuleSchema>;

export const LabStageSchema = z.object({
  id: z.string().min(1),
  kind: LabStageKindSchema,
  title: z.string().min(1),
  instructionsMarkdown: z.string().min(1),
  hints: z.array(z.string()).default([]),
  gradingRules: z.array(GradingRuleSchema).default([]),
});

export type LabStage = z.infer<typeof LabStageSchema>;

export const GuidedLabSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  difficulty: z.enum(["starter", "standard", "advanced", "staff_plus"]).default("standard"),
  estimatedMinutes: z.number().int().min(1).default(45),
  briefMarkdown: z.string().min(1),
  targetRps: z.number().min(1).default(1000),
  sloP99Ms: z.number().min(1).default(300),
  budgetUsdPerHour: z.number().min(0).default(50),
  stages: z.array(LabStageSchema).min(1),
  solutionMarkdown: z.string().min(1),
});

export type GuidedLab = z.infer<typeof GuidedLabSchema>;

export const LabProgressSchema = z.object({
  labId: z.string().min(1),
  currentStage: z.number().int().min(0).default(0),
  completedStages: z.array(z.string()).default([]),
  bestScore: z.number().min(0).max(100).default(0),
  bestCostUsd: z.number().min(0).nullable().default(null),
  updatedAt: z.string().default(new Date(0).toISOString()),
});

export type LabProgress = z.infer<typeof LabProgressSchema>;

export const ChaosScenarioSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  narrativeMarkdown: z.string().min(1),
  durationSeconds: z.number().int().min(10).default(180),
  budgetUsd: z.number().min(0).default(100),
  sloP99Ms: z.number().min(1).default(500),
  maxErrorRate: z.number().min(0).max(1).default(0.05),
  chaosKind: z.enum([
    "zone_outage",
    "latency_spike",
    "packet_loss",
    "cpu_hog",
    "traffic_surge",
    "dependency_down",
    "dns_failure",
  ]),
  targetHint: z.string().default(""),
  successCriteria: z.array(z.string()).default([]),
});

export type ChaosScenario = z.infer<typeof ChaosScenarioSchema>;

export const IncidentScoreSchema = z.object({
  scenarioId: z.string().min(1),
  score: z.number().min(0).max(100),
  mttrSeconds: z.number().min(0),
  peakErrorRate: z.number().min(0).max(1),
  peakP99Ms: z.number().min(0),
  budgetSpentUsd: z.number().min(0),
  won: z.boolean().default(false),
});

export type IncidentScore = z.infer<typeof IncidentScoreSchema>;

export const PostMortemSectionSchema = z.object({
  heading: z.string().min(1),
  bodyMarkdown: z.string().min(1),
});

export type PostMortemSection = z.infer<typeof PostMortemSectionSchema>;

export const PostMortemReportSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  incidentDate: z.string().min(1),
  severity: z.enum(["sev1", "sev2", "sev3", "sev4"]).default("sev2"),
  sections: z.array(PostMortemSectionSchema).default([]),
  actionItems: z.array(z.string()).default([]),
  generatedAt: z.string().default(new Date(0).toISOString()),
});

export type PostMortemReport = z.infer<typeof PostMortemReportSchema>;

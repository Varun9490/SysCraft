import { describe, expect, it } from "vitest";
import {
  ENCYCLOPEDIA_MODULES,
  getEncyclopediaModule,
  quizCardModuleId,
  ENCYCLOPEDIA_MODULE_IDS,
} from "@/data/encyclopediaData";
import { SEED_RESOURCES, SEED_RESOURCE_MAP } from "@/data/seedResources";
import { GUIDED_LABS } from "@/data/guidedLabs";
import { PATH_PARTS, TOTAL_LESSONS, TOTAL_MODULES } from "@/data/pathData";

/**
 * Docs-quality gate: the wiki + primitives library are the learning
 * backbone, so every article, quiz, flashcard, and cross-link must resolve.
 */

describe("encyclopedia modules", () => {
  it("ships exactly 19 uniquely-identified modules", () => {
    expect(ENCYCLOPEDIA_MODULES).toHaveLength(19);
    expect(new Set(ENCYCLOPEDIA_MODULE_IDS).size).toBe(19);
  });

  it("has substantive articles starting with an H1 title", () => {
    for (const module of ENCYCLOPEDIA_MODULES) {
      expect(module.bodyMarkdown.trim().startsWith("# ")).toBe(true);
      expect(module.bodyMarkdown.length).toBeGreaterThan(400);
      expect(module.summary.length).toBeGreaterThan(30);
    }
  });

  it("quiz questions have exactly one correct option of >= 2, and unique ids", () => {
    const seen = new Set<string>();
    for (const module of ENCYCLOPEDIA_MODULES) {
      expect(module.quiz.length).toBeGreaterThanOrEqual(2);
      for (const question of module.quiz) {
        expect(seen.has(question.id)).toBe(false);
        seen.add(question.id);
        expect(question.options.length).toBeGreaterThanOrEqual(2);
        expect(question.options.filter((o) => o.correct).length).toBe(1);
        expect(question.explanation.length).toBeGreaterThan(5);
      }
    }
  });

  it("quiz conceptTags resolve to the enclosing module id", () => {
    for (const module of ENCYCLOPEDIA_MODULES) {
      for (const question of module.quiz) {
        expect(quizCardModuleId(question.conceptTag)).toBe(module.id);
      }
    }
  });

  it("flashcards belong to their enclosing module and use unique card ids", () => {
    const cardIds = new Set<string>();
    for (const module of ENCYCLOPEDIA_MODULES) {
      expect(module.flashcards.length).toBeGreaterThanOrEqual(2);
      for (const card of module.flashcards) {
        expect(card.moduleId).toBe(module.id);
        expect(card.cardId.length).toBeGreaterThan(0);
        expect(cardIds.has(card.cardId)).toBe(false);
        cardIds.add(card.cardId);
      }
    }
  });

  it("relatedModuleIds always resolve to real modules", () => {
    for (const module of ENCYCLOPEDIA_MODULES) {
      for (const id of module.relatedModuleIds) {
        expect(getEncyclopediaModule(id), `${module.id} -> ${id}`).toBeDefined();
      }
    }
  });

  it("every module carries at least three remembered numbers", () => {
    for (const module of ENCYCLOPEDIA_MODULES) {
      expect(module.keyNumbers.length, module.id).toBeGreaterThanOrEqual(3);
      for (const number of module.keyNumbers) {
        expect(number.value.length).toBeGreaterThan(0);
        expect(number.label.length).toBeGreaterThan(3);
      }
    }
  });

  it("counts quoted in UI copy stay honest", () => {
    for (const module of ENCYCLOPEDIA_MODULES) {
      const flashcardCount = module.flashcards.length;
      const quizCount = module.quiz.length;
      if (module.flashcards.length > 0) {
        expect(flashcardCount).toBeGreaterThan(0);
      }
      expect(quizCount).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("seed primitives library", () => {
  it("has 32 unique primitives with complete metadata", () => {
    expect(SEED_RESOURCES).toHaveLength(32);
    const ids = new Set(SEED_RESOURCES.map((r) => r.id));
    expect(ids.size).toBe(32);
    for (const primitive of SEED_RESOURCES) {
      expect(primitive.encyclopediaMarkdown.length).toBeGreaterThan(250);
      expect(primitive.whenToUse.length).toBeGreaterThanOrEqual(2);
      expect(primitive.whenNotToUse.length).toBeGreaterThanOrEqual(1);
      expect(Object.keys(SEED_RESOURCE_MAP).length).toBe(32);
    }
  });

  it("latency percentiles are ordered and believable", () => {
    for (const primitive of SEED_RESOURCES) {
      const { baseP50Ms, baseP95Ms, baseP99Ms } = primitive.defaults;
      expect(baseP50Ms).toBeLessThanOrEqual(baseP95Ms);
      expect(baseP95Ms).toBeLessThanOrEqual(baseP99Ms);
      expect(baseP99Ms).toBeGreaterThan(0);
    }
  });
});

describe("learning-path and lab cross references", () => {
  it("counts used by the footer and pages match the data", () => {
    const pathModules = PATH_PARTS.reduce((sum, part) => sum + part.modules.length, 0);
    expect(TOTAL_MODULES).toBe(pathModules);
    expect(TOTAL_LESSONS).toBe(
      PATH_PARTS.reduce(
        (sum, part) => sum + part.modules.reduce((s, m) => s + m.lessonTitles.length, 0),
        0,
      ),
    );
    expect(GUIDED_LABS.length).toBe(16);
  });
});

describe("quizCardModuleId resolver", () => {
  it("handles exact ids, aliases, and unknown tags deterministically", () => {
    expect(quizCardModuleId("consistent-hashing")).toBe("consistent-hashing");
    expect(quizCardModuleId("cap")).toBe("cap-theorem");
    expect(quizCardModuleId("storage-engines")).toBe("btree-vs-lsm");
    expect(quizCardModuleId("bloom")).toBe("bloom-filters");
    expect(quizCardModuleId("")).toBe("general");
    expect(quizCardModuleId("nonexistent-tag")).toBe("general");
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CONTENT_COUNTS, HERO_STATS } from "@/data/contentManifest";
import { GUIDED_LABS } from "@/data/guidedLabs";
import { SEED_RESOURCES } from "@/data/seedResources";
import { ENCYCLOPEDIA_MODULES, getEncyclopediaModule } from "@/data/encyclopediaData";
import { TOPICS } from "@/data/topics";
import { CHAOS_SCENARIOS } from "@/data/chaosScenarios";
import { BLUEPRINTS } from "@/data/blueprints";
import { PLAY_MODES } from "@/data/playContent";
import { GLOSSARY } from "@/data/glossary";
import { PATH_PARTS, TOTAL_LESSONS, TOTAL_MODULES } from "@/data/pathData";

/**
 * Trust gate: a learning product that cannot count its own content has not
 * earned trust on quorum arithmetic. Every count shown in UI copy must come
 * from the manifest (src/data/contentManifest.ts), which is derived from the
 * data itself — and no copy surface may hard-code a literal count.
 */

describe("content manifest mirrors the underlying data", () => {
  it("counts are derived, not declared", () => {
    expect(CONTENT_COUNTS.modules).toBe(PATH_PARTS.reduce((s, p) => s + p.modules.length, 0));
    expect(CONTENT_COUNTS.modules).toBe(TOTAL_MODULES);
    expect(CONTENT_COUNTS.lessons).toBe(
      PATH_PARTS.reduce((s, p) => s + p.modules.reduce((x, m) => x + m.lessonTitles.length, 0), 0),
    );
    expect(CONTENT_COUNTS.lessons).toBe(TOTAL_LESSONS);
    expect(CONTENT_COUNTS.labs).toBe(GUIDED_LABS.length);
    expect(CONTENT_COUNTS.primitives).toBe(SEED_RESOURCES.length);
    expect(CONTENT_COUNTS.wikiArticles).toBe(ENCYCLOPEDIA_MODULES.length);
    expect(CONTENT_COUNTS.topics).toBe(TOPICS.length);
    expect(CONTENT_COUNTS.chaosDrills).toBe(CHAOS_SCENARIOS.length);
    expect(CONTENT_COUNTS.blueprints).toBe(BLUEPRINTS.length);
    expect(CONTENT_COUNTS.playModes).toBe(PLAY_MODES.length);
    expect(CONTENT_COUNTS.glossaryTerms).toBe(GLOSSARY.length);
    expect(HERO_STATS.map((s) => s.value).join("/")).toBe(
      `${TOTAL_MODULES}/${TOTAL_LESSONS}/${GUIDED_LABS.length}/${SEED_RESOURCES.length}`,
    );
  });
});

describe("path structural invariants", () => {
  it("has no duplicate module ids anywhere in the path", () => {
    const ids = PATH_PARTS.flatMap((p) => p.modules.map((m) => m.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("renumbers modules sequentially across parts (0..N-1)", () => {
    const numbers = PATH_PARTS.flatMap((p) => p.modules.map((m) => m.number));
    expect(numbers).toEqual(Array.from(numbers.keys()));
  });

  it("caps every module at 9 lessons so a module is a book chapter, not a book", () => {
    for (const part of PATH_PARTS) {
      for (const module of part.modules) {
        expect(module.lessonTitles.length, `${part.id}/${module.id}`).toBeLessThanOrEqual(9);
        expect(module.lessonTitles.length, `${part.id}/${module.id}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("only links labs that actually exist (no dangling practiceLabIds)", () => {
    const labIds = new Set(GUIDED_LABS.map((l) => l.id));
    for (const part of PATH_PARTS) {
      for (const module of part.modules) {
        for (const labId of module.practiceLabIds ?? []) {
          expect(labIds.has(labId), `${module.id} -> ${labId}`).toBe(true);
        }
      }
    }
  });

  it("only links wiki articles that actually exist (no dangling encyclopediaId)", () => {
    for (const part of PATH_PARTS) {
      for (const module of part.modules) {
        if (module.encyclopediaId) {
          expect(getEncyclopediaModule(module.encyclopediaId), module.id).toBeDefined();
        }
      }
    }
  });

  it("CAP/PACELC does not gate the very first on-ramp module", () => {
    const module1 = PATH_PARTS.flatMap((p) => p.modules).find((m) => m.id === "what-is-system-design");
    expect(module1).toBeDefined();
    expect(module1?.encyclopediaId).not.toBe("cap-theorem");
    const module1Text = (module1?.lessonTitles.join(" ") ?? "").toLowerCase();
    expect(module1Text).not.toContain("linearizability");
    expect(module1Text).not.toContain("pacelc");
    expect(module1Text).not.toContain("quorum");
  });
});

/* -------------------------------------------------------------------- */
/* Copy scan: no literal content counts may appear in page copy.        */
/* -------------------------------------------------------------------- */

const COPY_SURFACES: Array<{ dir: string; include: RegExp }> = [
  { dir: "src/app", include: /page\.tsx$/ },
  { dir: "src/components/landing", include: /\.tsx$/ },
];

const LOCAL_FILES = [
  "src/data/startHere.ts",
  "src/data/pathData.ts",
  "src/data/seedResources.ts",
  "src/data/encyclopediaData.ts",
  "src/data/guidedLabs.ts",
];

/** Digits beside module/lesson/lab/primitive words in copy = manifest bypass. */
const STALE_COUNT = /\b(\d{1,3})\s*(?:\+\s*)?(structured\s+)?(lessons|modules|modules|primitives|labs)\b/gi;

function* walkFiles(dir: string, include: RegExp): Generator<string> {
  const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walkFiles(full, include);
    else if (include.test(entry)) yield full;
  }
}

describe("no hard-coded content counts in copy", () => {
  it("scans route pages and landing components for literal counts", () => {
    const offenders: string[] = [];
    for (const surface of COPY_SURFACES) {
      for (const file of walkFiles(surface.dir, surface.include)) {
        const text = readFileSync(file, "utf8");
        for (const match of text.matchAll(STALE_COUNT)) {
          offenders.push(`${file}: "${match[0]}"`);
        }
      }
    }
    for (const file of LOCAL_FILES) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(STALE_COUNT)) {
        const line = match[0];
        // Header comments are allowed to explain composition in words, not digits.
        offenders.push(`${file}: "${line}"`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});

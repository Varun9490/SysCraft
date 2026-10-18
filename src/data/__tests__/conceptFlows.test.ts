import { describe, expect, it } from "vitest";
import { ENCYCLOPEDIA_MODULE_IDS, getEncyclopediaModule } from "@/data/encyclopediaData";
import { CONCEPT_FLOWS, CONCEPT_FLOW_IDS, CONCEPT_FLOW_MAP } from "@/data/conceptFlows";
import { CONCEPT_DEFINITIONS, CONCEPT_DEFINITION_MAP } from "@/data/conceptSources";
import { GLOSSARY, GLOSSARY_MAP, GLOSSARY_PATTERN, lookupGlossary } from "@/data/glossary";

/**
 * Docs-quality gate for the teaching scaffolding: every module must open
 * with a plain-words hook, walk you through an interactive diagram, name
 * its failure modes, and hand you deliberate next links — with canonical
 * sources attached and a glossary that maps every jargon word.
 */

const DIAGRAM_ROOTS = ["flowchart", "sequenceDiagram", "stateDiagram-v2", "graph", "stateDiagram"];

describe("concept flows (plain words, diagrams, break points, read next)", () => {
  it("crowns modules with flow entries — at least base 19 plus new curriculum entries", () => {
    expect(CONCEPT_FLOW_IDS.length).toBeGreaterThanOrEqual(19);
    // All 28 modules present; flows cover base 19 at minimum.
  });

  it("every diagram is real mermaid with a proper declaration line", () => {
    for (const flow of CONCEPT_FLOWS) {
      const lines = flow.mermaid
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const first = lines[0] ?? "";
      const root = DIAGRAM_ROOTS.find((r) => first.startsWith(r));
      expect(root, `${flow.moduleId} declares mermaid`).toBeDefined();
      expect(lines.length, `${flow.moduleId} diagram depth`).toBeGreaterThanOrEqual(7);
    }
  });

  it("plain words are actual analogies — long enough to teach, short enough to land", () => {
    for (const flow of CONCEPT_FLOWS) {
      expect(flow.plainWords.length, flow.moduleId).toBeGreaterThan(80);
      expect(flow.plainWords.length, flow.moduleId).toBeLessThan(420);
      expect(flow.plainWords).not.toContain("```");
      expect(flow.plainWords.toLowerCase()).not.toContain("mermaid");
    }
  });

  it("break points are 3-4 specific failure modes, not vibes", () => {
    for (const flow of CONCEPT_FLOWS) {
      expect(flow.breakPoints.length, flow.moduleId).toBeGreaterThanOrEqual(3);
      expect(flow.breakPoints.length, flow.moduleId).toBeLessThanOrEqual(4);
      for (const point of flow.breakPoints) {
        expect(point.length).toBeGreaterThan(25);
        expect(point).toMatch(/[a-zA-Z]/);
      }
    }
  });

  it("read-next links always resolve to real modules with real reasons", () => {
    for (const flow of CONCEPT_FLOWS) {
      expect(flow.readNext.length, flow.moduleId).toBeGreaterThanOrEqual(2);
      const hrefs = new Set<string>();
      for (const next of flow.readNext) {
        expect(next.title.length).toBeGreaterThan(3);
        expect(next.why.length).toBeGreaterThan(10);
        expect(next.href.startsWith("/wiki/")).toBe(true);
        const moduleId = next.href.slice("/wiki/".length);
        expect(getEncyclopediaModule(moduleId), `${flow.moduleId} -> ${next.href}`).toBeDefined();
        expect(hrefs.has(next.href), `${flow.moduleId} duplicate readNext`).toBe(false);
        hrefs.add(next.href);
      }
    }
  });
});

describe("concept definitions and canonical sources", () => {
  it("every module has a breathable definition and >= 2 sources", () => {
    expect(CONCEPT_DEFINITIONS.length).toBeGreaterThanOrEqual(19);
    expect(Object.keys(CONCEPT_DEFINITION_MAP).length).toBeGreaterThanOrEqual(19);
    for (const def of CONCEPT_DEFINITIONS) {
      expect(getEncyclopediaModule(def.moduleId)).toBeDefined();
      expect(def.definition.length).toBeGreaterThan(120);
      expect(def.sources.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("source chains end at real https references with notes", () => {
    for (const def of CONCEPT_DEFINITIONS) {
      for (const source of def.sources) {
        expect(source.url.startsWith("https://"), `${def.moduleId}: ${source.url}`).toBe(true);
        expect(source.label.length).toBeGreaterThan(10);
        expect(source.note.length).toBeGreaterThan(20);
      }
      const urls = new Set(def.sources.map((s) => s.url));
      expect(urls.size, `${def.moduleId} duplicate source urls`).toBe(def.sources.length);
    }
  });
});

describe("glossary hover terms", () => {
  it("ships a usable noob dictionary with unique canonical terms", () => {
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(80);
    const lower = new Set<string>();
    for (const entry of GLOSSARY) {
      const key = entry.term.toLowerCase();
      expect(lower.has(key), `duplicate glossary term: ${entry.term}`).toBe(false);
      lower.add(key);
      expect(entry.meaning.length).toBeGreaterThan(30);
      if (entry.href) {
        expect(entry.href.startsWith("/wiki/")).toBe(true);
        expect(getEncyclopediaModule(entry.href.slice("/wiki/".length))).toBeDefined();
      }
    }
  });

  it("glossary pattern compiles, matches canonically, and prefers long terms", () => {
    expect(GLOSSARY_PATTERN).not.toBeNull();
    const sample = "Every request drains a token bucket; a poison message lands in a dead letter queue.";
    expect(sample.match(GLOSSARY_PATTERN!)).toEqual(["token bucket", "poison message", "dead letter queue"]);
    expect(lookupGlossary("TOKEN BUCKET")?.href).toBe("/wiki/rate-limiting");
    expect(lookupGlossary("Cache Stampede")).toBeDefined();
    // Longest-term-wins: the full phrase is glossed, not the embedded word.
    const hybrid = "Hybrid search fuses BM25 with ANN over cosine similarity.";
    expect(hybrid.match(GLOSSARY_PATTERN!)).toEqual(["cosine similarity"]);
  });
});

import { describe, it, expect } from "vitest";
import { extractFindingsJson } from "@/engine/aiClient";

describe("extractFindingsJson", () => {
  it("parses a raw array", () => {
    const text = '[{"severity":"warn","area":"cache","message":"no cache","recommendation":"add redis"}]';
    const out = extractFindingsJson(text);
    expect(out).toHaveLength(1);
    expect(out![0].severity).toBe("warn");
    expect(out![0].area).toBe("cache");
  });

  it("extracts an array buried in prose", () => {
    const text = 'Here are findings: [{"severity":"critical","area":"spof","message":"single replica","recommendation":"add replicas"}] thanks.';
    const out = extractFindingsJson(text);
    expect(out).toHaveLength(1);
    expect(out![0].severity).toBe("critical");
  });

  it("handles event-json lines", () => {
    const inner = JSON.stringify([{ severity: "info", area: "x", message: "m", recommendation: "r" }]);
    const line = JSON.stringify({ type: "assistant", text: inner });
    const text = `{"type":"start"}\n${line}\n{"type":"end"}`;
    const out = extractFindingsJson(text);
    expect(out).toHaveLength(1);
    expect(out![0].severity).toBe("info");
  });

  it("returns null for garbage", () => {
    expect(extractFindingsJson("not json at all")).toBeNull();
    expect(extractFindingsJson("")).toBeNull();
  });

  it("coerces severities", () => {
    const text = '[{"severity":"HIGH","area":"a","message":"m","recommendation":"r"},{"severity":"medium","area":"b","message":"m","recommendation":"r"}]';
    const out = extractFindingsJson(text);
    expect(out).toHaveLength(2);
    expect(out![0].severity).toBe("critical");
    expect(out![1].severity).toBe("warn");
  });
});
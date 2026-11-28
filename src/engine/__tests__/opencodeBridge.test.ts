import { afterEach, describe, it, expect, vi } from "vitest";
import {
  extractFindingsJson,
  reviewTopology,
  reviewWithOpenCodeBridge,
  setOpenCodeBridgeEnabled,
  type TopologyBrief,
} from "@/engine/aiClient";

const BRIDGE_TOKEN = "A".repeat(43);
const TOKEN_STORAGE_KEY = "syscraft.opencodeBridgeToken";
const FINDINGS = [{ severity: "warn", area: "cache", message: "no cache", recommendation: "add redis" }];

const BRIEF: TopologyBrief = {
  nodes: [{
    id: "node-1",
    resourceId: "postgres",
    category: "database",
    replicationFactor: 1,
    region: "us-east-1",
    multiAz: false,
    cacheHitRate: 0,
    rateLimitRps: 1000,
    clientRps: 500,
    writeRatio: 0.2,
  }],
  edgeCount: 0,
  regions: ["us-east-1"],
};

function installLocalStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  };
  vi.stubGlobal("window", { localStorage: storage });
  return { storage, values };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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
    expect(out![0].area).toBe("spof");
  });

  it("handles event-json lines", () => {
    const inner = JSON.stringify([{ severity: "info", area: "x", message: "m", recommendation: "r" }]);
    const line = JSON.stringify({ type: "assistant", text: inner });
    const text = `{"type":"start"}\n${line}\n{"type":"end"}`;
    const out = extractFindingsJson(text);
    expect(out).toHaveLength(1);
    expect(out![0].area).toBe("x");
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

describe("OpenCode bridge client authentication", () => {
  it("obtains the session token from health, stores it, and sends it on review", async () => {
    const { values } = installLocalStorage();
    setOpenCodeBridgeEnabled(true);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, token: BRIDGE_TOKEN }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ findings: FINDINGS }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const findings = await reviewWithOpenCodeBridge(BRIEF);

    expect(findings).toHaveLength(1);
    expect(values.get(TOKEN_STORAGE_KEY)).toBe(BRIDGE_TOKEN);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://127.0.0.1:8787/health");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("http://127.0.0.1:8787/review");
    const reviewInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(new Headers(reviewInit.headers).get("X-SysCraft-Bridge-Token")).toBe(BRIDGE_TOKEN);
  });

  it("refreshes a stale token once after a 401", async () => {
    const { values } = installLocalStorage({
      "syscraft.opencodeBridge": "1",
      [TOKEN_STORAGE_KEY]: "B".repeat(43),
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "invalid bridge token" }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, token: BRIDGE_TOKEN }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ findings: FINDINGS }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const findings = await reviewWithOpenCodeBridge(BRIEF);

    expect(findings).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(values.get(TOKEN_STORAGE_KEY)).toBe(BRIDGE_TOKEN);
    const retryInit = fetchMock.mock.calls[2]?.[1] as RequestInit;
    expect(new Headers(retryInit.headers).get("X-SysCraft-Bridge-Token")).toBe(BRIDGE_TOKEN);
  });

  it("clears the stored token when the bridge is disabled", () => {
    const { values } = installLocalStorage({
      "syscraft.opencodeBridge": "1",
      [TOKEN_STORAGE_KEY]: BRIDGE_TOKEN,
    });

    setOpenCodeBridgeEnabled(false);

    expect(values.has("syscraft.opencodeBridge")).toBe(false);
    expect(values.has(TOKEN_STORAGE_KEY)).toBe(false);
  });
});

describe("Gemini BYOK transport", () => {
  it("sends the API key in the supported header and never in the request URL", async () => {
    const apiKey = "gemini-secret-that-must-not-appear-in-a-url";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(FINDINGS) }] } }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await reviewTopology(BRIEF, {
      byok: { provider: "gemini", apiKey, model: "gemini-2.0-flash" },
    });

    expect(result.tier).toBe("byok_cloud");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent");
    expect(url).not.toContain("key=");
    expect(url).not.toContain(apiKey);
    expect(new Headers(init.headers).get("x-goog-api-key")).toBe(apiKey);
  });
});

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brain, Mic, MicOff, Send, Volume2, VolumeX } from "lucide-react";
import { SEED_RESOURCES } from "@/data/seedResources";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import type { InterviewLevel } from "@/types/workbench";
import {
  analyzeTopologyOffline,
  getByokConfig,
  isWebGpuAvailable,
  loadWebLlmEngine,
  reviewTopology,
  saveByokConfig,
  socraticNextQuestionOffline,
  type AiFinding,
  type ByokConfig,
  type SocraticTurn,
  type TopologyBrief,
} from "@/engine/aiClient";

/**
 * Adversarial staff-engineer interviewer with voice mode + L4–L7 rubric.
 * Default runs fully offline (deterministic heuristic architect); BYOK keys
 * or local WebGPU upgrade answer quality without ever breaking the loop —
 * every cloud failure degrades gracefully to the heuristic tier.
 */

const seedById = new Map(SEED_RESOURCES.map((r) => [r.id, r]));

function buildBrief(): TopologyBrief {
  const { nodes, edges } = useCanvasStore.getState();
  const regions = new Set<string>();
  return {
    nodes: nodes.map((node) => {
      const seed = seedById.get(String(node.data.resourceId));
      const overrides = node.data.overrides ?? {};
      const region = overrides.region ?? seed?.defaults.region ?? "us-east-1";
      regions.add(region);
      return {
        id: node.id,
        resourceId: String(node.data.resourceId ?? "unknown"),
        category: seed?.category ?? "compute",
        replicationFactor: overrides.replicationFactor ?? seed?.defaults.replicationFactor ?? 1,
        region,
        multiAz: overrides.multiAz ?? seed?.defaults.multiAz ?? false,
        cacheHitRate: overrides.cacheHitRate ?? seed?.defaults.cacheHitRate ?? 0,
        rateLimitRps: overrides.rateLimitRps ?? seed?.defaults.rateLimitRps ?? 10000,
        clientRps: overrides.clientRps ?? 0,
        writeRatio: overrides.writeRatio ?? seed?.defaults.writeRatio ?? 0.2,
      };
    }),
    edgeCount: edges.length,
    regions: Array.from(regions),
  };
}

function speak(text: string): void {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 400));
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* audio unavailable — text path remains */
  }
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function createRecognizer(): SpeechRecognitionLike | null {
  try {
    if (typeof window === "undefined") return null;
    const ctor = (window as unknown as Record<string, unknown>)["SpeechRecognition"] ??
      (window as unknown as Record<string, unknown>)["webkitSpeechRecognition"];
    if (typeof ctor !== "function") return null;
    const instance = new (ctor as new () => SpeechRecognitionLike)();
    instance.lang = "en-US";
    instance.interimResults = false;
    return instance;
  } catch {
    return null;
  }
}

export function SocraticInterviewer() {
  const rubric = useWorkbenchStore((s) => s.rubric);
  const setRubricScore = useWorkbenchStore((s) => s.setRubricScore);
  const setRubricLevel = useWorkbenchStore((s) => s.setRubricLevel);
  const timerSecondsRemaining = useWorkbenchStore((s) => s.timerSecondsRemaining);
  const timerRunning = useWorkbenchStore((s) => s.timerRunning);
  const timerStart = useWorkbenchStore((s) => s.timerStart);
  const timerPause = useWorkbenchStore((s) => s.timerPause);

  const [level, setLevel] = useState<InterviewLevel>(rubric.level);
  const [turns, setTurns] = useState<Array<{ question: string; answer: string; area: string }>>([]);
  const [current, setCurrent] = useState<SocraticTurn | null>(null);
  const [answer, setAnswer] = useState("");
  const [findings, setFindings] = useState<AiFinding[]>([]);
  const [tierNote, setTierNote] = useState("offline heuristic");
  const [analyzing, setAnalyzing] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const [listening, setListening] = useState(false);
  const [byokProvider, setByokProvider] = useState<ByokConfig["provider"]>("gemini");
  const [byokKey, setByokKey] = useState("");
  const [preferLocal, setPreferLocal] = useState(false);
  const [localReady, setLocalReady] = useState(false);
  const recognizerRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const saved = getByokConfig();
    if (saved) {
      setByokProvider(saved.provider);
      setByokKey(saved.apiKey);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => useWorkbenchStore.getState().timerTick(), 1000);
    return () => clearInterval(id);
  }, []);

  const mmss = useMemo(() => {
    const m = Math.floor(timerSecondsRemaining / 60);
    const s = timerSecondsRemaining % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [timerSecondsRemaining]);

  const startSession = useCallback(async () => {
    setAnalyzing(true);
    const brief = buildBrief();
    const byok = getByokConfig();
    try {
      const result = await reviewTopology(brief, { byok, preferLocal: preferLocal && localReady });
      setFindings(result.findings);
      setTierNote(result.tier.replace(/_/g, " "));
      const first = socraticNextQuestionOffline([], result.findings, level);
      setCurrent(first);
      setTurns([]);
      setAnswer("");
      if (voiceOut) speak(`Let's begin. ${first.question}`);
    } catch {
      const offline = analyzeTopologyOffline(brief);
      setFindings(offline);
      setTierNote("offline heuristic");
      setCurrent(socraticNextQuestionOffline([], offline, level));
      setTurns([]);
    } finally {
      setAnalyzing(false);
    }
  }, [level, preferLocal, localReady, voiceOut]);

  const challenge = useCallback(() => {
    if (!current) return;
    const nextTurns = [...turns, { question: current.question, answer: answer.trim(), area: current.focusArea }];
    setTurns(nextTurns);
    const next = socraticNextQuestionOffline(
      nextTurns.map((t) => ({ question: t.question, answer: t.answer })),
      findings,
      level,
    );
    setCurrent(next);
    setAnswer("");
    if (voiceOut) speak(next.question);
  }, [answer, current, findings, level, turns, voiceOut]);

  const toggleListen = () => {
    if (listening) {
      try {
        recognizerRef.current?.stop();
      } catch {
        /* already stopped */
      }
      setListening(false);
      return;
    }
    const recognizer = recognizerRef.current ?? createRecognizer();
    if (!recognizer) return;
    recognizerRef.current = recognizer;
    recognizer.onresult = (event) => {
      const transcript = event.results[event.results.length - 1]?.[0]?.transcript ?? "";
      if (transcript) setAnswer((a) => `${a} ${transcript}`.trim());
    };
    recognizer.onerror = () => setListening(false);
    recognizer.onend = () => setListening(false);
    try {
      recognizer.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const enableLocal = async () => {
    const ok = await loadWebLlmEngine();
    setLocalReady(ok);
    setPreferLocal(ok);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 p-2.5">
        <span className="flex items-center gap-1.5 text-sm font-bold text-zinc-100">
          <Brain size={15} className="text-violet-300" /> Staff interviewer
        </span>
        <select
          value={level}
          onChange={(e) => {
            const next = e.target.value as InterviewLevel;
            setLevel(next);
            setRubricLevel(next);
          }}
          className="rounded bg-zinc-950 px-1.5 py-1 text-xs text-zinc-200"
          title="Target level"
        >
          {(["L4", "L5", "L6", "L7"] as InterviewLevel[]).map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <span className={`font-mono text-xs tabular-nums ${timerSecondsRemaining < 300 ? "text-red-300" : "text-zinc-300"}`}>
          {mmss}
        </span>
        <button
          onClick={() => (timerRunning ? timerPause() : timerStart())}
          className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
        >
          {timerRunning ? "Pause" : "Start"} 45-min clock
        </button>
        <span className="ml-auto text-[11px] text-zinc-500">tier: {tierNote}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => void startSession()}
          disabled={analyzing}
          className="rounded-md bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
        >
          {analyzing ? "Reviewing canvas…" : turns.length > 0 ? "Restart session" : "Start mock interview"}
        </button>
        <button
          onClick={() => {
            setVoiceOut((v) => !v);
            try {
              if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
            } catch {
              /* noop */
            }
          }}
          className={`flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs ${voiceOut ? "border-violet-400/60 text-violet-200" : "border-zinc-700 text-zinc-400"}`}
        >
          {voiceOut ? <Volume2 size={13} /> : <VolumeX size={13} />} Voice out
        </button>
        <button
          onClick={toggleListen}
          className={`flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs ${listening ? "animate-pulse border-red-400/60 text-red-300" : "border-zinc-700 text-zinc-400"}`}
        >
          {listening ? <Mic size={13} /> : <MicOff size={13} />} {listening ? "Listening…" : "Dictate"}
        </button>
      </div>

      {findings.length > 0 && (
        <div className="space-y-1.5">
          {findings.slice(0, 4).map((f) => (
            <div key={f.id} className={`rounded-md border px-2.5 py-1.5 text-xs leading-relaxed ${
              f.severity === "critical" ? "border-red-500/50 bg-red-500/5 text-red-100" : f.severity === "warn" ? "border-amber-500/40 bg-amber-500/5 text-amber-100" : "border-zinc-800 bg-zinc-900/60 text-zinc-300"
            }`}>
              <span className="font-semibold uppercase tracking-wide">{f.area}: </span>
              {f.message} <span className="text-zinc-400">{f.recommendation}</span>
            </div>
          ))}
        </div>
      )}

      {current && (
        <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5">
          <p className="text-[11px] uppercase tracking-wider text-violet-300">{current.focusArea} · {current.level}</p>
          <p className="mt-1 text-sm font-medium leading-relaxed text-zinc-50">{current.question}</p>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            placeholder="Defend your design decision…"
            className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 p-2 text-xs leading-relaxed text-zinc-100"
          />
          <button
            onClick={challenge}
            disabled={answer.trim().length < 3}
            className="mt-2 flex items-center gap-1.5 rounded-md bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-40"
          >
            <Send size={13} /> Submit & get challenged
          </button>
        </div>
      )}

      {turns.length > 0 && (
        <details className="rounded-md border border-zinc-800 bg-zinc-950 p-2.5">
          <summary className="cursor-pointer text-xs font-semibold text-zinc-300">
            Transcript ({turns.length} rounds)
          </summary>
          <div className="mt-2 space-y-2">
            {turns.map((t, i) => (
              <div key={i} className="text-xs">
                <p className="font-semibold text-violet-200">Q: {t.question}</p>
                <p className="mt-0.5 leading-relaxed text-zinc-400">A: {t.answer || "(no answer recorded)"}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-2.5">
        <p className="mb-1.5 text-xs font-bold text-zinc-100">Rubric — overall {rubric.overallScore.toFixed(1)}/4 · {rubric.hireSignal.replace(/_/g, " ")}</p>
        <div className="space-y-1">
          {rubric.dimensions.map((dim) => (
            <div key={dim.key} className="flex items-center gap-2 text-xs">
              <span className="w-40 truncate text-zinc-400">{dim.label}</span>
              <div className="flex gap-0.5">
                {[0, 1, 2, 3, 4].map((score) => (
                  <button
                    key={score}
                    onClick={() => setRubricScore(dim.key, score)}
                    className={`h-6 w-6 rounded text-[11px] font-bold ${dim.score === score ? "bg-amber-300 text-zinc-950" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <details className="rounded-md border border-zinc-800 bg-zinc-950 p-2.5">
        <summary className="cursor-pointer text-xs font-semibold text-zinc-300">AI settings (BYOK · WebGPU)</summary>
        <div className="mt-2 space-y-2">
          <div className="flex gap-1.5">
            <select value={byokProvider} onChange={(e) => setByokProvider(e.target.value as ByokConfig["provider"])} className="rounded bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200">
              <option value="gemini">Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
            <input
              type="password"
              value={byokKey}
              onChange={(e) => setByokKey(e.target.value)}
              placeholder="API key (stored locally only)"
              className="flex-1 rounded bg-zinc-900 px-2 py-1.5 font-mono text-xs text-zinc-200"
            />
            <button
              onClick={() => saveByokConfig(byokKey.trim() ? { provider: byokProvider, apiKey: byokKey.trim() } : null)}
              className="rounded bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
            >
              {byokKey.trim() ? "Save" : "Clear"}
            </button>
          </div>
          <button
            onClick={() => void enableLocal()}
            disabled={!isWebGpuAvailable() || localReady}
            className="w-full rounded border border-zinc-700 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
          >
            {!isWebGpuAvailable() ? "WebGPU unavailable in this browser" : localReady ? "Local WebGPU model loaded" : "Enable local WebGPU model"}
          </button>
        </div>
      </details>
    </div>
  );
}

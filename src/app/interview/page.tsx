'use client';

import { useState, useEffect, useRef } from "react";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { SpotlightCard } from "@/components/ui/reactbits/SpotlightCard";
import { CountUp } from "@/components/ui/reactbits/CountUp";

const PROBLEMS = [
  { id: "url", title: "Design a URL shortener", prompt: "Design a system like bit.ly. 100M new URLs/month, 10:1 read:write, 5-year retention. Cover: API, data model, hashing, caching, analytics, rate limiting, abuse prevention." },
  { id: "feed", title: "Design a news feed", prompt: "Design Twitter-style home timeline. 500M users, 200M DAU. Cover: fan-out on write vs read, ranking, media, realtime, consistency." },
  { id: "chat", title: "Design a chat system", prompt: "Design WhatsApp-style 1:1 and group chat. 2B users, online presence, delivery receipts, media, end-to-end encryption at a high level." },
  { id: "payments", title: "Design a payments API", prompt: "Design Stripe-like payment processing. Idempotency, PCI scope, ledger, reconciliation, retries, fraud hooks, multi-region." },
];

const RUBRIC = [
  { key: "requirements", label: "Requirements & scope", weight: 15 },
  { key: "api", label: "API design", weight: 15 },
  { key: "data", label: "Data model & storage", weight: 20 },
  { key: "scale", label: "Scale numbers & capacity", weight: 15 },
  { key: "bottlenecks", label: "Bottlenecks & tradeoffs", weight: 20 },
  { key: "security", label: "Security & abuse", weight: 15 },
];

export default function InterviewPage() {
  const [problem, setProblem] = useState(PROBLEMS[0]);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(45 * 60);
  const [notes, setNotes] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) { setRunning(false); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  const start = () => { setSeconds(45 * 60); setNotes(""); setScores({}); setRunning(true); };
  const stop = () => setRunning(false);

  const total = RUBRIC.reduce((acc, r) => acc + (scores[r.key] ?? 0) * r.weight / 100, 0);

  return (
    <SiteChrome>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-semibold text-zinc-100">Interview mode</h1>
        <p className="mt-2 text-sm text-zinc-400">45 minutes. One problem. Whiteboard on the canvas, notes here. Score yourself against the rubric.</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <SpotlightCard className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between">
              <select
                value={problem.id}
                onChange={(e) => setProblem(PROBLEMS.find((p) => p.id === e.target.value)!)}
                disabled={running}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              >
                {PROBLEMS.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <div className="text-2xl font-mono text-zinc-100">
                {Math.floor(seconds / 60).toString().padStart(2, "0")}:{(seconds % 60).toString().padStart(2, "0")}
              </div>
            </div>
            <p className="mt-4 text-sm text-zinc-300 leading-relaxed">{problem.prompt}</p>
            <div className="mt-4 flex gap-2">
              {!running ? (
                <button onClick={start} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500">Start timer</button>
              ) : (
                <button onClick={stop} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">Stop</button>
              )}
              <a href="/canvas" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800">Open canvas</a>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes: requirements, API, data model, scale numbers, bottlenecks, security..."
              className="mt-4 h-64 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-100"
            />
          </SpotlightCard>

          <SpotlightCard className="p-6">
            <h2 className="text-lg font-semibold text-zinc-100">Self-score</h2>
            <div className="mt-4 space-y-3">
              {RUBRIC.map((r) => (
                <label key={r.key} className="block">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>{r.label}</span>
                    <span>{r.weight}%</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={scores[r.key] ?? 0}
                    onChange={(e) => setScores({ ...scores, [r.key]: Number(e.target.value) })}
                    className="mt-1 w-full"
                  />
                  <div className="text-right text-xs text-zinc-300">{scores[r.key] ?? 0}%</div>
                </label>
              ))}
            </div>
            <div className="mt-4 border-t border-zinc-700 pt-4">
              <div className="text-sm text-zinc-400">Total</div>
              <div className="text-3xl font-semibold text-zinc-100">
                <CountUp to={Math.round(total)} duration={0.6} /> / 100
              </div>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </SiteChrome>
  );
}

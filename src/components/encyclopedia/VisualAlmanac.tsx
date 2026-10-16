'use client';

import { useEffect, useMemo, useState } from "react";
import { BookOpen, FlaskConical, Search, X } from "lucide-react";
import { ENCYCLOPEDIA_MODULES } from "@/data/encyclopediaData";
import type { AlmanacDifficulty, EncyclopediaModule } from "@/types/encyclopedia";
import { useLearningStore } from "@/store/useLearningStore";
import { ContextualQuizCard } from "./ContextualQuizCard";
import { SkillConstellation } from "./SkillConstellation";
import { InternalSimModal } from "../canvas/InternalSimModal";

/**
 * 19-module visual encyclopedia browser with live interactive sandboxes.
 * Sidebar search + difficulty filter, dependency-free Markdown renderer,
 * trade-off matrices, one-click flashcard deck loading, per-module quizzes
 * with FSRS grading, and the skill constellation header.
 */

interface VisualAlmanacProps {
  open: boolean;
  initialModuleId?: string;
  onClose: () => void;
}

function InlineText({ text }: { text: string }) {
  const parts = useMemo(() => {
    const out: Array<{ key: number; node: React.ReactNode }> = [];
    const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let last = 0;
    let key = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      if (match.index > last) {
        out.push({ key: key++, node: text.slice(last, match.index) });
      }
      const token = match[0];
      if (token.startsWith("**")) {
        out.push({ key: key++, node: <strong key={key} className="font-semibold text-zinc-100">{token.slice(2, -2)}</strong> });
      } else {
        out.push({ key: key++, node: <code key={key} className="rounded bg-zinc-800 px-1 text-[12px] text-amber-200">{token.slice(1, -1)}</code> });
      }
      last = match.index + token.length;
    }
    if (last < text.length) out.push({ key: key++, node: text.slice(last) });
    return out;
  }, [text]);
  return (
    <>
      {parts.map((p) => (
        <span key={p.key}>{p.node}</span>
      ))}
    </>
  );
}

function Markdown({ source }: { source: string }) {
  const blocks = useMemo(() => {
    const lines = source.split("\n");
    type Block =
      | { kind: "heading"; level: number; text: string }
      | { kind: "list"; ordered: boolean; items: string[] }
      | { kind: "code"; text: string }
      | { kind: "table"; header: string[]; rows: string[][] }
      | { kind: "para"; text: string };
    const result: Block[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i] ?? "";
      if (line.trim().startsWith("```")) {
        const code: string[] = [];
        i += 1;
        while (i < lines.length && !(lines[i]?.trim().startsWith("```") ?? false)) {
          code.push(lines[i] ?? "");
          i += 1;
        }
        i += 1;
        result.push({ kind: "code", text: code.join("\n") });
        continue;
      }
      const heading = line.match(/^(#{1,4})\s+(.*)$/);
      if (heading) {
        result.push({ kind: "heading", level: heading[1]?.length ?? 1, text: heading[2] ?? "" });
        i += 1;
        continue;
      }
      if (line.includes("|") && (lines[i + 1]?.includes("---") ?? false)) {
        const header = line.split("|").map((c) => c.trim()).filter(Boolean);
        i += 2;
        const rows: string[][] = [];
        while (i < lines.length && (lines[i]?.includes("|") ?? false) && (lines[i]?.trim().length ?? 0) > 0) {
          rows.push((lines[i] ?? "").split("|").map((c) => c.trim()).filter(Boolean));
          i += 1;
        }
        result.push({ kind: "table", header, rows });
        continue;
      }
      const listMatch = line.match(/^\s*([-*]|\d+\.)\s+(.*)$/);
      if (listMatch) {
        const ordered = /^\d+\.$/.test(listMatch[1] ?? "");
        const items: string[] = [];
        while (i < lines.length) {
          const m = (lines[i] ?? "").match(/^\s*([-*]|\d+\.)\s+(.*)$/);
          if (!m) break;
          items.push(m[2] ?? "");
          i += 1;
        }
        result.push({ kind: "list", ordered, items });
        continue;
      }
      if (line.trim().length === 0) {
        i += 1;
        continue;
      }
      const para: string[] = [line];
      i += 1;
      while (
        i < lines.length &&
        (lines[i]?.trim().length ?? 0) > 0 &&
        !(lines[i]?.match(/^(#{1,4})\s+/) ?? false) &&
        !(lines[i]?.match(/^\s*([-*]|\d+\.)\s+/) ?? false) &&
        !(lines[i]?.trim().startsWith("```") ?? false)
      ) {
        para.push(lines[i] ?? "");
        i += 1;
      }
      result.push({ kind: "para", text: para.join(" ") });
    }
    return result;
  }, [source]);

  return (
    <div className="space-y-2.5 text-[13px] leading-relaxed text-zinc-300">
      {blocks.map((block, idx) => {
        if (block.kind === "heading") {
          const sizes = ["text-lg font-bold text-zinc-50", "text-base font-bold text-zinc-50", "text-sm font-bold text-zinc-100", "text-sm font-semibold text-zinc-200"];
          return (
            <h4 key={idx} className={sizes[Math.min(block.level, 4) - 1]}>
              <InlineText text={block.text} />
            </h4>
          );
        }
        if (block.kind === "code") {
          return (
            <pre key={idx} className="overflow-x-auto rounded-md border border-zinc-800 bg-black p-2.5 font-mono text-[12px] leading-relaxed text-emerald-200">
              {block.text}
            </pre>
          );
        }
        if (block.kind === "table") {
          return (
            <div key={idx} className="overflow-x-auto rounded-md border border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-900">
                    {block.header.map((h, hi) => (
                      <th key={hi} className="border-b border-zinc-800 px-2 py-1.5 font-semibold text-zinc-100">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, ri) => (
                    <tr key={ri} className="odd:bg-zinc-950 even:bg-zinc-900/50">
                      {row.map((cell, ci) => (
                        <td key={ci} className="border-t border-zinc-800/60 px-2 py-1.5 text-zinc-300">
                          <InlineText text={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (block.kind === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Tag key={idx} className={`space-y-1 pl-5 ${block.ordered ? "list-decimal" : "list-disc"}`}>
              {block.items.map((item, ii) => (
                <li key={ii}>
                  <InlineText text={item} />
                </li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={idx}>
            <InlineText text={block.text} />
          </p>
        );
      })}
    </div>
  );
}

const DIFFICULTIES: Array<AlmanacDifficulty | "all"> = ["all", "foundations", "intermediate", "advanced"];

export function VisualAlmanac({ open, initialModuleId, onClose }: VisualAlmanacProps) {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<AlmanacDifficulty | "all">("all");
  const [selectedId, setSelectedId] = useState<string>(initialModuleId ?? ENCYCLOPEDIA_MODULES[0]?.id ?? "");
  const [simOpen, setSimOpen] = useState(false);
  const loadFlashcardsForModule = useLearningStore((s) => s.loadFlashcardsForModule);
  const dueCount = useLearningStore((s) => s.dueCount);

  useEffect(() => {
    if (open && initialModuleId) setSelectedId(initialModuleId);
  }, [open, initialModuleId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !simOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, simOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ENCYCLOPEDIA_MODULES.filter((m) => {
      if (difficulty !== "all" && m.difficulty !== difficulty) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
      );
    });
  }, [search, difficulty]);

  const selected: EncyclopediaModule | undefined =
    ENCYCLOPEDIA_MODULES.find((m) => m.id === selectedId) ?? filtered[0];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-3" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Visual almanac"
      >
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
          <BookOpen size={17} className="text-amber-300" />
          <h3 className="text-base font-bold text-zinc-50">Visual Almanac</h3>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] text-zinc-400">
            {ENCYCLOPEDIA_MODULES.length} modules · {dueCount()} cards due
          </span>
          <button
            onClick={onClose}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
            aria-label="Close almanac"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[280px_1fr]">
          <div className="flex min-h-0 flex-col border-b border-zinc-800 md:border-b-0 md:border-r">
            <div className="space-y-2 border-b border-zinc-800 p-3">
              <div className="relative">
                <Search size={14} className="absolute left-2 top-2.5 text-zinc-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search modules…"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 py-2 pl-8 pr-2 text-xs text-zinc-200"
                />
              </div>
              <div className="flex gap-1">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`rounded px-2 py-1 text-[11px] font-semibold capitalize ${
                      difficulty === d ? "bg-amber-300 text-zinc-950" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto p-2 md:max-h-none md:flex-1">
              {filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`w-full rounded-md px-2.5 py-2 text-left ${
                    selected?.id === m.id ? "bg-zinc-800" : "hover:bg-zinc-900"
                  }`}
                >
                  <span className="block truncate text-xs font-semibold text-zinc-100">{m.title}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-zinc-500">
                    <span className="capitalize">{m.difficulty}</span>·<span>{m.estimatedMinutes} min</span>·
                    <span>{m.quiz.length} quiz</span>
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="p-3 text-xs text-zinc-500">No modules match this filter.</p>
              )}
            </div>
          </div>

          <div className="min-h-0 space-y-4 overflow-y-auto p-4">
            {selected ? (
              <>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-zinc-500">
                    {selected.difficulty} · {selected.estimatedMinutes} min read
                  </p>
                  <h4 className="mt-0.5 text-xl font-bold text-zinc-50">{selected.title}</h4>
                  <p className="mt-1 text-sm text-zinc-400">{selected.summary}</p>
                  {selected.interactiveVisual !== "none" && (
                    <button
                      onClick={() => setSimOpen(true)}
                      className="mt-2 flex items-center gap-1.5 rounded-md bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-400"
                    >
                      <FlaskConical size={14} /> Launch interactive sandbox
                    </button>
                  )}
                </div>

                <Markdown source={selected.bodyMarkdown} />

                {selected.tradeOffs.length > 0 && (
                  <div>
                    <h5 className="mb-1.5 text-sm font-bold text-zinc-100">Trade-off matrix</h5>
                    <div className="overflow-x-auto rounded-md border border-zinc-800">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-zinc-900">
                            <th className="px-2 py-1.5 text-zinc-100">Dimension</th>
                            <th className="px-2 py-1.5 text-zinc-100">Option A</th>
                            <th className="px-2 py-1.5 text-zinc-100">Option B</th>
                            <th className="px-2 py-1.5 text-zinc-100">Recommendation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.tradeOffs.map((t, i) => (
                            <tr key={i} className="odd:bg-zinc-950 even:bg-zinc-900/50">
                              <td className="border-t border-zinc-800/60 px-2 py-1.5 font-medium text-zinc-200">{t.dimension}</td>
                              <td className="border-t border-zinc-800/60 px-2 py-1.5 text-zinc-300">{t.optionA}</td>
                              <td className="border-t border-zinc-800/60 px-2 py-1.5 text-zinc-300">{t.optionB}</td>
                              <td className="border-t border-zinc-800/60 px-2 py-1.5 text-emerald-200">{t.recommendation}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selected.flashcards.length > 0 && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <h5 className="text-sm font-bold text-zinc-100">
                        Flashcards ({selected.flashcards.length})
                      </h5>
                      <button
                        onClick={() => loadFlashcardsForModule(selected.id, selected.flashcards)}
                        className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-800"
                      >
                        Add all to FSRS deck
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {selected.flashcards.map((card) => (
                        <details key={card.cardId} className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-2">
                          <summary className="cursor-pointer text-xs font-medium text-zinc-100">{card.front}</summary>
                          <p className="mt-1 text-xs leading-relaxed text-zinc-400">{card.back}</p>
                        </details>
                      ))}
                    </div>
                  </div>
                )}

                {selected.quiz.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-bold text-zinc-100">Check your understanding</h5>
                    {selected.quiz.map((q) => (
                      <ContextualQuizCard key={q.id} question={q} />
                    ))}
                  </div>
                )}

                <SkillConstellation onSelectModule={(moduleId) => setSelectedId(moduleId)} />
              </>
            ) : (
              <p className="text-sm text-zinc-500">Select a module to begin.</p>
            )}
          </div>
        </div>
      </div>

      <InternalSimModal
        open={simOpen}
        initialTab={selected?.interactiveVisual ?? "none"}
        onClose={() => setSimOpen(false)}
      />
    </div>
  );
}

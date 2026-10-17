'use client';

import { useMemo } from "react";

/**
 * Dependency-free Markdown renderer for encyclopedia articles, lab briefs,
 * and post-mortems. Supports fenced code, headings (with stable anchor ids),
 * pipe tables, ordered / unordered lists, **bold**, and `inline code`.
 * Unknown constructs degrade to plain paragraphs instead of throwing.
 */

/** Stable, URL-safe anchor id for a heading, used by readers' table of contents. */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "section";
}

export interface MarkdownHeading {
  id: string;
  text: string;
  level: number;
}

/**
 * Extract headings (levels 1-3) with the exact ids the renderer assigns.
 * Reimplements the fence-skipping walk so ToC anchors always resolve.
 */
export function extractHeadings(source: string): MarkdownHeading[] {
  const lines = source.split("\n");
  const seen = new Map<string, number>();
  const headings: MarkdownHeading[] = [];
  let inCode = false;
  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const match = line.match(/^(#{1,4})\s+(.*)$/);
    if (!match) continue;
    const level = match[1]?.length ?? 1;
    const text = match[2] ?? "";
    if (level > 3) continue;
    const base = slugifyHeading(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    headings.push({ id: count === 0 ? base : `${base}-${count}`, text, level });
  }
  return headings;
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

export function Markdown({ source }: { source: string }) {
  const blocks = useMemo(() => {
    const lines = source.split("\n");
    type Block =
      | { kind: "heading"; level: number; text: string; id: string }
      | { kind: "list"; ordered: boolean; items: string[] }
      | { kind: "code"; text: string }
      | { kind: "table"; header: string[]; rows: string[][] }
      | { kind: "para"; text: string };
    const result: Block[] = [];
    const headingIds = new Map<string, number>();
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
        const text = heading[2] ?? "";
        const base = slugifyHeading(text);
        const count = headingIds.get(base) ?? 0;
        headingIds.set(base, count + 1);
        result.push({
          kind: "heading",
          level: heading[1]?.length ?? 1,
          text,
          id: count === 0 ? base : `${base}-${count}`,
        });
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
            <h4 key={idx} id={block.id} className={`scroll-mt-24 ${sizes[Math.min(block.level, 4) - 1]}`}>
              <InlineText text={block.text} />
            </h4>
          );
        }
        if (block.kind === "code") {
          return (
            <pre key={idx} className="overflow-x-auto rounded-md border border-zinc-800 bg-ink p-2.5 font-mono text-[12px] leading-relaxed text-emerald-200">
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

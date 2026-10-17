'use client';

import { useMemo } from "react";

/**
 * Dependency-free Markdown renderer for encyclopedia articles, lab briefs,
 * and post-mortems. Supports fenced code, headings, pipe tables, ordered /
 * unordered lists, **bold**, and `inline code`. Unknown constructs degrade
 * to plain paragraphs instead of throwing.
 */

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

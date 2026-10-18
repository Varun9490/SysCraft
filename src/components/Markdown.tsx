'use client';

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import Link from "next/link";
import { ConceptDiagram } from "@/components/wiki/ConceptDiagram";
import { HoverTerm } from "@/components/wiki/HoverTerm";
import { GLOSSARY_PATTERN } from "@/data/glossary";

/**
 * Dependency-free Markdown renderer for encyclopedia articles, lab briefs,
 * and post-mortems. Supports fenced code (with ```mermaid diagrams rendered
 * interactive), headings (stable anchor ids), pipe tables, blockquotes,
 * ordered / unordered lists, **bold** with a marker-highlight sweep,
 * `inline code`, [text](link) cross-links, and remocn-style block reveals
 * as blocks scroll into view. Unknown constructs degrade to paragraphs.
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

/** One block that fades up (with a whisper of blur) the first time it scrolls in. */
function RevealBlock({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("md-in");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("md-in");
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="md-block" ref={ref}>
      {children}
    </div>
  );
}

/**
 * Split a plain-text run on known glossary terms and wrap each hit with a
 * HoverTerm so jargon words open a definition card. Longest-term-wins is
 * guaranteed by the precompiled GLOSSARY_PATTERN.
 */
function glossifyText(text: string): React.ReactNode {
  const pattern = GLOSSARY_PATTERN;
  if (!pattern || text.length < 4) return text;
  pattern.lastIndex = 0;
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    out.push(<HoverTerm key={key++} term={match[0]} />);
    last = match.index + match[0].length;
    if (match[0].length === 0) {
      pattern.lastIndex = match.index + 1;
      if (pattern.lastIndex > text.length) break;
    }
  }
  if (out.length === 0) return text;
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

function InlineText({ text }: { text: string }) {
  const parts = useMemo(() => {
    const out: Array<{ key: number; node: React.ReactNode }> = [];
    const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
    let last = 0;
    let key = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      if (match.index > last) {
        out.push({ key: key++, node: glossifyText(text.slice(last, match.index)) });
      }
      const token = match[0];
      if (token.startsWith("**")) {
        out.push({
          key: key++,
          node: (
            <strong key={key} className="marker-highlight font-semibold text-zinc-100">
              {glossifyText(token.slice(2, -2))}
            </strong>
          ),
        });
      } else if (token.startsWith("[") && token.endsWith(")")) {
        const split = token.slice(1, -1).split("](");
        const label = split[0] ?? token;
        const href = split[1] ?? "";
        if (href.startsWith("/")) {
          out.push({ key: key++, node: <Link key={key} href={href} className="md-link">{label}</Link> });
        } else if (/^https?:\/\//.test(href)) {
          out.push({
            key: key++,
            node: (
              <a key={key} href={href} className="md-link" target="_blank" rel="noopener noreferrer">
                {label}
              </a>
            ),
          });
        } else {
          out.push({ key: key++, node: <span key={key}>{label}</span> });
        }
      } else {
        out.push({ key: key++, node: <code key={key} className="inline-code">{token.slice(1, -1)}</code> });
      }
      last = match.index + token.length;
    }
    if (last < text.length) out.push({ key: key++, node: glossifyText(text.slice(last)) });
    return out;
  }, [text]);
  return <>{parts.map((p) => <span key={p.key}>{p.node}</span>)}</>;
}

export function Markdown({ source }: { source: string }) {
  const blocks = useMemo(() => {
    const lines = source.split("\n");
    type Block =
      | { kind: "heading"; level: number; text: string; id: string }
      | { kind: "list"; ordered: boolean; items: string[] }
      | { kind: "code"; lang: string; text: string }
      | { kind: "quote"; lines: string[] }
      | { kind: "table"; header: string[]; rows: string[][] }
      | { kind: "para"; text: string };
    const result: Block[] = [];
    const headingIds = new Map<string, number>();
    let i = 0;
    while (i < lines.length) {
      const line = lines[i] ?? "";
      if (line.trim().startsWith("```")) {
        const lang = (line.trim().slice(3).split(/\s+/)[0] ?? "").toLowerCase();
        const code: string[] = [];
        i += 1;
        while (i < lines.length && !(lines[i]?.trim().startsWith("```") ?? false)) {
          code.push(lines[i] ?? "");
          i += 1;
        }
        i += 1;
        result.push({ kind: "code", lang, text: code.join("\n") });
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
      if (line.startsWith(">")) {
        const quote: string[] = [];
        while (i < lines.length && (lines[i]?.startsWith(">") ?? false)) {
          quote.push((lines[i] ?? "").replace(/^>\s?/, ""));
          i += 1;
        }
        result.push({ kind: "quote", lines: quote });
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
        !((lines[i] ?? "").startsWith(">")) &&
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
    <div className="md-prose space-y-6 text-[14px] leading-[1.78] text-zinc-300">
      {blocks.map((block, idx) => {
        if (block.kind === "heading") {
          const sizes = [
            "mt-10 border-b border-zinc-800/60 pb-1.5 text-[20px] font-semibold tracking-tight text-zinc-50",
            "mt-7 text-[16.5px] font-semibold tracking-tight text-zinc-100",
            "mt-5 text-[14.5px] font-semibold text-zinc-200",
            "mt-4 text-[13.5px] font-semibold text-zinc-300",
          ];
          const Heading = (["h2", "h3", "h4", "h5"][Math.min(block.level, 4) - 1] ?? "h4") as "h2" | "h3" | "h4" | "h5";
          return (
            <RevealBlock key={idx}>
              <Heading id={block.id} className={`scroll-mt-24 first:mt-2 ${sizes[Math.min(block.level, 4) - 1]}`}>
                <InlineText text={block.text} />
              </Heading>
            </RevealBlock>
          );
        }
        if (block.kind === "code") {
          const isMermaid = block.lang === "mermaid" && block.text.trim().length > 0;
          return isMermaid ? (
            <RevealBlock key={idx}>
              <ConceptDiagram code={block.text} />
            </RevealBlock>
          ) : (
            <RevealBlock key={idx}>
              <pre className="md-code">{block.text}</pre>
            </RevealBlock>
          );
        }
        if (block.kind === "quote") {
          return (
            <RevealBlock key={idx}>
              <blockquote className="md-quote">
                {block.lines.map((line, li) => (
                  <p key={li} className="first:font-medium">
                    <InlineText text={line} />
                  </p>
                ))}
              </blockquote>
            </RevealBlock>
          );
        }
        if (block.kind === "table") {
          return (
            <RevealBlock key={idx}>
              <div className="overflow-x-auto rounded-lg border border-zinc-800">
                <table className="md-table">
                  <thead>
                    <tr className="bg-zinc-900">
                      {block.header.map((h, hi) => (
                        <th key={hi} scope="col" className="border-b border-zinc-800 px-3 py-2 text-left font-semibold text-zinc-100">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, ri) => (
                      <tr key={ri} className="odd:bg-zinc-950 even:bg-zinc-900/45">
                        {row.map((cell, ci) => (
                          <td key={ci} className="border-t border-zinc-800/60 px-3 py-2 align-top text-zinc-300">
                            <InlineText text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </RevealBlock>
          );
        }
        if (block.kind === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <RevealBlock key={idx}>
              <Tag className={`md-list ${block.ordered ? "list-decimal" : "list-disc"}`}>
                {block.items.map((item, ii) => (
                  <li key={ii}>
                    <InlineText text={item} />
                  </li>
                ))}
              </Tag>
            </RevealBlock>
          );
        }
        return (
          <RevealBlock key={idx}>
            <p>
              <InlineText text={block.text} />
            </p>
          </RevealBlock>
        );
      })}
    </div>
  );
}

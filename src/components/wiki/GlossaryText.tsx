'use client';

import { useMemo, type ReactNode } from "react";
import { HoverTerm } from "@/components/wiki/HoverTerm";
import { GLOSSARY_PATTERN } from "@/data/glossary";

/**
 * Split a plain-text run on known glossary terms and wrap each hit with a
 * HoverTerm so jargon words open a definition card. Longest-term-wins is
 * guaranteed by the precompiled GLOSSARY_PATTERN.
 *
 * Shared by the Markdown renderer and the lesson reader so every piece of
 * prose on the site behaves the same way when a hard word is hovered.
 */
export function glossifyText(text: string): ReactNode {
  const pattern = GLOSSARY_PATTERN;
  if (!pattern || text.length < 4) return text;
  pattern.lastIndex = 0;
  const out: ReactNode[] = [];
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

/**
 * Renders a paragraph-sized run of prose with hover definitions enabled.
 *
 * `plain` skips the hover-card spans. Use it inside buttons, links, and other
 * interactive parents: a hover trigger is itself a button, and nesting one
 * inside another interactive element is invalid HTML that browsers repair
 * before hydration (React error #418).
 */
export function GlossaryText({ text, plain = false }: { text: string; plain?: boolean }) {
  const nodes = useMemo(() => (plain ? text : glossifyText(text)), [text, plain]);
  return <>{nodes}</>;
}

export default GlossaryText;

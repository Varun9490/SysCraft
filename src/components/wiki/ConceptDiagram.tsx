'use client';

import { useEffect, useRef, useState } from "react";

/**
 * Interactive mermaid diagrams inside concept docs. The diagram code comes
 * from fenced ```mermaid blocks in encyclopedia bodies and renders fully
 * client-side (static export safe): pan by drag, zoom buttons, hover
 * highlighting, and a plain-text fallback when mermaid cannot parse.
 */

let DiagramIndex = 0;

interface ConceptDiagramProps {
  code: string;
}

export function ConceptDiagram({ code }: ConceptDiagramProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const holderRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    let token = 0;
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: {
            background: "transparent",
            fontFamily: "var(--font-sans, 'Segoe UI', system-ui, sans-serif)",
            fontSize: "13px",
            textColor: "#a8a296",
            primaryColor: "#232019",
            primaryTextColor: "#eeeae3",
            primaryBorderColor: "#8a6d3f",
            secondaryColor: "#1c1a15",
            secondaryTextColor: "#cda86a",
            secondaryBorderColor: "#8a6d3f",
            tertiaryColor: "#15140f",
            tertiaryTextColor: "#a8a296",
            tertiaryBorderColor: "#3f3b31",
            lineColor: "#78746a",
            edgeLabelBackground: "#15140f",
            clusterBkg: "#15140f",
            clusterBorder: "#3f3b31",
            mainBkg: "#232019",
          },
          flowchart: { curve: "basis", padding: 12 },
          sequence: { actorMargin: 40, width: 180 },
        });
        const id = `md-mermaid-${DiagramIndex++}-${token}`;
        const { svg: rendered } = await mermaid.render(id, code);
        if (!cancelled) setSvg(rendered);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      token += 1;
      cancelled = true;
    };
  }, [code]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    setPan({ x: drag.panX + (event.clientX - drag.x), y: drag.panY + (event.clientY - drag.y) });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const clampZoom = (next: number) => Math.min(2.4, Math.max(0.55, next));

  return (
    <figure className="concept-diagram mt-5 overflow-hidden rounded-xl border border-zinc-800 bg-ink/70" data-diagram>
      <figcaption className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/40 px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brass/90">
          Interactive flow · drag to pan
        </span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z - 0.15))}
            className="flex h-6 w-6 items-center justify-center rounded border border-zinc-700 text-[13px] text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="flex h-6 items-center justify-center rounded border border-zinc-700 px-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z + 0.15))}
            className="flex h-6 w-6 items-center justify-center rounded border border-zinc-700 text-[13px] text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
            aria-label="Zoom in"
          >
            +
          </button>
        </span>
      </figcaption>
      <div
        ref={holderRef}
        className="mermaid-viewport cursor-grab touch-none overflow-hidden active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ minHeight: 160 }}
      >
        {failed ? (
          <pre className="overflow-x-auto p-3 font-mono text-[12px] leading-relaxed text-emerald-200">{code}</pre>
        ) : svg ? (
          <div
            className="mermaid-svg flex justify-center py-3 px-4"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: dragRef.current ? "none" : "transform 0.18s ease-out",
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="flex items-center justify-center py-10 text-[12px] text-zinc-500">Rendering diagram…</div>
        )}
      </div>
    </figure>
  );
}

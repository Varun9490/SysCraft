'use client';

import { useEffect, useRef, useState } from "react";
import { useLearnerPlatformStore } from "@/store/useLearnerPlatformStore";

type CursorMode = "default" | "read" | "grab" | "inspect";

const MODE_FROM_ATTR: Record<string, CursorMode> = {
  read: "read",
  grab: "grab",
  inspect: "inspect",
};

/**
 * Client-only custom cursor. Position is written straight to the DOM inside a
 * rAF loop — React state is used only for the (rare) hover-mode transitions so
 * pointer movement never triggers a render.
 */
export default function CustomCursor() {
  const cursorPref = useLearnerPlatformStore((s) => Boolean(s.prefs?.cursor));
  const [allowed, setAllowed] = useState(false);
  const [mode, setMode] = useState<CursorMode>("default");
  const [interactive, setInteractive] = useState(false);

  const modeRef = useRef<CursorMode>("default");
  const interactiveRef = useRef(false);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);

  // First render is null on both server and client; only this effect decides
  // whether the custom cursor is allowed (never at module scope).
  useEffect(() => {
    if (typeof window === "undefined") return;

    const evaluate = () => {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
      const coarse =
        window.matchMedia?.("(pointer: coarse)")?.matches ||
        (typeof navigator !== "undefined" && (navigator.maxTouchPoints ?? 0) > 0);
      setAllowed(cursorPref && !reduce && !coarse);
    };

    evaluate();
    const reduceQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const coarseQuery = window.matchMedia?.("(pointer: coarse)");
    reduceQuery?.addEventListener?.("change", evaluate);
    coarseQuery?.addEventListener?.("change", evaluate);
    return () => {
      reduceQuery?.removeEventListener?.("change", evaluate);
      coarseQuery?.removeEventListener?.("change", evaluate);
    };
  }, [cursorPref]);

  // The native cursor is hidden only while this component is actually drawing.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (allowed) root.classList.add("cursor-custom");
    else root.classList.remove("cursor-custom");
    return () => root.classList.remove("cursor-custom");
  }, [allowed]);

  useEffect(() => {
    if (!allowed || typeof window === "undefined" || typeof document === "undefined") return;

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ring = { x: target.x, y: target.y };
    const dot = { x: target.x, y: target.y };
    let inWindow = true;
    let frame = 0;
    let running = false;

    const onMove = (event: PointerEvent) => {
      let x = event.clientX;
      let y = event.clientY;
      inWindow = true;

      const el = event.target instanceof Element ? event.target : null;
      let nextMode: CursorMode = "default";
      let nextInteractive = false;

      if (el) {
        const declared = el.closest("[data-cursor]")?.getAttribute("data-cursor");
        if (declared && declared in MODE_FROM_ATTR) nextMode = MODE_FROM_ATTR[declared];

        nextInteractive = Boolean(el.closest("a, button, [role='button'], summary"));
        if (nextInteractive) {
          const control = el.closest("a, button, [role='button']");
          const rect = control?.getBoundingClientRect();
          if (rect && rect.width > 0 && rect.height > 0) {
            // At most 6px of pull so the ring never fights pointer precision.
            const pullX = (rect.left + rect.width / 2 - x) * 0.14;
            const pullY = (rect.top + rect.height / 2 - y) * 0.14;
            x += Math.max(-6, Math.min(6, pullX));
            y += Math.max(-6, Math.min(6, pullY));
          }
        }
      }

      target.x = x;
      target.y = y;

      if (nextMode !== modeRef.current) {
        modeRef.current = nextMode;
        setMode(nextMode);
      }
      if (nextInteractive !== interactiveRef.current) {
        interactiveRef.current = nextInteractive;
        setInteractive(nextInteractive);
      }
      start();
    };

    const onLeave = () => {
      inWindow = false;
      start();
    };
    const onEnter = () => {
      inWindow = true;
      start();
    };

    const tick = () => {
      ring.x += (target.x - ring.x) * 0.18;
      ring.y += (target.y - ring.y) * 0.18;
      dot.x += (target.x - dot.x) * 0.45;
      dot.y += (target.y - dot.y) * 0.45;

      const scale = interactiveRef.current ? 1.45 : 1;
      const baseOpacity = modeRef.current === "read" ? 0.15 : 1;
      const opacity = inWindow ? baseOpacity : 0;

      if (ringRef.current) {
        ringRef.current.style.transform =
          `translate3d(${ring.x - 14}px, ${ring.y - 14}px, 0) scale(${scale})`;
        ringRef.current.style.opacity = String(opacity);
      }
      if (dotRef.current) {
        dotRef.current.style.transform =
          `translate3d(${dot.x - 2}px, ${dot.y - 2}px, 0)`;
        dotRef.current.style.opacity = String(opacity);
      }
      const settled =
        Math.abs(target.x - ring.x) < 0.05 &&
        Math.abs(target.y - ring.y) < 0.05 &&
        Math.abs(target.x - dot.x) < 0.05 &&
        Math.abs(target.y - dot.y) < 0.05;
      if (settled) {
        running = false;
        frame = 0;
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      frame = window.requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    start();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, [allowed]);

  if (!allowed) return null;

  const ringShape = mode === "grab" ? "rounded-[9px]" : "rounded-full";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[70]"
      style={{ mixBlendMode: "normal" }}
      data-cursor-mode={mode}
      data-cursor-interactive={interactive ? "true" : "false"}
    >
      <div
        ref={ringRef}
        className={`absolute left-0 top-0 flex items-center justify-center border border-brass/80 ${ringShape}`}
        style={{
          width: 28,
          height: 28,
          transform: "translate3d(-100px, -100px, 0)",
          boxShadow: "0 0 0 1px rgb(0 0 0 / 0.35)",
          transition: "opacity 180ms ease, border-radius 160ms ease",
        }}
      >
        {mode === "inspect" ? (
          <span className="font-mono text-[10px] font-semibold leading-none text-brass-bright">
            {"{ }"}
          </span>
        ) : null}
      </div>
      <div
        ref={dotRef}
        className="absolute left-0 top-0 rounded-full bg-brass-bright"
        style={{
          width: 4,
          height: 4,
          transform: "translate3d(-100px, -100px, 0)",
          boxShadow: "0 0 0 1px rgb(0 0 0 / 0.35)",
        }}
      />
    </div>
  );
}

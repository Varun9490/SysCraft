'use client';

import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';

/**
 * Hover card — the shadcn/base-UI composition (HoverCard > Trigger + Content)
 * implemented without a radix dependency. Pure CSS positioned, keyboard and
 * touch safe, delay/closeDelay configurable, Escape-to-close, focus access.
 */

interface HoverCardCtx {
  open: boolean;
  openCard: () => void;
  closeCard: () => void;
  contentId: string;
  side: 'top' | 'bottom';
}

const Ctx = createContext<HoverCardCtx | null>(null);

function useHoverCtx(): HoverCardCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('HoverCard part must be inside <HoverCard>');
  return ctx;
}

export function HoverCard({
  children,
  delay = 110,
  closeDelay = 170,
  side = 'top',
}: {
  children: ReactNode;
  delay?: number;
  closeDelay?: number;
  side?: 'top' | 'bottom';
}) {
  const [open, setOpen] = useState(false);
  const timers = useRef<{ open?: number; close?: number }>({});

  const clearTimers = () => {
    if (timers.current.open) window.clearTimeout(timers.current.open);
    if (timers.current.close) window.clearTimeout(timers.current.close);
    timers.current = {};
  };

  const openCard = () => {
    clearTimers();
    timers.current.open = window.setTimeout(() => setOpen(true), delay);
  };
  const closeCard = () => {
    clearTimers();
    timers.current.close = window.setTimeout(() => setOpen(false), closeDelay);
  };

  useEffect(() => () => clearTimers(), []);
  const contentId = useId();
  const value = useMemo<HoverCardCtx>(
    () => ({ open, openCard, closeCard, contentId, side }),
    [open, contentId, side, openCard, closeCard],
  );

  return (
    <Ctx.Provider value={value}>
      <span className="hovercard-root relative inline-block">{children}</span>
    </Ctx.Provider>
  );
}

export function HoverCardTrigger({ children }: { children: ReactNode }) {
  const ctx = useHoverCtx();
  return (
    <button
      type="button"
      className="hovercard-term inline cursor-help text-inherit"
      aria-expanded={ctx.open}
      aria-describedby={ctx.open ? ctx.contentId : undefined}
      onMouseEnter={ctx.openCard}
      onMouseLeave={ctx.closeCard}
      onFocus={ctx.openCard}
      onBlur={ctx.closeCard}
      onClick={(e) => {
        e.preventDefault();
        if (ctx.open) ctx.closeCard();
        else ctx.openCard();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && ctx.open) {
          e.stopPropagation();
          ctx.closeCard();
        }
      }}
    >
      {children}
    </button>
  );
}

export function HoverCardContent({
  children,
  align = 'center',
  widthClass = 'w-64',
}: {
  children: ReactNode;
  align?: 'center' | 'start';
  widthClass?: string;
}) {
  const ctx = useHoverCtx();
  useEffect(() => {
    if (!ctx.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ctx.closeCard();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctx]);

  if (!ctx.open) return null;
  const alignClass = align === 'start' ? 'left-0' : 'left-1/2 -translate-x-1/2';
  const sideClass = ctx.side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

  return (
    <span
      id={ctx.contentId}
      role="tooltip"
      className={`hovercard-in ${sideClass} ${alignClass} ${widthClass} pointer-events-auto absolute z-[80] rounded-xl border border-zinc-700/80 bg-zinc-950/95 px-3 py-2 shadow-xl shadow-black/50 backdrop-blur`}
      onMouseEnter={ctx.openCard}
      onMouseLeave={ctx.closeCard}
    >
      {children}
    </span>
  );
}

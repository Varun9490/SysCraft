'use client';

import { useEffect } from "react";
import { applyAccentTheme, useCanvasPrefsStore } from "@/store/useCanvasPrefsStore";

/**
 * Client-only theme applier mounted once in the root layout. Hydrates the
 * persisted canvas preferences (which include the accent theme) and mirrors the
 * active accent onto the document root CSS variables. Every later change to the
 * theme re-applies automatically.
 */
export function ThemeBridge() {
  const theme = useCanvasPrefsStore((s) => s.theme);
  const hydratePrefs = useCanvasPrefsStore((s) => s.hydratePrefs);

  useEffect(() => {
    hydratePrefs();
  }, [hydratePrefs]);

  useEffect(() => {
    applyAccentTheme(theme);
  }, [theme]);

  return null;
}

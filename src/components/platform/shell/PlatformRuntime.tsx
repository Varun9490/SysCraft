'use client';

import { useEffect } from "react";
import { useLearnerPlatformStore } from "@/store/useLearnerPlatformStore";
import AmbientField from "../motion/AmbientField";
import BreakReminder from "../motion/BreakReminder";
import CustomCursor from "../motion/CustomCursor";
import CommandPalette from "./CommandPalette";
import UtilityDock from "./UtilityDock";

/**
 * Single client mount for the platform shell. It renders no wrapper of its own
 * so it can sit beside BootRunner in the root layout without affecting layout.
 */
export default function PlatformRuntime() {
  const hydrate = useLearnerPlatformStore((s) => s.hydrate);
  const theme = String(useLearnerPlatformStore((s) => s.prefs?.theme ?? "dark"));

  useEffect(() => {
    void hydrate?.();
  }, [hydrate]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const root = document.documentElement;

    const apply = () => {
      const systemLight =
        theme === "system" &&
        Boolean(window.matchMedia?.("(prefers-color-scheme: light)")?.matches);
      root.classList.toggle("theme-light", theme === "light" || systemLight);
    };

    apply();
    const query =
      theme === "system" ? window.matchMedia?.("(prefers-color-scheme: light)") : undefined;
    query?.addEventListener?.("change", apply);
    return () => query?.removeEventListener?.("change", apply);
  }, [theme]);

  return (
    <>
      <AmbientField />
      <CustomCursor />
      <BreakReminder />
      <UtilityDock />
      <CommandPalette />
    </>
  );
}

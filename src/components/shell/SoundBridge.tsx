'use client';

import { useEffect, useRef } from "react";
import {
  playErrorAlert,
  startLoadHum,
  stopLoadHum,
  updateLoadHum,
} from "@/engine/soundEngine";
import { useSimStore } from "@/store/useSimStore";

/**
 * Invisible audio side-effects bridge: a load-tracking hum tied to simulated
 * RPS/error pressure plus an alert edge on sustained errors. Mounted by the
 * immersive workspaces; runtime-only (never touches AudioContext at import).
 */
export function SoundBridge() {
  const errorEdge = useRef(false);
  useEffect(() => {
    startLoadHum();
    const timer = setInterval(() => {
      const state = useSimStore.getState();
      const pressure = Math.min(1, state.globalRps / 20000 + state.globalErrorRate);
      updateLoadHum(state.running ? 0.15 + pressure * 0.85 : 0);
      const alarming = state.running && state.globalErrorRate > 0.1;
      if (alarming && !errorEdge.current) playErrorAlert();
      errorEdge.current = alarming;
    }, 500);
    return () => {
      clearInterval(timer);
      stopLoadHum();
    };
  }, []);
  return null;
}

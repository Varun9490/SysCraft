'use client';

import { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCcw } from "@/components/ui/icons";
import { CANVAS_STORAGE_KEY, flushPendingCanvasWrite } from "@/store/canvasPersistence";

/**
 * Last line of defence around the canvas: any render crash (corrupted state,
 * engine edge case, browser quirk) lands on a recovery card instead of a
 * white screen. "Try again" keeps the user's work; the reset path clears the
 * auto-saved topology from localStorage and reloads fresh.
 */

type Props = { children: ReactNode };
type State = { error: Error | null };

export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[SysCraft canvas] render error caught by boundary:", error, info.componentStack);
  }

  private tryAgain = () => {
    this.setState({ error: null });
  };

  private resetCanvas = () => {
    // Drop the auto-saved topology, flush any pending debounced write so the
    // stale snapshot cannot resurrect, then reload the workbench.
    try {
      flushPendingCanvasWrite();
      window.localStorage.removeItem(CANVAS_STORAGE_KEY);
    } catch {
      /* storage unavailable — reload alone still clears runtime state */
    }
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center p-6" role="alert">
        <div className="max-w-md rounded-2xl border border-red-900/50 bg-zinc-950 p-5 shadow-2xl">
          <h2 className="text-[15px] font-semibold text-zinc-100">The canvas hit an unexpected error</h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-400">
            Your work is still auto-saved, so nothing was lost. Try re-rendering first; if the error keeps coming
            back, reset the canvas to a clean slate.
          </p>
          <p className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 font-mono text-[10.5px] text-zinc-500">
            {error.message.slice(0, 180)}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={this.tryAgain}
              className="flex items-center gap-1.5 rounded-lg border border-sky-500/60 bg-sky-500/15 px-3 py-1.5 text-[12px] font-medium text-sky-200 transition-colors hover:bg-sky-500/25"
            >
              <RotateCcw size={13} /> Try again
            </button>
            <button
              type="button"
              onClick={this.resetCanvas}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
            >
              Reset canvas &amp; reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}

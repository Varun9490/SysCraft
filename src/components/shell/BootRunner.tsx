'use client';

import { useEffect } from "react";
import { runStartupMigrations } from "@/store/db";

/**
 * Client-only boot hook mounted once in the root layout.
 *
 * Runs the SysCraft startup sequence that must never execute during static
 * prerender: legacy `syscanvas`/`systemcanvas` localStorage + IndexedDB
 * migration into the `syscraft_*` namespace, then a polite request for
 * persistent storage so IndexedDB is not evicted between sessions.
 */
export function BootRunner() {
  useEffect(() => {
    void (async () => {
      try {
        await runStartupMigrations();
      } catch {
        /* migrations are best-effort; the app boots regardless */
      }
      try {
        if (typeof navigator !== "undefined" && navigator.storage?.persist) {
          const already = await navigator.storage.persisted?.();
          if (!already) {
            await navigator.storage.persist();
          }
        }
      } catch {
        /* persistence is optional */
      }
      try {
        // Offline-first app shell. Skipped in development so hot reloads are
        // never served stale assets from the worker cache.
        if (
          process.env.NODE_ENV === "production" &&
          typeof navigator !== "undefined" &&
          "serviceWorker" in navigator
        ) {
          await navigator.serviceWorker.register("/sw.js");
        }
      } catch {
        /* service workers unavailable (private mode, insecure context) */
      }
    })();
  }, []);

  return null;
}

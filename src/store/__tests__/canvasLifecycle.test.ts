import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CANVAS_PERSIST_VERSION,
  CANVAS_STORAGE_KEY,
  canvasStorageKeyForScope,
  flushPendingCanvasWrite,
  installCanvasPersistenceLifecycleFlush,
  readPersistedCanvas,
  setCanvasScope,
} from "../canvasPersistence";
import { useCanvasStore } from "../useCanvasStore";

type LifecycleListener = () => void;

const editedNode = {
  id: "n_lab_edit",
  type: "resource" as const,
  position: { x: 120, y: 160 },
  data: {
    resourceId: "redis_cache",
    label: "Edited before refresh",
    overrides: { cacheHitRate: 0.9 },
    semanticZoomLevel: 2 as const,
  },
};

describe("canvas lifecycle persistence", () => {
  const saved = new Map<string, string>();
  const listeners = new Map<string, Set<LifecycleListener>>();
  let uninstall: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    listeners.clear();
    useCanvasStore.getState().clearCanvas();
    flushPendingCanvasWrite();
    setCanvasScope("main");
    saved.clear();

    vi.stubGlobal("window", {
      addEventListener(type: string, listener: LifecycleListener) {
        const handlers = listeners.get(type) ?? new Set<LifecycleListener>();
        handlers.add(listener);
        listeners.set(type, handlers);
      },
      removeEventListener(type: string, listener: LifecycleListener) {
        listeners.get(type)?.delete(listener);
      },
      localStorage: {
        getItem: (name: string) => saved.get(name) ?? null,
        setItem: (name: string, value: string) => void saved.set(name, value),
        removeItem: (name: string) => void saved.delete(name),
      },
    });
    uninstall = installCanvasPersistenceLifecycleFlush();
  });

  afterEach(() => {
    flushPendingCanvasWrite();
    uninstall();
    setCanvasScope("main");
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it.each(["pagehide", "beforeunload"])(
    "flushes a lab edit on %s before the debounce and reloads it from the lab scope",
    (eventName) => {
      const scope = "lab:cache-aside";
      setCanvasScope(scope);
      useCanvasStore.getState().replaceTopology([editedNode], []);
      useCanvasStore.getState().setSceneName("Lab edit");
      const scopedKey = canvasStorageKeyForScope(scope);

      expect(saved.has(scopedKey)).toBe(false);
      expect(listeners.get(eventName)?.size).toBe(1);

      for (const listener of listeners.get(eventName) ?? []) listener();

      expect(saved.has(scopedKey)).toBe(true);
      expect(JSON.parse(saved.get(scopedKey) ?? "{}").version).toBe(CANVAS_PERSIST_VERSION);
      expect(readPersistedCanvas(scope)?.nodes[0]?.data.label).toBe("Edited before refresh");
      expect(readPersistedCanvas("main")).toBeUndefined();
      expect(saved.has(CANVAS_STORAGE_KEY)).toBe(false);
    },
  );
});

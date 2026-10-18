'use client';

import { useCallback, useEffect, useState } from "react";
import { Download, Plus, Sparkles, Trash2 } from "@/components/ui/icons";
import { BLUEPRINTS, BLUEPRINT_DIFFICULTY_TONE } from "@/data/blueprints";
import { useCanvasStore } from "@/store/useCanvasStore";
import { deleteBlueprint, listBlueprints, saveBlueprint, type BlueprintRecord } from "@/store/db";

/**
 * Blueprint gallery: 12 prebuilt topologies plus the user's own saved scenes.
 * Loading a prebuilt blueprint replaces the canvas in one click; saving
 * snapshots the current scene into IndexedDB via the existing blueprint store.
 */
export function BlueprintsPanel() {
  const [saved, setSaved] = useState<BlueprintRecord[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const nodeCount = useCanvasStore((s) => s.nodes.length);

  const refresh = useCallback(async () => {
    setSaved(await listBlueprints());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 2200);
  };

  const handleSave = async () => {
    if (nodeCount === 0) {
      flash("Canvas is empty — drop a few nodes first.");
      return;
    }
    const state = useCanvasStore.getState();
    const record = await saveBlueprint(state.sceneName || "Untitled system", state.serializeScene());
    if (record) {
      await refresh();
      flash(`Saved “${record.name}”.`);
    } else {
      flash("Could not save (storage unavailable).");
    }
  };

  const handleLoadSaved = async (id: string, name: string) => {
    const ok = await useCanvasStore.getState().loadBlueprintById(id);
    flash(ok ? `Loaded “${name}”.` : "That blueprint could not be loaded.");
  };

  const handleDelete = async (id: string) => {
    await deleteBlueprint(id);
    await refresh();
  };

  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-zinc-950/60">
      <div className="sticky top-0 z-10 border-b border-zinc-800/60 bg-zinc-950/90 px-3 py-2 backdrop-blur">
        <button
          type="button"
          onClick={() => void handleSave()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brass/40 bg-brass/10 px-3 py-2 text-[12.5px] font-medium text-content transition-colors hover:bg-brass/20"
        >
          <Plus size={13} weight="bold" />
          Save current canvas
        </button>
        {notice && <p className="mt-2 text-center text-[11px] text-zinc-400">{notice}</p>}
      </div>

      <div className="px-2 py-2">
        {saved.length > 0 && (
          <>
            <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
              Your saves
            </p>
            <div className="mb-3 space-y-2">
              {saved.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5"
                >
                  <button
                    type="button"
                    onClick={() => void handleLoadSaved(record.id, record.name)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-[12.5px] font-medium text-zinc-200">{record.name}</span>
                    <span className="block text-[10.5px] text-zinc-600">
                      {new Date(record.updatedAt).toLocaleString()}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(record.id)}
                    title="Delete save"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="flex items-center gap-1.5 px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
          <Sparkles size={11} />
          Prebuilt systems
        </p>
        <div className="space-y-2">
          {BLUEPRINTS.map((blueprint) => (
            <div
              key={blueprint.id}
              className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 transition-colors hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium text-zinc-200">{blueprint.name}</p>
                  <p className="mt-0.5 text-[10.5px] uppercase tracking-wider text-zinc-600">
                    {blueprint.category} · {blueprint.nodes.length} nodes
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${
                    BLUEPRINT_DIFFICULTY_TONE[blueprint.difficulty]
                  }`}
                >
                  {blueprint.difficulty}
                </span>
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-zinc-500">{blueprint.summary}</p>
              <button
                type="button"
                onClick={() => useCanvasStore.getState().loadBlueprintTemplate(blueprint)}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-[12px] font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
              >
                <Download size={12} />
                Load on canvas
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

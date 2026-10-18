'use client';

import { useEffect, useState } from "react";
import { Plus, RotateCcw, SlidersHorizontal, X } from "@/components/ui/icons";
import {
  ACCENT_THEMES,
  ACCENT_THEME_IDS,
  useCanvasPrefsStore,
  type CanvasPrefs,
  type EdgeRouting,
  type GridStyle,
} from "@/store/useCanvasPrefsStore";
import { useCanvasPresetStore } from "@/store/useCanvasPresetStore";

/**
 * Canvas preferences popover — render-level knobs (particles, grid, snapping,
 * edge routing, animations) persisted to `syscraft.canvas.prefs`.
 * Self-contained: renders its own gear trigger + panel.
 */

const EDGE_ROUTINGS: ReadonlyArray<{ id: EdgeRouting; label: string }> = [
  { id: "smoothstep", label: "Step" },
  { id: "bezier", label: "Curve" },
  { id: "straight", label: "Line" },
];

const GRID_STYLES: ReadonlyArray<{ id: GridStyle; label: string }> = [
  { id: "dots", label: "Dots" },
  { id: "lines", label: "Lines" },
  { id: "cross", label: "Cross" },
];

const SNAP_SIZES: readonly number[] = [8, 16, 24, 32];

function Pill({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
        active
          ? "border-brass/60 bg-brass/15 text-zinc-100"
          : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="text-[12px] text-zinc-200">{label}</p>
        {hint ? <p className="text-[10.5px] leading-snug text-zinc-500">{hint}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">{children}</div>
    </div>
  );
}

export function CanvasPreferences() {
  const [open, setOpen] = useState(false);
  // Whole-store subscription is fine here: this panel re-renders only when a
  // preference actually changes, never per simulation tick.
  const prefs = useCanvasPrefsStore();
  const setPref = useCanvasPrefsStore((s) => s.setPref);
  const resetPrefs = useCanvasPrefsStore((s) => s.resetPrefs);

  const presets = useCanvasPresetStore((s) => s.presets);
  const hydratePresets = useCanvasPresetStore((s) => s.hydrate);
  const savePreset = useCanvasPresetStore((s) => s.save);
  const applyPreset = useCanvasPresetStore((s) => s.apply);
  const removePreset = useCanvasPresetStore((s) => s.remove);
  const [presetName, setPresetName] = useState("");

  useEffect(() => {
    hydratePresets();
  }, [hydratePresets]);

  const toggle = (key: keyof CanvasPrefs) => setPref(key, !prefs[key] as never);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        title="Canvas preferences"
        aria-expanded={open}
        className={`flex h-8 items-center gap-1 rounded-md border px-2 text-xs transition-colors ${
          open ? "border-brass/60 bg-brass/10 text-brass" : "border-zinc-800 text-zinc-400 hover:bg-zinc-800"
        }`}
      >
        <SlidersHorizontal size={14} />
        Canvas
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close preferences"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
            tabIndex={-1}
          />
          <div className="absolute right-0 top-9 z-50 w-[300px] rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Canvas preferences
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                title="Close"
                className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <X size={12} />
              </button>
            </div>

            <div className="divide-y divide-zinc-800/70">
              <div>
                <Row label="Traffic particles" hint="60fps packet overlay along the edges">
                  <Pill active={prefs.showParticles} onClick={() => toggle("showParticles")}>
                    {prefs.showParticles ? "On" : "Off"}
                  </Pill>
                </Row>
                {prefs.showParticles && (
                  <div className="flex items-center gap-2 pb-2">
                    <span className="text-[10.5px] text-zinc-500">Density</span>
                    <input
                      type="range"
                      min={0.25}
                      max={2}
                      step={0.25}
                      value={prefs.particleDensity}
                      onChange={(event) => setPref("particleDensity", Number(event.target.value))}
                      className="h-1 flex-1 accent-brass"
                      aria-label="Particle density"
                    />
                    <span className="w-8 text-right text-[10.5px] tabular-nums text-zinc-400">
                      {prefs.particleDensity}×
                    </span>
                  </div>
                )}
              </div>

              <Row label="Minimap" hint="bottom-left overview of the whole system">
                <Pill active={prefs.showMinimap} onClick={() => toggle("showMinimap")}>
                  {prefs.showMinimap ? "On" : "Off"}
                </Pill>
              </Row>

              <div>
                <Row label="Grid" hint="background guides">
                  <Pill active={prefs.showGrid} onClick={() => toggle("showGrid")}>
                    {prefs.showGrid ? "On" : "Off"}
                  </Pill>
                </Row>
                {prefs.showGrid && (
                  <div className="flex items-center gap-1 pb-2">
                    {GRID_STYLES.map((style) => (
                      <Pill
                        key={style.id}
                        active={prefs.gridStyle === style.id}
                        onClick={() => setPref("gridStyle", style.id)}
                      >
                        {style.label}
                      </Pill>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Row label="Snap to grid" hint="align blocks while dragging">
                  <Pill active={prefs.snapToGrid} onClick={() => toggle("snapToGrid")}>
                    {prefs.snapToGrid ? "On" : "Off"}
                  </Pill>
                </Row>
                {prefs.snapToGrid && (
                  <div className="flex items-center gap-1 pb-2">
                    {SNAP_SIZES.map((size) => (
                      <Pill
                        key={size}
                        active={prefs.snapGridSize === size}
                        onClick={() => setPref("snapGridSize", size)}
                      >
                        {size}px
                      </Pill>
                    ))}
                  </div>
                )}
              </div>

              <Row label="Edge routing" hint="shape of every link on the canvas">
                {EDGE_ROUTINGS.map((routing) => (
                  <Pill
                    key={routing.id}
                    active={prefs.edgeStyle === routing.id}
                    onClick={() => setPref("edgeStyle", routing.id)}
                  >
                    {routing.label}
                  </Pill>
                ))}
              </Row>

              <Row label="Animations" hint="dash flow, node entrances, pulses">
                <Pill active={prefs.animations} onClick={() => toggle("animations")}>
                  {prefs.animations ? "On" : "Off"}
                </Pill>
              </Row>

              <div>
                <Row label="Accent theme" hint="recolours brass across the whole app">
                  <div className="flex items-center gap-1.5">
                    {ACCENT_THEME_IDS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPref("theme", id)}
                        title={ACCENT_THEMES[id].label}
                        aria-label={`${ACCENT_THEMES[id].label} accent`}
                        aria-pressed={prefs.theme === id}
                        className={`h-5 w-5 rounded-full ring-offset-2 ring-offset-zinc-950 transition-transform hover:scale-110 ${
                          prefs.theme === id ? "ring-2 ring-zinc-100" : "ring-1 ring-zinc-700"
                        }`}
                        style={{ backgroundColor: ACCENT_THEMES[id].hex }}
                      />
                    ))}
                  </div>
                </Row>
              </div>

              <div>
                <div className="flex items-center justify-between py-1.5">
                  <div className="min-w-0">
                    <p className="text-[12px] text-zinc-200">Presets</p>
                    <p className="text-[10.5px] leading-snug text-zinc-500">save + recall this whole setup</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pb-2">
                  <input
                    value={presetName}
                    onChange={(event) => setPresetName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && presetName.trim()) {
                        savePreset(presetName);
                        setPresetName("");
                      }
                    }}
                    placeholder="Preset name"
                    className="h-7 min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-[11.5px] text-zinc-200 placeholder:text-zinc-600"
                  />
                  <button
                    type="button"
                    disabled={!presetName.trim()}
                    onClick={() => {
                      savePreset(presetName);
                      setPresetName("");
                    }}
                    className="flex h-7 items-center gap-1 rounded-md border border-zinc-800 px-2 text-[11px] font-medium text-zinc-300 hover:border-brass/50 hover:text-brass disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus size={12} /> Save
                  </button>
                </div>
                {presets.length > 0 && (
                  <ul className="flex flex-col gap-1 pb-2">
                    {presets.map((preset) => (
                      <li key={preset.id} className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => applyPreset(preset.id)}
                          className="h-7 min-w-0 flex-1 truncate rounded-md border border-zinc-800 bg-zinc-900/60 px-2 text-left text-[11.5px] text-zinc-300 hover:border-brass/40 hover:text-zinc-100"
                          title={`Apply “${preset.name}”`}
                        >
                          {preset.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => removePreset(preset.id)}
                          aria-label={`Delete ${preset.name}`}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-800 text-zinc-500 hover:border-red-500/60 hover:text-red-300"
                        >
                          <X size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={resetPrefs}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-800 py-1.5 text-[11.5px] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
            >
              <RotateCcw size={12} />
              Reset to defaults
            </button>
          </div>
        </>
      )}
    </div>
  );
}

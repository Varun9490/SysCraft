'use client';

import { useEffect, useRef, useState } from "react";
import { Command } from "cmdk";
import {
  Activity,
  BookOpen,
  Cpu,
  FileCode2,
  FileText,
  FlaskConical,
  PenSquare,
  Play,
  Sparkles,
  Square,
  Swords,
  Volume2,
  VolumeX,
  Waves,
} from "lucide-react";
import { SEED_RESOURCES } from "@/data/seedResources";
import { SystemCanvas } from "./canvas/SystemCanvas";
import { InternalSimModal } from "./canvas/InternalSimModal";
import { DesignWorkbench } from "./workbench/DesignWorkbench";
import { VisualAlmanac } from "./encyclopedia/VisualAlmanac";
import { TelemetryDrawer } from "./telemetry/TelemetryDrawer";
import { TraceWaterfallModal } from "./telemetry/TraceWaterfallModal";
import { TimeTravelScrubber } from "./telemetry/TimeTravelScrubber";
import { PostMortemModal } from "./telemetry/PostMortemModal";
import { CustomResourceStudio } from "./studio/CustomResourceStudio";
import { IaCExportModal } from "./studio/IaCExportModal";
import { GuidedLabRunner } from "./games/GuidedLabRunner";
import { IncidentArena } from "./games/IncidentArena";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useSimStore } from "@/store/useSimStore";
import {
  isSoundEnabled,
  playErrorAlert,
  playToggle,
  setSoundEnabled,
  startLoadHum,
  stopLoadHum,
  updateLoadHum,
} from "@/engine/soundEngine";

/**
 * Unified SysCanvas workspace: infinite canvas + icon rail + every panel.
 * All heavy panels mount lazily on open; the canvas owns the simulation
 * lifecycle. Cmd+K command palette covers panel switching, resource
 * placement, and transport controls with instant keyboard navigation.
 */

type PanelId =
  | "workbench"
  | "almanac"
  | "telemetry"
  | "traces"
  | "postmortem"
  | "iac"
  | "studio"
  | "labs"
  | "arena"
  | "sims";

function SoundBridge() {
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

export default function WorkspaceShell() {
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName ?? "";
        if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
        event.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openPanel = (id: PanelId) => {
    setPanel((current) => (current === id && id !== "workbench" && id !== "telemetry" ? null : id));
    setPaletteOpen(false);
  };

  const toggleTransport = () => {
    const sim = useSimStore.getState();
    const willRun = !sim.running;
    if (willRun) {
      sim.startSimulation(() => useCanvasStore.getState().toGraphTopology());
    } else {
      sim.stopSimulation();
    }
    playToggle(willRun);
  };

  const rail: Array<{ id: PanelId | "transport" | "sound"; label: string; icon: typeof Play }> = [
    { id: "workbench", label: "Design workbench (6 steps)", icon: PenSquare },
    { id: "almanac", label: "Visual almanac (19 modules)", icon: BookOpen },
    { id: "telemetry", label: "Telemetry drawer", icon: Activity },
    { id: "traces", label: "Trace waterfall", icon: Waves },
    { id: "postmortem", label: "Post-mortem RCA", icon: FileText },
    { id: "iac", label: "IaC export", icon: FileCode2 },
    { id: "studio", label: "Custom resource studio", icon: Sparkles },
    { id: "labs", label: "Guided labs (16)", icon: FlaskConical },
    { id: "arena", label: "Incident arena (20 drills)", icon: Swords },
    { id: "sims", label: "Internal simulators", icon: Cpu },
  ];

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <SystemCanvas />
      <TimeTravelScrubber />
      <SoundBridge />

      <nav className="absolute left-3 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-1 rounded-xl border border-zinc-800 bg-zinc-950/90 p-1.5 shadow-2xl backdrop-blur" aria-label="Workspace panels">
        {rail.map((item) => {
          const Icon = item.icon;
          const active = panel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => openPanel(item.id as PanelId)}
              title={`${item.label} (Cmd+K)`}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                active ? "bg-sky-500 text-zinc-950" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              }`}
            >
              <Icon size={17} />
            </button>
          );
        })}
        <span className="mx-auto h-px w-6 bg-zinc-800" />
        <button
          onClick={toggleTransport}
          title="Run/stop simulation [space]"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
        >
          <TransportIcon />
        </button>
        <button
          onClick={() => {
            const next = !soundOn;
            setSoundOn(next);
            setSoundEnabled(next);
          }}
          title="Toggle procedural audio"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
      </nav>

      <DesignWorkbench open={panel === "workbench"} onClose={() => setPanel(null)} />
      <VisualAlmanac open={panel === "almanac"} onClose={() => setPanel(null)} />
      <TelemetryDrawer open={panel === "telemetry"} onClose={() => setPanel(null)} />
      <TraceWaterfallModal open={panel === "traces"} onClose={() => setPanel(null)} />
      <PostMortemModal open={panel === "postmortem"} onClose={() => setPanel(null)} />
      <IaCExportModal open={panel === "iac"} onClose={() => setPanel(null)} />
      <CustomResourceStudio open={panel === "studio"} onClose={() => setPanel(null)} />
      <GuidedLabRunner open={panel === "labs"} onClose={() => setPanel(null)} />
      <IncidentArena open={panel === "arena"} onClose={() => setPanel(null)} />
      <InternalSimModal open={panel === "sims"} onClose={() => setPanel(null)} />

      <Command.Dialog
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        label="SysCanvas command palette"
        className="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl"
        overlayClassName="fixed inset-0 z-50 bg-black/60"
      >
        <Command.Input
          placeholder="Type a command or resource… (Esc to close)"
          className="w-full border-b border-zinc-800 bg-transparent px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="p-3 text-xs text-zinc-500">No matching commands.</Command.Empty>
          <Command.Group heading="Panels" className="px-2 py-1 text-[11px] uppercase tracking-wider text-zinc-500">
            {(
              [
                ["workbench", "Open design workbench"],
                ["almanac", "Open visual almanac"],
                ["telemetry", "Open telemetry drawer"],
                ["traces", "Open trace waterfall"],
                ["postmortem", "Generate post-mortem"],
                ["iac", "Export infrastructure as code"],
                ["studio", "Open custom resource studio"],
                ["labs", "Open guided labs"],
                ["arena", "Open incident arena"],
                ["sims", "Open internal simulators"],
              ] as Array<[PanelId, string]>
            ).map(([id, label]) => (
              <PaletteItem key={id} label={label} onSelect={() => openPanel(id)} />
            ))}
            <PaletteItem label="Run / stop simulation" onSelect={toggleTransport} />
          </Command.Group>
          <Command.Group heading="Add resource" className="px-2 py-1 text-[11px] uppercase tracking-wider text-zinc-500">
            {SEED_RESOURCES.map((r) => (
              <PaletteItem
                key={r.id}
                label={`${r.name} · ${r.category}`}
                onSelect={() => {
                  const count = useCanvasStore.getState().nodes.length;
                  useCanvasStore
                    .getState()
                    .addNode(r.id, { x: 120 + (count % 8) * 48, y: 120 + (count % 8) * 36 }, r.name);
                  setPaletteOpen(false);
                }}
              />
            ))}
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </main>
  );
}

function TransportIcon() {
  const running = useSimStore((s) => s.running);
  return running ? <Square size={17} /> : <Play size={17} />;
}

function PaletteItem({ label, onSelect }: { label: string; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="cursor-pointer rounded-md px-2.5 py-1.5 text-xs text-zinc-200 data-[selected=true]:bg-zinc-800"
    >
      {label}
    </Command.Item>
  );
}

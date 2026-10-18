'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Cpu,
  FileCode2,
  FileText,
  FlaskConical,
  GraduationCap,
  Gauge,
  HelpCircle,
  Layers,
  ListChecks,
  Menu,
  Pause,
  PenSquare,
  Play,
  Search,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Volume2,
  VolumeX,
  Waves,
} from "@/components/ui/icons";
import { SysCraftCanvas } from "@/components/canvas/SysCraftCanvas";
import { ConnectionInspector } from "@/components/canvas/ConnectionInspector";
import { CostAnalysisPanel } from "@/components/canvas/CostAnalysisPanel";
import { InternalSimModal } from "@/components/canvas/InternalSimModal";
import { NodeInspector } from "@/components/canvas/NodeInspector";
import { RoomSession } from "@/components/room/RoomSession";
import { IncidentArena } from "@/components/games/IncidentArena";
import { LogoMark } from "@/components/nav/SiteHeader";
import { BlueprintsPanel } from "@/components/shell/BlueprintsPanel";
import { ResourcesPanel } from "@/components/shell/ResourcesPanel";
import { SoundBridge } from "@/components/shell/SoundBridge";
import { IaCExportModal } from "@/components/studio/IaCExportModal";
import { CustomResourceStudio } from "@/components/studio/CustomResourceStudio";
import { PostMortemModal } from "@/components/telemetry/PostMortemModal";
import { TelemetryDrawer } from "@/components/telemetry/TelemetryDrawer";
import { TimeTravelScrubber } from "@/components/telemetry/TimeTravelScrubber";
import { TraceWaterfallModal } from "@/components/telemetry/TraceWaterfallModal";
import { DesignWorkbench } from "@/components/workbench/DesignWorkbench";
import { ENCYCLOPEDIA_MODULES } from "@/data/encyclopediaData";
import { SEED_RESOURCES } from "@/data/seedResources";
import { isSoundEnabled, playToggle, setSoundEnabled } from "@/engine/soundEngine";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useSimStore } from "@/store/useSimStore";

type PanelId =
  | "workbench"
  | "telemetry"
  | "traces"
  | "postmortem"
  | "iac"
  | "studio"
  | "arena"
  | "sims"
  | "costs";

type TabId = "resources" | "blueprints" | "learn" | "tools";

const DIFFICULTY_TONE: Record<string, string> = {
  foundations: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  intermediate: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  advanced: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

function downloadTextFile(filename: string, text: string, mime = "application/json"): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function slugifySceneName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untitled";
}

function SimMetrics() {
  const running = useSimStore((s) => s.running);
  const rps = useSimStore((s) => s.globalRps);
  const p99 = useSimStore((s) => s.globalP99Ms);
  const errorRate = useSimStore((s) => s.globalErrorRate);
  const cost = useSimStore((s) => s.totalCostPerHourUsd);

  const errorTone = errorRate >= 0.05 ? "text-red-400" : errorRate >= 0.01 ? "text-amber-300" : "text-emerald-300";

  return (
    <div className="hidden items-center gap-4 text-[12px] tabular-nums text-zinc-400 xl:flex">
      <span className="inline-flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${running ? "animate-pulse bg-emerald-400" : "bg-zinc-600"}`} />
        {running ? "live" : "paused"}
      </span>
      <span>
        <span className="text-zinc-500">rps </span>
        {rps >= 1000 ? `${(rps / 1000).toFixed(1)}k` : rps.toFixed(0)}
      </span>
      <span>
        <span className="text-zinc-500">p99 </span>
        {p99.toFixed(0)}ms
      </span>
      <span className={errorTone}>
        <span className="text-zinc-500">err </span>
        {(errorRate * 100).toFixed(2)}%
      </span>
      <span>
        <span className="text-zinc-500">cost </span>
        ${cost.toFixed(2)}/h
      </span>
    </div>
  );
}

function LearnPanel({ onOpenModule }: { onOpenModule: (moduleId: string) => void }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ENCYCLOPEDIA_MODULES;
    return ENCYCLOPEDIA_MODULES.filter(
      (m) => m.title.toLowerCase().includes(q) || m.summary.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-zinc-950/60">
      <div className="sticky top-0 z-10 border-b border-zinc-800/60 bg-zinc-950/90 px-3 py-2 backdrop-blur">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 19 concept modules…"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/70 py-2 pl-8 pr-3 text-[13px] text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-600"
          />
        </div>
      </div>

      <div className="px-2 py-2">
        {filtered.map((module) => (
          <button
            key={module.id}
            type="button"
            onClick={() => onOpenModule(module.id)}
            className="group flex w-full flex-col gap-1 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-zinc-800/70"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] font-medium text-zinc-200">{module.title}</span>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${
                  DIFFICULTY_TONE[module.difficulty] ?? DIFFICULTY_TONE.foundations
                }`}
              >
                {module.difficulty}
              </span>
            </span>
            <span className="line-clamp-2 text-[11.5px] leading-relaxed text-zinc-500">{module.summary}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-3 py-6 text-center text-[12px] text-zinc-500">No modules match “{query}”.</p>
        )}
      </div>

      <div className="sticky bottom-0 z-10 border-t border-zinc-800/70 bg-zinc-950/90 p-2 backdrop-blur">
        <Link
          href="/learn"
          className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-zinc-800/70"
        >
          <BookOpen size={14} className="text-violet-300" />
          <span className="flex-1 text-[12.5px] text-zinc-300">Follow the learning path</span>
          <ArrowRight size={13} className="text-zinc-600 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/labs"
          className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-zinc-800/70"
        >
          <FlaskConical size={14} className="text-amber-300" />
          <span className="flex-1 text-[12.5px] text-zinc-300">Practice in 16 labs</span>
          <ArrowRight size={13} className="text-zinc-600 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

const TOOL_PANELS: Array<{
  id: PanelId;
  label: string;
  description: string;
  Icon: typeof Activity;
}> = [
  { id: "workbench", label: "Design Workbench", description: "6-step interview flow", Icon: PenSquare },
  { id: "telemetry", label: "Telemetry", description: "Live node metrics & SLOs", Icon: Activity },
  { id: "traces", label: "Trace Waterfall", description: "OTel-style request spans", Icon: Waves },
  { id: "postmortem", label: "Post-mortem", description: "RCA report generator", Icon: FileText },
  { id: "iac", label: "IaC Export", description: "Terraform · Docker · K8s", Icon: FileCode2 },
  { id: "studio", label: "Custom Studio", description: "Design your own primitives", Icon: Sparkles },
  { id: "arena", label: "Incident Arena", description: "20 timed chaos drills", Icon: Swords },
  { id: "sims", label: "Internal Sims", description: "B-Tree · Raft · hashing · tokens", Icon: Cpu },
  { id: "costs", label: "Cost Analysis", description: "Your price × replicas, live idle spend", Icon: Gauge },
];

function ToolsPanel({ onOpenPanel }: { onOpenPanel: (id: PanelId) => void }) {
  return (
    <div className="h-full overflow-y-auto overscroll-contain p-3">
      <div className="grid grid-cols-2 gap-2">
        {TOOL_PANELS.map(({ id, label, description, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onOpenPanel(id)}
            className="flex flex-col gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800/60"
          >
            <Icon size={16} className="text-sky-300" />
            <span>
              <span className="block text-[12.5px] font-medium text-zinc-200">{label}</span>
              <span className="mt-0.5 block text-[10.5px] leading-relaxed text-zinc-500">{description}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-4 px-1 text-[10.5px] uppercase tracking-[0.14em] text-zinc-600">Canvas tools</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => useCanvasStore.getState().setDoctorOpen(true)}
          className="flex flex-col gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 text-left transition-colors hover:border-amber-500/40 hover:bg-zinc-800/60"
        >
          <HelpCircle size={16} className="text-amber-300" />
          <span>
            <span className="block text-[12.5px] font-medium text-zinc-200">Design Doctor</span>
            <span className="mt-0.5 block text-[10.5px] leading-relaxed text-zinc-500">14 static architecture rules [d]</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => useCanvasStore.getState().setOutlineMode(true)}
          className="flex flex-col gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 text-left transition-colors hover:border-violet-500/40 hover:bg-zinc-800/60"
        >
          <ListChecks size={16} className="text-violet-300" />
          <span>
            <span className="block text-[12.5px] font-medium text-zinc-200">Outline Mode</span>
            <span className="mt-0.5 block text-[10.5px] leading-relaxed text-zinc-500">Keyboard & screen-reader editor [o]</span>
          </span>
        </button>
      </div>
      <p className="mt-4 px-1 text-[10.5px] uppercase tracking-[0.14em] text-zinc-600">Learn & practice</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Link
          href="/labs"
          className="flex flex-col gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-800/60"
        >
          <FlaskConical size={16} className="text-amber-300" />
          <span className="text-[12.5px] font-medium text-zinc-200">Guided Labs</span>
        </Link>
        <Link
          href="/learn"
          className="flex flex-col gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-800/60"
        >
          <BookOpen size={16} className="text-violet-300" />
          <span className="text-[12.5px] font-medium text-zinc-200">Learning Path</span>
        </Link>
        <Link
          href="/practice"
          className="flex flex-col gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-800/60"
        >
          <GraduationCap size={16} className="text-emerald-300" />
          <span className="text-[12.5px] font-medium text-zinc-200">Spaced Review</span>
        </Link>
        <Link
          href="/play"
          className="flex flex-col gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-800/60"
        >
          <Swords size={16} className="text-sky-300" />
          <span className="text-[12.5px] font-medium text-zinc-200">Play Modes</span>
        </Link>
      </div>
    </div>
  );
}

export default function CleanWorkspaceShell() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("resources");
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [railOpen, setRailOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);

  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  useEffect(() => {
    if (selectedNodeId) setInspectorOpen(true);
  }, [selectedNodeId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName ?? "";
        if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
        event.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName ?? "";
        if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
        event.preventDefault();
        setRailOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openPanel = (id: PanelId) => {
    setPanel((current) => (current === id ? null : id));
    setPaletteOpen(false);
  };

  useEffect(() => {
    const onOpenPanel = (event: Event) => {
      const detail = (event as CustomEvent<{ panel?: PanelId }>).detail;
      if (detail?.panel) {
        setPanel(detail.panel);
        setPaletteOpen(false);
      }
    };
    window.addEventListener("syscraft:open-panel", onOpenPanel);
    return () => window.removeEventListener("syscraft:open-panel", onOpenPanel);
  }, []);

  const openModule = (moduleId: string) => {
    router.push(`/wiki/${moduleId}`);
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

  const running = useSimStore((s) => s.running);

  const tabs: Array<{ id: TabId; label: string; Icon: typeof Activity }> = [
    { id: "resources", label: "Resources", Icon: Layers },
    { id: "blueprints", label: "Blueprints", Icon: Sparkles },
    { id: "learn", label: "Learn", Icon: BookOpen },
    { id: "tools", label: "Tools", Icon: Cpu },
  ];

  return (
    <main className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <SoundBridge />

      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-800/80 bg-zinc-950/90 px-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 text-zinc-200 transition-colors hover:text-zinc-50">
          <LogoMark size={20} />
          <span className="text-[13px] font-semibold tracking-tight">
            Sys<span className="text-sky-400">Craft</span>
          </span>
        </Link>
        <span className="h-4 w-px bg-zinc-800" />
        <span className="hidden text-[13px] text-zinc-400 sm:inline">Freeform Workspace</span>

        <button
          type="button"
          onClick={() => setRailOpen((o) => !o)}
          title={railOpen ? "Hide palette [Ctrl+B]" : "Show palette [Ctrl+B]"}
          aria-expanded={railOpen}
          className={`ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
            railOpen ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" : "bg-zinc-800/80 text-zinc-200"
          }`}
        >
          <Menu size={15} />
        </button>

        <div className="ml-auto flex items-center gap-2">
          {selectedNodeId && (
            <button
              type="button"
              onClick={() => setInspectorOpen((o) => !o)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] transition-colors ${
                inspectorOpen
                  ? "border-brass/40 bg-brass/10 text-content"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
              }`}
              title="Toggle node inspector"
            >
              <SlidersHorizontal size={13} />
              Inspector
            </button>
          )}

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-[12px] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 lg:flex"
          >
            <Search size={13} />
            Search…
            <kbd className="rounded border border-zinc-700 bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-400">
              Ctrl K
            </kbd>
          </button>

          <SimMetrics />

          <button
            type="button"
            onClick={toggleTransport}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              running
                ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                : "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
            }`}
            title="Run/stop simulation [space]"
          >
            {running ? <Pause size={14} /> : <Play size={14} />}
            {running ? "Pause" : "Run"}
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              setSoundEnabled(next);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            title="Toggle procedural audio"
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <button
            type="button"
            onClick={() => setPanel("iac")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-1.5 text-[12.5px] font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
          >
            <FileCode2 size={13} />
            Export
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <motion.aside
          initial={false}
          animate={{ width: railOpen ? 300 : 0, opacity: railOpen ? 1 : 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex shrink-0 flex-col overflow-hidden border-r border-zinc-800/80 bg-zinc-950"
          aria-hidden={!railOpen}
          aria-label="Workspace palette"
        >
          <div className="flex h-full w-[300px] min-h-0 flex-col">
            <div className="flex gap-1 overflow-x-auto border-b border-zinc-800/80 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:h-0">
              {tabs.map(({ id, label, Icon }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className="relative flex min-w-[72px] flex-none items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors active:scale-[0.97] sm:min-w-[78px]"
                  >
                    {active && (
                      <motion.span
                        layoutId="ws-tab-pill"
                        className="absolute inset-0 rounded-lg bg-gradient-to-r from-brass to-brass-bright"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className={`relative inline-flex items-center gap-1.5 ${active ? "text-zinc-950" : "text-zinc-400 hover:text-zinc-200"}`}>
                      <Icon size={13} />
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                >
                  {tab === "resources" && <ResourcesPanel />}
                  {tab === "blueprints" && <BlueprintsPanel />}
                  {tab === "learn" && <LearnPanel onOpenModule={openModule} />}
                  {tab === "tools" && <ToolsPanel onOpenPanel={openPanel} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.aside>

        <AnimatePresence>
          {!railOpen && (
            <motion.button
              key="rail-restore"
              type="button"
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ duration: 0.24, delay: 0.12 }}
              onClick={() => setRailOpen(true)}
              title="Show palette [Ctrl+B]"
              aria-label="Show workspace palette"
              className="absolute left-1.5 top-3 z-40 flex h-9 items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/90 px-2.5 text-[12px] font-medium text-zinc-300 shadow-xl backdrop-blur transition-colors hover:border-zinc-600 hover:text-zinc-100"
            >
              <Menu size={14} /> Palette
            </motion.button>
          )}
        </AnimatePresence>

        <div className="relative min-w-0 flex-1">
          <SysCraftCanvas className="h-full w-full" />
          <ConnectionInspector />
          <RoomSession />
          <TimeTravelScrubber />
        </div>

        {selectedNodeId && inspectorOpen && (
          <aside className="hidden w-[300px] min-h-0 shrink-0 overflow-hidden border-l border-zinc-800/80 bg-zinc-950 lg:block">
            <NodeInspector onClose={() => setInspectorOpen(false)} />
          </aside>
        )}
      </div>

      <DesignWorkbench open={panel === "workbench"} onClose={() => setPanel(null)} />
      <TelemetryDrawer open={panel === "telemetry"} onClose={() => setPanel(null)} />
      <TraceWaterfallModal open={panel === "traces"} onClose={() => setPanel(null)} />
      <PostMortemModal open={panel === "postmortem"} onClose={() => setPanel(null)} />
      <IaCExportModal open={panel === "iac"} onClose={() => setPanel(null)} />
      <CustomResourceStudio open={panel === "studio"} onClose={() => setPanel(null)} />
      <IncidentArena open={panel === "arena"} onClose={() => setPanel(null)} />
      <InternalSimModal open={panel === "sims"} onClose={() => setPanel(null)} />
      <CostAnalysisPanel open={panel === "costs"} onClose={() => setPanel(null)} />

      <Command.Dialog
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        label="SysCraft command palette"
        className="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl"
        overlayClassName="fixed inset-0 z-50 bg-ink/70"
      >
        <Command.Input
          placeholder="Type a command or resource… (Esc to close)"
          className="w-full border-b border-zinc-800 bg-transparent px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="p-3 text-xs text-zinc-500">No matching commands.</Command.Empty>
          <Command.Group heading="Panels" className="px-2 py-1 text-[11px] uppercase tracking-wider text-zinc-500">
            {TOOL_PANELS.map(({ id, label }) => (
              <PaletteItem key={id} label={`Open ${label}`} onSelect={() => openPanel(id)} />
            ))}
            <PaletteItem label="Run / stop simulation" onSelect={toggleTransport} />
          </Command.Group>
          <Command.Group heading="Canvas tools" className="px-2 py-1 text-[11px] uppercase tracking-wider text-zinc-500">
            <PaletteItem
              label="Design Doctor — audit the architecture (14 rules)"
              onSelect={() => {
                useCanvasStore.getState().setDoctorOpen(true);
                setPaletteOpen(false);
              }}
            />
            <PaletteItem
              label="Outline Mode — keyboard & screen-reader editor"
              onSelect={() => {
                useCanvasStore.getState().setOutlineMode(true);
                setPaletteOpen(false);
              }}
            />
            <PaletteItem
              label="K8s View — expand selected service into pods"
              onSelect={() => {
                const state = useCanvasStore.getState();
                const candidate =
                  state.nodes.find((n) => n.id === state.selectedNodeId) ??
                  state.nodes.find((n) => ["rest_service", "serverless_function", "background_worker"].includes(String(n.data.resourceId)));
                if (candidate) {
                  state.expandToKubernetes(candidate.id);
                }
                setPaletteOpen(false);
              }}
            />
            <PaletteItem
              label="Auto-layout canvas (dagre)"
              onSelect={() => {
                window.dispatchEvent(new CustomEvent("syscraft:auto-layout"));
                setPaletteOpen(false);
              }}
            />
            <PaletteItem
              label="Export design (.syscraft.json)"
              onSelect={() => {
                const state = useCanvasStore.getState();
                downloadTextFile(`syscraft-${slugifySceneName(state.sceneName)}.syscraft.json`, state.exportDesignJson());
                setPaletteOpen(false);
              }}
            />
          </Command.Group>
          <Command.Group heading="Go to" className="px-2 py-1 text-[11px] uppercase tracking-wider text-zinc-500">
            {[
              ["Spaced review queue", "/practice"],
              ["Play modes", "/play"],
              ["Bottleneck flowchart", "/flowchart"],
              ["Encyclopedia (wiki)", "/wiki"],
              ["Live collaboration room", "/room"],
              ["Progress & mastery", "/progress"],
              ["Settings & data control", "/settings"],
            ].map(([label, href]) => (
              <PaletteItem
                key={href}
                label={label}
                onSelect={() => {
                  window.location.href = href;
                }}
              />
            ))}
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

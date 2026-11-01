'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  Download,
  FileJson,
  Globe2,
  Layers,
  Plus,
  Search,
  Shield,
  Sparkles,
  Trash2,
  Wallet,
  Waves,
  Wrench,
  Zap,
} from "@/components/ui/icons";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { GlowCard } from "@/components/ui/GlowCard";
import {
  BUILTIN_PLUGINS,
  DECLARATIVE_RULE_KINDS,
  PLUGIN_CATEGORIES,
  getPrimitiveOptions,
  isValidPrimitiveId,
  serializePlugin,
  type DeclarativePluginRule,
  type DeclarativeRuleKind,
  type PluginCategory,
  type SysCraftPlugin,
} from "@/data/pluginsCatalog";
import { useCanvasStore } from "@/store/useCanvasStore";
import { usePluginStore } from "@/store/usePluginStore";
import type { DoctorFinding, DoctorSeverity } from "@/engine/designDoctor";

/**
 * SysCraft Architecture Plugin & Extension Hub.
 *
 * Three surfaces in one route: a live audit of the current canvas against every
 * enabled pack, a filterable grid of installable packs, and a studio that turns
 * a form (or a pasted JSON manifest) into a custom declarative plugin. All rule
 * evaluation is delegated to `runDeclarativePluginRules` through the store, so
 * this page never re-implements audit logic.
 */

type CategoryFilter = PluginCategory | "All";

const CATEGORY_ICONS: Record<PluginCategory, typeof Shield> = {
  AWS: Globe2,
  Cloudflare: Waves,
  Kubernetes: Layers,
  "Security & Compliance": Shield,
  FinOps: Wallet,
  "AI & LLMs": BrainCircuit,
  Custom: Wrench,
};

const CATEGORY_TINT: Record<PluginCategory, string> = {
  AWS: "#CDA86A",
  Cloudflare: "#DBBB86",
  Kubernetes: "#93B27C",
  "Security & Compliance": "#E3A19C",
  FinOps: "#84A0B2",
  "AI & LLMs": "#AC8CA8",
  Custom: "#A8A296",
};

const SEVERITY_STYLE: Record<DoctorSeverity, { label: string; chip: string; dot: string }> = {
  critical: { label: "Critical", chip: "border-red-500/40 bg-red-500/10 text-red-300", dot: "bg-red-400" },
  warning: { label: "Warning", chip: "border-amber-500/40 bg-amber-500/10 text-amber-300", dot: "bg-amber-400" },
  info: { label: "Info", chip: "border-sky-500/40 bg-sky-500/10 text-sky-300", dot: "bg-sky-400" },
};

const RULE_KIND_LABEL: Record<DeclarativeRuleKind, string> = {
  require_primitive_when_present: "Companion required",
  forbid_direct_edge: "Forbidden connection",
  max_node_cost: "Cost ceiling",
  require_multi_az_category: "Multi-AZ required",
};

const PRIMITIVE_OPTIONS = getPrimitiveOptions();
const PRIMITIVE_NAME_BY_ID = new Map(PRIMITIVE_OPTIONS.map((option) => [option.id, option.name]));

const FILTERS: CategoryFilter[] = ["All", ...PLUGIN_CATEGORIES];

const EMPTY_EXAMPLE_MANIFEST = `{
  "id": "custom-queue-hygiene",
  "name": "Queue Hygiene Pack",
  "version": "1.0.0",
  "author": "You",
  "category": "Custom",
  "summary": "Every broker needs a dead-letter destination and a consumer.",
  "installedByDefault": false,
  "tags": ["messaging"],
  "rules": [
    {
      "id": "broker-needs-stream-processor",
      "title": "Broker has no processor draining it",
      "severity": "warning",
      "kind": "require_primitive_when_present",
      "whenResourceIds": ["message_queue", "kafka_stream"],
      "requiredResourceIds": ["stream_processor", "background_worker"],
      "detail": "A broker with no consumer accumulates depth forever.",
      "suggestion": "Attach a consumer pool and a dead-letter queue.",
      "conceptId": "message-queues"
    }
  ],
  "recommendedPrimitives": ["message_queue", "stream_processor"]
}`;

function splitFindingTitle(title: string): { pluginName: string; text: string } {
  const match = /^\[Plugin: ([^\]]+)\]\s*(.*)$/.exec(title);
  if (!match) return { pluginName: "", text: title };
  return { pluginName: match[1] ?? "", text: match[2] ?? title };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function primitiveName(id: string): string {
  return PRIMITIVE_NAME_BY_ID.get(id) ?? id;
}

export function PluginsPageContent() {
  const router = useRouter();
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);

  const enabledPluginIds = usePluginStore((state) => state.enabledPluginIds);
  const customPlugins = usePluginStore((state) => state.customPlugins);
  const hydratePlugins = usePluginStore((state) => state.hydratePlugins);
  const togglePlugin = usePluginStore((state) => state.togglePlugin);
  const addCustomPlugin = usePluginStore((state) => state.addCustomPlugin);
  const removeCustomPlugin = usePluginStore((state) => state.removeCustomPlugin);
  const importPluginJson = usePluginStore((state) => state.importPluginJson);

  const [category, setCategory] = useState<CategoryFilter>("All");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    hydratePlugins();
    // Restore the user's persisted topology so the audit banner reports on the
    // design they actually saved, not on an empty first render.
    void Promise.resolve(useCanvasStore.persist.rehydrate()).catch(() => undefined);
  }, [hydratePlugins]);

  const allPlugins = useMemo<SysCraftPlugin[]>(
    () => [...BUILTIN_PLUGINS, ...customPlugins],
    [customPlugins],
  );

  const enabledSet = useMemo(() => new Set(enabledPluginIds), [enabledPluginIds]);

  const findings = useMemo<DoctorFinding[]>(() => {
    const doctorNodes = nodes.map((node) => ({
      id: node.id,
      resourceId: String(node.data.resourceId ?? "rest_service"),
      label: String(node.data.label ?? node.id),
      overrides: node.data.overrides ?? {},
    }));
    const doctorEdges = edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target }));
    return usePluginStore.getState().evaluateActivePlugins(doctorNodes, doctorEdges);
  }, [nodes, edges, enabledPluginIds, customPlugins]);

  const severityCounts = useMemo(() => {
    const counts: Record<DoctorSeverity, number> = { critical: 0, warning: 0, info: 0 };
    for (const finding of findings) counts[finding.severity] += 1;
    return counts;
  }, [findings]);

  const auditByPlugin = useMemo(() => {
    const map = new Map<string, number>();
    for (const finding of findings) {
      const { pluginName } = splitFindingTitle(finding.title);
      map.set(pluginName, (map.get(pluginName) ?? 0) + 1);
    }
    return map;
  }, [findings]);

  const visiblePlugins = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return allPlugins.filter((plugin) => {
      if (category !== "All" && plugin.category !== category) return false;
      if (!trimmed) return true;
      const haystack = [
        plugin.name,
        plugin.summary,
        plugin.author,
        plugin.category,
        ...plugin.tags,
        ...plugin.rules.map((rule) => rule.title),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(trimmed);
    });
  }, [allPlugins, category, query]);

  const activePluginCount = enabledPluginIds.filter((id) =>
    allPlugins.some((plugin) => plugin.id === id),
  ).length;

  const injectPack = (plugin: SysCraftPlugin, navigate: boolean) => {
    const store = useCanvasStore.getState();
    const resourceIds = plugin.recommendedPrimitives.filter(isValidPrimitiveId);
    if (resourceIds.length === 0) {
      setNotice(`${plugin.name} does not recommend any canvas blocks.`);
      return;
    }
    const start = store.nodes.length;
    resourceIds.forEach((resourceId, index) => {
      const slot = start + index;
      store.addNode(resourceId, {
        x: 80 + (slot % 4) * 280,
        y: 120 + Math.floor(slot / 4) * 170,
      });
    });
    setNotice(
      `Injected ${resourceIds.length} recommended blocks from ${plugin.name} onto the canvas.`,
    );
    if (navigate) router.push("/canvas");
  };

  const exportPlugin = (plugin: SysCraftPlugin) => {
    const blob = new Blob([serializePlugin(plugin)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${plugin.id}.plugin.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice(`Exported ${plugin.name} as ${plugin.id}.plugin.json.`);
  };

  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
        <div className="line-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_0%,black,transparent)]" />
      </div>

      <section className="section-container relative pb-8 pt-16 md:pt-24">
        <AnimatedSection>
          <span className="eyebrow">
            <Sparkles size={12} /> Plugin hub
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tighter text-content md:text-5xl">
            Extend the canvas
            <br />
            with architecture packs
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-content-secondary">
            Packs are declarative guardrails: each rule states when it fires and what it expects to see, then runs
            against your live topology. Enable a pack, inject its recommended blocks, and the Design Doctor grows new
            checks without executing a line of third-party code.
          </p>
        </AnimatedSection>
      </section>

      {/* Live canvas audit banner */}
      <section className="section-container pb-10">
        <AnimatedSection delay={0.08}>
          <div className="relative overflow-hidden rounded-2xl border border-brass/30 bg-zinc-900/60 p-5 shadow-card md:p-6">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                background:
                  "radial-gradient(560px circle at 12% 0%, rgba(205,168,106,0.14), transparent 60%)",
              }}
            />
            <div className="relative grid gap-5 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-8">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-brass/40 bg-brass/10">
                    <Zap size={15} className="text-brass-bright" />
                  </span>
                  <h2 className="text-[15px] font-semibold tracking-tight text-content">Live canvas plugin audit</h2>
                  <span className="rounded-full border border-zinc-700/70 bg-zinc-900/70 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-content-tertiary">
                    {nodes.length === 0 ? "Empty canvas" : `${nodes.length} blocks · ${edges.length} links`}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
                  <div>
                    <div className="text-3xl font-semibold tabular-nums tracking-tight text-content">
                      {activePluginCount}
                    </div>
                    <div className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-content-tertiary">
                      Active packs
                    </div>
                  </div>
                  <div>
                    <div
                      className={`text-3xl font-semibold tabular-nums tracking-tight ${
                        findings.length > 0 ? "text-amber-300" : "text-emerald-300"
                      }`}
                    >
                      {findings.length}
                    </div>
                    <div className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-content-tertiary">
                      Findings caught
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(Object.keys(severityCounts) as DoctorSeverity[]).map((severity) => (
                      <span
                        key={severity}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tabular-nums ${SEVERITY_STYLE[severity].chip}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_STYLE[severity].dot}`} />
                        {severityCounts[severity]} {SEVERITY_STYLE[severity].label.toLowerCase()}
                      </span>
                    ))}
                  </div>
                </div>

                {findings.length > 0 ? (
                  <ul className="mt-4 space-y-1.5">
                    {findings.slice(0, 3).map((finding, index) => {
                      const { pluginName, text } = splitFindingTitle(finding.title);
                      return (
                        <li key={`${finding.ruleId}-${index}`} className="flex items-start gap-2 text-[12.5px]">
                          <span
                            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_STYLE[finding.severity].dot}`}
                          />
                          <span className="text-content-secondary">
                            <span className="font-medium text-content">{text}</span>
                            {pluginName ? <span className="text-content-tertiary"> · {pluginName}</span> : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-4 flex items-center gap-2 text-[12.5px] text-emerald-300/90">
                    <CheckCircle2 size={14} />
                    {nodes.length === 0
                      ? "No canvas yet — inject a pack below to seed a topology worth auditing."
                      : "Every enabled pack is satisfied by the current topology."}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 lg:col-span-4 lg:items-end">
                <Link
                  href="/canvas"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-2 text-[13px] font-medium text-content transition-colors hover:border-brass/50 hover:text-brass-bright"
                >
                  Open the canvas <ArrowRight size={13} />
                </Link>
                <Link
                  href="/workspace"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent px-4 py-2 text-[12.5px] text-content-tertiary transition-colors hover:text-content"
                >
                  Open the workspace <ArrowRight size={12} />
                </Link>
                <p className="max-w-[15rem] text-right text-[11px] leading-relaxed text-content-tertiary">
                  Findings are recomputed from the live topology on every edit — nothing is uploaded.
                </p>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Filter + search */}
      <section className="section-container pb-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((option) => {
              const active = category === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCategory(option)}
                  aria-pressed={active}
                  className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                    active
                      ? "border-brass/60 bg-brass/15 text-brass-bright"
                      : "border-zinc-800 bg-zinc-900/50 text-content-secondary hover:border-zinc-700 hover:text-content"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          <label className="relative flex w-full items-center md:w-72">
            <Search size={14} className="pointer-events-none absolute left-3 text-content-tertiary" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search packs, tags, rules…"
              aria-label="Search plugins"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 py-2 pl-9 pr-3 text-[13px] text-content placeholder:text-content-tertiary focus:border-brass/50 focus:outline-none"
            />
          </label>
        </div>

        {notice ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-brass/30 bg-brass/10 px-3 py-2 text-[12.5px] text-brass-bright">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
            <span className="flex-1">{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-brass-bright/70 transition-colors hover:text-brass-bright"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ) : null}
      </section>

      {/* Plugin cards */}
      <section className="section-container pb-16">
        {visiblePlugins.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-14 text-center">
            <p className="text-[14px] font-medium text-content">No packs match that filter.</p>
            <p className="mt-1 text-[12.5px] text-content-tertiary">
              Clear the search or switch category — or build your own pack in the studio below.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {visiblePlugins.map((plugin) => {
              const enabled = enabledSet.has(plugin.id);
              const Icon = CATEGORY_ICONS[plugin.category] ?? Wrench;
              const tint = CATEGORY_TINT[plugin.category] ?? "#A8A296";
              const isCustom = plugin.category === "Custom" && !BUILTIN_PLUGINS.some((b) => b.id === plugin.id);
              const caught = auditByPlugin.get(plugin.name) ?? 0;
              return (
                <GlowCard key={plugin.id} className="h-full" glowColor={`${tint}22`}>
                  <div className="flex h-full flex-col p-5">
                    <div className="flex items-start gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                        style={{ borderColor: `${tint}55`, backgroundColor: `${tint}18`, color: tint }}
                      >
                        <Icon size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[15px] font-semibold tracking-tight text-content">{plugin.name}</h3>
                          <span className="rounded border border-zinc-700/70 bg-zinc-900/70 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-content-tertiary">
                            v{plugin.version}
                          </span>
                          {isCustom ? (
                            <span className="rounded border border-zinc-700/70 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-content-tertiary">
                              Custom
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-content-tertiary">
                          <span style={{ color: tint }}>{plugin.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{plugin.author}</span>
                          {caught > 0 ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 text-amber-300">
                                <AlertTriangle size={10} /> {caught} on this canvas
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        aria-label={`${enabled ? "Disable" : "Enable"} ${plugin.name}`}
                        onClick={() => togglePlugin(plugin.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                          enabled ? "border-brass/60 bg-brass/30" : "border-zinc-700 bg-zinc-800"
                        }`}
                      >
                        <span
                          className={`absolute left-0.5 h-[18px] w-[18px] rounded-full transition-transform ${
                            enabled ? "translate-x-5 bg-brass-bright" : "translate-x-0 bg-zinc-500"
                          }`}
                        />
                      </button>
                    </div>

                    <p className="mt-3 text-[12.5px] leading-relaxed text-content-secondary">{plugin.summary}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${
                          enabled
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : "border-zinc-700 bg-zinc-900/70 text-content-tertiary"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-emerald-400" : "bg-zinc-500"}`}
                        />
                        {enabled ? "Enabled" : "Disabled"}
                      </span>
                      <span className="rounded-full border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-[10.5px] tabular-nums text-content-tertiary">
                        {plugin.rules.length} rules
                      </span>
                      {plugin.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-[10.5px] text-content-tertiary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-content-tertiary">Rule preview</div>
                      <ul className="mt-2 space-y-1.5">
                        {plugin.rules.slice(0, 4).map((rule) => (
                          <li key={rule.id} className="flex items-start gap-2 text-[12px]">
                            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_STYLE[rule.severity].dot}`} />
                            <span className="min-w-0 flex-1">
                              <span className="text-content-secondary">{rule.title}</span>
                              <span className="ml-1.5 text-[10.5px] text-content-tertiary">
                                {RULE_KIND_LABEL[rule.kind]}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                      {plugin.rules.length > 4 ? (
                        <div className="mt-1.5 pl-3.5 text-[11px] text-content-tertiary">
                          and {plugin.rules.length - 4} more rule{plugin.rules.length - 4 === 1 ? "" : "s"}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-3">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-content-tertiary">
                        Recommended blocks
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {plugin.recommendedPrimitives.map((resourceId) => (
                          <span
                            key={resourceId}
                            title={resourceId}
                            className="rounded border border-zinc-800 bg-zinc-900/70 px-1.5 py-0.5 text-[10.5px] text-content-secondary"
                          >
                            {primitiveName(resourceId)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-zinc-800/70 pt-3">
                      <button
                        type="button"
                        onClick={() => injectPack(plugin, true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brass px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:bg-brass-bright"
                      >
                        <Plus size={13} /> Add Pack to Canvas
                      </button>
                      <button
                        type="button"
                        onClick={() => injectPack(plugin, false)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-[11.5px] font-medium text-content-secondary transition-colors hover:border-brass/50 hover:text-brass-bright"
                      >
                        <Zap size={12} /> Inject Recommended Plugin Primitives to Canvas
                      </button>
                      <button
                        type="button"
                        onClick={() => exportPlugin(plugin)}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-[11.5px] text-content-tertiary transition-colors hover:border-zinc-700 hover:text-content"
                      >
                        <Download size={12} /> Export JSON
                      </button>
                      {isCustom ? (
                        <button
                          type="button"
                          onClick={() => {
                            removeCustomPlugin(plugin.id);
                            setNotice(`Removed ${plugin.name} from the hub.`);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2 py-1.5 text-[11.5px] text-red-300/90 transition-colors hover:bg-red-500/10"
                          aria-label={`Delete ${plugin.name}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </GlowCard>
              );
            })}
          </div>
        )}
      </section>

      <PluginStudio
        existingIds={allPlugins.map((plugin) => plugin.id)}
        onInstall={(plugin) => {
          addCustomPlugin(plugin);
          setNotice(`Installed ${plugin.name}. Its rules are now auditing the canvas.`);
        }}
        onImport={(jsonText) => {
          const result = importPluginJson(jsonText);
          if (result.ok) setNotice("Plugin manifest installed. Its rules are now live on the canvas.");
          return result;
        }}
        onError={(message) => setNotice(message)}
      />

      <section className="section-container pb-24">
        <div className="grid gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-content">
              <FileJson size={14} className="text-brass" /> Declarative by design
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-content-secondary">
              Four rule kinds cover availability, exposure, isolation and spend. A manifest can only describe checks —
              never code — so importing one is as safe as pasting JSON.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-content">
              <Shield size={14} className="text-brass" /> Runs locally
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-content-secondary">
              Evaluation happens in the browser against the same topology the simulator uses. Enabled packs persist to
              local storage; nothing leaves the machine.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-content">
              <Wrench size={14} className="text-brass" /> Compose your own
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-content-secondary">
              Build a pack for your platform team in the studio above, export it, and share the manifest with every
              architect who draws on the same canvas.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Custom plugin studio                                                */
/* ------------------------------------------------------------------ */

interface PluginStudioProps {
  existingIds: string[];
  onInstall: (plugin: SysCraftPlugin) => void;
  onImport: (jsonText: string) => { ok: boolean; error?: string };
  onError: (message: string) => void;
}

function PluginStudio({ existingIds, onInstall, onImport, onError }: PluginStudioProps) {
  const [mode, setMode] = useState<"builder" | "json">("builder");
  const [name, setName] = useState("Platform guardrail pack");
  const [category, setCategory] = useState<PluginCategory>("Custom");
  const [summary, setSummary] = useState("House rules for the platform team: every data tier behind a service, every edge filtered.");
  const [ruleTitle, setRuleTitle] = useState("Service tier needs a protected entry point");
  const [ruleKind, setRuleKind] = useState<DeclarativeRuleKind>("require_primitive_when_present");
  const [severity, setSeverity] = useState<DoctorSeverity>("warning");
  const [detail, setDetail] = useState("Traffic reaches the service tier without a gateway or filter in front of it.");
  const [suggestion, setSuggestion] = useState("Insert an API gateway plus a WAF at the entry tier.");
  const [conceptId, setConceptId] = useState("load-balancing");
  const [costCeiling, setCostCeiling] = useState(4.5);
  const [triggerIds, setTriggerIds] = useState<string[]>(["rest_service"]);
  const [requiredIds, setRequiredIds] = useState<string[]>(["api_gateway", "web_application_firewall"]);
  const [error, setError] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState(EMPTY_EXAMPLE_MANIFEST);

  const kindMeta = DECLARATIVE_RULE_KINDS.find((entry) => entry.kind === ruleKind) ?? DECLARATIVE_RULE_KINDS[0];

  const toggleId = (list: string[], setList: (next: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id]);
  };

  const buildRule = (): DeclarativePluginRule | null => {
    const base = {
      id: `custom-rule-${slugify(ruleTitle) || "rule"}`,
      title: ruleTitle.trim() || "Custom guardrail",
      severity,
      detail: detail.trim() || "This custom guardrail fired on the current canvas.",
      suggestion: suggestion.trim() || "Adjust the topology to satisfy the guardrail.",
      conceptId: conceptId.trim().length > 0 ? conceptId.trim() : null,
    };
    switch (ruleKind) {
      case "require_primitive_when_present":
        if (requiredIds.length === 0) return null;
        return {
          ...base,
          kind: ruleKind,
          ...(triggerIds.length > 0 ? { whenResourceIds: [...triggerIds] } : {}),
          requiredResourceIds: [...requiredIds],
        };
      case "forbid_direct_edge":
        if (triggerIds.length === 0 || requiredIds.length === 0) return null;
        return {
          ...base,
          kind: ruleKind,
          sourceResourceIds: [...triggerIds],
          targetResourceIds: [...requiredIds],
        };
      case "max_node_cost":
        if (!Number.isFinite(costCeiling) || costCeiling <= 0) return null;
        return {
          ...base,
          kind: ruleKind,
          ...(triggerIds.length > 0 ? { whenResourceIds: [...triggerIds] } : {}),
          maxCostUsdPerHour: costCeiling,
        };
      case "require_multi_az_category":
        if (triggerIds.length === 0) return null;
        return {
          ...base,
          kind: ruleKind,
          whenResourceIds: [...triggerIds],
        };
      default:
        return null;
    }
  };

  const install = () => {
    setError(null);
    if (name.trim().length === 0) {
      setError("Give the pack a name before installing it.");
      return;
    }
    const rule = buildRule();
    if (!rule) {
      setError(
        ruleKind === "max_node_cost"
          ? "Set a positive hourly cost ceiling."
          : "Pick at least one trigger block and one companion block for this rule kind.",
      );
      return;
    }
    const baseSlug = slugify(name) || "custom-pack";
    let id = `custom-${baseSlug}`;
    let attempt = 2;
    while (existingIds.includes(id)) {
      id = `custom-${baseSlug}-${attempt}`;
      attempt += 1;
    }
    const plugin: SysCraftPlugin = {
      id,
      name: name.trim(),
      version: "1.0.0",
      author: "You",
      category,
      summary: summary.trim() || "Custom architecture guardrail pack.",
      installedByDefault: false,
      tags: ["custom", slugify(category)],
      rules: [rule],
      recommendedPrimitives: [...new Set([...triggerIds, ...requiredIds])].filter(isValidPrimitiveId).slice(0, 6),
    };
    onInstall(plugin);
  };

  const runImport = () => {
    setError(null);
    const result = onImport(jsonText);
    if (!result.ok) {
      setError(result.error ?? "That manifest could not be installed.");
      onError(result.error ?? "That manifest could not be installed.");
    }
  };

  const triggerLabel =
    ruleKind === "forbid_direct_edge"
      ? "Source blocks (connection starts here)"
      : ruleKind === "max_node_cost"
        ? "Limit the cost check to these blocks (optional)"
        : "Trigger blocks (when present)";
  const requiredLabel =
    ruleKind === "forbid_direct_edge" ? "Target blocks (connection ends here)" : "Required blocks (must also exist)";
  const showRequired = ruleKind === "require_primitive_when_present" || ruleKind === "forbid_direct_edge";
  const showCost = ruleKind === "max_node_cost";

  return (
    <section className="section-container pb-16">
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/45 p-5 shadow-card md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-brass/40 bg-brass/10">
                <Wrench size={15} className="text-brass-bright" />
              </span>
              <h2 className="text-lg font-semibold tracking-tight text-content">Custom plugin studio</h2>
            </div>
            <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-content-secondary">
              Compose a pack in the form, or paste a manifest produced by another architect. Installed packs join the
              grid above, audit the canvas immediately, and can be exported as JSON.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950/50 p-1">
            {(["builder", "json"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option)}
                aria-pressed={mode === option}
                className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  mode === option ? "bg-brass/20 text-brass-bright" : "text-content-tertiary hover:text-content"
                }`}
              >
                {option === "builder" ? "Interactive builder" : "JSON import"}
              </button>
            ))}
          </div>
        </div>

        {mode === "builder" ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <Field label="Plugin name">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={inputClass}
                  placeholder="Platform guardrail pack"
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Category">
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as PluginCategory)}
                    className={inputClass}
                  >
                    {PLUGIN_CATEGORIES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Severity">
                  <select
                    value={severity}
                    onChange={(event) => setSeverity(event.target.value as DoctorSeverity)}
                    className={inputClass}
                  >
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                  </select>
                </Field>
              </div>

              <Field label="Summary">
                <textarea
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  rows={2}
                  className={inputClass}
                />
              </Field>

              <Field label="Rule kind" hint={kindMeta.hint}>
                <select
                  value={ruleKind}
                  onChange={(event) => setRuleKind(event.target.value as DeclarativeRuleKind)}
                  className={inputClass}
                >
                  {DECLARATIVE_RULE_KINDS.map((entry) => (
                    <option key={entry.kind} value={entry.kind}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Rule title">
                <input
                  value={ruleTitle}
                  onChange={(event) => setRuleTitle(event.target.value)}
                  className={inputClass}
                  placeholder="What the guardrail checks"
                />
              </Field>

              {showCost ? (
                <Field label="Hourly cost ceiling (USD)">
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={costCeiling}
                    onChange={(event) => setCostCeiling(Number(event.target.value))}
                    className={inputClass}
                  />
                </Field>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Detail">
                  <textarea
                    value={detail}
                    onChange={(event) => setDetail(event.target.value)}
                    rows={2}
                    className={inputClass}
                  />
                </Field>
                <Field label="Suggestion">
                  <textarea
                    value={suggestion}
                    onChange={(event) => setSuggestion(event.target.value)}
                    rows={2}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Encyclopedia concept (optional)" hint="Links the finding to a wiki article, e.g. rate-limiting.">
                <input
                  value={conceptId}
                  onChange={(event) => setConceptId(event.target.value)}
                  className={inputClass}
                  placeholder="rate-limiting"
                />
              </Field>
            </div>

            <div className="space-y-3">
              <PrimitiveMultiPicker
                label={triggerLabel}
                selected={triggerIds}
                onToggle={(id) => toggleId(triggerIds, setTriggerIds, id)}
              />
              {showRequired ? (
                <PrimitiveMultiPicker
                  label={requiredLabel}
                  selected={requiredIds}
                  onToggle={(id) => toggleId(requiredIds, setRequiredIds, id)}
                />
              ) : null}

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-content-tertiary">Manifest preview</div>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[10.5px] leading-relaxed text-content-secondary">
                  {(() => {
                    const rule = buildRule();
                    return JSON.stringify(
                      {
                        id: `custom-${slugify(name) || "pack"}`,
                        name: name.trim() || "Untitled pack",
                        category,
                        severity,
                        rules: rule ? [rule] : [],
                      },
                      null,
                      2,
                    );
                  })()}
                </pre>
              </div>

              {error ? (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <button
                type="button"
                onClick={install}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brass px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-brass-bright"
              >
                <Plus size={14} /> Install plugin &amp; enable it
              </button>
              <p className="text-[11px] leading-relaxed text-content-tertiary">
                Installed packs live in this browser only. Use Export JSON on the card to share the manifest with a
                teammate.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <Field
              label="Plugin manifest (JSON)"
              hint="Must include id, name, category, and at least one rule. Block ids are validated against the primitive catalog."
            >
              <textarea
                value={jsonText}
                onChange={(event) => setJsonText(event.target.value)}
                rows={16}
                spellCheck={false}
                className={`${inputClass} font-mono text-[11.5px] leading-relaxed`}
              />
            </Field>
            {error ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={runImport}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brass px-4 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-brass-bright"
              >
                <Download size={14} /> Install from JSON
              </button>
              <button
                type="button"
                onClick={() => {
                  setJsonText(EMPTY_EXAMPLE_MANIFEST);
                  setError(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-[12.5px] text-content-secondary transition-colors hover:border-brass/50 hover:text-brass-bright"
              >
                <FileJson size={13} /> Load example manifest
              </button>
              <span className="text-[11px] text-content-tertiary">
                Manifests are data only — no scripts are executed.
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-[12.5px] text-content placeholder:text-content-tertiary focus:border-brass/50 focus:outline-none";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-content-tertiary">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] leading-relaxed text-content-tertiary">{hint}</span> : null}
    </label>
  );
}

function PrimitiveMultiPicker({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [term, setTerm] = useState("");

  const options = useMemo(() => {
    const trimmed = term.trim().toLowerCase();
    if (!trimmed) return PRIMITIVE_OPTIONS;
    return PRIMITIVE_OPTIONS.filter(
      (option) => option.name.toLowerCase().includes(trimmed) || option.id.includes(trimmed),
    );
  }, [term]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-content-tertiary">{label}</span>
        <span className="text-[10.5px] tabular-nums text-content-tertiary">{selected.length} selected</span>
      </div>

      {selected.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {selected.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onToggle(id)}
              className="inline-flex items-center gap-1 rounded-full border border-brass/40 bg-brass/10 px-2 py-0.5 text-[10.5px] text-brass-bright transition-colors hover:bg-brass/20"
              title={`Remove ${primitiveName(id)}`}
            >
              {primitiveName(id)}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-content-tertiary">Nothing selected yet.</p>
      )}

      <label className="relative mt-2 flex items-center">
        <Search size={12} className="pointer-events-none absolute left-2.5 text-content-tertiary" />
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Filter blocks…"
          className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 py-1.5 pl-7 pr-2 text-[11.5px] text-content placeholder:text-content-tertiary focus:border-brass/50 focus:outline-none"
        />
      </label>

      <div className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
        {options.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              aria-pressed={active}
              className={`flex w-full items-center gap-2 rounded-md border px-2 py-1 text-left text-[11.5px] transition-colors ${
                active
                  ? "border-brass/40 bg-brass/10 text-brass-bright"
                  : "border-transparent text-content-secondary hover:border-zinc-800 hover:bg-zinc-900/60"
              }`}
            >
              <span
                className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                  active ? "border-brass bg-brass text-ink" : "border-zinc-700"
                }`}
              >
                {active ? <Check size={9} /> : null}
              </span>
              <span className="min-w-0 flex-1 truncate">{option.name}</span>
              <span className="shrink-0 text-[10px] text-content-tertiary">{option.category}</span>
            </button>
          );
        })}
        {options.length === 0 ? (
          <p className="px-2 py-1 text-[11px] text-content-tertiary">No block matches that filter.</p>
        ) : null}
      </div>
    </div>
  );
}

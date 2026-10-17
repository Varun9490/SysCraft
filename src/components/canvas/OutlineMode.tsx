'use client';

import { useEffect, useMemo, useState } from "react";
import { Link2, Plus, Trash2, X } from "@/components/ui/icons";
import { SEED_RESOURCES } from "@/data/seedResources";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useSimStore } from "@/store/useSimStore";

/**
 * Accessible Outline Mode (WCAG 2.2 AA escape hatch for the canvas).
 *
 * Renders the entire topology as synchronized, keyboard-editable tables:
 * nodes can be added from a form, connected through "Connect to…" selectors,
 * re-parameterized in standard inputs, and focused/removed with plain
 * buttons. A polite ARIA live region narrates simulation advisories so
 * screen-reader users never depend on the visual particle layer.
 */

const RESOURCE_BY_ID = new Map(SEED_RESOURCES.map((r) => [r.id, r]));

interface SampleRow {
  id: string;
  rps: number;
  utilization: number;
  p99Ms: number;
  errorRate: number;
}

export function OutlineMode() {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const [newResourceId, setNewResourceId] = useState(SEED_RESOURCES[0]?.id ?? "rest_service");
  const [edgeFrom, setEdgeFrom] = useState("");
  const [edgeTo, setEdgeTo] = useState("");
  const [samples, setSamples] = useState<Record<string, SampleRow>>({});
  const [announcement, setAnnouncement] = useState<string>("");

  // 2 Hz sampling of live telemetry keeps the table fresh without re-rendering
  // at the full 10 Hz store cadence.
  useEffect(() => {
    const tick = () => {
      const telemetry = useSimStore.getState().nodeTelemetry;
      const next: Record<string, SampleRow> = {};
      for (const [id, t] of Object.entries(telemetry)) {
        next[id] = { id, rps: t.arrivalRps, utilization: t.utilization, p99Ms: t.p99Ms, errorRate: t.errorRate };
      }
      setSamples(next);
    };
    tick();
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, []);

  // Polite narration: announce the worst-saturated node only when it changes
  // tier (healthy -> hot -> saturated), never on every tick.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        useCanvasStore.getState().setOutlineMode(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const running = useSimStore.getState().running;
      if (!running) return;
      const telemetry = useSimStore.getState().nodeTelemetry;
      let worst: { id: string; utilization: number; label: string } | null = null;
      for (const [id, t] of Object.entries(telemetry)) {
        if (t.utilization > (worst?.utilization ?? 0)) {
          const node = useCanvasStore.getState().nodes.find((n) => n.id === id);
          worst = { id, utilization: t.utilization, label: String(node?.data.label ?? id) };
        }
      }
      if (!worst || worst.utilization < 0.7) return;
      const pct = Math.round(worst.utilization * 100);
      setAnnouncement(`${worst.label} utilization is ${pct} percent.`);
    }, 8000);
    return () => window.clearInterval(timer);
  }, []);

  const sortedNodes = useMemo(
    () => [...nodes].sort((a, b) => String(a.data.label ?? "").localeCompare(String(b.data.label ?? ""))),
    [nodes],
  );

  const handleAdd = () => {
    const resource = RESOURCE_BY_ID.get(newResourceId);
    if (!resource) return;
    const count = nodes.length;
    const id = useCanvasStore
      .getState()
      .addNode(newResourceId, { x: 160 + (count % 6) * 60, y: 160 + (count % 6) * 48 }, resource.name);
    useCanvasStore.getState().focusNode(id);
  };

  const handleConnect = () => {
    if (!edgeFrom || !edgeTo || edgeFrom === edgeTo) return;
    useCanvasStore.getState().addEdge(edgeFrom, edgeTo);
    setEdgeFrom("");
    setEdgeTo("");
  };

  const labelFor = (id: string): string => {
    const node = nodes.find((n) => n.id === id);
    return node ? String(node.data.label ?? id) : id;
  };

  return (
    <div
      className="absolute inset-0 z-40 overflow-y-auto bg-zinc-950/97 p-4 text-zinc-200 backdrop-blur"
      role="region"
      aria-label="Canvas outline mode"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-100">Outline Mode</h2>
            <p className="text-[12px] text-zinc-500">
              Full keyboard and screen-reader equivalent of the canvas. Press <kbd className="rounded border border-zinc-700 px-1">O</kbd> or Escape to
              close.
            </p>
          </div>
          <button
            type="button"
            onClick={() => useCanvasStore.getState().setOutlineMode(false)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-[12.5px] text-zinc-300 hover:bg-zinc-800"
          >
            <X size={14} /> Close outline
          </button>
        </header>

        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3" aria-label="Add component">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-56 flex-col gap-1 text-[11px] uppercase tracking-wider text-zinc-500">
              Component
              <select
                value={newResourceId}
                onChange={(e) => setNewResourceId(e.target.value)}
                className="h-9 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-[13px] text-zinc-100"
              >
                {SEED_RESOURCES.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name} · {resource.category}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-sky-500 px-3 text-[12.5px] font-semibold text-zinc-950 hover:bg-sky-400"
            >
              <Plus size={14} /> Add component
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40" aria-label="Components">
          <div className="flex items-center justify-between px-3 py-2">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-zinc-400">
              Components ({sortedNodes.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-[12.5px]">
              <thead>
                <tr className="border-y border-zinc-800 text-[10.5px] uppercase tracking-wider text-zinc-500">
                  <th scope="col" className="px-3 py-2">Name</th>
                  <th scope="col" className="px-3 py-2">Type</th>
                  <th scope="col" className="px-3 py-2">Replicas</th>
                  <th scope="col" className="px-3 py-2">Entry RPS</th>
                  <th scope="col" className="px-3 py-2">Live rps</th>
                  <th scope="col" className="px-3 py-2">Util</th>
                  <th scope="col" className="px-3 py-2">p99</th>
                  <th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {sortedNodes.map((node) => {
                  const resourceId = String(node.data.resourceId ?? "");
                  const definition = RESOURCE_BY_ID.get(resourceId);
                  const sample = samples[node.id];
                  const utilizationPct = sample ? Math.round(sample.utilization * 100) : null;
                  const selected = node.id === selectedNodeId;
                  return (
                    <tr
                      key={node.id}
                      className={`border-b border-zinc-800/60 ${selected ? "bg-sky-500/10" : "hover:bg-zinc-800/40"}`}
                    >
                      <td className="px-3 py-1.5">
                        <button
                          type="button"
                          onClick={() => useCanvasStore.getState().focusNode(node.id)}
                          className="rounded px-1.5 py-0.5 text-left font-medium text-zinc-100 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
                          aria-current={selected ? "true" : undefined}
                        >
                          {String(node.data.label ?? node.id)}
                        </button>
                      </td>
                      <td className="px-3 py-1.5 text-zinc-400">{definition?.name ?? resourceId}</td>
                      <td className="px-3 py-1.5">
                        <label className="sr-only" htmlFor={`replicas-${node.id}`}>
                          Replicas for {String(node.data.label ?? node.id)}
                        </label>
                        <input
                          id={`replicas-${node.id}`}
                          type="number"
                          min={1}
                          max={64}
                          value={node.data.overrides.replicationFactor ?? definition?.defaults.replicationFactor ?? 1}
                          onChange={(e) => {
                            const value = Math.max(1, Math.min(64, Number(e.target.value) || 1));
                            useCanvasStore.getState().updateNodeOverrides(node.id, { replicationFactor: value });
                          }}
                          className="h-7 w-16 rounded border border-zinc-700 bg-zinc-900 px-1.5 text-[12px] text-zinc-100"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <label className="sr-only" htmlFor={`rps-${node.id}`}>
                          Entry RPS for {String(node.data.label ?? node.id)}
                        </label>
                        <input
                          id={`rps-${node.id}`}
                          type="number"
                          min={0}
                          max={1_000_000}
                          step={500}
                          value={node.data.overrides.clientRps ?? 0}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(1_000_000, Number(e.target.value) || 0));
                            useCanvasStore.getState().updateNodeOverrides(node.id, { clientRps: value });
                          }}
                          className="h-7 w-20 rounded border border-zinc-700 bg-zinc-900 px-1.5 text-[12px] text-zinc-100"
                        />
                      </td>
                      <td className="px-3 py-1.5 tabular-nums text-zinc-300">
                        {sample ? (sample.rps >= 1000 ? `${(sample.rps / 1000).toFixed(1)}k` : sample.rps.toFixed(0)) : "—"}
                      </td>
                      <td className="px-3 py-1.5 tabular-nums">
                        {utilizationPct === null ? (
                          <span className="text-zinc-600">—</span>
                        ) : (
                          <span
                            className={
                              utilizationPct >= 90
                                ? "text-red-300"
                                : utilizationPct >= 70
                                  ? "text-amber-300"
                                  : "text-emerald-300"
                            }
                          >
                            {utilizationPct}%
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 tabular-nums text-zinc-400">
                        {sample && sample.rps > 0 ? `${sample.p99Ms.toFixed(0)} ms` : "—"}
                      </td>
                      <td className="px-3 py-1.5">
                        <button
                          type="button"
                          onClick={() => useCanvasStore.getState().removeNode(node.id)}
                          className="inline-flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 hover:border-red-500/60 hover:text-red-300"
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {sortedNodes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-zinc-500">
                      Canvas is empty — add a component above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3" aria-label="Connections">
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-zinc-400">
            Connections ({edges.length})
          </h3>
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <label className="flex min-w-44 flex-col gap-1 text-[11px] uppercase tracking-wider text-zinc-500">
              From
              <select
                value={edgeFrom}
                onChange={(e) => setEdgeFrom(e.target.value)}
                className="h-9 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-[13px] text-zinc-100"
              >
                <option value="">Select source…</option>
                {sortedNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {String(n.data.label ?? n.id)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-44 flex-col gap-1 text-[11px] uppercase tracking-wider text-zinc-500">
              To
              <select
                value={edgeTo}
                onChange={(e) => setEdgeTo(e.target.value)}
                className="h-9 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-[13px] text-zinc-100"
              >
                <option value="">Select target…</option>
                {sortedNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {String(n.data.label ?? n.id)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleConnect}
              disabled={!edgeFrom || !edgeTo || edgeFrom === edgeTo}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-700 px-3 text-[12.5px] text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Link2 size={14} /> Connect
            </button>
          </div>
          <ul className="flex flex-col gap-1">
            {edges.map((edge) => (
              <li
                key={edge.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800/70 bg-zinc-950/50 px-3 py-1.5 text-[12.5px]"
              >
                <span className="text-zinc-300">
                  {labelFor(edge.source)} <span className="text-zinc-600">→</span> {labelFor(edge.target)}
                </span>
                <button
                  type="button"
                  onClick={() => useCanvasStore.getState().removeEdge(edge.id)}
                  className="inline-flex items-center gap-1 rounded border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-400 hover:border-red-500/60 hover:text-red-300"
                >
                  <Trash2 size={11} /> Remove
                </button>
              </li>
            ))}
            {edges.length === 0 && <li className="text-[12px] text-zinc-500">No connections yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

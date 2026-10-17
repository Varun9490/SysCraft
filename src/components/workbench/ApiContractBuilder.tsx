'use client';

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "@/components/ui/icons";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import type { ApiRoute, HttpMethod } from "@/types/workbench";

/**
 * REST/gRPC/GraphQL/WebSocket endpoint designer with live OpenAPI preview.
 * Routes carry auth, per-endpoint rate limits, and p99 budgets so the
 * contract doubles as the throttling spec the simulator enforces.
 */

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const EMPTY_ROUTE: Omit<ApiRoute, "id"> = {
  method: "GET",
  path: "/v1/resource",
  description: "",
  auth: "jwt",
  rateLimitRps: 1000,
  requestSchema: "{}",
  responseSchema: "{}",
  p99BudgetMs: 250,
};

export function ApiContractBuilder() {
  const apiRoutes = useWorkbenchStore((s) => s.apiRoutes);
  const addApiRoute = useWorkbenchStore((s) => s.addApiRoute);
  const updateApiRoute = useWorkbenchStore((s) => s.updateApiRoute);
  const removeApiRoute = useWorkbenchStore((s) => s.removeApiRoute);
  const [draft, setDraft] = useState<Omit<ApiRoute, "id">>({ ...EMPTY_ROUTE });

  const openApi = useMemo(() => {
    const paths: Record<string, unknown> = {};
    for (const route of apiRoutes) {
      const key = route.path || "/unnamed";
      paths[key] = {
        ...(typeof paths[key] === "object" && paths[key] !== null ? (paths[key] as Record<string, unknown>) : {}),
        [route.method.toLowerCase()]: {
          summary: route.description || `${route.method} ${route.path}`,
          security: route.auth === "none" ? [] : [{ [route.auth]: [] }],
          "x-rate-limit-rps": route.rateLimitRps,
          "x-p99-budget-ms": route.p99BudgetMs,
        },
      };
    }
    return JSON.stringify({ openapi: "3.1.0", info: { title: "SysCraft contract", version: "1.0.0" }, paths }, null, 2);
  }, [apiRoutes]);

  const add = () => {
    if (!draft.path.trim()) return;
    addApiRoute({ ...draft, path: draft.path.trim() });
    setDraft({ ...EMPTY_ROUTE });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-2.5">
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] text-zinc-400">Method</span>
            <select
              value={draft.method}
              onChange={(e) => setDraft({ ...draft, method: e.target.value as HttpMethod })}
              className="w-full rounded bg-zinc-950 px-1.5 py-1.5 text-xs text-zinc-100"
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-zinc-400">Path</span>
            <input
              value={draft.path}
              onChange={(e) => setDraft({ ...draft, path: e.target.value })}
              className="w-full rounded bg-zinc-950 px-1.5 py-1.5 font-mono text-xs text-zinc-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-zinc-400">Auth</span>
            <select
              value={draft.auth}
              onChange={(e) => setDraft({ ...draft, auth: e.target.value as typeof draft.auth })}
              className="w-full rounded bg-zinc-950 px-1.5 py-1.5 text-xs text-zinc-100"
            >
              <option value="none">none</option>
              <option value="api_key">api_key</option>
              <option value="oauth2">oauth2</option>
              <option value="jwt">jwt</option>
              <option value="mtls">mtls</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-zinc-400">Rate limit (RPS)</span>
            <input
              type="number"
              min={1}
              value={draft.rateLimitRps}
              onChange={(e) => setDraft({ ...draft, rateLimitRps: Math.max(1, Number(e.target.value)) })}
              className="w-full rounded bg-zinc-950 px-1.5 py-1.5 text-xs tabular-nums text-zinc-100"
            />
          </label>
          <label className="col-span-2 block">
            <span className="mb-1 block text-[11px] text-zinc-400">Description</span>
            <input
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="What does this endpoint do?"
              className="w-full rounded bg-zinc-950 px-1.5 py-1.5 text-xs text-zinc-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-zinc-400">p99 budget (ms)</span>
            <input
              type="number"
              min={1}
              value={draft.p99BudgetMs}
              onChange={(e) => setDraft({ ...draft, p99BudgetMs: Math.max(1, Number(e.target.value)) })}
              className="w-full rounded bg-zinc-950 px-1.5 py-1.5 text-xs tabular-nums text-zinc-100"
            />
          </label>
          <div className="flex items-end">
            <button
              onClick={add}
              className="flex w-full items-center justify-center gap-1 rounded-md bg-sky-500 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-sky-400"
            >
              <Plus size={13} /> Add route
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        {apiRoutes.map((route) => (
          <div key={route.id} className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5">
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                route.method === "GET" ? "bg-emerald-500/20 text-emerald-300" : route.method === "DELETE" ? "bg-red-500/20 text-red-300" : "bg-sky-500/20 text-sky-300"
              }`}
            >
              {route.method}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-xs text-zinc-100">{route.path}</p>
              <p className="truncate text-[10px] text-zinc-500">
                {route.auth} · {route.rateLimitRps.toLocaleString()} rps · p99 ≤ {route.p99BudgetMs}ms
                {route.description ? ` · ${route.description}` : ""}
              </p>
            </div>
            <input
              type="number"
              min={1}
              value={route.p99BudgetMs}
              onChange={(e) => updateApiRoute(route.id, { p99BudgetMs: Math.max(1, Number(e.target.value)) })}
              title="p99 budget (ms)"
              className="w-16 rounded bg-zinc-900 px-1 py-1 text-[11px] tabular-nums text-zinc-200"
            />
            <button
              onClick={() => removeApiRoute(route.id)}
              className="text-zinc-500 hover:text-red-300"
              aria-label={`Delete ${route.method} ${route.path}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {apiRoutes.length === 0 && <p className="text-xs text-zinc-500">No routes yet — add the first endpoint above.</p>}
      </div>

      <details className="rounded-md border border-zinc-800 bg-zinc-950">
        <summary className="cursor-pointer px-2.5 py-2 font-mono text-[11px] text-zinc-400">OpenAPI 3.1 preview</summary>
        <pre className="max-h-64 overflow-auto border-t border-zinc-800 p-2.5 font-mono text-[11px] leading-relaxed text-emerald-200">
          {openApi}
        </pre>
      </details>
    </div>
  );
}

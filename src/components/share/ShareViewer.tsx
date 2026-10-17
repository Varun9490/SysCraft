'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { decompressFromEncodedURIComponent } from 'lz-string';
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCopy,
  Download,
  GitBranch,
  Play,
  Share,
} from '@/components/ui/icons';
import { SEED_RESOURCES } from '@/data/seedResources';
import { SCENE_VERSION, useCanvasStore } from '@/store/useCanvasStore';

/**
 * Share viewer (/s). The whole topology travels inside the URL fragment as an
 * lz-string payload — nothing is uploaded, nothing is stored server-side, and
 * links stay comfortably under the ~30 KB budget.
 *
 * Opening a link is always non-destructive to the sender: "Open as copy"
 * replaces the *viewer's* canvas (undo-able) and never writes back anywhere.
 */

interface SharedSceneNode {
  id: string;
  position: { x: number; y: number };
  resourceId: string;
  label: string;
}

interface SharedScene {
  version: number;
  nodes: SharedSceneNode[];
  edges: Array<{ id: string; source: string; target: string }>;
}

const MAX_PAYLOAD_CHARS = 250_000;

const resourceNameById = new Map(SEED_RESOURCES.map((r) => [r.id, r.name]));
const resourceCategoryById = new Map(SEED_RESOURCES.map((r) => [r.id, r.category]));

function parseSharedPayload(raw: string): { scene: SharedScene | null; error: string | null } {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { scene: null, error: null };
  if (trimmed.length > MAX_PAYLOAD_CHARS) {
    return { scene: null, error: 'This payload is far larger than a SysCraft share link should be.' };
  }
  let json: string | null = null;
  if (trimmed.startsWith('{')) {
    json = trimmed;
  } else {
    json = decompressFromEncodedURIComponent(trimmed);
  }
  if (!json) {
    return { scene: null, error: 'Could not decompress this link — it may be truncated. Re-copy the full URL, including everything after #.' };
  }
  try {
    const parsed = JSON.parse(json) as Partial<SharedScene>;
    if (parsed.version !== SCENE_VERSION || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      return { scene: null, error: `Unsupported share format — expected schema version ${SCENE_VERSION}.` };
    }
    const nodes = parsed.nodes.filter(
      (n): n is SharedSceneNode =>
        typeof n === 'object' &&
        n !== null &&
        typeof (n as SharedSceneNode).id === 'string' &&
        typeof (n as SharedSceneNode).resourceId === 'string' &&
        typeof (n as SharedSceneNode).label === 'string',
    );
    if (nodes.length === 0) return { scene: null, error: 'The link decoded, but contains no nodes.' };
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = parsed.edges.filter(
      (e) =>
        typeof e === 'object' &&
        e !== null &&
        nodeIds.has((e as { source: string }).source) &&
        nodeIds.has((e as { target: string }).target),
    );
    return { scene: { version: parsed.version, nodes, edges }, error: null };
  } catch {
    return { scene: null, error: 'The payload decoded but is not valid JSON — the link is likely corrupted.' };
  }
}

export function ShareViewer() {
  const router = useRouter();
  const [payload, setPayload] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const [copied, setCopied] = useState(false);

  const readHash = useCallback(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace(/^#/, '');
    setPayload(hash);
  }, []);

  useEffect(() => {
    readHash();
    window.addEventListener('hashchange', readHash);
    return () => window.removeEventListener('hashchange', readHash);
  }, [readHash]);

  const { scene, error } = useMemo(() => parseSharedPayload(payload ?? ''), [payload]);

  const nodeLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of scene?.nodes ?? []) map.set(node.id, node.label);
    return map;
  }, [scene]);

  const openAsCopy = useCallback(() => {
    if (!payload) return;
    const ok = useCanvasStore.getState().deserializeScene(payload);
    if (!ok) return;
    router.push('/canvas');
  }, [payload, router]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard blocked — the URL bar still works */
    }
  }, []);

  const downloadJson = useCallback(() => {
    if (!scene) return;
    const blob = new Blob([JSON.stringify({ format: 'syscraft.design/1', ...scene }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'shared-design.syscraft.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }, [scene]);

  const applyPasted = useCallback(() => {
    const text = pasted.trim();
    if (text.length === 0) return;
    const idx = text.indexOf('#');
    const fragment = idx >= 0 ? text.slice(idx + 1) : text;
    setPayload(fragment);
    setPasted('');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${fragment}`);
    }
  }, [pasted]);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-sky-400/80">SHARED DESIGN</p>
        <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-semibold text-zinc-100">
          <Share className="h-7 w-7 text-sky-400" aria-hidden />
          A design, carried entirely in the link
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          SysCraft share links compress the full topology into the URL fragment — no account, no upload, no expiry.
          Open a copy in your own canvas to simulate it, run the Design Doctor on it, or fork it into something new.
        </p>
      </header>

      {payload === null ? (
        <p className="text-sm text-zinc-500">Reading the link…</p>
      ) : error ? (
        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.06] p-5" role="alert">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-amber-300">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            This link didn't decode
          </h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-400">{error}</p>
          <p className="mt-2 text-[12px] text-zinc-500">
            You can paste the raw link or payload below and try again.
          </p>
        </section>
      ) : scene ? (
        <>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-[12px] text-zinc-400">
                <span className="rounded-full border border-zinc-700 px-3 py-1 font-mono">{scene.nodes.length} nodes</span>
                <span className="rounded-full border border-zinc-700 px-3 py-1 font-mono">{scene.edges.length} edges</span>
                <span className="rounded-full border border-zinc-700 px-3 py-1 font-mono">
                  {((payload?.length ?? 0) / 1024).toFixed(1)} KB link
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={openAsCopy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-sky-400"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden />
                  Open as copy in Canvas
                </button>
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3.5 py-2 text-[13px] text-zinc-200 transition hover:border-zinc-500"
                >
                  <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
                  {copied ? 'Copied' : 'Copy link'}
                </button>
                <button
                  type="button"
                  onClick={downloadJson}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3.5 py-2 text-[13px] text-zinc-200 transition hover:border-zinc-500"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  .syscraft.json
                </button>
              </div>
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-zinc-500">
              Opening as a copy replaces your current canvas — <kbd className="rounded border border-zinc-700 px-1">Ctrl/⌘ Z</kbd>{' '}
              puts it back, and the original share is never modified.
            </p>

            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <div>
                <h2 className="text-[11px] font-semibold tracking-[0.18em] text-zinc-500">COMPONENTS</h2>
                <ul className="mt-3 space-y-1.5">
                  {scene.nodes.map((node) => (
                    <li key={node.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-3 py-2">
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] text-zinc-200">{node.label}</span>
                        <span className="block text-[10.5px] text-zinc-600">
                          {resourceNameById.get(node.resourceId) ?? node.resourceId}
                          {resourceCategoryById.get(node.resourceId) ? ` · ${resourceCategoryById.get(node.resourceId)}` : ''}
                        </span>
                      </span>
                      <code className="shrink-0 text-[10px] text-zinc-600">{node.resourceId}</code>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-[11px] font-semibold tracking-[0.18em] text-zinc-500">CONNECTIONS</h2>
                {scene.edges.length === 0 ? (
                  <p className="mt-3 text-[12px] text-zinc-500">No edges — every component stands alone.</p>
                ) : (
                  <ol className="mt-3 space-y-1.5">
                    {scene.edges.map((edge) => (
                      <li key={edge.id} className="flex items-center gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-3 py-2 text-[12px] text-zinc-300">
                        <GitBranch className="h-3.5 w-3.5 shrink-0 text-zinc-600" aria-hidden />
                        <span className="truncate">{nodeLabel.get(edge.source) ?? edge.source}</span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-sky-500" aria-hidden />
                        <span className="truncate">{nodeLabel.get(edge.target) ?? edge.target}</span>
                      </li>
                    ))}
                  </ol>
                )}
                <p className="mt-4 text-[11.5px] leading-relaxed text-zinc-600">
                  Want to rebuild this from scratch instead? The{' '}
                  <Link href="/flowchart" className="text-sky-400 hover:text-sky-300">
                    design flowchart
                  </Link>{' '}
                  walks the same patterns question by question.
                </p>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <h2 className="text-[13px] font-semibold text-zinc-100">No payload in this link</h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-500">
            Share links look like <code className="rounded bg-zinc-900 px-1 py-0.5 text-[11px] text-zinc-400">/s#N4Ig…</code>{' '}
            — grab one from the Share button on the canvas or from any flowchart preset.
          </p>
        </section>
      )}

      {payload !== null && (
        <section className="mt-6 rounded-2xl border border-zinc-800/70 bg-zinc-900/20 p-5">
          <label className="block">
            <span className="text-[12px] font-medium text-zinc-300">Open a link or paste a payload</span>
            <span className="mt-0.5 block text-[11.5px] text-zinc-500">
              Paste a full share URL or just the fragment after the # — both work.
            </span>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={3}
              placeholder="https://…/s#N4Ig…"
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500 focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={applyPasted}
            disabled={pasted.trim().length === 0}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Share className="h-3.5 w-3.5" aria-hidden />
            Load payload
          </button>
        </section>
      )}
    </div>
  );
}

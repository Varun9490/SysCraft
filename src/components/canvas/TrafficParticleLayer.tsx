'use client';

import { useEffect, useRef } from "react";
import { useViewport } from "@xyflow/react";
import { simSnapshotRef } from "@/store/useSimStore";
import { useCanvasPrefsStore } from "@/store/useCanvasPrefsStore";
import { useCanvasStore, type CanvasEdgeData, type EdgeCondition } from "@/store/useCanvasStore";

/**
 * Decoupled 60 FPS HTML5 Canvas packet overlay.
 *
 * Packets ride the ACTUAL React Flow edge geometry: each `.react-flow__edge`
 * path is sampled into a polyline (cached until its `d` changes) and points
 * are interpolated along it, then mapped to screen space with the viewport
 * transform — so traffic follows the visible curve/step/line of every edge,
 * never a straight center-to-center chord.
 *
 * Flowchart conditions route particles: `cache_hit` / `cache_miss` split at the
 * source's live hit ratio, `read` / `write` split at the source's write mix,
 * `rate_limited` carries only dropped RPS, `error` tracks the target's error
 * rate, and `async` renders dashed outside the critical path.
 *
 * Perf contract: reads live RPS/latency/error only from the mutable
 * `simSnapshotRef` inside a requestAnimationFrame loop — zero Zustand
 * subscriptions per tick, zero React re-renders while the sim runs. Edge
 * conditions arrive once per structural change (single store read).
 */

const MAX_PARTICLES_PER_EDGE = 40;
const SAMPLE_SPACING_PX = 12;
const MIN_SAMPLES = 6;
const MAX_SAMPLES = 96;

interface PathCache {
  d: string;
  length: number;
  xs: number[];
  ys: number[];
}

function particleColor(errorRate: number): string {
  if (!Number.isFinite(errorRate) || errorRate <= 0.05) return "56, 189, 248";
  if (errorRate <= 0.2) return "252, 211, 77";
  return "248, 113, 113";
}

export function TrafficParticleLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewport = useViewport();

  // Preferences change only on explicit user action — subscribing is cheap.
  const showParticles = useCanvasPrefsStore((s) => s.showParticles);
  const particleDensity = useCanvasPrefsStore((s) => s.particleDensity);

  const viewportRef = useRef(viewport);
  const prefsRef = useRef({ showParticles, particleDensity });

  // Structure changes rarely; mirror edge → condition into a ref for the rAF loop.
  const edges = useCanvasStore((s) => s.edges);
  const edgeDecorRef = useRef<Map<string, { condition: EdgeCondition; source: string }>>(new Map());

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);
  useEffect(() => {
    prefsRef.current = { showParticles, particleDensity };
  }, [showParticles, particleDensity]);
  useEffect(() => {
    const next = new Map<string, { condition: EdgeCondition; source: string }>();
    for (const edge of edges) {
      const data = (edge.data ?? {}) as CanvasEdgeData;
      const condition = data.condition ?? "none";
      if (condition !== "none") next.set(edge.id, { condition, source: edge.source });
    }
    edgeDecorRef.current = next;
  }, [edges]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pathCache = new Map<string, PathCache>();
    let raf = 0;
    let lastMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    let elapsed = 0;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (observer) observer.observe(parent);

    /** Sample an edge path into world-space polyline points, cached by `d`. */
    const slicePath = (edgeId: string, path: SVGPathElement): PathCache | null => {
      const d = path.getAttribute("d");
      if (!d) return null;
      const cached = pathCache.get(edgeId);
      if (cached && cached.d === d) return cached;
      let length = 0;
      try {
        length = path.getTotalLength();
      } catch {
        return null;
      }
      if (!(length > 0)) return null;
      const count = Math.min(MAX_SAMPLES, Math.max(MIN_SAMPLES, Math.ceil(length / SAMPLE_SPACING_PX)));
      const xs = new Array<number>(count + 1);
      const ys = new Array<number>(count + 1);
      for (let i = 0; i <= count; i += 1) {
        const point = path.getPointAtLength((length * i) / count);
        xs[i] = point.x;
        ys[i] = point.y;
      }
      const entry: PathCache = { d, length, xs, ys };
      pathCache.set(edgeId, entry);
      return entry;
    };

    const frame = (nowMs: number) => {
      const dt = Math.min(0.1, Math.max(0, (nowMs - lastMs) / 1000));
      lastMs = nowMs;
      elapsed += dt;

      const rect = parent.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const { showParticles: show, particleDensity: density } = prefsRef.current;
      const snapshot = simSnapshotRef.current;
      const vp = viewportRef.current;

      if (snapshot && show) {
        const edgeWrappers = parent.querySelectorAll<SVGGElement>(".react-flow__edge");

        for (const wrapper of edgeWrappers) {
          const edgeId = wrapper.getAttribute("data-id");
          if (!edgeId) continue;
          const flow = snapshot.edges[edgeId];
          let rps = flow?.rps ?? 0;
          let errorRate = flow?.errorRate ?? 0;
          let dashed = false;

          // Flowchart-condition routing: reshape which traffic rides this edge.
          const decor = edgeDecorRef.current.get(edgeId);
          if (decor) {
            const sourceTelem = snapshot.nodes[decor.source];
            const hitRatio = Math.max(0, Math.min(1, (sourceTelem?.cacheHitPct ?? 0) / 100));
            const errRatio = Math.max(0, Math.min(1, (sourceTelem?.errorRate ?? 0) / 100));
            let writeRatio = 0.2;
            if (decor.condition === "read" || decor.condition === "write") {
              const node = useCanvasStore.getState().nodes.find((n) => n.id === decor.source);
              const overrides = node?.data?.overrides;
              writeRatio = Math.max(0, Math.min(1, Number(overrides?.writeRatio ?? 0.2)));
            }
            switch (decor.condition) {
              case "cache_hit":
                rps *= hitRatio;
                if (rps > 0.5) errorRate = 0;
                break;
              case "cache_miss":
                rps *= 1 - hitRatio;
                break;
              case "read":
                rps *= 1 - writeRatio;
                break;
              case "write":
                rps *= writeRatio;
                break;
              case "rate_limited":
                rps = sourceTelem?.droppedRps ?? 0;
                errorRate = 1;
                break;
              case "error":
                rps *= errRatio;
                errorRate = 1;
                break;
              case "async":
                dashed = true;
                break;
              default:
                break;
            }
          }
          if (!(rps > 0.5)) continue;

          // Edges hidden by React Flow (collapsed/minimap clones) have no box.
          if (wrapper.style.visibility === "hidden" || wrapper.style.display === "none") continue;

          const path = wrapper.querySelector<SVGPathElement>("path.react-flow__edge-path");
          if (!path) continue;
          const cache = slicePath(edgeId, path);
          if (!cache) continue;

          const rgb = particleColor(flow?.errorRate ?? 0);

          // Faint glow along the real path so the line reads as "carrying" flow.
          ctx.beginPath();
          for (let i = 0; i < cache.xs.length; i += 1) {
            const x = cache.xs[i] * vp.zoom + vp.x;
            const y = cache.ys[i] * vp.zoom + vp.y;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = `rgba(${rgb}, 0.22)`;
          ctx.lineWidth = Math.max(1, 1.4 * vp.zoom);
          if (dashed) ctx.setLineDash([6 * Math.max(1, vp.zoom), 7 * Math.max(1, vp.zoom)]);
          ctx.stroke();
          if (dashed) ctx.setLineDash([]);

          const count = Math.max(1, Math.min(MAX_PARTICLES_PER_EDGE, Math.round((rps / 150) * density)));
          const latencyMs = flow?.latencyMs ?? 50;
          const speed = Math.max(0.15, Math.min(2, 600 / (100 + latencyMs)));
          const dotRadius = Math.max(1.2, 2 * vp.zoom);
          const segmentMax = cache.xs.length - 1;

          ctx.fillStyle = `rgba(${rgb}, 0.95)`;
          for (let i = 0; i < count; i += 1) {
            const t = (elapsed * speed + i / count) % 1;
            const pos = t * segmentMax;
            const idx = Math.min(segmentMax - 1, Math.floor(pos));
            const frac = pos - idx;
            const worldX = cache.xs[idx] + (cache.xs[idx + 1] - cache.xs[idx]) * frac;
            const worldY = cache.ys[idx] + (cache.ys[idx + 1] - cache.ys[idx]) * frac;
            const x = worldX * vp.zoom + vp.x;
            const y = worldY * vp.zoom + vp.y;
            ctx.beginPath();
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Keep the cache bounded to edges that still exist.
        if (pathCache.size > 240) {
          const live = new Set<string>();
          for (const wrapper of edgeWrappers) {
            const id = wrapper.getAttribute("data-id");
            if (id) live.add(id);
          }
          for (const key of pathCache.keys()) {
            if (!live.has(key)) pathCache.delete(key);
          }
        }
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      if (observer) observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 20 }}
      aria-hidden="true"
    />
  );
}

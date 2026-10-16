'use client';

import { useEffect, useRef } from "react";
import { useViewport } from "@xyflow/react";
import { simSnapshotRef } from "@/store/useSimStore";
import { useCanvasStore } from "@/store/useCanvasStore";

/**
 * Decoupled 60 FPS HTML5 Canvas packet overlay.
 *
 * Reads live edge RPS/latency/error straight from the mutable
 * `simSnapshotRef` inside a requestAnimationFrame loop — zero Zustand
 * subscriptions, zero React re-renders per tick. Particle density scales
 * with RPS; hue shifts sky → amber → red with downstream error burn.
 */

const NODE_CENTER_X = 116;
const NODE_CENTER_Y = 64;
const MAX_PARTICLES_PER_EDGE = 36;

function particleColor(errorRate: number): string {
  if (!Number.isFinite(errorRate) || errorRate <= 0.05) return "56, 189, 248";
  if (errorRate <= 0.2) return "252, 211, 77";
  return "248, 113, 113";
}

export function TrafficParticleLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const viewport = useViewport();

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const viewportRef = useRef(viewport);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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

    const frame = (nowMs: number) => {
      const dt = Math.min(0.1, Math.max(0, (nowMs - lastMs) / 1000));
      lastMs = nowMs;
      elapsed += dt;

      const rect = parent.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const snapshot = simSnapshotRef.current;
      const vp = viewportRef.current;
      if (snapshot) {
        const centers = new Map<string, { x: number; y: number }>();
        for (const node of nodesRef.current) {
          centers.set(node.id, {
            x: node.position.x * vp.zoom + vp.x + NODE_CENTER_X * vp.zoom,
            y: node.position.y * vp.zoom + vp.y + NODE_CENTER_Y * vp.zoom,
          });
        }

        const dotRadius = Math.max(1.2, 2 * vp.zoom);
        for (const edge of edgesRef.current) {
          const from = centers.get(edge.source);
          const to = centers.get(edge.target);
          if (!from || !to) continue;
          const flow = snapshot.edges[edge.id];
          const rps = flow?.rps ?? 0;
          if (!(rps > 0.5)) continue;
          const latencyMs = flow?.latencyMs ?? 50;
          const err = flow?.errorRate ?? 0;
          const count = Math.max(1, Math.min(MAX_PARTICLES_PER_EDGE, Math.round(rps / 150)));
          const speed = Math.max(0.15, Math.min(2, 600 / (100 + latencyMs)));
          const rgb = particleColor(err);

          ctx.fillStyle = `rgba(${rgb}, 0.28)`;
          ctx.strokeStyle = `rgba(${rgb}, 0.28)`;
          ctx.lineWidth = Math.max(1, 1.5 * vp.zoom);
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();

          for (let i = 0; i < count; i += 1) {
            const t = (elapsed * speed + i / count) % 1;
            const x = from.x + (to.x - from.x) * t;
            const y = from.y + (to.y - from.y) * t;
            ctx.fillStyle = `rgba(${rgb}, 0.95)`;
            ctx.beginPath();
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            ctx.fill();
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

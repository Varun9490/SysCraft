'use client';

import { useEffect, useRef, useState } from "react";
import { useLearnerPlatformStore } from "@/store/useLearnerPlatformStore";

export type AmbientVariant = "aurora" | "grid" | "horizon";

interface AmbientFieldProps {
  variant?: AmbientVariant;
}

/**
 * Low-contrast, fixed background wash. All drawing happens inside rAF on a
 * canvas; React state changes only when the preference or motion setting
 * changes. Hidden tabs stop the loop entirely.
 */
export default function AmbientField({ variant = "grid" }: AmbientFieldProps) {
  const ambientPref = useLearnerPlatformStore((s) => Boolean(s.prefs?.ambient));
  const [enabled, setEnabled] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const evaluate = () => {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
      setEnabled(ambientPref && !reduce);
    };
    evaluate();
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    query?.addEventListener?.("change", evaluate);
    return () => query?.removeEventListener?.("change", evaluate);
  }, [ambientPref]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof document === "undefined") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    let elapsed = 0;
    let lastDraw = 0;
    let frame = 0;
    const AMBIENT_FRAME_MS = 1000 / 12;

    const resize = () => {
      // The wash is intentionally low contrast; a 1x backing store saves about
      // 24 MiB on a 1080p display versus a 2x retina canvas.
      const dpr = 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);

      if (variant === "grid") {
        const spacing = 28;
        const driftX = (t * 3) % spacing;
        const driftY = (t * 1.6) % spacing;
        ctx.fillStyle = "rgb(205 168 106 / 0.5)";
        for (let x = -spacing + driftX; x < width + spacing; x += spacing) {
          for (let y = -spacing + driftY; y < height + spacing; y += spacing) {
            ctx.beginPath();
            ctx.arc(x, y, 0.9, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        return;
      }

      if (variant === "horizon") {
        const bands = [
          { amp: 18, base: 0.74, color: "rgb(205 168 106 / 0.10)", speed: 0.25 },
          { amp: 27, base: 0.83, color: "rgb(118 150 170 / 0.09)", speed: 0.18 },
          { amp: 36, base: 0.92, color: "rgb(205 168 106 / 0.13)", speed: 0.12 },
        ];
        for (const band of bands) {
          ctx.beginPath();
          ctx.moveTo(0, height);
          for (let x = 0; x <= width + 12; x += 12) {
            const y = height * band.base + Math.sin(x / 180 + t * band.speed) * band.amp;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(width, height);
          ctx.closePath();
          ctx.fillStyle = band.color;
          ctx.fill();
        }
        return;
      }

      const blobs = [
        { x: 0.24, y: 0.3, r: 0.4, rgb: "205 168 106", speed: 0.09 },
        { x: 0.74, y: 0.56, r: 0.36, rgb: "118 150 170", speed: 0.06 },
        { x: 0.5, y: 0.86, r: 0.32, rgb: "205 168 106", speed: 0.04 },
      ];
      const radiusBase = Math.max(width, height);
      for (const blob of blobs) {
        const cx = (blob.x + Math.sin(t * blob.speed) * 0.06) * width;
        const cy = (blob.y + Math.cos(t * blob.speed * 0.8) * 0.05) * height;
        const radius = blob.r * radiusBase;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, `rgb(${blob.rgb} / 0.20)`);
        gradient.addColorStop(1, `rgb(${blob.rgb} / 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
    };

    const loop = (time: number) => {
      if (lastDraw === 0 || time - lastDraw >= AMBIENT_FRAME_MS) {
        if (lastDraw !== 0) elapsed += Math.min((time - lastDraw) / 1000, 0.25);
        lastDraw = time;
        draw(elapsed);
      }
      frame = window.requestAnimationFrame(loop);
    };

    const start = () => {
      if (frame || document.hidden) return;
      lastDraw = 0;
      frame = window.requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      } else {
        start();
      }
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, variant]);

  // Reduced motion / preference off: one static wash, no canvas loop at all.
  if (!enabled) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          opacity: 0.08,
          background:
            "radial-gradient(circle at 28% 22%, rgb(var(--accent) / 0.5), transparent 58%)",
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.18 }}
    />
  );
}

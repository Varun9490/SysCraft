'use client';

import { memo, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

type Pt = [number, number];

interface Layer {
  cy: number;
  w: number;
  d: number;
  label: string;
  sub: string;
  nodes: [number, number][];
}

const DEPTH = 18;
const NODE_S = 24;
const NODE_H = 9;

const LAYERS: Layer[] = [
  {
    cy: 108,
    w: 300,
    d: 150,
    label: "Edge · CDN",
    sub: "anycast",
    nodes: [
      [-66, 0],
      [0, -18],
      [66, 0],
    ],
  },
  {
    cy: 204,
    w: 322,
    d: 160,
    label: "API · Services",
    sub: "autoscaled",
    nodes: [
      [-92, 0],
      [-30, -22],
      [30, -22],
      [92, 0],
    ],
  },
  {
    cy: 300,
    w: 300,
    d: 150,
    label: "Cache · Queue",
    sub: "hot path",
    nodes: [
      [-66, 0],
      [0, -18],
      [66, 0],
    ],
  },
  {
    cy: 396,
    w: 262,
    d: 130,
    label: "Data · Shards",
    sub: "replicated",
    nodes: [
      [-72, 0],
      [-24, -18],
      [24, -18],
      [72, 0],
    ],
  },
];

function topFace(cx: number, cy: number, w: number, d: number): Pt[] {
  return [
    [cx, cy - d / 2],
    [cx + w / 2, cy],
    [cx, cy + d / 2],
    [cx - w / 2, cy],
  ];
}

function extrude(pts: Pt[], down: number): Pt[] {
  return pts.map(([x, y]) => [x, y + down] as Pt);
}

const poly = (pts: Pt[]) => pts.map((p) => `${p[0]},${p[1]}`).join(" ");

const CX = 232;

function NodeCube({ x, y, idx }: { x: number; y: number; idx: number }) {
  const top = topFace(x, y, NODE_S, NODE_S * 0.5);
  const raised = top.map(([px, py]) => [px, py - NODE_H] as Pt);
  const sideA: Pt[] = [raised[3], raised[2], top[2], top[3]];
  const sideB: Pt[] = [raised[2], raised[1], top[1], top[2]];
  const accent = idx % 3 === 0;

  return (
    <g>
      <polygon points={poly(sideA)} fill="#100F0D" />
      <polygon points={poly(sideB)} fill="#17150F" />
      <polygon
        points={poly(raised)}
        fill={accent ? "rgb(205 168 106 / 0.22)" : "#2C2A23"}
        stroke={accent ? "rgb(219 187 134 / 0.6)" : "rgb(255 255 255 / 0.08)"}
        strokeWidth={1}
      />
    </g>
  );
}

function LayerBlock({ layer, index }: { layer: Layer; index: number }) {
  const { cy, w, d, label, sub, nodes } = layer;
  const top = topFace(CX, cy, w, d);
  const bottom = extrude(top, DEPTH);
  const leftFace: Pt[] = [bottom[3], bottom[2], top[2], top[3]];
  const rightFace: Pt[] = [bottom[2], bottom[1], top[1], top[2]];

  return (
    <motion.g
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15 + index * 0.11, ease: [0.22, 1, 0.36, 1] }}
    >
      <polygon points={poly(leftFace)} fill="#0D0C0A" />
      <polygon points={poly(rightFace)} fill="#141210" />
      <polygon
        points={poly(top)}
        fill="#1C1A16"
        stroke="rgb(255 255 255 / 0.07)"
        strokeWidth={1}
      />
      <polygon
        points={poly(top)}
        fill="none"
        stroke="rgb(219 187 134 / 0.18)"
        strokeWidth={1}
      />

      {nodes.map(([nx, ny], i) => (
        <NodeCube key={i} x={CX + nx} y={cy + ny} idx={i + index} />
      ))}

      {/* annotation */}
      <line
        x1={CX + w / 2}
        y1={cy}
        x2={CX + w / 2 + 26}
        y2={cy}
        stroke="rgb(255 255 255 / 0.12)"
        strokeWidth={1}
      />
      <circle cx={CX + w / 2 + 26} cy={cy} r={2.5} fill="rgb(205 168 106)" />
      <text
        x={CX + w / 2 + 38}
        y={cy - 3}
        fill="#EEEAE3"
        fontSize="12.5"
        fontFamily="var(--font-outfit), sans-serif"
        fontWeight={500}
      >
        {label}
      </text>
      <text
        x={CX + w / 2 + 38}
        y={cy + 13}
        fill="#7A7468"
        fontSize="10"
        letterSpacing="0.14em"
        fontFamily="ui-monospace, monospace"
        style={{ textTransform: "uppercase" }}
      >
        {sub}
      </text>
    </motion.g>
  );
}

function Pulse({
  x,
  from,
  to,
  delay,
}: {
  x: number;
  from: number;
  to: number;
  delay: number;
}) {
  return (
    <motion.circle
      cx={x}
      r={3.4}
      fill="rgb(219 187 134)"
      initial={{ cy: from, opacity: 0 }}
      animate={{ cy: [from, to], opacity: [0, 1, 1, 0] }}
      transition={{
        duration: 2.6,
        delay,
        repeat: Infinity,
        repeatDelay: 0.5,
        ease: "easeInOut",
      }}
    />
  );
}

export const IsometricArchitecture = memo(function IsometricArchitecture({
  className,
}: {
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 120, damping: 18, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-9, 9]), spring);

  const connectors = LAYERS.slice(0, -1).map((layer, i) => {
    const next = LAYERS[i + 1];
    return {
      xRight: CX + layer.w / 2 - 30,
      xLeft: CX - next.w / 2 + 30,
      y0: layer.cy + DEPTH,
      y1: next.cy,
    };
  });

  return (
    <div ref={ref} className={`perspective-far ${className ?? ""}`} aria-hidden="true">
      <motion.div
        className="preserve-3d"
        style={{ rotateX, rotateY }}
        onPointerMove={(e) => {
          const el = ref.current;
          if (!el) return;
          const r = el.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => {
          px.set(0.5);
          py.set(0.5);
        }}
      >
        <svg viewBox="0 0 560 500" className="w-full max-w-[560px]" role="img">
          <defs>
            <radialGradient id="iso-glow" cx="50%" cy="34%" r="60%">
              <stop offset="0%" stopColor="rgb(205 168 106 / 0.16)" />
              <stop offset="100%" stopColor="rgb(205 168 106 / 0)" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="560" height="500" fill="url(#iso-glow)" />

          {/* flowing links between layers */}
          {connectors.map((c, i) => (
            <g key={i}>
              <path
                d={`M ${c.xRight} ${c.y0} L ${c.xRight} ${c.y1}`}
                stroke="rgb(205 168 106 / 0.35)"
                strokeWidth={1.4}
                fill="none"
                className="animate-dash"
              />
              <path
                d={`M ${c.xLeft} ${c.y0} L ${c.xLeft} ${c.y1 + 20}`}
                stroke="rgb(205 168 106 / 0.28)"
                strokeWidth={1.4}
                fill="none"
                className="animate-dash"
              />
              <Pulse x={c.xRight} from={c.y0} to={c.y1} delay={i * 0.7} />
              <Pulse x={c.xLeft} from={c.y1 + 20} to={c.y0} delay={i * 0.7 + 0.9} />
            </g>
          ))}

          {/* base shadow plate */}
          <polygon
            points={poly(topFace(CX, 432, 300, 150))}
            fill="rgb(0 0 0 / 0.5)"
          />

          {LAYERS.map((layer, i) => (
            <LayerBlock key={layer.label} layer={layer} index={i} />
          ))}
        </svg>
      </motion.div>
    </div>
  );
});

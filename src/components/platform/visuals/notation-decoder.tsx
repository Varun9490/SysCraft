'use client';

import { C, Frame, useStep, type VisualProps } from './Frame';

type Part = { t: string; label: string; c: string; size?: number; noPad?: boolean };
type NotationState = { title: string; parts: Part[]; lit: number; note: string };

/**
 * Five distinct notation states. Step 5 used to alias step 1 because the
 * component only ever drew λ/μ=ρ; each state now teaches the notation the
 * lesson actually introduces, and s === 4 is a genuine conclusion state.
 */
const STATES: NotationState[] = [
  {
    title: 'queueing',
    parts: [
      { t: 'λ', label: 'arrival', c: C.focus, size: 38 },
      { t: '/', label: '', c: C.border, size: 32, noPad: true },
      { t: 'μ', label: 'service', c: C.healthy, size: 38 },
      { t: '=', label: '', c: C.border, size: 30, noPad: true },
      { t: 'ρ', label: 'utilization', c: C.brass, size: 38 },
    ],
    lit: 4,
    note: 'ρ = λ / μ < 1 → stable queue',
  },
  {
    title: 'vectors · dot product',
    parts: [
      { t: 'w', label: 'weights', c: C.focus, size: 36 },
      { t: '·', label: '', c: C.border, size: 28, noPad: true },
      { t: 'x', label: 'input', c: C.healthy, size: 36 },
      { t: '+', label: '', c: C.border, size: 28, noPad: true },
      { t: 'b', label: 'bias', c: C.brass, size: 36 },
    ],
    lit: 1,
    note: 'y = w·x + b · shapes must align (n,)·(n,) → ( )',
  },
  {
    title: 'entropy',
    parts: [
      { t: 'H(X)', label: 'uncertainty', c: C.focus, size: 30 },
      { t: '=', label: '', c: C.border, size: 26, noPad: true },
      { t: '−Σ', label: 'sum', c: C.brass, size: 32 },
      { t: 'p', label: 'probability', c: C.healthy, size: 30 },
      { t: 'log p', label: 'surprise', c: C.warning, size: 26 },
    ],
    lit: 2,
    note: 'H = −Σ p·log₂p · bits, maximal at uniform',
  },
  {
    title: 'attention · softmax',
    parts: [
      { t: 'softmax', label: 'normalize', c: C.focus, size: 22 },
      { t: '(', label: '', c: C.border, size: 30, noPad: true },
      { t: 'QKᵀ', label: 'scores', c: C.healthy, size: 30 },
      { t: '/√d', label: 'scale', c: C.brass, size: 26 },
      { t: ')V', label: 'values', c: C.focus, size: 26 },
    ],
    lit: 3,
    note: 'softmax(QKᵀ/√d)V · √d keeps variance stable',
  },
  {
    title: 'KL divergence',
    parts: [
      { t: 'Dₖₗ', label: 'divergence', c: C.focus, size: 30 },
      { t: '(', label: '', c: C.border, size: 28, noPad: true },
      { t: 'P∥Q', label: 'distributions', c: C.healthy, size: 28 },
      { t: '=', label: '', c: C.border, size: 26, noPad: true },
      { t: 'Σ p log(p/q)', label: 'expectation', c: C.warning, size: 20 },
    ],
    lit: 4,
    note: 'Dₖₗ(P‖Q) ≥ 0 · zero iff P = Q',
  },
];

function widthOf(part: Part): number {
  const size = part.size ?? 34;
  return part.t.length * size * 0.62 + (part.noPad ? 6 : 26);
}

export function NotationDecoderVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const state = STATES[s] ?? STATES[0];

  const widths = state.parts.map(widthOf);
  const total = widths.reduce((a, b) => a + b, 0);
  const start = (640 - total) / 2;
  // Pure layout: derive each part's center from the sum of preceding widths,
  // avoiding mutation during render (react-hooks/immutability).
  const offsets = widths.map((_, i) => widths.slice(0, i).reduce((a, b) => a + b, 0));
  const placed = state.parts.map((part, i) => ({
    part,
    x: start + offsets[i] + widths[i] / 2,
    w: widths[i],
  }));

  return (
    <Frame title="notation decoder" step={s} active={active}>
      <text x="320" y="86" textAnchor="middle" fontSize="11" fill={C.focus}>
        {state.title}
      </text>

      <line x1="70" y1="230" x2="570" y2="230" stroke={C.border} strokeWidth="1" strokeOpacity="0.6" />

      {placed.map(({ part, x }, i) => {
        const lit = i === state.lit;
        const size = part.size ?? 34;
        return (
          <g key={`${s}-${i}`}>
            {lit ? (
              <circle cx={x} cy={172} r={Math.max(28, size * 0.85)} fill={part.c} fillOpacity="0.12" stroke={part.c} strokeWidth="1" />
            ) : null}
            <text
              x={x}
              y={180}
              textAnchor="middle"
              fontSize={size}
              fill={lit ? part.c : 'currentColor'}
            >
              {part.t}
            </text>
            {part.label ? (
              <text x={x} y={214} textAnchor="middle" fontSize="9" fill={lit ? part.c : C.border}>
                {part.label}
              </text>
            ) : null}
          </g>
        );
      })}

      <text x="320" y="288" textAnchor="middle" fontSize="11" fill={s === 4 ? C.healthy : C.brass}>
        {state.note}
      </text>
      <text x="320" y="326" textAnchor="middle" fontSize="9" fill={C.border}>
        {s === 4 ? 'read the symbol, then the shape, then the invariant' : 'identify symbol → shape → limiting case'}
      </text>
    </Frame>
  );
}

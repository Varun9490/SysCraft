'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

const HEADS = [0.1, 0.3, 0.55, 0.2, 0.6, 0.9, 0.5, 0.25];

export function TransformerArchitectureVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);

  return (
    <Frame title="transformer block" step={s} active={active}>
      <text x="320" y="74" textAnchor="middle" fontSize="10" fill={C.focus}>
        {[
          'token embeddings enter the stack',
          'Q / K / V projections',
          'scaled dot-product attention + softmax',
          'add & norm → feed-forward MLP',
          'stacked layers → output logits (final)',
        ][s]}
      </text>

      {s === 0 ? (
        <g>
          {['the', 'cat', 'sat'].map((t, i) => (
            <g key={t}>
              <rect x={90 + i * 170} y={140} width={120} height={56} rx={7} fill={C.brass} fillOpacity="0.16" stroke={C.brass} strokeWidth="1.2" />
              <text x={150 + i * 170} y={174} textAnchor="middle" fontSize="12" fill="currentColor">{t}</text>
              <text x={150 + i * 170} y={222} textAnchor="middle" fontSize="9" fill={C.border}>x{ i } + pos</text>
            </g>
          ))}
          <text x="320" y="280" textAnchor="middle" fontSize="10" fill={C.healthy}>
            embedding + positional signal → residual stream
          </text>
        </g>
      ) : null}

      {s === 1 ? (
        <g>
          <Panel x={60} y={170} w={110} h={54} label="x" color={C.focus} />
          {[
            { l: 'Wq → Q', c: C.brass, y: 104 },
            { l: 'Wk → K', c: C.healthy, y: 170 },
            { l: 'Wv → V', c: C.focus, y: 236 },
          ].map((row) => (
            <g key={row.l}>
              <Arrow x1={170} y1={197} x2={236} y2={row.y + 27} color={row.c} />
              <rect x={240} y={row.y} width={150} height={54} rx={7} fill={row.c} fillOpacity="0.14" stroke={row.c} strokeWidth="1.2" />
              <text x={315} y={row.y + 33} textAnchor="middle" fontSize="11" fill="currentColor">{row.l}</text>
            </g>
          ))}
          <Arrow x1={390} y1={197} x2={440} y2={197} color={C.brass} />
          <Panel x={444} y={170} w={130} h={54} label="head h" color={C.brass} sub="per token" />
        </g>
      ) : null}

      {s === 2 ? (
        <g>
          <text x="70" y="120" fontSize="9" fill={C.border}>softmax(QKᵀ/√d)</text>
          {HEADS.map((v, i) => (
            <g key={i}>
              <rect x={70 + i * 62} y={140} width={48} height={140} rx={5} fill={C.brass} fillOpacity="0.06" stroke={C.border} strokeWidth="1" />
              <rect x={70 + i * 62} y={280 - 140 * v} width={48} height={140 * v} rx={5} fill={C.brass} fillOpacity={0.25 + v * 0.5} stroke={C.brass} strokeWidth="1" />
              <text x={94 + i * 62} y={300} textAnchor="middle" fontSize="8" fill={C.border}>t{i}</text>
            </g>
          ))}
          <Arrow x1={290} y1={210} x2={410} y2={210} color={C.brass} />
          <Panel x={414} y={178} w={160} h={64} label="Σ weight·V" color={C.healthy} sub="weighted values" />
          <text x="320" y="340" textAnchor="middle" fontSize="9" fill={C.border}>
            √d scaling prevents saturated softmax before training
          </text>
        </g>
      ) : null}

      {s === 3 ? (
        <g>
          <Panel x={60} y={120} w={150} h={54} label="attention out" color={C.brass} />
          <Arrow x1={210} y1={147} x2={256} y2={147} color={C.brass} />
          <Panel x={260} y={120} w={150} h={54} label="add & norm" color={C.healthy} />
          <Arrow x1={410} y1={147} x2={454} y2={147} color={C.healthy} />
          <Panel x={458} y={120} w={122} h={54} label="MLP" color={C.focus} sub="expand → gelu → project" />
          <rect x={60} y={216} width={520} height={82} rx={8} fill={C.focus} fillOpacity="0.06" stroke={C.focus} strokeWidth="1.2" />
          <text x="320" y={246} textAnchor="middle" fontSize="10" fill="currentColor">residual stream carries information around each sublayer</text>
          <text x="320" y={274} textAnchor="middle" fontSize="9" fill={C.border}>layer norm keeps activations bounded</text>
        </g>
      ) : null}

      {s === 4 ? (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={70 + i * 160} y={130} width={130} height={80} rx={8} fill={C.brass} fillOpacity="0.1" stroke={C.brass} strokeWidth="1.3" />
              <text x={135 + i * 160} y={162} textAnchor="middle" fontSize="11" fill="currentColor">block {i + 1}</text>
              <text x={135 + i * 160} y={184} textAnchor="middle" fontSize="9" fill={C.border}>attn + MLP</text>
              {i < 2 ? <Arrow x1={200 + i * 160} y1={170} x2={228 + i * 160} y2={170} color={C.brass} /> : null}
            </g>
          ))}
          <Arrow x1={560} y1={170} x2={588} y2={170} color={C.healthy} />
          <Panel x={430} y={250} w={160} h={58} label="logits → next token" color={C.healthy} />
          <text x="320" y="340" textAnchor="middle" fontSize="9" fill={C.healthy}>
            depth trades compute for representational capacity
          </text>
        </g>
      ) : null}
    </Frame>
  );
}

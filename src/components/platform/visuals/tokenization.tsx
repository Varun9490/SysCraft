'use client';

import { Arrow, C, Frame, useStep, type VisualProps } from './Frame';

const CHARS = ['t', 'h', 'e', ' ', 'c', 'a', 't'];
const IDS = [1169, 262, 3972, 220, 7256];

function Chip({ x, y, w, label, sub, color }: { x: number; y: number; w: number; label: string; sub?: string; color: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={44} rx={7} fill={color} fillOpacity="0.14" stroke={color} strokeWidth="1.2" />
      <text x={x + w / 2} y={y + 27} textAnchor="middle" fontSize="13" fill="currentColor">
        {label}
      </text>
      {sub ? (
        <text x={x + w / 2} y={y + 58} textAnchor="middle" fontSize="9" fill={color}>
          {sub}
        </text>
      ) : null}
    </g>
  );
}

export function TokenizationVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);

  return (
    <Frame title="tokenization" step={s} active={active}>
      <text x="320" y="76" textAnchor="middle" fontSize="10" fill={C.focus}>
        {[
          'raw text · characters',
          'byte-pair merges',
          'token ids · vocabulary lookup',
          'sequence with specials',
          'context budget · truncation',
        ][s]}
      </text>

      {s === 0 ? (
        <g>
          {CHARS.map((ch, i) => (
            <Chip key={i} x={70 + i * 68} y={150} w={54} label={ch} color={C.brass} />
          ))}
          <text x="320" y="260" textAnchor="middle" fontSize="10" fill={C.border}>
            {"'the cat' → 7 characters, but the model never sees characters"}
          </text>
        </g>
      ) : null}

      {s === 1 ? (
        <g>
          <Chip x={90} y={140} w={70} label="l" sub="byte" color={C.focus} />
          <Chip x={200} y={140} w={70} label="ow" sub="byte" color={C.focus} />
          <Arrow x1={272} y1={162} x2={330} y2={162} color={C.brass} />
          <Chip x={342} y={140} w={110} label="low" sub="merged token" color={C.healthy} />
          <Chip x={90} y={224} w={70} label="e" sub="byte" color={C.focus} />
          <Chip x={200} y={224} w={70} label="r" sub="byte" color={C.focus} />
          <Arrow x1={272} y1={246} x2={330} y2={246} color={C.brass} />
          <Chip x={342} y={224} w={110} label="er" sub="merged token" color={C.healthy} />
        </g>
      ) : null}

      {s === 2 ? (
        <g>
          {IDS.map((id, i) => (
            <Chip key={i} x={58 + i * 106} y={150} w={88} label={String(id)} sub={['the', 'cat', ' sat', '', 'end'][i] ?? 'tok'} color={C.brass} />
          ))}
          <text x="320" y="260" textAnchor="middle" fontSize="10" fill={C.focus}>
            tokenizer and model must share the same vocabulary ids
          </text>
        </g>
      ) : null}

      {s === 3 ? (
        <g>
          <Chip x={70} y={150} w={80} label="BOS" sub="1" color={C.healthy} />
          {['the', 'cat', 'sat'].map((t, i) => (
            <Chip key={t} x={170 + i * 106} y={150} w={88} label={t} sub={String(i + 2)} color={C.brass} />
          ))}
          <Chip x={492} y={150} w={80} label="EOS" sub="6" color={C.healthy} />
          <text x="320" y="260" textAnchor="middle" fontSize="10" fill={C.border}>
            positions are implicit; each id carries an index into the context window
          </text>
        </g>
      ) : null}

      {s === 4 ? (
        <g>
          <text x="80" y="150" fontSize="10" fill={C.border}>
            budget
          </text>
          <rect x="80" y="166" width="480" height="34" rx={7} fill={C.border} fillOpacity="0.35" />
          <rect x="80" y="166" width={480 * 0.82} height="34" rx={7} fill={C.brass} fillOpacity="0.55" />
          <rect x={80 + 480 * 0.82} y="166" width={480 * 0.18} height="34" rx={7} fill={C.danger} fillOpacity="0.55" />
          <text x="320" y="188" textAnchor="middle" fontSize="11" fill="currentColor">
            82% used · 18% available
          </text>
          <text x="320" y="248" textAnchor="middle" fontSize="10" fill={C.healthy}>
            truncate oldest / keep specials · count tokens before the call
          </text>
          <text x="320" y="278" textAnchor="middle" fontSize="9" fill={C.danger}>
            never feed an over-budget sequence
          </text>
        </g>
      ) : null}
    </Frame>
  );
}

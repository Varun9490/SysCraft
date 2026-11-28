'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

const FP = [0.91, -0.44, 0.18, 0.73, -0.86, 0.31, -0.12, 0.58];

export function QuantizationVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);
  const absmax = 0.91;
  const scale = absmax / 127;
  const q = (v: number) => Math.max(-127, Math.min(127, Math.round(v / scale)));

  return (
    <Frame title="quantization" step={s} active={active}>
      <text x="320" y="74" textAnchor="middle" fontSize="10" fill={C.focus}>
        {[
          'FP32 weights · full precision',
          'compute scale from absmax',
          'round + clamp to INT8 grid',
          'dequantize · measure round-trip error',
          'calibrate · accuracy vs size (final)',
        ][s]}
      </text>

      {s === 0 || s === 1 ? (
        <g>
          <text x="70" y="120" fontSize="10" fill={C.border}>FP32</text>
          {FP.map((v, i) => {
            const x = 80 + i * 64;
            const h = Math.abs(v) * 90;
            const y = v >= 0 ? 200 - h : 200;
            return (
              <g key={i}>
                <line x1={x + 20} y1={110} x2={x + 20} y2={290} stroke={C.border} strokeOpacity="0.35" strokeWidth="0.8" />
                <rect x={x} y={y} width={40} height={h} rx={3} fill={C.brass} fillOpacity="0.55" stroke={C.brass} strokeWidth="0.8" />
              </g>
            );
          })}
          <line x1="70" y1="200" x2="590" y2="200" stroke={C.focus} strokeWidth="1" />
          {s === 1 ? (
            <g>
              <rect x="70" y="312" width="500" height={44} rx={7} fill={C.healthy} fillOpacity="0.1" stroke={C.healthy} strokeWidth="1.2" />
              <text x="320" y={332} textAnchor="middle" fontSize="11" fill="currentColor">{`scale = absmax / 127 ≈ ${scale.toFixed(4)}`}</text>
              <text x="320" y={348} textAnchor="middle" fontSize="9" fill={C.border}>zero-point maps the FP range onto the integer range</text>
            </g>
          ) : (
            <text x="320" y="340" textAnchor="middle" fontSize="9" fill={C.border}>
              outliers dominate absmax · per-channel scales help
            </text>
          )}
        </g>
      ) : null}

      {s === 2 ? (
        <g>
          <Panel x={60} y={140} w={120} h={54} label="FP32 value" color={C.focus} />
          <Arrow x1={180} y1={167} x2={226} y2={167} />
          <Panel x={230} y={140} w={140} h={54} label="÷ scale" color={C.brass} />
          <Arrow x1={370} y1={167} x2={416} y2={167} />
          <Panel x={420} y={140} w={90} h={54} label="round" color={C.warning} />
          <Arrow x1={510} y1={167} x2={546} y2={167} />
          <Panel x={550} y={140} w={62} h={54} label="clamp" color={C.danger} fontSize={10} />
          <text x={140} y={250} fontSize="11" fill={C.brass}>0.73</text>
          <text x={244} y={250} fontSize="11" fill={C.brass}>≈ 102</text>
          <text x={356} y={250} fontSize="11" fill={C.warning}>102</text>
          <text x={470} y={250} fontSize="11" fill={C.healthy}>q = 102</text>
          {FP.slice(0, 5).map((v, i) => (
            <text key={i} x={110 + i * 96} y={300} textAnchor="middle" fontSize="9" fill={C.border}>
              {`${v.toFixed(2)} → ${q(v)}`}
            </text>
          ))}
        </g>
      ) : null}

      {s === 3 ? (
        <g>
          <text x="70" y="120" fontSize="10" fill={C.border}>round-trip error</text>
          {FP.map((v, i) => {
            const deq = q(v) * scale;
            const err = Math.abs(deq - v);
            const x = 80 + i * 64;
            const h = Math.min(120, err * 600);
            return (
              <g key={i}>
                <rect x={x} y={210 - h} width={40} height={h} rx={3} fill={C.danger} fillOpacity="0.5" stroke={C.danger} strokeWidth="0.8" />
                <text x={x + 20} y={236} textAnchor="middle" fontSize="8" fill={C.border}>
                  {err.toFixed(3)}
                </text>
              </g>
            );
          })}
          <line x1="70" y1="210" x2="590" y2="210" stroke={C.focus} strokeWidth="1" />
          <text x="320" y="300" textAnchor="middle" fontSize="10" fill={C.healthy}>
            q×scale reconstructs an approximation, not the original
          </text>
          <text x="320" y="330" textAnchor="middle" fontSize="9" fill={C.border}>
            measure error on the whole path, not only tensor MSE
          </text>
        </g>
      ) : null}

      {s === 4 ? (
        <g>
          <Panel x={70} y={130} w={150} h={58} label="calibration set" color={C.focus} sub="representative" />
          <Arrow x1={220} y1={159} x2={272} y2={159} />
          <Panel x={276} y={130} w={130} h={58} label="int8 model" color={C.brass} sub="4× smaller" />
          <Arrow x1={406} y1={159} x2={458} y2={159} color={C.healthy} />
          <Panel x={462} y={130} w={110} h={58} label="eval gate" color={C.healthy} />
          <rect x="110" y="240" width="420" height="36" rx={7} fill={C.border} fillOpacity="0.4" />
          <rect x="110" y="240" width={420 * 0.88} height="36" rx={7} fill={C.healthy} fillOpacity="0.5" />
          <text x="320" y="263" textAnchor="middle" fontSize="10" fill="currentColor">quality retained · memory reduced</text>
          <text x="320" y="316" textAnchor="middle" fontSize="9" fill={C.healthy}>
            accept only if task quality and tail latency both pass the gate
          </text>
        </g>
      ) : null}
    </Frame>
  );
}

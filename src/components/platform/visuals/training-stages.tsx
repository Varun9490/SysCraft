'use client';

import { Arrow, C, Frame, Panel, useStep, type VisualProps } from './Frame';

export function TrainingStagesVisual({ stepIndex, active }: VisualProps) {
  const s = useStep(stepIndex);

  return (
    <Frame title="training stages" step={s} active={active}>
      <text x="320" y="74" textAnchor="middle" fontSize="10" fill={C.focus}>
        {[
          'pretraining · next-token objective',
          'base model · broad capability',
          'SFT · curated instruction pairs',
          'RLHF / DPO · preference alignment',
          'aligned model + eval gate (final)',
        ][s]}
      </text>

      {s === 0 ? (
        <g>
          <Panel x={70} y={150} w={150} h={58} label="raw corpus" color={C.focus} />
          <Arrow x1={220} y1={179} x2={272} y2={179} />
          <rect x={276} y={136} width={180} height={86} rx={8} fill={C.brass} fillOpacity="0.1" stroke={C.brass} strokeWidth="1.3" />
          <text x={366} y={166} textAnchor="middle" fontSize="11" fill="currentColor">{"\"the cat sat on the\""}</text>
          <text x={366} y={192} textAnchor="middle" fontSize="11" fill={C.brass}>{"→ predict \"mat\""}</text>
          <Arrow x1={456} y1={179} x2={506} y2={179} color={C.healthy} />
          <Panel x={510} y={150} w={80} h={58} label="loss" color={C.healthy} />
          <text x="320" y="280" textAnchor="middle" fontSize="9" fill={C.border}>
            self-supervised: labels come from the next token itself
          </text>
        </g>
      ) : null}

      {s === 1 ? (
        <g>
          <rect x={200} y={120} width={240} height={150} rx={10} fill={C.brass} fillOpacity="0.1" stroke={C.brass} strokeWidth="1.4" />
          <text x={320} y={160} textAnchor="middle" fontSize="13" fill="currentColor">base model</text>
          <text x={320} y={192} textAnchor="middle" fontSize="10" fill={C.border}>broad next-token distribution</text>
          <text x={320} y={220} textAnchor="middle" fontSize="10" fill={C.border}>no instruction following contract</text>
          <text x={320} y={248} textAnchor="middle" fontSize="10" fill={C.warning}>may be verbose, unsafe, or evasive</text>
        </g>
      ) : null}

      {s === 2 ? (
        <g>
          <Panel x={60} y={140} w={160} h={58} label="prompt / answer" color={C.focus} sub="curated pairs" />
          <Arrow x1={220} y1={169} x2={270} y2={169} />
          <Panel x={274} y={140} w={120} h={58} label="SFT" color={C.brass} sub="supervised loss" />
          <Arrow x1={394} y1={169} x2={444} y2={169} color={C.healthy} />
          <Panel x={448} y={140} w={132} h={58} label="instruct model" color={C.healthy} />
          <text x="320" y="256" textAnchor="middle" fontSize="9" fill={C.border}>
            train on the answer tokens only; quality of demonstrations dominates
          </text>
        </g>
      ) : null}

      {s === 3 ? (
        <g>
          <Panel x={60} y={124} w={140} h={52} label="preference pairs" color={C.focus} sub="chosen / rejected" />
          <Arrow x1={200} y1={150} x2={244} y2={150} color={C.brass} />
          <Panel x={248} y={124} w={130} h={52} label="reward model" color={C.brass} sub="proxy" />
          <Arrow x1={378} y1={150} x2={422} y2={150} color={C.warning} />
          <Panel x={426} y={124} w={150} h={52} label="PPO / DPO" color={C.warning} sub="policy update" />
          <rect x="70" y="224" width="500" height={92} rx={8} fill={C.danger} fillOpacity="0.08" stroke={C.danger} strokeWidth="1.1" />
          <text x="320" y={254} textAnchor="middle" fontSize="10" fill={C.danger}>
            proxy reward can be gamed · DPO skips the explicit reward model
          </text>
          <text x="320" y={284} textAnchor="middle" fontSize="9" fill={C.border}>
            keep a reference model to constrain drift
          </text>
        </g>
      ) : null}

      {s === 4 ? (
        <g>
          {['pretrain', 'SFT', 'align'].map((t, i) => (
            <g key={t}>
              <rect x={70 + i * 170} y={130} width={130} height={64} rx={7} fill={C.brass} fillOpacity="0.12" stroke={C.brass} strokeWidth="1.2" />
              <text x={135 + i * 170} y={168} textAnchor="middle" fontSize="11" fill="currentColor">{t}</text>
              {i < 2 ? <Arrow x1={200 + i * 170} y1={162} x2={238 + i * 170} y2={162} color={C.brass} /> : null}
            </g>
          ))}
          <Arrow x1={568} y1={162} x2={596} y2={162} color={C.healthy} />
          <Panel x={430} y={250} w={160} h={54} label="eval gate" color={C.healthy} sub="ship / hold" />
          <text x="320" y="340" textAnchor="middle" fontSize="9" fill={C.healthy}>
            capability alone is not readiness · measure behavior before release
          </text>
        </g>
      ) : null}
    </Frame>
  );
}

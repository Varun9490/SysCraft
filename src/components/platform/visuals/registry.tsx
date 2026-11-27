'use client';

import type { ComponentType, ReactElement } from 'react';

import { Arrow, C, Frame, Panel, type VisualProps } from './Frame';
import { TrafficFlowVisual } from './traffic-flow';
import { CacheRingVisual } from './cache-ring';
import { ConsistentHashVisual } from './consistent-hash';
import { BTreeLsmVisual } from './btree-lsm';
import { RaftElectionVisual } from './raft-election';
import { KafkaPartitionsVisual } from './kafka-partitions';
import { RateLimiterVisual } from './rate-limiter';
import { RagSpaceVisual } from './rag-space';
import { AttentionKvVisual } from './attention-kv';
import { ThreatDefenseVisual } from './threat-defense';
import { QueueWorkersVisual } from './queue-workers';
import { ReplicationVisual } from './replication';
import { ShardingVisual } from './sharding';
import { RealtimeChannelsVisual } from './realtime-channels';
import { SagaOutboxVisual } from './saga-outbox';
import { BloomHllVisual } from './bloom-hll';
import { DeployStrategiesVisual } from './deploy-strategies';
import { K8sAutoscaleVisual } from './k8s-autoscale';
import { AgentLoopVisual } from './agent-loop';
import { TokenMathVisual } from './token-math';
import { NotationDecoderVisual } from './notation-decoder';

function FallbackVisual({ stepIndex, active }: VisualProps): ReactElement {
  const s = ((stepIndex % 4) + 4) % 4;
  return (
    <Frame title="topic map" step={s} active={active}>
      <Panel x={60} y={160} w={140} h={66} label="input" color={C.focus} filled={s === 0} />
      <Arrow x1={200} y1={193} x2={246} y2={193} />
      <Panel x={250} y={160} w={140} h={66} label="process" color={C.brass} filled={s === 1 || s === 2} />
      <Arrow x1={390} y1={193} x2={436} y2={193} />
      <Panel x={440} y={160} w={140} h={66} label="output" color={C.healthy} filled={s === 3} />
      <text x="320" y="280" textAnchor="middle" fontSize="10" fill={C.border}>
        no visual for this topic
      </text>
    </Frame>
  );
}

const REGISTRY: Record<string, ComponentType<VisualProps>> = {
  'traffic-flow': TrafficFlowVisual,
  'cache-ring': CacheRingVisual,
  'consistent-hash': ConsistentHashVisual,
  'btree-lsm': BTreeLsmVisual,
  'raft-election': RaftElectionVisual,
  'kafka-partitions': KafkaPartitionsVisual,
  'rate-limiter': RateLimiterVisual,
  'rag-space': RagSpaceVisual,
  'attention-kv': AttentionKvVisual,
  'threat-defense': ThreatDefenseVisual,
  'queue-workers': QueueWorkersVisual,
  replication: ReplicationVisual,
  sharding: ShardingVisual,
  'realtime-channels': RealtimeChannelsVisual,
  'saga-outbox': SagaOutboxVisual,
  'bloom-hll': BloomHllVisual,
  'deploy-strategies': DeployStrategiesVisual,
  'k8s-autoscale': K8sAutoscaleVisual,
  'agent-loop': AgentLoopVisual,
  'token-math': TokenMathVisual,
  'notation-decoder': NotationDecoderVisual,
};

export function TopicVisual({
  visualId,
  stepIndex,
  active,
}: {
  visualId: string;
  stepIndex: number;
  active?: boolean;
}): ReactElement {
  const Visual = REGISTRY[visualId] ?? FallbackVisual;
  return <Visual stepIndex={stepIndex} active={active} />;
}

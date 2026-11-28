'use client';

import { lazy, Suspense, type ComponentType, type LazyExoticComponent, type ReactElement } from 'react';

import { Arrow, C, Frame, Panel, VisualTransitionContext, useStep, type VisualProps } from './Frame';

/**
 * Each visual is its own explicit dynamic import. Next's static export needs
 * literal specifiers here — never build the path from a variable. The module
 * scope factories below create the lazy wrappers but do not load any module
 * until TopicVisual actually renders a matching visualId.
 */
const TrafficFlowVisual = lazy(() => import('./traffic-flow').then((m) => ({ default: m.TrafficFlowVisual })));
const CacheRingVisual = lazy(() => import('./cache-ring').then((m) => ({ default: m.CacheRingVisual })));
const ConsistentHashVisual = lazy(() => import('./consistent-hash').then((m) => ({ default: m.ConsistentHashVisual })));
const BTreeLsmVisual = lazy(() => import('./btree-lsm').then((m) => ({ default: m.BTreeLsmVisual })));
const RaftElectionVisual = lazy(() => import('./raft-election').then((m) => ({ default: m.RaftElectionVisual })));
const KafkaPartitionsVisual = lazy(() => import('./kafka-partitions').then((m) => ({ default: m.KafkaPartitionsVisual })));
const RateLimiterVisual = lazy(() => import('./rate-limiter').then((m) => ({ default: m.RateLimiterVisual })));
const RagSpaceVisual = lazy(() => import('./rag-space').then((m) => ({ default: m.RagSpaceVisual })));
const AttentionKvVisual = lazy(() => import('./attention-kv').then((m) => ({ default: m.AttentionKvVisual })));
const ThreatDefenseVisual = lazy(() => import('./threat-defense').then((m) => ({ default: m.ThreatDefenseVisual })));
const QueueWorkersVisual = lazy(() => import('./queue-workers').then((m) => ({ default: m.QueueWorkersVisual })));
const ReplicationVisual = lazy(() => import('./replication').then((m) => ({ default: m.ReplicationVisual })));
const ShardingVisual = lazy(() => import('./sharding').then((m) => ({ default: m.ShardingVisual })));
const RealtimeChannelsVisual = lazy(() => import('./realtime-channels').then((m) => ({ default: m.RealtimeChannelsVisual })));
const SagaOutboxVisual = lazy(() => import('./saga-outbox').then((m) => ({ default: m.SagaOutboxVisual })));
const BloomHllVisual = lazy(() => import('./bloom-hll').then((m) => ({ default: m.BloomHllVisual })));
const DeployStrategiesVisual = lazy(() => import('./deploy-strategies').then((m) => ({ default: m.DeployStrategiesVisual })));
const K8sAutoscaleVisual = lazy(() => import('./k8s-autoscale').then((m) => ({ default: m.K8sAutoscaleVisual })));
const AgentLoopVisual = lazy(() => import('./agent-loop').then((m) => ({ default: m.AgentLoopVisual })));
const TokenMathVisual = lazy(() => import('./token-math').then((m) => ({ default: m.TokenMathVisual })));
const NotationDecoderVisual = lazy(() => import('./notation-decoder').then((m) => ({ default: m.NotationDecoderVisual })));
const TokenizationVisual = lazy(() => import('./tokenization').then((m) => ({ default: m.TokenizationVisual })));
const LruLfuVisual = lazy(() => import('./lru-lfu').then((m) => ({ default: m.LruLfuVisual })));
const PubsubRoutingVisual = lazy(() => import('./pubsub-routing').then((m) => ({ default: m.PubsubRoutingVisual })));
const ParkingAllocationVisual = lazy(() => import('./parking-allocation').then((m) => ({ default: m.ParkingAllocationVisual })));
const ElevatorDispatchVisual = lazy(() => import('./elevator-dispatch').then((m) => ({ default: m.ElevatorDispatchVisual })));
const LinuxNamespacesVisual = lazy(() => import('./linux-namespaces').then((m) => ({ default: m.LinuxNamespacesVisual })));
const K8sReconcileVisual = lazy(() => import('./k8s-reconcile').then((m) => ({ default: m.K8sReconcileVisual })));
const TransformerArchitectureVisual = lazy(() => import('./transformer-architecture').then((m) => ({ default: m.TransformerArchitectureVisual })));
const QuantizationVisual = lazy(() => import('./quantization').then((m) => ({ default: m.QuantizationVisual })));
const TrainingStagesVisual = lazy(() => import('./training-stages').then((m) => ({ default: m.TrainingStagesVisual })));
const SqlIndexingVisual = lazy(() => import('./sql-indexing').then((m) => ({ default: m.SqlIndexingVisual })));
const DnsHttpProtocolsVisual = lazy(() => import('./dns-http-protocols').then((m) => ({ default: m.DnsHttpProtocolsVisual })));
const ObservabilitySliVisual = lazy(() => import('./observability-sli').then((m) => ({ default: m.ObservabilitySliVisual })));
const ExpandContractVisual = lazy(() => import('./expand-contract').then((m) => ({ default: m.ExpandContractVisual })));
const CircuitBreakerVisual = lazy(() => import('./circuit-breaker').then((m) => ({ default: m.CircuitBreakerVisual })));
const SearchRankingVisual = lazy(() => import('./search-ranking').then((m) => ({ default: m.SearchRankingVisual })));

type VisualComponent = ComponentType<VisualProps> | LazyExoticComponent<ComponentType<VisualProps>>;

/**
 * Lightweight, static Frame-shaped placeholder. It doubles as the loading
 * boundary for a lazily imported visual and as the fallback for unknown ids.
 * It keeps the same Frame/Panel/Arrow styling and the same step cycle; reduced
 * motion is handled inside Frame, which renders at rest on the server and on
 * first client render.
 */
function FallbackVisual({ stepIndex, active }: VisualProps): ReactElement {
  const s = useStep(stepIndex);
  // s === 4 is a distinct verified final state, not a repeat of step 1.
  const final = s === 4;
  return (
    <Frame title="topic map" step={s} active={active}>
      <Panel x={60} y={160} w={140} h={66} label="input" color={C.focus} filled={s === 0} />
      <Arrow x1={200} y1={193} x2={246} y2={193} />
      <Panel x={250} y={160} w={140} h={66} label="process" color={C.brass} filled={s === 1 || s === 2} />
      <Arrow x1={390} y1={193} x2={436} y2={193} />
      <Panel x={440} y={160} w={140} h={66} label={final ? 'verified' : 'output'} color={C.healthy} filled={s === 3 || final} />
      <text x="320" y="280" textAnchor="middle" fontSize="10" fill={final ? C.healthy : C.border}>
        {final ? 'final state · verified' : 'no visual for this topic'}
      </text>
    </Frame>
  );
}

const REGISTRY: Record<string, VisualComponent> = {
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
  tokenization: TokenizationVisual,
  'lru-lfu': LruLfuVisual,
  'pubsub-routing': PubsubRoutingVisual,
  'parking-allocation': ParkingAllocationVisual,
  'elevator-dispatch': ElevatorDispatchVisual,
  'linux-namespaces': LinuxNamespacesVisual,
  'k8s-reconcile': K8sReconcileVisual,
  'transformer-architecture': TransformerArchitectureVisual,
  quantization: QuantizationVisual,
  'training-stages': TrainingStagesVisual,
  'sql-indexing': SqlIndexingVisual,
  'dns-http-protocols': DnsHttpProtocolsVisual,
  'observability-sli': ObservabilitySliVisual,
  'expand-contract': ExpandContractVisual,
  'circuit-breaker': CircuitBreakerVisual,
  'search-ranking': SearchRankingVisual,
};

export function TopicVisual({
  visualId,
  stepIndex,
  active,
  transitionKey,
}: {
  visualId: string;
  stepIndex: number;
  active?: boolean;
  /** Bumped on every committed step change by useScrollySteps. */
  transitionKey?: number;
}): ReactElement {
  const Visual = REGISTRY[visualId] ?? FallbackVisual;
  return (
    <VisualTransitionContext.Provider value={transitionKey ?? stepIndex}>
      {/* The provider stays outside the boundary so both the placeholder and
          the resolved visual read the same monotonic transition version. */}
      <Suspense fallback={<FallbackVisual stepIndex={stepIndex} active={active} />}>
        <Visual stepIndex={stepIndex} active={active} />
      </Suspense>
    </VisualTransitionContext.Provider>
  );
}

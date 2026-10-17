'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, X } from "@/components/ui/icons";
import { compactionSpike, writeAmplification } from "@/engine/queuingMath";
import type { VisualKind } from "@/types/encyclopedia";

/**
 * C4 zoom-in micro-simulators: B-Tree vs LSM-Tree write amplification, Raft
 * leader election, consistent-hash ring membership, and token-bucket rate
 * limiting. Every tab runs a genuine interactive model (no canned frames)
 * driven by the same clamped math as the 20Hz simulation worker.
 */

export type SimTab = "btree_vs_lsm" | "raft_election" | "consistent_hash_ring" | "token_bucket";

interface InternalSimModalProps {
  open: boolean;
  initialTab?: VisualKind | SimTab;
  onClose: () => void;
}

const TABS: Array<{ id: SimTab; label: string }> = [
  { id: "btree_vs_lsm", label: "B-Tree vs LSM" },
  { id: "raft_election", label: "Raft Election" },
  { id: "consistent_hash_ring", label: "Hash Ring" },
  { id: "token_bucket", label: "Token Bucket" },
];

function resolveTab(initialTab?: VisualKind | SimTab): SimTab {
  if (
    initialTab === "btree_vs_lsm" ||
    initialTab === "raft_election" ||
    initialTab === "consistent_hash_ring" ||
    initialTab === "token_bucket"
  ) {
    return initialTab;
  }
  return "btree_vs_lsm";
}

function fnv1a32(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/* ---------------- B-Tree vs LSM-Tree ---------------- */

function BTreeVsLsmSim() {
  const [writeRatio, setWriteRatio] = useState(0.6);
  const [running, setRunning] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [logicalWrites, setLogicalWrites] = useState(0);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setElapsed((e) => (e + 0.5) % 120);
      setLogicalWrites((w) => w + 50);
    }, 500);
    return () => clearInterval(timer);
  }, [running]);

  const btreeAmp = writeAmplification("b_tree", writeRatio, elapsed);
  const lsmAmp = writeAmplification("lsm_tree", writeRatio, elapsed);
  const spike = compactionSpike(elapsed);

  const spark = useMemo(() => {
    const points: string[] = [];
    for (let s = 0; s <= 60; s += 1) {
      const v = compactionSpike(s);
      const x = 8 + (s / 60) * 284;
      const y = 44 - v * 140;
      points.push(`${s === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return points.join(" ");
  }, []);

  const maxAmp = Math.max(btreeAmp, lsmAmp, 1);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-zinc-100">Write amplification</h4>
          <button
            onClick={() => setRunning((r) => !r)}
            className="flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            {running ? <Pause size={12} /> : <Play size={12} />} {running ? "Pause" : "Run"}
          </button>
        </div>
        <label className="mb-1 block text-xs text-zinc-400">
          Write ratio {(writeRatio * 100).toFixed(0)}% · t={elapsed.toFixed(1)}s ·{" "}
          {logicalWrites.toLocaleString()} logical writes
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(writeRatio * 100)}
          onChange={(e) => setWriteRatio(Number(e.target.value) / 100)}
          className="mb-3 w-full"
        />
        {[
          { name: "B-Tree (random I/O penalty)", amp: btreeAmp, color: "#f59e0b" },
          { name: "LSM-Tree (memtable + SST)", amp: lsmAmp, color: "#34d399" },
        ].map((row) => (
          <div key={row.name} className="mb-2">
            <div className="mb-0.5 flex justify-between text-xs">
              <span className="text-zinc-300">{row.name}</span>
              <span className="tabular-nums text-zinc-100">{row.amp.toFixed(2)}×</span>
            </div>
            <div className="h-3 overflow-hidden rounded bg-zinc-800">
              <div
                className="h-full rounded transition-all"
                style={{ width: `${(row.amp / (maxAmp + 0.5)) * 100}%`, backgroundColor: row.color }}
              />
            </div>
          </div>
        ))}
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">
          Physical writes ≈ {Math.round(logicalWrites * lsmAmp).toLocaleString()} (LSM) vs{" "}
          {Math.round(logicalWrites * btreeAmp).toLocaleString()} (B-Tree). LSM wins write-heavy
          workloads until a compaction spike (below) briefly adds +{(spike * 100).toFixed(0)}% I/O.
        </p>
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
        <h4 className="mb-2 text-sm font-semibold text-zinc-100">LSM compaction spike (60s cycle)</h4>
        <svg viewBox="0 0 300 52" className="w-full rounded bg-zinc-950">
          <path d={spark} fill="none" stroke="#34d399" strokeWidth={2} />
        </svg>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded bg-zinc-950 p-2">
            <p className="text-zinc-500">Point read</p>
            <p className="font-semibold text-zinc-100">B-Tree O(log n)</p>
          </div>
          <div className="rounded bg-zinc-950 p-2">
            <p className="text-zinc-500">Range scan</p>
            <p className="font-semibold text-zinc-100">LSM O(k)</p>
          </div>
          <div className="rounded bg-zinc-950 p-2">
            <p className="text-zinc-500">Space amp</p>
            <p className="font-semibold text-zinc-100">LSM ~1.2×</p>
          </div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">
          Rule of thumb: B-Tree for read-heavy OLTP with in-place updates (Postgres); LSM for
          write-heavy time-series and wide partitions (Cassandra, RocksDB).
        </p>
      </div>
    </div>
  );
}

/* ---------------- Raft election ---------------- */

type RaftRole = "follower" | "candidate" | "leader";

interface RaftNode {
  id: number;
  role: RaftRole;
  term: number;
  timeoutMs: number;
}

interface RaftEvent {
  tick: number;
  text: string;
}

function RaftSim() {
  const [nodeCount, setNodeCount] = useState(5);
  const [running, setRunning] = useState(true);
  const [nodes, setNodes] = useState<RaftNode[]>(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      role: i === 0 ? ("leader" as RaftRole) : ("follower" as RaftRole),
      term: 1,
      timeoutMs: 300 + Math.floor(Math.random() * 300),
    })),
  );
  const [events, setEvents] = useState<RaftEvent[]>([{ tick: 0, text: "n0 elected leader for term 1" }]);
  const tickRef = useRef(0);

  useEffect(() => {
    setNodes((prev) => {
      if (prev.length === nodeCount) return prev;
      return Array.from({ length: nodeCount }, (_, i) => ({
        id: i,
        role: i === 0 ? ("leader" as RaftRole) : ("follower" as RaftRole),
        term: 1,
        timeoutMs: 300 + Math.floor(Math.random() * 300),
      }));
    });
    setEvents([{ tick: 0, text: `cluster resized to ${nodeCount} voters` }]);
    tickRef.current = 0;
  }, [nodeCount]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      tickRef.current += 1;
      const tick = tickRef.current;
      setNodes((prev) => {
        const next = prev.map((n) => ({ ...n }));
        const leader = next.find((n) => n.role === "leader");
        if (leader) {
          for (const n of next) {
            if (n.role !== "leader") n.timeoutMs = 300 + ((n.id * 137 + tick * 59) % 300);
          }
          return next;
        }
        for (const n of next) {
          if (n.role === "follower") {
            n.timeoutMs -= 100;
            if (n.timeoutMs <= 0) {
              n.role = "candidate";
              n.term += 1;
            }
          }
        }
        const candidates = next.filter((n) => n.role === "candidate");
        if (candidates.length > 0) {
          const winner = candidates.reduce((a, b) => (b.term > a.term || (b.term === a.term && b.id < a.id) ? b : a));
          const majority = Math.floor(next.length / 2) + 1;
          const votes = 1 + next.filter((n) => n.role === "follower" && (n.id + winner.term) % 3 !== 0).length;
          if (votes >= majority) {
            for (const n of next) {
              n.role = n.id === winner.id ? "leader" : "follower";
              n.term = Math.max(n.term, winner.term);
              n.timeoutMs = 300 + ((n.id * 137 + tick * 59) % 300);
            }
            setEvents((evs) =>
              [{ tick, text: `n${winner.id} elected leader for term ${winner.term} (${votes}/${next.length} votes)` }, ...evs].slice(0, 8),
            );
          } else {
            setEvents((evs) =>
              [{ tick, text: `term ${winner.term} split vote — retrying` }, ...evs].slice(0, 8),
            );
            for (const n of next) {
              if (n.role === "candidate") {
                n.role = "follower";
                n.timeoutMs = 300 + ((n.id * 137 + tick * 59) % 300);
              }
            }
          }
        }
        return next;
      });
    }, 400);
    return () => clearInterval(timer);
  }, [running]);

  const killLeader = () => {
    const leader = nodes.find((n) => n.role === "leader");
    setNodes((prev) => {
      const survivors = prev.filter((n) => n.role !== "leader");
      return survivors.map((n) => ({ ...n, role: "follower" as RaftRole, timeoutMs: 120 + n.id * 40 }));
    });
    setEvents((evs) =>
      [{ tick: tickRef.current, text: leader ? `n${leader.id} partitioned — followers timing out` : "no leader to kill" }, ...evs].slice(0, 8),
    );
  };

  const reset = () => {
    tickRef.current = 0;
    setNodes(
      Array.from({ length: nodeCount }, (_, i) => ({
        id: i,
        role: i === 0 ? ("leader" as RaftRole) : ("follower" as RaftRole),
        term: 1,
        timeoutMs: 300 + Math.floor(Math.random() * 300),
      })),
    );
    setEvents([{ tick: 0, text: "cluster reset — n0 pre-voted leader term 1" }]);
  };

  const leader = nodes.find((n) => n.role === "leader");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-zinc-100">
            {nodeCount} voters · {leader ? `leader n${leader.id} (term ${leader.term})` : "no leader — electing…"}
          </h4>
          <div className="flex gap-1">
            <button
              onClick={() => setRunning((r) => !r)}
              className="flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              {running ? <Pause size={12} /> : <Play size={12} />} {running ? "Pause" : "Run"}
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </div>
        <label className="mb-1 block text-xs text-zinc-400">Voters: {nodeCount}</label>
        <input
          type="range"
          min={3}
          max={7}
          step={2}
          value={nodeCount}
          onChange={(e) => setNodeCount(Number(e.target.value))}
          className="mb-3 w-full"
        />
        <div className="flex flex-wrap gap-2">
          {nodes.map((n) => (
            <div
              key={n.id}
              className={`w-24 rounded-lg border p-2 text-center ${
                n.role === "leader"
                  ? "border-emerald-400/70 bg-emerald-500/10"
                  : n.role === "candidate"
                    ? "border-amber-400/70 bg-amber-500/10"
                    : "border-zinc-700 bg-zinc-950"
              }`}
            >
              <p className="text-sm font-bold text-zinc-100">n{n.id}</p>
              <p
                className={`text-[11px] font-semibold uppercase ${
                  n.role === "leader" ? "text-emerald-300" : n.role === "candidate" ? "text-amber-300" : "text-zinc-400"
                }`}
              >
                {n.role}
              </p>
              <p className="text-[11px] tabular-nums text-zinc-500">term {n.term}</p>
            </div>
          ))}
        </div>
        <button
          onClick={killLeader}
          className="mt-3 w-full rounded-md bg-red-500 py-1.5 text-xs font-semibold text-white hover:bg-red-400"
        >
          Partition the leader
        </button>
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
        <h4 className="mb-2 text-sm font-semibold text-zinc-100">Election log</h4>
        <ul className="space-y-1.5">
          {events.map((e, i) => (
            <li key={`${e.tick}-${i}`} className="rounded bg-zinc-950 px-2 py-1.5 text-xs text-zinc-300">
              <span className="mr-2 tabular-nums text-zinc-500">t{e.tick}</span>
              {e.text}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">
          Quorum is ⌊N/2⌋+1: a 5-voter cluster survives 2 failures. Randomized timeouts (300–600ms)
          make split votes rare; pre-vote + leader leases prevent disruptive re-elections.
        </p>
      </div>
    </div>
  );
}

/* ---------------- Consistent hash ring ---------------- */

const RING_KEYS = 512;
const VNODES_PER_NODE = 120;

function HashRingSim() {
  const [physicalCount, setPhysicalCount] = useState(4);
  const [previousCount, setPreviousCount] = useState(4);

  const layout = useMemo(() => {
    const build = (count: number) => {
      const vnodes: Array<{ angle: number; owner: number }> = [];
      for (let p = 0; p < count; p += 1) {
        for (let v = 0; v < VNODES_PER_NODE; v += 1) {
          vnodes.push({ angle: (fnv1a32(`node-${p}#${v}`) % 36000) / 100, owner: p });
        }
      }
      vnodes.sort((a, b) => a.angle - b.angle);
      const ownerOf = (angle: number): number => {
        let lo = 0;
        let hi = vnodes.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if ((vnodes[mid]?.angle ?? 0) < angle) lo = mid + 1;
          else hi = mid;
        }
        return vnodes[lo % vnodes.length]?.owner ?? 0;
      };
      const keys: Array<{ angle: number; owner: number }> = [];
      for (let k = 0; k < RING_KEYS; k += 1) {
        const angle = (fnv1a32(`key-${k}`) % 36000) / 100;
        keys.push({ angle, owner: ownerOf(angle) });
      }
      return keys;
    };
    const current = build(physicalCount);
    const previous = build(previousCount);
    let remapped = 0;
    if (previousCount !== physicalCount) {
      for (let k = 0; k < RING_KEYS; k += 1) {
        if ((current[k]?.owner ?? -1) !== (previous[k]?.owner ?? -2)) remapped += 1;
      }
    }
    return { keys: current, remapped };
  }, [physicalCount, previousCount]);

  const palette = ["#CDA86A", "#34d399", "#f59e0b", "#f472b6", "#a78bfa", "#f87171", "#22d3ee", "#a3e635"];
  const size = 300;
  const center = size / 2;
  const radius = size / 2 - 18;
  const polar = (angleDeg: number, r: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: center + r * Math.cos(rad), y: center + r * Math.sin(rad) };
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-72">
          <circle cx={center} cy={center} r={radius} fill="none" stroke="#3f3f46" strokeWidth={2} />
          {layout.keys.map((k, i) => {
            const p = polar(k.angle, radius);
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={2.1}
                fill={palette[k.owner % palette.length]}
                opacity={0.85}
              />
            );
          })}
          {Array.from({ length: physicalCount }, (_, p) => {
            const marker = polar((p / Math.max(1, physicalCount)) * 360, radius);
            return (
              <g key={p}>
                <circle cx={marker.x} cy={marker.y} r={7} fill={palette[p % palette.length]} stroke="#09090b" strokeWidth={2} />
                <text x={marker.x} y={marker.y + 3.5} textAnchor="middle" fontSize={8} fontWeight={700} fill="#09090b">
                  {p}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="mt-1 text-xs text-zinc-500">
          {RING_KEYS} keys · {VNODES_PER_NODE} vnodes/node · FNV-1a placement
        </p>
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
        <h4 className="mb-2 text-sm font-semibold text-zinc-100">Minimal-disruption membership</h4>
        <label className="mb-1 block text-xs text-zinc-400">Physical nodes: {physicalCount}</label>
        <input
          type="range"
          min={2}
          max={8}
          value={physicalCount}
          onChange={(e) => {
            setPreviousCount(physicalCount);
            setPhysicalCount(Number(e.target.value));
          }}
          className="mb-3 w-full"
        />
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded bg-zinc-950 p-2">
            <p className="text-[11px] text-zinc-500">Keys remapped</p>
            <p className="text-lg font-bold tabular-nums text-amber-300">
              {layout.remapped} <span className="text-xs font-normal">({((layout.remapped / RING_KEYS) * 100).toFixed(1)}%)</span>
            </p>
          </div>
          <div className="rounded bg-zinc-950 p-2">
            <p className="text-[11px] text-zinc-500">Ideal K/N</p>
            <p className="text-lg font-bold tabular-nums text-emerald-300">
              {Math.round(RING_KEYS / physicalCount)} <span className="text-xs font-normal">keys/node</span>
            </p>
          </div>
        </div>
        <div className="mt-2 space-y-1">
          {Array.from({ length: physicalCount }, (_, p) => {
            const owned = layout.keys.filter((k) => k.owner === p).length;
            return (
              <div key={p} className="flex items-center gap-2 text-xs">
                <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: palette[p % palette.length] }} />
                <span className="text-zinc-400">node {p}</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-zinc-800">
                  <div
                    className="h-full rounded"
                    style={{ width: `${(owned / RING_KEYS) * 100}%`, backgroundColor: palette[p % palette.length] }}
                  />
                </div>
                <span className="w-16 text-right tabular-nums text-zinc-300">{owned} keys</span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">
          Adding a node remaps only ~K/N keys — compare with mod-N hashing, which remaps nearly all
          of them and melts backing stores during scale-out.
        </p>
      </div>
    </div>
  );
}

/* ---------------- Token bucket ---------------- */

function TokenBucketSim() {
  const [capacity, setCapacity] = useState(120);
  const [refillPerSec, setRefillPerSec] = useState(60);
  const [autoTraffic, setAutoTraffic] = useState(true);
  const [tokens, setTokens] = useState(120);
  const [allowed, setAllowed] = useState(0);
  const [denied, setDenied] = useState(0);

  useEffect(() => {
    setTokens((t) => Math.min(capacity, t));
  }, [capacity]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTokens((t) => Math.min(capacity, t + refillPerSec * 0.1));
      if (autoTraffic) {
        const burst = 2 + Math.floor(Math.random() * 9);
        setTokens((t) => {
          const take = Math.min(t, burst);
          const rejected = burst - take;
          setAllowed((a) => a + take);
          setDenied((d) => d + rejected);
          return t - take;
        });
      }
    }, 100);
    return () => clearInterval(timer);
  }, [autoTraffic, capacity, refillPerSec]);

  const sendRequest = (count: number) => {
    setTokens((t) => {
      const take = Math.min(t, count);
      setAllowed((a) => a + take);
      setDenied((d) => d + (count - take));
      return t - take;
    });
  };

  const total = allowed + denied;
  const denyPct = total > 0 ? (denied / total) * 100 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
        <h4 className="mb-2 text-sm font-semibold text-zinc-100">Bucket level</h4>
        <div className="mb-1 flex justify-between text-xs tabular-nums text-zinc-400">
          <span>{tokens.toFixed(0)} / {capacity} tokens</span>
          <span>refill {refillPerSec}/s</span>
        </div>
        <div className="h-8 overflow-hidden rounded-md bg-zinc-950">
          <div
            className={`h-full rounded-md transition-all ${tokens < capacity * 0.2 ? "bg-red-400" : "bg-sky-400"}`}
            style={{ width: `${(tokens / Math.max(1, capacity)) * 100}%` }}
          />
        </div>
        <label className="mb-1 mt-3 block text-xs text-zinc-400">Capacity: {capacity}</label>
        <input type="range" min={10} max={500} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="w-full" />
        <label className="mb-1 mt-2 block text-xs text-zinc-400">Refill rate: {refillPerSec}/s</label>
        <input type="range" min={5} max={300} value={refillPerSec} onChange={(e) => setRefillPerSec(Number(e.target.value))} className="w-full" />
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => sendRequest(1)}
            className="flex-1 rounded-md bg-sky-500 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-sky-400"
          >
            Send 1
          </button>
          <button
            onClick={() => sendRequest(50)}
            className="flex-1 rounded-md bg-amber-400 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-300"
          >
            Burst 50
          </button>
          <button
            onClick={() => setAutoTraffic((a) => !a)}
            className={`flex-1 rounded-md border py-1.5 text-xs font-semibold ${
              autoTraffic ? "border-emerald-400/60 text-emerald-300" : "border-zinc-700 text-zinc-400"
            }`}
          >
            Auto {autoTraffic ? "on" : "off"}
          </button>
        </div>
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
        <h4 className="mb-2 text-sm font-semibold text-zinc-100">Admission verdicts</h4>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded bg-zinc-950 p-2">
            <p className="text-[11px] text-zinc-500">Allowed</p>
            <p className="text-lg font-bold tabular-nums text-emerald-300">{allowed.toLocaleString()}</p>
          </div>
          <div className="rounded bg-zinc-950 p-2">
            <p className="text-[11px] text-zinc-500">Denied 429</p>
            <p className="text-lg font-bold tabular-nums text-red-300">{denied.toLocaleString()}</p>
          </div>
          <div className="rounded bg-zinc-950 p-2">
            <p className="text-[11px] text-zinc-500">Deny %</p>
            <p className="text-lg font-bold tabular-nums text-amber-300">{denyPct.toFixed(1)}%</p>
          </div>
        </div>
        <button
          onClick={() => {
            setAllowed(0);
            setDenied(0);
          }}
          className="mt-2 w-full rounded-md border border-zinc-700 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Reset counters
        </button>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">
          Capacity absorbs bursts; refill sets the sustained rate. Denied requests should return
          HTTP 429 with a Retry-After header — exactly what the simulator models on throttled
          gateway nodes.
        </p>
      </div>
    </div>
  );
}

/* ---------------- Modal shell ---------------- */

export function InternalSimModal({ open, initialTab, onClose }: InternalSimModalProps) {
  const [tab, setTab] = useState<SimTab>(() => resolveTab(initialTab));

  useEffect(() => {
    if (open) setTab(resolveTab(initialTab));
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/75 p-3" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Internal algorithm simulator"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-50">Internal simulator — zoom inside the node</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
            aria-label="Close simulator"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold ${
                tab === t.id ? "bg-sky-500 text-zinc-950" : "text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === "btree_vs_lsm" && <BTreeVsLsmSim />}
        {tab === "raft_election" && <RaftSim />}
        {tab === "consistent_hash_ring" && <HashRingSim />}
        {tab === "token_bucket" && <TokenBucketSim />}
      </div>
    </div>
  );
}

'use client';

import { useMemo } from "react";
import { Lock, Map as MapIcon } from "lucide-react";
import { useLearningStore } from "@/store/useLearningStore";

/**
 * Visual DAG of system-design skill domains.
 * A skill unlocks when every dependency is unlocked; the badge shows the
 * live FSRS due count across the skill's modules so review pressure is
 * visible at a glance. Clicking an unlocked skill opens its first module.
 */

interface SkillDef {
  id: string;
  label: string;
  moduleIds: string[];
  dependsOn: string[];
  position: { x: number; y: number };
}

const SKILLS: SkillDef[] = [
  { id: "foundations", label: "Foundations", moduleIds: ["microservices-monolith", "cap-theorem"], dependsOn: [], position: { x: 88, y: 230 } },
  { id: "traffic", label: "Traffic & Edge", moduleIds: ["load-balancing", "rate-limiting"], dependsOn: ["foundations"], position: { x: 278, y: 110 } },
  { id: "caching", label: "Caching", moduleIds: ["caching-strategies", "bloom-filters"], dependsOn: ["foundations"], position: { x: 278, y: 230 } },
  { id: "partitioning", label: "Partitioning", moduleIds: ["sharding-partitioning", "consistent-hashing"], dependsOn: ["foundations"], position: { x: 278, y: 350 } },
  { id: "messaging", label: "Messaging", moduleIds: ["message-queues", "event-streaming", "gossip-protocol"], dependsOn: ["traffic"], position: { x: 468, y: 110 } },
  { id: "storage", label: "Storage Engines", moduleIds: ["btree-vs-lsm"], dependsOn: ["partitioning"], position: { x: 468, y: 230 } },
  { id: "consistency", label: "Consistency", moduleIds: ["replication", "acid-vs-base", "merkle-trees"], dependsOn: ["partitioning"], position: { x: 468, y: 350 } },
  { id: "retrieval", label: "AI Retrieval", moduleIds: ["vector-search", "llm-systems"], dependsOn: ["storage", "messaging"], position: { x: 658, y: 110 } },
  { id: "observability", label: "Observability", moduleIds: ["observability-tracing"], dependsOn: ["messaging", "consistency"], position: { x: 658, y: 230 } },
  { id: "consensus", label: "Consensus", moduleIds: ["raft-consensus"], dependsOn: ["consistency"], position: { x: 658, y: 350 } },
];

const WIDTH = 760;
const HEIGHT = 460;

interface SkillConstellationProps {
  onSelectModule?: (moduleId: string) => void;
}

export function SkillConstellation({ onSelectModule }: SkillConstellationProps) {
  const unlockedSkills = useLearningStore((s) => s.unlockedSkills);
  const cards = useLearningStore((s) => s.cards);
  const cardModule = useLearningStore((s) => s.cardModule);
  const unlockSkill = useLearningStore((s) => s.unlockSkill);

  const unlocked = useMemo(() => new Set(unlockedSkills), [unlockedSkills]);

  const dueBySkill = useMemo(() => {
    const now = Date.now();
    const counts = new Map<string, number>();
    for (const skill of SKILLS) counts.set(skill.id, 0);
    const moduleToSkill = new Map<string, string>();
    for (const skill of SKILLS) {
      for (const moduleId of skill.moduleIds) moduleToSkill.set(moduleId, skill.id);
    }
    for (const card of Object.values(cards)) {
      const moduleId = cardModule[card.cardId];
      const skillId = moduleId ? moduleToSkill.get(moduleId) : undefined;
      if (!skillId) continue;
      if (new Date(card.due).getTime() <= now) {
        counts.set(skillId, (counts.get(skillId) ?? 0) + 1);
      }
    }
    return counts;
  }, [cards, cardModule]);

  const edges = useMemo(() => {
    const byId = new Map(SKILLS.map((s) => [s.id, s]));
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; live: boolean }> = [];
    for (const skill of SKILLS) {
      for (const dep of skill.dependsOn) {
        const from = byId.get(dep);
        if (!from) continue;
        lines.push({
          x1: from.position.x,
          y1: from.position.y,
          x2: skill.position.x,
          y2: skill.position.y,
          live: unlocked.has(dep) && unlocked.has(skill.id),
        });
      }
    }
    return lines;
  }, [unlocked]);

  const activate = (skill: SkillDef, isUnlocked: boolean) => {
    if (!isUnlocked) return;
    if (skill.moduleIds.length > 0) onSelectModule?.(skill.moduleIds[0] ?? "");
    for (const next of SKILLS) {
      if (next.dependsOn.includes(skill.id) && next.dependsOn.every((d) => unlocked.has(d) || d === skill.id)) {
        unlockSkill(next.id);
      }
    }
    unlockSkill(skill.id);
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="mb-2 flex items-center gap-2">
        <MapIcon size={15} className="text-violet-300" />
        <h4 className="text-sm font-semibold text-zinc-100">Skill constellation</h4>
        <span className="text-xs text-zinc-500">
          {unlocked.size}/{SKILLS.length} unlocked
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
          <svg width={WIDTH} height={HEIGHT} className="absolute inset-0">
            {edges.map((e, i) => (
              <line
                key={i}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                stroke={e.live ? "#8b5cf6" : "#3f3f46"}
                strokeWidth={e.live ? 2.5 : 1.5}
                strokeDasharray={e.live ? undefined : "5 4"}
              />
            ))}
          </svg>
          {SKILLS.map((skill) => {
            const isUnlocked = unlocked.has(skill.id);
            const due = dueBySkill.get(skill.id) ?? 0;
            return (
              <button
                key={skill.id}
                onClick={() => activate(skill, isUnlocked)}
                disabled={!isUnlocked}
                className={`absolute w-36 -translate-x-1/2 -translate-y-1/2 rounded-lg border p-2 text-center transition-colors ${
                  isUnlocked
                    ? "border-violet-400/60 bg-violet-500/10 hover:bg-violet-500/20"
                    : "cursor-not-allowed border-zinc-800 bg-zinc-900/70 opacity-60"
                }`}
                style={{ left: skill.position.x, top: skill.position.y }}
                title={isUnlocked ? `${skill.moduleIds.length} modules — click to study` : `Complete ${skill.dependsOn.join(", ")} first`}
              >
                <span className="flex items-center justify-center gap-1 text-xs font-bold text-zinc-100">
                  {!isUnlocked && <Lock size={11} className="text-zinc-500" />}
                  {skill.label}
                </span>
                <span className="mt-0.5 block text-[10px] text-zinc-400">
                  {due > 0 ? `${due} due for review` : `${skill.moduleIds.length} modules`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Exploring a skill auto-unlocks its dependents. Review due cards to keep the constellation lit.
      </p>
    </div>
  );
}

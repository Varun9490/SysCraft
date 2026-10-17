'use client';

import { BrainCircuit, Flame, Sparkles, Zap } from "@/components/ui/icons";

export type LabDifficulty = "starter" | "standard" | "advanced" | "staff_plus";

const DIFFICULTY_META: Record<
  LabDifficulty,
  { label: string; className: string; Icon: typeof Zap }
> = {
  starter: {
    label: "Starter",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    Icon: Zap,
  },
  standard: {
    label: "Standard",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    Icon: Sparkles,
  },
  advanced: {
    label: "Advanced",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    Icon: Flame,
  },
  staff_plus: {
    label: "Staff+",
    className: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    Icon: BrainCircuit,
  },
};

export function DifficultyBadge({ difficulty }: { difficulty: LabDifficulty }) {
  const meta = DIFFICULTY_META[difficulty] ?? DIFFICULTY_META.standard;
  const { Icon } = meta;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.className}`}
    >
      <Icon size={11} />
      {meta.label}
    </span>
  );
}

export function CompanyBadge({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}

export function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-2.5">
      <span className="text-sm font-semibold tabular-nums text-zinc-100">{value}</span>
      <span className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</span>
    </div>
  );
}

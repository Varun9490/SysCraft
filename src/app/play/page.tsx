import Link from "next/link";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { PlayArena } from "@/components/play/PlayArena";

export const metadata = {
  title: "Play — Nine System Design Game Modes | SysCraft",
  description:
    "Nine deterministic game modes: Estimate Sprint, Pattern Match, Debug the Outage, Bottleneck Hunt, the UTC-seeded Daily Puzzle, and simulation-backed challenges that run on the seeded Web Worker engine.",
};

export default function PlayPage() {
  return (
    <SiteChrome>
      <div className="section-container py-10">
        <header className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-16 -top-10 h-56 w-56 rounded-full bg-brass/10 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -left-24 top-20 h-44 w-44 rounded-full bg-sky-500/10 blur-3xl" aria-hidden />
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-brass">
            Insert coin ·
          </p>
          <h1 className="mt-2 bg-gradient-to-r from-zinc-50 via-zinc-200 to-zinc-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent md:text-5xl">
            The System Design Arcade
          </h1>
          <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-zinc-400">
            Nine deterministic puzzle cabinets plus five live-workspace challenges: estimate throughput like a PMM,
            recall outage patterns like an SRE, hunt bottlenecks like a perf engineer — then break real systems in the{" "}
            <Link href="/labs" className="text-sky-400 hover:text-sky-300">
              labs
            </Link>{" "}
            and keep your bests on-device.
          </p>
        </header>
        <div className="mt-8">
          <PlayArena />
        </div>
        <p className="mx-auto mt-8 max-w-4xl text-[12px] leading-relaxed text-zinc-600">
          Every question is deterministic — same seed, same challenge, every time. Simulation-backed modes deep-link into
          the{" "}
          <Link href="/labs" className="text-sky-400 hover:text-sky-300">
            guided labs
          </Link>{" "}
          and the{" "}
          <Link href="/canvas" className="text-sky-400 hover:text-sky-300">
            free canvas
          </Link>
          , where the same seeded simulation engine grades your build. Personal bests are stored on-device.
        </p>
      </div>
    </SiteChrome>
  );
}

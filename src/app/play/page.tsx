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
        <PlayArena />
        <p className="mx-auto mt-8 max-w-4xl text-[12px] leading-relaxed text-zinc-600">
          Every question is deterministic — same seed, same challenge, every time. Simulation-backed modes deep-link into the{" "}
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

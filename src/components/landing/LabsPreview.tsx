'use client';

import Link from "next/link";
import { ArrowRight, Clock } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/motion";
import { DifficultyBadge } from "@/components/ui/Badge";
import { GlowCard } from "@/components/ui/GlowCard";
import { GUIDED_LABS } from "@/data/guidedLabs";
import { getCompanyBrand } from "@/data/companyBrands";
import { formatRps, labCleanTitle, labExcerpt } from "@/data/labMeta";

const FEATURED_LAB_IDS = [
  "bitly-url-shortener",
  "youtube-upload-playback",
  "whatsapp-chat",
  "uber-matching",
  "netflix-streaming",
  "razorpay-payments",
  "distributed-rate-limiter",
  "dynamodb-from-scratch",
];

function LabCard({ labId, interactive = true }: { labId: string; interactive?: boolean }) {
  const lab = GUIDED_LABS.find((l) => l.id === labId);
  if (!lab) return null;
  const brand = getCompanyBrand(lab.id);

  return (
    <div className="mr-5 w-[300px] shrink-0" aria-hidden={interactive ? undefined : true}>
      <GlowCard className="h-full">
        <Link
          href={`/labs/${lab.id}`}
          tabIndex={interactive ? undefined : -1}
          className={`flex h-full flex-col p-5 ${interactive ? "" : "pointer-events-none"}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold" style={{ color: brand.color }}>
              {brand.company}
            </span>
            <DifficultyBadge difficulty={lab.difficulty} />
          </div>

          <h3 className="mt-3 text-[14px] font-medium leading-snug text-content">{labCleanTitle(lab)}</h3>
          <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-content-secondary">{labExcerpt(lab)}</p>

          <div className="mt-auto flex items-center gap-3 pt-4 font-mono text-[11px] tabular-nums text-content-tertiary">
            <span className="inline-flex items-center gap-1">
              <Clock size={11} />
              {lab.estimatedMinutes} min
            </span>
            <span>·</span>
            <span>{formatRps(lab.targetRps)}</span>
          </div>
        </Link>
      </GlowCard>
    </div>
  );
}

export function LabsPreview() {
  const featured = FEATURED_LAB_IDS.filter((id) => GUIDED_LABS.some((lab) => lab.id === id));

  return (
    <section className="py-24 md:py-32">
      <div className="section-container flex flex-wrap items-end justify-between gap-6">
        <Reveal>
          <span className="eyebrow">Hands-on labs</span>
          <h2 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.05] tracking-tighter text-content md:text-5xl">
            Design the systems you use every day
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-content-secondary">
            Pick a company, start from a blank canvas, and design it from scratch. Every lab is graded against real SLOs,
            budgets, and topology rules.
          </p>
        </Reveal>

        <Link
          href="/labs"
          className="group inline-flex items-center gap-2 rounded-full border border-line bg-app px-5 py-2.5 text-sm font-medium text-content transition-colors hover:border-brass/40 hover:bg-app-raised"
        >
          View all {GUIDED_LABS.length} labs
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="relative mt-14 [mask-image:linear-gradient(to_right,transparent,black_7%,black_93%,transparent)]">
        <div className="group flex overflow-hidden">
          <div className="flex shrink-0 animate-marquee items-stretch group-hover:[animation-play-state:paused]">
            {featured.map((id) => (
              <LabCard key={`a-${id}`} labId={id} />
            ))}
            {featured.map((id) => (
              <LabCard key={`b-${id}`} labId={id} interactive={false} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

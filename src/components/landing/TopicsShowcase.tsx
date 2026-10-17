'use client';

import Link from "next/link";
import { ArrowRight, Gauge, Network, Layers } from "@/components/ui/icons";
import { Reveal, StaggerChild, StaggerGroup, TiltCard } from "@/components/ui/motion";

const PREVIEWS = [
  {
    slug: "consistent-hashing",
    title: "Consistent hashing",
    body: "Drag the node count and watch keys rediscover their home on the ring — then break it and see the remap stop being a stampede.",
    Icon: Network,
  },
  {
    slug: "caching-strategies",
    title: "Caching strategies",
    body: "Tune cache size and access skew. Watch the LRU hit-rate curve bend in real time as the working set outgrows the cache.",
    Icon: Layers,
  },
  {
    slug: "rate-limiting",
    title: "Rate limiting",
    body: "A live token bucket. Pull the refill rate and burst ceiling, then flood it and watch rejections separate from admits.",
    Icon: Gauge,
  },
];

export function TopicsShowcase() {
  return (
    <section className="section-container py-20 md:py-24">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <Reveal className="lg:col-span-5" x={-24}>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Interactive topics</span>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-content md:text-4xl">
            Don&apos;t read the theory. Move the slider.
          </h2>
          <p className="mt-4 text-pretty text-[15px] leading-relaxed text-content-secondary">
            Each topic is a living simulation. Every parameter is a control, every metric recalculates as you drag,
            and every concept is mapped to the AWS, Azure, GCP, and Cloudflare services that implement it.
          </p>
          <Link
            href="/topics"
            className="group mt-7 inline-flex items-center gap-2 text-sm font-semibold text-brass"
          >
            Browse all topics
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>

        <StaggerGroup className="grid gap-4 lg:col-span-7" stagger={0.1}>
          {PREVIEWS.map((preview) => {
            const { Icon } = preview;
            return (
              <StaggerChild key={preview.slug}>
                <TiltCard
                  intensity={5}
                  className="group relative overflow-hidden rounded-2xl border border-line bg-app/60 p-6 shadow-card"
                >
                  <Link href={`/topics/${preview.slug}`} className="flex items-start gap-4">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-app-raised text-brass">
                      <Icon size={19} weight="bold" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-[15px] font-semibold text-content">
                        {preview.title}
                        <ArrowRight
                          size={14}
                          className="text-content-tertiary transition-transform group-hover:translate-x-1 group-hover:text-brass"
                        />
                      </span>
                      <span className="mt-1.5 block text-[13px] leading-relaxed text-content-secondary">
                        {preview.body}
                      </span>
                    </span>
                  </Link>
                </TiltCard>
              </StaggerChild>
            );
          })}
        </StaggerGroup>
      </div>
    </section>
  );
}

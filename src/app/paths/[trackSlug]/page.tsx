import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { TrackLessons } from "@/components/platform/player/TrackLessons";
import { getTrack, TRACKS } from "@/content/platform/registry";

export const dynamicParams = false;

export function generateStaticParams() {
  return TRACKS.map((track) => ({ trackSlug: track.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ trackSlug: string }>;
}): Promise<Metadata> {
  const { trackSlug } = await params;
  const track = getTrack(trackSlug);
  if (!track) return { title: "Path not found" };
  return {
    title: `${track.title} — Learning path`,
    description: track.summary,
    openGraph: { title: `${track.title} — Learning path`, description: track.summary, type: "article" },
  };
}

export default async function TrackPage({ params }: { params: Promise<{ trackSlug: string }> }) {
  const { trackSlug } = await params;
  const track = getTrack(trackSlug);
  if (!track) notFound();
  return (
    <SiteChrome>
      <TrackLessons track={track} />
    </SiteChrome>
  );
}

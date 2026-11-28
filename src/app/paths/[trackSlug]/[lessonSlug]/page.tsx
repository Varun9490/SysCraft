import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { LessonPlayer } from "@/components/platform/player/LessonPlayer";
import { getLesson, getTrack, TRACKS } from "@/content/platform/registry";
import { canonicalAlternates, routeCanonical } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return TRACKS.flatMap((track) =>
    track.lessons.map((lesson) => ({ trackSlug: track.slug, lessonSlug: lesson.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ trackSlug: string; lessonSlug: string }>;
}): Promise<Metadata> {
  const { trackSlug, lessonSlug } = await params;
  const lesson = getLesson(trackSlug, lessonSlug);
  if (!lesson) return { title: "Lesson not found", robots: { index: false } };
  const canonical = routeCanonical("paths", trackSlug, lessonSlug);
  return {
    title: lesson.title,
    description: lesson.summary,
    ...canonicalAlternates("paths", trackSlug, lessonSlug),
    openGraph: { title: lesson.title, description: lesson.summary, type: "article", url: canonical },
  };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ trackSlug: string; lessonSlug: string }>;
}) {
  const { trackSlug, lessonSlug } = await params;
  const track = getTrack(trackSlug);
  const lesson = getLesson(trackSlug, lessonSlug);
  if (!track || !lesson || lesson.trackId !== track.id) notFound();
  return (
    <SiteChrome>
      <LessonPlayer lesson={lesson} />
    </SiteChrome>
  );
}

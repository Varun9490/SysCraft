import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { TopicPageContent } from "@/components/topics/TopicPageContent";
import { getTopic, TOPICS } from "@/data/topics";

export function generateStaticParams() {
  return TOPICS.map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) return { title: "Topic — SysCraft" };
  return {
    title: `${topic.title} — Topic`,
    description: topic.tagline,
    openGraph: {
      title: `${topic.title} — Topic`,
      description: topic.tagline,
      type: "article",
    },
    twitter: { card: "summary_large_image" as const },
  };
}

export default async function TopicDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();
  return (
    <SiteChrome>
      <TopicPageContent topic={topic} />
    </SiteChrome>
  );
}

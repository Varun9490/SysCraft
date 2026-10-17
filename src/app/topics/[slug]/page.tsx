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
  return {
    title: topic ? `${topic.title} — SysCanvas Topics` : "Topic — SysCanvas",
    description: topic?.tagline,
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

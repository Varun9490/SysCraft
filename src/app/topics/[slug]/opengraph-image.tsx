import { renderOgCard } from "@/lib/og";
import { getTopic, TOPICS } from "@/data/topics";

/** Per-topic OG card: the interactive simulator's title line. */

export const dynamic = "force-static";

export const alt = "SysCraft interactive topic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return TOPICS.map((topic) => ({ slug: topic.slug }));
}

export default async function TopicOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = getTopic(slug);

  if (!topic) {
    return renderOgCard({
      badge: "INTERACTIVE TOPIC",
      title: "SysCraft Topics",
      subtitle: "This topic is not in the sandbox.",
    });
  }

  const tagline = topic.tagline.length > 150 ? `${topic.tagline.slice(0, 147)}...` : topic.tagline;
  return renderOgCard({
    badge: "INTERACTIVE TOPIC",
    title: topic.title,
    subtitle: tagline,
  });
}

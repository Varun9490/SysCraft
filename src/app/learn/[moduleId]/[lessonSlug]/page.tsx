import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { LessonPageContent } from "@/components/learn/LessonPageContent";
import { getLessonBlog } from "@/data/lessonBlogs";
import { LESSON_ROUTES, findLessonRoute } from "@/lib/lessonRoutes";

interface Params {
  moduleId: string;
  lessonSlug: string;
}

export function generateStaticParams(): Params[] {
  return LESSON_ROUTES.map((r) => ({ moduleId: r.moduleId, lessonSlug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { moduleId, lessonSlug } = await params;
  const route = findLessonRoute(moduleId, lessonSlug);
  if (!route) return { title: "Lesson not found" };
  const blog = getLessonBlog(route.moduleId, route.lessonIndex);
  const description = blog.whatYouWillLearn.join(" · ").slice(0, 180);
  return {
    title: `${route.title} — ${route.moduleTitle}`,
    description,
    openGraph: {
      title: `${route.title} — SysCraft`,
      description,
      type: "article",
      url: route.href,
    },
    twitter: { card: "summary_large_image" as const },
    alternates: { canonical: route.href },
  };
}

export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const { moduleId, lessonSlug } = await params;
  const route = findLessonRoute(moduleId, lessonSlug);
  if (!route) notFound();

  return (
    <SiteChrome>
      <LessonPageContent route={route} />
    </SiteChrome>
  );
}

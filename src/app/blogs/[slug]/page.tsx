import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { BlogReader } from "@/components/platform/player/BlogReader";
import { BLOGS, getBlog } from "@/content/platform/registry";
import { canonicalAlternates, routeCanonical } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return BLOGS.map((blog) => ({ slug: blog.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const blog = getBlog(slug);
  if (!blog) return { title: "Field note not found", robots: { index: false } };
  const canonical = routeCanonical("blogs", slug);
  return {
    title: blog.title,
    description: blog.dek,
    ...canonicalAlternates("blogs", slug),
    openGraph: { title: blog.title, description: blog.dek, type: "article", url: canonical },
  };
}

export default async function BlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const blog = getBlog(slug);
  if (!blog) notFound();
  return (
    <SiteChrome>
      <BlogReader post={blog} />
    </SiteChrome>
  );
}

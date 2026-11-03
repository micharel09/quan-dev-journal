import BlogArticle from "@/components/journal/blog-article";
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <BlogArticle slug={slug} />;
}

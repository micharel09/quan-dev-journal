import { Suspense } from "react";
import BlogList from "@/components/journal/blog-list";
export const metadata = { title: "Blog | Quan Dev Journal" };
export default function BlogPage() {
  return (
    <Suspense fallback={<p>Loading articles…</p>}>
      <BlogList />
    </Suspense>
  );
}

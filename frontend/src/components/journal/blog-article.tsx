"use client";
import Link from "@/components/link";
import { useEffect, useState } from "react";
import { readJournal } from "./api";
import { Article } from "./types";
import { ArticleBody } from "./article-body";

export default function BlogArticle({ slug }: { slug: string }) {
  const [article, setArticle] = useState<Article>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    setArticle(undefined);
    readJournal<Article>(`/${encodeURIComponent(slug)}`)
      .then((data) => {
        if (active) setArticle(data);
      })
      .catch((cause: Error) => {
        if (active) setError(cause.message);
      });
    return () => {
      active = false;
    };
  }, [slug, retry]);
  if (error)
    return (
      <div role="alert">
        <p>{error}</p>
        <button onClick={() => setRetry(retry + 1)}>Try again</button>
        <Link href="/blog">All posts</Link>
      </div>
    );
  if (!article) return <p role="status">Loading article…</p>;
  return (
    <article className="journal-post">
      <ArticleBody
        body={article.markdown}
        header={
          <header className="post-head">
            <Link href="/blog">← All posts</Link>
            <h1>{article.title}</h1>
            <div className="tags">
              {article.tags.map((tag) => (
                <Link
                  className="tag"
                  href={`/blog?tag=${encodeURIComponent(tag)}`}
                  key={tag}
                >
                  #{tag}
                </Link>
              ))}
            </div>
            <p className="byline">
              <strong>{article.author}</strong> ·{" "}
              <time dateTime={article.createdAt}>
                {article.createdAt.slice(0, 10)}
              </time>{" "}
              ·{" "}
              {Math.max(
                1,
                Math.ceil(article.markdown.split(/\s+/).length / 200)
              )}{" "}
              min read
            </p>
          </header>
        }
      />
    </article>
  );
}

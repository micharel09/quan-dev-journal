"use client";
import Link from "@/components/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { readJournal } from "./api";
import { ArticleList } from "./types";

// Karhdo ListLayout + PostRow + TagFilterChips + Pagination port, query URL adaptation.
export default function BlogList() {
  const params = useSearchParams();
  const q = params.get("q") || "";
  const tag = params.get("tag") || "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [data, setData] = useState<ArticleList>();
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setData(undefined);
    setError("");
    const query = new URLSearchParams({
      q,
      tag,
      page: String(page),
      limit: "10",
    });
    Promise.all([
      readJournal<ArticleList>(`?${query}`),
      readJournal<string[]>("/tags"),
    ])
      .then(([result, nextTags]) => {
        if (active) {
          setData(result);
          setTags(nextTags);
        }
      })
      .catch((cause: Error) => {
        if (active) setError(cause.message);
      });
    return () => {
      active = false;
    };
  }, [q, tag, page, retry]);
  const href = (nextTag: string, nextPage = 1) =>
    `/blog?${new URLSearchParams({ q, tag: nextTag, page: String(nextPage) })}`;
  return (
    <section className="journal-list">
      <header className="list-heading">
        <p className="eyebrow">Engineering notes</p>
        <h1>Blog</h1>
        <p>Notes from building and testing software.</p>
        <form action="/blog" className="journal-search">
          <label htmlFor="search-posts">Search posts</label>
          <input
            key={q}
            id="search-posts"
            name="q"
            defaultValue={q}
            placeholder="Title or summary"
          />
          <input type="hidden" name="tag" value={tag} />
          <button type="submit">Search</button>
        </form>
      </header>
      <div className="filters" role="group" aria-label="Filter by tag">
        <Link
          className="filter-chip"
          href={href("")}
          aria-current={!tag ? "page" : undefined}
        >
          all
        </Link>
        {tags.map((item) => (
          <Link
            key={item}
            className="filter-chip"
            href={href(item)}
            aria-current={tag === item ? "page" : undefined}
          >
            {item}
          </Link>
        ))}
      </div>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => setRetry(retry + 1)}>Try again</button>
        </div>
      ) : !data ? (
        <p role="status">Loading articles…</p>
      ) : (
        <>
          {!data.articles.length && (
            <p role="status">No articles found. Try another search or tag.</p>
          )}
          <div className="post-list">
            {data.articles.map((article) => (
              <Link
                className="post-row"
                key={article.slug}
                href={`/blog/${article.slug}`}
              >
                <time dateTime={article.createdAt}>
                  {article.createdAt.slice(0, 10)}
                </time>
                <div className="body">
                  <h2 className="title">
                    <span className="line">{article.title}</span>
                  </h2>
                  <p className="summary">{article.summary}</p>
                  <div className="tags">
                    {article.tags.map((item) => (
                      <span className="tag" key={item}>
                        <span className="hash">#</span>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="meta">
                  {Math.max(
                    1,
                    Math.ceil(article.markdown.split(/\s+/).length / 200)
                  )}{" "}
                  min <span className="arrow">→</span>
                </span>
              </Link>
            ))}
          </div>
          <nav className="pager" aria-label="Pagination">
            {page > 1 ? (
              <Link className="pager-link" href={href(tag, page - 1)}>
                ← Previous
              </Link>
            ) : (
              <span className="pager-link" aria-disabled="true">
                ← Previous
              </span>
            )}
            <span className="pager-status">
              Page {page} of {Math.max(1, Math.ceil(data.total / 10))}
            </span>
            {page * 10 < data.total ? (
              <Link className="pager-link" href={href(tag, page + 1)}>
                Next →
              </Link>
            ) : (
              <span className="pager-link" aria-disabled="true">
                Next →
              </span>
            )}
          </nav>
        </>
      )}
    </section>
  );
}

"use client";
import Markdown from "react-markdown";
import { useMemo, useState, useEffect, type ReactNode } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { visit } from "unist-util-visit";
import { toString } from "mdast-util-to-string";
import GithubSlugger from "github-slugger";
import type { Root } from "mdast";

// Conduit ArticleBody: React tree, no raw HTML. Karhdo TOC uses the SAME AST/IDs as prose.
export function ArticleBody({
  body,
  header,
}: {
  body: string;
  header?: ReactNode;
}) {
  const { headings, plugin } = useMemo(() => {
    const headings: { slug: string; text: string; depth: number }[] = [];
    const decorate = (tree: Root, collect = false) => {
      const slugger = new GithubSlugger();
      visit(tree, "heading", (node) => {
        const text = toString(node);
        const slug = slugger.slug(text);
        node.data = { ...node.data, hProperties: { id: slug } };
        if (collect && node.depth >= 2 && node.depth <= 3)
          headings.push({ slug, text, depth: node.depth });
      });
    };
    decorate(unified().use(remarkParse).parse(body), true);
    return { headings, plugin: () => (tree: Root) => decorate(tree) };
  }, [body]);
  const [current, setCurrent] = useState("");
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let active = headings[0]?.slug || "";
      const atBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2;
      for (const heading of headings)
        if (
          atBottom ||
          (document.getElementById(heading.slug)?.getBoundingClientRect().top ??
            Infinity) <= 140
        )
          active = heading.slug;
      setCurrent(active);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [headings]);
  const toc = (
    <nav aria-label="On this page">
      <ol className="toc-list">
        {headings.map((heading) => (
          <li key={heading.slug}>
            <a
              href={`#${heading.slug}`}
              data-depth={heading.depth}
              aria-current={current === heading.slug ? "true" : undefined}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
  return (
    <div className="post-grid">
      <div className="post-content">
        {header}
        {headings.length > 0 && (
          <details className="mobile-toc">
            <summary>On this page</summary>
            {toc}
          </details>
        )}
        <div className="prose">
          <Markdown skipHtml remarkPlugins={[plugin]}>
            {body}
          </Markdown>
        </div>
      </div>
      {headings.length > 0 && (
        <aside className="desktop-toc">
          <div>
            <p className="eyebrow">On this page</p>
            {toc}
          </div>
        </aside>
      )}
    </div>
  );
}

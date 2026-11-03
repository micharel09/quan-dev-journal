"use client";
import { useEffect, useState } from "react";
import AdminGate from "@/components/journal/admin-gate";
import useFetch from "@/services/api/use-fetch";
import { API_URL } from "@/services/api/config";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useConfirmDialog from "@/components/confirm-dialog/use-confirm-dialog";
import ArticleEditor from "@/components/journal/article-editor";
import { Article, ArticleList } from "@/components/journal/types";

function Articles() {
  const fetch = useFetch();
  const { confirmDialog } = useConfirmDialog();
  const [data, setData] = useState<ArticleList>();
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<Article | "new" | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    setData(undefined);
    fetch(`${API_URL}/v1/articles?page=${page}&limit=10`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load articles.");
        const result: ArticleList = await response.json();
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setError("Could not load articles. Try again.");
      });
    return () => {
      active = false;
    };
  }, [fetch, page, revision]);
  const remove = async (article: Article) => {
    if (
      !(await confirmDialog({
        title: "Delete article?",
        message: article.title,
      }))
    )
      return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(
        `${API_URL}/v1/articles/${encodeURIComponent(article.slug)}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error();
      if (data?.articles.length === 1 && page > 1) setPage(page - 1);
      else setRevision(revision + 1);
    } catch {
      setError("Could not delete the article. Try again.");
    } finally {
      setPending(false);
    }
  };
  if (editor)
    return (
      <ArticleEditor
        key={editor === "new" ? "new" : editor.slug}
        article={editor === "new" ? undefined : editor}
        onCancel={() => setEditor(null)}
        onSaved={() => {
          setEditor(null);
          setRevision(revision + 1);
        }}
      />
    );
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Articles</h1>
        <Button onClick={() => setEditor("new")}>New article</Button>
      </div>
      {error && (
        <div role="alert">
          {error}
          <Button onClick={() => setRevision(revision + 1)}>Try again</Button>
        </div>
      )}
      {!data && !error && <p role="status">Loading articles…</p>}
      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.articles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell>
                    <a href={`/blog/${article.slug}`}>{article.title}</a>
                  </TableCell>
                  <TableCell>{article.createdAt.slice(0, 10)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        disabled={pending}
                        onClick={() => setEditor(article)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={pending}
                        onClick={() => void remove(article)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!data.articles.length && (
            <p>No articles yet. Publish your first article.</p>
          )}
          <nav aria-label="Article pages" className="flex items-center gap-4">
            <Button
              disabled={page === 1 || pending}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span>Page {page}</span>
            <Button
              disabled={page * 10 >= data.total || pending}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </nav>
        </>
      )}
    </div>
  );
}
export default function ArticlesPage() {
  return (
    <AdminGate>
      <Articles />
    </AdminGate>
  );
}

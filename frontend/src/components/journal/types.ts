export type Article = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  markdown: string;
  tags: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
};
export type ArticleList = {
  articles: Article[];
  total: number;
  page: number;
  limit: number;
};

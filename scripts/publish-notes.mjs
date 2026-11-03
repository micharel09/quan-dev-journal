import { readFileSync } from 'node:fs';
const api = process.env.JOURNAL_API_URL || 'http://127.0.0.1:3001/api/v1';
const email = process.env.JOURNAL_ADMIN_EMAIL;
const password = process.env.JOURNAL_ADMIN_PASSWORD;
if (!email || !password) throw new Error('Set JOURNAL_ADMIN_EMAIL and JOURNAL_ADMIN_PASSWORD');
const login = await fetch(`${api}/auth/email/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
if (!login.ok) throw new Error(`Sign-in failed (${login.status})`);
const { token } = await login.json();
for (const [file, title, summary, tags] of [
  ['stable-slugs-and-postgresql.md', 'Giữ URL bài viết ổn định khi chuyển Conduit sang TypeORM', 'Chuyển xử lý slug trùng sang constraint PostgreSQL và kiểm chứng slug ổn định bằng HTTP thật.', ['nestjs', 'postgresql', 'typeorm']],
  ['markdown-and-admin-boundaries.md', 'Tách quyền xuất bản và ranh giới render Markdown', 'Tái sử dụng auth Brocoders, renderer Conduit và mục lục Karhdo với ranh giới quyền và nội dung rõ ràng.', ['nextjs', 'markdown', 'authorization']],
]) {
  const query = await fetch(`${api}/articles?q=${encodeURIComponent(title)}`);
  if (!query.ok) throw new Error(`Read failed (${query.status})`);
  const existing = await query.json();
  if (existing.articles.some((article) => article.title === title)) { console.log(`Already present: ${file}`); continue; }
  const markdown = readFileSync(new URL(`../content/${file}`, import.meta.url), 'utf8').replace(/^# .*\r?\n/, '').trim();
  const response = await fetch(`${api}/articles`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title, summary, markdown, tags }) });
  if (!response.ok) throw new Error(`Publish failed (${response.status})`);
  console.log(`Published: ${(await response.json()).slug}`);
}

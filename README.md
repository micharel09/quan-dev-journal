# Quan Dev Journal

Personal engineering journal: NestJS, Next.js, TypeScript and PostgreSQL. This is an adaptation of the implementations below, with integration for one author's public articles and ADMIN publishing.

Source: [micharel09/quan-dev-journal](https://github.com/micharel09/quan-dev-journal). Portfolio: [quantm.is-a.dev](https://quantm.is-a.dev). Journal application hosting is pending a verified deployment target; do not infer a live demo URL from this repository's name.

## Run on Ubuntu

Use Node.js 22.22+ and npm 10+; Docker Compose is required for PostgreSQL. In this working environment run Node builds through `ssh fly-server`.

```sh
node scripts/prepare-local-env.mjs
docker compose -p quan-journal -f docker-compose.journal.yaml up -d --wait
cd backend
npm ci
npm run migration:run
# Dedicated fixture database only: this resets fixtures and creates test accounts.
npm run test:journal
npm run build
npm run start:prod
```

In another terminal:

```sh
cd frontend
npm ci
npm run build
npm run start -- --hostname 127.0.0.1
```

Open `/blog` on port 3000; API `/api/v1/articles` and Swagger `/docs` are on port 3001. `/admin-panel/articles` redirects to Brocoders' sign-in when anonymous. The isolated test fixture account is `admin@example.com` / `journal-test-password`; the reader is `reader@example.com` with the same fixture password. These accounts belong exclusively to the local test database. Never run `test:journal` against a database containing user content. Its database-name guard requires the suffix `_journal_test`.

The example Compose database is intentionally a local fixture. For a persistent private author database, configure the existing Brocoders environment and ADMIN user provisioning described in [backend auth documentation](backend/docs/auth.md); migrations do not create credentials. Existing `.env` files are preserved by the setup script. Replace placeholder secrets in any pre-existing environment before running production mode; the upstream guard enforces this.

## Behavior and architecture

- Browser → Next.js public reading pages or Brocoders authenticated admin shell → NestJS versioned API → TypeORM → PostgreSQL.
- `GET /api/v1/articles?q=&tag=&page=1&limit=10` searches title/summary literally, combines the exact tag filter and returns `{ articles, total, page, limit }`. Limit is 1–50. Ordering is publication time then ID for deterministic pagination.
- `GET /api/v1/articles/tags` lists distinct tags currently in articles. `GET /api/v1/articles/:slug` returns an article or 404.
- `POST`, `PATCH /:slug`, `DELETE /:slug` use Brocoders JWT + backend `RolesGuard`, requiring `RoleEnum.admin` (1). Frontend role checks are navigation guards; backend authorization is authoritative.
- `Article`: UUID, stable slug, title, summary, Markdown, tag array, author display-name snapshot, created/updated timestamps. Author comes from the verified identity, not the submitted body. No user email/password is joined into public article responses.
- Publish makes content public immediately. There is no draft workflow. Title edits preserve the slug; duplicate titles use an atomic PostgreSQL unique constraint and Conduit's bounded suffix retry. The existing author snapshot remains unchanged on edits.
- Markdown uses React elements with raw HTML skipped and the default safe URL transform. Heading IDs and TOC derive from the same remark AST, including duplicate headings. Code blocks retain their language class and scroll independently; syntax coloring is not implemented.
- Brocoders' locale structure remains: `/blog` and `/admin-panel/*` rewrite internally to English routes. Locale-prefixed links are supported. Public reading does not use the admin sidebar. The article admin gate adapts Conduit's retained-account rule so session expiry preserves an open draft while the API continues rejecting unauthorized writes.

## Reuse and changes

All four upstreams carry MIT licenses. Notices are retained in [licenses](licenses), and the Brocoders app directories retain their original licenses. Upstream documentation/generators are retained as reference; the commands above and the root CI workflow govern Journal validation.

| Source revision | Source implementation → local owner | Adaptation |
| --- | --- | --- |
| [Brocoders NestJS `9620f159`](https://github.com/brocoders/nestjs-boilerplate/tree/9620f159eefe38f47747d02ab162852367c5472c) | Auth/session, users, roles, relational repository/entity/migration patterns → `backend` | `src/articles` module integrates article persistence; new migration. PostgreSQL is the selected Journal store. Upstream optional providers remain available but are not configured. |
| [Brocoders Next.js `842f1772`](https://github.com/brocoders/extensive-react-boilerplate/tree/842f17720b497c58398d0ad62a250313842de194) | Sign-in, `useFetch`, required-auth wrapper, users form/table, confirm dialog, sidebar and Playwright → `frontend` | Articles admin table/editor reuse those flows. Public shell is selected by route. DirectionProvider needs a client boundary. Local font packages replace Google-font build downloads. |
| [Karhdo `cc2e79f5`](https://github.com/Karhdo/karhdo.dev/tree/cc2e79f5e369a62c54dfbad85872fe23e6afffe9) | `ListLayout`, `PostRow`, `TagFilterChips`, `Pagination`, `PostLayout`, `PostHeader`, `TableOfContents`, `Header`, theme/prose CSS → `frontend/src/components/journal` | Astro markup/CSS ported to React. Dark tokens, Outfit/JetBrains Mono, three-column post rows collapsing at 600px, two-column reading layout with desktop sticky/mobile details TOC, 140px scrollspy retained. Search becomes a labeled form; tag and pagination routes become query parameters. Header links/brand change; source analytics, reactions, newsletters and comments are outside scope. View-transition choreography is not ported. CSS hover/focus and reduced-motion behavior are retained. |
| [Conduit `dd44cb71`](https://github.com/kamangacode/conduit-fullstack/tree/dd44cb7196afa15344fd96445d190affb6d82cee) | `domain/article/slug.ts`, create/update use cases, `prisma-article.repository.ts`, `ArticleEditor.tsx`, `ArticleBody.tsx` → `backend/src/articles`, Journal editor/renderer | Slug value object incorporated directly; persistence/duplicate retry transferred from Prisma to TypeORM. Editor field order, Enter-to-add and remove tags, pending/error state and preserved text adapted to Brocoders form/auth. Markdown React renderer retained. Stable slugs and ADMIN writes replace Conduit's title-following slug and owner writes. Social/feed/comment functionality is omitted. |

## Verification

```sh
cd backend
npm run lint
npm run typecheck
npm run test:journal
npm run build
cd ../frontend
npm run lint
npm run typecheck
npm run build
npm run test:journal
```

Backend tests use actual PostgreSQL, actual HTTP login/JWT and ADMIN/non-admin/anonymous requests, CRUD, concurrent collisions, search/tag/pagination and migration down/up. Browser tests adapt the upstream Playwright harness for desktop/mobile reading, filtering, searching, keyboard focus, loading/error/empty/retry states, Markdown injection, TOC and sign-in/publish/edit/delete.

The root [workflow](.github/workflows/journal.yml) runs both apps in the same checkout on Ubuntu; it does not check out a moving upstream backend. See [verification record](docs/verification.md) for actual results and outstanding limitations. Existing upstream suites cover broader optional template functionality and are not claimed as Journal acceptance evidence unless explicitly recorded there.

Run database migration tests before starting the browser suite or preview; do not reset the shared fixture database while either is using it. On the current Ubuntu 26.04 server, this pinned Playwright installer does not recognize the OS. Tests passed using the already-installed Chromium 1248 via `JOURNAL_CHROMIUM_EXECUTABLE=/home/quan/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`. CI pins Ubuntu 24.04, which the installed Playwright registry supports, and installs its matching browser there.

After building, `node scripts/preview.mjs` starts both apps on loopback. `APP_HOST` overrides the API bind host for an explicitly configured environment; its default is `127.0.0.1`.

## Technical notes

Two original notes based on this implementation are in [content](content). After creating a private ADMIN account, publish them through the editor or the explicit development importer:

```sh
JOURNAL_ADMIN_EMAIL=admin@example.com JOURNAL_ADMIN_PASSWORD=journal-test-password node scripts/publish-notes.mjs
```

The importer checks for an existing matching article before creating each note and does not overwrite content. Credentials are read from environment and are never printed. Publishing these local notes is separate from deploying the application.

## Limits and release

Single-author publishing is the product model. Brocoders' optional account/provider modules remain template functionality. JWT permission changes follow the upstream token-expiry semantics; immediate revocation is not added. There is no upload/asset CMS, full-text ranking, article drafts or SSR indexing of fetched article bodies in this version. No traffic, performance, user-count or employment claims are made.

The user authorized the release on 2026-11-03. Portfolio and profile README changes are published in their respective repositories. The source repository above is the Journal release target; a demo link is added only after application hosting is selected, deployed and checked. See the verification record for current release evidence.

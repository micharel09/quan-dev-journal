import { test, expect } from "@playwright/test";

const api = "http://localhost:3001/api/v1";
test("reader searches, filters, paginates, reads safe Markdown and navigates TOC", async ({
  page,
  request,
}, testInfo) => {
  const login = await request.post(`${api}/auth/email/login`, {
    data: { email: "admin@example.com", password: "journal-test-password" },
  });
  expect(login.ok()).toBeTruthy();
  const { token } = await login.json();
  const slugs: string[] = [];
  const tag = `qa-${testInfo.project.name}`;
  const markdown =
    '## First heading\n\n```ts\nconst n = 1;\n```\n\n## First heading\n\n<img src=x onerror="window.journalXss=1">\n\n[bad](javascript:alert(1))\n\n### Last heading';
  try {
    for (let i = 0; i < 11; i++) {
      const response = await request.post(`${api}/articles`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          title: `Browser ${tag} ${i}`,
          summary: `searchable-${tag}`,
          markdown,
          tags: [tag],
        },
      });
      expect(response.status()).toBe(201);
      slugs.push((await response.json()).slug);
    }
    await page.goto("/blog");
    await page.getByRole("link", { name: tag, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`tag=${tag}`));
    await expect(page.locator(".post-row")).toHaveCount(10);
    await page.getByRole("link", { name: "Next →", exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.locator(".post-row")).toHaveCount(1);
    await page.getByLabel("Search posts").fill(`Browser ${tag} 0`);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.locator(".post-row")).toHaveCount(1);
    await expect(page).toHaveURL(/page=(?!2)|q=/);
    await page.reload();
    await expect(page.locator(".post-row")).toHaveCount(1);
    await page.locator(".post-row").click();
    await expect(page.locator(".prose pre code")).toContainText("const n = 1");
    await expect(page.locator(".prose img")).toHaveCount(0);
    await expect(page.locator('.prose a[href^="javascript:"]')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => (window as Window & { journalXss?: number }).journalXss
      )
    ).toBeUndefined();
    await expect(page.locator("#first-heading")).toBeVisible();
    await expect(page.locator("#first-heading-1")).toBeVisible();
    if (testInfo.project.name === "mobile")
      await page.locator(".mobile-toc summary").click();
    const toc =
      testInfo.project.name === "mobile"
        ? page.locator(".mobile-toc")
        : page.locator(".desktop-toc");
    await toc.getByRole("link", { name: "Last heading" }).click();
    await expect(page).toHaveURL(/#last-heading$/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBeTruthy();
    await page.goto("/blog?q=no-such-article-fixture");
    await expect(page.getByRole("status")).toContainText("No articles found");
  } finally {
    for (const slug of slugs)
      await request.delete(`${api}/articles/${slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
  }
});

test("ADMIN signs in, publishes, edits without changing slug and deletes", async ({
  page,
}, testInfo) => {
  await page.goto("/admin-panel/articles");
  await expect(page).toHaveURL(/sign-in/);
  await page.getByTestId("email").fill("admin@example.com");
  await page.getByTestId("password").fill("journal-test-password");
  await page.getByTestId("sign-in-submit").click();
  await expect(
    page.getByRole("heading", { name: "Articles", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "New article" }).click();
  const title = `UI published ${testInfo.project.name}`;
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page
    .getByLabel("Summary", { exact: true })
    .fill("A browser verified publication");
  await page
    .getByLabel("Markdown", { exact: true })
    .fill("## Published\n\nHello from the UI.");
  await page.getByLabel("Tags (press Enter)").fill("ui-test");
  await page.getByLabel("Tags (press Enter)").press("Enter");
  await page.getByRole("button", { name: "Đăng bài", exact: true }).click();
  const row = page
    .getByRole("row")
    .filter({ has: page.getByRole("link", { name: title, exact: true }) });
  await expect(row).toBeVisible();
  const href = await row
    .getByRole("link", { name: title })
    .getAttribute("href");
  await row.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill(`${title} renamed`);
  await page.getByRole("button", { name: "Save changes" }).click();
  const renamed = page.getByRole("row").filter({ hasText: `${title} renamed` });
  await expect(renamed.getByRole("link")).toHaveAttribute("href", href!);
  await page.goto(href!);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    `${title} renamed`
  );
  await page.goto("/admin-panel/articles");
  await page
    .getByRole("row")
    .filter({ hasText: `${title} renamed` })
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Yes", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: `${title} renamed`, exact: true })
  ).toHaveCount(0);
});

test("loading, API errors, retry and keyboard focus", async ({ page }) => {
  await page.route("**/api/v1/articles?*", (route) =>
    route.fulfill({ status: 503, body: "{}" })
  );
  await page.goto("/blog");
  await expect(page.locator(".journal").getByRole("alert")).toContainText(
    "Could not load articles"
  );
  await page.unroute("**/api/v1/articles?*");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".journal").getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".post-row").first()).toBeVisible();
  await page.getByLabel("Search posts").focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Search", exact: true })
  ).toBeFocused();
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/articles?*", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/blog?q=loading-fixture");
  await expect(page.getByRole("status")).toHaveText("Loading articles…");
  release();
  await expect(page.getByRole("status")).toContainText("No articles found");
});

test("an expired session preserves the open draft and shows an error", async ({
  page,
}) => {
  await page.goto("/admin-panel/articles");
  await expect(page).toHaveURL(/sign-in/);
  await page.getByTestId("email").fill("admin@example.com");
  await page.getByTestId("password").fill("journal-test-password");
  await page.getByTestId("sign-in-submit").click();
  await page.getByRole("button", { name: "New article" }).click();
  await page.getByLabel("Title", { exact: true }).fill("Preserve my draft");
  await page.getByLabel("Summary", { exact: true }).fill("Draft summary");
  await page
    .getByLabel("Markdown", { exact: true })
    .fill("## Draft\n\nStill here.");
  await page.route("**/api/v1/articles", (route) =>
    route.fulfill({ status: 401, body: "{}" })
  );
  await page.route("**/api/v1/auth/refresh", (route) =>
    route.fulfill({ status: 401, body: "{}" })
  );
  await page.getByRole("button", { name: "Đăng bài", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Your session expired" })
  ).toBeVisible();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Preserve my draft"
  );
  await expect(page.getByLabel("Markdown", { exact: true })).toHaveValue(
    "## Draft\n\nStill here."
  );
  await expect(page).toHaveURL(/admin-panel\/articles/);
});

import { expect, test } from "@playwright/test";

test("vendor page renders official source links", async ({ page }) => {
  await page.goto("/vendors/vercel");

  await expect(page.getByRole("heading", { level: 1, name: "Vercel" })).toBeVisible();
  await expect(page.getByText(/Official Sources/i).first()).toBeVisible();
});

test("vendor event lists are alphabetical", async ({ page }) => {
  await page.goto("/vendors/openai");

  const titles = (await page.locator("article h3 a").allTextContents()).map((title) => title.trim());
  const sortedTitles = [...titles].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" }),
  );

  expect(titles.length).toBeGreaterThan(1);
  expect(titles).toEqual(sortedTitles);
});

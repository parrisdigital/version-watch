import { expect, test } from "@playwright/test";

test("review routes redirect to login when unauthenticated", async ({ page }) => {
  await page.goto("/review");

  await expect(page).toHaveURL(/\/review\/login/);
  await expect(page.getByRole("heading", { name: /Review Access/i })).toBeVisible();
});

test("ops signal route redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/ops/signal");

  await expect(page).toHaveURL(/\/review\/login/);
  await expect(page.getByRole("heading", { name: /Review Access/i })).toBeVisible();
});

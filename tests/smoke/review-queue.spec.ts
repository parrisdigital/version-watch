import { expect, test } from "@playwright/test";

test("admin routes redirect to login when unauthenticated", async ({ page }) => {
  await page.goto("/admin/review");

  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole("heading", { name: /Sign in/i })).toBeVisible();
});

test("legacy /review path still redirects to admin login", async ({ page }) => {
  await page.goto("/review");

  await expect(page).toHaveURL(/\/admin\/login/);
});

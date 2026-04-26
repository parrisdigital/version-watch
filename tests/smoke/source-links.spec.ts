import { expect, test } from "@playwright/test";

test("ops source-link quality route redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/ops/source-links");

  await expect(page).toHaveURL(/\/review\/login/);
  await expect(page.getByRole("heading", { name: /Review Access/i })).toBeVisible();
});

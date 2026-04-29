import { expect, test } from "@playwright/test";

test("homepage renders the product framing", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /Every platform change, ranked/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Open the feed/i })).toBeVisible();
  await expect(page.getByText(/Change intelligence for developers/i)).toBeVisible();
});

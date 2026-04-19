import { expect, test } from "@playwright/test";

test("homepage renders the product framing", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Version Watch/i })).toBeVisible();
  await expect(page.getByText(/Change intelligence for developers/i)).toBeVisible();
  await expect(page.locator("header").getByRole("link", { name: /Browse Vendors/i })).toBeVisible();
});

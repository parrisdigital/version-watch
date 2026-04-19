import { expect, test } from "@playwright/test";

test("vendor page renders official source links", async ({ page }) => {
  await page.goto("/vendors/vercel");

  await expect(page.getByRole("heading", { level: 1, name: "Vercel" })).toBeVisible();
  await expect(page.getByText(/Official Sources/i).first()).toBeVisible();
});

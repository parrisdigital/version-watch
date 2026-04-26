import { expect, test } from "@playwright/test";

test("event page keeps the official source entry visible", async ({ page }) => {
  await page.goto("/vendors/stripe");

  const firstEventLink = page.locator("article h3 a").first();
  const eventTitle = await firstEventLink.textContent();

  await firstEventLink.click();

  await expect(page.getByRole("heading", { level: 1, name: eventTitle?.trim() ?? "" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Back to feed/i })).toHaveAttribute("href", "/vendors/stripe");
  await expect(page.getByText("Official detail", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Official detail/i })).toBeVisible();
});

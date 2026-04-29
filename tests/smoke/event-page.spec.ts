import { expect, test } from "@playwright/test";

test("event page promotes source attribution and contextual back-nav", async ({ page }) => {
  await page.goto("/vendors/stripe");

  const firstEventLink = page.locator("article h3 a").first();
  const eventTitle = await firstEventLink.textContent();

  await firstEventLink.click();

  // Title is the first visual peak.
  await expect(
    page.getByRole("heading", { level: 1, name: eventTitle?.trim() ?? "" }),
  ).toBeVisible();

  // Back-nav label is contextual: came from /vendors/stripe so it should say "Back to Stripe".
  await expect(page.getByRole("link", { name: /Back to Stripe/i })).toHaveAttribute(
    "href",
    "/vendors/stripe",
  );

  // Source attribution is promoted — "Open official source" CTA + "Verify against source" panel.
  await expect(page.getByRole("link", { name: /Open official source/i }).first()).toBeVisible();
  await expect(page.getByText(/Verify against source/i)).toBeVisible();

  // Why it matters is the second visual peak.
  await expect(page.getByText(/Why it matters/i).first()).toBeVisible();
});

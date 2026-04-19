import { expect, test } from "@playwright/test";

test("event page keeps the official source entry visible", async ({ page }) => {
  await page.goto("/events/stripe-subscription-schedule-changes");

  await expect(page.getByRole("heading", { level: 1, name: /Stripe updates subscription schedule phase end-date computation/i })).toBeVisible();
  await expect(page.getByText(/Official source entry/i)).toBeVisible();
  await expect(
    page.getByText(/Updates computation of subscription schedule phase end date to consider billing cycle anchor changes/i),
  ).toBeVisible();
});

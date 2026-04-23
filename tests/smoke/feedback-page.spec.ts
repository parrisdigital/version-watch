import { expect, test } from "@playwright/test";

test("feedback page submits through the lightweight form", async ({ page }) => {
  await page.route("/api/feedback", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto("/feedback?type=suggest_vendor&url=/search");

  await expect(page.getByRole("heading", { name: "Help tune the feed." })).toBeVisible();
  await expect(page.getByLabel("Feedback type")).toHaveValue("suggest_vendor");

  await page.getByLabel("Message").fill("Please track Example Cloud release notes.");
  await page.getByRole("button", { name: /Send suggest vendor/i }).click();

  await expect(page.getByText("Feedback sent. Thank you.")).toBeVisible();
});

import { expect, test } from "@playwright/test";

test("event pages opened from search return to the active search feed", async ({ page }) => {
  await page.goto("/search?vendor=stripe");

  const eventLink = page.getByRole("link", { name: "Open event page" }).first();
  await expect(eventLink).toHaveAttribute("href", /fromSearch=true/);

  await eventLink.click();

  await expect(page.getByRole("link", { name: /Back to feed/i })).toHaveAttribute(
    "href",
    "/search?vendor=stripe",
  );
});

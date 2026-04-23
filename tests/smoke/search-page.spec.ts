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

test("search filter controls stay compact and update the query string", async ({ page }) => {
  await page.goto("/search");

  await expect(page.getByRole("combobox", { name: /Vendor: All vendors/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Importance: Any signal/i })).toBeVisible();

  await page.getByRole("combobox", { name: /Vendor: All vendors/i }).click();
  await page.getByRole("textbox", { name: "Search vendors" }).fill("openai");
  await page.getByRole("option", { name: /OpenAI/i }).click();

  await expect(page).toHaveURL(/vendor=openai/);
  await expect(page.getByRole("combobox", { name: /Vendor: OpenAI/i })).toBeVisible();

  await page.getByRole("button", { name: /Importance: Any signal/i }).click();
  await page.getByRole("menuitemradio", { name: /Critical/i }).click();

  await expect(page).toHaveURL(/vendor=openai/);
  await expect(page).toHaveURL(/importance=critical/);
  await expect(page.getByRole("button", { name: /Signal Critical/i })).toBeVisible();
});

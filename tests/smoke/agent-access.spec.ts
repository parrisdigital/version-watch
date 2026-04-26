import { expect, test } from "@playwright/test";

test("agent access docs render the public API reference", async ({ page }) => {
  await page.goto("/agent-access");

  await expect(page.getByRole("heading", { name: /Agent-readable changelog intelligence/i })).toBeVisible();
  await expect(page.getByText("/api/v1/updates", { exact: true })).toBeVisible();
  await expect(page.getByText("recommended_action").first()).toBeVisible();
  await expect(page.getByText(/Discord webhook worker/i)).toBeVisible();
  await expect(page.getByText(/Automation platforms/i)).toBeVisible();
});

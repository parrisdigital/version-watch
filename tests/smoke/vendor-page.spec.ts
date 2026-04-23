import { expect, test } from "@playwright/test";

test("vendor page renders official source links", async ({ page }) => {
  await page.goto("/vendors/vercel");

  await expect(page.getByRole("heading", { level: 1, name: "Vercel" })).toBeVisible();
  await expect(page.getByText(/Official Sources/i).first()).toBeVisible();
});

test("vendor event lists are newest first across vendor profiles", async ({ page }) => {
  test.setTimeout(90_000);

  await page.goto("/vendors");

  const vendorHrefs = (await page.locator('a[href^="/vendors/"]').evaluateAll((links) =>
    links.map((link) => link.getAttribute("href") ?? ""),
  )).filter((href, index, all) => href && all.indexOf(href) === index);

  expect(vendorHrefs.length).toBeGreaterThan(1);

  for (const href of vendorHrefs) {
    await page.goto(href);

    const dates = (await page.locator("article h3 a").evaluateAll((links) =>
      links.map((link) => {
        const href = link.getAttribute("href") ?? "";
        const match = href.match(/\/events\/[^?]*?(\d{4}-\d{2}-\d{2})/);
        return match?.[1] ?? "";
      }),
    )).filter(Boolean);

    if (dates.length <= 1) {
      continue;
    }

    const sortedDates = [...dates].sort((left, right) =>
      new Date(right).getTime() - new Date(left).getTime(),
    );

    expect(dates, `${href} should list newest events first`).toEqual(sortedDates);
  }
});

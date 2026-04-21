import { chromium } from "playwright";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: "dark",
});
const page = await context.newPage();
await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: "/tmp/vw-qa/home.scroll-0.png" });
await page.evaluate(() => window.scrollBy(0, 600));
await page.waitForTimeout(500);
await page.screenshot({ path: "/tmp/vw-qa/home.scroll-600.png" });
await page.evaluate(() => window.scrollBy(0, 1800));
await page.waitForTimeout(500);
await page.screenshot({ path: "/tmp/vw-qa/home.scroll-2400.png" });
console.log("done");
await browser.close();

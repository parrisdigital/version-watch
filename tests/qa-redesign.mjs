import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT_DIR = "/tmp/vw-qa";
mkdirSync(OUT_DIR, { recursive: true });

const routes = [
  { name: "home", path: "/" },
  { name: "vendors", path: "/vendors" },
  { name: "vendor-openai", path: "/vendors/openai" },
  { name: "event", path: "/events/openai-2026-03-16-codex-app-26-313" },
  { name: "search", path: "/search" },
  { name: "about", path: "/about" },
  { name: "ops-health", path: "/ops/health" },
  { name: "review-login", path: "/review/login" },
];

const viewports = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "mobile", width: 390, height: 844 },
];

const themes = ["dark", "light"];

const errors = [];

const browser = await chromium.launch();
for (const viewport of viewports) {
  for (const theme of themes) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: theme,
    });
    const page = await context.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(`[${viewport.label}/${theme}/${page.url()}] ${msg.text()}`);
      }
    });
    page.on("pageerror", (err) => {
      errors.push(`[${viewport.label}/${theme}] PAGEERROR ${err.message}`);
    });

    for (const route of routes) {
      const url = `http://127.0.0.1:3000${route.path}`;
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
        // Apply theme via class (matches runtime theme-init)
        await page.evaluate((theme) => {
          if (theme === "light") {
            document.documentElement.classList.add("light");
          } else {
            document.documentElement.classList.remove("light");
          }
        }, theme);
        await page.waitForTimeout(400);
        const out = `${OUT_DIR}/${route.name}.${viewport.label}.${theme}.png`;
        await page.screenshot({ path: out, fullPage: true });
        console.log(`✓ ${out}`);
      } catch (err) {
        errors.push(`[${viewport.label}/${theme}] ${route.path} FAILED: ${err.message}`);
      }
    }

    await context.close();
  }
}

await browser.close();

if (errors.length) {
  console.log("\n--- errors ---");
  for (const e of errors) console.log(e);
  process.exit(1);
}

console.log("\nAll routes rendered cleanly.");

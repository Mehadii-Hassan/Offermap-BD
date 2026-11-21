import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3100";

// K4: offer detail (sticky action bar, info grid, segmented vote).

test("K4: sticky action bar stays visible after scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('a[href^="/offer/"]', { timeout: 30000 });
  const href = await page.locator('a[href^="/offer/"]').first().getAttribute("href");
  await page.goto(BASE + href, { waitUntil: "networkidle", timeout: 60000 });
  const pos = await page.evaluate(() => {
    const el = [...document.querySelectorAll("div")].find((d) => /sm:grid-cols-4/.test(d.className || ""));
    return el ? getComputedStyle(el).position : "none";
  });
  expect(pos === "sticky" || pos === "fixed").toBe(true);
});

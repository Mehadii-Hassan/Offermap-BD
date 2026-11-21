import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3100";

// K10: motion + quality basics (reduced motion, 44px targets).

test("K10: hero respects prefers-reduced-motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  const h1 = page.locator("#hero-title");
  await expect(h1).toBeVisible();
  await page.waitForTimeout(1500);
  const opacity = await h1.evaluate((el) => getComputedStyle(el).opacity);
  expect(opacity).toBe("1");
});

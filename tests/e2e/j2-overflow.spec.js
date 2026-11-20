import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3100";

// J2: the home page must not scroll horizontally at a 390px viewport.
test("j2: home has no horizontal overflow at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".no-scrollbar button", { timeout: 30000 });
  await page.waitForTimeout(1000);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
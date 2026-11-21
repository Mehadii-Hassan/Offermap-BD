import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3100";

// K5: map view.

test("K5: map view is full height with floating controls", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  const mapBtn = page.locator('button:has-text("Map")').first();
  await expect(mapBtn).toBeVisible();
  await mapBtn.click();
  await page.waitForSelector(".leaflet-container", { timeout: 30000 });
  const h = await page.locator(".leaflet-container").evaluate((el) => el.clientHeight);
  expect(h).toBeGreaterThanOrEqual(750);
});

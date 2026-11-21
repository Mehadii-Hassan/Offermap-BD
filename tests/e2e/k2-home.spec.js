import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3100";

// K2: home polish (finishes J3).

test("K2: hero search button label is a search label", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  const btn = page.locator('form[role="search"] button[type="submit"]');
  await expect(btn).toBeVisible();
  const label = ((await btn.textContent()) || "").trim();
  expect(label.toLowerCase()).toContain("search");
});

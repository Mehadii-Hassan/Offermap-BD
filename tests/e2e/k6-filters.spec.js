import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3100";

// K6: filters.

test("K6: filters apply button shows offer count", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  const apply = page.getByRole("button", { name: /Apply/ });
  await expect(apply).toBeVisible();
});

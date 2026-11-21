import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3100";

// K7: bottom navigation (floating glass bar, elevated centred "+ Add").

test("K7: bottom nav is floating with centred add", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  const addLink = page.getByRole("link", { name: /Add/i }).first();
  await expect(addLink).toBeVisible();
  const navBox = await addLink.evaluate((el) => el.closest("nav").getBoundingClientRect());
  expect(navBox.width).toBeLessThan(390 - 1);
});

import { test, expect } from "@playwright/test";
import { collectConsoleErrors } from "./helpers/console";

const BASE = "http://localhost:3100";

async function gotoNoErrors(page, path) {
  const errors = collectConsoleErrors(page);
  await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  return errors;
}

// K9: static pages + admin design system.

for (const p of ["/saved", "/about", "/for-shops", "/privacy", "/contact"]) {
  test(`K9: ${p} renders without console errors`, async ({ page }) => {
    const errors = await gotoNoErrors(page, p);
    await expect(page.locator("footer")).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("K9: 404 page renders without console errors", async ({ page }) => {
  const errors = await gotoNoErrors(page, "/definitely-not-a-page");
  expect(errors).toEqual([]);
});

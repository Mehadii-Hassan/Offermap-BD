const { test, expect } = require("@playwright/test");

// Read-only smoke journeys against the live site. GET only.
// These verify the site is reachable and the core shell renders.
test.describe("OfferMap BD live smoke", () => {
  test("home loads with banner, search and offer cards", async ({ page }) => {
    const resp = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(resp.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('input[placeholder*="search" i], input[type="search"]')).toBeVisible();
    // The house card (promote /add) should appear after the 6th card.
    await expect(page.getByRole("link", { name: /Own a shop\? List your offer free/i })).toBeVisible();
  });

  test("ads are off by default (no Ad slot box)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const adSlot = page.locator('[data-ad-slot]');
    await expect(adSlot).toHaveCount(0);
  });

  test("/offers/dhaka loads", async ({ page }) => {
    const resp = await page.goto("/offers/dhaka", { waitUntil: "domcontentloaded" });
    expect(resp.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("/terms loads", async ({ page }) => {
    const resp = await page.goto("/terms", { waitUntil: "domcontentloaded" });
    expect(resp.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
  });
});

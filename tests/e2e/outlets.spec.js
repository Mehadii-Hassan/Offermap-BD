import { test, expect } from "@playwright/test";
import { seedE2E, cleanupE2E } from "./helpers/seed";

const BASE = "http://localhost:3100";
const SHOP = "E2E Test Chain";

let ids;

test.beforeAll(async () => {
  ids = await seedE2E();
});

test.afterAll(async () => {
  await cleanupE2E();
});

function listenForErrors(page, errors) {
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
}

test("outlets: chain offer shows nearest outlet, outlet list + map on detail, empty state, no console errors", async ({ browser }) => {
  const ctx = await browser.newContext({
    geolocation: { latitude: 23.8759, longitude: 90.3795 },
    permissions: ["geolocation"],
  });
  const page = await ctx.newPage();
  const errors = [];
  listenForErrors(page, errors);

  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.waitForSelector(".no-scrollbar button", { timeout: 30000 });

  // The chain offer body contains its shop name + nearest-outlet label.
  await expect(page.locator("body")).toContainText(SHOP, { timeout: 20000 });
  await expect(page.locator("body")).toContainText("Nearest outlet");

  // It should appear inside a "Very close"/"In your area" recommendation
  // (nearest outlet is at Uttara Sector 10 itself).
  const headings = await page.$$eval("h2", (els) => els.map((e) => e.textContent.trim()));
  expect(headings.some((h) => /Very close/.test(h))).toBe(true);

  // --- Detail page: outlet list + map ---
  const card = page.locator(`a[href^="/offer/"]`, { hasText: SHOP }).first();
  await card.click();
  await page.waitForURL(/\/offer\//, { timeout: 30000 });
  await page.waitForTimeout(2500);

  // Outlet list heading + a few outlet entries.
  await expect(page.locator("body")).toContainText("outlets");
  await expect(page.locator("body")).toContainText("Uttara Sector 10");

  // Map container renders.
  await expect(page.locator(".leaflet-container").first()).toBeVisible({ timeout: 15000 });

  // --- Empty-state card at a remote place with no offers within 5 km ---
  const ctx2 = await browser.newContext({
    geolocation: { latitude: 25.1, longitude: 89.1 },
    permissions: ["geolocation"],
  });
  const page2 = await ctx2.newPage();
  const errors2 = [];
  listenForErrors(page2, errors2);
  await page2.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page2.waitForTimeout(4000);
  await page2.waitForSelector(".no-scrollbar button", { timeout: 30000 });

  await expect(page2.locator("body")).toContainText("Add it in 10 seconds with a photo");

  expect(errors).toEqual([]);
  expect(errors2).toEqual([]);

  await ctx.close();
  await ctx2.close();
});
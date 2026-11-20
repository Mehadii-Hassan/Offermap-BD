import { test, expect } from "@playwright/test";
import { seedE2E, cleanupE2E } from "./helpers/seed";

const BASE = "http://localhost:3100";

let ids;

test.beforeAll(async () => {
  ids = await seedE2E();
});

test.afterAll(async () => {
  await cleanupE2E();
});

test("Uttara Sector 10: no district-precision offer in nearby sections; only in Elsewhere", async ({ browser }) => {
  const ctx = await browser.newContext({
    geolocation: { latitude: 23.8759, longitude: 90.3795 },
    permissions: ["geolocation"],
  });
  const page = await ctx.newPage();

  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.waitForSelector(".no-scrollbar button", { timeout: 30000 });

  // None of the km-based nearby sections may show a "District-wide" offer.
  for (const label of ["Very close", "In your area", "In your city"]) {
    const section = page.locator(
      `xpath=//h2[contains(text(),"${label}")]/following-sibling::div[1]`
    );
    if (await section.count()) {
      await expect(section).not.toContainText("District-wide");
    }
  }

  // The "Near you" strip must not contain a district-wide offer either.
  const nearYou = page.locator("#near-you");
  if (await nearYou.count()) {
    await expect(nearYou).not.toContainText("District-wide");
  }

  // A collapsed "Elsewhere in" toggle exists below the nearby sections.
  await expect(page.getByText(/Elsewhere in/i).first()).toBeVisible();

  await ctx.close();
});
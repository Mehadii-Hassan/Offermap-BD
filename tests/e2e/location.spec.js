import { test, expect } from "@playwright/test";
import { collectConsoleErrors } from "./helpers/console";

const BASE = "http://localhost:3100";

test("location: Uttara shows sections in order, no Rangpur offers, share link works, no console errors", async ({ browser }) => {
  const ctx = await browser.newContext({
    geolocation: { latitude: 23.8759, longitude: 90.3795 },
    permissions: ["geolocation"],
  });
  const page = await ctx.newPage();
  const errors = collectConsoleErrors(page);

  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.waitForSelector(".no-scrollbar button", { timeout: 30000 });

  // Read section headings in order.
  const headings = await page.$$eval("h2", (els) => els.map((e) => e.textContent.trim()));
  const order = [
    (t) => /Very close/.test(t),
    (t) => /In your area/.test(t),
    (t) => /In your city/.test(t),
    (t) => /Nationwide/.test(t),
  ];
  // Every non-empty section should appear in this order.
  const found = order
    .map((f) => headings.findIndex(f))
    .filter((i) => i !== -1);
  const sorted = [...found].sort((a, b) => a - b);
  expect(found).toEqual(sorted);

  // No far-away (Rangpur) offer inside the recommendation sections
  // (curated Hot/Top strips may show featured offers from anywhere).
  const inCity = page.locator('xpath=//h2[contains(text(),"In your city")]/following-sibling::div[1]');
  if (await inCity.count()) {
    const sectText = await inCity.textContent();
    expect(sectText).not.toMatch(/Rangpur/i);
  }

  // Share link opens same view.
  await page.goto(BASE + "/?lat=24.9017&lng=91.8706&place=Sylhet", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  const bar = await page.textContent("body");
  expect(bar).toContain("Sylhet");

  expect(errors).toEqual([]);
  await ctx.close();
});
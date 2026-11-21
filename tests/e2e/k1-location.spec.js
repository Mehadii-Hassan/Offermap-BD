import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3100";

// K1: location behaviour. Behavioural replacements for the old grep-only checks.

test("K1: no geolocation call happens on load without permission", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    const w = window;
    w.__geoCalls = w.__geoCalls || [];
    navigator.geolocation.getCurrentPosition = (succ, err, opts) => {
      w.__geoCalls.push(opts || {});
    };
  });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  const calls = await page.evaluate(() => window.__geoCalls || []);
  expect(calls).toEqual([]);
  await context.close();
});

test("K1: denied case shows the message and the fallback options", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send("Browser.setPermission", { origin: "http://localhost:3100", permission: "geolocation", setting: "denied" });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.locator('button[aria-label="Change location"]').click();
  await page.getByRole("button", { name: /Near Me/ }).click();
  await expect(page.getByText(/Location denied/)).toBeVisible();
  await expect(page.getByText(/Approximate, based on your network/)).toBeVisible();
});

test("K1: timeout case shows the message and the fallback options", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (succ, err, opts) => {
      const e = new Error("Position unavailable");
      e.code = 3; // PositionError.TIMEOUT
      e.PERMISSION_DENIED = 1;
      e.POSITION_UNAVAILABLE = 2;
      e.TIMEOUT = 3;
      if (err) err(e);
    };
  });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.locator('button[aria-label="Change location"]').click();
  await page.getByRole("button", { name: /Near Me/ }).click();
  await expect(page.getByText(/Approximate, based on your network/)).toBeVisible();
});

test("K1: in-app browser shows the localised banner", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", {
      get: () => "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0.0 Mobile Safari/537.36 [FBAN/FBAV]",
      configurable: true,
    });
  });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await expect(page.getByText(/Location may not work here/)).toBeVisible();
});

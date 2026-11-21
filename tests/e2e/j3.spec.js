import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3100";
const SHOTS = "docs/screens";

// J3: premium home page + offer card redesign.

test("j3: hero has h1, search input and location pill", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });

  const h1 = page.locator("#hero-title");
  await expect(h1).toBeVisible();
  expect((await h1.textContent()) || "").toContain("Discover Offers Near You");

  await expect(page.locator('input[type="text"]')).toBeVisible();
  await expect(page.locator('button[aria-label="Change location"]')).toBeVisible();
});

test("j3: sticky bar is sticky/fixed after scrolling 600px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('a[href^="/offer/"]', { timeout: 30000 });

  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(500);

  const pos = await page.evaluate(() => {
    const el = document.querySelector("header");
    return el ? getComputedStyle(el).position : "none";
  });
  expect(pos === "sticky" || pos === "fixed").toBe(true);
});

test("j3: at least 6 offer cards share a 16:10 image ratio", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('a[href^="/offer/"]', { timeout: 30000 });
  await page.waitForTimeout(1200);

  const ratios = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('a[href^="/offer/"]')];
    const out = [];
    for (const a of cards) {
      const img = a.querySelector(".aspect-\\[16\\/10\\]");
      if (!img) continue;
      const r = img.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) out.push(r.width / r.height);
    }
    return out;
  });

  expect(ratios.length).toBeGreaterThanOrEqual(6);
  const target = 16 / 10;
  for (const r of ratios) {
    expect(Math.abs(r - target) / target).toBeLessThanOrEqual(0.02);
  }
});

test("j3: no horizontal overflow at 390px in dark and light", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('a[href^="/offer/"]', { timeout: 30000 });
  await page.waitForTimeout(800);

  const overflowDark = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflowDark).toBeLessThanOrEqual(1);

  // switch to light theme via the top-bar toggle
  const themeBtn = page.locator('button[aria-label="Toggle theme"]');
  if (await themeBtn.count()) {
    await themeBtn.click();
    await page.waitForTimeout(500);
  }
  const overflowLight = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflowLight).toBeLessThanOrEqual(1);
});

test("j3: screenshots saved for 390/1440 in dark and light", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('a[href^="/offer/"]', { timeout: 30000 });

  const shots = [
    { name: "home-390-dark", width: 390, height: 844, light: false },
    { name: "home-390-light", width: 390, height: 844, light: true },
    { name: "home-1440-dark", width: 1440, height: 900, light: false },
    { name: "home-1440-light", width: 1440, height: 900, light: true },
  ];

  for (const s of shots) {
    await page.setViewportSize({ width: s.width, height: s.height });
    // Force the theme deterministically (independent of toggle state).
    await page.evaluate((light) => {
      const root = document.documentElement;
      root.classList.toggle("light", light);
      root.classList.toggle("dark", !light);
    }, s.light);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${SHOTS}/${s.name}.png`, fullPage: true });
  }
});
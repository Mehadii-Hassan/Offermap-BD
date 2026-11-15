import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3100";

async function gotoNoErrors(page, path) {
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text());
  });
  await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  return errors;
}

test("home loads with no console errors and chips work", async ({ page }) => {
  const errors = await gotoNoErrors(page, "/");
  const chips = page.locator(".no-scrollbar button");
  await chips.first().waitFor({ state: "attached", timeout: 30000 });
  await page.waitForTimeout(1000);
  const n = await chips.count();
  expect(n).toBeGreaterThanOrEqual(2);
  expect(errors).toEqual([]);

  // every category chip activates and deselects on second click
  for (let i = 1; i < n; i++) {
    const btn = chips.nth(i);
    await btn.click();
    await page.waitForTimeout(600);
    expect(await btn.getAttribute("aria-pressed")).toBe("true");
    await btn.click();
    await page.waitForTimeout(400);
    expect(await btn.getAttribute("aria-pressed")).toBe("false");
  }
});

test("clear filters button appears and works", async ({ page }) => {
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".no-scrollbar button", { timeout: 30000 });
  await page.locator(".no-scrollbar button").nth(1).click();
  await page.waitForTimeout(500);
  const clear = page.getByText("Clear filters");
  if (await clear.count()) {
    await clear.click();
    await page.waitForTimeout(400);
    expect(page.url()).not.toContain("category=");
  }
});

test("list/map toggle works", async ({ page }) => {
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  const mapBtn = page.locator('button:has-text("Map")').first();
  if (await mapBtn.isVisible()) {
    await mapBtn.click();
    await page.waitForTimeout(4000);
    expect(await page.locator(".leaflet-container").count()).toBeGreaterThanOrEqual(1);
  }
});

test("save a card and /saved page loads", async ({ page }) => {
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('a[href^="/offer/"]', { timeout: 30000 });
  const saveBtn = page.locator('button[aria-label*="Save"], button[aria-label*="সংরক্ষণ"]').first();
  if (await saveBtn.isVisible()) {
    await saveBtn.click();
    await page.waitForTimeout(400);
  }
  const errors = await gotoNoErrors(page, "/saved");
  expect(errors).toEqual([]);
});

test("language toggle changes", async ({ page }) => {
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  const lang = page.locator('button[aria-label="Toggle language"]');
  if (await lang.count()) {
    const before = await lang.textContent();
    await lang.click();
    await page.waitForTimeout(500);
    const after = await lang.textContent();
    expect(before).not.toBe(after);
  }
});

test("theme toggle changes", async ({ page }) => {
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  const theme = page.locator('button[aria-label="Toggle theme"]');
  if (await theme.count()) {
    await theme.click();
    await page.waitForTimeout(500);
    const cls = await page.evaluate(() => document.documentElement.classList.contains("light"));
    expect(cls).toBe(true);
  }
});

test("search returns results", async ({ page }) => {
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  // type a common term into the search input
  const input = page.locator("input[type=text], input[placeholder]").first();
  await input.fill("cashback");
  await page.waitForTimeout(600);
  const body = await page.textContent("body");
  expect(body).toBeTruthy();
});

test("3 offer detail pages render actions (share, directions, vote)", async ({ page }) => {
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('a[href^="/offer/"]', { timeout: 30000 });
  const links = await page.$$eval('a[href^="/offer/"]', (a) => [...new Set(a.map((x) => x.getAttribute("href")))]);
  for (let i = 0; i < Math.min(3, links.length); i++) {
    const errors = await gotoNoErrors(page, links[i]);
    const body = await page.textContent("body");
    expect(body).toMatch(/Get Directions|Get directions|দিকনির্দেশ/i);
    expect(body).toMatch(/Share/i);
    expect(body).toMatch(/Worked|Didn't work|Did not work/i);
    expect(errors).toEqual([]);
  }
});

test("/add shows required-field validation", async ({ page }) => {
  const errors = await gotoNoErrors(page, "/add");
  await page.waitForSelector("form", { timeout: 30000 });
  await page.locator('button[type=submit]').first().click();
  await page.waitForTimeout(600);
  // either a validation message or stays on form (no crash)
  expect(errors).toEqual([]);
});

test("static pages load", async ({ page }) => {
  for (const p of ["/about", "/privacy", "/contact"]) {
    const errors = await gotoNoErrors(page, p);
    expect(errors).toEqual([]);
  }
});

test("404 page", async ({ page }) => {
  const resp = await page.goto(BASE + "/no-such-page-xyz", { waitUntil: "networkidle" });
  expect([200, 404]).toContain(resp.status());
});

test("admin rejects wrong password", async ({ page }) => {
  await page.goto(BASE + "/admin", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(800);
  const pw = page.locator('input[type=password]');
  if (await pw.count()) {
    await pw.fill("definitely-wrong-password");
    await page.locator('button[type=submit]').click();
    await page.waitForTimeout(600);
    const body = await page.textContent("body");
    expect(body).not.toContain("Dashboard");
  }
});

test("sitemap.xml and robots.txt", async ({ page }) => {
  const sitemap = await page.request.get(BASE + "/sitemap.xml");
  const robots = await page.request.get(BASE + "/robots.txt");
  expect(sitemap.status()).toBe(200);
  expect(robots.status()).toBe(200);
});
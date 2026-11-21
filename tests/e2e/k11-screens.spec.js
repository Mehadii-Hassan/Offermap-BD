import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3100";
const SHOTS = "docs/screens";

// K11: screenshot sweep — 6 pages x 2 themes x 2 sizes = 24 PNGs.

async function shoot(page, name, light, width, height, fullPage) {
  await page.setViewportSize({ width, height });
  await page.evaluate((l) => {
    const root = document.documentElement;
    root.classList.toggle("light", l);
    root.classList.toggle("dark", !l);
  }, light);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: !!fullPage });
}

test("K11: screenshots saved for home, filtered, map, detail, add, saved", async ({ page }) => {
  test.setTimeout(300000);

  // Home, dark + light, 390 + 1440.
  for (const light of [false, true]) {
    await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForSelector('a[href^="/offer/"]', { timeout: 30000 });
    await shoot(page, `home-${light ? "light" : "dark"}`, light, 390, 844, true);
    await shoot(page, `home-${light ? "light" : "dark"}`, light, 1440, 900, true);
  }

  // Category-filtered home.
  await page.goto(BASE + "/?category=Restaurant", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  await shoot(page, "filtered-390-dark", false, 390, 844, true);
  await shoot(page, "filtered-390-light", true, 390, 844, true);
  await shoot(page, "filtered-1440-dark", false, 1440, 900, true);
  await shoot(page, "filtered-1440-light", true, 1440, 900, true);

  // Map view.
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  const mapBtn = page.locator('button:has-text("Map")').first();
  await mapBtn.click();
  await page.waitForSelector(".leaflet-container", { timeout: 30000 });
  await shoot(page, "map-390-dark", false, 390, 844, false);
  await shoot(page, "map-390-light", true, 390, 844, false);
  await shoot(page, "map-1440-dark", false, 1440, 900, false);
  await shoot(page, "map-1440-light", true, 1440, 900, false);

  // Offer detail.
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('a[href^="/offer/"]', { timeout: 30000 });
  const href = await page.locator('a[href^="/offer/"]').first().getAttribute("href");
  await page.goto(BASE + href, { waitUntil: "networkidle", timeout: 60000 });
  await shoot(page, "detail-390-dark", false, 390, 844, true);
  await shoot(page, "detail-390-light", true, 390, 844, true);
  await shoot(page, "detail-1440-dark", false, 1440, 900, true);
  await shoot(page, "detail-1440-light", true, 1440, 900, true);

  // /add.
  await page.goto(BASE + "/add", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("form", { timeout: 30000 });
  await shoot(page, "add-390-dark", false, 390, 844, true);
  await shoot(page, "add-390-light", true, 390, 844, true);
  await shoot(page, "add-1440-dark", false, 1440, 900, true);
  await shoot(page, "add-1440-light", true, 1440, 900, true);

  // /saved.
  await page.goto(BASE + "/saved", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  await shoot(page, "saved-390-dark", false, 390, 844, true);
  await shoot(page, "saved-390-light", true, 390, 844, true);
  await shoot(page, "saved-1440-dark", false, 1440, 900, true);
  await shoot(page, "saved-1440-light", true, 1440, 900, true);
});

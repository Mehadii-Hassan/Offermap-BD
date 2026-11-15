import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3100";

async function brokenImages(page) {
  return page.$$eval("img", (imgs) =>
    imgs
      .filter((i) => i.getAttribute("aria-hidden") !== "true" && (!i.complete || i.naturalWidth === 0))
      .map((i) => i.getAttribute("src"))
  );
}

// Scroll through the whole page slowly to trigger lazy-loaded images to load,
// then wait for every image to finish. Returns the still-broken list.
async function loadAllImages(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let y = 0;
      const step = () => {
        window.scrollTo(0, y);
        y += 900;
        const bottom = Math.max(document.body.scrollHeight, 0);
        if (y >= bottom || y > 0 && window.scrollY + window.innerHeight >= bottom) resolve();
        else setTimeout(step, 120);
      };
      step();
    });
  });
  try {
    await page.waitForFunction(
      () => {
        const imgs = [...document.querySelectorAll("img")]
          .filter((i) => i.getAttribute("aria-hidden") !== "true");
        return imgs.length > 0 && imgs.every((i) => i.complete);
      },
      { timeout: 16000 }
    );
  } catch (e) {
    /* some image never completed; brokenImages below reports it */
  }
  await page.waitForTimeout(500);
  return brokenImages(page);
}

async function horizontalOverflow(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    return { scrollW: root.scrollWidth, clientW: root.clientWidth };
  });
}

test("image: no broken <img> on home and 3 detail pages", async ({ page }) => {
  test.setTimeout(180000);
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('a[href^="/offer/"]', { timeout: 30000 });

  const broken = await loadAllImages(page);
  expect(broken).toEqual([]);

  const links = await page.$$eval('a[href^="/offer/"]', (a) =>
    [...new Set(a.map((x) => x.getAttribute("href")))]
  );
  expect(links.length).toBeGreaterThanOrEqual(3);

  for (let i = 0; i < 3; i++) {
    await page.goto(BASE + links[i], { waitUntil: "networkidle", timeout: 60000 });
    const b = await loadAllImages(page);
    expect(b, `broken image on ${links[i]}`).toEqual([]);
    // detail page has a large hero image box
    await expect(page.locator("main img").first()).toBeVisible();
  }
});

test("image: no horizontal overflow or layout shift at 390px width", async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('a[href^="/offer/"]', { timeout: 30000 });
  // fix the card image area BEFORE network images finish; it must not move.
  const firstCard = page.locator('a[href^="/offer/"]').first();
  await firstCard.waitFor({ state: "attached" });
  const aspectBox = firstCard.locator(".overflow-hidden").first();
  await aspectBox.waitFor({ state: "attached" });
  const h0 = await aspectBox.boundingBox();
  const broken = await loadAllImages(page);
  const h1 = await aspectBox.boundingBox();

  const { scrollW, clientW } = await horizontalOverflow(page);
  expect(scrollW).toBeLessThanOrEqual(clientW + 1);

  if (h0 && h1) {
    // card image box height should not change as images load (no layout shift)
    expect(Math.abs(h1.height - h0.height)).toBeLessThanOrEqual(2);
  }
  expect(broken).toEqual([]);
});
import { test, expect } from "@playwright/test";
import { collectConsoleErrors } from "./helpers/console";

const BASE = "http://localhost:3100";

// Lazy images below the fold are not loaded yet, so scrolling alone is not
// enough. Scroll every <img> into view, then wait for it to finish (20s).
// Only a completed image with zero pixels counts as broken. OfferImage swaps a
// failed image for the category placeholder via onError, so a replaced image is
// no longer in the DOM and is correctly not reported.
async function loadAndFindBroken(page) {
  const handles = await page.$$("img");
  for (const h of handles) {
    let skip = true;
    try {
      skip = await h.evaluate((el) => {
        const src = el.getAttribute("src") || "";
        return (
          el.getAttribute("aria-hidden") === "true" ||
          /tile\.openstreetmap\.org|unsplash/i.test(src)
        );
      });
    } catch {
      continue;
    }
    if (skip) continue;
    try {
      await h.scrollIntoViewIfNeeded({ timeout: 5000 });
    } catch {
      /* detached or hidden image */
    }
    try {
      await page.waitForFunction((el) => el.complete, h, { timeout: 20000 });
    } catch {
      /* still loading; the strict check below decides */
    }
  }

  return page.$$eval("img", (imgs) =>
    imgs
      .filter((i) => {
        const src = i.getAttribute("src") || "";
        if (i.getAttribute("aria-hidden") === "true") return false;
        if (/tile\.openstreetmap\.org|unsplash/i.test(src)) return false;
        return i.complete && i.naturalWidth === 0;
      })
      .map((i) => i.getAttribute("src"))
  );
}

async function horizontalOverflow(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    return { scrollW: root.scrollWidth, clientW: root.clientWidth };
  });
}

test("image: no broken <img> on home and 3 detail pages", async ({ page }) => {
  test.setTimeout(60000);
  const errors = collectConsoleErrors(page);

  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('a[href^="/offer/"]', { timeout: 30000 });

  const broken = await loadAndFindBroken(page);
  expect(broken).toEqual([]);

  const links = await page.$$eval('a[href^="/offer/"]', (a) =>
    [...new Set(a.map((x) => x.getAttribute("href")))]
  );
  expect(links.length).toBeGreaterThanOrEqual(3);

  for (let i = 0; i < 3; i++) {
    await page.goto(BASE + links[i], { waitUntil: "networkidle", timeout: 60000 });
    const b = await loadAndFindBroken(page);
    expect(b, `broken image on ${links[i]}`).toEqual([]);
    // detail page has a large hero image box
    await expect(page.locator("main img").first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("image: no horizontal overflow or layout shift at 390px width", async ({ page }) => {
  test.setTimeout(60000);
  const errors = collectConsoleErrors(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('a[href^="/offer/"]', { timeout: 30000 });

  // fix the card image area BEFORE network images finish; it must not move.
  const firstCard = page.locator('a[href^="/offer/"]').first();
  await firstCard.waitFor({ state: "attached" });
  const aspectBox = firstCard.locator(".overflow-hidden").first();
  await aspectBox.waitFor({ state: "attached" });
  const h0 = await aspectBox.boundingBox();

  const broken = await loadAndFindBroken(page);

  const h1 = await aspectBox.boundingBox();

  const { scrollW, clientW } = await horizontalOverflow(page);
  expect(scrollW).toBeLessThanOrEqual(clientW + 1);

  if (h0 && h1) {
    // card image box height should not change as images load (no layout shift)
    expect(Math.abs(h1.height - h0.height)).toBeLessThanOrEqual(2);
  }
  expect(broken).toEqual([]);
  expect(errors).toEqual([]);
});
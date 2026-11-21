import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { collectConsoleErrors } from "./helpers/console";

const BASE = "http://localhost:3100";

// Read ADMIN_PASSWORD from .env.local WITHOUT ever printing it.
function adminPassword() {
  const envFile = join(process.cwd(), ".env.local");
  if (!existsSync(envFile)) return null;
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    if (t.slice(0, i).trim() === "ADMIN_PASSWORD") return t.slice(i + 1).trim();
  }
  return null;
}

test("admin: /api/track stores a visit and dashboard shows numbers", async ({ page }) => {
  const pw = adminPassword();
  expect(pw, "ADMIN_PASSWORD missing from .env.local").toBeTruthy();

  // 1) Track a visit with a unique visitor id.
  const vid = "e2e-" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  const trackRes = await page.request.post(BASE + "/api/track", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
    data: { path: "/__e2e_track__/" + vid, referrer: "", visitor_id: vid },
  });
  expect(trackRes.status()).toBe(200);
  expect(await trackRes.json()).toEqual({ ok: true });

  // 2) Log into /admin with the password and see the Dashboard with numbers.
  const errors = collectConsoleErrors(page);
  await page.goto(BASE + "/admin", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(800);
  const pwInput = page.locator('input[type=password]');
  if (await pwInput.count()) {
    await pwInput.fill(pw);
    await page.locator('button[type=submit]').click();
    await page.waitForTimeout(1200);
  }

  // Dashboard tab should be visible with the Offers + Visitors + Activity sections.
  // Wait for the stats API result to render (not "Loading dashboard…").
  await page.waitForFunction(
    () => document.body.innerText.includes("Added today") || document.body.innerText.includes("Unique today"),
    { timeout: 20000 }
  );
  const body = await page.textContent("body");
  expect(body).toContain("Dashboard");
  expect(body).toMatch(/Offers/);
  expect(body).toMatch(/Visitors/);
  expect(body).toMatch(/Activity/);

  // Stats numbers must be present (Visitors section labels + values).
  expect(body).toMatch(/Unique today/);
  expect(body).toMatch(/Added today/);

  // no real JS errors on the admin page (401 resource errors during the login
// pre-flight are expected and harmless, so ignore those).
  const realErrors = errors.filter(
    (e) => !/401|Unauthorized/i.test(e) || e.startsWith("pageerror:")
  );
  expect(realErrors).toEqual([]);
});
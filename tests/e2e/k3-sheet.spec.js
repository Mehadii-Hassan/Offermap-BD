import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3100";

// K3: shared Sheet primitive behaviour (focus trap, Esc, scroll lock).

test("K3: location picker closes on Escape", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send("Browser.setPermission", { origin: "http://localhost:3100", permission: "geolocation", setting: "denied" });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.locator('button[aria-label="Change location"]').click();
  const divBtn = page.getByRole("button", { name: /All divisions/i });
  await expect(divBtn).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(divBtn).toBeHidden();
});

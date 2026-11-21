import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3100";

// K3: shared Sheet primitive behaviour (Esc closes, focus trap, scroll lock).

test("K3: location sheet closes on Escape", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.locator('button[aria-label="Change location"]').click();
  const useCurrent = page.getByRole("dialog").getByRole("button", { name: "Use current" });
  await expect(useCurrent).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(useCurrent).toBeHidden();
});

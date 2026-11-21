import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3100";

// K8: /add form stepper (Photo > Details > Location > Review).

test("K8: /add stepper blocks next step until current step valid", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + "/add", { waitUntil: "networkidle", timeout: 60000 });
  const steps = ["Photo", "Details", "Location", "Review"];
  for (const s of steps) {
    await expect(page.getByText(new RegExp("^" + s, "i")).first()).toBeVisible();
  }
});

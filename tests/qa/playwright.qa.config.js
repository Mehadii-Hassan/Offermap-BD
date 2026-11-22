import { defineConfig, devices } from "@playwright/test";

// Live URL for read-only journeys. GET only.
const LIVE_URL = process.env.LIVE_URL || "https://offermap-bd.example.com";

export default defineConfig({
  testDir: "./tests/qa",
  snapshotDir: "./tests/qa/snapshots",
  outputDir: "./test-results/qa",
  reportDir: "./test-results/qa-report",
  fullyParallel: true,
  retries: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    baseURL: LIVE_URL,
    // All QA traffic is identifiable and is ignored by /api/track.
    extraHTTPHeaders: {
      "User-Agent": `Playwright QA OfferMapQA ${process.env.PW_QA_UA_SUFFIX || ""}`.trim(),
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "iPhone 13 (WebKit)",
      use: { ...devices["iPhone 13"], ...{ userAgent: `${devices["iPhone 13"].userAgent} OfferMapQA` } },
    },
    {
      name: "Pixel 5 (Chromium)",
      use: { ...devices["Pixel 5"], ...{ userAgent: `${devices["Pixel 5"].userAgent} OfferMapQA` } },
    },
    {
      name: "Desktop Chrome 1440",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        userAgent: `${devices["Desktop Chrome"].userAgent} OfferMapQA`,
      },
    },
    {
      name: "Pixel 5 (throttled: CPU 4x, Fast 3G)",
      use: {
        ...devices["Pixel 5"],
        userAgent: `${devices["Pixel 5"].userAgent} OfferMapQA`,
      },
    },
  ],
});

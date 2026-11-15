import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3100",
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run start -- -p 3100",
    port: 3100,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
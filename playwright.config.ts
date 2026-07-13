import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.HEY_RALLI_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/hey-ralli",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["./tests/hey-ralli/reporters/plain-english-reporter.ts"],
    ["html", { open: "never", outputFolder: "playwright-report/hey-ralli" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 15_000,
  },
  outputDir: "test-results/hey-ralli",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Reuse a running local app when present so we do not fight an existing
  // `npm run dev` process or corrupt the .next-dev cache.
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});

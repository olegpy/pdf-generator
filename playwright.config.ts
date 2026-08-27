import { defineConfig, devices } from "@playwright/test";
import { appOrigin } from "./lib/config";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: appOrigin,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: appOrigin,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

import { defineConfig, devices } from "@playwright/test";
import { defaultAppOrigin } from "./lib/config";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: defaultAppOrigin,
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
    url: defaultAppOrigin,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

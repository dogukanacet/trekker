import { defineConfig, devices } from "@playwright/test";

if (process.env.CI && !process.env.E2E_BASE_URL) {
  // Without a target URL the config would silently start a local dev server on the CI runner.
  throw new Error("E2E_BASE_URL is not set. Add it as a variable of the GitHub environment.");
}

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts", // keeps these files out of Vitest's default *.test / *.spec pattern
  workers: 1,
  // No retries: a retry would start another demo and burn the per-IP demo limit (3 per hour).
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "en-US",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Locally, start the app unless a target URL is given.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000/en/login",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});

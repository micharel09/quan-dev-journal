import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
// Brocoders Playwright configuration adapted to Journal's dedicated API fixture DB.
export default defineConfig({
  testDir: "./playwright-tests/journal",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  outputDir: process.env.JOURNAL_TEST_OUTPUT || "test-results",
  preserveOutput: "never",
  use: {
    baseURL: "http://localhost:3000",
    trace: "off",
    screenshot: "off",
    video: "off",
    launchOptions: { executablePath: process.env.JOURNAL_CHROMIUM_EXECUTABLE },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: [
    {
      command: "cd ../backend && NODE_ENV=production node dist/main.js",
      url: "http://127.0.0.1:3001",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run start -- --hostname 127.0.0.1",
      url: "http://localhost:3000/blog",
      reuseExistingServer: !process.env.CI,
    },
  ],
});

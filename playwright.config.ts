import { defineConfig } from "@playwright/test";

const production = process.env.MOMENTS_TEST_PRODUCTION === "1";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:5179",
    browserName: "chromium",
    channel: process.platform === "win32" ? "msedge" : undefined,
    viewport: { width: 1440, height: 1080 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: production ? "pnpm preview --port 5179" : "pnpm dev --port 5179",
    url: "http://127.0.0.1:5179",
    reuseExistingServer: !production && !process.env.CI,
    timeout: 60_000,
  },
});

import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
if (
  process.env.BAZAR_BROWSER_INTEGRATION !== "1" ||
  !process.env.BAZAR_BROWSER_STATE
)
  throw new Error("Use isolated API test:browser runner");
const state = JSON.parse(
  readFileSync(process.env.BAZAR_BROWSER_STATE, "utf8"),
) as { origin: string; spki: string };
export default defineConfig({
  testDir: "./storefront-tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 60000,
  outputDir: "storefront-results",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "storefront-report" }],
  ],
  use: {
    baseURL: state.origin,
    ignoreHTTPSErrors: false,
    launchOptions: {
      args: ["--ignore-certificate-errors-spki-list=" + state.spki],
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "server-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "server-mobile",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});

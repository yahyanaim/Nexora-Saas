import { defineConfig, devices } from "@playwright/test"

/**
 * End-to-end tests against a production build.
 *
 * Build first with the mock API wired through the same-origin proxy:
 *   API_PROXY_TARGET=http://127.0.0.1:4500 \
 *   NEXT_PUBLIC_API_URL=http://localhost:3100/api npm run build
 */
const PORT = 3100
const MOCK_API = "http://127.0.0.1:4500"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node e2e/mock-api.mjs",
      url: `${MOCK_API}/api/auth/me`,
      // Playwright treats 2xx-403 as ready; the mock answers 401 when logged out
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npx next start -p ${PORT}`,
      env: {
        API_PROXY_TARGET: MOCK_API,
        NEXT_PUBLIC_API_URL: `http://localhost:${PORT}/api`,
      },
      url: `http://localhost:${PORT}/en/auth`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})

import { defineConfig, devices } from '@playwright/test';

// Playwright drives the built static bundle and the Storybook build for screenshots.
// Projects:
//  - chromium:      end-to-end load/control tests against the built app (npm run build first)
//  - screenshots:   capture Storybook component screenshots
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:4173';
const STORYBOOK_URL = process.env.STORYBOOK_URL ?? 'http://localhost:6006';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: {
    // Serve the built static app for the app.spec end-to-end test.
    command: 'npx vite preview --port 4173 --strictPort',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /screenshots\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: BASE_URL,
      },
    },
    {
      name: 'screenshots',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: STORYBOOK_URL,
      },
      testMatch: /screenshots\.spec\.ts/,
    },
  ],
});

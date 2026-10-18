import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests: a real browser drives the real app (React build + Express
 * API + MongoDB). Playwright starts its own servers on separate ports with a
 * throwaway database (shortify_e2e), so development data is never touched.
 */
export const API_PORT = 5100;
export const WEB_PORT = 5174;
export const API_URL = `http://localhost:${API_PORT}`;
export const WEB_URL = `http://localhost:${WEB_PORT}`;
export const E2E_DATABASE = 'mongodb://127.0.0.1:27017/shortify_e2e';

// E2E_SINGLE_SERVICE=1 tests the production deployment shape: one Express server
// serves the built website, the API, and the short links from one address.
const singleService = Boolean(process.env.E2E_SINGLE_SERVICE);

// Locally: the installed Google Chrome (no browser download needed).
// CI: Playwright's own Chromium (installed with "npx playwright install chromium").
const channel = process.env.CI ? undefined : 'chrome';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalTeardown: './scripts/globalTeardown.js',

  use: {
    baseURL: singleService ? API_URL : WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel, permissions: ['clipboard-read', 'clipboard-write'] },
      testIgnore: /mobile\.spec\.js/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], channel },
      testMatch: /mobile\.spec\.js/,
    },
  ],

  webServer: [
    {
      // Empty the test database first, then start the real API with test settings.
      // In single-service mode, build the website first and let the API serve it.
      command: singleService
        ? 'npm --prefix ../client run build && node scripts/resetDb.js && node ../server/src/server.js'
        : 'node scripts/resetDb.js && node ../server/src/server.js',
      url: `${API_URL}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        NODE_ENV: 'development',
        PORT: String(API_PORT),
        MONGO_URI: E2E_DATABASE,
        PUBLIC_BASE_URL: API_URL,
        CLIENT_ORIGIN: singleService ? API_URL : WEB_URL,
        JWT_SECRET: 'e2e-only-secret-never-used-outside-these-tests-0123456789',
        BCRYPT_ROUNDS: '4',
        TRUST_PROXY: '0',
        // Generous limits: the suite creates many accounts and links quickly.
        API_LIMIT_PER_MINUTE: '100000',
        CREATE_LINK_LIMIT_PER_MINUTE: '10000',
        REDIRECT_LIMIT_PER_MINUTE: '10000',
        LOGIN_LIMIT_PER_15_MINUTES: '10000',
        REGISTER_LIMIT_PER_HOUR: '10000',
        ...(singleService && { CLIENT_DIST_DIR: '../client/dist' }),
      },
    },
    ...(singleService ? [] : [{
      // A production build of the frontend, served with /api forwarded to the test API.
      command: `npm --prefix ../client run build && npm --prefix ../client run preview -- --port ${WEB_PORT} --strictPort`,
      url: WEB_URL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { VITE_API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}` },
    }]),
  ],
});

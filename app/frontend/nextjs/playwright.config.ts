import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for SuperCrypto frontend
 * Based on BMAD testarch knowledge base standards
 */
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/playwright',
  
  // Parallel execution for speed
  fullyParallel: true,
  
  // Fail fast in CI, allow retries locally
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporters: HTML for visual review, list for terminal
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  
  // Standardized timeouts from BMAD testarch
  timeout: 60000,
  expect: { timeout: 10000 },
  
  use: {
    // Base URL for local development
    baseURL: 'http://localhost:3000',
    
    // Action and navigation timeouts
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // Capture artifacts on failure
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Browser configurations
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewports
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Web server configuration - optional, for CI
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});

/**
 * Standalone Playwright Configuration for AR-82 Tests
 * 
 * This configuration is specifically designed for the AR-82 testing infrastructure
 * and doesn't depend on existing project configuration.
 * 
 * Author: Claude
 * Created: 2025-08-10
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './playwright',
  
  // Global setup and teardown
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.ts'),
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Number of parallel workers
  workers: process.env.CI ? 1 : 2,
  
  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html' }],
    ['json', { outputFile: 'reports/results.json' }]
  ],
  
  // Global test configuration
  use: {
    // Base URL for navigation
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    // Capture trace on first retry
    trace: 'on-first-retry',
    
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    
    // Capture video on failure
    video: 'retain-on-failure',
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    // Uncomment for Firefox testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    
    // Uncomment for Safari testing
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
  
  // Configure timeout
  timeout: 30 * 1000, // 30 seconds
  expect: {
    timeout: 10 * 1000, // 10 seconds
  },
  
  // Output directory
  outputDir: 'test-results/',
});
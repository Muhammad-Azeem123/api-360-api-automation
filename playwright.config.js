const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  // Global Setup script to run before all tests
  globalSetup: require.resolve('./utils/global-setup'),

  // Directory where the test files are located
  testDir: '.',

  // Match only spec files inside the tests/ directory
  testMatch: 'tests/**/*.spec.js',

  // Exclude helper spec files/modules from being treated as standalone tests by Playwright
  testIgnore: [
    '**/Published_module/**',
    '**/Target Service/**'
  ],

  // Run tests in files in parallel? For API testing, we disable this globally
  // and run sequentially to avoid overloading the test environment.
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,

  // Retry failed tests. We set it to 0 for a clean debug cycle.
  retries: 0,

  // Limit the number of workers. For local API testing, running in a single worker 
  // ensures requests execute in a predictable, sequential order.
  workers: 1,

  // Reporter to use. We use the 'html' reporter to generate detailed visual reports.
  // 'open: "never"' prevents the HTML report from opening automatically in the browser after a run.
  reporter: [
    ['html', { open: 'never' }]
  ],

  // Shared settings for all the projects below.
  use: {
    // Collect trace when retrying a failed test.
    trace: 'on-first-retry',
    
    // Extra HTTP headers to send with every request.
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },

  // NOTE: We intentionally do NOT define projects (e.g., chromium, firefox, webkit)
  // or a 'browserName' in the 'use' object. This prevents Playwright from downloading 
  // and launching browser binaries, keeping this an API-only test suite.
});

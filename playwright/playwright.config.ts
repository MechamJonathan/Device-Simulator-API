import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5231',
    extraHTTPHeaders: {
      'X-Api-Key': 'dev-api-key',
    },
    trace: 'on-first-retry',
  },
  projects: [{ name: 'api' }],
  webServer: {
    command: 'dotnet run --launch-profile http',
    cwd: '..',
    url: 'http://localhost:5231/api/devices',
    reuseExistingServer: !process.env.CI,
  },
});

import { test as base, expect } from '@playwright/test';

export const test = base.extend<{ resetApi: void }>({
  resetApi: [async ({ request }, use) => {
    const response = await request.post('/api/test/reset');
    expect(response.status(), 'API reset before test').toBe(204);
    await use();
  }, { auto: true }],
});

export { expect };
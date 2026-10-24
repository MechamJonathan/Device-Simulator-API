import { test, expect } from './fixtures/api';

const deviceId = 'analyzer-01';

test('STAT-1: a device that has never been run returns 200 with status "Idle" and runId null', async ({ request }) => {
  const response = await request.get(`/api/devices/${deviceId}/status`);
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({
    status: 'Idle',
    runId: null,
  });
});
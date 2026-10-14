import { test, expect } from '@playwright/test';

const deviceId = 'analyzer-01';

test.afterEach(async ({ request }) => {
  // Run state is shared across tests, so leave the device stopped for the next one.
  // This returns 409 if the device isn't running, which is fine here.
  await request.post(`/api/devices/${deviceId}/stop`);
});

test('RUN-3: starting a device that is already running returns 409', async ({ request }) => {
  const first = await request.post(`/api/devices/${deviceId}/start`, { data: {} });
  expect(first.status()).toBe(202);
  const firstRun = await first.json();

  const second = await request.post(`/api/devices/${deviceId}/start`, { data: {} });
  expect(second.status()).toBe(409);

  // The rejected start must not replace the run that's already in progress.
  const status = await request.get(`/api/devices/${deviceId}/status`);
  expect(status.status()).toBe(200);
  expect(await status.json()).toMatchObject({
    status: 'Running',
    runId: firstRun.runId,
  });
});

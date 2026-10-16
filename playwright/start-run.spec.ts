import { test, expect } from '@playwright/test';

const deviceId = 'analyzer-01';

test.afterEach(async ({ request }) => {
  await request.post(`/api/devices/${deviceId}/stop`);
});


test('RUN-1: starting a device with body `{}` returns 202', async ({ request }) => {
  const response = await request.post(`/api/devices/${deviceId}/start`, { data: {} });
  expect(response.status()).toBe(202);
});

//| RUN-2 | The response has a GUID `runId`, `status: "Running"`, an ISO-8601 UTC `startedAt` and `stoppedAt: null`. |
test('RUN-2: The response has a GUID `runId`, `status: "Running"`, an ISO-8601 UTC `startedAt` and `stoppedAt: null`.', async ({request}) => {
  const response = await request.post(`/api/devices/${deviceId}/start`, { data: {} });
});

test('RUN-3: starting a device that is already running returns 409', async ({ request }) => {
  const first = await request.post(`/api/devices/${deviceId}/start`, { data: {} });
  expect(first.status()).toBe(202);
  const firstRun = await first.json();

  const second = await request.post(`/api/devices/${deviceId}/start`, { data: {} });
  expect(second.status()).toBe(409);

  const status = await request.get(`/api/devices/${deviceId}/status`);
  expect(status.status()).toBe(200);
  expect(await status.json()).toMatchObject({
    status: 'Running',
    runId: firstRun.runId,
  });
});

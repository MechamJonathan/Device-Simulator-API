import { test, expect } from './fixtures/api';
import { getStatus } from './fixtures/helpers';

const deviceId = 'analyzer-01';

test.afterEach(async ({ request }) => {
  await request.post(`/api/devices/${deviceId}/stop`);
});


test('RUN-1: starting a device with body `{}` returns 202', async ({ request }) => {
  const response = await request.post(`/api/devices/${deviceId}/start`, { data: {} });
  expect(response.status()).toBe(202);
});

test('RUN-2: The response has a GUID `runId`, `status: "Running"`, an ISO-8601 UTC `startedAt` and `stoppedAt: null`.', async ({request}) => {
  const first = await request.post(`/api/devices/${deviceId}/start`, { data: {} });
  const firstRun = await first.json();
  expect(await getStatus(request, deviceId)).toMatchObject({
    status: 'Running',
    runId: firstRun.runId,
  });
});

test('RUN-3: starting a device that is already running returns 409', async ({ request }) => {
  const first = await request.post(`/api/devices/${deviceId}/start`, { data: {} });
  expect(first.status()).toBe(202);
  const firstRun = await first.json();

  const second = await request.post(`/api/devices/${deviceId}/start`, { data: {} });
  expect(second.status()).toBe(409);

  expect(await getStatus(request, deviceId)).toMatchObject({
    status: 'Running',
    runId: firstRun.runId,
  });
});

test('RUN-4: Starting a stopped device return 202 with new runId', async ({ request }) => {
  const first = await request.post(`/api/devices/${deviceId}/start`, { data: {} });
  
  expect(first.status()).toBe(202);
  const firstRun = await first.json();

  const stop = await request.post(`/api/devices/${deviceId}/stop`);
  expect(stop.status()).toBe(200);

  const second = await request.post(`/api/devices/${deviceId}/start`, { data: {} });
  expect(second.status()).toBe(202);
  const secondRun = await second.json();

  expect(secondRun.runId).not.toBe(firstRun.runId);
  expect(secondRun.status).toBe('Running');
});

test('RUN-5: Starting an unknown device returns 404.', async ({ request }) => {
  const response = await request.post('/api/devices/not-a-device/start', { data: {} });
  expect(response.status()).toBe(404);
});

test('RUN-6: Runs on different devices are independent.', async ({ request }) => {
  const start1 = await request.post('/api/devices/analyzer-01/start', { data: {} });
  expect(start1.status()).toBe(202);
  const run1 = await start1.json();

  const start2 = await request.post('/api/devices/analyzer-02/start', { data: {} });
  expect(start2.status()).toBe(202);
  const run2 = await start2.json();

  expect(run2.runId).not.toBe(run1.runId);

  expect(await getStatus(request, 'analyzer-01')).toMatchObject({ status: 'Running', runId: run1.runId });

  const stop2 = await request.post('/api/devices/analyzer-02/stop');
  expect(stop2.status()).toBe(200);

  expect(await getStatus(request, 'analyzer-01')).toMatchObject({ status: 'Running', runId: run1.runId });

  await expect.poll(async () => {
    const res = await request.get('/api/devices/analyzer-01/results');
    return (await res.json()).count;
  }).toBeGreaterThan(0);

  const results1 = await (await request.get('/api/devices/analyzer-01/results')).json();
  for (const reading of results1.readings) {
    expect(reading).toMatchObject({ deviceId: 'analyzer-01', runId: run1.runId });
  }
})
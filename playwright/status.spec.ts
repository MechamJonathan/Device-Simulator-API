import { test, expect } from './fixtures/api';
import { getStatus } from './fixtures/helpers';

const deviceId = 'analyzer-01';
const validStatuses = ['Idle', 'Running', 'Stopped', 'Faulted'];

test('STAT-1: a device that has never been run returns 200 with status "Idle" and runId null', async ({ request }) => {
  const response = await request.get(`/api/devices/${deviceId}/status`);
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({
    status: 'Idle',
    runId: null,
  });
});

test('STAT-2 Status shows `Running` during a run and `Stopped` after it is stopped, with the same `runId` the start call returned.', async ({ request }) => {
    const start = await request.post(`/api/devices/${deviceId}/start`, { data: {} });
    expect(start.status()).toBe(202);
    const startRun = await start.json();

    expect(await getStatus(request, deviceId)).toMatchObject({
        status: 'Running',
        runId: startRun.runId,
    });

    const stop = await request.post(`/api/devices/${deviceId}/stop`);
    expect(stop.status()).toBe(200);

    expect(await getStatus(request, deviceId)).toMatchObject({
        status: 'Stopped',
        runId: startRun.runId,
    });
});

test('STAT-3 Status for an unknown device returns 404.', async ({ request }) => {
    for (const badId of ['not-a-device', 'ANALYZER-01', 'analyzer-99']) {
        const response = await request.get(`/api/devices/${badId}/status`);
        expect(response.status(), `device "${badId}"`).toBe(404);

    expect(await response.json(), `device "${badId}"`).toMatchObject({
      status: 404,
      title: 'Not Found',
    });
  }
});

test('STAT-4 Statuses are strings (`"Running"`), not numbers.', async ({ request }) => {
    const idle = (await getStatus(request, deviceId)).status;

    await request.post(`/api/devices/${deviceId}/start`, { data: {} });
    const running = (await getStatus(request, deviceId)).status;

    await request.post(`/api/devices/${deviceId}/stop`, { data: {} });
    const stopped = (await getStatus(request, deviceId)).status;

    for (const status of [idle, running, stopped]) {
        expect(typeof status).toBe('string');
        expect(validStatuses).toContain(status);
    }
});
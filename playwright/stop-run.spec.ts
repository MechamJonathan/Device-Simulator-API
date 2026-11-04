import { test, expect } from './fixtures/api';
import { getResults, getStatus } from './fixtures/helpers';

const deviceId = 'analyzer-01';

test('STOP-1 Stopping a running device returns 200 with `status: "Stopped"` and a `stoppedAt` that is at or after `startedAt`', async ({ request }) => {
    const start = await request.post(`/api/devices/${deviceId}/start`, { data: {} });
    expect(start.status()).toBe(202);
    const startedRun = await start.json();

    const stop = await request.post(`/api/devices/${deviceId}/stop`, { data: {} });
    expect(stop.status()).toBe(200);
    const stoppedRun = await stop.json();
    expect(stoppedRun.status).toBe('Stopped');

    expect(await getStatus(request, deviceId)).toMatchObject({
        status: 'Stopped',
        runId: startedRun.runId,
        startedAt: startedRun.startedAt,
    });

    expect(stoppedRun.stoppedAt).not.toBeNull();
    const startedAt = Date.parse(stoppedRun.startedAt);
    const stoppedAt = Date.parse(stoppedRun.stoppedAt);
    expect(stoppedAt).not.toBeNaN();
    expect(stoppedAt).toBeGreaterThanOrEqual(startedAt);

    expect(await getStatus(request, deviceId)).toMatchObject({
        status: 'Stopped',
        runId: startedRun.runId,
        stoppedAt: stoppedRun.stoppedAt,
    });
});

test('STOP-2 | Stopping a device that has never run returns 404', async ({ request }) => {
    const stop = await request.post(`/api/devices/${deviceId}/stop`);
    expect(stop.status()).toBe(404);
    expect(await stop.json()).toMatchObject({ status: 404, title: 'Not Found' });

    expect(await getStatus(request, deviceId)).toMatchObject({
        status: 'Idle',
        runId: null,
    });
});

test('STOP-3 | Stopping a device that is already stopped returns 409', async ({ request }) => {
    const start = await request.post(`/api/devices/${deviceId}/start`, { data: {} });
    expect(start.status()).toBe(202);
    const startedRun = await start.json();

    const firstStop = await request.post(`/api/devices/${deviceId}/stop`);
    expect(firstStop.status()).toBe(200);
    const stoppedRun = await firstStop.json();

    const secondStop = await request.post(`/api/devices/${deviceId}/stop`);
    expect(secondStop.status()).toBe(409);
    expect(await secondStop.json()).toMatchObject({ status: 409, title: 'Conflict' });

    expect(await getStatus(request, deviceId)).toMatchObject({
        status: 'Stopped',
        runId: startedRun.runId,
        stoppedAt: stoppedRun.stoppedAt,
    });
});

test('STOP-3 | Stopping a device that is faulted returns 409', async ({ request }) => {
    const start = await request.post(`/api/devices/${deviceId}/start`, {
        data: { simulateDisconnect: true },
    });
    expect(start.status()).toBe(202);
    const startedRun = await start.json();

    await expect
        .poll(async () => (await getStatus(request, deviceId)).status, { timeout: 8_000 })
        .toBe('Faulted');

    const stop = await request.post(`/api/devices/${deviceId}/stop`);
    expect(stop.status()).toBe(409);
    expect(await stop.json()).toMatchObject({ status: 409, title: 'Conflict' });

    expect(await getStatus(request, deviceId)).toMatchObject({
        status: 'Faulted',
        runId: startedRun.runId,
        stoppedAt: null,
    });
});

test('STOP-4 | Once stop returns, no new readings show up in the results', async ({ request }) => {
    const start = await request.post(`/api/devices/${deviceId}/start`, { data: {} });
    expect(start.status()).toBe(202);
    const startedRun = await start.json();

    await expect
        .poll(async () => (await getResults(request, deviceId)).count, { timeout: 5_000 })
        .toBeGreaterThanOrEqual(2);

    const stop = await request.post(`/api/devices/${deviceId}/stop`);
    expect(stop.status()).toBe(200);

    const atStop = await getResults(request, deviceId);
    expect(atStop.runId).toBe(startedRun.runId);

    await new Promise((resolve) => setTimeout(resolve, 2_500));

    const later = await getResults(request, deviceId);
    expect(later.runId).toBe(startedRun.runId);
    expect(later.count).toBe(atStop.count);
});

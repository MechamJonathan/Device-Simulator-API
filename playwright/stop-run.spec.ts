import { test, expect } from './fixtures/api';
import { getStatus } from './fixtures/helpers';

const deviceId = 'analyzer-01';

test('STOP-1 Stopping a running device returns 200 with `status: "Stopped"` and a `stoppedAt` that is at or after `startedAt`', async ({ request }) => {
    const start = await request.post(`/api/devices/${deviceId}/start`, { data: {} });
    expect(start.status()).toBe(202);
    const startedRun = await start.json();

    const stop = await request.post(`/api/devices/${deviceId}/stop`, { data: {} });
    expect(stop.status()).toBe(200);
    const stoppedRun = await stop.json();


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
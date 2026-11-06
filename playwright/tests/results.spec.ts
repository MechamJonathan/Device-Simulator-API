import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures/api';
import {
  getResults,
  isRoundedTo2dp,
  sleep,
  startRun,
  stopRun,
  waitForReadings,
} from '../fixtures/helpers';
import { DEVICE_PROFILES } from '../fixtures/devices';

const deviceId = 'analyzer-01';

test('RES-1 | Results for a device that has never run return 404', async ({ request }) => {
  for (const id of Object.keys(DEVICE_PROFILES)) {
    const response = await request.get(`/api/devices/${id}/results`);
    expect(response.status(), `device "${id}"`).toBe(404);
    expect(await response.json(), `device "${id}"`).toMatchObject({ status: 404, title: 'Not Found' });
  }
});

test('RES-2 | The response has `deviceId`, `runId`, `count` and `readings`, and `count` equals `readings.length`', async ({ request }) => {
  const run = await startRun(request, deviceId);
  const results = await waitForReadings(request, deviceId, 2);

  expect(results).toMatchObject({
    deviceId,
    runId: run.runId,
    count: expect.any(Number),
    readings: expect.any(Array),
  });
  expect(results.count).toBe(results.readings.length);
});

test('RES-3 | Readings arrive about once per second. After waiting about 3.5 seconds, `count` is between 3 and 5', async ({ request }) => {
  await startRun(request, deviceId);
  await sleep(3_500);

  const { count } = await getResults(request, deviceId);
  expect(count).toBeGreaterThanOrEqual(3);
  expect(count).toBeLessThanOrEqual(5);
});

test('RES-4 | `sequenceNumber` starts at 0 and goes up by 1 with no gaps', async ({ request }) => {
  await startRun(request, deviceId);
  const { readings } = await waitForReadings(request, deviceId, 3);

  const sequenceNumbers = readings.map((r) => r.sequenceNumber);
  expect(sequenceNumbers).toEqual(sequenceNumbers.map((_, i) => i));
});

test('RES-5 | Every reading\'s `deviceId` and `runId` match the run, and its `status` is `"Ok"`', async ({ request }) => {
  const run = await startRun(request, deviceId);
  const { readings } = await waitForReadings(request, deviceId, 3);

  for (const reading of readings) {
    expect(reading, `reading ${reading.sequenceNumber}`).toMatchObject({
      deviceId,
      runId: run.runId,
      status: 'Ok',
    });
  }
});

test('RES-6 | Values stay in range for each profile and are rounded to 2 decimal places', async ({ request }) => {
  const profiles = Object.entries(DEVICE_PROFILES);
  for (const [id] of profiles) {
    await startRun(request, id);
  }

  for (const [id, profile] of profiles) {
    const { readings } = await waitForReadings(request, id, 3);

    for (const { sequenceNumber, reading } of readings) {
      const label = `${id} reading ${sequenceNumber} (value ${reading.value})`;
      expect(reading.type, label).toBe(profile.type);
      expect(reading.unit, label).toBe(profile.unit);
      expect(reading.value, label).toBeGreaterThanOrEqual(profile.min);
      expect(reading.value, label).toBeLessThanOrEqual(profile.max);
      expect(isRoundedTo2dp(reading.value), label).toBe(true);
    }
  }
});

test('RES-7 | Timestamps never go backward from one reading to the next', async ({ request }) => {
  await startRun(request, deviceId);
  const { readings } = await waitForReadings(request, deviceId, 3);

  const timestamps = readings.map((r) => Date.parse(r.timestamp));
  for (const [i, timestamp] of timestamps.entries()) {
    expect(timestamp, `reading ${i} timestamp`).not.toBeNaN();
    if (i > 0) {
      expect(timestamp, `reading ${i} vs reading ${i - 1}`).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }
  }
});

test('RES-8 | `?runId=<current run>` returns 200. Any other `runId` returns 404', async ({ request }) => {
  const run = await startRun(request, deviceId);

  const current = await getResults(request, deviceId, run.runId!);
  expect(current.runId).toBe(run.runId);

  const otherRunId = randomUUID();
  const other = await request.get(`/api/devices/${deviceId}/results`, { params: { runId: otherRunId } });
  expect(other.status(), `runId ${otherRunId}`).toBe(404);
  expect(await other.json()).toMatchObject({ status: 404, title: 'Not Found' });
});

test('RES-9 | Only the latest run is kept. After a new run starts, asking for the previous `runId` returns 404', async ({ request }) => {
  const firstRun = await startRun(request, deviceId);
  await stopRun(request, deviceId);
  const secondRun = await startRun(request, deviceId);

  const previous = await request.get(`/api/devices/${deviceId}/results`, { params: { runId: firstRun.runId! } });
  expect(previous.status(), 'previous runId').toBe(404);

  const latest = await getResults(request, deviceId, secondRun.runId!);
  expect(latest.runId).toBe(secondRun.runId);
});

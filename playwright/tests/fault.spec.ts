import { test, expect } from '../fixtures/api';
import { getResults, getStatus, sleep, startRun, waitForStatus } from '../fixtures/helpers';

const deviceId = 'analyzer-01';

test('FAULT-1 | With `{"simulateDisconnect": true}`, the status becomes `"Faulted"` within about 6 seconds', async ({ request }) => {
  const run = await startRun(request, deviceId, { simulateDisconnect: true });

  const faulted = await waitForStatus(request, deviceId, 'Faulted', 6_500);
  expect(faulted.runId).toBe(run.runId);
});

test('FAULT-2 | A faulted run has exactly 5 readings, with sequence numbers 0 through 4', async ({ request }) => {
  await startRun(request, deviceId, { simulateDisconnect: true });
  await waitForStatus(request, deviceId, 'Faulted');

  await sleep(1_500);

  const { count, readings } = await getResults(request, deviceId);
  expect(count).toBe(5);
  expect(readings.map((r) => r.sequenceNumber)).toEqual([0, 1, 2, 3, 4]);
});

test('FAULT-3 | A faulted run\'s `stoppedAt` stays `null`', async ({ request }) => {
  const run = await startRun(request, deviceId, { simulateDisconnect: true });

  const faulted = await waitForStatus(request, deviceId, 'Faulted');
  expect(faulted.stoppedAt).toBeNull();

  await sleep(1_500);

  expect(await getStatus(request, deviceId)).toMatchObject({
    status: 'Faulted',
    runId: run.runId,
    stoppedAt: null,
  });
});

test('FAULT-4 | With `{"latencyMs": 1000}`, readings are spaced about 2 seconds apart instead of about 1', async ({ request }) => {
  await startRun(request, deviceId, { latencyMs: 1000 });
  await sleep(5_000);

  const { count, readings } = await getResults(request, deviceId);
  expect(count).toBeGreaterThanOrEqual(1);
  expect(count).toBeLessThanOrEqual(3);

  const timestamps = readings.map((r) => Date.parse(r.timestamp));
  for (let i = 1; i < timestamps.length; i++) {
    expect(timestamps[i] - timestamps[i - 1], `gap before reading ${i}`).toBeGreaterThanOrEqual(1_500);
  }
});

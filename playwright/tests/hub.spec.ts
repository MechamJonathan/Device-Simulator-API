import { test, expect } from '../fixtures/hub';
import { getResults, sleep, startRun } from '../fixtures/helpers';
import { isFullReading } from '../fixtures/types';

const deviceId = 'analyzer-01';

test('HUB-1 | A client can connect to `/hubs/telemetry` without an API key', async ({ connectHub }) => {
  const hub = await connectHub();
  expect(hub.state).toBe('Connected');
});

test('HUB-2 | After calling `SubscribeToDevice("analyzer-01")`, the client receives `ReceiveTelemetry` events with the same shape as the results readings', async ({ connectHub, request }) => {
  const hub = await connectHub();
  await hub.subscribe(deviceId);
  const run = await startRun(request, deviceId);

  const events = await hub.waitForEvents(3, { deviceId });
  const { readings } = await getResults(request, deviceId);

  for (const event of events) {
    if (!isFullReading(event)) {
      throw new Error(`expected a full reading, got ${JSON.stringify(event)}`);
    }
    expect(event.runId).toBe(run.runId);

    const stored = readings.find((r) => r.sequenceNumber === event.sequenceNumber);
    expect(stored, `results reading ${event.sequenceNumber}`).toBeDefined();
    expect(event, `event ${event.sequenceNumber}`).toEqual(stored);
  }
});

test('HUB-3 | The client doesn\'t receive events for devices it hasn\'t subscribed to', async ({ connectHub, request }) => {
  const hub = await connectHub();
  await hub.subscribe('analyzer-01');

  await startRun(request, 'analyzer-01');
  await startRun(request, 'analyzer-02');

  await hub.waitForEvents(3, { deviceId: 'analyzer-01' });

  expect((await getResults(request, 'analyzer-02')).count).toBeGreaterThan(0);
  expect(hub.eventsFor('analyzer-02')).toHaveLength(0);
  for (const event of hub.events) {
    expect(event.deviceId).toBe('analyzer-01');
  }
});

test('HUB-4 | After `UnsubscribeFromDevice`, no more events arrive', async ({ connectHub, request }) => {
  const hub = await connectHub();
  await hub.subscribe(deviceId);
  await startRun(request, deviceId);
  await hub.waitForEvents(1, { deviceId });

  await hub.unsubscribe(deviceId);
  hub.clear();
  const countAtUnsubscribe = (await getResults(request, deviceId)).count;

  await sleep(2_500);

  expect(hub.events).toHaveLength(0);
  expect((await getResults(request, deviceId)).count).toBeGreaterThan(countAtUnsubscribe);
});

test('HUB-5 | With `{"malformedPayload": true}`, the 4th, 8th, 12th, … messages contain only `deviceId` and `runId`', async ({ connectHub, request }) => {
  const hub = await connectHub();
  await hub.subscribe(deviceId);
  const run = await startRun(request, deviceId, { malformedPayload: true });

  const events = (await hub.waitForEvents(8, { deviceId, timeout: 10_000 })).slice(0, 8);

  for (const [i, event] of events.entries()) {
    if ((i + 1) % 4 === 0) {
      expect(Object.keys(event).sort(), `message ${i + 1}`).toEqual(['deviceId', 'runId']);
      expect(event, `message ${i + 1}`).toEqual({ deviceId, runId: run.runId });
    } else {
      expect(isFullReading(event), `message ${i + 1}`).toBe(true);
      expect(event, `message ${i + 1}`).toMatchObject({ sequenceNumber: i });
    }
  }

  const { readings } = await getResults(request, deviceId);
  for (const sequenceNumber of [3, 7]) {
    const stored = readings.find((r) => r.sequenceNumber === sequenceNumber);
    expect(stored, `results reading ${sequenceNumber}`).toMatchObject({
      deviceId,
      runId: run.runId,
      sequenceNumber,
      reading: { value: expect.any(Number) },
    });
  }
});

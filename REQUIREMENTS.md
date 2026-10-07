# Device Simulator API: Test Requirements

## 1. Device catalog

| ID | Requirement |
|---|---|
| DEV-1 | `GET /api/devices` returns 200 without an API key. |
| DEV-2 | The response is an array of exactly 3 devices: `analyzer-01` (temperature), `analyzer-02` (opticalDensity) and `analyzer-03` (pressure). |
| DEV-3 | Each device has the string fields `deviceId`, `profile` and `description`. |

## 2. Authentication

| ID | Requirement |
|---|---|
| AUTH-1 | The start, stop, status and results endpoints return 401 when the `X-Api-Key` header is missing. |
| AUTH-2 | They also return 401 when the key is wrong. |
| AUTH-3 | The 401 body is `{"error":"Missing or invalid API key"}`. |
| AUTH-4 | The key is checked before the device is looked up, so an unknown device with no key returns 401, not 404. |
| AUTH-5 | `GET /openapi/v1.json` returns 200 without a key (Development environment only). |

## 3. Starting a run

`POST /api/devices/{deviceId}/start`

| ID | Requirement |
|---|---|
| RUN-1 | Starting a device with body `{}` returns 202. |
| RUN-2 | The response has a GUID `runId`, `status: "Running"`, an ISO-8601 UTC `startedAt` and `stoppedAt: null`. |
| RUN-3 | Starting a device that is already running returns 409. |
| RUN-4 | Starting a device after it was stopped or faulted returns 202 with a **new** `runId`. |
| RUN-5 | Starting an unknown device returns 404. |
| RUN-6 | Runs on different devices are independent. Starting `analyzer-02` doesn't affect `analyzer-01`. |

## 4. Status

`GET /api/devices/{deviceId}/status`

| ID | Requirement |
|---|---|
| STAT-1 | A device that has never been run returns 200 with `status: "Idle"` and `runId: null`. |
| STAT-2 | Status shows `Running` during a run and `Stopped` after it is stopped, with the same `runId` the start call returned. |
| STAT-3 | Status for an unknown device returns 404. |
| STAT-4 | Statuses are strings (`"Running"`), not numbers. |

## 5. Stopping a run

`POST /api/devices/{deviceId}/stop`

| ID | Requirement |
|---|---|
| STOP-1 | Stopping a running device returns 200 with `status: "Stopped"` and a `stoppedAt` that is at or after `startedAt`. |
| STOP-2 | Stopping a device that has never run returns 404. |
| STOP-3 | Stopping a device that is already stopped or faulted returns 409. |
| STOP-4 | Once stop returns, no new readings show up in the results. Check this by waiting at least 2 seconds and comparing `count`. |

## 6. Results

`GET /api/devices/{deviceId}/results[?runId=<guid>]`

| ID | Requirement |
|---|---|
| RES-1 | Results for a device that has never run return 404. |
| RES-2 | The response has `deviceId`, `runId`, `count` and `readings`, and `count` equals `readings.length`. |
| RES-3 | Readings arrive about once per second. After waiting about 3.5 seconds, `count` is between 3 and 5. |
| RES-4 | `sequenceNumber` starts at 0 and goes up by 1 with no gaps. |
| RES-5 | Every reading's `deviceId` and `runId` match the run, and its `status` is `"Ok"`. |
| RES-6 | Values stay in range for each profile and are rounded to 2 decimal places (see the table below). |
| RES-7 | Timestamps never go backward from one reading to the next. |
| RES-8 | `?runId=<current run>` returns 200. Any other `runId` returns 404. |
| RES-9 | Only the latest run is kept. After a new run starts, asking for the previous `runId` returns 404. |

Value ranges for RES-6:

| Device | `reading.type` | Range | Unit |
|---|---|---|---|
| analyzer-01 | temperature | 20–35 | C |
| analyzer-02 | opticalDensity | 0–2 | OD |
| analyzer-03 | pressure | 95–105 | kPa |

## 7. Fault simulation

These options go in the body of the start request.

| ID | Requirement |
|---|---|
| FAULT-1 | With `{"simulateDisconnect": true}`, the status becomes `"Faulted"` within about 6 seconds. |
| FAULT-2 | A faulted run has exactly 5 readings, with sequence numbers 0 through 4. |
| FAULT-3 | A faulted run's `stoppedAt` stays `null`. |
| FAULT-4 | With `{"latencyMs": 1000}`, readings are spaced about 2 seconds apart instead of about 1. Assert something like "no more than 3 readings after 5 seconds". |

## 8. Real-time telemetry over SignalR (optional)

Needs the `@microsoft/signalr` npm package. The hub is at `/hubs/telemetry`.

| ID | Requirement |
|---|---|
| HUB-1 | A client can connect to `/hubs/telemetry` without an API key. |
| HUB-2 | After calling `SubscribeToDevice("analyzer-01")`, the client receives `ReceiveTelemetry` events for that device's run, and they have the same shape as the readings in the results. |
| HUB-3 | The client doesn't receive events for devices it hasn't subscribed to. |
| HUB-4 | After `UnsubscribeFromDevice`, no more events arrive. |
| HUB-5 | With `{"malformedPayload": true}`, the 4th, 8th, 12th, … messages contain only `deviceId` and `runId`. The results endpoint still stores full readings for those sequence numbers. |



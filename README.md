# Device Simulator API

[![Playwright Tests](https://github.com/MechamJonathan/Device-Simulator-API/actions/workflows/playwright.yml/badge.svg)](https://github.com/MechamJonathan/Device-Simulator-API/actions/workflows/playwright.yml)

I built this to practice two things: building a small API in ASP.NET Core and testing it end to end with Playwright. The API pretends to be a few lab analyzers that stream readings. The Playwright suite tests it over HTTP and SignalR, and the whole thing runs in GitHub Actions on every push.

## The API

There are three fake devices:

| Device | Reading | Range |
|---|---|---|
| `analyzer-01` | temperature | 20–35 C |
| `analyzer-02` | opticalDensity | 0–2 OD |
| `analyzer-03` | pressure | 95–105 kPa |

When you start a run, a background loop records a reading about once a second and also pushes it out over SignalR. Run state is kept in memory, and only the latest run for each device is kept.

| Method | Endpoint | What it does |
|---|---|---|
| `GET` | `/api/devices` | Lists the devices (no API key needed) |
| `POST` | `/api/devices/{id}/start` | Starts a run. Returns `409` if one is already running |
| `POST` | `/api/devices/{id}/stop` | Stops the current run |
| `GET` | `/api/devices/{id}/status` | `Idle`, `Running`, `Stopped` or `Faulted` |
| `GET` | `/api/devices/{id}/results` | Readings for the latest run (optional `?runId=`) |
| WS | `/hubs/telemetry` | SignalR hub for live readings |

Everything except the device list, the OpenAPI doc and the hub needs an `X-Api-Key` header. Locally the key is `dev-api-key`.

I also added a few options to the start request so there's something interesting to test besides the happy path:

```json
{ "simulateDisconnect": true, "latencyMs": 1000, "malformedPayload": true }
```

`simulateDisconnect` makes the device fault after 5 readings. `latencyMs` slows the readings down. `malformedPayload` makes every 4th SignalR message drop its reading data.

Built with .NET 10, ASP.NET Core and SignalR.

## The tests

I wrote the requirements first in [`REQUIREMENTS.md`](REQUIREMENTS.md), gave each one an ID, and named every test after its requirement (`STOP-3`, `RES-8` and so on). If a test fails, you can tell right away which behavior broke.

```
playwright/
├── playwright.config.ts
├── fixtures/
│   ├── api.ts        # resets the API before every test
│   ├── hub.ts        # SignalR client fixture
│   ├── helpers.ts    # startRun, getStatus, getResults, waitForStatus, etc.
│   ├── types.ts      # types for the API's JSON
│   └── devices.ts    # expected range for each device
└── tests/
    ├── start-run.spec.ts
    ├── status.spec.ts
    ├── stop-run.spec.ts
    ├── results.spec.ts
    ├── fault.spec.ts
    └── hub.spec.ts
```

A few things I focused on:

**No browser.** These are API tests, so they use Playwright's `request` fixture directly. The base URL and API key are set once in the config, and Playwright starts the API itself before the tests run.

**Every test starts clean.** The API has a development-only `POST /api/test/reset` endpoint, and an auto fixture calls it before each test. No test depends on what ran before it. Since the API keeps everything in memory, the tests run one at a time.

**Not relying on sleeps.** A lot of this API is timing-based, which makes it easy to write flaky tests. Where I just need something to happen, like "wait until there are 3 readings" or "wait until the device faults", the helpers use `expect.poll` and move on as soon as the condition is met. I only use fixed waits where the requirement itself is about time, like checking that no new readings show up for 2 seconds after a stop.

**Testing SignalR.** The `connectHub()` fixture opens a connection, records every message and closes it when the test ends. The hub tests compare live messages against what the REST endpoint stored, check that subscribe and unsubscribe actually work, and confirm the malformed messages show up where they should.

**Keeping tests readable.** Helpers like `startRun` and `getResults` check the status code and return typed data. That way each test reads like the requirement it covers instead of a pile of HTTP calls.

### Coverage

| Area | Requirements | Done? |
|---|---|---|
| Starting a run | RUN-1 to RUN-6 | Yes |
| Status | STAT-1 to STAT-4 | Yes |
| Stopping a run | STOP-1 to STOP-4 | Yes |
| Results | RES-1 to RES-9 | Yes |
| Fault simulation | FAULT-1 to FAULT-4 | Yes |
| SignalR hub | HUB-1 to HUB-5 | Yes |
| Device catalog | DEV-1 to DEV-3 | Next up |
| Authentication | AUTH-1 to AUTH-5 | Next up |

## Running it

You'll need the [.NET 10 SDK](https://dotnet.microsoft.com/download) and [Node.js](https://nodejs.org/).

To run just the API (it listens on `http://localhost:5231`):

```bash
dotnet run --launch-profile http
```

To run the tests:

```bash
cd playwright
npm ci
npx playwright test
```

You don't have to start the API first. Playwright starts it, or uses it if it's already running. Some other commands I use a lot:

```bash
npx playwright test hub.spec.ts        # one file
npx playwright test -g "FAULT-2"       # one test
npx playwright test --reporter=list    # see each test in the terminal
npx playwright show-report             # open the HTML report
```

The full suite takes a little over a minute, mostly because some tests have to wait on the simulated devices.

## CI

The [GitHub Actions workflow](.github/workflows/playwright.yml) runs on every push and pull request to `main`. It sets up .NET and Node, builds the API, runs the suite and uploads the HTML report so I can look at failures.

import { expect, type APIRequestContext } from '@playwright/test';
import type { ResultsResponse, RunState, RunStatus, StartRunOptions } from './types';

export async function getStatus(request: APIRequestContext, deviceId: string): Promise<RunStatus> {
  const response = await request.get(`/api/devices/${deviceId}/status`);
  expect(response.status(), `status request for "${deviceId}"`).toBe(200);
  return response.json();
}

export async function getResults(
  request: APIRequestContext,
  deviceId: string,
  runId?: string,
): Promise<ResultsResponse> {
  const response = await request.get(`/api/devices/${deviceId}/results`, {
    params: runId ? { runId } : undefined,
  });
  expect(response.status(), `results request for "${deviceId}"`).toBe(200);
  return response.json();
}

export async function startRun(
  request: APIRequestContext,
  deviceId: string,
  options: StartRunOptions = {},
): Promise<RunStatus> {
  const response = await request.post(`/api/devices/${deviceId}/start`, { data: options });
  expect(response.status(), `start request for "${deviceId}"`).toBe(202);
  return response.json();
}

export async function stopRun(request: APIRequestContext, deviceId: string): Promise<RunStatus> {
  const response = await request.post(`/api/devices/${deviceId}/stop`);
  expect(response.status(), `stop request for "${deviceId}"`).toBe(200);
  return response.json();
}

export async function waitForReadings(
  request: APIRequestContext,
  deviceId: string,
  minCount: number,
  timeout = 6_000,
): Promise<ResultsResponse> {
  await expect
    .poll(async () => (await getResults(request, deviceId)).count, {
      message: `waiting for ${minCount} readings on "${deviceId}"`,
      timeout,
    })
    .toBeGreaterThanOrEqual(minCount);
  return getResults(request, deviceId);
}

export async function waitForStatus(
  request: APIRequestContext,
  deviceId: string,
  status: RunState,
  timeout = 8_000,
): Promise<RunStatus> {
  await expect
    .poll(async () => (await getStatus(request, deviceId)).status, {
      message: `waiting for "${deviceId}" to be ${status}`,
      timeout,
    })
    .toBe(status);
  return getStatus(request, deviceId);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRoundedTo2dp(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-9;
}

import { expect, type APIRequestContext } from '@playwright/test';

// Fetches a device's status, asserting the request itself succeeded.
export async function getStatus(request: APIRequestContext, deviceId: string) {
  const response = await request.get(`/api/devices/${deviceId}/status`);
  expect(response.status(), `status request for "${deviceId}"`).toBe(200);
  return response.json();
}

import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from '@microsoft/signalr';
import { test as apiTest, expect } from './api';
import type { TelemetryEvent } from './types';

export class TelemetryClient {
  readonly events: TelemetryEvent[] = [];

  constructor(readonly connection: HubConnection) {
    connection.on('ReceiveTelemetry', (event: TelemetryEvent) => {
      this.events.push(event);
    });
  }

  get state(): HubConnectionState {
    return this.connection.state;
  }

  subscribe(deviceId: string): Promise<void> {
    return this.connection.invoke('SubscribeToDevice', deviceId);
  }

  unsubscribe(deviceId: string): Promise<void> {
    return this.connection.invoke('UnsubscribeFromDevice', deviceId);
  }

  eventsFor(deviceId: string): TelemetryEvent[] {
    return this.events.filter((e) => e.deviceId === deviceId);
  }

  async waitForEvents(
    count: number,
    { deviceId, timeout = 6_000 }: { deviceId?: string; timeout?: number } = {},
  ): Promise<TelemetryEvent[]> {
    const matching = () => (deviceId ? this.eventsFor(deviceId) : this.events);
    await expect
      .poll(() => matching().length, {
        message: `waiting for ${count} hub events${deviceId ? ` for "${deviceId}"` : ''}`,
        timeout,
      })
      .toBeGreaterThanOrEqual(count);
    return [...matching()];
  }

  clear(): void {
    this.events.length = 0;
  }

  stop(): Promise<void> {
    return this.connection.stop();
  }
}

export const test = apiTest.extend<{ connectHub: () => Promise<TelemetryClient> }>({
  connectHub: async ({ baseURL }, use) => {
    const clients: TelemetryClient[] = [];

    await use(async () => {
      const connection = new HubConnectionBuilder()
        .withUrl(new URL('/hubs/telemetry', baseURL).toString())
        .configureLogging(LogLevel.Warning)
        .build();
      const client = new TelemetryClient(connection);
      clients.push(client);
      await connection.start();
      return client;
    });

    await Promise.all(clients.map((c) => c.stop()));
  },
});

export { expect };

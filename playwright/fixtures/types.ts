export type RunState = 'Idle' | 'Running' | 'Stopped' | 'Faulted';

export interface RunStatus {
  deviceId: string;
  runId: string | null;
  status: RunState;
  startedAt: string | null;
  stoppedAt: string | null;
}

export interface ReadingValue {
  type: string;
  value: number;
  unit: string;
}

export type ReadingStatus = 'Ok' | 'Warning' | 'Fault';

export interface TelemetryReading {
  deviceId: string;
  runId: string;
  sequenceNumber: number;
  timestamp: string;
  reading: ReadingValue;
  status: ReadingStatus;
}

export interface ResultsResponse {
  deviceId: string;
  runId: string;
  count: number;
  readings: TelemetryReading[];
}

export interface StartRunOptions {
  simulateDisconnect?: boolean;
  latencyMs?: number;
  malformedPayload?: boolean;
}

export interface MalformedTelemetry {
  deviceId: string;
  runId: string;
}

export type TelemetryEvent = TelemetryReading | MalformedTelemetry;

export function isFullReading(event: TelemetryEvent): event is TelemetryReading {
  return 'sequenceNumber' in event && 'reading' in event;
}

export interface DeviceProfile {
  type: string;
  min: number;
  max: number;
  unit: string;
}

export const DEVICE_PROFILES: Record<string, DeviceProfile> = {
  'analyzer-01': { type: 'temperature', min: 20, max: 35, unit: 'C' },
  'analyzer-02': { type: 'opticalDensity', min: 0, max: 2, unit: 'OD' },
  'analyzer-03': { type: 'pressure', min: 95, max: 105, unit: 'kPa' },
};

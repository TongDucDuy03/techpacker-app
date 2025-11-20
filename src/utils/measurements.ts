import { MeasurementPoint } from '../types/techpack';

export const normalizeMeasurementBaseSizes = (
  measurements: MeasurementPoint[] = [],
  defaultBaseSize?: string
): { normalized: MeasurementPoint[]; changed: boolean } => {
  let changed = false;
  const normalized = measurements.map((measurement) => {
    if (!measurement) return measurement;

    const trimmedBase = measurement.baseSize?.trim();
    const sizeKeys = Object.keys(measurement.sizes || {}).filter((size) => {
      const value = measurement.sizes?.[size];
      return value !== undefined && value !== null;
    });

    if (sizeKeys.length === 0) {
      if (trimmedBase && trimmedBase !== measurement.baseSize) {
        changed = true;
        return { ...measurement, baseSize: trimmedBase };
      }
      return measurement;
    }

    const hasValidBase =
      trimmedBase && sizeKeys.includes(trimmedBase);

    const fallbackFromDefault =
      defaultBaseSize && sizeKeys.includes(defaultBaseSize) ? defaultBaseSize : undefined;

    const resolvedBase =
      (hasValidBase ? trimmedBase : undefined) ||
      fallbackFromDefault ||
      sizeKeys[0];

    if (!resolvedBase) {
      return measurement;
    }

    if (measurement.baseSize === resolvedBase) {
      // Still normalize trimmed value if needed
      if (trimmedBase && trimmedBase !== measurement.baseSize) {
        changed = true;
        return { ...measurement, baseSize: trimmedBase };
      }
      return measurement;
    }

    changed = true;
    return {
      ...measurement,
      baseSize: resolvedBase,
    };
  });

  return { normalized, changed };
};



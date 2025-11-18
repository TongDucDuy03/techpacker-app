export const parseTolerance = (value: string | number | undefined): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 1.0;
  }

  if (typeof value === 'string') {
    const match = value.match(/-?\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : 1.0;
  }

  return 1.0;
};

export const formatTolerance = (value: number): string => {
  const normalized = Number.isFinite(value) ? value : 0;
  return `±${normalized.toFixed(1)}cm`;
};


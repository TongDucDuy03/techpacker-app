import { DEFAULT_MEASUREMENT_UNIT, MeasurementUnit, getMeasurementUnitSuffix } from '../../../types/techpack';

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

export const formatTolerance = (value: number, unit?: MeasurementUnit): string => {
  const normalized = Number.isFinite(value) ? Math.abs(value) : 0;
  const suffix = getMeasurementUnitSuffix(unit || DEFAULT_MEASUREMENT_UNIT);
  return `±${normalized.toFixed(1)} ${suffix}`;
};

const FRACTION_DENOMS = [2, 4, 8] as const;
const FRACTION_EPSILON = 1e-4;

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x || 1;
};

const parseSimpleFraction = (value: string): number | undefined => {
  const [rawNum, rawDen] = value.split('/');
  if (!rawNum || !rawDen) return undefined;
  const numerator = parseFloat(rawNum.trim());
  const denominator = parseFloat(rawDen.trim());
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return undefined;
  }
  return numerator / denominator;
};

const normalizeStepInput = (raw: string): { sign: number; value: string } => {
  let text = raw.replace(',', '.').trim();
  let sign = 1;
  if (text.startsWith('-')) {
    sign = -1;
    text = text.slice(1).trim();
  } else if (text.startsWith('+') || text.startsWith('±')) {
    text = text.slice(1).trim();
  }
  return { sign, value: text };
};

export const parseStepValue = (input: string | number | undefined): number | undefined => {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : undefined;
  }
  if (!input) return undefined;

  const cleaned = normalizeStepInput(input);
  if (!cleaned.value) return undefined;

  let parsed: number | undefined;

  if (cleaned.value.includes(' ')) {
    const [wholePart, fractionPart] = cleaned.value.split(' ').map(part => part.trim()).filter(Boolean);
    if (wholePart && fractionPart && fractionPart.includes('/')) {
      const whole = parseFloat(wholePart);
      const fraction = parseSimpleFraction(fractionPart);
      if (Number.isFinite(whole) && fraction !== undefined) {
        parsed = Math.abs(whole) + fraction;
      }
    }
  }

  if (parsed === undefined && cleaned.value.includes('/')) {
    parsed = parseSimpleFraction(cleaned.value);
  }

  if (parsed === undefined && !Number.isNaN(parseFloat(cleaned.value))) {
    parsed = parseFloat(cleaned.value);
  }

  if (parsed === undefined) return undefined;
  return cleaned.sign * parsed;
};

const findNearestFraction = (decimal: number) => {
  for (const denom of FRACTION_DENOMS) {
    const numerator = Math.round(decimal * denom);
    if (Math.abs(decimal - numerator / denom) < FRACTION_EPSILON) {
      if (numerator === 0) {
        return null;
      }
      const divisor = gcd(numerator, denom);
      return {
        numerator: numerator / divisor,
        denominator: denom / divisor,
      };
    }
  }
  return null;
};

export const formatStepValue = (value: number | undefined): string => {
  if (value === undefined || value === null || Number.isNaN(value)) return '';
  if (value === 0) return '0';
  const sign = value > 0 ? '+' : '-';
  const absValue = Math.abs(value);
  const integerPart = Math.floor(absValue);
  const decimalPart = absValue - integerPart;

  const fraction = findNearestFraction(decimalPart);

  if (!fraction) {
    return `${sign}${absValue.toFixed(2).replace(/\.00$/, '')}`;
  }

  const fractionText = `${fraction.numerator}/${fraction.denominator}`;
  if (integerPart === 0) {
    return `${sign}${fractionText}`;
  }
  return `${sign}${integerPart} ${fractionText}`;
};

export const formatMeasurementValue = (value?: number): string => {
  if (value === undefined || value === null || Number.isNaN(value)) return '-';
  const sign = value < 0 ? '-' : '';
  const absValue = Math.abs(value);
  const integerPart = Math.floor(absValue);
  const decimalPart = absValue - integerPart;

  // const fraction = findNearestFraction(decimalPart);
  // if (fraction) {
  //   const fractionText = `${fraction.numerator}/${fraction.denominator}`;
  //   if (integerPart === 0) {
  //     return `${sign}${fractionText}`;
  //   }
  //   return `${sign}${integerPart} ${fractionText}`;
  // }

  return `${sign}${absValue % 1 === 0 ? absValue.toFixed(0) : absValue.toFixed(2)}`;
};


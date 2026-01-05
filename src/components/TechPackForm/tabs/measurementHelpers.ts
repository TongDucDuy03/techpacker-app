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

/**
 * Format tolerance without unit suffix
 * Input can be:
 * - number: 2.0 -> "±2.0"
 * - string: "±2.0 mm", "-2.0 / +2.3", "±1.0", "-1.2/+2.5 cm"
 * - object: {minus: -2, plus: 2.3} -> "-2.0 / +2.3"
 * Output: string without unit (mm/cm/inch/in)
 * - "±2.0"
 * - "-2.0 / +2.3"
 * - "±1.0"
 */
export const formatToleranceNoUnit = (
  minus: number | string | undefined,
  plus?: number | string | undefined,
  unit?: MeasurementUnit
): string => {
  // If both are provided and different, format as range
  if (minus !== undefined && plus !== undefined) {
    const minusNum = typeof minus === 'string' ? parseTolerance(minus) : (typeof minus === 'number' ? minus : 0);
    const plusNum = typeof plus === 'string' ? parseTolerance(plus) : (typeof plus === 'number' ? plus : 0);
    
    if (minusNum === plusNum) {
      // Format as fraction if unit is inch-16 or inch-32
      if (unit === 'inch-16' || unit === 'inch-32') {
        const formatted = formatMeasurementValueAsFraction(Math.abs(minusNum), unit);
        return `±${formatted}`;
      }
      // inch-10 uses 3 decimal places
      if (unit === 'inch-10') {
        return `±${Math.abs(minusNum).toFixed(3)}`;
      }
      return `±${Math.abs(minusNum).toFixed(1)}`;
    }
    // Format both as fractions if unit is inch-16 or inch-32
    if (unit === 'inch-16' || unit === 'inch-32') {
      const minusFormatted = formatMeasurementValueAsFraction(Math.abs(minusNum), unit);
      const plusFormatted = formatMeasurementValueAsFraction(Math.abs(plusNum), unit);
      return `-${minusFormatted} / +${plusFormatted}`;
    }
    // inch-10 uses 3 decimal places
    if (unit === 'inch-10') {
      return `-${Math.abs(minusNum).toFixed(3)} / +${Math.abs(plusNum).toFixed(3)}`;
    }
    return `-${Math.abs(minusNum).toFixed(1)} / +${Math.abs(plusNum).toFixed(1)}`;
  }
  
  // If only one is provided, use it for both (symmetric)
  const value = minus !== undefined ? minus : plus;
  if (value === undefined) {
    return '—';
  }
  
  const numValue = typeof value === 'string' ? parseTolerance(value) : (typeof value === 'number' ? value : 0);
  // Format as fraction if unit is inch-16 or inch-32
  if (unit === 'inch-16' || unit === 'inch-32') {
    const formatted = formatMeasurementValueAsFraction(Math.abs(numValue), unit);
    return `±${formatted}`;
  }
  // inch-10 uses 3 decimal places
  if (unit === 'inch-10') {
    return `±${Math.abs(numValue).toFixed(3)}`;
  }
  return `±${Math.abs(numValue).toFixed(1)}`;
};

/**
 * Format tolerance string by removing unit suffixes
 * Handles strings like "±2.0 mm", "-2.0 / +2.3", "±1.0", "-1.2/+2.5 cm"
 * Removes: mm, cm, in, inch, inches (case-insensitive)
 * Normalizes whitespace around "/"
 */
export const formatToleranceStringNoUnit = (toleranceStr: string | undefined | null): string => {
  if (!toleranceStr || typeof toleranceStr !== 'string') {
    return '—';
  }
  
  // Remove unit suffixes (mm, cm, in, inch, inches) - case insensitive
  let cleaned = toleranceStr.replace(/\s*(mm|cm|in|inch|inches)\s*/gi, '');
  
  // Normalize whitespace around "/"
  cleaned = cleaned.replace(/\s*\/\s*/g, ' / ');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned || '—';
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

export const formatMeasurementValue = (value?: number, unit?: MeasurementUnit): string => {
  if (value === undefined || value === null || Number.isNaN(value)) return '-';
  const sign = value < 0 ? '-' : '';
  const absValue = Math.abs(value);
  
  // For inch-10, always show 3 decimal places to match the standard (0.125, 0.250, 0.375, etc.)
  if (unit === 'inch-10') {
    return `${sign}${absValue.toFixed(3)}`;
  }
  
  // For other units, use 2 decimal places
  return `${sign}${absValue % 1 === 0 ? absValue.toFixed(0) : absValue.toFixed(2)}`;
};

/**
 * Parse measurement value (similar to parseStepValue but without sign handling for absolute values)
 * Supports: "15.25", "15 1/4", "15 1/2", "1/4", "1/2", etc.
 */
export const parseMeasurementValue = (input: string | number | undefined): number | undefined => {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : undefined;
  }
  if (!input) return undefined;

  const s = String(input).trim().replace(',', '.');
  if (!s) return undefined;

  // Allow intermediate states while typing (e.g., "1/", "1 1/", "1 1/2 ")
  // Return undefined to keep raw input in these cases
  if (/^\d+\s+\d+\/?$/.test(s) || /^\d+\/$/.test(s)) {
    return undefined;
  }

  let parsed: number | undefined;

  // Handle mixed number: "A B/C" (e.g., "1 1/2", "15 1/4")
  const mixedNumberMatch = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedNumberMatch) {
    const whole = Number(mixedNumberMatch[1]);
    const num = Number(mixedNumberMatch[2]);
    const den = Number(mixedNumberMatch[3]);
    if (den && Number.isFinite(whole) && Number.isFinite(num) && Number.isFinite(den)) {
      parsed = whole + num / den;
    }
  }

  // Handle fraction only: "B/C" (e.g., "1/2", "1/4", "3/8")
  if (parsed === undefined) {
    const fractionMatch = s.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const num = Number(fractionMatch[1]);
      const den = Number(fractionMatch[2]);
      if (den && Number.isFinite(num) && Number.isFinite(den)) {
        parsed = num / den;
      }
    }
  }

  // Handle decimal: "15.25", "1.5"
  if (parsed === undefined && !Number.isNaN(parseFloat(s))) {
    parsed = parseFloat(s);
  }

  return parsed;
};

/**
 * Format measurement value as fraction when unit is inch-16 or inch-32
 * For inch-10: format as decimal (not fraction)
 * For inch-16: supports sixteenths (1/16, 3/16, 5/16, etc.)
 * For inch-32: supports thirty-seconds (1/32, 3/32, 5/32, etc.)
 */
export const formatMeasurementValueAsFraction = (value?: number, unit?: MeasurementUnit): string => {
  if (value === undefined || value === null || Number.isNaN(value)) return '-';
  
  // inch-10 uses decimal format with 3 decimal places (not fraction)
  if (unit === 'inch-10') {
    return formatMeasurementValue(value, unit);
  }
  
  // Only format as fraction for inch-16 and inch-32
  if (unit !== 'inch-16' && unit !== 'inch-32') {
    return formatMeasurementValue(value);
  }

  const absValue = Math.abs(value);
  const integerPart = Math.floor(absValue);
  const decimalPart = absValue - integerPart;

  // Helper function to simplify fractions
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

  // For inch-32, use thirty-seconds (32nds)
  if (unit === 'inch-32') {
    const thirtySeconds = Math.round(decimalPart * 32);
    if (thirtySeconds === 0) {
      return integerPart === 0 ? '0' : `${integerPart}`;
    }
    
    const divisor = gcd(thirtySeconds, 32);
    const num = thirtySeconds / divisor;
    const den = 32 / divisor;
    
    const fractionText = `${num}/${den}`;
    if (integerPart === 0) {
      return fractionText;
    }
    return `${integerPart} ${fractionText}`;
  }

  // For inch-16, use sixteenths (16ths)
  if (unit === 'inch-16') {
    const sixteenths = Math.round(decimalPart * 16);
    if (sixteenths === 0) {
      return integerPart === 0 ? '0' : `${integerPart}`;
    }
    
    const divisor = gcd(sixteenths, 16);
    const num = sixteenths / divisor;
    const den = 16 / divisor;
    
    const fractionText = `${num}/${den}`;
    if (integerPart === 0) {
      return fractionText;
    }
    return `${integerPart} ${fractionText}`;
  }

  return formatMeasurementValue(value);
};


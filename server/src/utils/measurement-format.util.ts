export type MeasurementUnit = 'mm' | 'cm' | 'inch-10' | 'inch-16' | 'inch-32';

/**
 * GCD (Greatest Common Divisor) helper
 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Parse measurement value (copied from frontend measurementHelpers to keep UI/PDF in sync)
 * Supports: "15.25", "15 1/4", "15 1/2", "1/4", "1/2", etc.
 */
export function parseMeasurementValue(input: string | number | undefined): number | undefined {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : undefined;
  }
  if (!input) return undefined;

  const s = String(input).trim().replace(',', '.');
  if (!s) return undefined;

  // Allow intermediate states like "1/", "1 1/" – return undefined so caller can keep raw string
  if (/^\d+\s+\d+\/?$/.test(s) || /^\d+\/$/.test(s)) {
    return undefined;
  }

  let parsed: number | undefined;

  // Mixed number: "A B/C"
  const mixedNumberMatch = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedNumberMatch) {
    const whole = Number(mixedNumberMatch[1]);
    const num = Number(mixedNumberMatch[2]);
    const den = Number(mixedNumberMatch[3]);
    if (den && Number.isFinite(whole) && Number.isFinite(num) && Number.isFinite(den)) {
      parsed = whole + num / den;
    }
  }

  // Fraction only: "B/C"
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

  // Decimal: "15.25"
  if (parsed === undefined && !Number.isNaN(parseFloat(s))) {
    parsed = parseFloat(s);
  }

  return parsed;
}

/**
 * Format measurement value without rounding - preserves original precision
 * Matches frontend formatMeasurementValueNoRound
 * Uses limited decimal places to avoid floating-point precision artifacts (e.g. 35.1 -> 35.099999999999994)
 */
export function formatMeasurementValueNoRound(value: number | undefined | null, unit?: MeasurementUnit): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '-';
  const sign = value < 0 ? '-' : '';
  const absValue = Math.abs(value);

  let str: string;
  if (unit === 'inch-10') {
    str = absValue.toFixed(3);
  } else if (unit === 'mm' || unit === 'cm') {
    // Use toFixed(2) to round away floating-point artifacts, then trim trailing zeros
    str = absValue.toFixed(2);
  } else {
    str = absValue.toFixed(10);
  }

  str = str.replace(/\.?0+$/, '');
  return `${sign}${str}`;
}

/**
 * Format a number as a fraction string based on the unit
 * For inch-16 and inch-32: format as fractions
 * For inch-10: format as decimal (not fraction)
 * For other units: format as decimal
 */
export function formatMeasurementValueAsFraction(
  value: number | undefined | null,
  unit?: MeasurementUnit
): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '-';
  }

  const sign = value < 0 ? '-' : '';
  const absValue = Math.abs(value);
  const integerPart = Math.floor(absValue);
  const decimalPart = absValue - integerPart;

  // inch-10 uses decimal format with 3 decimal places (not fraction)
  if (unit === 'inch-10') {
    return `${sign}${absValue.toFixed(3)}`;
  }

  // Only format as fraction for inch-16 and inch-32
  if (unit !== 'inch-16' && unit !== 'inch-32') {
    // Format as decimal for mm, cm
    return absValue % 1 === 0 ? `${sign}${absValue.toFixed(0)}` : `${sign}${absValue.toFixed(2)}`;
  }

  let denominator: number;
  if (unit === 'inch-16') {
    denominator = 16;
  } else if (unit === 'inch-32') {
    denominator = 32;
  } else {
    // Fallback to decimal
    return absValue % 1 === 0 ? `${sign}${absValue.toFixed(0)}` : `${sign}${absValue.toFixed(2)}`;
  }

  const numerator = Math.round(decimalPart * denominator);

  if (numerator === 0) {
    return integerPart === 0 ? '0' : `${sign}${integerPart}`;
  }

  const commonDivisor = gcd(numerator, denominator);
  const simplifiedNumerator = numerator / commonDivisor;
  const simplifiedDenominator = denominator / commonDivisor;

  const fractionText = `${simplifiedNumerator}/${simplifiedDenominator}`;
  if (integerPart === 0) {
    return `${sign}${fractionText}`;
  }
  return `${sign}${integerPart} ${fractionText}`;
}

/**
 * Format tolerance values as fraction (for display)
 * Returns formatted minus and plus tolerance separately
 */
export function formatToleranceAsFraction(
  minus: number | undefined | null,
  plus: number | undefined | null,
  unit?: MeasurementUnit
): { minus: string; plus: string } {
  const minusNum = minus !== undefined && minus !== null ? minus : 0;
  const plusNum = plus !== undefined && plus !== null ? plus : 0;

  return {
    minus: formatMeasurementValueAsFraction(minusNum, unit),
    plus: formatMeasurementValueAsFraction(plusNum, unit),
  };
}


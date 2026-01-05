type MeasurementUnit = 'mm' | 'cm' | 'inch-10' | 'inch-16' | 'inch-32';

/**
 * GCD (Greatest Common Divisor) helper
 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Format a number as a fraction string based on the unit
 * For inch units (inch-10, inch-16, inch-32), format as fractions
 * For other units, format as decimal
 */
export function formatMeasurementValueAsFraction(
  value: number | undefined | null,
  unit?: MeasurementUnit
): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '-';
  }

  // Only format as fraction for inch units
  if (unit !== 'inch-10' && unit !== 'inch-16' && unit !== 'inch-32') {
    // Format as decimal for mm, cm
    const absValue = Math.abs(value);
    return absValue % 1 === 0 ? absValue.toFixed(0) : absValue.toFixed(2);
  }

  const sign = value < 0 ? '-' : '';
  const absValue = Math.abs(value);
  const integerPart = Math.floor(absValue);
  const decimalPart = absValue - integerPart;

  let denominator: number;
  if (unit === 'inch-10') {
    denominator = 10;
  } else if (unit === 'inch-16') {
    denominator = 16;
  } else if (unit === 'inch-32') {
    denominator = 32;
  } else {
    // Fallback to decimal
    const absValue = Math.abs(value);
    return absValue % 1 === 0 ? absValue.toFixed(0) : absValue.toFixed(2);
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


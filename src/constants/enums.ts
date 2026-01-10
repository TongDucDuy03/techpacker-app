/**
 * Business Enum Constants
 * 
 * These are stable identifiers used in database and business logic.
 * NEVER store translated strings - always store these keys.
 * Translation happens at display time using i18n.
 */

/**
 * TechPack Status Enum
 * Stored as: 'draft', 'in_review', 'approved', etc.
 * Displayed as: "Draft" (EN) or "Nháp" (VI) via translation
 */
export const STATUSES = [
  'draft',
  'in_review',
  'approved',
  'rejected',
  'archived',
] as const;

export type Status = typeof STATUSES[number];

/**
 * Fit Type Enum
 */
export const FIT_TYPES = [
  'regular',
  'slim',
  'loose',
  'relaxed',
  'oversized',
] as const;

export type FitType = typeof FIT_TYPES[number];

/**
 * Lifecycle Stage Enum
 */
export const LIFECYCLE_STAGES = [
  'concept',
  'design',
  'development',
  'pre_production',
  'production',
  'shipped',
] as const;

export type LifecycleStage = typeof LIFECYCLE_STAGES[number];

/**
 * Gender Enum
 */
export const GENDERS = [
  'unisex',
  'male',
  'female',
  'kids',
] as const;

export type Gender = typeof GENDERS[number];

/**
 * Price Point Enum
 */
export const PRICE_POINTS = [
  'value',
  'mid_range',
  'premium',
  'luxury',
] as const;

export type PricePoint = typeof PRICE_POINTS[number];

/**
 * Helper to validate enum values
 */
export const isValidStatus = (value: string): value is Status => {
  return STATUSES.includes(value as Status);
};

export const isValidFitType = (value: string): value is FitType => {
  return FIT_TYPES.includes(value as FitType);
};

export const isValidLifecycleStage = (value: string): value is LifecycleStage => {
  return LIFECYCLE_STAGES.includes(value as LifecycleStage);
};

export const isValidGender = (value: string): value is Gender => {
  return GENDERS.includes(value as Gender);
};

/**
 * Legacy enum mappings (for backward compatibility)
 * Maps old string values to new enum keys
 */
export const STATUS_MAPPING: Record<string, Status> = {
  'Draft': 'draft',
  'In Review': 'in_review',
  'Pending Approval': 'in_review',
  'Approved': 'approved',
  'Rejected': 'rejected',
  'Archived': 'archived',
};

export const FIT_TYPE_MAPPING: Record<string, FitType> = {
  'Regular': 'regular',
  'Slim': 'slim',
  'Loose': 'loose',
  'Relaxed': 'relaxed',
  'Oversized': 'oversized',
};

export const GENDER_MAPPING: Record<string, Gender> = {
  'Men': 'male',
  'Women': 'female',
  'Unisex': 'unisex',
  'Kids': 'kids',
};

/**
 * Normalize legacy values to enum keys
 */
export const normalizeStatus = (value: string | undefined | null): Status => {
  if (!value) return 'draft';
  const normalized = STATUS_MAPPING[value] || value.toLowerCase().replace(/\s+/g, '_');
  return isValidStatus(normalized) ? normalized : 'draft';
};

export const normalizeFitType = (value: string | undefined | null): FitType => {
  if (!value) return 'regular';
  const normalized = FIT_TYPE_MAPPING[value] || value.toLowerCase();
  return isValidFitType(normalized) ? normalized : 'regular';
};

export const normalizeGender = (value: string | undefined | null): Gender => {
  if (!value) return 'unisex';
  const normalized = GENDER_MAPPING[value] || value.toLowerCase();
  return isValidGender(normalized) ? normalized : 'unisex';
};








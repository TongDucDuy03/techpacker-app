/**
 * Field Metadata Configuration
 * Single Source of Truth for field labels, options, and section labels
 * Used by both Form components and Revision Detail
 */

import { useI18n } from '../lib/i18n';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldMetadata {
  label: string;
  section?: string;
  sectionLabel?: string;
  options?: FieldOption[];
  valueResolver?: (value: any) => string; // For resolving IDs to names, etc.
}

export type FieldMetadataConfig = Record<string, FieldMetadata>;

/**
 * Get field metadata configuration
 * This should be called within a component that has access to useI18n
 */
export const getFieldMetadata = (t: (key: string) => string): FieldMetadataConfig => {
  return {
    // Article Info fields
    articleCode: {
      label: t('form.articleInfo.articleCode'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo')
    },
    articleName: {
      label: t('form.articleInfo.articleName'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo')
    },
    productName: {
      label: t('form.articleInfo.articleName'), // backward compatibility
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo')
    },
    sampleType: {
      label: t('form.articleInfo.sampleType'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo')
    },
    version: {
      label: t('form.articleInfo.sampleType'), // backward compatibility
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo')
    },
    gender: {
      label: t('form.articleInfo.gender'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo'),
      options: [
        { value: 'Men', label: t('option.gender.men') },
        { value: 'Women', label: t('option.gender.women') },
        { value: 'Unisex', label: t('option.gender.unisex') },
        { value: 'Kids', label: t('option.gender.kids') }
      ]
    },
    productClass: {
      label: t('form.articleInfo.category'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo'),
      options: [
        { value: 'Shirts', label: t('option.productClass.shirts') },
        { value: 'Blouses', label: t('option.productClass.blouses') },
        { value: 'T-Shirts', label: t('option.productClass.tShirts') },
        { value: 'Polo Shirts', label: t('option.productClass.poloShirts') },
        { value: 'Pants', label: t('option.productClass.pants') },
        { value: 'Jeans', label: t('option.productClass.jeans') },
        { value: 'Shorts', label: t('option.productClass.shorts') },
        { value: 'Skirts', label: t('option.productClass.skirts') },
        { value: 'Dresses', label: t('option.productClass.dresses') },
        { value: 'Jackets', label: t('option.productClass.jackets') },
        { value: 'Coats', label: t('option.productClass.coats') },
        { value: 'Sweaters', label: t('option.productClass.sweaters') },
        { value: 'Hoodies', label: t('option.productClass.hoodies') },
        { value: 'Underwear', label: t('option.productClass.underwear') },
        { value: 'Swimwear', label: t('option.productClass.swimwear') },
        { value: 'Activewear', label: t('option.productClass.activewear') },
        { value: 'Sleepwear', label: t('option.productClass.sleepwear') },
        { value: 'Accessories', label: t('option.productClass.accessories') }
      ]
    },
    category: {
      label: t('form.articleInfo.category'), // backward compatibility
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo'),
      options: [
        { value: 'Shirts', label: t('option.productClass.shirts') },
        { value: 'Blouses', label: t('option.productClass.blouses') },
        { value: 'T-Shirts', label: t('option.productClass.tShirts') },
        { value: 'Polo Shirts', label: t('option.productClass.poloShirts') },
        { value: 'Pants', label: t('option.productClass.pants') },
        { value: 'Jeans', label: t('option.productClass.jeans') },
        { value: 'Shorts', label: t('option.productClass.shorts') },
        { value: 'Skirts', label: t('option.productClass.skirts') },
        { value: 'Dresses', label: t('option.productClass.dresses') },
        { value: 'Jackets', label: t('option.productClass.jackets') },
        { value: 'Coats', label: t('option.productClass.coats') },
        { value: 'Sweaters', label: t('option.productClass.sweaters') },
        { value: 'Hoodies', label: t('option.productClass.hoodies') },
        { value: 'Underwear', label: t('option.productClass.underwear') },
        { value: 'Swimwear', label: t('option.productClass.swimwear') },
        { value: 'Activewear', label: t('option.productClass.activewear') },
        { value: 'Sleepwear', label: t('option.productClass.sleepwear') },
        { value: 'Accessories', label: t('option.productClass.accessories') }
      ]
    },
    fitType: {
      label: t('form.articleInfo.fitType'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo'),
      options: [
        { value: 'Regular', label: t('option.fitType.regular') },
        { value: 'Slim', label: t('option.fitType.slim') },
        { value: 'Loose', label: t('option.fitType.loose') },
        { value: 'Relaxed', label: t('option.fitType.relaxed') },
        { value: 'Oversized', label: t('option.fitType.oversized') }
      ]
    },
    supplier: {
      label: t('form.articleInfo.supplier'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo')
    },
    technicalDesignerId: {
      label: t('form.articleInfo.technicalDesigner'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo')
      // Note: valueResolver should be set dynamically if we need to resolve IDs to names
    },
    fabricDescription: {
      label: t('form.articleInfo.fabricDescription'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo')
    },
    productDescription: {
      label: t('form.articleInfo.productDescription'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo')
    },
    designSketchUrl: {
      label: t('form.articleInfo.designSketch'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo')
    },
    companyLogoUrl: {
      label: t('form.articleInfo.companyLogo'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo')
    },
    season: {
      label: t('form.articleInfo.season'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo')
    },
    lifecycleStage: {
      label: t('form.articleInfo.lifecycleStage'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo'),
      options: [
        { value: 'Concept', label: t('option.lifecycle.concept') },
        { value: 'Design', label: t('option.lifecycle.design') },
        { value: 'Development', label: t('option.lifecycle.development') },
        { value: 'Pre-production', label: t('option.lifecycle.preProduction') },
        { value: 'Production', label: t('option.lifecycle.production') },
        { value: 'Sales', label: t('option.lifecycle.sales') }
      ]
    },
    status: {
      label: t('form.articleInfo.status'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo'),
      options: [
        { value: 'Draft', label: t('option.status.draft') },
        { value: 'Process', label: t('option.status.process') },
        { value: 'Approved', label: t('option.status.approved') },
        { value: 'Rejected', label: t('option.status.rejected') },
        { value: 'Archived', label: t('option.status.archived') }
      ]
    },
    brand: {
      label: t('form.articleInfo.brand'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo')
    },
    collection: {
      label: t('form.articleInfo.collection'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo')
    },
    targetMarket: {
      label: t('form.articleInfo.targetMarket'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo')
    },
    pricePoint: {
      label: t('form.articleInfo.pricePoint'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo'),
      options: [
        { value: 'Mass', label: t('option.pricePoint.mass') },
        { value: 'Mid-range', label: t('option.pricePoint.midRange') },
        { value: 'Premium', label: t('option.pricePoint.premium') },
        { value: 'Luxury', label: t('option.pricePoint.luxury') }
      ]
    },
    currency: {
      label: t('form.articleInfo.currency'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo'),
      options: [
        { value: 'USD', label: t('option.currency.usd') },
        { value: 'EUR', label: t('option.currency.eur') },
        { value: 'GBP', label: t('option.currency.gbp') },
        { value: 'JPY', label: t('option.currency.jpy') },
        { value: 'CNY', label: t('option.currency.cny') },
        { value: 'VND', label: t('option.currency.vnd') }
      ]
    },
    retailPrice: {
      label: t('form.articleInfo.retailPrice'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo')
    },
    notes: {
      label: t('form.articleInfo.notes'),
      section: 'articleInfo',
      sectionLabel: t('form.tab.articleInfo')
    }
  };
};

/**
 * Get field label from metadata
 */
export const getFieldLabel = (fieldName: string, metadata: FieldMetadataConfig): string => {
  const fieldMeta = metadata[fieldName];
  if (fieldMeta) {
    return fieldMeta.label;
  }
  // Fallback: format field name
  return fieldName.replace(/([A-Z])/g, ' $1').trim();
};

/**
 * Get section label from metadata
 */
export const getSectionLabel = (fieldName: string, metadata: FieldMetadataConfig): string => {
  const fieldMeta = metadata[fieldName];
  if (fieldMeta?.sectionLabel) {
    return fieldMeta.sectionLabel;
  }
  if (fieldMeta?.section) {
    // Try to get section label from i18n
    return fieldMeta.section;
  }
  return 'Unknown Section';
};

/**
 * Resolve field value using metadata options
 * @param value - The raw value from backend
 * @param fieldName - The field name (e.g., 'fitType', 'lifecycleStage')
 * @param metadata - Field metadata configuration
 * @param t - Translation function (optional, required for boolean values)
 * @returns Translated display value or '—' if not found
 */
export const resolveFieldValue = (
  value: any,
  fieldName: string,
  metadata: FieldMetadataConfig,
  t?: (key: string) => string
): string => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  // Handle boolean values first (before checking metadata)
  if (typeof value === 'boolean') {
    if (t) {
      return value ? (t('common.yes') || 'Có') : (t('common.no') || 'Không');
    }
    // Fallback if no t function provided
    return value ? 'Yes' : 'No';
  }

  const fieldMeta = metadata[fieldName];
  if (!fieldMeta) {
    // Fallback rule: if no mapping found, return '—' and log warning
    console.warn(`[resolveFieldValue] Unknown field: ${fieldName}, value: ${value}`);
    return '—';
  }

  // If has valueResolver, use it first
  if (fieldMeta.valueResolver) {
    const resolved = fieldMeta.valueResolver(value);
    if (resolved) return resolved;
  }

  // If has options, find matching option (case-insensitive match for flexibility)
  if (fieldMeta.options) {
    const valueStr = String(value);
    const option = fieldMeta.options.find(opt => 
      opt.value === value || 
      opt.value === valueStr ||
      opt.value.toLowerCase() === valueStr.toLowerCase()
    );
    if (option) {
      return option.label;
    }
    // If no exact match found, log warning
    console.warn(`[resolveFieldValue] No matching option for field "${fieldName}", value: ${value}`);
    return '—';
  }

  // Default: return string value (for text fields without options)
  return String(value);
};


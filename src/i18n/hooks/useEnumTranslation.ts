import { useTranslation } from 'react-i18next';

/**
 * Hook for translating enum values
 * 
 * Ensures enums are always translated consistently across the app.
 * Enums are stored as keys (e.g., 'draft', 'regular') and translated
 * at display time using this hook.
 * 
 * @example
 * const { translateEnum } = useEnumTranslation();
 * const statusLabel = translateEnum('techpack:enums.status', 'draft');
 * // Returns: "Draft" (EN) or "Nháp" (VI)
 */
export const useEnumTranslation = () => {
  const { t } = useTranslation();
  
  /**
   * Translate an enum value
   * @param namespace - Translation namespace (e.g., 'techpack:enums.status')
   * @param enumKey - The enum key value (e.g., 'draft', 'regular')
   * @param fallback - Optional fallback if translation not found
   * @returns Translated string
   */
  const translateEnum = (
    namespace: string,
    enumKey: string | null | undefined,
    fallback?: string
  ): string => {
    if (!enumKey) return fallback || '';
    
    // Normalize enum key (handle legacy values)
    const normalizedKey = enumKey.toLowerCase().replace(/\s+/g, '_');
    const key = `${namespace}.${normalizedKey}`;
    
    // Try to get translation
    const translated = t(key, { 
      defaultValue: fallback || enumKey 
    });
    
    return translated;
  };
  
  /**
   * Translate multiple enum values
   * Useful for creating option lists
   */
  const translateEnums = <T extends string>(
    namespace: string,
    enumKeys: readonly T[]
  ): Array<{ value: T; label: string }> => {
    return enumKeys.map(key => ({
      value: key,
      label: translateEnum(namespace, key, key),
    }));
  };
  
  return {
    translateEnum,
    translateEnums,
  };
};








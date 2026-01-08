export type SizePreset = {
  id: string;
  labelKey: string; // i18n key instead of hard-coded label
  description?: string;
  sizes: string[];
};

export const SIZE_PRESET_OPTIONS: SizePreset[] = [
  {
    id: 'standard_us_alpha',
    labelKey: 'option.sizePreset.standardUsAlpha',
    sizes: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  },
  {
    id: 'standard_us_numeric',
    labelKey: 'option.sizePreset.standardUsNumeric',
    sizes: ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18'],
  },
  {
    id: 'standard_eu_numeric',
    labelKey: 'option.sizePreset.standardEuNumeric',
    sizes: ['32', '34', '36', '38', '40', '42', '44', '46', '48'],
  },
  {
    id: 'extended_plus',
    labelKey: 'option.sizePreset.extendedPlus',
    sizes: ['1X', '2X', '3X', '4X', '5X'],
  },
  {
    id: 'kids_us',
    labelKey: 'option.sizePreset.kidsUs',
    sizes: ['2', '3', '4', '5', '6', '7', '8', '10', '12', '14', '16'],
  },
  {
    id: 'custom_blank',
    labelKey: 'option.sizePreset.customBlank',
    sizes: [],
  },
];

export const getPresetById = (id: string): SizePreset | undefined =>
  SIZE_PRESET_OPTIONS.find(preset => preset.id === id);


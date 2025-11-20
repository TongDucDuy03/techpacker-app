export type SizePreset = {
  id: string;
  label: string;
  description?: string;
  sizes: string[];
};

export const SIZE_PRESET_OPTIONS: SizePreset[] = [
  {
    id: 'standard_us_alpha',
    label: 'Standard US (Alpha)',
    sizes: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  },
  {
    id: 'standard_us_numeric',
    label: 'Standard US (Numeric)',
    sizes: ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18'],
  },
  {
    id: 'standard_eu_numeric',
    label: 'Standard EU (32-48)',
    sizes: ['32', '34', '36', '38', '40', '42', '44', '46', '48'],
  },
  {
    id: 'extended_plus',
    label: 'Extended Plus (1X-5X)',
    sizes: ['1X', '2X', '3X', '4X', '5X'],
  },
  {
    id: 'kids_us',
    label: 'Kids US (2-16)',
    sizes: ['2', '3', '4', '5', '6', '7', '8', '10', '12', '14', '16'],
  },
  {
    id: 'custom_blank',
    label: 'Custom (Blank)',
    sizes: [],
  },
];

export const getPresetById = (id: string): SizePreset | undefined =>
  SIZE_PRESET_OPTIONS.find(preset => preset.id === id);


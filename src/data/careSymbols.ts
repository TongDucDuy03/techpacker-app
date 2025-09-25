import { CareSymbol } from '../types';

export const careSymbols: CareSymbol[] = [
  // Washing Symbols
  {
    id: 'wash-30',
    name: 'Machine Wash 30°C',
    type: 'wash',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 3h18v18H3z"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <text x="12" y="18" text-anchor="middle" font-size="8" fill="currentColor">30</text>
    </svg>`,
    description: 'Machine wash at 30°C',
    temperature: { min: 30, max: 30, unit: 'C' },
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'wash-40',
    name: 'Machine Wash 40°C',
    type: 'wash',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 3h18v18H3z"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <text x="12" y="18" text-anchor="middle" font-size="8" fill="currentColor">40</text>
    </svg>`,
    description: 'Machine wash at 40°C',
    temperature: { min: 40, max: 40, unit: 'C' },
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'wash-60',
    name: 'Machine Wash 60°C',
    type: 'wash',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 3h18v18H3z"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <text x="12" y="18" text-anchor="middle" font-size="8" fill="currentColor">60</text>
    </svg>`,
    description: 'Machine wash at 60°C',
    temperature: { min: 60, max: 60, unit: 'C' },
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'wash-hand',
    name: 'Hand Wash',
    type: 'wash',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 3h18v18H3z"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <path d="M8 12h8" stroke-width="3"/>
    </svg>`,
    description: 'Hand wash only',
    warnings: ['Do not machine wash'],
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'wash-delicate',
    name: 'Delicate Wash',
    type: 'wash',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 3h18v18H3z"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <path d="M8 8h8v8H8z" stroke-width="1"/>
    </svg>`,
    description: 'Delicate wash cycle',
    warnings: ['Use gentle cycle'],
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'wash-no',
    name: 'Do Not Wash',
    type: 'wash',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 3h18v18H3z"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <path d="M8 8l8 8" stroke-width="3"/>
    </svg>`,
    description: 'Do not wash',
    warnings: ['No washing allowed'],
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // Drying Symbols
  {
    id: 'dry-tumble',
    name: 'Tumble Dry',
    type: 'dry',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
    </svg>`,
    description: 'Tumble dry',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'dry-tumble-low',
    name: 'Tumble Dry Low Heat',
    type: 'dry',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <text x="12" y="18" text-anchor="middle" font-size="6" fill="currentColor">L</text>
    </svg>`,
    description: 'Tumble dry low heat',
    temperature: { min: 50, max: 60, unit: 'C' },
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'dry-tumble-high',
    name: 'Tumble Dry High Heat',
    type: 'dry',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <text x="12" y="18" text-anchor="middle" font-size="6" fill="currentColor">H</text>
    </svg>`,
    description: 'Tumble dry high heat',
    temperature: { min: 80, max: 90, unit: 'C' },
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'dry-line',
    name: 'Line Dry',
    type: 'dry',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 3h18v18H3z"/>
      <path d="M6 6h12"/>
      <path d="M6 12h12"/>
      <path d="M6 18h12"/>
    </svg>`,
    description: 'Line dry',
    warnings: ['Do not tumble dry'],
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'dry-flat',
    name: 'Flat Dry',
    type: 'dry',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 3h18v18H3z"/>
      <path d="M6 6h12"/>
      <path d="M6 12h12"/>
      <path d="M6 18h12"/>
      <path d="M3 9h18"/>
      <path d="M3 15h18"/>
    </svg>`,
    description: 'Flat dry',
    warnings: ['Lay flat to dry'],
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'dry-no',
    name: 'Do Not Dry',
    type: 'dry',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <path d="M8 8l8 8" stroke-width="3"/>
    </svg>`,
    description: 'Do not dry',
    warnings: ['No drying allowed'],
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // Ironing Symbols
  {
    id: 'iron-yes',
    name: 'Iron',
    type: 'iron',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 3h18v18H3z"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <path d="M6 6h12"/>
      <path d="M6 12h12"/>
      <path d="M6 18h12"/>
    </svg>`,
    description: 'Iron',
    temperature: { min: 150, max: 200, unit: 'C' },
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'iron-low',
    name: 'Iron Low Heat',
    type: 'iron',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 3h18v18H3z"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <path d="M6 6h12"/>
      <path d="M6 12h12"/>
      <path d="M6 18h12"/>
      <text x="12" y="18" text-anchor="middle" font-size="6" fill="currentColor">1</text>
    </svg>`,
    description: 'Iron low heat',
    temperature: { min: 110, max: 120, unit: 'C' },
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'iron-medium',
    name: 'Iron Medium Heat',
    type: 'iron',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 3h18v18H3z"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <path d="M6 6h12"/>
      <path d="M6 12h12"/>
      <path d="M6 18h12"/>
      <text x="12" y="18" text-anchor="middle" font-size="6" fill="currentColor">2</text>
    </svg>`,
    description: 'Iron medium heat',
    temperature: { min: 150, max: 160, unit: 'C' },
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'iron-high',
    name: 'Iron High Heat',
    type: 'iron',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 3h18v18H3z"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <path d="M6 6h12"/>
      <path d="M6 12h12"/>
      <path d="M6 18h12"/>
      <text x="12" y="18" text-anchor="middle" font-size="6" fill="currentColor">3</text>
    </svg>`,
    description: 'Iron high heat',
    temperature: { min: 200, max: 220, unit: 'C' },
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'iron-no-steam',
    name: 'Iron No Steam',
    type: 'iron',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 3h18v18H3z"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <path d="M6 6h12"/>
      <path d="M6 12h12"/>
      <path d="M6 18h12"/>
      <path d="M8 8l8 8" stroke-width="2"/>
    </svg>`,
    description: 'Iron without steam',
    warnings: ['Do not use steam'],
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'iron-no',
    name: 'Do Not Iron',
    type: 'iron',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 3h18v18H3z"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <path d="M6 6h12"/>
      <path d="M6 12h12"/>
      <path d="M6 18h12"/>
      <path d="M8 8l8 8" stroke-width="3"/>
    </svg>`,
    description: 'Do not iron',
    warnings: ['No ironing allowed'],
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // Bleaching Symbols
  {
    id: 'bleach-yes',
    name: 'Bleach',
    type: 'bleach',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 3h18v18H3z"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <path d="M6 6h12"/>
      <path d="M6 12h12"/>
      <path d="M6 18h12"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>`,
    description: 'Bleach',
    warnings: ['Use chlorine bleach'],
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'bleach-oxygen',
    name: 'Oxygen Bleach',
    type: 'bleach',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 3h18v18H3z"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <path d="M6 6h12"/>
      <path d="M6 12h12"/>
      <path d="M6 18h12"/>
      <circle cx="12" cy="12" r="3"/>
      <text x="12" y="14" text-anchor="middle" font-size="4" fill="currentColor">O</text>
    </svg>`,
    description: 'Oxygen bleach only',
    warnings: ['Use oxygen bleach only'],
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'bleach-no',
    name: 'Do Not Bleach',
    type: 'bleach',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 3h18v18H3z"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <path d="M6 6h12"/>
      <path d="M6 12h12"/>
      <path d="M6 18h12"/>
      <circle cx="12" cy="12" r="3"/>
      <path d="M8 8l8 8" stroke-width="3"/>
    </svg>`,
    description: 'Do not bleach',
    warnings: ['No bleaching allowed'],
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // Dry Cleaning Symbols
  {
    id: 'dryclean-yes',
    name: 'Dry Clean',
    type: 'dryclean',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <path d="M6 6h12"/>
      <path d="M6 12h12"/>
      <path d="M6 18h12"/>
    </svg>`,
    description: 'Dry clean',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'dryclean-p',
    name: 'Dry Clean P',
    type: 'dryclean',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <path d="M6 6h12"/>
      <path d="M6 12h12"/>
      <path d="M6 18h12"/>
      <text x="12" y="14" text-anchor="middle" font-size="8" fill="currentColor">P</text>
    </svg>`,
    description: 'Dry clean with P solvent',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'dryclean-f',
    name: 'Dry Clean F',
    type: 'dryclean',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <path d="M6 6h12"/>
      <path d="M6 12h12"/>
      <path d="M6 18h12"/>
      <text x="12" y="14" text-anchor="middle" font-size="8" fill="currentColor">F</text>
    </svg>`,
    description: 'Dry clean with F solvent',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'dryclean-no',
    name: 'Do Not Dry Clean',
    type: 'dryclean',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 8h8v8H8z"/>
      <path d="M12 4v16"/>
      <path d="M6 6h12"/>
      <path d="M6 12h12"/>
      <path d="M6 18h12"/>
      <path d="M8 8l8 8" stroke-width="3"/>
    </svg>`,
    description: 'Do not dry clean',
    warnings: ['No dry cleaning allowed'],
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // Warning Symbols
  {
    id: 'warning-hot',
    name: 'Hot Water Warning',
    type: 'warning',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
      <text x="12" y="14" text-anchor="middle" font-size="6" fill="currentColor">HOT</text>
    </svg>`,
    description: 'Hot water warning',
    warnings: ['Avoid hot water'],
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'warning-fragile',
    name: 'Fragile Warning',
    type: 'warning',
    standard: 'ISO',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
      <text x="12" y="14" text-anchor="middle" font-size="4" fill="currentColor">!</text>
    </svg>`,
    description: 'Fragile warning',
    warnings: ['Handle with care'],
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const getCareSymbolsByType = (type: string) => {
  return careSymbols.filter(symbol => symbol.type === type);
};

export const getCareSymbolsByStandard = (standard: string) => {
  return careSymbols.filter(symbol => symbol.standard === standard);
};

export const getDefaultCareSymbols = () => {
  return careSymbols.filter(symbol => symbol.isDefault);
};

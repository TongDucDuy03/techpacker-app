import { PDFLanguage } from './pdf-translations';

type OptionGroup = 'gender' | 'fitType' | 'productClass' | 'pricePoint' | 'lifecycleStage';

const viOptions: Record<OptionGroup, Record<string, string>> = {
  gender: {
    men: 'Nam',
    women: 'Nữ',
    unisex: 'Unisex',
    kids: 'Trẻ em',
  },
  fitType: {
    regular: 'Vừa vặn cơ bản',
    slim: 'Ôm dáng',
    loose: 'Rộng rãi',
    relaxed: 'Thoải mái',
    oversized: 'Oversize',
  },
  lifecycleStage: {
    concept: 'Ý tưởng',
    design: 'Thiết kế',
    development: 'Phát triển',
    preProduction: 'Chuẩn bị sản xuất',
    production: 'Sản xuất',
    sales: 'Mẫu chào hàng',
  },
  productClass: {
    shirts: 'Áo sơ mi',
    blouses: 'Áo blouse',
    tShirts: 'Áo thun',
    poloShirts: 'Áo polo',
    pants: 'Quần dài',
    jeans: 'Quần jeans',
    shorts: 'Quần short',
    skirts: 'Chân váy',
    dresses: 'Đầm/Váy',
    jackets: 'Áo khoác',
    coats: 'Áo măng tô',
    sweaters: 'Áo len',
    hoodies: 'Áo hoodie',
    underwear: 'Đồ lót',
    swimwear: 'Đồ bơi',
    activewear: 'Đồ thể thao',
    sleepwear: 'Đồ ngủ',
    accessories: 'Phụ kiện',
  },
  pricePoint: {
    mass: 'Phổ thông',
    midRange: 'Tầm trung',
    premium: 'Cao cấp',
    luxury: 'Hạng sang',
  },
};

const enLabelFallback: Record<OptionGroup, Record<string, string>> = {
  gender: {
    men: 'Men',
    women: 'Women',
    unisex: 'Unisex',
    kids: 'Kids',
  },
  fitType: {
    regular: 'Regular Fit',
    slim: 'Slim Fit',
    loose: 'Loose Fit',
    relaxed: 'Relaxed Fit',
    oversized: 'Oversized',
  },
  lifecycleStage: {
    concept: 'Concept',
    design: 'Design',
    development: 'Development',
    preProduction: 'Pre-production',
    production: 'Production',
    sales: 'Sales',
  },
  productClass: {
    shirts: 'Shirts',
    blouses: 'Blouses',
    tShirts: 'T-Shirts',
    poloShirts: 'Polo Shirts',
    pants: 'Pants',
    jeans: 'Jeans',
    shorts: 'Shorts',
    skirts: 'Skirts',
    dresses: 'Dresses',
    jackets: 'Jackets',
    coats: 'Coats',
    sweaters: 'Sweaters',
    hoodies: 'Hoodies',
    underwear: 'Underwear',
    swimwear: 'Swimwear',
    activewear: 'Activewear',
    sleepwear: 'Sleepwear',
    accessories: 'Accessories',
  },
  pricePoint: {
    mass: 'Mass',
    midRange: 'Mid-range',
    premium: 'Premium',
    luxury: 'Luxury',
  },
};

function normalizeValue(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '')
    .replace(/-/g, '');
}

function resolveOptionKey(group: OptionGroup, raw: string): string | undefined {
  const normalized = normalizeValue(raw);
  if (!normalized) return undefined;

  const candidates = Object.keys(enLabelFallback[group]);
  // match by key (e.g. "midRange") or by label (e.g. "Mid-range", "Slim Fit")
  for (const key of candidates) {
    const keyNorm = normalizeValue(key);
    const enLabelNorm = normalizeValue(enLabelFallback[group][key]);
    const viLabelNorm = normalizeValue(viOptions[group][key]);
    if (normalized === keyNorm || normalized === enLabelNorm || normalized === viLabelNorm) {
      return key;
    }
  }

  return undefined;
}

export function translateOptionValue(language: PDFLanguage, group: OptionGroup, value: string): string {
  const raw = String(value || '').trim();
  if (!raw || raw === '—' || raw === '-') return raw;

  const key = resolveOptionKey(group, raw);
  if (!key) return raw;

  if (language === 'vi') {
    return viOptions[group][key] || raw;
  }
  return enLabelFallback[group][key] || raw;
}

